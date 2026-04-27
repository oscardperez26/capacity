'use strict'

const { query } = require('../../config/database')

function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()}`
}

function calcMinEsperados(ini, fin) {
  const s = new Date(ini + 'T12:00:00'), e = new Date(fin + 'T12:00:00')
  let dias = 0, c = new Date(s)
  while (c <= e) { if (c.getDay() >= 1 && c.getDay() <= 5) dias++; c.setDate(c.getDate()+1) }
  return dias * 528  // 44h / 5 = 8.8h = 528 min/día
}

async function getRango(filtro, sprintId, desde, hasta) {
  const hoy = new Date(), fmt = d => d.toISOString().split('T')[0]
  if (filtro === 'rango' && desde && hasta) return { ini: desde, fin: hasta, label: `${desde} → ${hasta}` }
  if (filtro === 'dia') { const f = desde || fmt(hoy); return { ini: f, fin: f, label: f === fmt(hoy) ? 'Hoy' : f } }
  if (filtro === 'semana') {
    const dow = hoy.getDay(), diff = dow===0?-6:1-dow
    const lun = new Date(hoy); lun.setDate(hoy.getDate()+diff)
    const dom = new Date(lun); dom.setDate(lun.getDate()+6)
    return { ini: fmt(lun), fin: fmt(dom), label: 'Esta semana' }
  }
  if (filtro === 'mes') {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const fin = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0)
    return { ini: fmt(ini), fin: fmt(fin), label: 'Este mes' }
  }
  const sid = sprintId ? parseInt(sprintId) : null
  const [sp] = await query(
    `SELECT id_sprint, nombre, fecha_inicio, fecha_fin FROM sprints
     WHERE ${sid ? 'id_sprint=?' : "estado='activo'"} ORDER BY id_sprint DESC LIMIT 1`,
    sid ? [sid] : []
  )
  if (!sp) { const f = fmt(hoy); return { ini: f, fin: f, label: 'Hoy' } }
  return { ini: fmtDate(sp.fecha_inicio), fin: fmtDate(sp.fecha_fin), label: sp.nombre }
}

async function getEmpleado(userId) {
  const [row] = await query(
    `SELECT e.id_empleado,
            CONCAT(e.nombre,' ',e.apellido)     AS nombre,
            o.NOM_OFICIO                        AS cargo,
            a.NOM_AREA                          AS area,
            a.area_key,
            a.id_area,
            CONCAT(j.nombre,' ',j.apellido)     AS jefe_nombre
     FROM empleados e
     LEFT JOIN oficios   o  ON e.id_oficio  = o.id_oficio
     LEFT JOIN areas     a  ON e.id_area    = a.id_area
     LEFT JOIN empleados j  ON e.id_jefe    = j.id_empleado
     WHERE e.id_usuario = ? AND e.activo = 1`,
    [userId]
  )
  if (!row) throw Object.assign(new Error('Empleado no encontrado'), { status: 404 })
  return row
}

// ── getDashboard ───────────────────────────────────────────────────────────
async function getDashboard(userId, filtro = 'dia', sprintId = null, desde = null, hasta = null) {
  const emp   = await getEmpleado(userId)
  const rango = await getRango(filtro, sprintId, desde, hasta)

  const [sprintActivo] = await query(
    `SELECT id_sprint, nombre, fecha_inicio, fecha_fin
     FROM sprints WHERE estado='activo' ORDER BY id_sprint DESC LIMIT 1`
  )
  const sprints = await query(`SELECT id_sprint AS id, nombre FROM sprints ORDER BY id_sprint DESC`)

  const registros = await query(
    `SELECT id_registro, fecha, estado FROM registro_dia
     WHERE id_empleado=? AND fecha BETWEEN ? AND ? ORDER BY fecha ASC`,
    [emp.id_empleado, rango.ini, rango.fin]
  )

  const empty = {
    empleado: { id: emp.id_empleado, nombre: emp.nombre, cargo: emp.cargo, area: emp.area, areaKey: emp.area_key, jefe: emp.jefe_nombre },
    sprint:   sprintActivo ? { id: sprintActivo.id_sprint, nombre: sprintActivo.nombre, inicio: fmtDate(sprintActivo.fecha_inicio), fin: fmtDate(sprintActivo.fecha_fin) } : null,
    sprints, filtro, rango,
    kpis:     { capacityPct:0, totalMins:0, promMins:0, diasFinalizados:0, diasAprobados:0, diasConActividad:0, minEsperados: calcMinEsperados(rango.ini, rango.fin), totalActividades:0, noPlaneadasPct:0 },
    byModel:  { RUN:0, BUILD:0, ADMIN:0, GROW:0, OFF:0 },
    modelDetail: {}, horasPorDia: [], distCat: [],
  }
  if (registros.length === 0) return empty

  const ids = registros.map(r => r.id_registro)
  const ph  = ids.map(() => '?').join(',')

  const acts = await query(
    `SELECT a.id_actividad, a.id_registro, a.duracion_mins, a.estado AS act_estado, a.id_proyecto,
            s.modelo, s.nombre AS sub_nombre,
            c.nombre AS cat_nombre, c.color AS cat_color,
            rd.fecha AS dia_fecha
     FROM actividades a
     JOIN subcategorias_actividad s  ON a.id_subcategoria = s.id_subcategoria
     JOIN categorias_actividad    c  ON s.id_categoria    = c.id_categoria
     JOIN registro_dia           rd  ON a.id_registro     = rd.id_registro
     WHERE a.id_registro IN (${ph})`,
    ids
  )

  const totalMins     = acts.reduce((a,t) => a+t.duracion_mins, 0)
  const minEsperados  = calcMinEsperados(rango.ini, rango.fin)
  const capacityPct   = minEsperados > 0 ? Math.min(Math.round(totalMins/minEsperados*100), 999) : 0
  const diasConAct    = new Set(acts.map(a => fmtDate(a.dia_fecha))).size
  const promMins      = diasConAct > 0 ? Math.round(totalMins/diasConAct) : 0
  const diasFin       = registros.filter(r => ['enviado','aprobado'].includes(r.estado)).length
  const diasAprobados = registros.filter(r => r.estado==='aprobado').length
  const noPlaneadas   = acts.filter(a => a.modelo==='BUILD' && !a.id_proyecto).length
  const noPlaneadasPct= acts.length ? Math.round(noPlaneadas/acts.length*100) : 0

  const byModel = { RUN:0, BUILD:0, ADMIN:0, GROW:0, OFF:0 }
  for (const a of acts) byModel[a.modelo] = (byModel[a.modelo]??0) + a.duracion_mins

  const mDMap = {}
  for (const a of acts) {
    const m = a.modelo
    if (!mDMap[m]) mDMap[m] = { totalMins:0, taskMap:{} }
    mDMap[m].totalMins += a.duracion_mins
    mDMap[m].taskMap[a.sub_nombre] = (mDMap[m].taskMap[a.sub_nombre]??0) + a.duracion_mins
  }
  const modelDetail = {}
  for (const [m, d] of Object.entries(mDMap)) {
    const tasks = Object.entries(d.taskMap)
      .map(([name,mins]) => ({ name, mins, pct: Math.round(mins/d.totalMins*100) }))
      .sort((a,b) => b.mins-a.mins)
    modelDetail[m] = { totalMins: d.totalMins, tasks, topTask: tasks[0]??null }
  }

  const hxDia = {}
  for (const a of acts) {
    const f = fmtDate(a.dia_fecha)
    if (!hxDia[f]) hxDia[f] = { date:f, dayLabel: fmtDayLabel(f), mins:0 }
    hxDia[f].mins += a.duracion_mins
  }
  const horasPorDia = Object.values(hxDia).sort((a,b) => a.date.localeCompare(b.date))

  const byCat = {}
  for (const a of acts) {
    if (!byCat[a.cat_nombre]) byCat[a.cat_nombre] = { nombre:a.cat_nombre, color:a.cat_color, mins:0 }
    byCat[a.cat_nombre].mins += a.duracion_mins
  }
  const distCat = Object.values(byCat)
    .map(c => ({ ...c, pct: Math.round(c.mins/Math.max(totalMins,1)*100) }))
    .sort((a,b) => b.mins-a.mins)

  return {
    empleado:    { id:emp.id_empleado, nombre:emp.nombre, cargo:emp.cargo, area:emp.area, areaKey:emp.area_key, jefe:emp.jefe_nombre },
    sprint:      sprintActivo ? { id:sprintActivo.id_sprint, nombre:sprintActivo.nombre, inicio:fmtDate(sprintActivo.fecha_inicio), fin:fmtDate(sprintActivo.fecha_fin) } : null,
    sprints, filtro, rango,
    kpis:        { capacityPct, totalMins, promMins, diasFinalizados:diasFin, diasAprobados, diasConActividad:diasConAct, minEsperados, totalActividades:acts.length, noPlaneadasPct },
    byModel, modelDetail, horasPorDia, distCat,
  }
}

// ── getProyectos ───────────────────────────────────────────────────────────
async function getProyectos(userId) {
  const emp = await getEmpleado(userId)

  const proyectos = await query(
    `SELECT p.id_proyecto, p.nombre, p.descripcion, p.tipo, p.tipo_proyecto,
            p.clasificacion, p.estado, p.avance_pct, p.estado_detalle,
            p.presupuesto_est, p.costo_est_anual, p.costo_ejec_anual,
            p.observaciones, p.fecha_inicio, p.fecha_fin, p.fecha_fin_real,
            o.nombre   AS oficina_nombre, o.color    AS oficina_color,
            pg.nombre  AS programa_nombre,
            CONCAT(lider.nombre,' ',lider.apellido) AS lider_nombre,
            a.NOM_AREA AS area_nombre
     FROM empleado_proyecto ep
     JOIN proyectos            p  ON ep.id_proyecto = p.id_proyecto
     LEFT JOIN oficinas_proyecto o  ON p.id_oficina  = o.id_oficina
     LEFT JOIN programas_proyecto pg ON p.id_programa = pg.id_programa
     LEFT JOIN empleados lider     ON p.id_lider     = lider.id_empleado
     LEFT JOIN areas a             ON p.id_area      = a.id_area
     WHERE ep.id_empleado=? AND ep.activo=1
     ORDER BY p.estado ASC, p.nombre ASC`,
    [emp.id_empleado]
  )

  const proyIds  = proyectos.map(p => p.id_proyecto)
  const horasMap = {}
  if (proyIds.length > 0) {
    const rows = await query(
      `SELECT id_proyecto, SUM(duracion_mins) AS total_mins
       FROM actividades WHERE id_proyecto IN (${proyIds.map(()=>'?').join(',')})
       GROUP BY id_proyecto`,
      proyIds
    )
    for (const r of rows) horasMap[r.id_proyecto] = Number(r.total_mins)
  }

  const kpis = {
    total:      proyectos.length,
    ejecucion:  proyectos.filter(p=>p.estado==='activo').length,
    sinIniciar: proyectos.filter(p=>p.estado==='sin_iniciar').length,
    suspendido: proyectos.filter(p=>p.estado==='pausado').length,
    cerrado:    proyectos.filter(p=>p.estado==='cerrado').length,
    avanceProm: proyectos.length ? Math.round(proyectos.reduce((a,p)=>a+(p.avance_pct??0),0)/proyectos.length) : 0,
  }

  return {
    empleado: { nombre: emp.nombre, area: emp.area },
    kpis,
    proyectos: proyectos.map(p => ({
      id:             p.id_proyecto,
      nombre:         p.nombre,
      descripcion:    p.descripcion,
      tipo:           p.tipo,
      tipoProyecto:   p.tipo_proyecto,
      clasificacion:  p.clasificacion,
      estado:         p.estado,
      avancePct:      p.avance_pct ?? 0,
      estadoDetalle:  p.estado_detalle,
      presupuestoEst: p.presupuesto_est,
      costoEstAnual:  p.costo_est_anual,
      costoEjecAnual: p.costo_ejec_anual,
      observaciones:  p.observaciones,
      fechaInicio:    fmtDate(p.fecha_inicio),
      fechaFin:       fmtDate(p.fecha_fin),
      fechaFinReal:   fmtDate(p.fecha_fin_real),
      oficina:        { nombre: p.oficina_nombre ?? 'Sin oficina', color: p.oficina_color ?? '#888' },
      programa:       p.programa_nombre ?? '—',
      lider:          p.lider_nombre ?? '—',
      area:           p.area_nombre ?? '—',
      minInvertidos:  horasMap[p.id_proyecto] ?? 0,
    })),
  }
}

// ── getProyectosSelector ── (para Mi Día) ─────────────────────────────────
async function getProyectosSelector(userId) {
  const emp = await getEmpleado(userId)
  const rows = await query(
    `SELECT p.id_proyecto AS id, p.nombre,
            o.nombre AS oficina_nombre, o.color AS oficina_color
     FROM empleado_proyecto ep
     JOIN proyectos           p  ON ep.id_proyecto = p.id_proyecto
     LEFT JOIN oficinas_proyecto o  ON p.id_oficina  = o.id_oficina
     WHERE ep.id_empleado=? AND ep.activo=1 AND p.estado='activo'
     ORDER BY p.nombre ASC`,
    [emp.id_empleado]
  )
  return rows.map(r => ({
    id:      r.id,
    nombre:  r.nombre,
    oficina: r.oficina_nombre ?? 'Sin oficina',
    color:   r.oficina_color  ?? '#888',
  }))
}

module.exports = { getDashboard, getProyectos, getProyectosSelector }
