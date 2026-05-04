/**
 * ConfiguracionSprints.jsx — Administración de Sprints (Rol Admin)
 * Crear, activar, cerrar y editar sprints con sus períodos
 */
import './ConfiguracionAdmin.css'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Check, X, Edit2, ChevronDown, ChevronUp,
  RefreshCw, Calendar, AlertCircle, Power, Lock,
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
  const s=new Date(ini+'T12:00:00'), e=new Date(fin+'T12:00:00')
  return Math.max(0, Math.round((e-s)/86400000)+1)
}

const EST = {
  activo:      { bg:'rgba(16,185,129,.1)', color:'#10B981', label:'Activo'      },
  planificado: { bg:'rgba(99,102,241,.1)', color:'#6366F1', label:'Planificado' },
  cerrado:     { bg:'rgba(107,114,128,.1)',color:'#6B7280', label:'Cerrado'     },
}
function Badge({ estado }) {
  const c = EST[estado] || EST.cerrado
  return (
    <span className="ca-badge" style={{ background:c.bg, color:c.color }}>{c.label}</span>
  )
}

// ── Formulario crear/editar sprint ─────────────────────────────────────────
function FormSprint({ sprint, onGuardar, onCancelar }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    nombre:      sprint?.nombre       || '',
    fecha_inicio:sprint?.fecha_inicio || hoy,
    fecha_fin:   sprint?.fecha_fin    || '',
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const numPeriodos = form.fecha_inicio && form.fecha_fin
    ? Math.ceil(calcDias(form.fecha_inicio, form.fecha_fin) / 7)
    : 0

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    if (!form.fecha_fin)     { setErr('La fecha fin es requerida'); return }
    if (form.fecha_inicio > form.fecha_fin) { setErr('La fecha inicio debe ser antes que la fin'); return }
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
          <label className="ca-lbl">Nombre del sprint *</label>
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
          <Calendar size={14}/>
          Se generarán automáticamente <strong>{numPeriodos} período{numPeriodos!==1?'s':''} semanales</strong>
          {' '}({calcDias(form.fecha_inicio,form.fecha_fin)} días · Lun–Dom)
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

// ── Tarjeta de sprint ──────────────────────────────────────────────────────
function TarjetaSprint({ sprint, onActivar, onCerrar, onEditar, loading }) {
  const [open, setOpen] = useState(sprint.estado === 'activo')
  const dias    = calcDias(sprint.fecha_inicio, sprint.fecha_fin)
  const isActivo = sprint.estado === 'activo'

  return (
    <div className={`ca-sp-card ${isActivo ? 'activo' : ''}`}>
      <div className={`ca-sp-hdr ${isActivo ? 'activo' : ''}`}>
        <div className="ca-sp-clickable" onClick={()=>setOpen(o=>!o)}>
          <div className="ca-sp-title-row">
            <span className="ca-sp-name">{sprint.nombre}</span>
            <Badge estado={sprint.estado}/>
            <span className="ca-sp-periods">
              {sprint.num_periodos} período{sprint.num_periodos!==1?'s':''}
            </span>
          </div>
          <div className="ca-sp-dates">
            {fmtD(sprint.fecha_inicio)} → {fmtD(sprint.fecha_fin)} · {dias} días
            {sprint.creado_por_email && ` · ${sprint.creado_por_email}`}
          </div>
        </div>

        <div className="ca-sp-actions">
          {sprint.estado !== 'cerrado' && (
            <button className="ca-sp-btn-edit" title="Editar" onClick={()=>onEditar(sprint)}>
              <Edit2 size={12}/> Editar
            </button>
          )}
          {sprint.estado === 'planificado' && (
            <button className="ca-sp-btn-act" title="Activar este sprint" onClick={()=>onActivar(sprint.id_sprint)} disabled={loading}>
              <Power size={12}/> Activar
            </button>
          )}
          {sprint.estado === 'activo' && (
            <button className="ca-sp-btn-close" title="Cerrar este sprint" onClick={()=>onCerrar(sprint.id_sprint)} disabled={loading}>
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
          {!sprint.num_periodos ? (
            <div className="ca-sp-no-periods">Sin períodos configurados</div>
          ) : (
            <div className="ca-sp-weeks">
              {Array.from({ length: sprint.num_periodos }).map((_,i) => (
                <div key={i} className="ca-sp-week-chip">Semana {i+1}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ConfiguracionSprints() {
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

  useEffect(() => { load() }, [])

  const handleCrear = async (form) => {
    await api.post('/admin-global/sprints', form)
    setShowForm(false); await load()
  }
  const handleEditar = async (form) => {
    await api.put(`/admin-global/sprints/${editando.id_sprint}`, form)
    setEditando(null); await load()
  }
  const handleActivar = async (id) => {
    if (!confirm('¿Activar este sprint? El sprint activo actual se cerrará.')) return
    setActioning(true)
    try { await api.post(`/admin-global/sprints/${id}/activar`); await load() }
    catch(e) { alert(e.message) }
    finally { setActioning(false) }
  }
  const handleCerrar = async (id) => {
    if (!confirm('¿Cerrar este sprint? No se podrá reabrir.')) return
    setActioning(true)
    try { await api.post(`/admin-global/sprints/${id}/cerrar`); await load() }
    catch(e) { alert(e.message) }
    finally { setActioning(false) }
  }

  const sprintActivo = sprints.find(s=>s.estado==='activo')

  if (loading) return <PageLoader message="Cargando configuración de sprints..."/>

  return (
    <div>
      <div className="ca-tab-hdr">
        <div>
          <h2 className="ca-page-title">Configuración de Sprints</h2>
          <p className="ca-tab-sub">
            {sprints.length} sprint{sprints.length!==1?'s':''} configurados · Visibles para todas las áreas TI
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

      {showForm && !editando && (
        <FormSprint onGuardar={handleCrear} onCancelar={()=>setShowForm(false)}/>
      )}
      {editando && (
        <FormSprint sprint={editando} onGuardar={handleEditar} onCancelar={()=>setEditando(null)}/>
      )}

      {!sprints.length ? (
        <div className="ca-empty">
          <Calendar size={40} className="ca-empty-icon"/>
          <div className="ca-empty-title">No hay sprints configurados</div>
          <div className="ca-empty-hint">Usa el botón "Nuevo sprint" para comenzar</div>
        </div>
      ) : (
        <div className="ca-list-col">
          {sprints.map(s => (
            <TarjetaSprint key={s.id_sprint} sprint={s} loading={actioning}
              onActivar={handleActivar} onCerrar={handleCerrar}
              onEditar={sp=>{ setEditando(sp); setShowForm(false) }}/>
          ))}
        </div>
      )}
    </div>
  )
}
