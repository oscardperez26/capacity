'use strict'

const { query }    = require('../../config/database')
const { logEvent } = require('../audit/audit.service')

function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

async function getJefeId(userId) {
  const [emp] = await query(
    'SELECT id_empleado FROM empleados WHERE id_usuario = ? AND activo = 1', [userId])
  if (!emp) throw Object.assign(new Error('Jefe no encontrado'), { status: 404 })
  return emp.id_empleado
}

// ── Notifica al especialista ───────────────────────────────────────────────
async function notificarEspecialista(idEmpleado, tipo, titulo, mensaje, idReferencia) {
  const [usr] = await query('SELECT id_usuario FROM empleados WHERE id_empleado = ?', [idEmpleado])
  if (!usr) return
  await query(
    `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, id_referencia, tipo_referencia)
     VALUES (?, ?, ?, ?, ?, 'registro_dia')`,
    [usr.id_usuario, tipo, titulo, mensaje, idReferencia]
  )
}

// ── Notifica al JEFE cuando un especialista finaliza o corrige ─────────────
async function notificarJefe(idJefeEmp, tipo, titulo, mensaje, idReferencia) {
  const [usr] = await query('SELECT id_usuario FROM empleados WHERE id_empleado = ?', [idJefeEmp])
  if (!usr) return
  await query(
    `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, id_referencia, tipo_referencia)
     VALUES (?, ?, ?, ?, ?, 'registro_dia')`,
    [usr.id_usuario, tipo, titulo, mensaje, idReferencia]
  )
}

// ── PENDIENTES ─────────────────────────────────────────────────────────────
async function getPendientes(userId) {
  const idJefe = await getJefeId(userId)

  // ── Columnas explícitas (sin SELECT rd.*) para evitar checkDuplicate ──
  const registros = await query(
    `SELECT
       rd.id_registro,
       rd.fecha,
       rd.estado            AS rd_estado,
       rd.fecha_envio,
       rd.id_sprint,
       rd.id_periodo,
       e.id_empleado        AS emp_id,
       CONCAT(e.nombre,' ',e.apellido) AS esp_nombre,
       o.NOM_OFICIO         AS oficio,
       s.nombre             AS sprint_nombre,
       s.id_sprint          AS sprint_id,
       p.numero_semana
     FROM registro_dia rd
     JOIN empleados e ON rd.id_empleado = e.id_empleado
     LEFT JOIN oficios o ON e.id_oficio = o.id_oficio
     JOIN sprints  s ON rd.id_sprint  = s.id_sprint
     JOIN periodos p ON rd.id_periodo = p.id_periodo
     WHERE (
       e.id_jefe = ?
       OR e.id_area IN (SELECT id_area FROM jefe_areas_visibilidad WHERE id_jefe = ?)
     )
     AND e.id_empleado != ?
     AND rd.estado = 'enviado'
     ORDER BY e.nombre, s.id_sprint DESC, p.numero_semana, rd.fecha`,
    [idJefe, idJefe, idJefe]
  )

  if (registros.length === 0) return []

  // Carga actividades de todos los registros
  const regIds = registros.map(r => r.id_registro)
  const ph     = regIds.map(() => '?').join(',')
  const acts   = await query(
    `SELECT a.id_actividad, a.id_registro, a.duracion_mins, a.descripcion, a.estado,
            s.nombre AS sub_nombre, s.modelo,
            c.nombre AS cat_nombre, c.color AS cat_color
     FROM actividades a
     JOIN subcategorias_actividad s ON a.id_subcategoria = s.id_subcategoria
     JOIN categorias_actividad    c ON s.id_categoria    = c.id_categoria
     WHERE a.id_registro IN (${ph})
     ORDER BY a.creado_en`,
    regIds
  )

  const actsByReg = {}
  for (const a of acts) {
    if (!actsByReg[a.id_registro]) actsByReg[a.id_registro] = []
    actsByReg[a.id_registro].push({
      id:     a.id_actividad,
      nombre: a.sub_nombre,
      modelo: a.modelo,
      cat:    a.cat_nombre,
      color:  a.cat_color,
      mins:   a.duracion_mins,
      desc:   a.descripcion ?? '',
    })
  }

  // Estructura: especialista → sprint → semana → día
  const byEsp = {}
  const DAYS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

  for (const rd of registros) {
    const eid = rd.emp_id
    if (!byEsp[eid]) {
      byEsp[eid] = { id: eid, nombre: rd.esp_nombre, oficio: rd.oficio, sprints: {} }
    }
    const esp = byEsp[eid]

    const spKey = rd.sprint_id
    if (!esp.sprints[spKey]) {
      esp.sprints[spKey] = { id: spKey, nombre: rd.sprint_nombre, semanas: {} }
    }
    const sp = esp.sprints[spKey]

    const semKey = rd.numero_semana
    if (!sp.semanas[semKey]) {
      sp.semanas[semKey] = { numero: rd.numero_semana, label: `Semana ${rd.numero_semana}`, dias: [] }
    }

    const dayActs   = actsByReg[rd.id_registro] ?? []
    const totalMins = dayActs.reduce((s,a) => s + a.mins, 0)
    const d         = new Date(fmtDate(rd.fecha) + 'T12:00:00')

    sp.semanas[semKey].dias.push({
      idRegistro:  rd.id_registro,
      fecha:       fmtDate(rd.fecha),
      label:       `${DAYS[d.getDay()]} ${d.getDate()}`,
      totalMins,
      capacityPct: Math.min(Math.round(totalMins / 528 * 100), 999),
      actividades: dayActs,
    })
  }

  // Calcula KPIs en cascada y convierte a arrays
  return Object.values(byEsp).map(esp => {
    const sprints = Object.values(esp.sprints).map(sp => {
      const semanas = Object.values(sp.semanas).map(sem => {
        const totalMins   = sem.dias.reduce((s,d) => s + d.totalMins, 0)
        const diasHabiles = sem.dias.length || 1
        return { ...sem, totalMins, capacityPct: Math.min(Math.round(totalMins/(528*diasHabiles)*100), 999) }
      })
      const totalMins   = semanas.reduce((s,sem) => s + sem.totalMins, 0)
      const diasHabiles = semanas.reduce((s,sem) => s + sem.dias.length, 0) || 1
      return { ...sp, semanas, totalMins, capacityPct: Math.min(Math.round(totalMins/(528*diasHabiles)*100), 999) }
    })
    const totalMins   = sprints.reduce((s,sp) => s + sp.totalMins, 0)
    const totalDias   = sprints.reduce((s,sp) => s + sp.semanas.reduce((ss,sem) => ss+sem.dias.length, 0), 0)
    const capacityPct = Math.min(Math.round(totalMins/(528*(totalDias||1))*100), 999)
    return { ...esp, sprints, totalMins, capacityPct, totalDias }
  })
}

// ── APROBAR registro ───────────────────────────────────────────────────────
async function aprobar(userId, idRegistro, comentario = null) {
  const idJefe = await getJefeId(userId)
  return _procesar(userId, idJefe, idRegistro, 'aprobado', comentario)
}

// ── RECHAZAR registro ──────────────────────────────────────────────────────
async function rechazar(userId, idRegistro, comentario) {
  if (!comentario?.trim()) throw Object.assign(new Error('El motivo es obligatorio'), { status: 422 })
  const idJefe = await getJefeId(userId)
  return _procesar(userId, idJefe, idRegistro, 'rechazado', comentario)
}

// ── APROBAR TODOS los registros de un especialista ─────────────────────────
async function aprobarTodo(userId, idEmpleado) {
  const idJefe = await getJefeId(userId)
  const registros = await query(
    `SELECT rd.id_registro FROM registro_dia rd
     JOIN empleados e ON rd.id_empleado = e.id_empleado
     WHERE rd.id_empleado = ? AND e.id_jefe = ? AND rd.estado = 'enviado'`,
    [idEmpleado, idJefe]
  )
  const results = []
  for (const rd of registros) {
    try {
      await _procesar(userId, idJefe, rd.id_registro, 'aprobado', 'Aprobación en bloque')
      results.push({ idRegistro: rd.id_registro, ok: true })
    } catch (err) {
      results.push({ idRegistro: rd.id_registro, ok: false, error: err.message })
    }
  }
  return results
}

// ── APROBAR todos los registros de una SEMANA específica ──────────────────
async function aprobarSemana(userId, idEmpleado, idPeriodo) {
  const idJefe = await getJefeId(userId)
  const registros = await query(
    `SELECT rd.id_registro FROM registro_dia rd
     JOIN empleados e ON rd.id_empleado = e.id_empleado
     WHERE rd.id_empleado = ? AND rd.id_periodo = ? AND e.id_jefe = ? AND rd.estado = 'enviado'`,
    [idEmpleado, idPeriodo, idJefe]
  )
  const results = []
  for (const rd of registros) {
    try {
      await _procesar(userId, idJefe, rd.id_registro, 'aprobado', 'Aprobación de semana')
      results.push({ idRegistro: rd.id_registro, ok: true })
    } catch (err) {
      results.push({ idRegistro: rd.id_registro, ok: false, error: err.message })
    }
  }
  return results
}

// ── APROBAR todos los registros de un SPRINT específico ───────────────────
async function aprobarSprint(userId, idEmpleado, idSprint) {
  const idJefe = await getJefeId(userId)
  const registros = await query(
    `SELECT rd.id_registro FROM registro_dia rd
     JOIN empleados e ON rd.id_empleado = e.id_empleado
     WHERE rd.id_empleado = ? AND rd.id_sprint = ? AND e.id_jefe = ? AND rd.estado = 'enviado'`,
    [idEmpleado, idSprint, idJefe]
  )
  const results = []
  for (const rd of registros) {
    try {
      await _procesar(userId, idJefe, rd.id_registro, 'aprobado', 'Aprobación de sprint')
      results.push({ idRegistro: rd.id_registro, ok: true })
    } catch (err) {
      results.push({ idRegistro: rd.id_registro, ok: false, error: err.message })
    }
  }
  return results
}

// ── Helper interno ─────────────────────────────────────────────────────────
async function _procesar(userId, idJefe, idRegistro, accion, comentario) {
  // ── Columnas explícitas sin SELECT rd.* ───────────────────────────────
  const [rd] = await query(
    `SELECT
       rd.id_registro,
       rd.fecha,
       rd.estado,
       rd.id_empleado   AS rd_id_empleado,
       e.id_empleado    AS emp_id,
       CONCAT(e.nombre,' ',e.apellido) AS emp_nombre,
       u.id_usuario     AS emp_usuario_id,
       e.id_jefe        AS emp_jefe_id
     FROM registro_dia rd
     JOIN empleados e ON rd.id_empleado = e.id_empleado
     JOIN usuarios  u ON e.id_usuario   = u.id_usuario
     WHERE rd.id_registro = ?`,
    [idRegistro]
  )
  if (!rd) throw Object.assign(new Error('Jornada no encontrada'), { status: 404 })
  if (rd.estado !== 'enviado') throw Object.assign(new Error('La jornada no está pendiente de aprobación'), { status: 400 })

  const [jefeRow] = await query(`SELECT CONCAT(nombre,' ',apellido) AS nombre FROM empleados WHERE id_empleado = ?`, [idJefe])
  const jefeNombre = jefeRow?.nombre ?? 'Jefe'
  const fechaStr   = fmtDate(rd.fecha)

  // Historial
  await query(
    `INSERT INTO historial_aprobaciones (id_registro, id_revisor, accion, comentario)
     VALUES (?, ?, ?, ?)`,
    [idRegistro, userId, accion, comentario ?? null]
  )

  // Actualiza registro_dia
  const habilitado = accion === 'rechazado' ? 1 : 0
  if (accion === 'aprobado') {
    await query(
      `UPDATE registro_dia SET estado='aprobado', habilitado_edicion=0, fecha_aprobacion=NOW(), actualizado_en=NOW()
       WHERE id_registro=?`,
      [idRegistro]
    )
  } else {
    await query(
      `UPDATE registro_dia SET estado='rechazado', habilitado_edicion=1, actualizado_en=NOW()
       WHERE id_registro=?`,
      [idRegistro]
    )
  }

  // Actualiza actividades
  await query(`UPDATE actividades SET estado=?, actualizado_en=NOW() WHERE id_registro=?`, [accion, idRegistro])

  // Notifica al especialista
  if (accion === 'aprobado') {
    await notificarEspecialista(
      rd.emp_id, 'aprobacion',
      '✅ Jornada aprobada',
      `Tu jornada del ${fechaStr} fue aprobada por ${jefeNombre}.`,
      idRegistro
    )
  } else {
    await notificarEspecialista(
      rd.emp_id, 'rechazo',
      '⚠️ Jornada rechazada',
      `Tu jornada del ${fechaStr} fue rechazada por ${jefeNombre}. Motivo: ${comentario}`,
      idRegistro
    )
  }

  // Auditoría
  await logEvent({
    userId, userName: jefeNombre,
    action: `Jornada ${accion} — ${rd.emp_nombre} (${fechaStr})`,
    entityType: 'registro_dia', entityId: idRegistro,
  })

  return { ok: true, accion, idRegistro }
}

// ── NOTIFICAR AL JEFE cuando especialista envía o corrige ─────────────────
async function notificarFinalizacion(idEmpleadoEsp, idRegistro, tipo) {
  const [esp] = await query(
    `SELECT CONCAT(e.nombre,' ',e.apellido) AS nombre, e.id_jefe
     FROM empleados e WHERE e.id_empleado = ?`,
    [idEmpleadoEsp]
  )
  if (!esp?.id_jefe) return

  const fechaStr = (await query('SELECT fecha FROM registro_dia WHERE id_registro=?', [idRegistro]))[0]?.fecha
  const fecha    = fmtDate(fechaStr)
  const esCorreccion = tipo === 'correccion'

  await notificarJefe(
    esp.id_jefe,
    esCorreccion ? 'correccion' : 'nuevo_registro',
    esCorreccion ? '🔄 Jornada corregida' : '📋 Nueva jornada para revisar',
    esCorreccion
      ? `${esp.nombre} corrigió y reenvió la jornada del ${fecha}. Pendiente de tu aprobación.`
      : `${esp.nombre} finalizó la jornada del ${fecha}. Pendiente de tu aprobación.`,
    idRegistro
  )
}

// ── HISTÓRICO ──────────────────────────────────────────────────────────────
async function getHistorico(userId) {
  const idJefe = await getJefeId(userId)

  const rows = await query(
    `SELECT
       ha.id_aprobacion, ha.accion, ha.comentario, ha.creado_en,
       rd.id_registro, rd.fecha, rd.estado,
       e.id_empleado    AS emp_id,
       CONCAT(e.nombre,' ',e.apellido) AS esp_nombre,
       o.NOM_OFICIO     AS oficio,
       s.nombre         AS sprint_nombre,
       p.numero_semana,
       CONCAT(j.nombre,' ',j.apellido) AS revisor_nombre
     FROM historial_aprobaciones ha
     JOIN registro_dia rd ON ha.id_registro  = rd.id_registro
     JOIN empleados    e  ON rd.id_empleado  = e.id_empleado
     LEFT JOIN oficios o  ON e.id_oficio     = o.id_oficio
     JOIN sprints      s  ON rd.id_sprint    = s.id_sprint
     JOIN periodos     p  ON rd.id_periodo   = p.id_periodo
     JOIN usuarios     u  ON ha.id_revisor   = u.id_usuario
     JOIN empleados    j  ON j.id_usuario    = u.id_usuario
     WHERE e.id_jefe = ?
     ORDER BY ha.creado_en DESC
     LIMIT 300`,
    [idJefe]
  )

  const regIds = [...new Set(rows.map(r => r.id_registro))]
  const actsMap = {}
  if (regIds.length > 0) {
    const ph   = regIds.map(() => '?').join(',')
    const acts = await query(
      `SELECT a.id_registro, a.duracion_mins, a.estado, s.nombre AS sub_nombre, s.modelo
       FROM actividades a
       JOIN subcategorias_actividad s ON a.id_subcategoria = s.id_subcategoria
       WHERE a.id_registro IN (${ph})`,
      regIds
    )
    for (const a of acts) {
      if (!actsMap[a.id_registro]) actsMap[a.id_registro] = []
      actsMap[a.id_registro].push(a)
    }
  }

  const byEsp = {}
  for (const r of rows) {
    if (!byEsp[r.emp_id]) {
      byEsp[r.emp_id] = { id: r.emp_id, nombre: r.esp_nombre, oficio: r.oficio, registros: {} }
    }
    const key = r.id_registro
    if (!byEsp[r.emp_id].registros[key]) {
      const dayActs = actsMap[key] ?? []
      byEsp[r.emp_id].registros[key] = {
        idRegistro:   r.id_registro,
        fecha:        fmtDate(r.fecha),
        estadoActual: r.estado,
        sprintNombre: r.sprint_nombre,
        semana:       r.numero_semana,
        totalMins:    dayActs.reduce((s,a) => s+a.duracion_mins, 0),
        historial:    [],
      }
    }
    byEsp[r.emp_id].registros[key].historial.push({
      id:        r.id_aprobacion,
      accion:    r.accion,
      comentario:r.comentario,
      revisor:   r.revisor_nombre,
      fecha:     r.creado_en,
    })
  }

  return Object.values(byEsp).map(e => ({ ...e, registros: Object.values(e.registros) }))
}

module.exports = {
  getPendientes, aprobar, rechazar,
  aprobarTodo, aprobarSemana, aprobarSprint,
  getHistorico, notificarFinalizacion,
}
