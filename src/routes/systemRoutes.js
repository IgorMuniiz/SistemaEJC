const express = require('express');
const { createSystemController } = require('../controllers/systemController');

const createSystemRouter = ({ mongoose } = {}) => {
  const router = express.Router();
  const controller = createSystemController({ mongoose });

  router.get('/healthz', controller.healthz);
  router.get('/readyz', controller.readyz);

  return router;
};

module.exports = {
  createSystemRouter,
};
