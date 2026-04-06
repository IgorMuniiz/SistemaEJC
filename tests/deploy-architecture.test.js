const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveSessionCookieSecure } = require('../src/config/session');
const { executeLgpdRetention } = require('../src/services/lgpdRetentionService');

test('resolveSessionCookieSecure interpreta valores esperados do ambiente', () => {
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: '' }), 'auto');
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: 'true' }), true);
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: 'false' }), false);
  assert.equal(resolveSessionCookieSecure({ SESSION_COOKIE_SECURE: 'auto' }), 'auto');
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
