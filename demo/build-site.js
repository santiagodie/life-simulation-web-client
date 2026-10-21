// Builds the static demo for GitHub Pages from the Thymeleaf templates.
// The templates are copied as they are (styles and markup); only the
// Thymeleaf expressions are replaced by the model that demo.js fills in.
// usage: node demo/build-site.js [outDir]
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, '_site'));
const template = name => fs.readFileSync(path.join(root, 'src/main/resources/templates', name), 'utf8');

const DEMO_SCRIPTS =
  '  <script src="sim.js"></script>\n' +
  '  <script src="data/simulations.js"></script>\n' +
  '  <script src="demo.js"></script>\n' +
  '</head>';

function build(name, replacements, script) {
  let html = template(name).replace('</head>', DEMO_SCRIPTS);
  for (const [pattern, value] of replacements) {
    if (!pattern.test(html)) throw new Error(`${name}: pattern not found: ${pattern}`);
    html = html.replace(pattern, value);
  }
  html = html.replace(' xmlns:th="http://www.thymeleaf.org"', '');
  const left = html.match(/th:[a-z]+="[^"]*"|\[\[\$\{/);
  if (left) throw new Error(`${name}: Thymeleaf expression left: ${left[0]}`);
  return script ? html.replace('</body>', `  <script>\n${script}\n  </script>\n</body>`) : html;
}

const pages = {
  // GET /solicitud
  'index.html': build('solicitud.html', [
    [/<form th:action="@\{\/solicitud\}" method="post">\s*<div th:each="entity : \$\{entities\}" class="field">[\s\S]*?<\/div>/,
      '<form action="formResult.html" method="post" id="solicitudForm">'],
  ], `    // th:each="entity : \${entities}"
    const form = document.getElementById('solicitudForm');
    form.insertAdjacentHTML('afterbegin', Demo.entities.map(e =>
      '<div class="field"><label for="' + e.id + '">Núm. de ' + e.name + '</label>' +
      '<input type="number" min="0" id="' + e.id + '" name="' + e.id + '" placeholder="0" /></div>').join(''));
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const formData = {};
      new FormData(form).forEach(function (v, k) { formData[k] = v; });
      location.href = 'formResult.html' + Demo.handleSolicitud(formData);
    });`),

  // POST /solicitud
  'formResult.html': build('formResult.html', [
    [/<div class="token-box" th:text="\$\{token\}">/, '<div class="token-box" id="token">'],
    [/<a th:href="@\{\/grid\(tok=\$\{token\}\)\}" class="btn-grid">/, '<a href="grid.html" class="btn-grid" id="gridLink">'],
  ], `    const token = new URLSearchParams(location.search).get('token') || '';
    document.getElementById('token').textContent = token;
    document.getElementById('gridLink').href = 'grid.html?tok=' + token;`),

  // GET /grid?tok=
  'grid.html': build('grid.html', [
    [/ th:max="\$\{maxTime - 1\}"/, ''],
    [/<a th:href="@\{\/solicitud\}" class="btn-nueva">/, '<a href="./" class="btn-nueva">'],
    [/<script th:inline="javascript">\s*const count = \/\*\[\[\$\{count\}\]\]\*\/ 3;\s*const colors = \/\*\[\[\$\{colors\}\]\]\*\/ \{\};/,
      '<script>\n\t\t// Model attributes set by GridController\n' +
      "\t\tconst model = Demo.gridModel(Number(new URLSearchParams(location.search).get('tok')));\n" +
      '\t\tconst count = model.count;\n\t\tconst colors = model.colors;\n' +
      "\t\tdocument.getElementById('mySlider').max = model.maxTime - 1;"],
  ], ''),
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
for (const [name, html] of Object.entries(pages)) fs.writeFileSync(path.join(out, name), html);
for (const f of ['demo.js', 'sim.js', 'data/simulations.js']) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
console.log('Site written to ' + out);
