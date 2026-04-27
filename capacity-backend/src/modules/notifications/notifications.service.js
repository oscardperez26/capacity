'use strict'

const { query } = require('../../config/database')

// ── Crear notificación ────────────────────────────────────────────────────

async function create({ idUsuario, tipo, titulo = tipo, mensaje, metadata = null }) {
  const result = await query(
    `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [idUsuario, tipo, titulo, mensaje, metadata ? JSON.stringify(metadata) : null]
  )
  return result.insertId
}

// ── Obtener notificaciones de un usuario ──────────────────────────────────

async function getByUser(userId, { soloNoLeidas = false } = {}) {
  const where = soloNoLeidas
    ? 'WHERE n.id_usuario = ? AND n.leida = 0'
    : 'WHERE n.id_usuario = ?'

  const rows = await query(
    `SELECT
       n.id_notificacion,
       n.tipo,
       n.mensaje,
       n.leida,
       n.metadata,
       n.creado_en
     FROM notificaciones n
     ${where}
     ORDER BY n.creado_en DESC
     LIMIT 50`,
    [userId]
  )

  return rows.map(r => ({
    id:            r.id_notificacion,
    tipo:          r.tipo,
    mensaje:       r.mensaje,
    leido:         r.leida === 1,
    metadata:      r.metadata ? JSON.parse(r.metadata) : null,
    fechaCreacion: r.creado_en,
    time:          formatRelativeTime(r.creado_en),
    ...getNotifStyle(r.tipo),
  }))
}

// ── Contar no leídas ──────────────────────────────────────────────────────

async function countUnread(userId) {
  const [{ total }] = await query(
    'SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = ? AND leida = 0',
    [userId]
  )
  return Number(total)
}

// ── Marcar como leída ─────────────────────────────────────────────────────

async function markRead(notifId, userId) {
  await query(
    'UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?',
    [notifId, userId]
  )
}

async function markAllRead(userId) {
  await query(
    'UPDATE notificaciones SET leida = 1 WHERE id_usuario = ? AND leida = 0',
    [userId]
  )
}

// ── Notificaciones de negocio ─────────────────────────────────────────────

/**
 * Notifica al especialista cuando su jornada fue aprobada.
 */
async function notifyAprobacion({ idRegistro, idEmpleado, nombreJefe, fecha }) {
  const [emp] = await query(
    `SELECT u.id_usuario
     FROM empleados e
     JOIN usuarios u ON e.id_usuario = u.id_usuario
     WHERE e.id_empleado = ?`,
    [idEmpleado]
  )
  if (!emp) return

  await create({
    idUsuario: emp.id_usuario,
    tipo:      'aprobacion',
    mensaje:   `✅ Tu jornada del ${fecha ?? ''} fue aprobada por ${nombreJefe}.`,
    metadata:  { id_registro: idRegistro, jefe: nombreJefe, fecha },
  })
}

/**
 * Notifica al especialista cuando su jornada fue rechazada.
 */
async function notifyRechazo({ idRegistro, idEmpleado, nombreJefe, comentario, fecha }) {
  const [emp] = await query(
    `SELECT u.id_usuario
     FROM empleados e
     JOIN usuarios u ON e.id_usuario = u.id_usuario
     WHERE e.id_empleado = ?`,
    [idEmpleado]
  )
  if (!emp) return

  await create({
    idUsuario: emp.id_usuario,
    tipo:      'rechazo',
    mensaje:   `❌ Tu jornada del ${fecha ?? ''} fue rechazada por ${nombreJefe}. ${comentario ? `Motivo: ${comentario}` : ''}`,
    metadata:  { id_registro: idRegistro, jefe: nombreJefe, comentario, fecha },
  })
}

/**
 * Recordatorio de cierre de período — especialistas con borradores pendientes.
 * Llamar desde cron job (ej: jueves a las 9am) o desde panel admin.
 */
async function notifyRecordatorioCierre({ diasRestantes, fechaCierre }) {
  const pendientes = await query(
    `SELECT DISTINCT
       u.id_usuario,
       CONCAT(e.nombre, ' ', e.apellido) AS nombre_emp
     FROM registro_dia rd
     JOIN empleados e ON rd.id_empleado = e.id_empleado
     JOIN usuarios  u ON e.id_usuario   = u.id_usuario
     JOIN periodos  p ON rd.id_periodo  = p.id_periodo
     JOIN sprints   s ON p.id_sprint    = s.id_sprint
     WHERE s.estado  = 'activo'
       AND p.estado  = 'abierto'
       AND rd.estado = 'borrador'`
  )

  for (const esp of pendientes) {
    await create({
      idUsuario: esp.id_usuario,
      tipo:      'recordatorio_cierre',
      mensaje:   `⏰ El período cierra el ${fechaCierre}. Te quedan ${diasRestantes} día(s) para enviar tus actividades pendientes.`,
      metadata:  { dias_restantes: diasRestantes, fecha_cierre: fechaCierre },
    })
  }
  return pendientes.length
}

/**
 * Notifica a todos cuando el admin cierra un sprint.
 */
async function notifyCierreSprint({ nombreSprint, fechaCierre }) {
  const usuarios = await query(
    `SELECT id_usuario FROM usuarios WHERE estado = 'activo'`
  )
  for (const u of usuarios) {
    await create({
      idUsuario: u.id_usuario,
      tipo:      'cierre_sprint',
      mensaje:   `🔒 El ${nombreSprint} fue cerrado el ${fechaCierre}. Tus registros han sido consolidados.`,
      metadata:  { nombre_sprint: nombreSprint, fecha_cierre: fechaCierre },
    })
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────

function formatRelativeTime(date) {
  if (!date) return '—'
  const diff  = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Ahora mismo'
  if (mins  < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days  === 1) return 'Ayer'
  if (days  < 7)  return `Hace ${days} días`
  return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function getNotifStyle(tipo) {
  const map = {
    aprobacion:          { icon: '✅', bg: 'rgba(48,105,59,0.1)',  color: '#30693B' },
    rechazo:             { icon: '❌', bg: 'rgba(153,44,38,0.1)',  color: '#992C26' },
    recordatorio_cierre: { icon: '⏰', bg: 'rgba(214,88,48,0.1)', color: '#D65830' },
    cierre_periodo:      { icon: '📅', bg: 'rgba(214,88,48,0.1)', color: '#D65830' },
    cierre_sprint:       { icon: '🔒', bg: 'rgba(69,84,161,0.1)', color: '#4554A1' },
    reabrir_periodo:     { icon: '🔓', bg: 'rgba(62,93,157,0.1)', color: '#3E5D9D' },
  }
  return map[tipo] ?? { icon: '🔔', bg: 'rgba(51,40,154,0.1)', color: '#33289A' }
}

module.exports = {
  create,
  getByUser,
  countUnread,
  markRead,
  markAllRead,
  notifyAprobacion,
  notifyRechazo,
  notifyRecordatorioCierre,
  notifyCierreSprint,
}
