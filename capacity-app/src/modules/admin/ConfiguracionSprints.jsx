/**
 * ConfiguracionSprints.jsx — Administración de Sprints (Rol Admin)
 * Crear, activar, cerrar y editar sprints con sus períodos
 */
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
  const c = EST[estado]||EST.cerrado
  return <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
    background:c.bg, color:c.color }}>{c.label}</span>
}

// ── Formulario crear/editar sprint ─────────────────────────────────────────
function FormSprint({ sprint, onGuardar, onCancelar }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    nombre:      sprint?.nombre      || '',
    fecha_inicio:sprint?.fecha_inicio|| hoy,
    fecha_fin:   sprint?.fecha_fin   || '',
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const numPeriodos = form.fecha_inicio && form.fecha_fin
    ? Math.ceil(calcDias(form.fecha_inicio, form.fecha_fin) / 7)
    : 0

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    if (!form.fecha_fin) { setErr('La fecha fin es requerida'); return }
    if (form.fecha_inicio > form.fecha_fin) { setErr('La fecha inicio debe ser antes que la fin'); return }
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
        <div>
          <label style={lbl}>Nombre del sprint *</label>
          <input autoFocus value={form.nombre} onChange={e=>set('nombre',e.target.value)}
            placeholder="Ej: Sprint 8 — Q2 2026" style={inp}/>
        </div>
        <div>
          <label style={lbl}>Fecha inicio *</label>
          <input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} style={inp}/>
        </div>
        <div>
          <label style={lbl}>Fecha fin *</label>
          <input type="date" value={form.fecha_fin} min={form.fecha_inicio}
            onChange={e=>set('fecha_fin',e.target.value)} style={inp}/>
        </div>
      </div>

      {numPeriodos > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:12,
          background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.2)',
          fontSize:12.5, color:'#6366F1', fontWeight:600, display:'flex', gap:6, alignItems:'center' }}>
          <Calendar size={14}/>
          Se generarán automáticamente <strong>{numPeriodos} período{numPeriodos!==1?'s':''} semanales</strong>
          {' '}({calcDias(form.fecha_inicio,form.fecha_fin)} días · Lun–Dom)
        </div>
      )}

      {err && (
        <div style={{ padding:'9px 14px', borderRadius:9, marginBottom:12,
          background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)',
          fontSize:12.5, color:'#EF4444', fontWeight:600, display:'flex', gap:7, alignItems:'center' }}>
          <AlertCircle size={13}/>{err}
        </div>
      )}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={onCancelar}
          style={{ padding:'8px 18px', borderRadius:10, border:'1px solid var(--c-border)',
            background:'var(--c-surface2)', fontSize:13, fontWeight:700, cursor:'pointer',
            color:'var(--t-secondary)' }}>
          Cancelar
        </button>
        <button onClick={submit} disabled={busy||!form.nombre.trim()||!form.fecha_fin}
          style={{ padding:'8px 20px', borderRadius:10, border:'none',
            background: form.nombre.trim()&&form.fecha_fin ? '#6366F1' : 'var(--c-border)',
            color:'white', fontSize:13, fontWeight:800,
            cursor: !form.nombre.trim()||!form.fecha_fin||busy ? 'not-allowed' : 'pointer',
            opacity:busy?.7:1, display:'flex', alignItems:'center', gap:6 }}>
          <Check size={13}/>{busy ? 'Guardando...' : sprint ? 'Guardar cambios' : 'Crear sprint'}
        </button>
      </div>
    </div>
  )
}

// ── Tarjeta de sprint ──────────────────────────────────────────────────────
function TarjetaSprint({ sprint, onActivar, onCerrar, onEditar, loading }) {
  const [open, setOpen] = useState(sprint.estado === 'activo')
  const est  = EST[sprint.estado]||EST.cerrado
  const dias = calcDias(sprint.fecha_inicio, sprint.fecha_fin)

  return (
    <div style={{ borderRadius:16, border:`1px solid ${sprint.estado==='activo'?'rgba(16,185,129,.3)':'var(--c-border)'}`,
      overflow:'hidden', background:'var(--c-surface)',
      boxShadow:sprint.estado==='activo'?'0 4px 16px rgba(16,185,129,.1)':'none' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px',
        background:sprint.estado==='activo'?'rgba(16,185,129,.04)':'var(--c-surface)' }}>
        <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:15, fontWeight:900 }}>{sprint.nombre}</span>
            <Badge estado={sprint.estado}/>
            <span style={{ fontSize:11, color:'var(--t-muted)' }}>
              {sprint.num_periodos} período{sprint.num_periodos!==1?'s':''}
            </span>
          </div>
          <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:4 }}>
            {fmtD(sprint.fecha_inicio)} → {fmtD(sprint.fecha_fin)} · {dias} días
            {sprint.creado_por_email && ` · ${sprint.creado_por_email}`}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {sprint.estado !== 'cerrado' && (
            <button onClick={()=>onEditar(sprint)}
              title="Editar"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)',
                fontSize:12, fontWeight:600, cursor:'pointer', color:'var(--t-secondary)' }}>
              <Edit2 size={12}/> Editar
            </button>
          )}
          {sprint.estado === 'planificado' && (
            <button onClick={()=>onActivar(sprint.id_sprint)} disabled={loading}
              title="Activar este sprint (desactivará el actual)"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, border:'none', background:'#10B981', color:'white',
                fontSize:12, fontWeight:700, cursor:'pointer', opacity:loading?.6:1 }}>
              <Power size={12}/> Activar
            </button>
          )}
          {sprint.estado === 'activo' && (
            <button onClick={()=>onCerrar(sprint.id_sprint)} disabled={loading}
              title="Cerrar este sprint"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, border:'1px solid rgba(239,68,68,.3)',
                background:'rgba(239,68,68,.07)', color:'#EF4444',
                fontSize:12, fontWeight:700, cursor:'pointer', opacity:loading?.6:1 }}>
              <Lock size={12}/> Cerrar
            </button>
          )}
        </div>
        <button onClick={()=>setOpen(o=>!o)} style={{ width:28, height:28, borderRadius:7,
          border:'none', background:'var(--c-surface2)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
        </button>
      </div>

      {/* Períodos */}
      {open && (
        <div style={{ borderTop:'1px solid var(--c-border)', padding:'12px 20px',
          background:'var(--c-surface2)' }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
            color:'var(--t-muted)', marginBottom:10 }}>Períodos semanales</div>
          {!sprint.num_periodos ? (
            <div style={{ fontSize:12.5, color:'var(--t-muted)', fontStyle:'italic' }}>
              Sin períodos configurados
            </div>
          ) : (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {Array.from({ length:sprint.num_periodos }).map((_,i) => (
                <div key={i} style={{ padding:'6px 12px', borderRadius:9,
                  background:'var(--c-surface)', border:'1px solid var(--c-border)',
                  fontSize:12, fontWeight:700, color:'var(--t-secondary)' }}>
                  Semana {i+1}
                </div>
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
  const [sprints,    setSprints]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [actioning,  setActioning]  = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [editando,   setEditando]   = useState(null) // sprint a editar

  const load = useCallback(async () => {
    setLoading(true)
    try { const r=await api.get('/admin-global/sprints'); setSprints(r.data||[]) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const handleCrear = async (form) => {
    await api.post('/admin-global/sprints', form)
    setShowForm(false)
    await load()
  }

  const handleEditar = async (form) => {
    await api.put(`/admin-global/sprints/${editando.id_sprint}`, form)
    setEditando(null)
    await load()
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
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:-.4 }}>Configuración de Sprints</h2>
          <p style={{ fontSize:13, color:'var(--t-muted)', marginTop:3 }}>
            {sprints.length} sprint{sprints.length!==1?'s':''} configurados · Visibles para todas las áreas TI
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load}
            style={{ width:34, height:34, borderRadius:8, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', color:'var(--c-accent)' }}>
            <RefreshCw size={14}/>
          </button>
          <button onClick={()=>{ setShowForm(true); setEditando(null) }}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
              borderRadius:11, border:'none', background:'#6366F1', color:'white',
              fontSize:13, fontWeight:800, cursor:'pointer',
              boxShadow:'0 4px 16px rgba(99,102,241,.35)' }}>
            <Plus size={15}/> Nuevo sprint
          </button>
        </div>
      </div>

      {/* Banner sprint activo */}
      {sprintActivo && (
        <div style={{ padding:'14px 18px', borderRadius:14, marginBottom:16,
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

      {/* Formulario crear */}
      {showForm && !editando && (
        <FormSprint onGuardar={handleCrear} onCancelar={()=>setShowForm(false)}/>
      )}

      {/* Formulario editar */}
      {editando && (
        <FormSprint sprint={editando} onGuardar={handleEditar} onCancelar={()=>setEditando(null)}/>
      )}

      {/* Lista de sprints */}
      {!sprints.length ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t-muted)' }}>
          <Calendar size={40} style={{ opacity:.2, margin:'0 auto 12px', display:'block' }}/>
          <div style={{ fontSize:14, fontWeight:600 }}>No hay sprints configurados</div>
          <div style={{ fontSize:13, marginTop:4 }}>Usa el botón "Nuevo sprint" para comenzar</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {sprints.map(s => (
            <TarjetaSprint key={s.id_sprint} sprint={s}
              loading={actioning}
              onActivar={handleActivar}
              onCerrar={handleCerrar}
              onEditar={sp=>{ setEditando(sp); setShowForm(false) }}/>
          ))}
        </div>
      )}
    </div>
  )
}
