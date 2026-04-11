const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveSessionCookieSecure, resolveSessionStoreMongoUrl } = require('../src/config/session');
const { resolveMongoConfig } = require('../src/config/mongo');
const { executeLgpdRetention } = require('../src/services/lgpdRetentionService');

test('resolveSessionCookieSecure interpreta valores esperados do ambiente', () => {
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: '' }), 'auto');
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: 'true' }), true);
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: 'false' }), false);
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: 'auto' }), 'auto');
});

test('resolveMongoConfig prioriza localhost em desenvolvimento para restaurar o boot local rapido', () => {
  const result = resolveMongoConfig({
    env: {
      MONGODB_URL: 'mongodb://192.168.0.10:27017/ECJCOP',
    },
    isProduction: false,
  });

  assert.equal(result.mongoUri, 'mongodb://127.0.0.1:27017/ECJCOP');
  assert.equal(result.mongoFallbackUri, 'mongodb://192.168.0.10:27017/ECJCOP');
});

test('resolveSessionStoreMongoUrl nao herda Mongo remoto automaticamente em desenvolvimento', () => {
  const result = resolveSessionStoreMongoUrl({
    NODE_ENV: 'development',
    MONGODB_URL: 'mongodb://192.168.0.10:27017/ECJCOP',
  });

  assert.equal(result, '');
});

test('executeLgpdRetention retorna skipped quando o Mongo nao esta pronto', async () => {
  const result = await executeLgpdRetention({
    retentionDays: 60,
    approvalStatuses: ['pendente', 'aprovado'],
    mongoose: { connection: { readyState: 0 } },
    Cadastro: {},
    Encontro: {},
  });

  assert.equal(result.skipped, true);
  assert.equal(result.totalAnonimizados, 0);
  assert.equal(result.retentionDays, 60);
});
