const test = require('node:test');
const assert = require('node:assert/strict');

const { buildHelmetConfig } = require('../src/config/security');

test('buildHelmetConfig expõe CSP em modo report-only com origens seguras', () => {
  const config = buildHelmetConfig();

  assert.equal(config.contentSecurityPolicy.reportOnly, true);
  assert.deepEqual(config.contentSecurityPolicy.directives.defaultSrc, ["'self'"]);
  assert.ok(config.contentSecurityPolicy.directives.scriptSrc.includes("'self'"));
  assert.ok(config.contentSecurityPolicy.directives.styleSrc.includes("'unsafe-inline'"));
});

test('buildHelmetConfig mantém object e frame ancenstors restritos', () => {
  const config = buildHelmetConfig();

  assert.deepEqual(config.crossOriginResourcePolicy, { policy: 'cross-origin' });
  assert.deepEqual(config.contentSecurityPolicy.directives.objectSrc, ["'none'"]);
  assert.deepEqual(config.contentSecurityPolicy.directives.frameAncestors, ["'self'"]);
});
