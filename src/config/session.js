const normalizeEnvValue = (value) => String(value || '').trim().toLowerCase();
const readRawEnvValue = (value) => String(value || '').trim();

const resolveSessionCookieSecure = (env = process.env) => {
  const raw = normalizeEnvValue(env.SESSION_COOKIE_SECURE);
  if (!raw || raw === 'auto') return 'auto';
  if (['true', '1', 'on', 'yes'].includes(raw)) return true;
  if (['false', '0', 'off', 'no'].includes(raw)) return false;
  return 'auto';
};

const resolveSessionStoreMongoUrl = (env = process.env) => (
  readRawEnvValue(env.SESSION_STORE_MONGO_URI)
  || readRawEnvValue(env.MONGODB_URL)
  || readRawEnvValue(env.MONGODB_URI)
  || readRawEnvValue(env.MONGO_URI)
);

const attachAsyncStoreGuards = (store, logger = console) => {
  if (store && store.clientP && typeof store.clientP.catch === 'function') {
    store.clientP.catch((err) => {
      logger.error(`Falha assíncrona no client do session store: ${err.message}`);
      return null;
    });
  }

  if (store && store.collectionP && typeof store.collectionP.catch === 'function') {
    store.collectionP.catch((err) => {
      logger.error(`Falha assíncrona na collection do session store: ${err.message}`);
      return null;
    });
  }
};

const createSessionStore = ({ env = process.env, mongoose, MongoStore, skipMongoConnect = false, logger = console }) => {
  if (env.NODE_ENV === 'test' || skipMongoConnect) {
    return null;
  }

  try {
    if (!MongoStore || typeof MongoStore.create !== 'function') {
      throw new Error('Adaptador connect-mongo incompatível com create().');
    }

    const sessionMongoUrl = resolveSessionStoreMongoUrl(env);
    if (sessionMongoUrl) {
      const store = MongoStore.create({
        mongoUrl: sessionMongoUrl,
        mongoOptions: {
          serverSelectionTimeoutMS: 10000,
        },
        collectionName: 'sessions',
        ttl: 60 * 60 * 24,
        autoRemove: 'native',
        touchAfter: 24 * 3600,
      });
      attachAsyncStoreGuards(store, logger);
      return store;
    }

    if (!mongoose || !mongoose.connection || mongoose.connection.readyState !== 1) {
      logger.warn('Mongo principal ainda nao esta pronto para o session store. Usando MemoryStore neste boot.');
      return null;
    }

    const mongoClient = typeof mongoose.connection.getClient === 'function'
      ? mongoose.connection.getClient()
      : mongoose.connection.client;

    if (!mongoClient) {
      logger.warn('Cliente Mongo indisponivel para o session store. Usando MemoryStore neste boot.');
      return null;
    }

    const store = MongoStore.create({
      client: mongoClient,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24,
      autoRemove: 'native',
      touchAfter: 24 * 3600,
    });
    attachAsyncStoreGuards(store, logger);
    return store;
  } catch (err) {
    logger.error(`Falha ao inicializar session store persistente: ${err.message}`);
    return null;
  }
};

const buildSessionMiddleware = ({ session, sessionStore, sessionSecret, env = process.env }) => session({
  name: 'ejc.sid',
  store: sessionStore || undefined,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: resolveSessionCookieSecure(env),
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
});

module.exports = {
  buildSessionMiddleware,
  createSessionStore,
  resolveSessionCookieSecure,
  resolveSessionStoreMongoUrl,
};
