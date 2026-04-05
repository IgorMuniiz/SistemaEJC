const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });


/**
 * Apagar
 */ 
  Object.assign(process.env, {
    NODE_ENV: process.env.NODE_ENV || 'production',
    HOST: process.env.HOST || '0.0.0.0',
    PORT: process.env.PORT || '3000',
    SESSION_SECRET: process.env.SESSION_SECRET || 'troque-por-uma-chave-longa-com-mais-de-24-caracteres',
    SESSION_STORE_MONGO_URI: process.env.SESSION_STORE_MONGO_URI || 'mongodb://localhost:27017/ECJCOP',
    MONGODB_URI: 'mongodb://localhost:27017/ECJCOP',
    MONGODB_FALLBACK_URL: process.env.MONGODB_FALLBACK_URL || 'mongodb://localhost:27017/ECJCOP',
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BFB4vGEoUXC1nBCnkOFtSUYXnphQ8ra085blYsCWDgW_v2Y2Uq8DczZtg97nb2WBi3lS5QFwsINOG042CtHd8ys',
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'iIdQPG8Dad39NUNV67ownWcOzt3TZY9T5f-iW-3GZGM',
  });

 



const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IMPORT_PLACEHOLDER_IMAGE = 'import-placeholder.jpg';
const SKIP_MONGO_CONNECT = process.env.SKIP_MONGO_CONNECT === '1';
const ENABLE_BACKGROUND_JOBS = process.env.DISABLE_BACKGROUND_JOBS !== '1'
  && process.env.NODE_ENV !== 'test'
  && !SKIP_MONGO_CONNECT;

const mongoUri = process.env.MONGODB_URL
  || process.env.MONGODB_URI
  || process.env.MONGO_URI
  || 'mongodb://127.0.0.1:27017/ejc_sistema';
const mongoFallbackUri = process.env.MONGODB_FALLBACK_URL || 'mongodb://127.0.0.1:27017/ECJCOP';

const validateRuntimeConfig = () => {
  const issues = [];

  if (IS_PRODUCTION) {
    const secret = String(process.env.SESSION_SECRET || '');
    if (!secret || secret.includes('mude-em-producao') || secret.length < 24) {
      issues.push('SESSION_SECRET forte (>= 24 chars) obrigatorio em producao.');
    }

    const hasMongoEnv = Boolean(process.env.MONGODB_URL || process.env.MONGODB_URI || process.env.MONGO_URI);
    if (!hasMongoEnv) {
      issues.push('Defina MONGODB_URI/MONGODB_URL/MONGO_URI em producao.');
    }
  }

  if (issues.length > 0) {
    throw new Error(`Configuracao invalida de ambiente:\n- ${issues.join('\n- ')}`);
  }
};

module.exports = {
  IS_PRODUCTION,
  PORT,
  HOST,
  IMPORT_PLACEHOLDER_IMAGE,
  SKIP_MONGO_CONNECT,
  ENABLE_BACKGROUND_JOBS,
  mongoUri,
  mongoFallbackUri,
  validateRuntimeConfig,
};
