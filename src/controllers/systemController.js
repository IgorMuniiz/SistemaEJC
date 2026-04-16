const isEnabled = (value) => ['1', 'true', 'yes', 'on', 'strict'].includes(String(value || '').trim().toLowerCase());

const resolveStrictReadiness = (env = process.env) => {
  const explicit = env.READINESS_STRICT || env.READYZ_STRICT || env.READINESS_REQUIRES_MONGO;
  if (String(explicit || '').trim()) {
    return isEnabled(explicit);
  }

  return String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
};

const createSystemController = ({
  mongoose,
  now = () => new Date(),
  uptime = () => process.uptime(),
  env = process.env,
  strictReadiness = resolveStrictReadiness(env),
} = {}) => {
  const getTimestamp = () => now().toISOString();

  const getHealthStatus = () => ({
    statusCode: 200,
    body: {
      status: 'ok',
      uptimeSec: Math.round(Number(uptime()) || 0),
      timestamp: getTimestamp(),
    },
  });

  const getReadinessStatus = () => {
    const mongoReady = Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);

    if (mongoReady) {
      return {
        statusCode: 200,
        body: {
          status: 'ready',
          ready: true,
          mongo: 'connected',
          timestamp: getTimestamp(),
        },
      };
    }

    return {
      statusCode: strictReadiness ? 503 : 200,
      body: {
        status: 'degraded',
        ready: false,
        mongo: 'disconnected',
        strict: strictReadiness,
        timestamp: getTimestamp(),
      },
    };
  };

  return {
    getHealthStatus,
    getReadinessStatus,
    healthz(req, res) {
      const response = getHealthStatus();
      return res.status(response.statusCode).json(response.body);
    },
    readyz(req, res) {
      const response = getReadinessStatus();
      return res.status(response.statusCode).json(response.body);
    },
  };
};

module.exports = {
  createSystemController,
  resolveStrictReadiness,
};
