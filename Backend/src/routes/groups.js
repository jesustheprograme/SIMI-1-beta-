const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const { findUserByAuthId } = require('../auth/userService');
const { getCollections } = require('../db/state');
const { buildStoredDateFields } = require('../utils/date');
const { buildGroupDocument, toGroupPayload } = require('../services/groupPayloads');
const { buildUserReference } = require('../services/userReference');

const router = express.Router();

router.get('/grupos', authenticateToken, async (_req, res) => {
  const { groupsCollection } = getCollections();
  const groups = await groupsCollection.find({}).sort({ createdat_ts: -1, createdat: -1 }).toArray();
  return res.json({ groups: groups.map(toGroupPayload) });
});

router.put('/grupos/:groupId', authenticateToken, async (req, res) => {
  const { groupsCollection } = getCollections();
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  const groupId = String(req.params.groupId || req.body.id || '').trim();
  if (!groupId) return res.status(400).json({ message: 'El ID del grupo es obligatorio.' });

  const now = new Date();
  const existing = await groupsCollection.findOne({ id_grupo: groupId });
  await groupsCollection.updateOne(
    { id_grupo: groupId },
    {
      $set: { ...buildGroupDocument(req.body, groupId), ...buildStoredDateFields('updatedat', now), updatedBy: buildUserReference(user) },
      $unset: { totalvariables: '' },
      $setOnInsert: { ...buildStoredDateFields('createdat', now), createdBy: buildUserReference(user) },
    },
    { upsert: true },
  );

  const savedGroup = await groupsCollection.findOne({ id_grupo: groupId });
  return res.status(existing ? 200 : 201).json({ group: toGroupPayload(savedGroup) });
});

router.delete('/grupos/:groupId', authenticateToken, async (req, res) => {
  const { groupsCollection } = getCollections();
  const result = await groupsCollection.deleteOne({ id_grupo: String(req.params.groupId || '').trim() });
  return res.json({ deleted: result.deletedCount === 1 });
});

module.exports = router;
