const crypto = require('crypto');

const normalizeEnvValue = (value) => String(value || '').trim();

const isStrongSessionSecret = (value) => {
  const secret = normalizeEnvValue(value);
  return Boolean(secret) && !secret.includes('mude-em-producao') && secret.length >= 24;
};

const hasMongoEnv = (env = process.env) => Boolean(
  normalizeEnvValue(env.MONGODB_URL)
  || normalizeEnvValue(env.MONGODB_URI)
  || normalizeEnvValue(env.MONGO_URI)
);

const createEphemeralSessionSecret = () => crypto.randomBytes(32).toString('hex');

const buildRuntimeConfig = (env = process.env) => {
  const isProduction = normalizeEnvValue(env.NODE_ENV).toLowerCase() === 'production';
  const warnings = [];

  const providedSessionSecret = normalizeEnvValue(env.SESSION_SECRET);
  const sessionSecretStrong = isStrongSessionSecret(providedSessionSecret);
  const sessionSecret = sessionSecretStrong ? providedSessionSecret : createEphemeralSessionSecret();

  if (isProduction && !sessionSecretStrong) {
    warnings.push('SESSION_SECRET ausente ou fraco; usando um segredo efêmero para o boot atual.');
  }

  const hasMongoConnectionString = hasMongoEnv(env);
  if (isProduction && !hasMongoConnectionString) {
    warnings.push('MONGODB_URI/MONGODB_URL/MONGO_URI nao definido; a aplicacao pode iniciar em modo degradado.');
  }

  const vapidPublicKey = normalizeEnvValue(env.VAPID_PUBLIC_KEY);
  const vapidPrivateKey = normalizeEnvValue(env.VAPID_PRIVATE_KEY);
  const hasVapidKeys = Boolean(vapidPublicKey && vapidPrivateKey);

  if (isProduction && !hasVapidKeys) {
    warnings.push('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes; notificacoes push usarao chaves temporarias.');
  }

  return {
    isProduction,
    warnings,
    sessionSecret,
    hasMongoConnectionString,
    hasVapidKeys,
    vapidPublicKey,
    vapidPrivateKey,
  };
};

module.exports = {
  buildRuntimeConfig,
  createEphemeralSessionSecret,
  hasMongoEnv,
  isStrongSessionSecret,
};
