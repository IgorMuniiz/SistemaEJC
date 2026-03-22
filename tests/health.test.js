const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.SKIP_MONGO_CONNECT = '1';

const { app } = require('../app');

test('GET /healthz retorna 200 e status ok', async () => {
  const response = await request(app).get('/healthz');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.ok(typeof response.body.uptimeSec === 'number');
});

test('GET /readyz retorna 503 quando Mongo nao esta conectado', async () => {
  const response = await request(app).get('/readyz');

  assert.equal(response.status, 503);
  assert.equal(response.body.status, 'degraded');
  assert.equal(response.body.mongo, 'disconnected');
});
