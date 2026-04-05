const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IMPORT_PLACEHOLDER_IMAGE = 'import-placeholder.jpg';
const SKIP_MONGO_CONNECT = process.env.SKIP_MONGO_CONNECT === '1';
const ENABLE_BACKGROUND_JOBS = process.env.DISABLE_BACKGROUND_JOBS !== '1'
  && process.env.NODE_ENV !== 'test'
  && !SKIP_MONGO_CONNECT;

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ECJCOP';

const validateRuntimeConfig = () => {
  const issues = [];

  if (IS_PRODUCTION) {
    const secret = String(process.env.SESSION_SECRET || '');
    if (!secret || secret.includes('mude-em-producao') || secret.length < 24) {
      issues.push('SESSION_SECRET forte (>= 24 chars) obrigatorio em producao.');
    }

    if (!process.env.MONGODB_URI) {
      issues.push('Defina MONGODB_URI em producao.');
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
  validateRuntimeConfig,
};
