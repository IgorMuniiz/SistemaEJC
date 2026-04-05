const rateLimit = require('express-rate-limit');

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
});

const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 260,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const method = String(req.method || '').toUpperCase();
    const pathName = String(req.path || '');
    if (!pathName.startsWith('/admin')) return true;
    if (pathName === '/admin/login') return true;
    return !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Muitas operações em sequência. Aguarde alguns minutos e tente novamente.',
    });
  },
});

module.exports = {
  adminLoginLimiter,
  adminWriteLimiter,
};
