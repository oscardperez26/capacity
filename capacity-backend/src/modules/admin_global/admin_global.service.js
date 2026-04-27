'use strict'
const { query }    = require('../../config/database')
// Safe import — no crash if path varies between setups
let logEvent = async () => {}
try { ({ logEvent } = require('../audit/audit.service')) } catch (_) {}

function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

function calcMinEsperados(ini, fin) {
  if (!ini || !fin) return 0
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
  // sprint
  const sid = sprintId ? parseInt(sprintId) : null
  const [sp] = await query(
    `SELECT id_sprint, nombre, fecha_inicio, fecha_fin FROM sprints
     WHERE ${sid?'id_sprint=?':"estado='activo'"} ORDER BY id_sprint DESC LIMIT 1`,
    sid?[sid]:[])
  if (!sp) { const f=fmt(hoy); return { ini:f, fin:f, label:'Hoy', sprintId:null } }
  return { ini:fmtDate(sp.fecha_inicio), fin:fmtDate(sp.fecha_fin), label:sp.nombre, sprintId:sp.id_sprint }
}

// Calcula semanas en un rango (hasta 12)
function getSemanas(ini, fin) {
  const semanas = []
  let cur = new Date(ini+'T12:00:00')
  const end = new Date(fin+'T12:00:00')
  while (cur <= end && semanas.length < 12) {
    const lun = new Date(cur)
    const dom = new Date(cur); dom.setDate(dom.getDate()+6)
    const domStr = dom > end ? fmtDate(end) : fmtDate(dom)
    semanas.push({ ini: fmtDate(lun), fin: domStr,
      label: `${lun.getDate()}/${lun.getMonth()+1}` })
    cur.setDate(cur.getDate()+7)
  }
  return semanas
}

// ── GLOBAL CAPACITY TI ─────────────────────────────────────────────────────
async function getGlobalCapacity({ filtro='sprint', sprintId=null, desde=null, hasta=null, idArea=null } = {}) {
  const rango   = await getRango(filtro, sprintId, desde, hasta)
  const sprints = await query(`SELECT id_sprint AS id, nombre FROM sprints ORDER BY id_sprint DESC`)
  const areas   = await query(
    `SELECT a.id_area, a.NOM_AREA AS nombre, a.area_key
     FROM areas a
     INNER JOIN empleados e ON e.id_area=a.id_area
     INNER JOIN centros_costo cc ON e.id_ccosto=cc.id_ccosto
     WHERE e.activo=1 AND cc.habilitado_capacity=1
     GROUP BY a.id_area, a.NOM_AREA, a.area_key
     ORDER BY a.NOM_AREA`)
  const minEsp  = calcMinEsperados(rango.ini, rango.fin)

  // Todos los empleados TI activos
  const empQuery = idArea
    ? `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
              e.id_area, a.NOM_AREA AS area_nombre, a.area_key,
              o.NOM_OFICIO AS oficio, e.id_jefe, e.id_ccosto
       FROM empleados e
       LEFT JOIN areas   a ON e.id_area=a.id_area
       LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       JOIN centros_costo cc ON e.id_ccosto=cc.id_ccosto
       WHERE e.activo=1 AND cc.habilitado_capacity=1 AND e.id_area=?
       ORDER BY e.nombre`
    : `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
              e.id_area, a.NOM_AREA AS area_nombre, a.area_key,
              o.NOM_OFICIO AS oficio, e.id_jefe, e.id_ccosto
       FROM empleados e
       LEFT JOIN areas   a ON e.id_area=a.id_area
       LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
       JOIN centros_costo cc ON e.id_ccosto=cc.id_ccosto
       WHERE e.activo=1 AND cc.habilitado_capacity=1
       ORDER BY a.NOM_AREA, e.nombre`

  const empleados = idArea ? await query(empQuery, [idArea]) : await query(empQuery)

  const EMPTY = {
    rango, filtro, sprints, areas, minEsperados: minEsp,
    kpis: { totalEsps:0, totalMins:0, avgCapacity:0, areasSObre:0, horasExtra:0, totalAreas:areas.length },
    byModel: { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 },
    modelPcts: { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 },
    areasList: [], especialistas: [],
    alertas: [], tendencia: [],
  }
  if (!empleados.length) return EMPTY

  const empIds = empleados.map(e=>e.id_empleado)
  const ph = empIds.map(()=>'?').join(',')

  // Actividades del período
  const registros = await query(
    `SELECT rd.id_registro, rd.id_empleado FROM registro_dia rd
     WHERE rd.id_empleado IN (${ph}) AND rd.fecha BETWEEN ? AND ?`,
    [...empIds, rango.ini, rango.fin])

  let actividades = []
  if (registros.length) {
    const regIds = registros.map(r=>r.id_registro)
    const phR = regIds.map(()=>'?').join(',')
    actividades = await query(
      `SELECT a.id_registro, a.duracion_mins, s.modelo, rd.id_empleado, rd.fecha
       FROM actividades a
       JOIN subcategorias_actividad s ON a.id_subcategoria=s.id_subcategoria
       JOIN registro_dia rd ON a.id_registro=rd.id_registro
       WHERE a.id_registro IN (${phR})`, regIds)
  }

  // Stats por empleado
  const espStats = empleados.map(emp => {
    const myActs    = actividades.filter(a=>a.id_empleado===emp.id_empleado)
    const totalMins = myActs.reduce((s,a)=>s+a.duracion_mins,0)
    const byModel   = { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 }
    for (const a of myActs) byModel[a.modelo]=(byModel[a.modelo]||0)+a.duracion_mins
    const capacity  = minEsp>0 ? Math.min(Math.round(totalMins/minEsp*100),999) : 0
    // Porcentaje de cada modelo sobre el total de ese empleado
    const modelPcts = {}
    const tot = totalMins || 1
    for (const m of Object.keys(byModel)) modelPcts[m] = Math.round(byModel[m]/tot*100)
    return { ...emp, totalMins, capacity, byModel, modelPcts }
  })

  // Distribución global por modelo
  const byModel = { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 }
  for (const a of actividades) byModel[a.modelo]=(byModel[a.modelo]||0)+a.duracion_mins
  const totalMinsGlobal = Object.values(byModel).reduce((s,v)=>s+v,1)
  const modelPcts = {}
  for (const m of Object.keys(byModel)) modelPcts[m] = Math.round(byModel[m]/totalMinsGlobal*100)

  // Agrupa por área
  const areaMap = {}
  for (const esp of espStats) {
    const key = esp.id_area || 0
    if (!areaMap[key]) {
      areaMap[key] = { id:key, nombre:esp.area_nombre||'Sin área', area_key:esp.area_key,
        especialistas:[], totalMins:0, capacitySum:0,
        byModel:{ RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 } }
    }
    areaMap[key].especialistas.push(esp)
    areaMap[key].totalMins   += esp.totalMins
    areaMap[key].capacitySum += esp.capacity
    for (const [m,v] of Object.entries(esp.byModel)) areaMap[key].byModel[m]+=v
  }
  const areasList = Object.values(areaMap).map(a => {
    const tot = Object.values(a.byModel).reduce((s,v)=>s+v,1)
    const aModelPcts = {}
    for (const m of Object.keys(a.byModel)) aModelPcts[m] = Math.round(a.byModel[m]/tot*100)
    return {
      ...a, count: a.especialistas.length,
      avgCapacity: a.especialistas.length ? Math.round(a.capacitySum/a.especialistas.length) : 0,
      sobrecargada: a.especialistas.length ? Math.round(a.capacitySum/a.especialistas.length)>100 : false,
      modelPcts: aModelPcts,
    }
  }).sort((a,b)=>b.avgCapacity-a.avgCapacity)

  // KPIs
  const totalMins   = espStats.reduce((s,e)=>s+e.totalMins,0)
  const avgCapacity = espStats.length ? Math.round(espStats.reduce((s,e)=>s+e.capacity,0)/espStats.length) : 0
  const areasSObre  = areasList.filter(a=>a.sobrecargada).length
  const horasExtra  = espStats.filter(e=>e.capacity>100).reduce((s,e)=>s+Math.max(0,e.totalMins-minEsp),0)

  // ── ALERTAS ──────────────────────────────────────────────────────────────
  const alertas = []
  // Overload: run + admin > 80%
  const overloaded = espStats.filter(e => (e.modelPcts.RUN||0)+(e.modelPcts.ADMIN||0) > 80)
  if (overloaded.length) alertas.push({
    nivel:'rojo', emoji:'🔴',
    msg: `${overloaded.length} empleado${overloaded.length>1?'s':''} con overload (RUN+ADMIN >80%)`,
    nombres: overloaded.map(e=>e.nombre.split(' ')[0]).slice(0,3),
  })
  // Grow bajo
  if (modelPcts.GROW < 10) alertas.push({
    nivel:'naranja', emoji:'🟠',
    msg: `GROW en ${modelPcts.GROW}% — por debajo del mínimo recomendado (10%)`,
    nombres:[],
  })
  // Sin tiempo off
  const sinOff = espStats.filter(e=>(e.modelPcts.OFF||0) < 5 && e.totalMins > 0)
  if (sinOff.length) alertas.push({
    nivel:'amarillo', emoji:'🟡',
    msg: `${sinOff.length} persona${sinOff.length>1?'s':''} con muy poco tiempo OFF (<5%)`,
    nombres: sinOff.map(e=>e.nombre.split(' ')[0]).slice(0,3),
  })

  // ── TENDENCIA SEMANAL ─────────────────────────────────────────────────────
  // Tomamos las últimas 6 semanas previas al rango (para la línea de tiempo)
  const hoyStr = new Date().toISOString().split('T')[0]
  const tendSemanas = []
  let cursorT = new Date(rango.ini+'T12:00:00')
  for (let i=0; i<6 && fmtDate(cursorT)<=hoyStr; i++) {
    const iniS = fmtDate(cursorT)
    const finD = new Date(cursorT); finD.setDate(finD.getDate()+6)
    const finS = fmtDate(finD) > hoyStr ? hoyStr : fmtDate(finD)
    tendSemanas.push({ ini:iniS, fin:finS, label:`${cursorT.getDate()}/${cursorT.getMonth()+1}` })
    cursorT.setDate(cursorT.getDate()+7)
  }

  const tendencia = []
  for (const sem of tendSemanas) {
    const actsT = await query(
      `SELECT a.duracion_mins, s.modelo FROM actividades a
       JOIN subcategorias_actividad s ON a.id_subcategoria=s.id_subcategoria
       JOIN registro_dia rd ON a.id_registro=rd.id_registro
       WHERE rd.id_empleado IN (${ph}) AND rd.fecha BETWEEN ? AND ?`,
      [...empIds, sem.ini, sem.fin])
    const totT = actsT.reduce((s,a)=>s+a.duracion_mins,0) || 1
    const byM  = { RUN:0,BUILD:0,ADMIN:0,GROW:0,OFF:0 }
    for (const a of actsT) byM[a.modelo]=(byM[a.modelo]||0)+a.duracion_mins
    const pcts = {}
    for (const m of Object.keys(byM)) pcts[m] = Math.round(byM[m]/totT*100)
    tendencia.push({ semana:sem.label, ...pcts })
  }

  return {
    rango, filtro, sprints, areas, minEsperados:minEsp,
    kpis:{ totalEsps:espStats.length, totalMins, avgCapacity, areasSObre, horasExtra, totalAreas:areasList.length },
    byModel, modelPcts,
    areasList, especialistas:espStats,
    alertas, tendencia,
  }
}

// ── PORTAFOLIO TI ──────────────────────────────────────────────────────────
async function getPortafolio() {
  const proyectos = await query(
    `SELECT p.id_proyecto, p.id_oficina, p.id_programa, p.nombre,
            p.descripcion, p.tipo, p.tipo_proyecto, p.clasificacion,
            p.estado, p.avance_pct, p.estado_detalle,
            p.presupuesto_est, p.costo_est_anual, p.costo_ejec_anual,
            p.fecha_inicio, p.fecha_fin, p.fecha_fin_real,
            o.nombre AS oficina_nombre, o.color AS oficina_color,
            CONCAT(l.nombre,' ',l.apellido) AS lider_nombre,
            a.NOM_AREA AS area_nombre,
            pg.nombre AS programa_nombre
     FROM proyectos p
     LEFT JOIN oficinas_proyecto o  ON p.id_oficina=o.id_oficina
     LEFT JOIN empleados          l  ON p.id_lider  =l.id_empleado
     LEFT JOIN areas              a  ON p.id_area   =a.id_area
     LEFT JOIN programas_proyecto pg ON p.id_programa=pg.id_programa
     WHERE p.alcance_visibilidad != 'equipo'
     ORDER BY o.id_oficina, p.estado, p.nombre`)

  const oficinas = await query(
    'SELECT id_oficina, nombre, descripcion, color FROM oficinas_proyecto WHERE activo=1 ORDER BY id_oficina')

  const total       = proyectos.length
  const enEjecucion = proyectos.filter(p=>p.estado==='activo').length
  const sinIniciar  = proyectos.filter(p=>p.estado==='sin_iniciar').length
  const suspendidos = proyectos.filter(p=>p.estado==='pausado').length
  const finalizados = proyectos.filter(p=>p.estado==='cerrado').length
  const conCostoEst  = proyectos.filter(p=>p.costo_est_anual>0)
  const conCostoEjec = proyectos.filter(p=>p.costo_ejec_anual>0)
  const avgCostoEst  = conCostoEst.length ? Math.round(conCostoEst.reduce((s,p)=>s+(Number(p.costo_est_anual)||0),0)/conCostoEst.length) : 0
  const avgCostoEjec = conCostoEjec.length ? Math.round(conCostoEjec.reduce((s,p)=>s+(Number(p.costo_ejec_anual)||0),0)/conCostoEjec.length) : 0

  const oficinasStats = oficinas.map(of => {
    const proys = proyectos.filter(p=>p.id_oficina===of.id_oficina)
    const ce = proys.filter(p=>p.costo_est_anual>0)
    const cx = proys.filter(p=>p.costo_ejec_anual>0)
    return { ...of, total:proys.length, activos:proys.filter(p=>p.estado==='activo').length,
      sinIniciar:proys.filter(p=>p.estado==='sin_iniciar').length,
      suspendidos:proys.filter(p=>p.estado==='pausado').length,
      finalizados:proys.filter(p=>p.estado==='cerrado').length,
      avgCostoEst:  ce.length ? Math.round(ce.reduce((s,p)=>s+(Number(p.costo_est_anual)||0),0)/ce.length) : 0,
      avgCostoEjec: cx.length ? Math.round(cx.reduce((s,p)=>s+(Number(p.costo_ejec_anual)||0),0)/cx.length) : 0,
    }
  })

  return {
    kpis:{ total, enEjecucion, sinIniciar, suspendidos, finalizados, avgCostoEst, avgCostoEjec },
    oficinasStats,
    proyectos: proyectos.map(p=>({
      ...p,
      fecha_inicio:   fmtDate(p.fecha_inicio),
      fecha_fin:      fmtDate(p.fecha_fin),
      fecha_fin_real: fmtDate(p.fecha_fin_real),
      costo_est_anual:  Number(p.costo_est_anual)||0,
      costo_ejec_anual: Number(p.costo_ejec_anual)||0,
      presupuesto_est:  Number(p.presupuesto_est)||0,
    })),
  }
}

async function updateProyecto(idProyecto, data, userId=null) {
  const {
    nombre, descripcion, tipo, tipo_proyecto, clasificacion,
    fecha_inicio, fecha_fin, estado, avance_pct,
    costo_est_anual, costo_ejec_anual, presupuesto_est, id_lider,
  } = data

  // Construye solo los campos enviados
  const sets = [], vals = []
  if (nombre       !== undefined) { sets.push('nombre=?');           vals.push(nombre||null)       }
  if (descripcion  !== undefined) { sets.push('descripcion=?');      vals.push(descripcion||null)   }
  if (tipo         !== undefined) { sets.push('tipo=?');             vals.push(tipo||null)          }
  if (tipo_proyecto!== undefined) { sets.push('tipo_proyecto=?');    vals.push(tipo_proyecto||null) }
  if (clasificacion!== undefined) { sets.push('clasificacion=?');    vals.push(clasificacion||null) }
  if (fecha_inicio !== undefined) { sets.push('fecha_inicio=?');     vals.push(fecha_inicio||null)  }
  if (fecha_fin    !== undefined) { sets.push('fecha_fin=?');        vals.push(fecha_fin||null)     }
  if (estado       !== undefined) { sets.push('estado=?');           vals.push(estado||null)        }
  if (avance_pct   !== undefined) { sets.push('avance_pct=?');       vals.push(avance_pct??0)       }
  if (costo_est_anual  !== undefined) { sets.push('costo_est_anual=?');  vals.push(costo_est_anual??null)  }
  if (costo_ejec_anual !== undefined) { sets.push('costo_ejec_anual=?'); vals.push(costo_ejec_anual??null) }
  if (presupuesto_est  !== undefined) { sets.push('presupuesto_est=?');  vals.push(presupuesto_est??null)  }
  if (id_lider     !== undefined) { sets.push('id_lider=?');         vals.push(id_lider||null)      }

  if (!sets.length) return null
  sets.push('actualizado_en=NOW()')
  vals.push(idProyecto)

  await query(`UPDATE proyectos SET ${sets.join(',')} WHERE id_proyecto=?`, vals)

  // Registro en auditoría
  const cambios = Object.keys(data).filter(k=>data[k]!==undefined).join(', ')
  await logEvent({
    userId,
    action: `Proyecto actualizado — campos: ${cambios}`,
    entityType: 'proyectos',
    entityId: idProyecto,
  })

  const [updated] = await query(
    `SELECT p.*, CONCAT(l.nombre,' ',l.apellido) AS lider_nombre,
            o.nombre AS oficina_nombre, o.color AS oficina_color
     FROM proyectos p
     LEFT JOIN empleados l ON p.id_lider=l.id_empleado
     LEFT JOIN oficinas_proyecto o ON p.id_oficina=o.id_oficina
     WHERE p.id_proyecto=?`, [idProyecto])
  return {
    ...updated,
    fecha_inicio:   fmtDate(updated.fecha_inicio),
    fecha_fin:      fmtDate(updated.fecha_fin),
    costo_est_anual:  Number(updated.costo_est_anual)||0,
    costo_ejec_anual: Number(updated.costo_ejec_anual)||0,
  }
}

// ── SPRINTS ADMIN ──────────────────────────────────────────────────────────
async function getSprints() {
  const sprints = await query(
    `SELECT s.id_sprint, s.nombre, s.fecha_inicio, s.fecha_fin, s.estado, s.creado_en,
            u.correo AS creado_por_email,
            (SELECT COUNT(*) FROM periodos p WHERE p.id_sprint=s.id_sprint) AS num_periodos
     FROM sprints s LEFT JOIN usuarios u ON s.creado_por=u.id_usuario
     ORDER BY s.id_sprint DESC`)
  return sprints.map(s=>({ ...s, fecha_inicio:fmtDate(s.fecha_inicio),
    fecha_fin:fmtDate(s.fecha_fin), creado_en:fmtDate(s.creado_en) }))
}

async function crearSprint(userId, { nombre, fecha_inicio, fecha_fin }) {
  if (!nombre?.trim()) throw Object.assign(new Error('El nombre es requerido'), { status:400 })
  if (!fecha_inicio || !fecha_fin) throw Object.assign(new Error('Las fechas son requeridas'), { status:400 })
  if (fecha_inicio > fecha_fin) throw Object.assign(new Error('Fecha inicio debe ser antes que la fin'), { status:400 })
  const result = await query(
    `INSERT INTO sprints (nombre, fecha_inicio, fecha_fin, estado, creado_por) VALUES (?,?,?,'planificado',?)`,
    [nombre.trim(), fecha_inicio, fecha_fin, userId])
  await generarPeriodos(result.insertId, fecha_inicio, fecha_fin)
  const [sprint] = await query(
    `SELECT s.*, (SELECT COUNT(*) FROM periodos p WHERE p.id_sprint=s.id_sprint) AS num_periodos
     FROM sprints s WHERE s.id_sprint=?`, [result.insertId])
  return { ...sprint, fecha_inicio:fmtDate(sprint.fecha_inicio), fecha_fin:fmtDate(sprint.fecha_fin) }
}

async function generarPeriodos(sprintId, startDate, endDate) {
  const start = new Date(startDate+'T12:00:00'), end = new Date(endDate+'T12:00:00')
  let cursor = new Date(start)
  const dow = cursor.getDay()
  if (dow !== 1) { const diff=dow===0?1:8-dow; cursor.setDate(cursor.getDate()+diff) }
  let semana = 1
  while (cursor <= end) {
    const lunStr = cursor.toISOString().split('T')[0]
    const dom = new Date(cursor); dom.setDate(dom.getDate()+6)
    const domStr = (dom > end ? end : dom).toISOString().split('T')[0]
    await query(`INSERT INTO periodos (id_sprint,fecha_inicio,fecha_fin,numero_semana,estado) VALUES (?,?,?,?,'abierto')`,
      [sprintId, lunStr, domStr, semana])
    cursor.setDate(cursor.getDate()+7); semana++
  }
}

async function activarSprint(sprintId) {
  const [sp] = await query('SELECT id_sprint,estado FROM sprints WHERE id_sprint=?', [sprintId])
  if (!sp) throw Object.assign(new Error('Sprint no encontrado'), { status:404 })
  if (sp.estado==='activo') throw Object.assign(new Error('Ya está activo'), { status:400 })
  await query(`UPDATE sprints SET estado='cerrado' WHERE estado='activo'`)
  await query(`UPDATE sprints SET estado='activo' WHERE id_sprint=?`, [sprintId])
  return { ok:true }
}

async function cerrarSprint(sprintId) {
  const [sp] = await query('SELECT id_sprint,estado FROM sprints WHERE id_sprint=?', [sprintId])
  if (!sp) throw Object.assign(new Error('Sprint no encontrado'), { status:404 })
  if (sp.estado==='cerrado') throw Object.assign(new Error('Ya está cerrado'), { status:400 })
  await query(`UPDATE sprints SET estado='cerrado', cerrado_en=NOW() WHERE id_sprint=?`, [sprintId])
  await query(`UPDATE periodos SET estado='cerrado' WHERE id_sprint=? AND estado='abierto'`, [sprintId])
  return { ok:true }
}

async function editarSprint(sprintId, { nombre, fecha_inicio, fecha_fin }) {
  const [sp] = await query('SELECT id_sprint,estado FROM sprints WHERE id_sprint=?', [sprintId])
  if (!sp) throw Object.assign(new Error('Sprint no encontrado'), { status:404 })
  if (sp.estado==='cerrado') throw Object.assign(new Error('No se puede editar un sprint cerrado'), { status:400 })
  await query(`UPDATE sprints SET nombre=?,fecha_inicio=?,fecha_fin=?,actualizado_en=NOW() WHERE id_sprint=?`,
    [nombre, fecha_inicio, fecha_fin, sprintId])
  await query('DELETE FROM periodos WHERE id_sprint=?', [sprintId])
  await generarPeriodos(sprintId, fecha_inicio, fecha_fin)
  const [updated] = await query('SELECT * FROM sprints WHERE id_sprint=?', [sprintId])
  return { ...updated, fecha_inicio:fmtDate(updated.fecha_inicio), fecha_fin:fmtDate(updated.fecha_fin) }
}


// ── CREAR PROYECTO (visible en portafolio global) ─────────────────────────
async function crearProyecto(data) {
  const {
    nombre, descripcion, tipo, tipo_proyecto, clasificacion,
    id_oficina, id_lider, estado, avance_pct,
    fecha_inicio, fecha_fin, presupuesto_est, costo_est_anual, costo_ejec_anual,
  } = data
  if (!nombre?.trim()) throw Object.assign(new Error('El nombre es requerido'), { status:400 })
  if (!id_oficina)     throw Object.assign(new Error('La oficina es requerida'), { status:400 })

  const result = await query(
    `INSERT INTO proyectos
     (nombre, descripcion, tipo, tipo_proyecto, clasificacion,
      id_oficina, id_lider, alcance_visibilidad, estado, avance_pct,
      fecha_inicio, fecha_fin, presupuesto_est, costo_est_anual, costo_ejec_anual)
     VALUES (?,?,?,?,?,?,?,'global',?,?,?,?,?,?,?)`,
    [nombre.trim(), descripcion||null, tipo||'estrategico',
     tipo_proyecto||'proyecto', clasificacion||'estrategico',
     id_oficina, id_lider||null, estado||'sin_iniciar', avance_pct||0,
     fecha_inicio||null, fecha_fin||null,
     presupuesto_est||null, costo_est_anual||null, costo_ejec_anual||null])

  const [p] = await query('SELECT * FROM proyectos WHERE id_proyecto=?', [result.insertId])
  return { ...p, fecha_inicio:fmtDate(p.fecha_inicio), fecha_fin:fmtDate(p.fecha_fin) }
}

// ── EMPLEADOS para dropdown de responsable ────────────────────────────────
async function getEmpleadosTI() {
  return query(
    `SELECT e.id_empleado, CONCAT(e.nombre,' ',e.apellido) AS nombre,
            o.NOM_OFICIO AS oficio
     FROM empleados e
     LEFT JOIN oficios o ON e.id_oficio=o.id_oficio
     JOIN centros_costo cc ON e.id_ccosto=cc.id_ccosto
     WHERE e.activo=1 AND cc.habilitado_capacity=1
     ORDER BY e.nombre`)
}

// ── ACTUALIZAR RESPONSABLE (id_lider) ────────────────────────────────────
async function updateProyectoLider(idProyecto, idLider) {
  await query(`UPDATE proyectos SET id_lider=?, actualizado_en=NOW() WHERE id_proyecto=?`,
    [idLider||null, idProyecto])
  return { ok:true }
}

module.exports = {
  getGlobalCapacity,
  getPortafolio, updateProyecto, crearProyecto, getEmpleadosTI, updateProyectoLider,
  getSprints, crearSprint, activarSprint, cerrarSprint, editarSprint,
}
