/**
 * ConfiguracionAdmin.jsx — Administración del Admin
 * Sub-módulo 1: Configuración de Sprints
 * Sub-módulo 2: Creación de Proyectos (visibles en portafolio global)
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Check, X, Edit2, ChevronDown, ChevronUp,
  RefreshCw, Calendar, AlertCircle, Power, Lock,
  Briefcase, FolderPlus,
} from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtD(s) {
  return s ? new Date(s+'T12:00:00').toLocaleDateString('es-CO',
    { day:'2-digit', month:'short', year:'numeric' }) : '—'
}
function calcDias(ini, fin) {
  if (!ini||!fin) return 0
  return Math.max(0, Math.round((new Date(fin+'T12:00:00')-new Date(ini+'T12:00:00'))/86400000)+1)
}
const EST_SPRINT = {
  activo:      { bg:'rgba(16,185,129,.1)', color:'#10B981', label:'Activo'      },
  planificado: { bg:'rgba(99,102,241,.1)', color:'#6366F1', label:'Planificado' },
  cerrado:     { bg:'rgba(107,114,128,.1)',color:'#6B7280', label:'Cerrado'     },
}
const EST_PROY = {
  sin_iniciar: { bg:'rgba(107,114,128,.1)', color:'#6B7280', label:'Sin iniciar' },
  activo:      { bg:'rgba(16,185,129,.1)',  color:'#10B981', label:'Activo'      },
  pausado:     { bg:'rgba(249,115,22,.1)',  color:'#F97316', label:'Suspendido'  },
  cerrado:     { bg:'rgba(99,102,241,.1)',  color:'#6366F1', label:'Finalizado'  },
}
function Badge({ texto, cfg }) {
  return <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
    background:cfg.bg, color:cfg.color }}>{texto||cfg.label}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MÓDULO 1: CONFIGURACIÓN DE SPRINTS
// ─────────────────────────────────────────────────────────────────────────────

function FormSprint({ sprint, onGuardar, onCancelar }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    nombre:       sprint?.nombre       || '',
    fecha_inicio: sprint?.fecha_inicio || hoy,
    fecha_fin:    sprint?.fecha_fin    || '',
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const numPeriodos = form.fecha_inicio && form.fecha_fin
    ? Math.ceil(calcDias(form.fecha_inicio, form.fecha_fin)/7) : 0

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    if (!form.fecha_fin)     { setErr('La fecha fin es requerida'); return }
    if (form.fecha_inicio > form.fecha_fin) { setErr('Fecha inicio debe ser antes que fin'); return }
    setBusy(true); setErr('')
    try { await onGuardar(form) }
    catch(e) { setErr(e.message) }
    finally { setBusy(false) }
  }
  const inp = { padding:'9px 12px', borderRadius:10, border:'1px solid var(--c-border)',
    background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)',
    fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }
  const lbl = { fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
    color:'var(--t-muted)', display:'block', marginBottom:5 }
  return (
    <div style={{ padding:20, borderRadius:16, background:'var(--c-surface)',
      border:'2px solid rgba(99,102,241,.3)', marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
        {sprint ? <Edit2 size={16} style={{ color:'#6366F1' }}/> : <Plus size={16} style={{ color:'#6366F1' }}/>}
        {sprint ? 'Editar sprint' : 'Nuevo sprint'}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:14 }}>
        <div><label style={lbl}>Nombre *</label>
          <input autoFocus value={form.nombre} onChange={e=>set('nombre',e.target.value)}
            placeholder="Ej: Sprint 8 — Q2 2026" style={inp}/></div>
        <div><label style={lbl}>Fecha inicio *</label>
          <input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} style={inp}/></div>
        <div><label style={lbl}>Fecha fin *</label>
          <input type="date" value={form.fecha_fin} min={form.fecha_inicio}
            onChange={e=>set('fecha_fin',e.target.value)} style={inp}/></div>
      </div>
      {numPeriodos>0 && (
        <div style={{ padding:'9px 14px', borderRadius:9, marginBottom:12,
          background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.2)',
          fontSize:12.5, color:'#6366F1', fontWeight:600, display:'flex', gap:7, alignItems:'center' }}>
          <Calendar size={13}/>
          Se generarán <strong>{numPeriodos} período{numPeriodos!==1?'s':''} semanales</strong>
          {' '}({calcDias(form.fecha_inicio,form.fecha_fin)} días)
        </div>
      )}
      {err && <div style={{ padding:'9px 14px', borderRadius:9, marginBottom:12,
        background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)',
        fontSize:12.5, color:'#EF4444', fontWeight:600, display:'flex', gap:7, alignItems:'center' }}>
        <AlertCircle size={13}/>{err}</div>}
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={onCancelar}
          style={{ padding:'8px 18px', borderRadius:10, border:'1px solid var(--c-border)',
            background:'var(--c-surface2)', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-secondary)' }}>
          Cancelar</button>
        <button onClick={submit} disabled={busy||!form.nombre.trim()||!form.fecha_fin}
          style={{ padding:'8px 22px', borderRadius:10, border:'none',
            background:form.nombre.trim()&&form.fecha_fin?'#6366F1':'var(--c-border)',
            color:'white', fontSize:13, fontWeight:800,
            cursor:!form.nombre.trim()||!form.fecha_fin||busy?'not-allowed':'pointer',
            opacity:busy?.7:1, display:'flex', alignItems:'center', gap:6 }}>
          <Check size={13}/>{busy?'Guardando...':sprint?'Guardar cambios':'Crear sprint'}
        </button>
      </div>
    </div>
  )
}

function TarjetaSprint({ sprint, onActivar, onCerrar, onEditar, loading }) {
  const [open, setOpen] = useState(sprint.estado==='activo')
  const est  = EST_SPRINT[sprint.estado]||EST_SPRINT.cerrado
  const dias = calcDias(sprint.fecha_inicio, sprint.fecha_fin)
  return (
    <div style={{ borderRadius:16, border:`1px solid ${sprint.estado==='activo'?'rgba(16,185,129,.3)':'var(--c-border)'}`,
      overflow:'hidden', background:'var(--c-surface)',
      boxShadow:sprint.estado==='activo'?'0 4px 16px rgba(16,185,129,.1)':'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px',
        background:sprint.estado==='activo'?'rgba(16,185,129,.04)':'var(--c-surface)' }}>
        <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:15, fontWeight:900 }}>{sprint.nombre}</span>
            <Badge cfg={est}/>
            <span style={{ fontSize:11, color:'var(--t-muted)' }}>{sprint.num_periodos} período{sprint.num_periodos!==1?'s':''}</span>
          </div>
          <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:4 }}>
            {fmtD(sprint.fecha_inicio)} → {fmtD(sprint.fecha_fin)} · {dias} días
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {sprint.estado!=='cerrado' && (
            <button onClick={()=>onEditar(sprint)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)',
                fontSize:12, fontWeight:600, cursor:'pointer', color:'var(--t-secondary)' }}>
              <Edit2 size={12}/> Editar</button>
          )}
          {sprint.estado==='planificado' && (
            <button onClick={()=>onActivar(sprint.id_sprint)} disabled={loading}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, border:'none', background:'#10B981', color:'white',
                fontSize:12, fontWeight:700, cursor:'pointer', opacity:loading?.6:1 }}>
              <Power size={12}/> Activar</button>
          )}
          {sprint.estado==='activo' && (
            <button onClick={()=>onCerrar(sprint.id_sprint)} disabled={loading}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, border:'1px solid rgba(239,68,68,.3)',
                background:'rgba(239,68,68,.07)', color:'#EF4444',
                fontSize:12, fontWeight:700, cursor:'pointer', opacity:loading?.6:1 }}>
              <Lock size={12}/> Cerrar</button>
          )}
        </div>
        <button onClick={()=>setOpen(o=>!o)} style={{ width:28, height:28, borderRadius:7,
          border:'none', background:'var(--c-surface2)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
        </button>
      </div>
      {open && (
        <div style={{ borderTop:'1px solid var(--c-border)', padding:'12px 20px',
          background:'var(--c-surface2)' }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
            color:'var(--t-muted)', marginBottom:10 }}>Períodos semanales</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Array.from({ length:sprint.num_periodos||0 }).map((_,i)=>(
              <div key={i} style={{ padding:'6px 12px', borderRadius:9,
                background:'var(--c-surface)', border:'1px solid var(--c-border)',
                fontSize:12, fontWeight:700, color:'var(--t-secondary)' }}>
                Semana {i+1}
              </div>
            ))}
            {!sprint.num_periodos && <div style={{ fontSize:12.5, color:'var(--t-muted)', fontStyle:'italic' }}>Sin períodos</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function TabSprints() {
  const [sprints,   setSprints]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [actioning, setActioning] = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [editando,  setEditando]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r=await api.get('/admin-global/sprints'); setSprints(r.data||[]) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(()=>{ load() }, [])

  const handleCrear  = async (form) => { await api.post('/admin-global/sprints',form); setShowForm(false); load() }
  const handleEditar = async (form) => { await api.put(`/admin-global/sprints/${editando.id_sprint}`,form); setEditando(null); load() }
  const handleActivar = async (id) => {
    if (!confirm('¿Activar este sprint? El activo actual se cerrará.')) return
    setActioning(true)
    try { await api.post(`/admin-global/sprints/${id}/activar`); load() }
    catch(e) { alert(e.message) }
    finally { setActioning(false) }
  }
  const handleCerrar = async (id) => {
    if (!confirm('¿Cerrar este sprint? No se podrá reabrir.')) return
    setActioning(true)
    try { await api.post(`/admin-global/sprints/${id}/cerrar`); load() }
    catch(e) { alert(e.message) }
    finally { setActioning(false) }
  }

  const sprintActivo = sprints.find(s=>s.estado==='activo')

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:800 }}>Configuración de Sprints</h3>
          <p style={{ fontSize:12.5, color:'var(--t-muted)', marginTop:3 }}>
            {sprints.length} sprint{sprints.length!==1?'s':''} · Visibles para todas las áreas TI
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ width:34, height:34, borderRadius:8, border:'1px solid var(--c-border)',
            background:'var(--c-surface)', cursor:'pointer', display:'flex',
            alignItems:'center', justifyContent:'center', color:'var(--c-accent)' }}>
            <RefreshCw size={14}/></button>
          <button onClick={()=>{ setShowForm(true); setEditando(null) }}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
              borderRadius:11, border:'none', background:'#6366F1', color:'white',
              fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,.35)' }}>
            <Plus size={15}/> Nuevo sprint</button>
        </div>
      </div>

      {sprintActivo && (
        <div style={{ padding:'13px 18px', borderRadius:14, marginBottom:14,
          background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.25)',
          display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#10B981',
            boxShadow:'0 0 0 4px rgba(16,185,129,.2)', flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:13.5, fontWeight:800, color:'#10B981' }}>
              Sprint activo: {sprintActivo.nombre}
            </div>
            <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:2 }}>
              {fmtD(sprintActivo.fecha_inicio)} → {fmtD(sprintActivo.fecha_fin)}
              · {sprintActivo.num_periodos} período{sprintActivo.num_periodos!==1?'s':''}
            </div>
          </div>
        </div>
      )}

      {showForm && !editando && <FormSprint onGuardar={handleCrear} onCancelar={()=>setShowForm(false)}/>}
      {editando && <FormSprint sprint={editando} onGuardar={handleEditar} onCancelar={()=>setEditando(null)}/>}

      {loading ? <PageLoader message="Cargando sprints..."/> : (
        !sprints.length ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t-muted)' }}>
            <Calendar size={40} style={{ opacity:.2, margin:'0 auto 12px', display:'block' }}/>
            <div style={{ fontSize:14, fontWeight:600 }}>No hay sprints configurados</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sprints.map(s=>(
              <TarjetaSprint key={s.id_sprint} sprint={s} loading={actioning}
                onActivar={handleActivar} onCerrar={handleCerrar}
                onEditar={sp=>{ setEditando(sp); setShowForm(false) }}/>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MÓDULO 2: CREACIÓN DE PROYECTOS GLOBALES
// ─────────────────────────────────────────────────────────────────────────────
const OFICINAS_COLORES = {
  1: { color:'#3E5D9D', light:'rgba(62,93,157,.1)' },  // OPERIT
  2: { color:'#30693B', light:'rgba(48,105,59,.1)'  },  // PMO
  3: { color:'#D65830', light:'rgba(214,88,48,.1)'  },  // Proyectos TI
}

function FormProyecto({ onCreado, onCancelar }) {
  const [oficinas,    setOficinas]    = useState([])
  const [empleados,   setEmpleados]   = useState([])
  const [busy,        setBusy]        = useState(false)
  const [err,         setErr]         = useState('')
  const [form, setForm] = useState({
    nombre:'', descripcion:'', tipo:'estrategico',
    tipo_proyecto:'proyecto', clasificacion:'estrategico',
    id_oficina:'', id_lider:'', estado:'sin_iniciar', avance_pct:0,
    fecha_inicio:'', fecha_fin:'', presupuesto_est:'', costo_est_anual:'', costo_ejec_anual:'',
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  useEffect(() => {
    Promise.all([
      api.get('/admin-global/portafolio').then(r=>setOficinas(r.data?.oficinasStats||[])),
      api.get('/admin-global/empleados-ti').then(r=>setEmpleados(r.data||[])),
    ]).catch(console.error)
  }, [])

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    if (!form.id_oficina)    { setErr('Selecciona una oficina'); return }
    setBusy(true); setErr('')
    try {
      await api.post('/admin-global/portafolio', form)
      onCreado?.()
    } catch(e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const inp = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--c-border)',
    background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)',
    fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
    color:'var(--t-muted)', display:'block', marginBottom:5 }
  const sel = { ...inp, cursor:'pointer' }
  const G = ({ children }) => <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>{children}</div>
  const F = ({ label, children }) => <div><label style={lbl}>{label}</label>{children}</div>
  const F3 = ({ label, children }) => <div style={{ gridColumn:'span 2' }}><label style={lbl}>{label}</label>{children}</div>

  return (
    <div style={{ background:'var(--c-surface)', borderRadius:16,
      border:'1.5px solid rgba(99,102,241,.3)', overflow:'hidden', marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--c-border)',
        background:'rgba(99,102,241,.04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'rgba(99,102,241,.12)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FolderPlus size={18} style={{ color:'#6366F1' }}/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:900 }}>Nuevo proyecto global</div>
            <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:1 }}>
              Aparecerá en el Portafolio TI
            </div>
          </div>
        </div>
        <button onClick={onCancelar} style={{ width:30, height:30, borderRadius:8, border:'none',
          background:'var(--c-surface2)', cursor:'pointer', display:'flex',
          alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
          <X size={14}/>
        </button>
      </div>

      <div style={{ padding:'20px 22px' }}>
        <G>
          <F3 label="Nombre del proyecto *">
            <input value={form.nombre} onChange={e=>set('nombre',e.target.value)}
              placeholder="Ej: Migración ERP a Cloud" style={inp}/>
          </F3>
          <F label="Oficina *">
            <select value={form.id_oficina} onChange={e=>set('id_oficina',e.target.value)} style={sel}>
              <option value="">Seleccionar oficina…</option>
              {oficinas.map(o=><option key={o.id_oficina} value={o.id_oficina}>{o.nombre}</option>)}
            </select>
          </F>
          <F label="Tipo de proyecto">
            <select value={form.tipo_proyecto} onChange={e=>set('tipo_proyecto',e.target.value)} style={sel}>
              <option value="proyecto">Proyecto</option>
              <option value="programa">Programa</option>
              <option value="iniciativa">Iniciativa</option>
              <option value="servicio">Servicio</option>
            </select>
          </F>
          <F label="Tipo">
            <select value={form.tipo} onChange={e=>set('tipo',e.target.value)} style={sel}>
              <option value="estrategico">Estratégico</option>
              <option value="operativo">Operativo</option>
              <option value="innovacion">Innovación</option>
              <option value="continuidad_operativa">Continuidad Operativa</option>
            </select>
          </F>
          <F label="Clasificación">
            <select value={form.clasificacion} onChange={e=>set('clasificacion',e.target.value)} style={sel}>
              <option value="estrategico">Estratégico</option>
              <option value="operativo">Operativo</option>
              <option value="innovacion">Innovación</option>
              <option value="continuidad_operativa">Continuidad Operativa</option>
            </select>
          </F>
          <F label="Estado">
            <select value={form.estado} onChange={e=>set('estado',e.target.value)} style={sel}>
              <option value="sin_iniciar">Sin iniciar</option>
              <option value="activo">Activo</option>
              <option value="pausado">Suspendido</option>
              <option value="cerrado">Finalizado</option>
            </select>
          </F>
          <F label="Responsable">
            <select value={form.id_lider} onChange={e=>set('id_lider',e.target.value)} style={sel}>
              <option value="">Sin responsable</option>
              {empleados.map(e=><option key={e.id_empleado} value={e.id_empleado}>{e.nombre} {e.oficio?`— ${e.oficio.substring(0,30)}`:''}</option>)}
            </select>
          </F>
          <F label="Avance (%)">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input type="range" min="0" max="100" value={form.avance_pct}
                onChange={e=>set('avance_pct',parseInt(e.target.value))}
                style={{ flex:1, accentColor:'#6366F1' }}/>
              <span style={{ fontSize:14, fontWeight:800, color:'#6366F1',
                fontFamily:'JetBrains Mono, monospace', minWidth:38 }}>{form.avance_pct}%</span>
            </div>
          </F>
          <F label="Fecha inicio">
            <input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} style={inp}/>
          </F>
          <F label="Fecha fin">
            <input type="date" value={form.fecha_fin} min={form.fecha_inicio}
              onChange={e=>set('fecha_fin',e.target.value)} style={inp}/>
          </F>
          <F label="Costo estimado (anual)">
            <input type="number" value={form.costo_est_anual} onChange={e=>set('costo_est_anual',e.target.value)}
              placeholder="0" style={inp}/>
          </F>
          <F label="Costo ejecución (anual)">
            <input type="number" value={form.costo_ejec_anual} onChange={e=>set('costo_ejec_anual',e.target.value)}
              placeholder="0" style={inp}/>
          </F>
          <F3 label="Descripción">
            <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)}
              rows={2} placeholder="Descripción del proyecto…"
              style={{ ...inp, resize:'none' }}/>
          </F3>
        </G>

        {err && (
          <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10,
            background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)',
            fontSize:12.5, color:'#EF4444', fontWeight:600, display:'flex', gap:7, alignItems:'center' }}>
            <AlertCircle size={13}/> {err}
          </div>
        )}
      </div>

      <div style={{ padding:'14px 22px', background:'var(--c-surface2)', borderTop:'1px solid var(--c-border)',
        display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onCancelar}
          style={{ padding:'9px 20px', borderRadius:11, border:'1px solid var(--c-border)',
            background:'transparent', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-secondary)' }}>
          Cancelar</button>
        <button onClick={submit} disabled={busy||!form.nombre.trim()||!form.id_oficina}
          style={{ padding:'9px 24px', borderRadius:11, border:'none',
            background:form.nombre.trim()&&form.id_oficina?'#6366F1':'var(--c-border)',
            color:'white', fontSize:13, fontWeight:800,
            cursor:!form.nombre.trim()||!form.id_oficina||busy?'not-allowed':'pointer',
            opacity:busy?.7:1, display:'flex', alignItems:'center', gap:7 }}>
          <Briefcase size={14}/>{busy?'Creando...':'Crear proyecto'}
        </button>
      </div>
    </div>
  )
}

function TabProyectos() {
  const [proyectos,  setProyectos]  = useState([])
  const [oficinas,   setOficinas]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin-global/portafolio')
      setProyectos(r.data?.proyectos||[])
      setOficinas(r.data?.oficinasStats||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(()=>{ load() }, [])

  const handleCreado = () => { setShowForm(false); load() }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:800 }}>Gestión de Proyectos</h3>
          <p style={{ fontSize:12.5, color:'var(--t-muted)', marginTop:3 }}>
            {proyectos.length} proyecto{proyectos.length!==1?'s':''} · Los proyectos creados aquí aparecen en el Portafolio TI
          </p>
        </div>
        <button onClick={()=>setShowForm(o=>!o)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
            borderRadius:11, border:'none',
            background:showForm?'var(--c-surface2)':'#6366F1',
            color:showForm?'var(--t-secondary)':'white',
            fontSize:13, fontWeight:800, cursor:'pointer',
            boxShadow:showForm?'none':'0 4px 16px rgba(99,102,241,.35)',
            border:showForm?'1px solid var(--c-border)':'none' }}>
          {showForm ? <><X size={14}/> Cancelar</> : <><FolderPlus size={14}/> Nuevo proyecto</>}
        </button>
      </div>

      {showForm && <FormProyecto onCreado={handleCreado} onCancelar={()=>setShowForm(false)}/>}

      {loading ? <PageLoader message="Cargando proyectos..."/> : (
        <>
          {/* Resumen por oficina */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {oficinas.map(of=>{
              const pal = OFICINAS_COLORES[of.id_oficina]||{ color:'#888', light:'rgba(136,136,136,.1)' }
              return (
                <div key={of.id_oficina} style={{ padding:'14px 16px', borderRadius:13,
                  background:pal.light, border:`1.5px solid ${pal.color}30` }}>
                  <div style={{ fontSize:14, fontWeight:800, color:pal.color, marginBottom:8 }}>{of.nombre}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {[['activos','Activos','#10B981'],['sinIniciar','Sin iniciar','#6B7280'],
                      ['suspendidos','Susp.','#F97316'],['finalizados','Final.','#6366F1']].map(([k,l,c])=>(
                      <span key={k} style={{ fontSize:10.5, padding:'2px 8px', borderRadius:99,
                        background:`${c}15`, color:c, fontWeight:700 }}>
                        {of[k]} {l}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lista de proyectos */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {proyectos.map((p,i)=>{
              const col = p.oficina_color||'#6366F1'
              const est = EST_PROY[p.estado]||EST_PROY.sin_iniciar
              const capCol = p.avance_pct>=75?'#10B981':p.avance_pct>=40?'#F97316':'#6366F1'
              return (
                <div key={p.id_proyecto}
                  style={{ display:'flex', alignItems:'center', gap:0, borderRadius:12,
                    background:'var(--c-surface)', border:`1px solid var(--c-border)`,
                    overflow:'hidden', transition:'box-shadow .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 2px 14px ${col}20`}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  {/* Barra lateral color oficina */}
                  <div style={{ width:5, alignSelf:'stretch', background:col, flexShrink:0 }}/>
                  <div style={{ flex:1, display:'flex', alignItems:'center', gap:14, padding:'12px 16px', flexWrap:'wrap' }}>
                    {/* Nombre y oficina */}
                    <div style={{ flex:'1 1 200px', minWidth:0 }}>
                      <div style={{ fontSize:13.5, fontWeight:800, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:4 }}>
                        <span style={{ fontSize:10.5, padding:'1px 8px', borderRadius:99, fontWeight:700,
                          background:`${col}15`, color:col }}>{p.oficina_nombre}</span>
                        <Badge cfg={est}/>
                        {p.clasificacion&&<span style={{ fontSize:10, color:'var(--t-muted)' }}>{p.clasificacion.replace('_',' ')}</span>}
                      </div>
                    </div>
                    {/* Fechas */}
                    <div style={{ textAlign:'center', flexShrink:0 }}>
                      <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:2 }}>Inicio → Fin</div>
                      <div style={{ fontSize:11.5, fontWeight:700, color:'var(--t-secondary)', fontFamily:'JetBrains Mono, monospace' }}>
                        {p.fecha_inicio||'—'} → {p.fecha_fin||'—'}
                      </div>
                    </div>
                    {/* Avance */}
                    <div style={{ minWidth:100, flexShrink:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)' }}>Avance</span>
                        <span style={{ fontSize:12, fontWeight:900, color:capCol, fontFamily:'JetBrains Mono, monospace' }}>{p.avance_pct||0}%</span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${p.avance_pct||0}%`, background:capCol,
                          borderRadius:99, transition:'width .6s' }}/>
                      </div>
                    </div>
                    {/* Responsable */}
                    <div style={{ flexShrink:0, minWidth:140 }}>
                      <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:2 }}>Responsable</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--t-secondary)' }}>
                        {p.lider_nombre||<span style={{ fontStyle:'italic', color:'var(--t-muted)' }}>Sin asignar</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {!proyectos.length && (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t-muted)' }}>
                <Briefcase size={40} style={{ opacity:.2, margin:'0 auto 12px', display:'block' }}/>
                <div style={{ fontSize:14, fontWeight:600 }}>No hay proyectos registrados</div>
                <div style={{ fontSize:13, marginTop:4 }}>Usa el botón "Nuevo proyecto" para comenzar</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL — dos tabs
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'sprints',   label:'Configuración de Sprints', icon:<Calendar size={15}/> },
  { id:'proyectos', label:'Gestión de Proyectos',     icon:<Briefcase size={15}/> },
]

export default function ConfiguracionAdmin() {
  const [tab, setTab] = useState('sprints')
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:22 }}>
        <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:-.4 }}>Administración</h2>
        <p style={{ fontSize:13, color:'var(--t-muted)', marginTop:3 }}>
          Gestión global del sistema · Sprints y proyectos del portafolio
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24,
        background:'rgba(99,102,241,.06)', borderRadius:14, padding:5, width:'fit-content' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 22px', borderRadius:11,
              fontSize:13, fontWeight:700, cursor:'pointer', border:'none', transition:'all .15s',
              background: tab===t.id ? 'white' : 'transparent',
              color:      tab===t.id ? '#6366F1' : 'var(--t-muted)',
              boxShadow:  tab===t.id ? '0 2px 8px rgba(0,0,0,.1)' : 'none' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab==='sprints'   && <TabSprints/>}
      {tab==='proyectos' && <TabProyectos/>}
    </div>
  )
}
