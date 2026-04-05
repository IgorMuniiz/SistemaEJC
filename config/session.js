const session = require('express-session');
const { default: MongoStore } = require('connect-mongo');
const { IS_PRODUCTION, SKIP_MONGO_CONNECT, mongoUri } = require('./environment');

const createSessionStore = () => {
  if (process.env.NODE_ENV === 'test' || SKIP_MONGO_CONNECT) {
    return null;
  }

  try {
    const sessionMongoUri = mongoUri;
    return MongoStore.create({
      mongoUrl: sessionMongoUri,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24,
      autoRemove: 'native',
      touchAfter: 24 * 3600,
    });
  } catch (err) {
    console.error('Falha ao inicializar session store persistente:', err.message);
    return null;
  }
};

const configureSession = (app) => {
  const sessionStore = createSessionStore();
  if (!sessionStore) {
    console.warn('Session store persistente indisponivel. Usando MemoryStore (nao recomendado em producao).');
  }

  app.use(session({
    name: 'ejc.sid',
    store: sessionStore || undefined,
    secret: process.env.SESSION_SECRET || 'seu-supercódigo-secreto-mude-em-producao',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: IS_PRODUCTION ? 'auto' : false,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }));
};

module.exports = { createSessionStore, configureSession };
