/*
 * Copy of demo/sim.js from life-simulation-service.
 *
 * Browser port of StandardSimulationService / AdvancedSimulationService
 * (servicio-worker). Same rules, same iteration order and the same random
 * number generator as java.util.Random, so a given seed reproduces the
 * output of the Java code exactly.
 */
(function (root) {
  'use strict';

  var GRID_SIZE = 8;
  var MAX_TIME = 10;
  var COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];

  var MULT = 0x5DEECE66Dn;
  var MASK = (1n << 48n) - 1n;

  /** java.util.Random (48-bit linear congruential generator). */
  function JavaRandom(seed) {
    this.seed = (BigInt(seed) ^ MULT) & MASK;
  }
  JavaRandom.prototype.next = function (bits) {
    this.seed = (this.seed * MULT + 0xBn) & MASK;
    return Number(BigInt.asIntN(32, this.seed >> BigInt(48 - bits)));
  };
  JavaRandom.prototype.nextInt = function (bound) {
    var r = this.next(31);
    var m = bound - 1;
    if ((bound & m) === 0) {
      return Number((BigInt(bound) * BigInt(r)) >> 31n);
    }
    for (var u = r; ((u - (r = u % bound) + m) | 0) < 0; u = this.next(31)) { /* reject */ }
    return r;
  };
  /** Random seeded from the clock, like `new Random()`. */
  JavaRandom.unseeded = function () {
    return new JavaRandom(Math.floor(Math.random() * 2 ** 48));
  };

  /** Collections.shuffle(list, rnd) */
  function shuffle(list, rnd) {
    for (var i = list.length; i > 1; i--) {
      var j = rnd.nextInt(i);
      var tmp = list[i - 1]; list[i - 1] = list[j]; list[j] = tmp;
    }
  }

  function Cell(name, color) {
    this.name = name;
    this.color = color;
    this.hasEaten = false;
    this.hasFoodToShare = false;
  }
  Cell.prototype.copy = function () {
    var c = new Cell(this.name, this.color);
    c.hasEaten = this.hasEaten;
    c.hasFoodToShare = this.hasFoodToShare;
    return c;
  };

  function canEatStandard(color1, color2) {
    var i1 = COLORS.indexOf(color1), i2 = COLORS.indexOf(color2);
    return (i1 !== -1 && i2 !== -1) && (i1 + 1) % COLORS.length === i2;
  }

  function canEatAdvanced(color1, color2) {
    if (color1 === 'yellow') return false;
    if (color2 === 'red') return false;
    if (color1 === 'red' && color2 === 'blue') return true;
    if (color1 === 'red' && color2 === 'green') return true;
    if (color1 === 'green' && color2 === 'yellow') return true;
    if (color1 === 'blue' && color2 === 'yellow') return true;
    return false;
  }

  function emptyGrid() {
    var g = [];
    for (var i = 0; i < GRID_SIZE; i++) g.push(new Array(GRID_SIZE).fill(null));
    return g;
  }

  function neighbours(x, y) {
    var list = [];
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        var nx = x + i, ny = y + j;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) list.push([nx, ny]);
      }
    }
    return list;
  }

  /**
   * Runs one simulation.
   * @param {object} opts
   *   mode: 'standard' | 'advanced'
   *   names: string[] (1..6), quantities: number[]
   *   seed: optional; when given, positions use Random(seed) and the
   *         neighbour shuffles use Random(seed ^ 0x5DEECE66D)
   * @returns {string} the same text the service stores: "8\n t,y,x,color\n..."
   */
  function simulate(opts) {
    var advanced = opts.mode === 'advanced';
    var canEat = advanced ? canEatAdvanced : canEatStandard;
    var names = opts.names, quantities = opts.quantities;
    if (names.length < 1 || names.length > 6) {
      throw new Error('El número de entidades debe estar entre 1 y 6, se recibieron: ' + names.length);
    }
    var seeded = opts.seed !== undefined && opts.seed !== null;
    var rand = seeded ? new JavaRandom(opts.seed) : JavaRandom.unseeded();
    var shuf = seeded ? new JavaRandom(BigInt(opts.seed) ^ MULT) : JavaRandom.unseeded();

    var out = [String(GRID_SIZE)];
    var append = function (t, y, x, color) { out.push(t + ',' + y + ',' + x + ',' + color); };

    var colorMap = new Map();
    var numSpecies = Math.min(names.length, COLORS.length);
    for (var i = 0; i < numSpecies; i++) colorMap.set(names[i], COLORS[i]);

    function placeInFreeSpot(grid, cell, x, y) {
      if (grid[y][x] === null) { grid[y][x] = cell.copy(); return; }
      var ns = neighbours(x, y);
      shuffle(ns, shuf);
      for (var k = 0; k < ns.length; k++) {
        if (grid[ns[k][1]][ns[k][0]] === null) { grid[ns[k][1]][ns[k][0]] = cell.copy(); return; }
      }
      for (var r = 0; r < GRID_SIZE; r++) {
        for (var c = 0; c < GRID_SIZE; c++) {
          if (grid[r][c] === null) { grid[r][c] = cell.copy(); return; }
        }
      }
    }

    function reproducir(grid, parent, x, y) {
      var ns = neighbours(x, y);
      shuffle(ns, shuf);
      for (var k = 0; k < ns.length; k++) {
        if (grid[ns[k][1]][ns[k][0]] === null) {
          grid[ns[k][1]][ns[k][0]] = new Cell(parent.name, parent.color);
          return true;
        }
      }
      return false;
    }

    var grid = emptyGrid();

    // Tiempo 0
    var totalPlaced = 0;
    var maxSpots = GRID_SIZE * GRID_SIZE;
    for (i = 0; i < numSpecies; i++) {
      var name = names[i];
      var count = quantities[i];
      var color = colorMap.get(name);
      for (var j = 0; j < count; j++) {
        if (totalPlaced >= maxSpots) break;
        var x, y, attempts = 0;
        do {
          x = rand.nextInt(GRID_SIZE);
          y = rand.nextInt(GRID_SIZE);
          attempts++;
        } while (grid[y][x] !== null && attempts < maxSpots);

        if (grid[y][x] === null) {
          grid[y][x] = new Cell(name, color);
          append(0, y, x, color);
          totalPlaced++;
        } else {
          var found = false;
          for (var r = 0; r < GRID_SIZE && !found; r++) {
            for (var c = 0; c < GRID_SIZE && !found; c++) {
              if (grid[r][c] === null) {
                grid[r][c] = new Cell(name, color);
                append(0, r, c, color);
                totalPlaced++;
                found = true;
              }
            }
          }
        }
      }
    }

    // Tiempos 1..MAX_TIME
    for (var t = 1; t <= MAX_TIME; t++) {
      var nextGrid = emptyGrid();
      for (y = 0; y < GRID_SIZE; y++) {
        for (x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] === null) continue;
          var current = grid[y][x];
          var nextX = Math.max(0, Math.min(GRID_SIZE - 1, x + rand.nextInt(3) - 1));
          var nextY = Math.max(0, Math.min(GRID_SIZE - 1, y + rand.nextInt(3) - 1));

          if (nextGrid[nextY][nextX] === null) {
            nextGrid[nextY][nextX] = current.copy();
            continue;
          }
          var occupant = nextGrid[nextY][nextX];
          if (occupant.name !== current.name) {
            if (canEat(current.color, occupant.color)) {
              var winner = current.copy();
              winner.hasEaten = true;
              if (advanced && current.color === 'blue') winner.hasFoodToShare = true;
              nextGrid[nextY][nextX] = winner;
            } else if (canEat(occupant.color, current.color)) {
              occupant.hasEaten = true;
              if (advanced && occupant.color === 'blue') occupant.hasFoodToShare = true;
            } else {
              placeInFreeSpot(nextGrid, current, nextX, nextY);
            }
          } else {
            if (advanced && current.color === 'blue') {
              if (current.hasFoodToShare && !occupant.hasEaten) {
                occupant.hasEaten = true;
                current.hasFoodToShare = false;
              } else if (occupant.hasFoodToShare && !current.hasEaten) {
                current.hasEaten = true;
                occupant.hasFoodToShare = false;
              }
            }
            if (current.hasEaten) {
              if (reproducir(nextGrid, current, nextX, nextY)) current.hasEaten = false;
            } else if (occupant.hasEaten) {
              if (reproducir(nextGrid, occupant, nextX, nextY)) occupant.hasEaten = false;
            }
            placeInFreeSpot(nextGrid, current, nextX, nextY);
          }
        }
      }
      grid = nextGrid;
      for (y = 0; y < GRID_SIZE; y++) {
        for (x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] !== null) append(t, y, x, grid[y][x].color);
        }
      }
    }
    return out.join('\n') + '\n';
  }

  // Iteration order of a java.util.HashMap holding the six colour keys
  // (collectStats and Collectors.groupingBy both use it; ties keep the first).
  var HASHMAP_ORDER = ['red', 'orange', 'green', 'blue', 'yellow', 'purple'];
  // Key order of Collectors.groupingBy over the stored rows (measured on the JVM)
  var GROUPING_ORDER = ['orange', 'red', 'green', 'blue', 'yellow', 'purple'];
  // Prey of each colour, taken from canEat() in each simulation service
  var PRESAS = {
    standard: { red: ['blue'], blue: ['green'], green: ['yellow'], yellow: ['orange'], orange: ['purple'], purple: ['red'] },
    advanced: { red: ['blue', 'green'], blue: ['yellow'], green: ['yellow'] },
  };

  /**
   * Port of EstadisticasService.obtenerEstadisticas: builds the /Estadisticas
   * response from the text produced by simulate().
   */
  function estadisticas(data, names, tok, mode) {
    var lines = data.trim().split('\n').slice(1);
    // collectStats stores a row for every colour at every step, so the last step is always MAX_TIME
    var counts = {};
    var lastStep = MAX_TIME;
    for (var t = 0; t <= MAX_TIME; t++) {
      counts[t] = {};
      COLORS.forEach(function (c) { counts[t][c] = 0; });
    }
    lines.forEach(function (l) {
      var p = l.split(',');
      counts[+p[0]][p[3]]++;
    });
    var steps = Object.keys(counts).map(Number);
    var stats = [];
    steps.forEach(function (s) {
      HASHMAP_ORDER.forEach(function (c) { stats.push({ pasoTiempo: s, color: c, cantidad: counts[s][c] }); });
    });

    var entidades = names.map(function (n, i) { return { nombre: n, color: i < COLORS.length ? COLORS[i] : 'unknown' }; });
    var poblacion = stats.slice().sort(function (a, b) {
      return a.pasoTiempo - b.pasoTiempo || (a.color < b.color ? -1 : a.color > b.color ? 1 : 0);
    });

    function series(c) { return steps.map(function (s) { return counts[s][c]; }); }
    function maxBy(keys, f) {
      var best = null, bestV;
      keys.forEach(function (k) { var v = f(k); if (best === null || v > bestV) { best = k; bestV = v; } });
      return best;
    }
    var inc = function (c) { var s = series(c), tot = 0; for (var i = 1; i < s.length; i++) if (s[i] - s[i - 1] > 0) tot += s[i] - s[i - 1]; return tot; };
    var dec = function (c) { var s = series(c), tot = 0; for (var i = 1; i < s.length; i++) if (s[i - 1] - s[i] > 0) tot += s[i - 1] - s[i]; return tot; };

    // Colour that ate the most: largest decrease of its present prey, shared between present predators
    var presas = PRESAS[mode === 'advanced' ? 'advanced' : 'standard'];
    var presentes = new Set(entidades.map(function (e) { return e.color; }));
    var masComio = null, mejor = 0;
    COLORS.forEach(function (dep) {
      if (!presentes.has(dep)) return;
      var puntuacion = 0;
      (presas[dep] || []).forEach(function (presa) {
        if (!presentes.has(presa)) return;
        var n = Object.keys(presas).filter(function (k) { return presentes.has(k) && presas[k].indexOf(presa) !== -1; }).length;
        puntuacion += dec(presa) / n;
      });
      if (puntuacion > mejor) { masComio = dep; mejor = puntuacion; }
    });

    var ultimo = stats.filter(function (e) { return e.pasoTiempo === lastStep; });
    var dom = null;
    ultimo.forEach(function (e) { if (dom === null || e.cantidad > dom.cantidad) dom = e; });

    return {
      done: true,
      errorMessage: null,
      tokenSolicitud: tok,
      entidades: entidades,
      poblacionPorPaso: poblacion,
      colorMasReproducido: maxBy(GROUPING_ORDER, inc),
      colorMasComio: masComio,
      colorMasDominante: dom ? dom.color : null,
    };
  }

  var api = { simulate: simulate, estadisticas: estadisticas, JavaRandom: JavaRandom, GRID_SIZE: GRID_SIZE, MAX_TIME: MAX_TIME, COLORS: COLORS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeSim = api;
})(this);
