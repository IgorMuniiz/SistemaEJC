const readRawEnvValue = (value) => String(value || '').trim();

const deriveLocalMongoUri = (value, defaultDbName = 'ECJCOP') => {
  const raw = readRawEnvValue(value);
  const dbNameMatch = raw.match(/\/([^/?]+)(?:\?|$)/);
  const dbName = dbNameMatch && dbNameMatch[1] ? dbNameMatch[1] : defaultDbName;
  return `mongodb://127.0.0.1:27017/${dbName}`;
};

const isLocalMongoUri = (value) => /mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost)/i.test(readRawEnvValue(value));

const resolveMongoConfig = ({ env = process.env, isProduction = false } = {}) => {
  const explicitMongoUri = readRawEnvValue(env.MONGODB_URL || env.MONGODB_URI || env.MONGO_URI);
  const explicitFallbackUri = readRawEnvValue(env.MONGODB_FALLBACK_URL);

  if (!isProduction) {
    const localPreferredUri = explicitMongoUri
      ? (isLocalMongoUri(explicitMongoUri) ? explicitMongoUri : deriveLocalMongoUri(explicitMongoUri))
      : 'mongodb://127.0.0.1:27017/ejc_sistema';

    return {
      explicitMongoUri,
      mongoUri: localPreferredUri,
      mongoFallbackUri: explicitFallbackUri || (explicitMongoUri && explicitMongoUri !== localPreferredUri ? explicitMongoUri : 'mongodb://127.0.0.1:27017/ECJCOP'),
    };
  }

  return {
    explicitMongoUri,
    mongoUri: explicitMongoUri || '',
    mongoFallbackUri: explicitFallbackUri || '',
  };
};

const connectToMongo = async ({ mongoose, mongoUri, mongoFallbackUri, logger = console }) => {
  const uris = [mongoUri, mongoFallbackUri].filter((value, index, arr) => value && arr.indexOf(value) === index);

  if (!uris.length) {
    logger.warn('MongoDB nao configurado. A aplicacao seguira em modo degradado ate receber uma URI valida.');
    return null;
  }

  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index];
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });

      if (index === 0) {
        logger.log('MongoDB conectado com sucesso.');
      } else {
        logger.warn(`MongoDB conectado com fallback local: ${uri}`);
      }

      return mongoose.connection;
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      const isLast = index === uris.length - 1;
      logger.error(`Falha ao conectar no MongoDB (${uri}).`);

      if (message.includes('whitelist') || message.includes('ReplicaSetNoPrimary')) {
        logger.error('No Atlas, libere o IP atual em Network Access e valide usuario/senha da URI.');
      }

      logger.error(`Detalhes: ${message}`);

      if (isLast) {
        logger.error('MongoDB indisponivel. Defina MONGODB_URI, MONGODB_URL ou MONGO_URI no ambiente de producao.');
      }
    }
  }

  return null;
};

const registerMongoObservers = ({ mongoose, logger = console }) => {
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB desconectado.');
  });

  mongoose.connection.on('reconnected', () => {
    logger.log('MongoDB reconectado.');
  });
};

module.exports = {
  connectToMongo,
  registerMongoObservers,
  resolveMongoConfig,
};
