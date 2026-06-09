const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const { findUserByAuthId } = require('../auth/userService');
const { getCollections } = require('../db/state');
const { buildProcessLogDocument, toProcessLogPayload } = require('../services/processLogPayloads');

const router = express.Router();

router.get('/registros-sensores', authenticateToken, async (_req, res) => {
  const { sensorLogsCollection } = getCollections();
  const records = await sensorLogsCollection.find({}).sort({ proceso_id: 1, fecha_hora_ts: -1 }).toArray();
  const logs = {};
  const seenLogKeys = {};

  for (const record of records) {
    const processId = String(record.proceso_id || '').trim();
    if (!processId) continue;
    const recordNumber = Number(record.numero_registro);
    const logKey = Number.isFinite(recordNumber) && recordNumber > 0
      ? `record:${recordNumber}`
      : `id:${String(record.id_registro || '').trim()}`;
    const processLogKeys = seenLogKeys[processId] || new Set();
    if (processLogKeys.has(logKey)) continue;

    const processLogs = logs[processId] || [];
    if (processLogs.length >= 600) continue;
    processLogKeys.add(logKey);
    seenLogKeys[processId] = processLogKeys;
    processLogs.push(toProcessLogPayload(record));
    logs[processId] = processLogs;
  }

  return res.json({ logs });
});

router.post('/registros-sensores', authenticateToken, async (req, res) => {
  const { sensorLogsCollection } = getCollections();
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  const records = (Array.isArray(req.body.records) ? req.body.records : [])
    .map((item) => buildProcessLogDocument(item, user))
    .filter(Boolean);

  if (records.length === 0) return res.status(400).json({ message: 'No hay registros validos para guardar.' });

  const result = await sensorLogsCollection.bulkWrite(
    records.map((record) => ({
      updateOne: { filter: { id_registro: record.id_registro }, update: { $setOnInsert: record }, upsert: true },
    })),
    { ordered: false },
  );

  return res.status(201).json({ inserted: result.upsertedCount, received: records.length });
});

module.exports = router;
