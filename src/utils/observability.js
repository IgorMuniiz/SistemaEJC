const crypto = require('crypto');

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const createRequestId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(12).toString('hex');
};

const attachRequestContext = () => (req, res, next) => {
  const incomingRequestId = String(req.headers['x-request-id'] || '').trim();
  const requestId = incomingRequestId || createRequestId();

  req.requestId = requestId;
  req.requestStartedAt = process.hrtime.bigint();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

const shouldLogRequest = ({ req, res, durationMs, slowRequestMs }) => {
  if (res.statusCode >= 500) return true;
  if (durationMs >= slowRequestMs) return true;

  const pathName = String(req.path || req.originalUrl || req.url || '');
  return pathName === '/healthz' || pathName === '/readyz';
};

const logRequestSummary = ({ slowRequestMs = 1500 } = {}) => (req, res, next) => {
  res.on('finish', () => {
    if (typeof req.requestStartedAt !== 'bigint') return;

    const durationMs = Number(process.hrtime.bigint() - req.requestStartedAt) / 1e6;
    if (!shouldLogRequest({ req, res, durationMs, slowRequestMs })) return;

    const summary = {
      type: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      ip: req.ip,
    };

    console.log(`[REQ] ${JSON.stringify(summary)}`);
  });

  next();
};

const logStartupBanner = ({ host, port, displayHost, environment, mongoState }) => {
  const mongoStatus = READY_STATES[mongoState] || String(mongoState);
  console.log(`[BOOT] Ambiente: ${environment}`);
  console.log(`[BOOT] Server running on http://${displayHost}:${port}`);
  console.log(`[BOOT] Listening on ${host}:${port} | Mongo: ${mongoStatus}`);
};

module.exports = {
  attachRequestContext,
  createRequestId,
  logRequestSummary,
  logStartupBanner,
};
