const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { jwtSecret } = require('../config/env');
const { getCollections } = require('../db/state');
const { buildStoredDateFields, toOptionalIsoString } = require('../utils/date');

function getUserId(user) {
  return user.id_usuario || user._id?.toString();
}

function getUserRole(user) {
  return user.id_rol || user.role || 'tecnico';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { nombre: parts[0] || '', Apellido: parts.slice(1).join(' ') };
}

function createToken(user) {
  return jwt.sign({ sub: getUserId(user), email: user.email, role: getUserRole(user) }, jwtSecret, {
    expiresIn: '2h',
  });
}

function publicUser(user) {
  const nombre = user.nombre || user.name || '';
  const apellido = user.Apellido || user.apellido || '';
  return {
    id: getUserId(user),
    dni: user.dni || '',
    name: [nombre, apellido].filter(Boolean).join(' ').trim() || user.email,
    nombre,
    apellido,
    email: user.email,
    role: getUserRole(user),
    estado: user.estado || 'activo',
    area_id: user.area_id || '',
    area_trabajo: user.area_trabajo || '',
    cargo: user.cargo || '',
    celular: user.celular || '',
    telegram_correo: user.telegram_correo || '',
    telegram_id: user.telegram_id || '',
    ult_activo: toOptionalIsoString(user.ult_activo_ts || user.ult_activo),
  };
}

async function findUserByAuthId(authId) {
  const { usersCollection } = getCollections();
  const filters = [{ id_usuario: authId }];
  if (ObjectId.isValid(authId)) filters.push({ _id: new ObjectId(authId) });
  return usersCollection.findOne({ $or: filters });
}

async function writeUserAction({ id_usuario, accion, ubicacion = '/', metadata = {} }) {
  const { actionsCollection } = getCollections();
  const action = {
    id_accion: crypto.randomUUID(),
    id_usuario,
    accion,
    ubicacion,
    'ubicación': ubicacion,
    metadata,
    ...buildStoredDateFields('createdat', new Date()),
  };
  await actionsCollection.insertOne(action);
  return action;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function validatePassword(user, password) {
  const storedPassword = user?.password || user?.passwordHash || '';
  return user ? bcrypt.compare(password, storedPassword) : false;
}

module.exports = {
  createToken,
  findUserByAuthId,
  getUserId,
  hashPassword,
  normalizeEmail,
  publicUser,
  splitName,
  validatePassword,
  writeUserAction,
};
