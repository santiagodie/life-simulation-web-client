/*
 * Static demo layer for GitHub Pages.
 *
 * Replaces the Spring controllers and the calls to life-simulation-service:
 *   - SolicitudController.handleSolicitud -> Demo.handleSolicitud
 *   - GridController.solicitud            -> Demo.gridModel
 * Simulations come from responses recorded from the real service
 * (data/simulations.js) or are run in the browser with sim.js, the
 * JavaScript port of the service's simulation (standard mode, the default
 * in its docker-compose).
 */
(function () {
  'use strict';

  var REPO = 'https://github.com/santiagodie/life-simulation-web-client';
  var SERVICE = 'https://github.com/santiagodie/life-simulation-service';
  var STORE = 'lifesim-client-demo';

  // ContactoSimService.createEntities()
  var entities = [
    { id: 1, name: 'Servidores' },
    { id: 2, name: 'Clientes' },
    { id: 3, name: 'Bases de datos' },
  ];

  var recorded = {};
  (window.DEMO_DATA ? window.DEMO_DATA.simulations : []).forEach(function (s) { recorded[s.token] = s; });

  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function writeStore(v) {
    try { sessionStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* ignore */ }
  }

  /** Integer.parseInt semantics: optional sign and decimal digits only. */
  function parseJavaInt(value) {
    if (!/^[+-]?\d+$/.test(value)) return null;
    var n = Number(value);
    return n >= -2147483648 && n <= 2147483647 ? n : null;
  }

  /**
   * SolicitudController.handleSolicitud: validates the form and, if it is
   * valid, requests a simulation. Returns the query string for formResult.html.
   */
  function handleSolicitud(formData) {
    var valid = {}, errors = [];
    Object.keys(formData).forEach(function (key) {
      var num = parseJavaInt(formData[key]);
      var id = parseJavaInt(key);
      if (num === null || id === null) { errors.push(key + ' debe ser un número entero'); return; }
      if (num < 0) errors.push(key + ' no puede ser negativo');
      if (entities.some(function (e) { return e.id === id; })) valid[id] = num;
      else errors.push(key + 'no se corresponde con una entidad');
    });
    if (errors.length) return '';

    // ContactoSimService.solicitarSimulation: names and quantities in map order
    var names = [], quantities = [];
    Object.keys(valid).map(Number).sort(function (a, b) { return a - b; }).forEach(function (id) {
      names.push(entities.filter(function (e) { return e.id === id; })[0].name);
      quantities.push(valid[id]);
    });
    var store = readStore();
    var tok;
    do { tok = 10000 + Math.floor(Math.random() * 90000); } while (recorded[tok] || store[tok]);
    store[tok] = LifeSim.simulate({ mode: 'standard', names: names, quantities: quantities });
    writeStore(store);
    return '?token=' + tok;
  }

  /** ContactoSimService.descargarDatos + GridController.solicitud */
  function gridModel(tok) {
    var data = recorded[tok] ? recorded[tok].data : readStore()[tok];
    if (!data) return { count: 0, maxTime: 1, colors: {}, missing: true };
    var lineas = data.split('\n');
    var ancho = parseInt(lineas[0].trim(), 10);
    var puntos = {}, maxTiempo = 0;
    for (var i = 1; i < lineas.length; i++) {
      var linea = lineas[i].trim();
      if (!linea) continue;
      var p = linea.split(',');
      var t = parseInt(p[0], 10);
      (puntos[t] = puntos[t] || []).push({ y: parseInt(p[1], 10), x: parseInt(p[2], 10), color: p[3].trim() });
      if (t > maxTiempo) maxTiempo = t;
    }
    var maxSegundos = maxTiempo + 1;
    var colors = {};
    for (var s = 0; s < maxSegundos; s++) {
      (puntos[s] || []).forEach(function (pt) { colors[s + '-' + pt.y + '-' + pt.x] = pt.color; });
    }
    return { count: ancho, maxTime: maxSegundos, colors: colors };
  }

  // ── Demo strip ─────────────────────────────────────────────
  // Uses the templates' own variables (--surface, --border, --text-2, --accent, --font-b, --r)
  var CSS = '.demo-strip{width:100%;max-width:720px;margin:0 0 1.75rem;padding:.7rem .95rem;' +
    'font-family:var(--font-b);font-size:.78rem;line-height:1.55;color:var(--text-2);' +
    'border:1px solid var(--border);border-radius:var(--r)}' +
    '.demo-strip p+p{margin-top:.35rem}.demo-strip strong{color:var(--text-1);font-weight:500}' +
    '.demo-strip a{color:var(--accent);text-decoration:none}.demo-strip a:hover{text-decoration:underline}';

  function strip() {
    var page = (location.pathname.match(/([a-zA-Z]+)\.html$/) || [])[1] || 'index';
    var params = new URLSearchParams(location.search);
    var html = '<p><strong>Demo estática.</strong> Las simulaciones se ejecutan en el navegador con las mismas reglas que ' +
      '<a href="' + SERVICE + '">life-simulation-service</a> (modo standard). El envío de emails está desactivado en la demo. ' +
      'Para ejecutarlo completo con Docker, <a href="' + REPO + '#getting-started">consulta el repositorio</a>.</p>';
    var toks = Object.keys(recorded);
    if (page === 'index' && toks.length) {
      html += '<p>Simulaciones grabadas del servicio real: ' + toks.map(function (t) {
        return '<a href="grid.html?tok=' + t + '">' + t + '</a>';
      }).join(', ') + '</p>';
    }
    if (page === 'grid' && gridModel(Number(params.get('tok'))).missing) {
      html += '<p>No hay ninguna simulación con ese token.</p>';
    }
    var div = document.createElement('div');
    div.className = 'demo-strip';
    div.setAttribute('role', 'note');
    div.innerHTML = html;
    return div;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    var note = strip();
    var header = document.querySelector('header');
    if (header) note.style.maxWidth = getComputedStyle(header).maxWidth; // same width as the page column
    document.body.insertBefore(note, document.body.firstChild);
  });

  window.Demo = { entities: entities, handleSolicitud: handleSolicitud, gridModel: gridModel };
})();
