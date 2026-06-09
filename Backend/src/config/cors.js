const { frontendUrl } = require('./env');

const allowedOrigins = new Set([
  frontendUrl,
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://192.168.18.103:5173',
]);

const allowedLanOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):(5173|5174|5175)$/;

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin) || allowedLanOriginPattern.test(origin);
}

function buildCorsOptions() {
  return {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

module.exports = { buildCorsOptions };
