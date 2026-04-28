'use strict'

const { query, transaction } = require('../../config/database')
const { logEvent } = require('../audit/audit.service')
const approvalsService = require('../approvals/approvals.service')

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

// ── Mapea fila de actividad → objeto frontend ──────────────────────────────
function mapActivity(row) {
  return {
    id:               row.act_id,
    name:             row.sub_nombre  ?? '',
    model:            row.sub_modelo  ?? 'RUN',
    catId:            row.cat_id      ?? '',
    catLabel:         row.cat_nombre  ?? '',
    catColor:         row.cat_color   ?? '#3E5D9D',
    subcategoriaId:   row.sub_id,
    dur:              row.duracion_mins,
    desc:             row.descripcion ?? '',
    projectId:        row.id_proyecto ?? null,
    estado:           row.act_estado,
    comentarioRechazo: row.comentario_rechazo ?? null,
  }
}

// ── Query actividades con alias únicos (evita duplicados de columna) ────────
const ACTIVITY_QUERY = `
  SELECT
    a.id_actividad        AS act_id,
    a.id_registro,
    a.id_subcategoria     AS sub_id,
    a.id_proyecto,
    a.descripcion,
    a.duracion_mins,
    a.estado              AS act_estado,
    a.comentario_rechazo,
    a.creado_en,
    s.nombre              AS sub_nombre,
    s.modelo              AS sub_modelo,
    c.id_categoria        AS cat_id,
    c.nombre              AS cat_nombre,
    c.color               AS cat_color
  FROM actividades a
  JOIN subcategorias_actividad s ON a.id_subcategoria = s.id_subcategoria
  JOIN categorias_actividad    c ON s.id_categoria    = c.id_categoria
`

// ── Mapea registro_dia → entry del frontend ────────────────────────────────
async function mapEntry(row) {
  const activities = await query(
    `${ACTIVITY_QUERY} WHERE a.id_registro = ? ORDER BY a.creado_en ASC`,
    [row.id_registro]
  )
  return {
    id:          row.id_registro,
    status:      row.estado,
    finalizedAt: row.fecha_envio       ?? null,
    savedAt:     row.actualizado_en    ?? null,
    habilitado:  row.habilitado_edicion ?? 0,
    tasks:       activities.map(mapActivity),
  }
}

// ── Período activo para una fecha ──────────────────────────────────────────
async function getPeriodoForDate(dateStr) {
  const [periodo] = await query(
    `SELECT p.id_periodo, p.id_sprint
     FROM periodos p
     JOIN sprints  s ON p.id_sprint = s.id_sprint
     WHERE s.estado      = 'activo'
       AND p.estado      = 'abierto'
       AND p.fecha_inicio <= ?
       AND p.fecha_fin   >= ?
     ORDER BY p.id_periodo ASC
     LIMIT 1`,
    [dateStr, dateStr]
  )
  return periodo ?? null
}

// ── id_empleado del usuario ────────────────────────────────────────────────
async function getEmpleadoId(userId) {
  const [emp] = await query(
    'SELECT id_empleado FROM empleados WHERE id_usuario = ? AND activo = 1',
    [userId]
  )
  if (!emp) throw Object.assign(new Error('Empleado no encontrado'), { status: 404 })
  return emp.id_empleado
}

// ── getAllEntries — hidratación inicial ────────────────────────────────────
async function getAllEntries(userId, sprintId) {
  const idEmpleado = await getEmpleadoId(userId)

  // Sprint activo si no se especifica
  let sid = sprintId
  if (!sid) {
    const [sp] = await query(
      `SELECT id_sprint FROM sprints WHERE estado = 'activo' ORDER BY id_sprint DESC LIMIT 1`)
    sid = sp?.id_sprint
  }
  if (!sid) return {}

  const registros = await query(
    `SELECT rd.*
     FROM registro_dia rd
     JOIN periodos p ON rd.id_periodo = p.id_periodo
     WHERE rd.id_empleado = ? AND p.id_sprint = ?
     ORDER BY rd.fecha ASC`,
    [idEmpleado, sid]
  )

  const entries = {}
  for (const rd of registros) {
    const dayKey = `${fmtDate(rd.fecha)}-${rd.id_empleado}`
    entries[dayKey] = await mapEntry(rd)
  }
  return entries
}

// ── getOrCreateEntry — carga o crea un registro_dia ───────────────────────
async function getOrCreateEntry(userId, dateStr) {
  const idEmpleado = await getEmpleadoId(userId)

  // Busca existente
  const [existing] = await query(
    'SELECT * FROM registro_dia WHERE id_empleado = ? AND fecha = ?',
    [idEmpleado, dateStr]
  )
  if (existing) return mapEntry(existing)

  // Necesita período activo para crear
  const periodo = await getPeriodoForDate(dateStr)
  if (!periodo) {
    // No hay sprint activo para esta fecha — devuelve borrador vacío sin persistir
    return { id: null, status: 'borrador', tasks: [], savedAt: null, finalizedAt: null, habilitado: 0 }
  }

  // Crea registro borrador
  const result = await query(
    `INSERT INTO registro_dia (id_empleado, id_sprint, id_periodo, fecha, estado)
     VALUES (?, ?, ?, ?, 'borrador')`,
    [idEmpleado, periodo.id_sprint, periodo.id_periodo, dateStr]
  )
  const [newRd] = await query(
    'SELECT * FROM registro_dia WHERE id_registro = ?',
    [result.insertId]
  )
  return mapEntry(newRd)
}

// ── addTask — agrega actividad ─────────────────────────────────────────────
async function addTask(userId, dateStr, taskData) {
  const idEmpleado = await getEmpleadoId(userId)

  // Asegura que existe el registro del día
  let [rd] = await query(
    'SELECT * FROM registro_dia WHERE id_empleado = ? AND fecha = ?',
    [idEmpleado, dateStr]
  )

  if (!rd) {
    const periodo = await getPeriodoForDate(dateStr)
    if (!periodo) throw Object.assign(new Error('No hay sprint activo para esta fecha'), { status: 400 })
    const result = await query(
      `INSERT INTO registro_dia (id_empleado, id_sprint, id_periodo, fecha, estado)
       VALUES (?, ?, ?, ?, 'borrador')`,
      [idEmpleado, periodo.id_sprint, periodo.id_periodo, dateStr]
    );
    [rd] = await query('SELECT * FROM registro_dia WHERE id_registro = ?', [result.insertId])
  }

  // Verifica que no está bloqueado
  if (['enviado','aprobado'].includes(rd.estado) && !rd.habilitado_edicion) {
    throw Object.assign(new Error('Jornada bloqueada — no se puede modificar'), { status: 403 })
  }

  // Inserta actividad
  await query(
    `INSERT INTO actividades
     (id_registro, id_subcategoria, id_proyecto, descripcion, duracion_mins, estado)
     VALUES (?, ?, ?, ?, ?, 'borrador')`,
    [
      rd.id_registro,
      taskData.subcategoriaId ?? null,
      taskData.projectId      ?? null,
      taskData.desc           ?? '',
      taskData.dur            ?? 15,
    ]
  )

  // Actualiza timestamp del registro
  await query(
    'UPDATE registro_dia SET actualizado_en = NOW() WHERE id_registro = ?',
    [rd.id_registro]
  )

  const [updated] = await query('SELECT * FROM registro_dia WHERE id_registro = ?', [rd.id_registro])
  return mapEntry(updated)
}

// ── updateTask — actualiza un campo de una actividad ──────────────────────
async function updateTask(userId, taskId, field, value) {
  const idEmpleado = await getEmpleadoId(userId)

  // Verifica que la actividad pertenece al empleado
  const [act] = await query(
    `SELECT a.id_actividad, rd.id_registro, rd.estado, rd.habilitado_edicion
     FROM actividades a
     JOIN registro_dia rd ON a.id_registro = rd.id_registro
     WHERE a.id_actividad = ? AND rd.id_empleado = ?`,
    [taskId, idEmpleado]
  )
  if (!act) throw Object.assign(new Error('Actividad no encontrada'), { status: 404 })
  if (['enviado','aprobado'].includes(act.estado) && !act.habilitado_edicion) {
    throw Object.assign(new Error('Jornada bloqueada'), { status: 403 })
  }

  // Columna real en la BD según el campo que manda el frontend
  const colMap = {
    dur:       'duracion_mins',
    desc:      'descripcion',
    projectId: 'id_proyecto',
    duracion_mins: 'duracion_mins',
    descripcion:   'descripcion',
  }
  const col = colMap[field]
  if (!col) return // campo desconocido — ignorar

  await query(`UPDATE actividades SET ${col} = ?, actualizado_en = NOW() WHERE id_actividad = ?`, [value, taskId])
  await query('UPDATE registro_dia SET actualizado_en = NOW() WHERE id_registro = ?', [act.id_registro])
}

// ── deleteTask — elimina una actividad ────────────────────────────────────
async function deleteTask(userId, taskId) {
  const idEmpleado = await getEmpleadoId(userId)

  const [act] = await query(
    `SELECT a.id_actividad, rd.id_registro, rd.estado, rd.habilitado_edicion
     FROM actividades a
     JOIN registro_dia rd ON a.id_registro = rd.id_registro
     WHERE a.id_actividad = ? AND rd.id_empleado = ?`,
    [taskId, idEmpleado]
  )
  if (!act) throw Object.assign(new Error('Actividad no encontrada'), { status: 404 })
  if (['enviado','aprobado'].includes(act.estado) && !act.habilitado_edicion) {
    throw Object.assign(new Error('Jornada bloqueada'), { status: 403 })
  }

  await query('DELETE FROM actividades WHERE id_actividad = ?', [taskId])
  await query('UPDATE registro_dia SET actualizado_en = NOW() WHERE id_registro = ?', [act.id_registro])
}

// ── saveDraft — guarda borrador ────────────────────────────────────────────
async function saveDraft(userId, dateStr) {
  const idEmpleado = await getEmpleadoId(userId)

  const [rd] = await query(
    'SELECT * FROM registro_dia WHERE id_empleado = ? AND fecha = ?',
    [idEmpleado, dateStr]
  )
  if (!rd) throw Object.assign(new Error('Registro no encontrado'), { status: 404 })

  // Solo se puede guardar borrador si no está enviado/aprobado o si fue habilitado
  if (['enviado','aprobado'].includes(rd.estado) && !rd.habilitado_edicion) {
    throw Object.assign(new Error('Jornada ya enviada'), { status: 403 })
  }

  const total = await query(
    'SELECT COUNT(*) AS total FROM actividades WHERE id_registro = ?',
    [rd.id_registro]
  )
  if (!total[0]?.total) throw Object.assign(new Error('Sin actividades'), { status: 400 })

  await query(
    `UPDATE registro_dia SET estado = 'borrador', actualizado_en = NOW()
     WHERE id_registro = ?`,
    [rd.id_registro]
  )

  const [updated] = await query('SELECT * FROM registro_dia WHERE id_registro = ?', [rd.id_registro])
  return mapEntry(updated)
}

// ── finalizeEntry — envía la jornada para aprobación ──────────────────────
async function finalizeEntry(userId, dateStr, userName) {
  const idEmpleado = await getEmpleadoId(userId)

  const [rd] = await query(
    'SELECT * FROM registro_dia WHERE id_empleado = ? AND fecha = ?',
    [idEmpleado, dateStr]
  )
  if (!rd) throw Object.assign(new Error('Registro no encontrado'), { status: 404 })

  if (rd.estado === 'enviado' || rd.estado === 'aprobado') {
    throw Object.assign(new Error('Jornada ya enviada o aprobada'), { status: 400 })
  }

  const acts = await query('SELECT id_actividad FROM actividades WHERE id_registro = ?', [rd.id_registro])
  if (!acts.length) throw Object.assign(new Error('Sin actividades para finalizar'), { status: 400 })

  // Marca el registro y todas sus actividades como "enviado" — atómico
  await transaction(async ({ query: txQ }) => {
    await txQ(
      `UPDATE registro_dia
       SET estado = 'enviado', fecha_envio = NOW(), habilitado_edicion = 0, actualizado_en = NOW()
       WHERE id_registro = ?`,
      [rd.id_registro]
    )
    await txQ(
      `UPDATE actividades SET estado = 'enviado', actualizado_en = NOW()
       WHERE id_registro = ?`,
      [rd.id_registro]
    )
  })

  // Auditoría
  try {
    await logEvent({
      userId, userName,
      action:     `Jornada finalizada — ${dateStr}`,
      entityType: 'registro_dia',
      entityId:   rd.id_registro,
    })
  } catch {}

  // Notifica al jefe que tiene una jornada pendiente de aprobación
  // Detecta si es corrección (registro rechazado que se reenvía) o nuevo envío
  const tipoNotif = rd.estado === 'rechazado' ? 'correccion' : 'nuevo'
  try {
    await approvalsService.notificarFinalizacion(idEmpleado, rd.id_registro, tipoNotif)
  } catch {}

  const [updated] = await query('SELECT * FROM registro_dia WHERE id_registro = ?', [rd.id_registro])
  return mapEntry(updated)
}

// ── getFavorites ───────────────────────────────────────────────────────────
async function getFavorites(userId) {
  const idEmpleado = await getEmpleadoId(userId)
  const rows = await query(
    'SELECT id_subcategoria FROM favoritos_empleado WHERE id_empleado = ?',
    [idEmpleado]
  )
  return rows.map(r => r.id_subcategoria)
}

// ── toggleFavorite ─────────────────────────────────────────────────────────
async function toggleFavorite(userId, subcategoriaId) {
  const idEmpleado = await getEmpleadoId(userId)
  const [existing] = await query(
    'SELECT id_empleado FROM favoritos_empleado WHERE id_empleado = ? AND id_subcategoria = ?',
    [idEmpleado, subcategoriaId]
  )
  if (existing) {
    await query('DELETE FROM favoritos_empleado WHERE id_empleado = ? AND id_subcategoria = ?', [idEmpleado, subcategoriaId])
    return { favorito: false }
  } else {
    await query('INSERT INTO favoritos_empleado (id_empleado, id_subcategoria) VALUES (?, ?)', [idEmpleado, subcategoriaId])
    return { favorito: true }
  }
}

// ── getHistorico ───────────────────────────────────────────────────────────
async function getHistorico(userId, { limit = 5, offset = 0 } = {}) {
  const idEmpleado = await getEmpleadoId(userId)

  // Paginate at sprint level — get the IDs of sprints for this page
  const [{ total: totalSprints }] = await query(
    `SELECT COUNT(DISTINCT rd.id_sprint) AS total FROM registro_dia rd WHERE rd.id_empleado = ?`,
    [idEmpleado]
  )

  const sprintPage = await query(
    `SELECT DISTINCT rd.id_sprint
     FROM registro_dia rd
     WHERE rd.id_empleado = ?
     ORDER BY rd.id_sprint DESC
     LIMIT ? OFFSET ?`,
    [idEmpleado, limit, offset]
  )

  if (!sprintPage.length) {
    return { data: [], pagination: { total: Number(totalSprints), limit, offset, hasMore: false } }
  }

  const sprintIds = sprintPage.map(r => r.id_sprint)
  const sprintPh  = sprintIds.map(() => '?').join(',')

  const registros = await query(
    `SELECT rd.id_registro, rd.fecha, rd.estado, rd.id_periodo, rd.id_sprint,
            rd.habilitado_edicion,
            p.numero_semana,
            s.nombre AS sprint_nombre, s.estado AS sprint_estado
     FROM registro_dia rd
     JOIN periodos p ON rd.id_periodo = p.id_periodo
     JOIN sprints  s ON rd.id_sprint  = s.id_sprint
     WHERE rd.id_empleado = ? AND rd.id_sprint IN (${sprintPh})
     ORDER BY s.id_sprint DESC, rd.fecha DESC`,
    [idEmpleado, ...sprintIds]
  )

  if (!registros.length) {
    return { data: [], pagination: { total: Number(totalSprints), limit, offset, hasMore: false } }
  }

  // Batch-load all activities for these registros — eliminates N+1
  const regIds = registros.map(r => r.id_registro)
  const regPh  = regIds.map(() => '?').join(',')
  const acts   = await query(
    `${ACTIVITY_QUERY} WHERE a.id_registro IN (${regPh}) ORDER BY a.id_registro, a.creado_en ASC`,
    regIds
  )

  const actsByReg = {}
  for (const a of acts) {
    if (!actsByReg[a.id_registro]) actsByReg[a.id_registro] = []
    actsByReg[a.id_registro].push(a)
  }

  const DAYS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
  const sprintsMap = {}
  for (const rd of registros) {
    if (!sprintsMap[rd.id_sprint]) {
      sprintsMap[rd.id_sprint] = {
        id:        rd.id_sprint,
        name:      rd.sprint_nombre,
        status:    rd.sprint_estado,
        dates:     '',
        totalMins: 0,
        weeks:     {},
      }
    }
    const sp = sprintsMap[rd.id_sprint]
    if (!sp.weeks[rd.numero_semana]) {
      sp.weeks[rd.numero_semana] = {
        id:        rd.id_periodo,
        label:     `Semana ${rd.numero_semana}`,
        dateRange: '',
        totalMins: 0,
        status:    rd.estado,
        byModel:   {},
        days:      [],
      }
    }

    const dayActs  = actsByReg[rd.id_registro] ?? []
    const dayMins  = dayActs.reduce((s, a) => s + a.duracion_mins, 0)
    const actList  = dayActs.map(a => ({
      id:         a.act_id,
      name:       a.sub_nombre,
      model:      a.sub_modelo,
      cat:        a.cat_nombre,
      mins:       a.duracion_mins,
      status:     a.act_estado,
      desc:       a.descripcion,
      comentario: a.comentario_rechazo,
    }))

    for (const a of dayActs) {
      sp.weeks[rd.numero_semana].byModel[a.sub_modelo] =
        (sp.weeks[rd.numero_semana].byModel[a.sub_modelo] ?? 0) + a.duracion_mins
    }

    const fechaReal = fmtDate(rd.fecha)
    const d = new Date(fechaReal + 'T12:00:00')
    sp.weeks[rd.numero_semana].days.push({
      idRegistro: rd.id_registro,
      fechaReal,
      date:       DAYS[d.getDay()] + ' ' + d.getDate(),
      status:     rd.estado,
      habilitado: rd.habilitado_edicion ?? 0,
      mins:       dayMins,
      acts:       actList,
    })
    sp.weeks[rd.numero_semana].totalMins += dayMins
    sp.totalMins += dayMins
  }

  const data = Object.values(sprintsMap).map(sp => ({
    ...sp,
    weeks: Object.values(sp.weeks),
  }))

  return {
    data,
    pagination: {
      total:   Number(totalSprints),
      limit,
      offset,
      hasMore: offset + sprintPage.length < Number(totalSprints),
    },
  }
}


// -- reenviarJornada -- reenvia una jornada rechazada para reaprobacion --------
async function reenviarJornada(userId, idRegistro) {
  const idEmpleado = await getEmpleadoId(userId)

  const [rd] = await query(
    `SELECT rd.id_registro, rd.fecha, rd.estado, rd.habilitado_edicion, rd.id_empleado
     FROM registro_dia rd
     WHERE rd.id_registro = ? AND rd.id_empleado = ?`,
    [idRegistro, idEmpleado]
  )
  if (!rd) throw Object.assign(new Error('Registro no encontrado'), { status: 404 })
  if (rd.estado !== 'rechazado') throw Object.assign(new Error('Solo se pueden reenviar jornadas rechazadas'), { status: 400 })

  const acts = await query('SELECT id_actividad FROM actividades WHERE id_registro = ?', [rd.id_registro])
  if (!acts.length) throw Object.assign(new Error('Sin actividades'), { status: 400 })

  await query(
    `UPDATE registro_dia SET estado='enviado', fecha_envio=NOW(), habilitado_edicion=0, actualizado_en=NOW()
     WHERE id_registro=?`,
    [rd.id_registro]
  )
  await query(
    `UPDATE actividades SET estado='enviado', actualizado_en=NOW() WHERE id_registro=?`,
    [rd.id_registro]
  )

  // Notifica al jefe
  try {
    await approvalsService.notificarFinalizacion(idEmpleado, rd.id_registro, 'correccion')
  } catch {}

  const [updated] = await query('SELECT * FROM registro_dia WHERE id_registro=?', [rd.id_registro])
  return mapEntry(updated)
}

module.exports = {
  getAllEntries,
  getOrCreateEntry,
  addTask,
  updateTask,
  deleteTask,
  saveDraft,
  finalizeEntry,
  getFavorites,
  toggleFavorite,
  getHistorico,
  reenviarJornada,
}
