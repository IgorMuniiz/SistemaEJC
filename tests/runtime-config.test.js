const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRuntimeConfig, isStrongSessionSecret } = require('../src/config/runtime');

test('isStrongSessionSecret valida tamanho minimo e bloqueia valor padrao inseguro', () => {
  assert.equal(isStrongSessionSecret(''), false);
  assert.equal(isStrongSessionSecret('curto-demais'), false);
  assert.equal(isStrongSessionSecret('seu-supercódigo-secreto-mude-em-producao'), false);
  assert.equal(isStrongSessionSecret('0123456789abcdefghijklmnop'), true);
});

test('buildRuntimeConfig em producao gera fallback seguro e warnings sem derrubar o processo', () => {
  const result = buildRuntimeConfig({
    NODE_ENV: 'production',
    SESSION_SECRET: 'fraca',
    MONGODB_URI: '',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
  });

  assert.equal(result.isProduction, true);
  assert.equal(typeof result.sessionSecret, 'string');
  assert.ok(result.sessionSecret.length >= 32);
  assert.ok(result.warnings.some((warning) => warning.includes('SESSION_SECRET')));
  assert.ok(result.warnings.some((warning) => warning.includes('MONGODB_URI')));
  assert.ok(result.warnings.some((warning) => warning.includes('VAPID_PUBLIC_KEY')));
});

test('buildRuntimeConfig preserva configuracao valida sem warnings desnecessarios', () => {
  const result = buildRuntimeConfig({
    NODE_ENV: 'production',
    SESSION_SECRET: '0123456789abcdefghijklmnop',
    MONGODB_URI: 'mongodb://db.example/app',
    VAPID_PUBLIC_KEY: 'public-key',
    VAPID_PRIVATE_KEY: 'private-key',
  });

  assert.equal(result.isProduction, true);
  assert.equal(result.sessionSecret, '0123456789abcdefghijklmnop');
  assert.equal(result.hasMongoConnectionString, true);
  assert.equal(result.hasVapidKeys, true);
  assert.deepEqual(result.warnings, []);
});
