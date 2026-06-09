const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const { findUserByAuthId } = require('../auth/userService');
const { getCollections } = require('../db/state');
const { buildStoredDateFields } = require('../utils/date');
const { workspaceConfigurationPayload } = require('../services/sharedPayloads');
const { buildUserReference } = require('../services/userReference');

const router = express.Router();
const allowedFields = ['activePlanDraft', 'groupSections', 'locationZones', 'processSections', 'savedPlans', 'sensorOverrides'];

router.get('/configuracion-workspace', authenticateToken, async (_req, res) => {
  const { workspaceConfigCollection } = getCollections();
  const configuration = await workspaceConfigCollection.findOne({ id_configuracion: 'global' });
  return res.json({ configuration: workspaceConfigurationPayload(configuration) });
});

router.patch('/configuracion-workspace', authenticateToken, async (req, res) => {
  const { workspaceConfigCollection } = getCollections();
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  const now = new Date();
  const changes = Object.fromEntries(
    allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field)).map((field) => [field, req.body[field]]),
  );

  await workspaceConfigCollection.updateOne(
    { id_configuracion: 'global' },
    {
      $set: { ...changes, ...buildStoredDateFields('updatedat', now), updatedBy: buildUserReference(user) },
      $setOnInsert: { id_configuracion: 'global', ...buildStoredDateFields('createdat', now), createdBy: buildUserReference(user) },
    },
    { upsert: true },
  );

  const configuration = await workspaceConfigCollection.findOne({ id_configuracion: 'global' });
  return res.json({ configuration: workspaceConfigurationPayload(configuration) });
});

module.exports = router;
