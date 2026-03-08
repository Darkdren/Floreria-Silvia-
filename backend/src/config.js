const path = require('path');

require('dotenv').config();

const rootDir = path.resolve(__dirname, '..', '..');

function parseOrigins(value) {
  if (!value) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveDbPath(dbPath) {
  if (!dbPath) {
    return path.resolve(rootDir, 'backend', 'data', 'floreria.sqlite');
  }

  return path.isAbsolute(dbPath) ? dbPath : path.resolve(rootDir, dbPath);
}

module.exports = {
  rootDir,
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: resolveDbPath(process.env.DATABASE_PATH),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  whatsappPhone: process.env.WHATSAPP_PHONE || '51936625197',
  orderRateLimitMax: Number(process.env.ORDER_RATE_LIMIT_MAX || 10),
  orderRateLimitWindowMs: Number(process.env.ORDER_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
};
