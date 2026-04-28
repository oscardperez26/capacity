'use strict'

const { IS_DEV } = require('../config/env')

const CONNECTION_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEOUT', 'ESOCKET', 'ENOTOPEN'])
const SQL_CONSTRAINT_NUMBERS = new Set([2601, 2627, 547, 515])

function classifyError(err) {
  if (CONNECTION_CODES.has(err.code)) return 'CONNECTION'
  if (err.number && SQL_CONSTRAINT_NUMBERS.has(err.number)) return 'CONSTRAINT'
  if (err.name === 'RequestError' || err.name === 'ConnectionError') return 'SQL'
  const status = err.status ?? err.statusCode ?? 500
  return status < 500 ? 'BUSINESS' : 'UNKNOWN'
}

/**
 * Manejador global de errores de Express.
 * Siempre debe tener 4 parámetros para que Express lo reconozca.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status   = err.status ?? err.statusCode ?? 500
  const message  = err.message ?? 'Error interno del servidor'
  const category = classifyError(err)

  const entry = {
    ts:      new Date().toISOString(),
    method:  req.method,
    path:    req.path,
    status,
    category,
    message,
    sqlCode: err.code    || undefined,
    sqlNum:  err.number  || undefined,
  }

  if (category === 'CONNECTION') {
    console.error('[ERROR][CONNECTION]', JSON.stringify(entry))
    if (IS_DEV) console.error(err.stack)
  } else if (category === 'SQL') {
    console.error('[ERROR][SQL]', JSON.stringify(entry))
    if (IS_DEV && status === 500) console.error(err.stack)
  } else if (category === 'CONSTRAINT') {
    console.warn('[WARN][CONSTRAINT]', JSON.stringify(entry))
  } else if (IS_DEV) {
    console.log(`[${entry.ts}] ${req.method} ${req.path} — ${status}: ${message}`)
    if (status === 500) console.error(err.stack)
  }

  const SAFE_CATEGORIES = new Set(['BUSINESS', 'CONSTRAINT'])
  const clientMessage = IS_DEV
    ? message
    : SAFE_CATEGORIES.has(category)
      ? message
      : category === 'CONNECTION'
        ? 'Error de conexión temporal. Intenta de nuevo.'
        : 'Error interno del servidor.'

  res.status(status).json({
    success: false,
    error:   clientMessage,
    ...(IS_DEV && status === 500 ? { category, stack: err.stack } : {}),
  })
}

/**
 * Middleware para rutas no encontradas (404).
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
  })
}

module.exports = { errorHandler, notFound }
