const crypto = require('crypto');
const { normalizeTextInput } = require('../utils/normalization');

const ensureAdminCsrfToken = (req, res, next) => {
  if (!req.session) return next();

  if (!req.session.adminCsrfToken) {
    req.session.adminCsrfToken = crypto.randomBytes(24).toString('hex');
  }

  res.locals.adminCsrfToken = req.session.adminCsrfToken;
  return next();
};

const isSameOriginRequest = (req) => {
  const host = normalizeTextInput(req.get('host'));
  if (!host) return false;

  const allowedOrigin = `${req.protocol}://${host}`;
  const origin = normalizeTextInput(req.get('origin'));
  const referer = normalizeTextInput(req.get('referer'));

  if (origin) return origin === allowedOrigin;
  if (referer) return referer === allowedOrigin || referer.startsWith(`${allowedOrigin}/`);
  return false;
};

const adminCsrfGuard = (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  const routePath = String(req.path || '');
  const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (!stateChanging || !routePath.startsWith('/admin')) {
    return next();
  }

  if (routePath === '/admin/login') {
    return next();
  }

  const expectedToken = normalizeTextInput(req.session?.adminCsrfToken);
  const providedToken = normalizeTextInput(
    req.get('x-csrf-token')
      || req.get('x-admin-csrf')
      || req.body?._csrf
      || req.query?._csrf
  );

  if (
    expectedToken
    && providedToken
    && providedToken.length === expectedToken.length
    && crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))
  ) {
    return next();
  }

  if (isSameOriginRequest(req)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Falha de validacao CSRF. Recarregue a pagina e tente novamente.',
  });
};

module.exports = {
  ensureAdminCsrfToken,
  isSameOriginRequest,
  adminCsrfGuard,
};
