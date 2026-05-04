/**
 * ConfiguracionAdmin.jsx — Administración del Admin
 * Sub-módulo 1: Configuración de Sprints
 * Sub-módulo 2: Creación de Proyectos (visibles en portafolio global)
 */
import './ConfiguracionAdmin.css'
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
  return (
    <span className="ca-badge" style={{ background:cfg.bg, color:cfg.color }}>
      {texto||cfg.label}
    </span>
  )
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

  return (
    <div className="ca-form-wrap">
      <div className="ca-form-title">
        {sprint ? <Edit2 size={16} style={{ color:'#6366F1' }}/> : <Plus size={16} style={{ color:'#6366F1' }}/>}
        {sprint ? 'Editar sprint' : 'Nuevo sprint'}
      </div>
      <div className="ca-form-grid-3">
        <div>
          <label className="ca-lbl">Nombre *</label>
          <input autoFocus className="ca-inp" value={form.nombre}
            onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Sprint 8 — Q2 2026"/>
        </div>
        <div>
          <label className="ca-lbl">Fecha inicio *</label>
          <input type="date" className="ca-inp" value={form.fecha_inicio}
            onChange={e=>set('fecha_inicio',e.target.value)}/>
        </div>
        <div>
          <label className="ca-lbl">Fecha fin *</label>
          <input type="date" className="ca-inp" value={form.fecha_fin}
            min={form.fecha_inicio} onChange={e=>set('fecha_fin',e.target.value)}/>
        </div>
      </div>

      {numPeriodos > 0 && (
        <div className="ca-hint">
          <Calendar size={13}/>
          Se generarán <strong>{numPeriodos} período{numPeriodos!==1?'s':''} semanales</strong>
          {' '}({calcDias(form.fecha_inicio,form.fecha_fin)} días)
        </div>
      )}
      {err && (
        <div className="ca-err">
          <AlertCircle size={13}/>{err}
        </div>
      )}

      <div className="ca-form-footer">
        <button className="ca-btn-cancel" onClick={onCancelar}>Cancelar</button>
        <button className="ca-btn-submit" onClick={submit}
          disabled={busy || !form.nombre.trim() || !form.fecha_fin}>
          <Check size={13}/>{busy ? 'Guardando...' : sprint ? 'Guardar cambios' : 'Crear sprint'}
        </button>
      </div>
    </div>
  )
}

function TarjetaSprint({ sprint, onActivar, onCerrar, onEditar, loading }) {
  const [open, setOpen] = useState(sprint.estado==='activo')
  const est  = EST_SPRINT[sprint.estado] || EST_SPRINT.cerrado
  const dias = calcDias(sprint.fecha_inicio, sprint.fecha_fin)
  const isActivo = sprint.estado === 'activo'

  return (
    <div className={`ca-sp-card ${isActivo ? 'activo' : ''}`}>
      <div className={`ca-sp-hdr ${isActivo ? 'activo' : ''}`}>
        <div className="ca-sp-clickable" onClick={()=>setOpen(o=>!o)}>
          <div className="ca-sp-title-row">
            <span className="ca-sp-name">{sprint.nombre}</span>
            <Badge cfg={est}/>
            <span className="ca-sp-periods">
              {sprint.num_periodos} período{sprint.num_periodos!==1?'s':''}
            </span>
          </div>
          <div className="ca-sp-dates">
            {fmtD(sprint.fecha_inicio)} → {fmtD(sprint.fecha_fin)} · {dias} días
          </div>
        </div>

        <div className="ca-sp-actions">
          {sprint.estado !== 'cerrado' && (
            <button className="ca-sp-btn-edit" onClick={()=>onEditar(sprint)}>
              <Edit2 size={12}/> Editar
            </button>
          )}
          {sprint.estado === 'planificado' && (
            <button className="ca-sp-btn-act" onClick={()=>onActivar(sprint.id_sprint)} disabled={loading}>
              <Power size={12}/> Activar
            </button>
          )}
          {sprint.estado === 'activo' && (
            <button className="ca-sp-btn-close" onClick={()=>onCerrar(sprint.id_sprint)} disabled={loading}>
              <Lock size={12}/> Cerrar
            </button>
          )}
        </div>

        <button className="ca-sp-toggle" onClick={()=>setOpen(o=>!o)}>
          {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>

      {open && (
        <div className="ca-sp-body">
          <div className="ca-sp-body-lbl">Períodos semanales</div>
          <div className="ca-sp-weeks">
            {Array.from({ length: sprint.num_periodos||0 }).map((_,i) => (
              <div key={i} className="ca-sp-week-chip">Semana {i+1}</div>
            ))}
            {!sprint.num_periodos && (
              <div className="ca-sp-no-periods">Sin períodos</div>
            )}
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

  const handleCrear   = async (form) => { await api.post('/admin-global/sprints',form); setShowForm(false); load() }
  const handleEditar  = async (form) => { await api.put(`/admin-global/sprints/${editando.id_sprint}`,form); setEditando(null); load() }
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
      <div className="ca-tab-hdr">
        <div>
          <h3 className="ca-tab-title">Configuración de Sprints</h3>
          <p className="ca-tab-sub">
            {sprints.length} sprint{sprints.length!==1?'s':''} · Visibles para todas las áreas TI
          </p>
        </div>
        <div className="ca-tab-actions">
          <button className="ca-refresh-btn" onClick={load}><RefreshCw size={14}/></button>
          <button className="ca-btn-new" onClick={()=>{ setShowForm(true); setEditando(null) }}>
            <Plus size={15}/> Nuevo sprint
          </button>
        </div>
      </div>

      {sprintActivo && (
        <div className="ca-active-banner">
          <div className="ca-pulse-dot"/>
          <div>
            <div className="ca-active-name">Sprint activo: {sprintActivo.nombre}</div>
            <div className="ca-active-dates">
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
          <div className="ca-empty">
            <Calendar size={40} className="ca-empty-icon"/>
            <div className="ca-empty-title">No hay sprints configurados</div>
          </div>
        ) : (
          <div className="ca-list-col">
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
  1: { color:'#3E5D9D', light:'rgba(62,93,157,.1)' },
  2: { color:'#30693B', light:'rgba(48,105,59,.1)'  },
  3: { color:'#D65830', light:'rgba(214,88,48,.1)'  },
}

function FormProyecto({ onCreado, onCancelar }) {
  const [oficinas,  setOficinas]  = useState([])
  const [empleados, setEmpleados] = useState([])
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')
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

  const G  = ({ children }) => <div className="ca-fp-grid">{children}</div>
  const F  = ({ label, children }) => <div><label className="ca-lbl">{label}</label>{children}</div>
  const F3 = ({ label, children }) => <div className="ca-fp-span2"><label className="ca-lbl">{label}</label>{children}</div>

  return (
    <div className="ca-fp-wrap">
      <div className="ca-fp-hdr">
        <div className="ca-fp-hdr-left">
          <div className="ca-fp-icon">
            <FolderPlus size={18} style={{ color:'#6366F1' }}/>
          </div>
          <div>
            <div className="ca-fp-title">Nuevo proyecto global</div>
            <div className="ca-fp-sub">Aparecerá en el Portafolio TI</div>
          </div>
        </div>
        <button className="ca-fp-close" onClick={onCancelar}><X size={14}/></button>
      </div>

      <div className="ca-fp-body">
        <G>
          <F3 label="Nombre del proyecto *">
            <input className="ca-inp" value={form.nombre} onChange={e=>set('nombre',e.target.value)}
              placeholder="Ej: Migración ERP a Cloud"/>
          </F3>
          <F label="Oficina *">
            <select className="ca-inp" value={form.id_oficina} onChange={e=>set('id_oficina',e.target.value)}>
              <option value="">Seleccionar oficina…</option>
              {oficinas.map(o=><option key={o.id_oficina} value={o.id_oficina}>{o.nombre}</option>)}
            </select>
          </F>
          <F label="Tipo de proyecto">
            <select className="ca-inp" value={form.tipo_proyecto} onChange={e=>set('tipo_proyecto',e.target.value)}>
              <option value="proyecto">Proyecto</option>
              <option value="programa">Programa</option>
              <option value="iniciativa">Iniciativa</option>
              <option value="servicio">Servicio</option>
            </select>
          </F>
          <F label="Tipo">
            <select className="ca-inp" value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
              <option value="estrategico">Estratégico</option>
              <option value="operativo">Operativo</option>
              <option value="innovacion">Innovación</option>
              <option value="continuidad_operativa">Continuidad Operativa</option>
            </select>
          </F>
          <F label="Clasificación">
            <select className="ca-inp" value={form.clasificacion} onChange={e=>set('clasificacion',e.target.value)}>
              <option value="estrategico">Estratégico</option>
              <option value="operativo">Operativo</option>
              <option value="innovacion">Innovación</option>
              <option value="continuidad_operativa">Continuidad Operativa</option>
            </select>
          </F>
          <F label="Estado">
            <select className="ca-inp" value={form.estado} onChange={e=>set('estado',e.target.value)}>
              <option value="sin_iniciar">Sin iniciar</option>
              <option value="activo">Activo</option>
              <option value="pausado">Suspendido</option>
              <option value="cerrado">Finalizado</option>
            </select>
          </F>
          <F label="Responsable">
            <select className="ca-inp" value={form.id_lider} onChange={e=>set('id_lider',e.target.value)}>
              <option value="">Sin responsable</option>
              {empleados.map(e=><option key={e.id_empleado} value={e.id_empleado}>
                {e.nombre}{e.oficio ? ` — ${e.oficio.substring(0,30)}` : ''}
              </option>)}
            </select>
          </F>
          <F label="Avance (%)">
            <div className="ca-fp-range-row">
              <input type="range" min="0" max="100" className="ca-fp-range"
                value={form.avance_pct} onChange={e=>set('avance_pct',parseInt(e.target.value))}/>
              <span className="ca-fp-pct">{form.avance_pct}%</span>
            </div>
          </F>
          <F label="Fecha inicio">
            <input type="date" className="ca-inp" value={form.fecha_inicio}
              onChange={e=>set('fecha_inicio',e.target.value)}/>
          </F>
          <F label="Fecha fin">
            <input type="date" className="ca-inp" value={form.fecha_fin}
              min={form.fecha_inicio} onChange={e=>set('fecha_fin',e.target.value)}/>
          </F>
          <F label="Costo estimado (anual)">
            <input type="number" className="ca-inp" value={form.costo_est_anual}
              onChange={e=>set('costo_est_anual',e.target.value)} placeholder="0"/>
          </F>
          <F label="Costo ejecución (anual)">
            <input type="number" className="ca-inp" value={form.costo_ejec_anual}
              onChange={e=>set('costo_ejec_anual',e.target.value)} placeholder="0"/>
          </F>
          <F3 label="Descripción">
            <textarea className="ca-inp" value={form.descripcion} rows={2}
              onChange={e=>set('descripcion',e.target.value)}
              placeholder="Descripción del proyecto…"/>
          </F3>
        </G>

        {err && (
          <div className="ca-err" style={{ marginTop:14 }}>
            <AlertCircle size={13}/> {err}
          </div>
        )}
      </div>

      <div className="ca-fp-footer">
        <button className="ca-fp-btn-cancel" onClick={onCancelar}>Cancelar</button>
        <button className="ca-fp-btn-submit" onClick={submit}
          disabled={busy || !form.nombre.trim() || !form.id_oficina}>
          <Briefcase size={14}/>{busy ? 'Creando...' : 'Crear proyecto'}
        </button>
      </div>
    </div>
  )
}

function TabProyectos() {
  const [proyectos, setProyectos] = useState([])
  const [oficinas,  setOficinas]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)

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
      <div className="ca-tab-hdr">
        <div>
          <h3 className="ca-tab-title">Gestión de Proyectos</h3>
          <p className="ca-tab-sub">
            {proyectos.length} proyecto{proyectos.length!==1?'s':''} · Los proyectos creados aquí aparecen en el Portafolio TI
          </p>
        </div>
        <button className={`ca-btn-new-toggle ${showForm ? 'active' : ''}`}
          onClick={()=>setShowForm(o=>!o)}>
          {showForm ? <><X size={14}/> Cancelar</> : <><FolderPlus size={14}/> Nuevo proyecto</>}
        </button>
      </div>

      {showForm && <FormProyecto onCreado={handleCreado} onCancelar={()=>setShowForm(false)}/>}

      {loading ? <PageLoader message="Cargando proyectos..."/> : (
        <>
          {/* Resumen por oficina */}
          <div className="ca-oficinas-grid">
            {oficinas.map(of => {
              const pal = OFICINAS_COLORES[of.id_oficina] || { color:'#888', light:'rgba(136,136,136,.1)' }
              return (
                <div key={of.id_oficina} className="ca-of-card"
                  style={{ background:pal.light, border:`1.5px solid ${pal.color}30` }}>
                  <div className="ca-of-name" style={{ color:pal.color }}>{of.nombre}</div>
                  <div className="ca-of-stats">
                    {[['activos','Activos','#10B981'],['sinIniciar','Sin iniciar','#6B7280'],
                      ['suspendidos','Susp.','#F97316'],['finalizados','Final.','#6366F1']].map(([k,l,c])=>(
                      <span key={k} className="ca-of-chip"
                        style={{ background:`${c}15`, color:c }}>
                        {of[k]} {l}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lista de proyectos */}
          <div className="ca-proj-list">
            {proyectos.map(p => {
              const col    = p.oficina_color || '#6366F1'
              const est    = EST_PROY[p.estado] || EST_PROY.sin_iniciar
              const capCol = p.avance_pct>=75 ? '#10B981' : p.avance_pct>=40 ? '#F97316' : '#6366F1'
              return (
                <div key={p.id_proyecto} className="ca-proj-row"
                  onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 2px 14px ${col}20`}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div className="ca-proj-bar" style={{ background:col }}/>
                  <div className="ca-proj-body">
                    <div className="ca-proj-name-col">
                      <div className="ca-proj-name">{p.nombre}</div>
                      <div className="ca-proj-badges">
                        <span className="ca-proj-of-chip" style={{ background:`${col}15`, color:col }}>
                          {p.oficina_nombre}
                        </span>
                        <Badge cfg={est}/>
                        {p.clasificacion && (
                          <span className="ca-proj-clasi">{p.clasificacion.replace('_',' ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="ca-proj-dates-col">
                      <div className="ca-col-lbl">Inicio → Fin</div>
                      <div className="ca-proj-dates-val">
                        {p.fecha_inicio||'—'} → {p.fecha_fin||'—'}
                      </div>
                    </div>
                    <div className="ca-proj-prog-col">
                      <div className="ca-proj-prog-hdr">
                        <span className="ca-col-lbl">Avance</span>
                        <span className="ca-proj-prog-pct" style={{ color:capCol }}>{p.avance_pct||0}%</span>
                      </div>
                      <div className="ca-proj-prog-track">
                        <div className="ca-proj-prog-fill"
                          style={{ width:`${p.avance_pct||0}%`, background:capCol }}/>
                      </div>
                    </div>
                    <div className="ca-proj-resp-col">
                      <div className="ca-col-lbl">Responsable</div>
                      <div className="ca-proj-resp-val">
                        {p.lider_nombre || <span className="ca-proj-sin-asig">Sin asignar</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {!proyectos.length && (
              <div className="ca-empty">
                <Briefcase size={40} className="ca-empty-icon"/>
                <div className="ca-empty-title">No hay proyectos registrados</div>
                <div className="ca-empty-hint">Usa el botón "Nuevo proyecto" para comenzar</div>
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
      <div className="ca-page-hdr">
        <h2 className="ca-page-title">Administración</h2>
        <p className="ca-page-sub">Gestión global del sistema · Sprints y proyectos del portafolio</p>
      </div>

      <div className="ca-tabs-strip">
        {TABS.map(t => (
          <button key={t.id} className={`ca-tab-btn ${tab===t.id ? 'active' : ''}`}
            onClick={()=>setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab==='sprints'   && <TabSprints/>}
      {tab==='proyectos' && <TabProyectos/>}
    </div>
  )
}
