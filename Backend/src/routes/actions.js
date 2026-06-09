const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const { findUserByAuthId, getUserId, writeUserAction } = require('../auth/userService');

const router = express.Router();
const allowedActions = new Set(['edit_grupo', 'edit_proceso', 'create_grupo', 'create_proceso', 'delete_grupo', 'delete_proceso']);

router.post('/acciones-usuarios', authenticateToken, async (req, res) => {
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  const actionName = String(req.body.accion || '').trim();
  if (!allowedActions.has(actionName)) {
    return res.status(400).json({ message: 'Accion de usuario no permitida.' });
  }

  const action = await writeUserAction({
    id_usuario: getUserId(user),
    accion: actionName,
    ubicacion: String(req.body.ubicacion || req.body['ubicación'] || '/').trim(),
    metadata: req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {},
  });
  return res.status(201).json({ action });
});

module.exports = router;
