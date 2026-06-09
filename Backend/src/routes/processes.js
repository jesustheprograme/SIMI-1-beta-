const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const { findUserByAuthId } = require('../auth/userService');
const { getCollections } = require('../db/state');
const { buildStoredDateFields, parseDate } = require('../utils/date');
const { buildProcessDocument, toProcessPayload } = require('../services/processPayloads');
const { findExistingProcess, getProcessCollection, loadAllProcesses, loadProcessesFromCollection, normalizeProcessType } = require('../services/processRepository');
const { sendTelegramProcessFinishedAlert } = require('../services/telegramAlerts');
const { buildUserReference } = require('../services/userReference');

const router = express.Router();

router.get('/procesos', authenticateToken, async (req, res) => {
  const requestedType = normalizeProcessType(req.query.type);
  const processes = requestedType ? await loadProcessesFromCollection(getProcessCollection(requestedType)) : await loadAllProcesses();
  return res.json({ processes: processes.map(toProcessPayload) });
});

router.put('/procesos/:processId', authenticateToken, async (req, res) => {
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  const processId = String(req.params.processId || req.body.id || '').trim();
  if (!processId) return res.status(400).json({ message: 'El ID del proceso es obligatorio.' });

  const now = new Date();
  const existing = await findExistingProcess(processId);
  const wasFinished = Boolean(existing?.document?.finishedat_ts || existing?.document?.finishedat);
  const processType = normalizeProcessType(req.body.processType || req.body.tipo_proceso || req.query.type) || normalizeProcessType(existing?.document?.tipo_proceso) || 'almacenado';
  const targetCollection = getProcessCollection(processType);
  const createdAt = parseDate(existing?.document?.createdat_ts || existing?.document?.createdat || now) || now;

  await targetCollection.updateOne(
    { id_proceso: processId },
    {
      $set: { ...buildProcessDocument({ ...req.body, processType }, processId), ...buildStoredDateFields('updatedat', now), updatedBy: buildUserReference(user) },
      $unset: { totalvariables: '' },
      $setOnInsert: { ...buildStoredDateFields('createdat', createdAt), createdBy: existing?.document?.createdBy || buildUserReference(user) },
    },
    { upsert: true },
  );

  if (existing?.collection && existing.collection !== targetCollection) {
    await existing.collection.deleteOne({ id_proceso: processId });
  }

  const savedProcess = await targetCollection.findOne({ id_proceso: processId });
  const savedProcessPayload = toProcessPayload(savedProcess);
  if (!wasFinished && savedProcessPayload.finishedAt) {
    void sendTelegramProcessFinishedAlert(savedProcessPayload, user);
  }
  return res.status(existing ? 200 : 201).json({ process: savedProcessPayload });
});

router.delete('/procesos/:processId', authenticateToken, async (req, res) => {
  const { legacyProcessesCollection, almacenadoProcessesCollection, maduracionProcessesCollection, proceso3ProcessesCollection } = getCollections();
  const processId = String(req.params.processId || '').trim();
  const results = await Promise.all([
    legacyProcessesCollection.deleteOne({ id_proceso: processId }),
    almacenadoProcessesCollection.deleteOne({ id_proceso: processId }),
    maduracionProcessesCollection.deleteOne({ id_proceso: processId }),
    proceso3ProcessesCollection.deleteOne({ id_proceso: processId }),
  ]);
  return res.json({ deleted: results.some((result) => result.deletedCount === 1) });
});

module.exports = router;
