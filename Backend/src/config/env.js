const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

module.exports = {
  port: Number(process.env.PORT) || 4100,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  frontendUrl,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB || 'SIMI-1',
  collectionNames: {
    users: process.env.MONGODB_USERS_COLLECTION || 'SIMI_usuarios',
    actions: process.env.MONGODB_USER_ACTIONS_COLLECTION || 'SIMI_acciones_usuarios',
    outliers: process.env.MONGODB_OUTLIERS_COLLECTION || 'SIMI_outliers',
    groups: process.env.MONGODB_GROUPS_COLLECTION || 'SIMI_grupos',
    legacyProcesses: process.env.MONGODB_PROCESSES_COLLECTION || 'SIMI_procesos',
    almacenadoProcesses:
      process.env.MONGODB_ALMACENADO_PROCESSES_COLLECTION || 'SIMI_procesos_almacenado',
    maduracionProcesses:
      process.env.MONGODB_MADURACION_PROCESSES_COLLECTION || 'SIMI_procesos_maduracion',
    proceso3Processes:
      process.env.MONGODB_PROCESO_3_PROCESSES_COLLECTION || 'SIMI_procesos_3',
    sensorLogs: process.env.MONGODB_SENSOR_LOGS_COLLECTION || 'SIMI_registros_sensores',
    workspaceConfig:
      process.env.MONGODB_WORKSPACE_CONFIG_COLLECTION || 'SIMI_configuracion_workspace',
  },
  telegram: {
    enabled: String(process.env.TELEGRAM_ALERTS_ENABLED || 'true').toLowerCase() === 'true',
    scope: process.env.TELEGRAM_ALERT_SCOPE || 'running_process',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    defaultChatIds: [
      ...String(process.env.TELEGRAM_CHAT_IDS || '')
        .split(',')
        .map((chatId) => chatId.trim())
        .filter(Boolean),
      String(process.env.TELEGRAM_CHAT_ID || '').trim(),
    ].filter(Boolean),
  },
  processTypes: new Set(['almacenado', 'maduracion', 'proceso-3']),
  storedDatePattern: /^(\d{1,2})\/(\d{2})\/(\d{4}) - (\d{2}):(\d{2})$/,
};
