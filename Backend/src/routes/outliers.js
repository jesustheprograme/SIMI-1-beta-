const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const { findUserByAuthId, getUserId } = require('../auth/userService');
const { getCollections } = require('../db/state');
const { buildOutlierDocument } = require('../services/outlierPayloads');
const { sendTelegramOutlierAlerts } = require('../services/telegramAlerts');

const router = express.Router();

router.post('/outliers', authenticateToken, async (req, res) => {
  const { outliersCollection } = getCollections();
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  const outliers = (Array.isArray(req.body.outliers) ? req.body.outliers : [req.body]).map((item) =>
    buildOutlierDocument(item, getUserId(user)),
  );
  if (outliers.length === 0) return res.status(400).json({ message: 'No hay outliers para guardar.' });

  const result = await outliersCollection.insertMany(outliers);
  void sendTelegramOutlierAlerts(outliers, user);
  return res.status(201).json({ count: result.insertedCount, outliers });
});

module.exports = router;
