const test = require('node:test');
const assert = require('node:assert/strict');

const { attachRequestContext, createRequestId } = require('../src/utils/observability');

test('createRequestId gera identificadores únicos e não vazios', () => {
  const first = createRequestId();
  const second = createRequestId();

  assert.ok(typeof first === 'string' && first.length >= 12);
  assert.ok(typeof second === 'string' && second.length >= 12);
  assert.notEqual(first, second);
});

test('attachRequestContext injeta requestId no req, res.locals e header de resposta', () => {
  const middleware = attachRequestContext();
  const req = {
    headers: {},
    method: 'GET',
    url: '/healthz',
    originalUrl: '/healthz',
  };
  const responseHeaders = {};
  const res = {
    locals: {},
    setHeader(name, value) {
      responseHeaders[name] = value;
    },
  };

  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.locals.requestId, req.requestId);
  assert.equal(responseHeaders['X-Request-Id'], req.requestId);
  assert.equal(typeof req.requestStartedAt, 'bigint');
});
