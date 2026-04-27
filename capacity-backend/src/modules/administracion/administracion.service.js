'use strict'
const { query } = require('../../config/database')
const { logEvent } = require('../audit/audit.service')

function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

async function getJefeId(userId) {
  const [emp] = await query(
    'SELECT id_empleado, id_ccosto FROM empleados WHERE id_usuario=? AND activo=1', [userId])
  if (!emp) throw Object.assign(new Error('Jefe no encontrado'), { status: 404 })

  // Verifica si tiene visibilidad multi-área
  const areas = await query(
    'SELECT id_area FROM jefe_areas_visibilidad WHERE id_jefe=?', [emp.id_empleado])
  return { ...emp, areas_visibilidad: areas.map(a=>a.id_area) }
}

// ── Notificar a un empleado ────────────────────────────────────────────────
async function notificar(idEmpleado, tipo, titulo, mensaje, idRef, tipoRef) {
  const [usr] = await query(
    'SELECT id_usuario FROM empleados WHERE id_empleado=?', [idEmpleado])
  if (!usr) return
  await query(
    `INSERT INTO notificaciones (id_usuario,tipo,titulo,mensaje,id_referencia,tipo_referencia)
     VALUES (?,?,?,?,?,?)`,
    [usr.id_usuario, tipo, titulo, mensaje, idRef, tipoRef])
}

// ════════════════════════════════════════════════════════════════════════
// BLOQUE 1 — PERÍODOS
// ════════════════════════════════════════════════════════════════════════

async function getEquipoParaHabilitar(userId) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  let especialistas
  if (jefeData.areas_visibilidad?.length > 0) {
    const ph = jefeData.areas_visibilidad.map(()=>'?').join(',')
    especialistas = await query(
      `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre, o.NOM_OFICIO AS oficio
       FROM empleados e LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       WHERE e.id_area IN (${ph}) AND e.activo=1 AND e.id_empleado!=?
       ORDER BY e.nombre`,
      [...jefeData.areas_visibilidad, jefeData.id_empleado])
  } else {
    especialistas = await query(
      `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre, o.NOM_OFICIO AS oficio
       FROM empleados e LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       WHERE e.id_jefe=? AND e.activo=1 ORDER BY e.nombre`, [idJefe])
  }

  const sprints = await query(
    `SELECT id_sprint, nombre, fecha_inicio, fecha_fin, estado FROM sprints ORDER BY id_sprint DESC`)
  const todosIds = sprints.map(s => s.id_sprint)
  let periodos = []
  if (todosIds.length) {
    const ph = todosIds.map(()=>'?').join(',')
    periodos = await query(
      `SELECT id_periodo,id_sprint,numero_semana,fecha_inicio,fecha_fin,estado
       FROM periodos WHERE id_sprint IN (${ph}) ORDER BY id_sprint DESC,numero_semana`,
      todosIds)
  }

  const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  function getDiasHabiles(ini, fin) {
    const dias = [], s = new Date(ini+'T12:00:00'), e = new Date(fin+'T12:00:00')
    let c = new Date(s)
    while (c <= e) {
      const dow = c.getDay()
      if (dow >= 1 && dow <= 5) dias.push({ fecha: c.toISOString().split('T')[0], label: `${DAYS[dow]} ${c.getDate()}` })
      c.setDate(c.getDate()+1)
    }
    return dias
  }

  const result = []
  for (const esp of especialistas) {
    const registros = todosIds.length ? await query(
      `SELECT rd.id_registro,rd.fecha,rd.estado,rd.habilitado_edicion,rd.id_periodo,rd.id_sprint
       FROM registro_dia rd WHERE rd.id_empleado=? ORDER BY rd.fecha DESC`, [esp.id_empleado]) : []
    const regByFecha = {}
    for (const r of registros) regByFecha[fmtDate(r.fecha)] = r

    const sprintsData = sprints.map(sp => {
      const periodosSprint = periodos.filter(p => p.id_sprint === sp.id_sprint)
      const semanas = periodosSprint.map(p => {
        const dias = getDiasHabiles(fmtDate(p.fecha_inicio), fmtDate(p.fecha_fin)).map(d => {
          const reg = regByFecha[d.fecha]
          return { fecha: d.fecha, label: d.label, idRegistro: reg?.id_registro??null, estado: reg?.estado??'sin_registro', habilitado: reg?.habilitado_edicion??0 }
        })
        return { idPeriodo:p.id_periodo, numero:p.numero_semana, label:`Semana ${p.numero_semana}`,
                 inicio:fmtDate(p.fecha_inicio), fin:fmtDate(p.fecha_fin), estadoPeriodo:p.estado, dias }
      })
      return { idSprint:sp.id_sprint, nombre:sp.nombre, inicio:fmtDate(sp.fecha_inicio),
               fin:fmtDate(sp.fecha_fin), estado:sp.estado, semanas }
    })
    result.push({ id:esp.id_empleado, nombre:esp.nombre, oficio:esp.oficio, sprints:sprintsData })
  }
  return { especialistas: result }
}

async function habilitarRegistro(userId, idRegistro) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const [rd] = await query(
    `SELECT rd.id_registro,rd.fecha,rd.estado,rd.id_empleado,e.id_jefe
     FROM registro_dia rd JOIN empleados e ON rd.id_empleado=e.id_empleado WHERE rd.id_registro=?`, [idRegistro])
  if (!rd || rd.id_jefe !== idJefe) throw Object.assign(new Error('Sin permiso'), { status:403 })
  if (rd.estado === 'borrador') throw Object.assign(new Error('Ya está en borrador'), { status:400 })
  await query(`UPDATE registro_dia SET habilitado_edicion=1,actualizado_en=NOW() WHERE id_registro=?`, [idRegistro])
  await notificar(rd.id_empleado, 'reabiertura', '🔓 Período habilitado',
    `Tu jornada del ${fmtDate(rd.fecha)} fue habilitada para edición.`, idRegistro, 'registro_dia')
  return { ok:true }
}

async function crearYHabilitar(userId, idEmpleado, idPeriodo, fecha) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const [esp] = await query(
    `SELECT e.id_empleado,u.id_usuario FROM empleados e JOIN usuarios u ON e.id_usuario=u.id_usuario
     WHERE e.id_empleado=? AND e.id_jefe=?`, [idEmpleado, idJefe])
  if (!esp) throw Object.assign(new Error('Sin permiso'), { status:403 })
  const [existing] = await query('SELECT id_registro FROM registro_dia WHERE id_empleado=? AND fecha=?', [idEmpleado, fecha])
  if (existing) return habilitarRegistro(userId, existing.id_registro)
  const [periodo] = await query('SELECT id_periodo,id_sprint FROM periodos WHERE id_periodo=?', [idPeriodo])
  if (!periodo) throw Object.assign(new Error('Período no encontrado'), { status:404 })
  const result = await query(
    `INSERT INTO registro_dia (id_empleado,id_sprint,id_periodo,fecha,estado,habilitado_edicion)
     VALUES (?,?,?,?,'borrador',1)`, [idEmpleado, periodo.id_sprint, periodo.id_periodo, fecha])
  await query(
    `INSERT INTO notificaciones (id_usuario,tipo,titulo,mensaje,id_referencia,tipo_referencia)
     VALUES (?,?,?,?,?,'registro_dia')`,
    [esp.id_usuario, 'reabiertura', '🔓 Período habilitado',
     `Tu jornada del ${fecha} fue habilitada. Puedes ingresar actividades.`, result.insertId])
  return { ok:true, accion:'creado_y_habilitado', idRegistro:result.insertId }
}

async function habilitarSemana(userId, idEmpleado, idPeriodo) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const [esp] = await query('SELECT id_empleado FROM empleados WHERE id_empleado=? AND id_jefe=?', [idEmpleado, idJefe])
  if (!esp) throw Object.assign(new Error('Sin permiso'), { status:403 })
  const [periodo] = await query('SELECT id_periodo,id_sprint,fecha_inicio,fecha_fin FROM periodos WHERE id_periodo=?', [idPeriodo])
  if (!periodo) throw Object.assign(new Error('Período no encontrado'), { status:404 })
  const inicio = new Date(fmtDate(periodo.fecha_inicio)+'T12:00:00')
  const fin    = new Date(fmtDate(periodo.fecha_fin)+'T12:00:00')
  const dias   = []
  let c = new Date(inicio)
  while (c <= fin) { if (c.getDay()>=1&&c.getDay()<=5) dias.push(c.toISOString().split('T')[0]); c.setDate(c.getDate()+1) }
  let habilitados=0, creados=0
  for (const fecha of dias) {
    const [rd] = await query('SELECT id_registro,estado FROM registro_dia WHERE id_empleado=? AND fecha=?', [idEmpleado, fecha])
    if (rd) {
      if (rd.estado !== 'borrador') {
        await query(`UPDATE registro_dia SET habilitado_edicion=1,actualizado_en=NOW() WHERE id_registro=?`, [rd.id_registro])
        habilitados++
      }
    } else {
      await query(`INSERT INTO registro_dia (id_empleado,id_sprint,id_periodo,fecha,estado,habilitado_edicion) VALUES (?,?,?,?,'borrador',1)`,
        [idEmpleado, periodo.id_sprint, periodo.id_periodo, fecha])
      creados++
    }
  }
  const [usr] = await query(`SELECT u.id_usuario FROM empleados e JOIN usuarios u ON e.id_usuario=u.id_usuario WHERE e.id_empleado=?`, [idEmpleado])
  if (usr) {
    await query(`INSERT INTO notificaciones (id_usuario,tipo,titulo,mensaje,id_referencia,tipo_referencia) VALUES (?,?,?,?,?,'registro_dia')`,
      [usr.id_usuario, 'reabiertura', '🔓 Semana habilitada',
       `La semana ${fmtDate(periodo.fecha_inicio)} → ${fmtDate(periodo.fecha_fin)} fue habilitada para edición.`, idPeriodo])
  }
  return { ok:true, habilitados, creados, total:habilitados+creados }
}

// ════════════════════════════════════════════════════════════════════════
// BLOQUE 2 — PROYECTOS
// ════════════════════════════════════════════════════════════════════════

/**
 * Retorna oficinas con sus proyectos públicos + las iniciativas del jefe.
 * Las iniciativas se filtran por id_ccosto del jefe (solo las de su área).
 */
async function getOficinas(userId) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const id_ccosto = jefeData.id_ccosto

  const oficinas = await query(
    'SELECT id_oficina,nombre,descripcion,color FROM oficinas_proyecto WHERE activo=1 ORDER BY id_oficina')

  // Proyectos globales (oficinas formales, no de equipo)
  const proyectosGlobales = await query(
    `SELECT p.id_proyecto, p.id_oficina, p.nombre, p.descripcion,
            p.tipo, p.tipo_proyecto, p.clasificacion, p.alcance_visibilidad,
            p.estado, p.avance_pct, p.estado_detalle,
            p.presupuesto_est, p.costo_est_anual, p.costo_ejec_anual,
            p.observaciones, p.fecha_inicio, p.fecha_fin, p.fecha_fin_real,
            p.creado_en,
            pg.nombre AS programa_nombre,
            a.NOM_AREA AS area_nombre,
            CONCAT(l.nombre,' ',l.apellido) AS lider_nombre,
            (SELECT COUNT(*) FROM empleado_proyecto ep WHERE ep.id_proyecto=p.id_proyecto AND ep.activo=1) AS total_asignados
     FROM proyectos p
     LEFT JOIN programas_proyecto pg ON p.id_programa=pg.id_programa
     LEFT JOIN areas               a  ON p.id_area    =a.id_area
     LEFT JOIN empleados           l  ON p.id_lider   =l.id_empleado
     WHERE p.estado!='cerrado' AND p.alcance_visibilidad != 'equipo'
     ORDER BY p.id_oficina, p.estado, p.nombre`)

  // Iniciativas del jefe — filtradas por id_ccosto para que solo las vea su área
  const iniciativas = await query(
    `SELECT p.id_proyecto, p.nombre, p.descripcion,
            p.tipo, p.tipo_proyecto, p.clasificacion, p.alcance_visibilidad,
            p.estado, p.avance_pct, p.estado_detalle,
            p.fecha_inicio, p.fecha_fin, p.creado_en, p.creado_por,
            CONCAT(l.nombre,' ',l.apellido) AS lider_nombre,
            (SELECT COUNT(*) FROM empleado_proyecto ep WHERE ep.id_proyecto=p.id_proyecto AND ep.activo=1) AS total_asignados
     FROM proyectos p
     LEFT JOIN empleados l ON p.id_lider=l.id_empleado
     WHERE p.alcance_visibilidad='equipo'
       AND (p.id_ccosto=? OR p.id_lider=? OR p.creado_por=?)
       AND p.estado != 'cerrado'
     ORDER BY p.creado_en DESC`,
    [id_ccosto, idJefe, userId])  // visible para el mismo ccosto

  const fmt = p => ({ ...p, fecha_inicio:fmtDate(p.fecha_inicio), fecha_fin:fmtDate(p.fecha_fin),
    fecha_fin_real:fmtDate(p.fecha_fin_real), creado_en:fmtDate(p.creado_en) })

  return {
    oficinas: oficinas.map(o => ({
      ...o,
      proyectos: proyectosGlobales.filter(p=>p.id_oficina===o.id_oficina).map(fmt),
    })),
    iniciativas: iniciativas.map(fmt),
  }
}

/**
 * Crea iniciativa interna del jefe.
 * Guarda id_ccosto del jefe para que solo su área la vea.
 */
async function crearIniciativa(userId, data) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const id_ccosto = jefeData.id_ccosto
  const { nombre, descripcion, fecha_inicio, fecha_fin } = data
  if (!nombre?.trim()) throw Object.assign(new Error('El nombre es requerido'), { status: 400 })

  const result = await query(
    `INSERT INTO proyectos
     (nombre, descripcion, tipo, tipo_proyecto, clasificacion,
      id_ccosto, id_lider, alcance_visibilidad, estado,
      fecha_inicio, fecha_fin, creado_por)
     VALUES (?,?,?,?,?,?,?,'equipo','sin_iniciar',?,?,?)`,
    [nombre.trim(), descripcion||null, 'estrategico', 'iniciativa',
     'estrategico', id_ccosto||null, idJefe,
     fecha_inicio||null, fecha_fin||null, userId])

  await logEvent({ userId, action:`Iniciativa interna creada — ${nombre}`, entityType:'proyectos', entityId:result.insertId })
  const [proy] = await query('SELECT * FROM proyectos WHERE id_proyecto=?', [result.insertId])
  return { ...proy, fecha_inicio:fmtDate(proy.fecha_inicio), fecha_fin:fmtDate(proy.fecha_fin) }
}

/**
 * Edita nombre, descripción y fechas de una iniciativa interna.
 */
async function editarIniciativa(userId, idProyecto, data) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const [proy] = await query(
    `SELECT id_proyecto,nombre,creado_por,id_lider FROM proyectos
     WHERE id_proyecto=? AND alcance_visibilidad='equipo'`, [idProyecto])
  if (!proy) throw Object.assign(new Error('Iniciativa no encontrada'), { status:404 })
  const [jusr] = await query('SELECT id_usuario FROM empleados WHERE id_empleado=?', [idJefe])
  if (proy.creado_por!==jusr?.id_usuario && proy.id_lider!==idJefe)
    throw Object.assign(new Error('Sin permiso para editar esta iniciativa'), { status:403 })

  const { nombre, descripcion, fecha_inicio, fecha_fin, estado } = data
  if (!nombre?.trim()) throw Object.assign(new Error('El nombre es requerido'), { status:400 })
  const estadoValido = ['sin_iniciar','activo','pausado','cerrado'].includes(estado) ? estado : null
  await query(
    `UPDATE proyectos
     SET nombre=?, descripcion=?, fecha_inicio=?, fecha_fin=?,
         ${estadoValido ? 'estado=?,' : ''} actualizado_en=NOW()
     WHERE id_proyecto=?`,
    estadoValido
      ? [nombre.trim(), descripcion||null, fecha_inicio||null, fecha_fin||null, estadoValido, idProyecto]
      : [nombre.trim(), descripcion||null, fecha_inicio||null, fecha_fin||null, idProyecto]
  )
  await logEvent({ userId, action:`Iniciativa editada — ${nombre}`, entityType:'proyectos', entityId:idProyecto })
  const [updated] = await query('SELECT * FROM proyectos WHERE id_proyecto=?', [idProyecto])
  return { ...updated, fecha_inicio:fmtDate(updated.fecha_inicio), fecha_fin:fmtDate(updated.fecha_fin) }
}

/**
 * Elimina una iniciativa interna y desvincula a todos los especialistas.
 * Notifica a los especialistas afectados.
 */
async function eliminarIniciativa(userId, idProyecto) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const [proy] = await query(
    `SELECT id_proyecto,nombre,creado_por,id_lider FROM proyectos
     WHERE id_proyecto=? AND alcance_visibilidad='equipo'`, [idProyecto])
  if (!proy) throw Object.assign(new Error('Iniciativa no encontrada'), { status:404 })
  const [jusr] = await query('SELECT id_usuario FROM empleados WHERE id_empleado=?', [idJefe])
  if (proy.creado_por!==jusr?.id_usuario && proy.id_lider!==idJefe)
    throw Object.assign(new Error('Sin permiso para eliminar esta iniciativa'), { status:403 })

  // Notifica a todos los asignados antes de eliminar
  const asignados = await query(
    `SELECT ep.id_empleado FROM empleado_proyecto ep WHERE ep.id_proyecto=? AND ep.activo=1`, [idProyecto])
  for (const a of asignados) {
    await notificar(a.id_empleado, 'proyecto_eliminado', '🗑️ Iniciativa eliminada',
      `La iniciativa "${proy.nombre}" fue eliminada. Ya no aparecerá en tus proyectos.`,
      idProyecto, 'proyecto')
  }

  await query('DELETE FROM empleado_proyecto WHERE id_proyecto=?', [idProyecto])
  await query('DELETE FROM proyectos WHERE id_proyecto=?', [idProyecto])
  await logEvent({ userId, action:`Iniciativa eliminada — ${proy.nombre}`, entityType:'proyectos', entityId:idProyecto })
  return { ok:true }
}

// ════════════════════════════════════════════════════════════════════════
// BLOQUE 3 — ASIGNACIONES
// ════════════════════════════════════════════════════════════════════════

async function asignarEspecialistas(userId, idProyecto, idEmpleados) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  if (!idEmpleados?.length) throw Object.assign(new Error('Selecciona al menos un especialista'), { status:400 })

  const ph   = idEmpleados.map(()=>'?').join(',')
  const esps = await query(
    `SELECT id_empleado,id_usuario FROM empleados WHERE id_empleado IN (${ph}) AND id_jefe=?`,
    [...idEmpleados, idJefe])
  if (esps.length !== idEmpleados.length)
    throw Object.assign(new Error('Algunos especialistas no son de tu equipo'), { status:403 })

  const [proy] = await query('SELECT nombre FROM proyectos WHERE id_proyecto=?', [idProyecto])
  for (const esp of esps) {
    await query(
      `MERGE empleado_proyecto AS target
       USING (SELECT ? AS id_empleado, ? AS id_proyecto, ? AS asignado_por) AS source
       ON target.id_empleado = source.id_empleado AND target.id_proyecto = source.id_proyecto
       WHEN MATCHED THEN
         UPDATE SET activo = 1, asignado_por = source.asignado_por, asignado_en = SYSUTCDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (id_empleado, id_proyecto, activo, asignado_por, asignado_en)
         VALUES (source.id_empleado, source.id_proyecto, 1, source.asignado_por, SYSUTCDATETIME());`,
      [esp.id_empleado, idProyecto, userId])
    await query(
      `INSERT INTO notificaciones (id_usuario,tipo,titulo,mensaje,id_referencia,tipo_referencia)
       VALUES (?,?,?,?,?,'proyecto')`,
      [esp.id_usuario, 'asignacion_proy', '📁 Asignado a proyecto',
       `Fuiste asignado al proyecto "${proy?.nombre||''}". Ya puedes registrar actividades relacionadas.`,
       idProyecto])
  }
  await logEvent({ userId, action:`Asignación proyecto ${idProyecto} — ${esps.length} especialistas`, entityType:'proyectos', entityId:idProyecto })
  return { ok:true, asignados:esps.length }
}

async function desasignarEspecialista(userId, idProyecto, idEmpleado) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  const [esp] = await query('SELECT id_empleado FROM empleados WHERE id_empleado=? AND id_jefe=?', [idEmpleado, idJefe])
  if (!esp) throw Object.assign(new Error('Sin permiso'), { status:403 })
  await query(`UPDATE empleado_proyecto SET activo=0 WHERE id_empleado=? AND id_proyecto=?`, [idEmpleado, idProyecto])

  // Notifica al especialista retirado
  const [proy] = await query('SELECT nombre FROM proyectos WHERE id_proyecto=?', [idProyecto])
  await notificar(idEmpleado, 'desasignacion_proy', '📋 Retirado de proyecto',
    `Fuiste retirado del proyecto "${proy?.nombre||''}".`, idProyecto, 'proyecto')

  return { ok:true }
}

async function getAsignacionesEquipo(userId) {
  const jefeData = await getJefeId(userId)
  const idJefe = jefeData.id_empleado
  let especialistas
  if (jefeData.areas_visibilidad?.length > 0) {
    const ph = jefeData.areas_visibilidad.map(()=>'?').join(',')
    especialistas = await query(
      `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre, o.NOM_OFICIO AS oficio
       FROM empleados e LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       WHERE e.id_area IN (${ph}) AND e.activo=1 AND e.id_empleado!=?
       ORDER BY e.nombre`,
      [...jefeData.areas_visibilidad, jefeData.id_empleado])
  } else {
    especialistas = await query(
      `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre, o.NOM_OFICIO AS oficio
       FROM empleados e LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       WHERE e.id_jefe=? AND e.activo=1 ORDER BY e.nombre`, [idJefe])
  }

  const result = []
  for (const esp of especialistas) {
    const proyectos = await query(
      `SELECT p.id_proyecto, p.nombre, p.estado, p.avance_pct,
              p.alcance_visibilidad,
              o.nombre  AS oficina_nombre,
              o.color   AS oficina_color,
              COALESCE((
                SELECT SUM(a.duracion_mins)
                FROM actividades a
                JOIN registro_dia rd ON a.id_registro = rd.id_registro
                WHERE rd.id_empleado = ep.id_empleado
                  AND a.id_proyecto  = p.id_proyecto
              ), 0) AS mins_invertidos
       FROM empleado_proyecto ep
       JOIN proyectos p ON ep.id_proyecto = p.id_proyecto
       LEFT JOIN oficinas_proyecto o ON p.id_oficina = o.id_oficina
       WHERE ep.id_empleado = ? AND ep.activo = 1
       ORDER BY p.estado, p.nombre`, [esp.id_empleado])
    result.push({
      id:        esp.id_empleado,
      nombre:    esp.nombre,
      oficio:    esp.oficio,
      proyectos: proyectos.map(p => ({ ...p, mins_invertidos: Number(p.mins_invertidos) })),
    })
  }
  return result
}

module.exports = {
  getEquipoParaHabilitar, habilitarRegistro, crearYHabilitar, habilitarSemana,
  getOficinas, crearIniciativa, editarIniciativa, eliminarIniciativa,
  asignarEspecialistas, desasignarEspecialista, getAsignacionesEquipo,
}
