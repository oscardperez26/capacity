'use strict'
const { query } = require('../../config/database')

function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

function calcMinEsperados(ini, fin) {
  const s = new Date(ini+'T12:00:00'), e = new Date(fin+'T12:00:00')
  let dias = 0, c = new Date(s)
  while (c <= e) { if (c.getDay()>=1&&c.getDay()<=5) dias++; c.setDate(c.getDate()+1) }
  return dias * 528
}

async function getRango(filtro, sprintId, desde, hasta) {
  const hoy = new Date(), fmt = d => d.toISOString().split('T')[0]
  if (filtro==='rango'&&desde&&hasta) return { ini:desde, fin:hasta, label:`${desde} → ${hasta}` }
  if (filtro==='dia') { const f=desde||fmt(hoy); return { ini:f, fin:f, label:f===fmt(hoy)?'Hoy':f } }
  if (filtro==='semana') {
    const dow=hoy.getDay(), diff=dow===0?-6:1-dow
    const lun=new Date(hoy); lun.setDate(hoy.getDate()+diff)
    const dom=new Date(lun); dom.setDate(lun.getDate()+6)
    return { ini:fmt(lun), fin:fmt(dom), label:'Esta semana' }
  }
  if (filtro==='mes') {
    const ini=new Date(hoy.getFullYear(),hoy.getMonth(),1)
    const fin=new Date(hoy.getFullYear(),hoy.getMonth()+1,0)
    return { ini:fmt(ini), fin:fmt(fin), label:'Este mes' }
  }
  const sid = sprintId ? parseInt(sprintId) : null
  const [sp] = await query(
    `SELECT id_sprint, nombre, fecha_inicio, fecha_fin FROM sprints
     WHERE ${sid?'id_sprint=?':"estado='activo'"} ORDER BY id_sprint DESC LIMIT 1`,
    sid?[sid]:[]
  )
  if (!sp) { const f=fmt(hoy); return { ini:f, fin:f, label:'Hoy' } }
  return { ini:fmtDate(sp.fecha_inicio), fin:fmtDate(sp.fecha_fin), label:sp.nombre }
}

// ── Dashboard del equipo del jefe ──────────────────────────────────────────
async function getEquipoDashboard(userId, filtro='sprint', sprintId=null, desde=null, hasta=null) {
  const [jefe] = await query(
    `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
            o.NOM_OFICIO AS cargo, a.NOM_AREA AS area, a.area_key
     FROM empleados e
     LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
     LEFT JOIN areas   a ON e.id_area  =a.id_area
     WHERE e.id_usuario=? AND e.activo=1`, [userId])
  if (!jefe) throw Object.assign(new Error('Jefe no encontrado'), { status:404 })

  const rango  = await getRango(filtro, sprintId, desde, hasta)
  const sprints= await query(`SELECT id_sprint AS id, nombre FROM sprints ORDER BY id_sprint DESC`)
  const [spAct]= await query(`SELECT id_sprint, nombre, fecha_inicio, fecha_fin FROM sprints WHERE estado='activo' ORDER BY id_sprint DESC LIMIT 1`)
  const minEsp = calcMinEsperados(rango.ini, rango.fin)

  // Verifica si este jefe tiene visibilidad multi-área (ej: Jefe Servicio al Usuario)
  const areasVisibilidad = await query(
    `SELECT id_area FROM jefe_areas_visibilidad WHERE id_jefe=?`, [jefe.id_empleado])

  let especialistas
  if (areasVisibilidad.length > 0) {
    // Jefe con múltiples áreas a cargo (ej: Miguel Londoño ve Soporte+Mesa+ITIL)
    // Trae a todos los especialistas de esas áreas Y a los jefes directos de esas áreas
    const areaIds   = areasVisibilidad.map(a=>a.id_area)
    const areasPh   = areaIds.map(()=>'?').join(',')
    especialistas = await query(
      `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
              o.NOM_OFICIO AS oficio, a.NOM_AREA AS area
       FROM empleados e
       LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       LEFT JOIN areas   a ON e.id_area  =a.id_area
       WHERE e.id_area IN (${areasPh})
         AND e.activo=1
         AND e.id_empleado != ?
       ORDER BY a.NOM_AREA, e.nombre`,
      [...areaIds, jefe.id_empleado])
  } else {
    // Jefe con un solo equipo directo (id_jefe = este jefe)
    especialistas = await query(
      `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
              o.NOM_OFICIO AS oficio, a.NOM_AREA AS area
       FROM empleados e
       LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       LEFT JOIN areas   a ON e.id_area  =a.id_area
       WHERE e.id_jefe=? AND e.activo=1 ORDER BY e.nombre`, [jefe.id_empleado])
  }

  const EMPTY = {
    jefe:{ nombre:jefe.nombre, cargo:jefe.cargo, area:jefe.area },
    rango, filtro, sprints,
    sprint: spAct?{id:spAct.id_sprint,nombre:spAct.nombre}:null,
    kpis:{ totalEspecialistas:0, totalMins:0, avgCapacity:0, promMinsDia:0, minEsperados:minEsp },
    especialistas:[],
    byModel:{ RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 },
    byOficio:[], heatmap:[], cargaDiaria:[], comparativa:[],
  }
  if (!especialistas.length) return EMPTY

  const empIds = especialistas.map(e=>e.id_empleado)
  const ph     = empIds.map(()=>'?').join(',')

  const registros = await query(
    `SELECT rd.id_registro, rd.id_empleado, rd.fecha, rd.estado
     FROM registro_dia rd
     WHERE rd.id_empleado IN (${ph}) AND rd.fecha BETWEEN ? AND ?`,
    [...empIds, rango.ini, rango.fin]
  )

  let actividades = []
  if (registros.length) {
    const regIds = registros.map(r=>r.id_registro)
    const phR    = regIds.map(()=>'?').join(',')
    actividades  = await query(
      `SELECT a.id_registro, a.duracion_mins, s.modelo,
              rd.id_empleado, rd.fecha AS dia_fecha
       FROM actividades a
       JOIN subcategorias_actividad s ON a.id_subcategoria=s.id_subcategoria
       JOIN registro_dia           rd ON a.id_registro    =rd.id_registro
       WHERE a.id_registro IN (${phR})`,
      regIds
    )
  }

  // ── Stats por especialista ────────────────────────────────────────────────
  const espStats = especialistas.map(esp => {
    const myActs   = actividades.filter(a=>a.id_empleado===esp.id_empleado)
    const totalMins= myActs.reduce((s,a)=>s+a.duracion_mins,0)
    const byModel  = { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 }
    for (const a of myActs) byModel[a.modelo]=(byModel[a.modelo]??0)+a.duracion_mins
    const capacity = minEsp>0 ? Math.min(Math.round(totalMins/minEsp*100),999) : 0
    // dias con registro
    const diasSet  = new Set(myActs.map(a=>fmtDate(a.dia_fecha)))
    const diasCnt  = diasSet.size||1
    return {
      id:esp.id_empleado, nombre:esp.nombre, oficio:esp.oficio, area:esp.area,
      totalMins, capacity, byModel,
      promMinsDia: Math.round(totalMins/diasCnt),
      pendientes: registros.filter(r=>r.id_empleado===esp.id_empleado&&r.estado==='enviado').length,
    }
  })

  // ── KPIs globales ─────────────────────────────────────────────────────────
  const totalMins  = espStats.reduce((s,e)=>s+e.totalMins,0)
  const avgCapacity= espStats.length ? Math.round(espStats.reduce((s,e)=>s+e.capacity,0)/espStats.length) : 0
  // días con al menos una actividad entre todos
  const diasConAct = new Set(actividades.map(a=>fmtDate(a.dia_fecha))).size || 1
  const promMinsDia= Math.round(totalMins / (diasConAct * Math.max(espStats.length,1)))

  // ── Distribución global por modelo ────────────────────────────────────────
  const byModel     = { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 }
  for (const a of actividades) byModel[a.modelo]=(byModel[a.modelo]??0)+a.duracion_mins
  const totalModel  = Object.values(byModel).reduce((s,v)=>s+v,1)

  // ── Por oficio ────────────────────────────────────────────────────────────
  const oficioMap = {}
  for (const esp of espStats) {
    const key = (esp.oficio||'Sin oficio').substring(0,40)
    if (!oficioMap[key]) oficioMap[key] = { oficio:key, totalMins:0, count:0, capacitySum:0 }
    oficioMap[key].totalMins   += esp.totalMins
    oficioMap[key].count       += 1
    oficioMap[key].capacitySum += esp.capacity
  }
  const byOficio = Object.values(oficioMap).map(o=>({
    oficio:      o.oficio,
    avgCapacity: Math.round(o.capacitySum/o.count),
    avgMins:     Math.round(o.totalMins/o.count),
    count:       o.count,
  })).sort((a,b)=>b.avgCapacity-a.avgCapacity)

  // ── Heatmap: min por día de semana (0=Lun..4=Vie) ────────────────────────
  const DAYS_LABEL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
  const heatRaw    = { 1:0,2:0,3:0,4:0,5:0,6:0,0:0 }
  const heatCount  = { 1:0,2:0,3:0,4:0,5:0,6:0,0:0 }
  for (const a of actividades) {
    const dow = new Date(fmtDate(a.dia_fecha)+'T12:00:00').getDay()
    heatRaw[dow]  = (heatRaw[dow]||0)+a.duracion_mins
    heatCount[dow]= (heatCount[dow]||0)+1
  }
  // Ordena Lun→Dom
  const heatmap = [1,2,3,4,5,6,0].map(dow=>({
    dia:   DAYS_LABEL[dow===0?6:dow-1],
    mins:  heatRaw[dow]||0,
    count: heatCount[dow]||0,
    avg:   heatCount[dow] ? Math.round(heatRaw[dow]/heatCount[dow]) : 0,
  }))

  // ── Carga diaria del equipo (suma por fecha) ──────────────────────────────
  const cargaMap = {}
  for (const a of actividades) {
    const f = fmtDate(a.dia_fecha)
    if (!cargaMap[f]) {
      const d=new Date(f+'T12:00:00')
      const DL=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
      cargaMap[f]={ fecha:f, label:`${DL[d.getDay()]} ${d.getDate()}`, mins:0, espCount:new Set() }
    }
    cargaMap[f].mins+=a.duracion_mins
    cargaMap[f].espCount.add(a.id_empleado)
  }
  const cargaDiaria = Object.values(cargaMap)
    .sort((a,b)=>a.fecha.localeCompare(b.fecha))
    .map(d=>({ ...d, avgMins:Math.round(d.mins/Math.max(d.espCount.size,1)), espCount:d.espCount.size }))

  // ── Comparativa entre especialistas (por modelo) ──────────────────────────
  const comparativa = espStats.map(e=>({
    name:  e.nombre.split(' ')[0],
    full:  e.nombre,
    pct:   e.capacity,
    mins:  e.totalMins,
    RUN:   e.byModel.RUN,
    BUILD: e.byModel.BUILD,
    ADMIN: e.byModel.ADMIN,
    GROW:  e.byModel.GROW,
    OFF:   e.byModel.OFF,
  }))

  return {
    jefe:{ nombre:jefe.nombre, cargo:jefe.cargo, area:jefe.area },
    rango, filtro, sprints,
    sprint: spAct?{id:spAct.id_sprint,nombre:spAct.nombre}:null,
    kpis:{ totalEspecialistas:especialistas.length, totalMins, avgCapacity, promMinsDia, minEsperados:minEsp },
    especialistas: espStats,
    byModel,
    byOficio,
    heatmap,
    cargaDiaria,
    comparativa,
  }
}

// ── Detalle de un especialista ─────────────────────────────────────────────
async function getEspecialistaDetalle(jefUserId, empId, filtro='sprint', sprintId=null, desde=null, hasta=null) {
  const [jefe] = await query(`SELECT e.id_empleado FROM empleados e WHERE e.id_usuario=? AND e.activo=1`, [jefUserId])
  if (!jefe) throw Object.assign(new Error('No autorizado'), { status:403 })

  const [esp] = await query(
    `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
            o.NOM_OFICIO AS oficio, a.NOM_AREA AS area
     FROM empleados e
     LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
     LEFT JOIN areas   a ON e.id_area  =a.id_area
     WHERE e.id_empleado=? AND e.id_jefe=? AND e.activo=1`,
    [empId, jefe.id_empleado])
  if (!esp) throw Object.assign(new Error('Especialista no encontrado'), { status:404 })

  const rango        = await getRango(filtro, sprintId, desde, hasta)
  const minEsperados = calcMinEsperados(rango.ini, rango.fin)

  const registros = await query(
    `SELECT rd.id_registro, rd.fecha, rd.estado FROM registro_dia rd
     WHERE rd.id_empleado=? AND rd.fecha BETWEEN ? AND ? ORDER BY rd.fecha ASC`,
    [empId, rango.ini, rango.fin])

  let actividades = []
  if (registros.length) {
    const regIds = registros.map(r=>r.id_registro)
    const ph     = regIds.map(()=>'?').join(',')
    actividades  = await query(
      `SELECT a.id_actividad, a.id_registro, a.duracion_mins, a.descripcion, a.estado,
              s.nombre AS sub_nombre, s.modelo,
              c.nombre AS cat_nombre, c.color AS cat_color,
              p.nombre AS proyecto_nombre, rd.fecha AS dia_fecha
       FROM actividades a
       JOIN subcategorias_actividad s ON a.id_subcategoria=s.id_subcategoria
       JOIN categorias_actividad    c ON s.id_categoria   =c.id_categoria
       JOIN registro_dia           rd ON a.id_registro    =rd.id_registro
       LEFT JOIN proyectos          p ON a.id_proyecto    =p.id_proyecto
       WHERE a.id_registro IN (${ph}) ORDER BY rd.fecha, a.id_actividad`,
      regIds)
  }

  const totalMins   = actividades.reduce((s,a)=>s+a.duracion_mins,0)
  const capacityPct = minEsperados>0 ? Math.min(Math.round(totalMins/minEsperados*100),999) : 0
  const byModel     = { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 }
  for (const a of actividades) byModel[a.modelo]=(byModel[a.modelo]??0)+a.duracion_mins

  const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const hxDia={}
  for (const a of actividades) {
    const f=fmtDate(a.dia_fecha)
    if (!hxDia[f]) { const d=new Date(f+'T12:00:00'); hxDia[f]={date:f,label:`${DAYS[d.getDay()]} ${d.getDate()}`,mins:0} }
    hxDia[f].mins+=a.duracion_mins
  }

  return {
    especialista:{ id:esp.id_empleado, nombre:esp.nombre, oficio:esp.oficio, area:esp.area },
    rango, filtro,
    kpis:{ capacityPct, totalMins, minEsperados, totalActividades:actividades.length,
           diasFinalizados:registros.filter(r=>['enviado','aprobado'].includes(r.estado)).length },
    byModel, registros, actividades,
    horasPorDia: Object.values(hxDia).sort((a,b)=>a.date.localeCompare(b.date)),
  }
}

module.exports = { getEquipoDashboard, getEspecialistaDetalle }
