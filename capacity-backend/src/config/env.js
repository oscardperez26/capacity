'use strict'

require('dotenv').config({ override: true })

const required = (key) => {
  const val = process.env[key]
  if (!val) throw new Error(`Variable de entorno requerida faltante: ${key}`)
  return val
}

const optional = (key, fallback) => process.env[key] ?? fallback
const splitCsv = (value) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

module.exports = {
  // Servidor
  PORT:         parseInt(optional('PORT', '3001'), 10),
  NODE_ENV:     optional('NODE_ENV', 'development'),
  IS_PROD:      optional('NODE_ENV', 'development') === 'production',
  IS_DEV:       optional('NODE_ENV', 'development') === 'development',

  // Base de datos
  DB: {
    client:   optional('DB_CLIENT', 'sqlserver'),
    host:     optional('DB_HOST', 'localhost'),
    port:     parseInt(optional('DB_PORT', '1433'), 10),
    database: optional('DB_NAME', 'capacity'),
    user:     optional('DB_USER', 'root'),
    password: optional('DB_PASSWORD', ''),
    poolMin:  parseInt(optional('DB_POOL_MIN', '0'), 10),
    poolMax:  parseInt(optional('DB_POOL_MAX', '10'), 10),
    encrypt:  optional('DB_ENCRYPT', 'true') === 'true',
    trustCert: optional('DB_TRUST_CERT', 'true') === 'true',
    schema:   optional('DB_SCHEMA', 'dbo'),
  },

  // JWT
  JWT: {
    secret:         optional('JWT_SECRET', 'dev_secret_change_in_production_32chars!!'),
    expiresIn:      optional('JWT_EXPIRES_IN', '8h'),
    refreshExpires: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  // CORS
  CORS_ORIGIN: splitCsv(optional('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174')),

  // Rate limiting
  RATE_LIMIT: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max:      parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
    authMax:  parseInt(optional('RATE_LIMIT_AUTH_MAX', '10'), 10),
  },

  // Bcrypt
  BCRYPT_ROUNDS: parseInt(optional('BCRYPT_ROUNDS', '12'), 10),
}
