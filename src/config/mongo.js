const resolveMongoConfig = ({ env = process.env, isProduction = false } = {}) => {
  const explicitMongoUri = String(env.MONGODB_URL || env.MONGODB_URI || env.MONGO_URI || '').trim();

  return {
    explicitMongoUri,
    mongoUri: explicitMongoUri || (isProduction ? '' : 'mongodb://127.0.0.1:27017/ejc_sistema'),
    mongoFallbackUri: String(env.MONGODB_FALLBACK_URL || '').trim() || (isProduction ? '' : 'mongodb://127.0.0.1:27017/ECJCOP'),
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
