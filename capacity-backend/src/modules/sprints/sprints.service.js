'use strict'

const { query }    = require('../../config/database')
const { logEvent } = require('../audit/audit.service')
const notifService = require('../notifications/notifications.service')

// ── Helpers ────────────────────────────────────────────────────────────────

/** Formatea Date o string a YYYY-MM-DD */
function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

/** Número de semana ISO del año para una fecha dada */
function isoWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((d - jan1) / 86400000) + 1
  return Math.ceil((dayOfYear + jan1.getDay()) / 7)
}

/** Días restantes hasta el próximo domingo (cierre de período semanal) */
function daysUntilSunday() {
  const now    = new Date()
  const dow    = now.getDay()           // 0=dom,1=lun,...,6=sáb
  const diff   = dow === 0 ? 0 : 7 - dow
  return diff
}

/** Genera los 7 días de una semana a partir de su lunes */
function buildWeekDays(lunesStr) {
  const DAYS    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const todayStr = new Date().toISOString().split('T')[0]
  const days     = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(lunesStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      key:     `${DAYS[d.getDay()].toLowerCase()}-${String(d.getDate()).padStart(2,'0')}`,
      short:   DAYS[d.getDay()],
      num:     String(d.getDate()).padStart(2, '0'),
      date:    dateStr,
      isToday: dateStr === todayStr,
    })
  }
  return days
}

/** Rango legible: "23–29 Mar" o "31 Mar – 6 Abr" */
function formatDateRange(inicioStr, finStr) {
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun',
                  'Jul','Ago','Sep','Oct','Nov','Dic']
  const ini = new Date(inicioStr + 'T12:00:00')
  const fin = new Date(finStr    + 'T12:00:00')
  const dIni = ini.getDate()
  const dFin = fin.getDate()
  const mIni = MONTHS[ini.getMonth()]
  const mFin = MONTHS[fin.getMonth()]
  return mIni === mFin
    ? `${dIni}–${dFin} ${mIni}`
    : `${dIni} ${mIni} – ${dFin} ${mFin}`
}

// ── getActive ──────────────────────────────────────────────────────────────
/**
 * Retorna el sprint activo con:
 *  - nombre del sprint (configurado por el admin)
 *  - semanas del sprint con número de semana del año
 *  - semana actual destacada
 *  - días restantes hasta el DOMINGO de esta semana (cierre de período)
 *  - días restantes hasta el fin del sprint
 */
async function getActive() {
  const [sprint] = await query(
    `SELECT * FROM sprints WHERE estado = 'activo' ORDER BY id_sprint DESC LIMIT 1`
  )
  if (!sprint) throw Object.assign(new Error('No hay sprint activo'), { status: 404 })

  const periodos = await query(
    `SELECT * FROM periodos
     WHERE id_sprint = ?
     ORDER BY numero_semana ASC`,
    [sprint.id_sprint]
  )

  const todayStr = new Date().toISOString().split('T')[0]

  const weeks = periodos.map(p => {
    const inicioStr    = fmtDate(p.fecha_inicio)
    const finStr       = fmtDate(p.fecha_fin)
    const isCurrent    = todayStr >= inicioStr && todayStr <= finStr
    const semanaAnio   = isoWeekNumber(inicioStr)   // semana del año
    const days         = buildWeekDays(inicioStr)

    return {
      id:            p.id_periodo,
      label:         `Semana ${p.numero_semana}`,     // "Semana 1", "Semana 2"...
      semanaAnio,                                      // 13, 14... (semana del año)
      dateRange:     formatDateRange(inicioStr, finStr),
      fechaInicio:   inicioStr,
      fechaFin:      finStr,
      isCurrent,
      estado:        p.estado,
      days,
    }
  })

  const currentWeek    = weeks.find(w => w.isCurrent) ?? weeks[0]

  // ── Cuenta regresiva hasta el DOMINGO de la semana actual ──────────────
  const daysToSunday   = daysUntilSunday()          // 0 si hoy es domingo

  // ── Días hasta el fin del sprint (informativo) ─────────────────────────
  const sprintEndStr   = fmtDate(sprint.fecha_fin)
  const daysToSprintEnd = Math.max(0,
    Math.ceil((new Date(sprintEndStr) - new Date()) / 86400000)
  )

  return {
    id:               sprint.id_sprint,
    nombre:           sprint.nombre,                  // "Sprint 6" (del admin)
    start:            fmtDate(sprint.fecha_inicio),
    end:              sprintEndStr,
    estado:           sprint.estado,
    daysLeft:         daysToSunday,                   // cuenta regresiva al domingo
    daysToSprintEnd,                                  // info del sprint completo
    weeks,
    currentWeek,
  }
}

// ── getAll ─────────────────────────────────────────────────────────────────
async function getAll() {
  const rows = await query(
    `SELECT s.*, u.correo AS creado_por_email
     FROM sprints s
     LEFT JOIN usuarios u ON s.creado_por = u.id_usuario
     ORDER BY s.id_sprint DESC`
  )
  return rows.map(s => ({
    ...s,
    fecha_inicio: fmtDate(s.fecha_inicio),
    fecha_fin:    fmtDate(s.fecha_fin),
    fecha_cierre: fmtDate(s.cerrado_en),
  }))
}

// ── create ─────────────────────────────────────────────────────────────────
async function create({ name, startDate, endDate }, userId, userName) {
  const [active] = await query(
    `SELECT id_sprint FROM sprints WHERE estado = 'activo' LIMIT 1`
  )
  if (active) throw Object.assign(
    new Error('Ya existe un sprint activo. Ciérralo antes de crear uno nuevo.'),
    { status: 409 }
  )

  const result = await query(
    `INSERT INTO sprints (nombre, fecha_inicio, fecha_fin, estado, creado_por)
     VALUES (?, ?, ?, 'activo', ?)`,
    [name, startDate, endDate, userId]
  )
  const [sprint] = await query(
    'SELECT * FROM sprints WHERE id_sprint = ?', [result.insertId]
  )

  // Genera períodos semanales lunes→domingo automáticamente
  await createPeriods(sprint.id_sprint, startDate, endDate)

  await logEvent({
    userId, userName,
    action:     `Sprint creado — ${name} (${startDate} → ${endDate})`,
    entityType: 'sprint',
    entityId:   sprint.id_sprint,
  })

  return sprint
}

/** Crea períodos lunes→domingo dentro del rango del sprint */
async function createPeriods(sprintId, startDate, endDate) {
  const start  = new Date(startDate + 'T12:00:00')
  const end    = new Date(endDate   + 'T12:00:00')

  // Avanza al lunes si la fecha de inicio no es lunes
  let cursor  = new Date(start)
  const dow   = cursor.getDay()
  if (dow !== 1) {
    // Va al lunes más cercano hacia adelante (o mismo día si es lunes)
    const diff = dow === 0 ? 1 : 8 - dow
    cursor.setDate(cursor.getDate() + diff)
  }

  let semana = 1
  while (cursor <= end) {
    const lunStr = cursor.toISOString().split('T')[0]
    const dom    = new Date(cursor)
    dom.setDate(dom.getDate() + 6)
    const domStr = (dom > end ? end : dom).toISOString().split('T')[0]

    await query(
      `INSERT INTO periodos
       (id_sprint, fecha_inicio, fecha_fin, numero_semana, estado)
       VALUES (?, ?, ?, ?, 'abierto')`,
      [sprintId, lunStr, domStr, semana]
    )
    cursor.setDate(cursor.getDate() + 7)
    semana++
  }
}

// ── close ──────────────────────────────────────────────────────────────────
async function close(sprintId, userId, userName) {
  const [sprint] = await query(
    'SELECT * FROM sprints WHERE id_sprint = ?', [sprintId]
  )
  if (!sprint)                    throw Object.assign(new Error('Sprint no encontrado'), { status: 404 })
  if (sprint.estado === 'cerrado') throw Object.assign(new Error('El sprint ya está cerrado'), { status: 409 })

  await query(
    `UPDATE sprints SET estado = 'cerrado', cerrado_en = NOW() WHERE id_sprint = ?`,
    [sprintId]
  )
  await query(
    `UPDATE periodos SET estado = 'cerrado' WHERE id_sprint = ? AND estado = 'abierto'`,
    [sprintId]
  )

  // Notifica a todos los usuarios del cierre
  try {
    await notifService.notifyCierreSprint({
      nombreSprint: sprint.nombre,
      fechaCierre:  new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
    })
  } catch { /* no bloquea el cierre */ }

  await logEvent({
    userId, userName,
    action:     `Sprint cerrado — ${sprint.nombre}`,
    entityType: 'sprint',
    entityId:   sprintId,
  })

  const [updated] = await query('SELECT * FROM sprints WHERE id_sprint = ?', [sprintId])
  return updated
}

// ── getById ────────────────────────────────────────────────────────────────
async function getById(id) {
  const [sprint] = await query('SELECT * FROM sprints WHERE id_sprint = ?', [id])
  if (!sprint) throw Object.assign(new Error('Sprint no encontrado'), { status: 404 })
  return sprint
}

module.exports = { getAll, getActive, getById, create, close }
