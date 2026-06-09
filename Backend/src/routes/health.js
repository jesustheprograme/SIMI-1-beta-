const express = require('express');
const { collectionNames, mongoDbName } = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SIMI Auth API',
    database: mongoDbName,
    usersCollection: collectionNames.users,
    actionsCollection: collectionNames.actions,
    outliersCollection: collectionNames.outliers,
    groupsCollection: collectionNames.groups,
    legacyProcessesCollection: collectionNames.legacyProcesses,
    almacenadoProcessesCollection: collectionNames.almacenadoProcesses,
    maduracionProcessesCollection: collectionNames.maduracionProcesses,
    proceso3ProcessesCollection: collectionNames.proceso3Processes,
    sensorLogsCollection: collectionNames.sensorLogs,
    workspaceConfigCollection: collectionNames.workspaceConfig,
  });
});

module.exports = router;
