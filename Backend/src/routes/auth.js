const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');
const {
  createToken,
  findUserByAuthId,
  getUserId,
  hashPassword,
  normalizeEmail,
  publicUser,
  splitName,
  validatePassword,
  writeUserAction,
} = require('../auth/userService');
const { getCollections } = require('../db/state');
const { buildStoredDateFields } = require('../utils/date');

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  const { usersCollection } = getCollections();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email y contrasena son obligatorios.' });

  const user = await usersCollection.findOne({ email: normalizeEmail(email) });
  const validPassword = await validatePassword(user, password);
  if (!user || !validPassword || user.estado === 'inactivo') {
    return res.status(401).json({ message: 'Credenciales incorrectas.' });
  }

  await usersCollection.updateOne({ _id: user._id }, { $set: buildStoredDateFields('ult_activo', new Date()) });
  await writeUserAction({ id_usuario: getUserId(user), accion: 'login', ubicacion: req.body.ubicacion || '/login' });
  return res.json({
    token: createToken(user),
    user: publicUser({ ...user, ...buildStoredDateFields('ult_activo', new Date()) }),
  });
});

router.post('/auth/register', async (req, res) => {
  const { usersCollection } = getCollections();
  const { name, nombre, Apellido, apellido, dni, email, password, id_rol = 'tecnico', estado = 'activo', area_id = '', area_trabajo = '', cargo = '', celular = '', telegram_correo = '', telegram_id = '' } = req.body;
  const fallbackName = splitName(name);
  const userNombre = String(nombre || fallbackName.nombre).trim();
  const userApellido = String(Apellido || apellido || fallbackName.Apellido).trim();

  if (!userNombre || !email || !password) return res.status(400).json({ message: 'Nombre, email y contrasena son obligatorios.' });
  if (String(password).length < 8) return res.status(400).json({ message: 'La contrasena debe tener minimo 8 caracteres.' });

  const normalizedEmail = normalizeEmail(email);
  if (await usersCollection.findOne({ email: normalizedEmail })) {
    return res.status(409).json({ message: 'Ya existe un usuario con ese email.' });
  }
  if (dni && (await usersCollection.findOne({ dni: String(dni).trim() }))) {
    return res.status(409).json({ message: 'Ya existe un usuario con ese DNI.' });
  }

  const now = new Date();
  const result = await usersCollection.insertOne({
    id_usuario: require('crypto').randomUUID(),
    dni: String(dni || '').trim() || null,
    nombre: userNombre,
    Apellido: userApellido,
    email: normalizedEmail,
    password: await hashPassword(password),
    id_rol: id_rol === 'admin' ? 'admin' : 'tecnico',
    estado: estado === 'inactivo' ? 'inactivo' : 'activo',
    area_id: String(area_id || '').trim(),
    area_trabajo: String(area_trabajo || '').trim(),
    cargo: String(cargo || '').trim(),
    celular: String(celular || '').trim(),
    resetToken: null,
    resetTokenExpiry: null,
    telegram_correo: String(telegram_correo || '').trim(),
    telegram_id: String(telegram_id || '').trim(),
    ...buildStoredDateFields('ult_activo', now),
    createdBy: req.body.createdBy || null,
    ...buildStoredDateFields('createdat', now),
  });

  const user = await usersCollection.findOne({ _id: result.insertedId });
  await writeUserAction({ id_usuario: getUserId(user), accion: 'register', ubicacion: req.body.ubicacion || '/register' });
  return res.status(201).json({ token: createToken(user), user: publicUser(user) });
});

router.get('/auth/me', authenticateToken, async (req, res) => {
  const user = await findUserByAuthId(req.auth.sub);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
  return res.json({ user: publicUser(user) });
});

module.exports = router;
