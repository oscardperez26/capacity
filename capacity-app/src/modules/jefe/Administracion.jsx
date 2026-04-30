/**
 * Administracion.jsx — v2
 * Tab Períodos: todos los sprints con todos sus días (habiles), con o sin registro previo
 * Tab Proyectos: oficinas con ficha completa por proyecto + crear + asignar
 * Tab Asignaciones: vista consolidada por especialista
 */
import './Administracion.css'
import { useState, useEffect, useCallback } from 'react'
import {
  Unlock, Lock, Briefcase, Plus, UserPlus, X, Check,
  RefreshCw, ChevronDown, ChevronUp, Folder, Calendar,
  AlertCircle, Clock, TrendingUp, DollarSign, User,
  Star, Trash2, ClipboardList, AlertTriangle, Edit3,
} from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

// ── Helpers ────────────────────────────────────────────────────────────────
const EST_COLOR = {
  borrador:'#D65830', enviado:'#3E5D9D', aprobado:'#30693B',
  rechazado:'#992C26', sin_registro:'#aaa', sin_iniciar:'#888',
  activo:'#30693B', pausado:'#D65830', cerrado:'#888',
}
const EST_LABEL = {
  borrador:'Borrador', enviado:'Enviado', aprobado:'Aprobado',
  rechazado:'Rechazado', sin_registro:'Sin registro', sin_iniciar:'Sin iniciar',
  activo:'Activo', pausado:'Pausado', cerrado:'Cerrado',
}
const OFC_COLORS = ['#3E5D9D', '#30693B', '#D65830']
function Chip({ estado, small }) {
  const col = EST_COLOR[estado] || '#888'
  return <span style={{
    padding: small ? '1px 6px' : '2px 8px',
    borderRadius: 99, fontSize: small ? 9.5 : 10.5, fontWeight: 700,
    background: `${col}15`, color: col,
  }}>{EST_LABEL[estado] || estado}</span>
}
function fmtUSD(n) { return n ? `$${Number(n).toLocaleString('en-US')}` : '—' }
function fmtDate(s) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

// ── Tabs ───────────────────────────────────────────────────────────────────
function Tabs({ active, onChange }) {
  const tabs = [
    { k: 'sprints',      label: 'Sprints',      icon: <Clock size={14} /> },
    { k: 'periodos',     label: 'Períodos',     icon: <Calendar size={14} /> },
    { k: 'proyectos',    label: 'Proyectos',    icon: <Briefcase size={14} /> },
    { k: 'asignaciones', label: 'Asignaciones', icon: <UserPlus size={14} /> },
  ]
  return (
    <div className="adm-tabs">
      {tabs.map(t => (
        <button key={t.k} onClick={() => onChange(t.k)}
          className={`adm-tab ${active === t.k ? 'adm-tab--on' : 'adm-tab--off'}`}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — PERÍODOS
// ════════════════════════════════════════════════════════════════════════════
// ── TabSprints ────────────────────────────────────────────────────────────
function TabSprints() {
  const [sprints,   setSprints]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null) // 'crear' | {sprint}
  const [form,      setForm]      = useState({ nombre:'', fecha_inicio:'', fecha_fin:'' })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/sprints')
      setSprints(res.data ?? [])
    } catch { setSprints([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const abrirCrear = () => {
    setForm({ nombre:'', fecha_inicio:'', fecha_fin:'' })
    setError('')
    setModal('crear')
  }

  const guardar = async () => {
    if (!form.nombre.trim() || !form.fecha_inicio || !form.fecha_fin) {
      setError('Completa todos los campos'); return
    }
    if (form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin debe ser posterior al inicio'); return
    }
    setSaving(true); setError('')
    try {
      await api.post('/sprints', form)
      setModal(null)
      load()
    } catch (e) { setError(e.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/sprints/${id}/estado`, { estado })
      load()
    } catch (e) { alert(e.data?.error || 'Error') }
  }

  const ESTADO_CFG = {
    activo:      { label:'Activo',       bg:'rgba(48,105,59,.10)',  color:'#30693B', border:'rgba(48,105,59,.25)' },
    cerrado:     { label:'Cerrado',      bg:'rgba(153,44,38,.08)', color:'#992C26', border:'rgba(153,44,38,.20)' },
    planificado: { label:'Planificado',  bg:'rgba(99,102,241,.10)', color:'#6366F1', border:'rgba(99,102,241,.25)' },
    draft:       { label:'Planificado',  bg:'rgba(99,102,241,.10)', color:'#6366F1', border:'rgba(99,102,241,.25)' },
  }

  if (loading) return <PageLoader message="Cargando sprints..." />

  return (
    <div>
      <div className="adm-sec-hdr">
        <div>
          <div className="adm-sec-title">Configuración de Sprints</div>
          <div className="adm-sec-sub">Los sprints definen los períodos de registro de actividades para todo el equipo</div>
        </div>
        <button onClick={abrirCrear} className="adm-new-btn"><Plus size={14}/> Nuevo Sprint</button>
      </div>

      {/* Lista de sprints */}
      {!sprints.length
        ? <div className="adm-empty">No hay sprints configurados. Crea el primero.</div>
        : <div className="adm-sprint-list">
            {sprints.map(sp => {
              const cfg = ESTADO_CFG[sp.estado] ?? ESTADO_CFG.draft
              const fmt = v => v ? String(v).split('T')[0] : '—'
              return (
                <div key={sp.id_sprint} className="adm-sprint-card">
                  <div className="adm-sprint-num">{sp.id_sprint}</div>
                  <div className="adm-sprint-info">
                    <div className="adm-sprint-name">{sp.nombre}</div>
                    <div className="adm-sprint-dates">{fmt(sp.fecha_inicio)} → {fmt(sp.fecha_fin)}</div>
                  </div>
                  <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                    background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, flexShrink:0 }}>
                    {cfg.label}
                  </span>
                  <div className="adm-sprint-btns">
                    {sp.estado !== 'activo' && (
                      <button onClick={() => cambiarEstado(sp.id_sprint, 'activo')}
                        className="adm-sprint-activate">Activar</button>
                    )}
                    {sp.estado === 'activo' && (
                      <button onClick={() => cambiarEstado(sp.id_sprint, 'cerrado')}
                        className="adm-sprint-close">Cerrar</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
      }

      {/* Modal crear sprint */}
      {modal === 'crear' && (
        <div className="adm-modal-ov" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e=>e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">Nuevo Sprint</div>
              <button onClick={()=>setModal(null)} className="adm-modal-close"><X size={18}/></button>
            </div>
            <div className="adm-modal-form">
              <div>
                <label className="adm-form-lbl">Nombre del sprint *</label>
                <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
                  placeholder="Ej: Sprint 1 — Q1 2026" className="adm-form-inp"/>
              </div>
              <div className="adm-modal-2col">
                <div>
                  <label className="adm-form-lbl">Fecha inicio *</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e=>setForm(p=>({...p,fecha_inicio:e.target.value}))}
                    className="adm-form-inp"/>
                </div>
                <div>
                  <label className="adm-form-lbl">Fecha fin *</label>
                  <input type="date" value={form.fecha_fin} min={form.fecha_inicio}
                    onChange={e=>setForm(p=>({...p,fecha_fin:e.target.value}))}
                    className="adm-form-inp"/>
                </div>
              </div>
              {error && <div className="adm-form-err">{error}</div>}
              <button onClick={guardar} disabled={saving} className="adm-form-submit"
                style={{cursor:saving?'not-allowed':'pointer',opacity:saving?.7:1}}>
                {saving ? 'Guardando...' : 'Crear Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabPeriodos() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState({})
  const [openEsp, setOpenEsp] = useState({})
  const [openSp,  setOpenSp]  = useState({}) // `espId-sprintId`
  const [openSem, setOpenSem] = useState({}) // `espId-periodoId`
  const [feedback,setFeedback]= useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/admin-jefe/periodos/equipo'); setData(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [])

  const doAction = async (key, fn) => {
    setBusy(p => ({ ...p, [key]: true }))
    try {
      const r = await fn()
      setFeedback(p => ({ ...p, [key]: r?.accion || 'ok' }))
      setTimeout(() => setFeedback(p => { const n = { ...p }; delete n[key]; return n }), 3000)
      await load()
    } catch (e) { alert(e.message) }
    finally { setBusy(p => ({ ...p, [key]: false })) }
  }

  if (loading || !data) return <PageLoader message="Cargando períodos..." />

  return (
    <div>
      <div className="adm-per-hdr">
        <h3 className="adm-per-title">Habilitar períodos de edición</h3>
        <p className="adm-per-sub">
          Permite que un especialista ingrese o edite actividades en cualquier día, aunque no haya
          registrado anteriormente o el período esté cerrado.
        </p>
      </div>

      {data.especialistas.map(esp => (
        <div key={esp.id} className="adm-esp-card">
          <button onClick={() => setOpenEsp(p => ({ ...p, [esp.id]: !p[esp.id] }))}
            className="adm-esp-btn"
            style={{background: openEsp[esp.id] ? 'rgba(51,40,154,.05)' : 'var(--c-surface)'}}>
            <div className="adm-esp-avatar">
              {esp.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div className="adm-esp-name">{esp.nombre}</div>
              <div className="adm-esp-role">{esp.oficio || '—'}</div>
            </div>
            {openEsp[esp.id]
              ? <ChevronUp size={14} style={{ color: 'var(--t-muted)' }} />
              : <ChevronDown size={14} style={{ color: 'var(--t-muted)' }} />}
          </button>

          {openEsp[esp.id] && (
            <div className="adm-esp-body">
              {!esp.sprints?.length && (
                <p style={{ fontSize: 12, color: 'var(--t-muted)', fontStyle: 'italic' }}>
                  No hay sprints configurados
                </p>
              )}

              {esp.sprints.map(sp => {
                const spKey = `${esp.id}-${sp.idSprint}`
                return (
                  <div key={sp.idSprint} className="adm-sp-card2">
                    <button onClick={() => setOpenSp(p => ({ ...p, [spKey]: !p[spKey] }))}
                      className="adm-sp-btn"
                      style={{background: openSp[spKey] ? 'rgba(51,40,154,.05)' : 'var(--c-surface)'}}>
                      <div className="adm-sp-dot" style={{
                        background: sp.estado === 'activo' ? '#30693B' : sp.estado === 'planificado' ? '#3E5D9D' : '#aaa'
                      }}/>
                      <span className="adm-sp-name">{sp.nombre}</span>
                      <span className="adm-sp-range">{sp.inicio} → {sp.fin}</span>
                      <Chip estado={sp.estado} small />
                      {openSp[spKey] ? <ChevronUp size={13} style={{ color: 'var(--t-muted)' }} />
                                     : <ChevronDown size={13} style={{ color: 'var(--t-muted)' }} />}
                    </button>

                    {openSp[spKey] && (
                      <div className="adm-sp-body">
                        {sp.semanas.map(sem => {
                          const semKey = `${esp.id}-${sem.idPeriodo}`
                          const semBusyKey = `sem-${esp.id}-${sem.idPeriodo}`

                          return (
                            <div key={sem.idPeriodo} style={{ marginBottom: 10 }}>
                              <div className="adm-sem-hdr">
                                <button onClick={() => setOpenSem(p => ({ ...p, [semKey]: !p[semKey] }))}
                                  className="adm-sem-btn">
                                  <span className="adm-sem-label">{sem.label}</span>
                                  <span className="adm-sem-range">{sem.inicio} → {sem.fin}</span>
                                  {openSem[semKey] ? <ChevronUp size={11} style={{ color: 'var(--t-muted)' }} />
                                                   : <ChevronDown size={11} style={{ color: 'var(--t-muted)' }} />}
                                </button>
                                <button
                                  onClick={() => doAction(semBusyKey, () =>
                                    api.post(`/admin-jefe/periodos/empleado/${esp.id}/semana/${sem.idPeriodo}/habilitar`))}
                                  disabled={busy[semBusyKey]}
                                  title="Habilitar todos los días hábiles de esta semana"
                                  className="adm-sem-en-btn"
                                  style={{
                                    background: feedback[semBusyKey] ? 'rgba(48,105,59,.1)' : 'rgba(51,40,154,.07)',
                                    color: feedback[semBusyKey] ? '#30693B' : 'var(--c-accent)',
                                    opacity: busy[semBusyKey] ? .5 : 1
                                  }}>
                                  {busy[semBusyKey] ? '...'
                                    : feedback[semBusyKey] ? <><Check size={10} /> Hecho</>
                                    : <><Unlock size={10} /> Habilitar semana</>}
                                </button>
                              </div>

                              {openSem[semKey] && (
                                <div className="adm-dias-grid">
                                  {sem.dias.map(dia => {
                                    const diasKey = dia.idRegistro
                                      ? `reg-${dia.idRegistro}`
                                      : `new-${esp.id}-${sem.idPeriodo}-${dia.fecha}`
                                    const yaLibre  = dia.estado === 'borrador' || dia.habilitado === 1
                                    const sinReg   = dia.estado === 'sin_registro'
                                    const bloqueado = !yaLibre && !sinReg

                                    let bgColor = 'rgba(51,40,154,.04)'
                                    let borderColor = 'rgba(51,40,154,.12)'
                                    if (dia.habilitado === 1 && dia.estado !== 'borrador') {
                                      bgColor = 'rgba(48,105,59,.08)'; borderColor = 'rgba(48,105,59,.2)'
                                    } else if (dia.estado === 'aprobado') {
                                      bgColor = 'rgba(48,105,59,.06)'; borderColor = 'rgba(48,105,59,.15)'
                                    } else if (dia.estado === 'rechazado') {
                                      bgColor = 'rgba(153,44,38,.06)'; borderColor = 'rgba(153,44,38,.2)'
                                    } else if (dia.estado === 'enviado') {
                                      bgColor = 'rgba(62,93,157,.06)'; borderColor = 'rgba(62,93,157,.2)'
                                    } else if (sinReg) {
                                      bgColor = 'var(--c-surface2)'; borderColor = 'var(--c-border)'
                                    }

                                    return (
                                      <div key={dia.fecha} className="adm-dia-cell"
                                        style={{background: bgColor, border: `1px solid ${borderColor}`}}>
                                        <div className="adm-dia-label">{dia.label}</div>
                                        <Chip estado={dia.estado} small />
                                        {dia.habilitado === 1 && dia.estado !== 'borrador' && (
                                          <span className="adm-dia-status">🔓 Habilitado</span>
                                        )}
                                        {feedback[diasKey] ? (
                                          <span className="adm-dia-status">✓ Listo</span>
                                        ) : sinReg ? (
                                          <button
                                            onClick={() => doAction(diasKey, () => api.post('/admin-jefe/periodos/crear-y-habilitar', {
                                              idEmpleado: esp.id, idPeriodo: sem.idPeriodo, fecha: dia.fecha
                                            }))}
                                            disabled={busy[diasKey]}
                                            title="Permitir que el especialista ingrese actividades en este día"
                                            className="adm-dia-en-btn"
                                            style={{border:'1px solid rgba(51,40,154,.25)',background:'rgba(51,40,154,.08)',
                                              color:'var(--c-accent)',opacity:busy[diasKey]?.5:1}}>
                                            {busy[diasKey] ? '...' : <><Unlock size={8} /> Habilitar</>}
                                          </button>
                                        ) : bloqueado ? (
                                          <button
                                            onClick={() => doAction(diasKey, () =>
                                              api.post(`/admin-jefe/periodos/registro/${dia.idRegistro}/habilitar`))}
                                            disabled={busy[diasKey]}
                                            title="Permitir edición de este día"
                                            className="adm-dia-en-btn"
                                            style={{border:'1px solid rgba(214,88,48,.3)',background:'rgba(214,88,48,.08)',
                                              color:'#D65830',opacity:busy[diasKey]?.5:1}}>
                                            {busy[diasKey] ? '...' : <><Unlock size={8} /> Re-habilitar</>}
                                          </button>
                                        ) : (
                                          <span className="adm-dia-editable">Editable</span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — PROYECTOS
// ════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// PROYECTOS
// ══════════════════════════════════════════════════════════════════════════

// Colores por oficina (índice)
const OFC_PALETTE = [
  { bg:'#6366F1', light:'rgba(99,102,241,.1)', name:'indigo'  },  // Internos (especial)
  { bg:'#F97316', light:'rgba(249,115,22,.1)',  name:'orange'  },  // Proyectos TI
  { bg:'#3B82F6', light:'rgba(59,130,246,.1)',  name:'blue'    },  // OPERIT
  { bg:'#10B981', light:'rgba(16,185,129,.1)',  name:'emerald' },  // PMO
  { bg:'#8B5CF6', light:'rgba(139,92,246,.1)',  name:'violet'  },
]

// ── Tipo-badge ─────────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const cfg = {
    estrategico:           { bg:'rgba(99,102,241,.1)',  color:'#6366F1', label:'ESTRATÉGICO'           },
    continuidad_operativa: { bg:'rgba(16,185,129,.1)',  color:'#10B981', label:'CONTINUIDAD OPERATIVA'  },
    operativo:             { bg:'rgba(249,115,22,.1)',  color:'#F97316', label:'OPERATIVO'              },
    innovacion:            { bg:'rgba(239,68,68,.1)',   color:'#EF4444', label:'INNOVACIÓN'             },
    proyecto:              { bg:'rgba(99,102,241,.08)', color:'#6366F1', label:'PROYECTO'               },
    core:                  { bg:'rgba(16,185,129,.08)', color:'#10B981', label:'CORE'                   },
    iniciativa:            { bg:'rgba(249,115,22,.08)', color:'#F97316', label:'INICIATIVA'             },
    evolutivo:             { bg:'rgba(139,92,246,.08)', color:'#8B5CF6', label:'EVOLUTIVO'              },
  }[tipo] || { bg:'var(--c-surface2)', color:'var(--t-muted)', label: (tipo||'').toUpperCase() }
  return (
    <span style={{ padding:'2px 8px', borderRadius:4, fontSize:9.5, fontWeight:800,
      letterSpacing:.5, background:cfg.bg, color:cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── PopupAsignar ──────────────────────────────────────────────────────────
function PopupAsignar({ proyecto, especialistas, asigData, onGuardar, onClose }) {
  const yaAsig = (asigData||[]).filter(e=>e.proyectos.some(p=>p.id_proyecto===proyecto.id_proyecto)).map(e=>e.id)
  const [sel,    setSel]    = useState([...yaAsig])
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')

  const toggle = id => { setSel(p => p.includes(id)?p.filter(x=>x!==id):[...p,id]); setError('') }

  const submit = async () => {
    if (sel.length === 0) { setError('Selecciona al menos un especialista antes de confirmar.'); return }
    setBusy(true); setError('')
    try { await onGuardar(proyecto.id_proyecto, sel); onClose() }
    catch(e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="adm-pop-ov" onClick={onClose}>
      <div className="adm-pop" onClick={e=>e.stopPropagation()}>
        <div className="adm-pop-hdr">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div className="adm-pop-icon">
                <UserPlus size={16} style={{ color:'#6366F1' }}/>
              </div>
              <span className="adm-pop-title">Asignar al equipo</span>
            </div>
            <div className="adm-pop-sub">
              Proyecto: <strong style={{ color:'var(--t-secondary)' }}>{proyecto.nombre}</strong>
            </div>
          </div>
          <button className="adm-pop-close" onClick={onClose}><X size={14}/></button>
        </div>

        <div className="adm-pop-list">
          <div className="adm-pop-list-title">Seleccionar especialistas</div>
          <div className="adm-pop-esps">
            {(especialistas||[]).map(e => {
              const activo = sel.includes(e.id)
              return (
                <button key={e.id} onClick={()=>toggle(e.id)}
                  style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px',
                    borderRadius:12, cursor:'pointer', textAlign:'left', transition:'all .15s',
                    border:`1.5px solid ${activo?'#6366F1':'var(--c-border)'}`,
                    background: activo ? 'rgba(99,102,241,.06)' : 'var(--c-surface2)' }}>
                  <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                    background: activo ? 'rgba(99,102,241,.15)' : 'var(--c-surface)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:800, color:'#6366F1',
                    border:`1px solid ${activo?'rgba(99,102,241,.3)':'var(--c-border)'}` }}>
                    {e.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {e.nombre.split(' ').slice(0,3).join(' ')}
                    </div>
                    <div style={{ fontSize:10.5, color:'var(--t-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {(e.oficio||'Especialista').substring(0,40)}
                    </div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
                    border:`2px solid ${activo?'#6366F1':'var(--c-border)'}`,
                    background: activo ? '#6366F1' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                    {activo && <Check size={11} style={{ color:'white' }}/>}
                  </div>
                </button>
              )
            })}
            {!(especialistas||[]).length && (
              <div style={{ textAlign:'center', padding:'24px 0', fontSize:13, color:'var(--t-muted)', fontStyle:'italic' }}>
                Sin especialistas en el equipo
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="adm-pop-err"><AlertCircle size={14}/> {error}</div>
        )}

        <div className="adm-pop-footer">
          <button className="adm-pop-cancel" onClick={onClose}>Cancelar</button>
          <button className="adm-pop-confirm" onClick={submit} disabled={busy}
            style={{ cursor:busy?'not-allowed':'pointer', opacity:busy?.7:1 }}>
            <Check size={13}/>{busy?'Guardando...':'Confirmar asignación'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PopupConfirmarRetiro ───────────────────────────────────────────────────
function PopupConfirmarRetiro({ nombre, onConfirm, onClose }) {
  return (
    <div className="adm-cfrm-ov">
      <div className="adm-cfrm">
        <div className="adm-cfrm-icon" style={{ transform:'rotate(8deg)' }}>
          <AlertTriangle size={28} style={{ color:'#EF4444' }}/>
        </div>
        <div className="adm-cfrm-title">¿Retirar especialista?</div>
        <div className="adm-cfrm-body">
          Vas a desvincular a <strong style={{ color:'var(--t-primary)' }}>{nombre}</strong> del proyecto.
          Se le notificará automáticamente.
        </div>
        <div className="adm-cfrm-btns">
          <button className="adm-cfrm-cancel" onClick={onClose}>No, mantener</button>
          <button className="adm-cfrm-danger" onClick={onConfirm}>Sí, retirar</button>
        </div>
      </div>
    </div>
  )
}

// ── PopupEliminarIniciativa ────────────────────────────────────────────────
function PopupEliminarIniciativa({ nombre, onConfirm, onClose }) {
  return (
    <div className="adm-cfrm-ov">
      <div className="adm-cfrm" style={{ maxWidth:380 }}>
        <div className="adm-cfrm-icon">
          <Trash2 size={28} style={{ color:'#EF4444' }}/>
        </div>
        <div className="adm-cfrm-title">¿Eliminar iniciativa?</div>
        <div className="adm-cfrm-body">
          Se eliminará <strong style={{ color:'var(--t-primary)' }}>{nombre}</strong> y se desvinculará
          a todos los especialistas asignados. Se les notificará.
        </div>
        <div className="adm-cfrm-btns">
          <button className="adm-cfrm-cancel" onClick={onClose}>Cancelar</button>
          <button className="adm-cfrm-danger" onClick={onConfirm}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ── PopupFicha proyecto (solo lectura + ficha de iniciativa con editar/eliminar) ─────
function PopupFicha({ proyecto: p, asigData, esIniciativa, onEditar, onEliminar, onClose }) {
  const col    = EST_COLOR[p.estado]||'#888'
  const yaAsig = (asigData||[]).filter(e=>e.proyectos.some(pp=>pp.id_proyecto===p.id_proyecto))
  return (
    <div className="adm-ficha-ov" onClick={onClose}>
      <div className="adm-ficha" onClick={e=>e.stopPropagation()}>
        <div className="adm-ficha-body">
          <div className="adm-ficha-hdr">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Chip estado={p.estado} small/>
                {p.tipo_proyecto && <TipoBadge tipo={p.tipo_proyecto}/>}
                {p.clasificacion && <TipoBadge tipo={p.clasificacion}/>}
              </div>
              <div className="adm-ficha-title">{p.nombre}</div>
            </div>
            <button className="adm-ficha-close" onClick={onClose}><X size={14}/></button>
          </div>

          <div className="adm-ficha-avance">
            <div className="adm-ficha-avance-hdr">
              <span className="adm-ficha-avance-lbl">Avance</span>
              <span className="adm-ficha-avance-pct" style={{ color:col }}>{p.avance_pct||0}%</span>
            </div>
            <div className="adm-ficha-bar-track">
              <div className="adm-ficha-bar-fill" style={{ width:`${p.avance_pct||0}%`, background:col }}/>
            </div>
          </div>

          <div className="adm-ficha-grid">
            {p.lider_nombre   && <div><div className="adm-ficha-field-lbl">Líder</div><div className="adm-ficha-field-val">{p.lider_nombre}</div></div>}
            {p.area_nombre    && <div><div className="adm-ficha-field-lbl">Área</div><div className="adm-ficha-field-val">{p.area_nombre}</div></div>}
            {p.fecha_inicio   && <div><div className="adm-ficha-field-lbl">Fecha inicio</div><div className="adm-ficha-field-val">{fmtDate(p.fecha_inicio)}</div></div>}
            {p.fecha_fin      && <div><div className="adm-ficha-field-lbl">Fecha fin</div><div className="adm-ficha-field-val">{fmtDate(p.fecha_fin)}</div></div>}
            {!esIniciativa && p.costo_est_anual  && <div><div className="adm-ficha-field-lbl">Costo estimado</div><div className="adm-ficha-field-val">{fmtUSD(p.costo_est_anual)}</div></div>}
            {!esIniciativa && p.costo_ejec_anual && <div><div className="adm-ficha-field-lbl">Costo ejecutado</div><div className="adm-ficha-field-val">{fmtUSD(p.costo_ejec_anual)}</div></div>}
          </div>

          {p.descripcion && (
            <div className="adm-ficha-desc-box">
              <div className="adm-ficha-field-lbl" style={{ marginBottom:5 }}>Descripción</div>
              <div style={{ fontSize:13, color:'var(--t-secondary)', lineHeight:1.6 }}>{p.descripcion}</div>
            </div>
          )}

          <div className="adm-ficha-equipo">
            <div className="adm-ficha-equipo-title">Equipo asignado ({yaAsig.length})</div>
            {yaAsig.length ? (
              <div className="adm-ficha-equipo-list">
                {yaAsig.map(e=>(
                  <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    borderRadius:10, background:'var(--c-surface2)', border:'1px solid var(--c-border)' }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:'rgba(99,102,241,.1)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:800, color:'#6366F1', flexShrink:0 }}>
                      {e.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12.5, fontWeight:700 }}>{e.nombre}</div>
                      {e.oficio && <div style={{ fontSize:10.5, color:'var(--t-muted)' }}>{e.oficio.substring(0,45)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adm-ficha-equipo-empty">Sin especialistas asignados</div>
            )}
          </div>
        </div>

        <div className="adm-ficha-footer">
          {esIniciativa ? (
            <div className="adm-ficha-ini-btns">
              <button className="adm-ficha-del-btn" onClick={onEliminar}>
                <Trash2 size={13}/> Eliminar iniciativa
              </button>
              <button className="adm-ficha-edit-btn" onClick={onEditar}>
                <Edit3 size={13}/> Editar
              </button>
            </div>
          ) : <div/>}
          <button className="adm-ficha-close-btn" onClick={onClose}>Cerrar ficha</button>
        </div>
      </div>
    </div>
  )
}

// ── PopupEditarIniciativa ─────────────────────────────────────────────────
function PopupEditarIniciativa({ iniciativa, onGuardado, onClose }) {
  const [form, setForm] = useState({
    nombre:       iniciativa.nombre      || '',
    descripcion:  iniciativa.descripcion || '',
    fecha_inicio: iniciativa.fecha_inicio|| '',
    fecha_fin:    iniciativa.fecha_fin   || '',
    estado:       iniciativa.estado      || 'sin_iniciar',
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    setBusy(true); setErr('')
    try {
      await api.put(`/admin-jefe/proyectos/iniciativas/${iniciativa.id_proyecto}`, form)
      onGuardado?.(); onClose()
    } catch(e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="adm-edit-ov" onClick={onClose}>
      <div className="adm-edit" onClick={e=>e.stopPropagation()}>
        <div className="adm-edit-body">
          <div className="adm-edit-hdr">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="adm-edit-icon">
                <Edit3 size={18} style={{ color:'#6366F1' }}/>
              </div>
              <div className="adm-edit-title">Editar iniciativa</div>
            </div>
            <button className="adm-edit-close" onClick={onClose}><X size={14}/></button>
          </div>
          <div className="adm-edit-form">
            <div>
              <label className="adm-edit-lbl">Nombre *</label>
              <input className="adm-edit-inp" value={form.nombre} onChange={e=>set('nombre',e.target.value)}/>
            </div>
            <div>
              <label className="adm-edit-lbl">Descripción</label>
              <textarea className="adm-edit-inp" value={form.descripcion} onChange={e=>set('descripcion',e.target.value)}
                rows={3} style={{ resize:'none' }}/>
            </div>
            <div className="adm-modal-2col">
              <div><label className="adm-edit-lbl">Fecha inicio</label>
                <input type="date" className="adm-edit-inp" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)}/></div>
              <div><label className="adm-edit-lbl">Fecha fin</label>
                <input type="date" className="adm-edit-inp" value={form.fecha_fin} onChange={e=>set('fecha_fin',e.target.value)}/></div>
            </div>
            <div>
              <label className="adm-edit-lbl">Estado de la iniciativa</label>
              <div className="adm-edit-estado-opts">
                {[
                  { v:'sin_iniciar', l:'Sin iniciar', bg:'rgba(107,114,128,.1)', col:'#6B7280' },
                  { v:'activo',      l:'En curso',    bg:'rgba(16,185,129,.1)',  col:'#10B981' },
                  { v:'pausado',     l:'Pausado',     bg:'rgba(249,115,22,.1)',  col:'#F97316' },
                  { v:'cerrado',     l:'Finalizado',  bg:'rgba(99,102,241,.1)',  col:'#6366F1' },
                ].map(opt=>(
                  <button key={opt.v} onClick={()=>set('estado',opt.v)}
                    style={{ padding:'7px 14px', borderRadius:9,
                      border:`2px solid ${form.estado===opt.v?opt.col:'var(--c-border)'}`,
                      background:form.estado===opt.v?opt.bg:'transparent',
                      color:form.estado===opt.v?opt.col:'var(--t-muted)',
                      fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {form.estado==='cerrado' && (
                <div className="adm-edit-estado-info">
                  ✅ Al guardar como <strong>Finalizado</strong> la iniciativa dejará de aparecer en la lista activa.
                </div>
              )}
            </div>
          </div>
          {err && <div className="adm-edit-err">❌ {err}</div>}
        </div>
        <div className="adm-edit-footer">
          <button className="adm-edit-cancel" onClick={onClose}>Cancelar</button>
          <button className="adm-edit-submit" onClick={submit}
            disabled={!form.nombre.trim()||busy}
            style={{ background:form.nombre.trim()?'#6366F1':'var(--c-border)',
              cursor:!form.nombre.trim()||busy?'not-allowed':'pointer', opacity:busy?.7:1 }}>
            <Check size={14}/>{busy?'Guardando...':'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PopupNuevaIniciativa ───────────────────────────────────────────────────
function PopupNuevaIniciativa({ onCreated, onClose }) {
  const [form, setForm] = useState({ nombre:'', descripcion:'', fecha_inicio:'', fecha_fin:'' })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    setBusy(true); setErr('')
    try {
      await api.post('/admin-jefe/proyectos/iniciativas', form)
      onCreated?.(); onClose()
    } catch(e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="adm-nueva-ov" onClick={onClose}>
      <div className="adm-nueva" onClick={e=>e.stopPropagation()}>
        <div className="adm-nueva-body">
          <div className="adm-nueva-hdr">
            <div className="adm-nueva-icon">
              <Star size={22} style={{ color:'#6366F1' }}/>
            </div>
            <button className="adm-nueva-close" onClick={onClose}><X size={14}/></button>
          </div>
          <div className="adm-nueva-title">Nueva iniciativa interna</div>
          <div className="adm-nueva-sub">Solo visible para tu área. Asigna responsables libremente.</div>
          <div className="adm-nueva-form">
            <div>
              <label className="adm-edit-lbl">Nombre *</label>
              <input autoFocus className="adm-edit-inp" value={form.nombre}
                onChange={e=>set('nombre',e.target.value)}
                placeholder="Ej: Optimización de reportes internos..."/>
            </div>
            <div>
              <label className="adm-edit-lbl">Descripción</label>
              <textarea className="adm-edit-inp" value={form.descripcion}
                onChange={e=>set('descripcion',e.target.value)}
                rows={3} placeholder="Describe el objetivo..." style={{ resize:'none' }}/>
            </div>
            <div className="adm-modal-2col">
              <div><label className="adm-edit-lbl">Fecha inicio</label>
                <input type="date" className="adm-edit-inp" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)}/></div>
              <div><label className="adm-edit-lbl">Fecha fin</label>
                <input type="date" className="adm-edit-inp" value={form.fecha_fin} onChange={e=>set('fecha_fin',e.target.value)}/></div>
            </div>
          </div>
          {err && <div className="adm-edit-err">❌ {err}</div>}
        </div>
        <div className="adm-nueva-footer">
          <button className="adm-nueva-cancel" onClick={onClose}>Cancelar</button>
          <button className="adm-nueva-submit" onClick={submit}
            disabled={!form.nombre.trim()||busy}
            style={{ background:form.nombre.trim()?'#6366F1':'var(--c-border)',
              cursor:!form.nombre.trim()||busy?'not-allowed':'pointer', opacity:busy?.7:1 }}>
            <Plus size={14}/>{busy?'Creando...':'Crear iniciativa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ProyectoCard ───────────────────────────────────────────────────────────
function ProyectoCard({ p, esIniciativa, especialistas, asigData, onAsignar, onDesasignar, onVerFicha }) {
  const [hovered,       setHovered]       = useState(false)
  const [popupAsig,     setPopupAsig]     = useState(false)
  const [confirmRetiro, setConfirmRetiro] = useState(null)

  const yaAsig    = (asigData||[]).filter(e=>e.proyectos.some(pp=>pp.id_proyecto===p.id_proyecto))
  const tieneAsig = yaAsig.length > 0
  const tipoCol   = { continuidad_operativa:'#10B981', estrategico:'#6366F1',
                      operativo:'#F97316', innovacion:'#EF4444' }[p.clasificacion] || '#6B7280'

  const confirmarRetiro = async () => {
    await onDesasignar(p.id_proyecto, confirmRetiro.id)
    setConfirmRetiro(null)
  }

  return (
    <>
      <div className="adm-pc"
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{ background: hovered ? `${tipoCol}04` : 'var(--c-surface)',
          border:`1px solid ${hovered?tipoCol+'45':'var(--c-border)'}`,
          boxShadow: hovered ? `0 4px 20px ${tipoCol}14` : 'none' }}>

        <div className="adm-pc-info">
          <div className="adm-pc-bar" style={{ background:tipoCol }}/>

          <div className="adm-pc-content" onClick={onVerFicha}>
            <div className="adm-pc-meta">
              <span className="adm-pc-name" style={{ color:hovered?tipoCol:'var(--t-primary)' }}>{p.nombre}</span>
              <Chip estado={p.estado} small/>
              {p.clasificacion && <TipoBadge tipo={p.clasificacion}/>}
            </div>
            {p.descripcion && <div className="adm-pc-desc">{p.descripcion}</div>}
            <div className="adm-pc-prog">
              <div className="adm-pc-prog-track">
                <div className="adm-pc-prog-fill" style={{ width:`${p.avance_pct||0}%`, background:tipoCol }}/>
              </div>
              <span className="adm-pc-prog-pct" style={{ color:tipoCol }}>{p.avance_pct||0}%</span>
            </div>
          </div>

          <div className="adm-pc-assign" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setPopupAsig(true)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer',
                border:`1px solid ${hovered?'rgba(99,102,241,.5)':'rgba(99,102,241,.3)'}`,
                background:hovered?'rgba(99,102,241,.12)':'rgba(99,102,241,.06)',
                color:'#6366F1', transition:'all .15s', whiteSpace:'nowrap' }}>
              <UserPlus size={13}/>
              Asignar especialista{yaAsig.length>0?` (${yaAsig.length})`:' '}
            </button>
          </div>
        </div>

        {tieneAsig && (
          <>
            <div className="adm-pc-sep" style={{ background:hovered?`${tipoCol}30`:'var(--c-border)' }}/>
            <div className="adm-pc-team">
              <div className="adm-pc-avatars">
                {yaAsig.slice(0,4).map((e,i)=>(
                  <div key={e.id} className="adm-pc-avatar"
                    style={{ marginLeft:i?-9:0, zIndex:yaAsig.length-i,
                      background:`linear-gradient(135deg,${tipoCol}88,${tipoCol})` }}>
                    {e.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                  </div>
                ))}
                {yaAsig.length>4 && (
                  <div style={{ width:28, height:28, borderRadius:'50%', marginLeft:-9, zIndex:0,
                    background:'var(--c-surface2)', border:'2px solid var(--c-surface)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:9.5, fontWeight:800, color:'var(--t-muted)' }}>
                    +{yaAsig.length-4}
                  </div>
                )}
              </div>
              {yaAsig.map(e=>(
                <div key={e.id} className="adm-pc-chip"
                  onMouseEnter={el=>el.currentTarget.style.borderColor=tipoCol+'50'}
                  onMouseLeave={el=>el.currentTarget.style.borderColor='var(--c-border)'}>
                  <div className="adm-pc-chip-av" style={{ background:`${tipoCol}18`, color:tipoCol }}>
                    {e.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                  </div>
                  <span className="adm-pc-chip-name">
                    {e.nombre.split(' ').slice(0,2).join(' ')}
                  </span>
                  <button className="adm-pc-chip-rm"
                    onClick={ev=>{ev.stopPropagation();setConfirmRetiro(e)}}>
                    <X size={11} strokeWidth={2.5}/>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {popupAsig && (
        <PopupAsignar proyecto={p} especialistas={especialistas} asigData={asigData}
          onGuardar={onAsignar} onClose={()=>setPopupAsig(false)}/>
      )}
      {confirmRetiro && (
        <PopupConfirmarRetiro nombre={confirmRetiro.nombre}
          onConfirm={confirmarRetiro} onClose={()=>setConfirmRetiro(null)}/>
      )}
    </>
  )
}


// ── TabProyectos ───────────────────────────────────────────────────────────
function TabProyectos() {
  const [oficinas,     setOficinas]     = useState([])
  const [iniciativas,  setIniciativas]  = useState([])
  const [asigData,     setAsigData]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [expanded,     setExpanded]     = useState({})
  const [modalNueva,   setModalNueva]   = useState(false)
  const [fichaOpen,    setFichaOpen]    = useState(null)   // { proyecto, esIniciativa }
  const [popupEditar,  setPopupEditar]  = useState(null)   // iniciativa a editar
  const [confirmaElim, setConfirmaElim] = useState(null)   // { id, nombre }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        api.get('/admin-jefe/proyectos/oficinas'),
        api.get('/admin-jefe/proyectos/asignaciones'),
      ])
      const { oficinas: ofs, iniciativas: inics } = r1.data || {}
      setOficinas(ofs || [])
      setIniciativas(inics || [])
      setAsigData(r2.data || [])
      // NO modifica expanded — preserva el estado de apertura del usuario
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  // Carga solo los datos de asignaciones sin tocar expanded
  const loadAsig = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        api.get('/admin-jefe/proyectos/oficinas'),
        api.get('/admin-jefe/proyectos/asignaciones'),
      ])
      const { oficinas: ofs, iniciativas: inics } = r1.data || {}
      setOficinas(ofs || [])
      setIniciativas(inics || [])
      setAsigData(r2.data || [])
    } catch(e) { console.error(e) }
  }, [])

  const handleAsignar    = async (idP, ids) => { await api.post(`/admin-jefe/proyectos/${idP}/asignar`,{idEmpleados:ids}); await loadAsig() }
  const handleDesasignar = async (idP, idE) => { await api.delete(`/admin-jefe/proyectos/${idP}/especialista/${idE}`); await loadAsig() }

  const handleEliminarIniciativa = async () => {
    if (!confirmaElim) return
    try {
      await api.delete(`/admin-jefe/proyectos/iniciativas/${confirmaElim.id}`)
      if (fichaOpen?.proyecto?.id_proyecto === confirmaElim.id) setFichaOpen(null)
      await loadAsig()
    } catch(e) { alert(e.message) }
    finally { setConfirmaElim(null) }
  }

  if (loading) return <PageLoader message="Cargando proyectos..." />

  const especialistas = asigData

  // Secciones: primero iniciativas internas, luego oficinas
  const secciones = [
    { id:'__iniciativas__', nombre:'Iniciativas Internas', esIniciativa:true,
      descripcion:'Iniciativas y mejoras propias de tu área de trabajo',
      proyectos: iniciativas, paletteIdx:0 },
    ...oficinas.map((o,i) => ({
      id: o.id_oficina, nombre:o.nombre, descripcion:o.descripcion,
      esIniciativa:false, proyectos:o.proyectos, paletteIdx:i+1,
    })),
  ]

  return (
    <div>
      <div className="adm-sec-hdr" style={{ marginBottom:24, flexWrap:'wrap', gap:12, alignItems:'flex-start' }}>
        <div>
          <h3 className="adm-sec-title" style={{ fontSize:18 }}>Proyectos</h3>
          <p className="adm-sec-sub" style={{ marginTop:4 }}>
            Haz clic en un proyecto para ver su ficha completa
          </p>
        </div>
        <button className="adm-new-btn" onClick={()=>setModalNueva(true)}
          style={{ boxShadow:'0 4px 16px rgba(99,102,241,.35)' }}>
          <Plus size={15}/> Nueva iniciativa
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {secciones.map(sec => {
          const isOpen = expanded[sec.id]
          const pal    = OFC_PALETTE[sec.paletteIdx % OFC_PALETTE.length]

          return (
            <div key={sec.id} className="adm-proy-sec"
              style={{ border:`1px solid ${isOpen?pal.bg+'30':'var(--c-border)'}`,
                boxShadow:isOpen?`0 4px 24px ${pal.bg}12`:'none' }}>

              <button className="adm-proy-sec-hdr"
                style={{ background:isOpen?`${pal.bg}08`:'var(--c-surface)' }}
                onClick={()=>setExpanded(p=>({...p,[sec.id]:!p[sec.id]}))}>
                <div className="adm-proy-sec-left">
                  <div className="adm-oficina-icon"
                    style={{ width:50, height:50, borderRadius:16, background:pal.bg,
                      boxShadow:`0 6px 16px ${pal.bg}50` }}>
                    {sec.esIniciativa ? <Star size={23} style={{ color:'white' }}/> : <Folder size={23} style={{ color:'white' }}/>}
                  </div>
                  <div className="adm-proy-sec-info">
                    <div className="adm-proy-sec-title">
                      <span className="adm-proy-sec-name">{sec.nombre}</span>
                      <span className="adm-proy-sec-count"
                        style={{ background:pal.light, color:pal.bg, border:`1px solid ${pal.bg}30` }}>
                        {sec.proyectos.length}
                      </span>
                    </div>
                    <div className="adm-proy-sec-desc">{sec.descripcion}</div>
                  </div>
                </div>
                <div className="adm-proy-sec-right">
                  <div>
                    <div className="adm-proy-sec-status-lbl">Estado</div>
                    <div className="adm-proy-sec-status-val">Activa</div>
                  </div>
                  {isOpen ? <ChevronUp size={20} style={{ color:'var(--t-muted)' }}/> : <ChevronDown size={20} style={{ color:'var(--t-muted)' }}/>}
                </div>
              </button>

              {isOpen && (
                <div className="adm-proy-sec-body">
                  {!sec.proyectos.length ? (
                    <div className="adm-proy-sec-empty" style={{ background:`${pal.bg}04` }}>
                      {sec.esIniciativa
                        ? <span>Aún no has creado iniciativas internas.<br/>Usa el botón <strong>"Nueva iniciativa"</strong> para comenzar.</span>
                        : 'Sin proyectos activos en esta oficina.'}
                    </div>
                  ) : (
                    <div className="adm-proy-list">
                      {sec.proyectos.map(p => (
                        <ProyectoCard
                          key={p.id_proyecto}
                          p={p}
                          esIniciativa={sec.esIniciativa}
                          especialistas={especialistas}
                          asigData={asigData}
                          onAsignar={handleAsignar}
                          onDesasignar={handleDesasignar}
                          onVerFicha={()=>setFichaOpen({ proyecto:p, esIniciativa:sec.esIniciativa })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Popups */}
      {modalNueva && (
        <PopupNuevaIniciativa onCreated={loadAsig} onClose={()=>setModalNueva(false)}/>
      )}
      {fichaOpen && (
        <PopupFicha
          proyecto={fichaOpen.proyecto}
          asigData={asigData}
          esIniciativa={fichaOpen.esIniciativa}
          onEditar={()=>{ setPopupEditar(fichaOpen.proyecto); setFichaOpen(null) }}
          onEliminar={()=>{ setConfirmaElim({ id:fichaOpen.proyecto.id_proyecto, nombre:fichaOpen.proyecto.nombre }); setFichaOpen(null) }}
          onClose={()=>setFichaOpen(null)}
        />
      )}
      {popupEditar && (
        <PopupEditarIniciativa
          iniciativa={popupEditar}
          onGuardado={loadAsig}
          onClose={()=>setPopupEditar(null)}
        />
      )}
      {confirmaElim && (
        <PopupEliminarIniciativa
          nombre={confirmaElim.nombre}
          onConfirm={handleEliminarIniciativa}
          onClose={()=>setConfirmaElim(null)}
        />
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — ASIGNACIONES
// ════════════════════════════════════════════════════════════════════════════

function fmtMins(m) {
  if (!m) return '0h'
  const h = Math.floor(m / 60), r = m % 60
  if (!h) return `${r}m`
  if (!r) return `${h}h`
  return `${h}h ${r}m`
}

function TabAsignaciones() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar,  setBuscar]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin-jefe/proyectos/asignaciones')
      setData(r.data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  if (loading) return <PageLoader message="Cargando asignaciones..." />

  // Filtro por nombre de especialista
  const filtrado = buscar.trim()
    ? data.filter(e => e.nombre.toLowerCase().includes(buscar.trim().toLowerCase()))
    : data

  const totalProyectos = data.reduce((s, e) => s + e.proyectos.length, 0)

  return (
    <div>
      <div className="adm-sec-hdr" style={{ marginBottom:20, flexWrap:'wrap', gap:12, alignItems:'flex-start' }}>
        <div>
          <h3 className="adm-sec-title">Asignaciones del equipo</h3>
          <p className="adm-sec-sub" style={{ marginTop:4 }}>
            {data.length} especialista{data.length!==1?'s':''} · {totalProyectos} asignación{totalProyectos!==1?'es':''}
          </p>
        </div>
        <button onClick={load}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
            borderRadius:9, border:'1px solid var(--c-border)', background:'var(--c-surface)',
            fontSize:12.5, fontWeight:600, cursor:'pointer', color:'var(--t-secondary)' }}>
          <RefreshCw size={13}/> Actualizar
        </button>
      </div>

      <div style={{ position:'relative', marginBottom:16 }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
          color:'var(--t-muted)', pointerEvents:'none' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          value={buscar}
          onChange={e=>setBuscar(e.target.value)}
          placeholder="Buscar especialista..."
          style={{ width:'100%', padding:'10px 14px 10px 38px', borderRadius:11,
            border:'1.5px solid var(--c-border)', background:'var(--c-surface)',
            fontSize:13, fontWeight:500, color:'var(--t-primary)', outline:'none',
            boxSizing:'border-box', transition:'border-color .15s', fontFamily:'inherit' }}
          onFocus={e=>e.target.style.borderColor='#6366F1'}
          onBlur={e=>e.target.style.borderColor='var(--c-border)'}
        />
        {buscar && (
          <button onClick={()=>setBuscar('')}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              width:22, height:22, borderRadius:'50%', border:'none',
              background:'var(--c-surface2)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
            <X size={11}/>
          </button>
        )}
      </div>

      {!filtrado.length && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t-muted)' }}>
          <Briefcase size={36} style={{ opacity:.2, margin:'0 auto 10px', display:'block' }}/>
          <div style={{ fontSize:14, fontWeight:600 }}>
            {buscar ? `Sin resultados para "${buscar}"` : 'No hay asignaciones registradas aún'}
          </div>
          {buscar && (
            <button onClick={()=>setBuscar('')}
              style={{ marginTop:12, padding:'7px 16px', borderRadius:9, border:'1px solid var(--c-border)',
                background:'var(--c-surface)', fontSize:12.5, cursor:'pointer', color:'var(--t-secondary)' }}>
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      <div className="adm-asig-list">
        {filtrado.map(esp => {
          const totalMins = esp.proyectos.reduce((s,p) => s + (p.mins_invertidos||0), 0)
          const initials  = esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')

          return (
            <div key={esp.id} className="adm-asig-card">
              <div className="adm-asig-hdr"
                style={{ background:'linear-gradient(135deg, rgba(99,102,241,.04), rgba(99,102,241,.02))',
                  borderBottom: esp.proyectos.length ? '1px solid var(--c-border)' : 'none' }}>
                <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                  background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(99,102,241,.12))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:15, fontWeight:900, color:'#6366F1',
                  border:'1px solid rgba(99,102,241,.2)' }}>
                  {initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="adm-asig-name">{esp.nombre}</div>
                  <div className="adm-asig-role">{esp.oficio || '—'}</div>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                  {totalMins > 0 && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase',
                        letterSpacing:.8, color:'var(--t-muted)', marginBottom:1 }}>Total invertido</div>
                      <div style={{ fontSize:15, fontWeight:900, color:'#6366F1',
                        fontFamily:'JetBrains Mono, monospace' }}>{fmtMins(totalMins)}</div>
                    </div>
                  )}
                  <div style={{ padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:800,
                    background: esp.proyectos.length ? 'rgba(99,102,241,.1)' : 'var(--c-surface2)',
                    color: esp.proyectos.length ? '#6366F1' : 'var(--t-muted)',
                    border:`1px solid ${esp.proyectos.length?'rgba(99,102,241,.2)':'var(--c-border)'}`,
                    display:'flex', alignItems:'center', alignSelf:'center' }}>
                    {esp.proyectos.length} proy.
                  </div>
                </div>
              </div>

              {esp.proyectos.length > 0 ? (
                <div className="adm-asig-body">
                  {esp.proyectos.map(p => {
                    const isIniciativa = p.alcance_visibilidad === 'equipo'
                    const tipoCol = {
                      continuidad_operativa:'#10B981', estrategico:'#6366F1',
                      operativo:'#F97316', innovacion:'#EF4444'
                    }[p.clasificacion] || (isIniciativa ? '#6366F1' : '#6B7280')
                    const estadoCol = EST_COLOR[p.estado] || '#888'

                    return (
                      <div key={p.id_proyecto} className="adm-mini-proy-card"
                        style={{ border:`1px solid ${p.mins_invertidos>0?tipoCol+'25':'var(--c-border)'}` }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor=tipoCol+'50'; e.currentTarget.style.boxShadow=`0 2px 12px ${tipoCol}15` }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=p.mins_invertidos>0?tipoCol+'25':'var(--c-border)'; e.currentTarget.style.boxShadow='none' }}>

                        <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                          <div style={{ width:4, height:4, borderRadius:'50%', marginTop:5,
                            background:estadoCol, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12.5, fontWeight:800, lineHeight:1.3,
                              overflow:'hidden', textOverflow:'ellipsis',
                              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                              {p.nombre}
                            </div>
                          </div>
                        </div>

                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                          <Chip estado={p.estado} small/>
                          {isIniciativa && (
                            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, fontWeight:800,
                              background:'rgba(99,102,241,.1)', color:'#6366F1', letterSpacing:.4 }}>INICIATIVA</span>
                          )}
                          {p.oficina_nombre && !isIniciativa && (
                            <span style={{ fontSize:9.5, color:'var(--t-muted)' }}>{p.oficina_nombre}</span>
                          )}
                        </div>

                        <div className="adm-mini-bar">
                          <div className="adm-mini-bar-fill" style={{ width:`${p.avance_pct||0}%`, background:estadoCol }}/>
                        </div>

                        <div className="adm-mini-footer">
                          <div className="adm-mini-lbl">Tiempo invertido</div>
                          <div className="adm-mini-mins"
                            style={{ color:p.mins_invertidos>0?tipoCol:'var(--t-muted)' }}>
                            {p.mins_invertidos > 0 ? fmtMins(p.mins_invertidos) : '—'}
                          </div>
                        </div>
                        {p.mins_invertidos > 0 && (
                          <div style={{ height:3, borderRadius:99, marginTop:5,
                            background:`${tipoCol}20`, overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, background:tipoCol,
                              width:`${Math.min(100, Math.round(p.mins_invertidos / 528 * 100))}%`,
                              transition:'width .6s' }}/>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding:'14px 20px', color:'var(--t-muted)', fontSize:12.5, fontStyle:'italic' }}>
                  Sin proyectos asignados
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ── Componente principal ───────────────────────────────────────────────────
export default function Administracion() {
  const [tab, setTab] = useState('periodos')
  return (
    <div>
      <div className="adm-per-hdr" style={{marginBottom:20}}>
        <h2 className="adm-per-title" style={{fontSize:22}}>Administración</h2>
        <p className="adm-per-sub">Gestión de períodos y proyectos del equipo</p>
      </div>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'sprints'      && <TabSprints />}
      {tab === 'periodos'     && <TabPeriodos />}
      {tab === 'proyectos'    && <TabProyectos />}
      {tab === 'asignaciones' && <TabAsignaciones />}
    </div>
  )
}
