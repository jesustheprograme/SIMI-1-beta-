const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Token requerido.' });

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalido o expirado.' });
  }
}

module.exports = { authenticateToken };
