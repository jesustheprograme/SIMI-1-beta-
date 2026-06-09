const express = require('express');
const cors = require('cors');
const { buildCorsOptions } = require('./config/cors');
const actionsRouter = require('./routes/actions');
const authRouter = require('./routes/auth');
const groupsRouter = require('./routes/groups');
const healthRouter = require('./routes/health');
const outliersRouter = require('./routes/outliers');
const processesRouter = require('./routes/processes');
const sensorLogsRouter = require('./routes/sensorLogs');
const workspaceConfigRouter = require('./routes/workspaceConfig');

function createApp() {
  const app = express();
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', actionsRouter);
  app.use('/api', outliersRouter);
  app.use('/api', groupsRouter);
  app.use('/api', processesRouter);
  app.use('/api', sensorLogsRouter);
  app.use('/api', workspaceConfigRouter);
  return app;
}

module.exports = { createApp };
