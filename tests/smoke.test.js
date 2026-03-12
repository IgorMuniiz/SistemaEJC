const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('arquivos essenciais existem', () => {
  const base = process.cwd();
  const required = [
    'app.js',
    path.join('views', 'index.ejs'),
    path.join('views', 'inscricao.ejs'),
    path.join('views', 'encontro.ejs'),
  ];

  required.forEach((rel) => {
    assert.equal(fs.existsSync(path.join(base, rel)), true, `Arquivo ausente: ${rel}`);
  });
});

test('package.json possui scripts de qualidade', () => {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.equal(typeof pkg.scripts, 'object');
  assert.equal(typeof pkg.scripts.check, 'string');
  assert.equal(typeof pkg.scripts.test, 'string');
  assert.equal(typeof pkg.scripts['check:syntax'], 'string');
});
