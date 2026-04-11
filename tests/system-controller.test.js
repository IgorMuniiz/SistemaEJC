const test = require('node:test');
const assert = require('node:assert/strict');

const { createSystemController } = require('../src/controllers/systemController');

test('health controller responde status ok com uptime e timestamp', () => {
  const controller = createSystemController({
    mongoose: { connection: { readyState: 1 } },
    now: () => new Date('2026-04-06T12:00:00.000Z'),
    uptime: () => 12.4,
  });

  const response = controller.getHealthStatus();
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.uptimeSec, 12);
  assert.equal(response.body.timestamp, '2026-04-06T12:00:00.000Z');
});

test('readiness controller responde 200 em modo degradado por padrao quando Mongo nao esta conectado', () => {
  const controller = createSystemController({
    mongoose: { connection: { readyState: 0 } },
    now: () => new Date('2026-04-06T12:00:00.000Z'),
  });

  const response = controller.getReadinessStatus();
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'degraded');
  assert.equal(response.body.mongo, 'disconnected');
  assert.equal(response.body.ready, false);
});

test('readiness controller responde 503 em modo estrito quando Mongo nao esta conectado', () => {
  const controller = createSystemController({
    mongoose: { connection: { readyState: 0 } },
    now: () => new Date('2026-04-06T12:00:00.000Z'),
    strictReadiness: true,
  });

  const response = controller.getReadinessStatus();
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.status, 'degraded');
  assert.equal(response.body.mongo, 'disconnected');
  assert.equal(response.body.ready, false);
});
