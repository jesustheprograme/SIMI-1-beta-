const { MongoClient } = require('mongodb');
const { collectionNames, mongoDbName, mongoUri } = require('../config/env');
const { backfillMissingUserIds, ensureDniIndex, normalizeLegacyDateFields } = require('./maintenance');
const { setCollections } = require('./state');

async function connectDatabase() {
  if (!mongoUri) throw new Error('Falta MONGODB_URI en el archivo .env.');

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(mongoDbName);

  setCollections({
    db,
    usersCollection: db.collection(collectionNames.users),
    actionsCollection: db.collection(collectionNames.actions),
    outliersCollection: db.collection(collectionNames.outliers),
    groupsCollection: db.collection(collectionNames.groups),
    legacyProcessesCollection: db.collection(collectionNames.legacyProcesses),
    almacenadoProcessesCollection: db.collection(collectionNames.almacenadoProcesses),
    maduracionProcessesCollection: db.collection(collectionNames.maduracionProcesses),
    proceso3ProcessesCollection: db.collection(collectionNames.proceso3Processes),
    sensorLogsCollection: db.collection(collectionNames.sensorLogs),
    workspaceConfigCollection: db.collection(collectionNames.workspaceConfig),
  });

  await backfillMissingUserIds();
  await normalizeLegacyDateFields();
  await ensureDniIndex();
  await ensureIndexes();
}

async function ensureIndexes() {
  const collections = require('./state').getCollections();
  await Promise.all([
    collections.usersCollection.createIndex({ email: 1 }, { unique: true }),
    collections.usersCollection.createIndex({ id_usuario: 1 }, { unique: true }),
    collections.actionsCollection.createIndex({ id_usuario: 1, createdat_ts: -1 }),
    collections.outliersCollection.createIndex({ fecha_hora_ts: -1 }),
    collections.outliersCollection.createIndex({ sensor: 1, fecha_hora_ts: -1 }),
    collections.groupsCollection.createIndex({ id_grupo: 1 }, { unique: true }),
    collections.groupsCollection.createIndex({ createdat_ts: -1 }),
    collections.legacyProcessesCollection.createIndex({ id_proceso: 1 }, { unique: true }),
    collections.legacyProcessesCollection.createIndex({ createdat: -1 }),
    collections.legacyProcessesCollection.createIndex({ finishedat: -1 }),
    collections.almacenadoProcessesCollection.createIndex({ id_proceso: 1 }, { unique: true }),
    collections.almacenadoProcessesCollection.createIndex({ createdat_ts: -1 }),
    collections.almacenadoProcessesCollection.createIndex({ finishedat_ts: -1 }),
    collections.maduracionProcessesCollection.createIndex({ id_proceso: 1 }, { unique: true }),
    collections.maduracionProcessesCollection.createIndex({ createdat_ts: -1 }),
    collections.maduracionProcessesCollection.createIndex({ finishedat_ts: -1 }),
    collections.proceso3ProcessesCollection.createIndex({ id_proceso: 1 }, { unique: true }),
    collections.proceso3ProcessesCollection.createIndex({ createdat_ts: -1 }),
    collections.proceso3ProcessesCollection.createIndex({ finishedat_ts: -1 }),
    collections.sensorLogsCollection.createIndex({ id_registro: 1 }, { unique: true }),
    collections.sensorLogsCollection.createIndex({ proceso_id: 1, fecha_hora_ts: -1 }),
    collections.workspaceConfigCollection.createIndex({ id_configuracion: 1 }, { unique: true }),
  ]);
}

module.exports = { connectDatabase };
