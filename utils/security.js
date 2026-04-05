const path = require('path');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '';
};

const isSafeFilePath = (baseDir, candidatePath) => {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(candidatePath);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(`${resolvedBase}${path.sep}`);
};

module.exports = {
  getClientIp,
  isSafeFilePath,
};
