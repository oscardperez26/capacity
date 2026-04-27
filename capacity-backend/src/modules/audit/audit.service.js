'use strict'

const { query } = require('../../config/database')

async function logEvent({ userId, userName, action, entityType, entityId, type, metadata, ip }) {
  try {
    await query(
      `INSERT INTO auditoria
       (tabla_afectada, id_registro, accion, id_usuario, nombre_usuario,
        valor_nuevo, ip_address)
       VALUES (?, ?, 'INSERT', ?, ?, ?, ?)`,
      [
        entityType  ?? 'sistema',
        entityId    ?? null,
        userId      ?? null,
        userName    ?? null,
        metadata    ? JSON.stringify({ action, ...metadata }) : JSON.stringify({ action }),
        ip          ?? null,
      ]
    )
  } catch (err) {
    // Nunca lanza — auditoría no debe romper el flujo principal
    console.warn('[AuditService]', err.message)
  }
}

async function getLog({ from, to, type, userId, limit = 100, offset = 0 } = {}) {
  const conditions = []
  const params     = []

  if (from)   { conditions.push('fecha >= ?');       params.push(from) }
  if (to)     { conditions.push('fecha <= ?');        params.push(to) }
  if (type)   { conditions.push('tabla_afectada = ?');params.push(type) }
  if (userId) { conditions.push('id_usuario = ?');    params.push(userId) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(parseInt(offset), parseInt(limit))

  const rows = await query(
    `SELECT * FROM auditoria ${where} ORDER BY fecha DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
    params
  )
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM auditoria ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: Number(total) }
}

async function getStats() {
  const oneDayAgo = new Date(Date.now() - 86400000)
    .toISOString().slice(0, 19).replace('T', ' ')

  const [stats] = await query(
    `SELECT
       COUNT(*) AS total_events,
       SUM(CASE WHEN tabla_afectada = 'approval' THEN 1 ELSE 0 END) AS approvals,
       SUM(CASE WHEN nombre_usuario LIKE '%rechaz%' THEN 1 ELSE 0 END) AS rejections,
       SUM(CASE WHEN tabla_afectada = 'access'   THEN 1 ELSE 0 END) AS access_grants
     FROM auditoria
     WHERE fecha >= ?`,
    [oneDayAgo]
  )
  return {
    todayEvents:   Number(stats.total_events),
    approvals:     Number(stats.approvals),
    rejections:    Number(stats.rejections),
    accessGranted: Number(stats.access_grants),
  }
}

module.exports = { logEvent, getLog, getStats }
