const createSystemController = ({
  mongoose,
  now = () => new Date(),
  uptime = () => process.uptime(),
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

    return mongoReady
      ? {
          statusCode: 200,
          body: {
            status: 'ready',
            mongo: 'connected',
            timestamp: getTimestamp(),
          },
        }
      : {
          statusCode: 503,
          body: {
            status: 'degraded',
            mongo: 'disconnected',
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
};
