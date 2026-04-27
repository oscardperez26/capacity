/**
 * Administracion.jsx — v2
 * Tab Períodos: todos los sprints con todos sus días (habiles), con o sin registro previo
 * Tab Proyectos: oficinas con ficha completa por proyecto + crear + asignar
 * Tab Asignaciones: vista consolidada por especialista
 */
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
    <div style={{ display: 'flex', gap: 4, marginBottom: 20,
      background: 'rgba(51,40,154,.06)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
      {tabs.map(t => (
        <button key={t.k} onClick={() => onChange(t.k)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
            borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
            transition: 'all .15s',
            background: active === t.k ? 'white' : 'transparent',
            color: active === t.k ? 'var(--c-accent)' : 'var(--t-secondary)',
            boxShadow: active === t.k ? '0 1px 4px rgba(0,0,0,.1)' : 'none' }}>
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
    activo:  { label:'Activo',  bg:'rgba(48,105,59,.10)',  color:'#30693B', border:'rgba(48,105,59,.25)' },
    cerrado: { label:'Cerrado', bg:'rgba(153,44,38,.08)', color:'#992C26', border:'rgba(153,44,38,.20)' },
    draft:   { label:'Draft',   bg:'rgba(214,88,48,.08)', color:'#D65830', border:'rgba(214,88,48,.20)' },
  }

  if (loading) return <PageLoader message="Cargando sprints..." />

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800 }}>Configuración de Sprints</div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>
            Los sprints definen los períodos de registro de actividades para todo el equipo
          </div>
        </div>
        <button onClick={abrirCrear}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
            borderRadius:10, border:'none', background:'linear-gradient(135deg,#33289A,#4554A1)',
            color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={14}/> Nuevo Sprint
        </button>
      </div>

      {/* Lista de sprints */}
      {!sprints.length
        ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t-muted)', fontSize:13 }}>
            No hay sprints configurados. Crea el primero.
          </div>
        : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sprints.map(sp => {
              const cfg = ESTADO_CFG[sp.estado] ?? ESTADO_CFG.draft
              const fmt = v => v ? String(v).split('T')[0] : '—'
              return (
                <div key={sp.id_sprint} style={{ borderRadius:12, border:'1px solid var(--c-border)',
                  background:'var(--c-surface)', padding:'14px 18px',
                  display:'flex', alignItems:'center', gap:14 }}>
                  {/* Número */}
                  <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                    background:'rgba(51,40,154,.08)', display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:15, fontWeight:900, color:'var(--c-accent)' }}>
                    {sp.id_sprint}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800 }}>{sp.nombre}</div>
                    <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2 }}>
                      {fmt(sp.fecha_inicio)} → {fmt(sp.fecha_fin)}
                    </div>
                  </div>
                  {/* Estado badge */}
                  <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                    background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, flexShrink:0 }}>
                    {cfg.label}
                  </span>
                  {/* Acciones */}
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {sp.estado !== 'activo' && (
                      <button onClick={() => cambiarEstado(sp.id_sprint, 'activo')}
                        style={{ padding:'5px 11px', borderRadius:8, border:'1px solid rgba(48,105,59,.3)',
                          background:'rgba(48,105,59,.07)', color:'#30693B', fontSize:11,
                          fontWeight:700, cursor:'pointer' }}>
                        Activar
                      </button>
                    )}
                    {sp.estado === 'activo' && (
                      <button onClick={() => cambiarEstado(sp.id_sprint, 'cerrado')}
                        style={{ padding:'5px 11px', borderRadius:8, border:'1px solid rgba(153,44,38,.3)',
                          background:'rgba(153,44,38,.07)', color:'#992C26', fontSize:11,
                          fontWeight:700, cursor:'pointer' }}>
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
      }

      {/* Modal crear sprint */}
      {modal === 'crear' && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.45)',
          backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setModal(null)}>
          <div style={{ background:'var(--c-surface)', borderRadius:18, padding:28, width:'100%',
            maxWidth:440, boxShadow:'var(--s-xl)', border:'1px solid var(--c-border)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:17, fontWeight:900 }}>Nuevo Sprint</div>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none',
                cursor:'pointer', color:'var(--t-muted)' }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:.7, color:'var(--t-muted)', display:'block', marginBottom:5 }}>
                  Nombre del sprint *
                </label>
                <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}
                  placeholder="Ej: Sprint 1 — Q1 2026"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:10, fontFamily:'inherit',
                    border:'1.5px solid var(--c-border)', background:'var(--c-surface2)',
                    fontSize:13, color:'var(--t-primary)', boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:.7, color:'var(--t-muted)', display:'block', marginBottom:5 }}>
                    Fecha inicio *
                  </label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e=>setForm(p=>({...p,fecha_inicio:e.target.value}))}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, fontFamily:'inherit',
                      border:'1.5px solid var(--c-border)', background:'var(--c-surface2)',
                      fontSize:13, color:'var(--t-primary)', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:.7, color:'var(--t-muted)', display:'block', marginBottom:5 }}>
                    Fecha fin *
                  </label>
                  <input type="date" value={form.fecha_fin} min={form.fecha_inicio}
                    onChange={e=>setForm(p=>({...p,fecha_fin:e.target.value}))}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, fontFamily:'inherit',
                      border:'1.5px solid var(--c-border)', background:'var(--c-surface2)',
                      fontSize:13, color:'var(--t-primary)', boxSizing:'border-box' }}/>
                </div>
              </div>
              {error && (
                <div style={{ padding:'9px 12px', borderRadius:9, background:'rgba(239,68,68,.07)',
                  border:'1px solid rgba(239,68,68,.2)', fontSize:12.5, color:'#EF4444', fontWeight:600 }}>
                  {error}
                </div>
              )}
              <button onClick={guardar} disabled={saving}
                style={{ padding:'11px', borderRadius:11, border:'none', fontFamily:'inherit',
                  background:'linear-gradient(135deg,#33289A,#4554A1)', color:'white',
                  fontSize:14, fontWeight:800, cursor:saving?'not-allowed':'pointer',
                  opacity:saving?.7:1 }}>
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
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 17, fontWeight: 800 }}>Habilitar períodos de edición</h3>
        <p style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 4 }}>
          Permite que un especialista ingrese o edite actividades en cualquier día, aunque no haya
          registrado anteriormente o el período esté cerrado.
        </p>
      </div>

      {data.especialistas.map(esp => (
        <div key={esp.id} style={{ borderRadius: 14, border: '1px solid var(--c-border)',
          overflow: 'hidden', marginBottom: 10, background: 'var(--c-surface)' }}>

          {/* Header especialista */}
          <button onClick={() => setOpenEsp(p => ({ ...p, [esp.id]: !p[esp.id] }))}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 18px', background: openEsp[esp.id] ? 'rgba(51,40,154,.05)' : 'var(--c-surface)',
              border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(51,40,154,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'var(--c-accent)', flexShrink: 0 }}>
              {esp.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{esp.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 1 }}>{esp.oficio || '—'}</div>
            </div>
            {openEsp[esp.id]
              ? <ChevronUp size={14} style={{ color: 'var(--t-muted)' }} />
              : <ChevronDown size={14} style={{ color: 'var(--t-muted)' }} />}
          </button>

          {openEsp[esp.id] && (
            <div style={{ borderTop: '1px solid var(--c-border)', padding: '12px 18px 16px',
              background: 'var(--c-surface2)' }}>

              {!esp.sprints?.length && (
                <p style={{ fontSize: 12, color: 'var(--t-muted)', fontStyle: 'italic' }}>
                  No hay sprints configurados
                </p>
              )}

              {esp.sprints.map(sp => {
                const spKey = `${esp.id}-${sp.idSprint}`
                return (
                  <div key={sp.idSprint} style={{ marginBottom: 12, borderRadius: 11,
                    border: '1px solid var(--c-border)', overflow: 'hidden' }}>

                    {/* Header sprint */}
                    <button onClick={() => setOpenSp(p => ({ ...p, [spKey]: !p[spKey] }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: openSp[spKey] ? 'rgba(51,40,154,.05)' : 'var(--c-surface)',
                        border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: sp.estado === 'activo' ? '#30693B' : sp.estado === 'planificado' ? '#3E5D9D' : '#aaa' }} />
                      <span style={{ fontSize: 13.5, fontWeight: 800, flex: 1 }}>{sp.nombre}</span>
                      <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{sp.inicio} → {sp.fin}</span>
                      <Chip estado={sp.estado} small />
                      {openSp[spKey] ? <ChevronUp size={13} style={{ color: 'var(--t-muted)' }} />
                                     : <ChevronDown size={13} style={{ color: 'var(--t-muted)' }} />}
                    </button>

                    {openSp[spKey] && (
                      <div style={{ borderTop: '1px solid var(--c-border)', padding: '10px 14px',
                        background: 'var(--c-surface2)' }}>
                        {sp.semanas.map(sem => {
                          const semKey = `${esp.id}-${sem.idPeriodo}`
                          const semBusyKey = `sem-${esp.id}-${sem.idPeriodo}`
                          const tieneRegistros = sem.dias.some(d => d.idRegistro)
                          const todosBloqueados = sem.dias.every(d =>
                            d.estado !== 'borrador' && d.estado !== 'sin_registro')

                          return (
                            <div key={sem.idPeriodo} style={{ marginBottom: 10 }}>
                              {/* Header semana */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <button onClick={() => setOpenSem(p => ({ ...p, [semKey]: !p[semKey] }))}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--c-accent)' }}>
                                    {sem.label}
                                  </span>
                                  <span style={{ fontSize: 10.5, color: 'var(--t-muted)' }}>
                                    {sem.inicio} → {sem.fin}
                                  </span>
                                  {openSem[semKey] ? <ChevronUp size={11} style={{ color: 'var(--t-muted)' }} />
                                                   : <ChevronDown size={11} style={{ color: 'var(--t-muted)' }} />}
                                </button>

                                {/* Botón habilitar semana completa */}
                                <button
                                  onClick={() => doAction(semBusyKey, () =>
                                    api.post(`/admin-jefe/periodos/empleado/${esp.id}/semana/${sem.idPeriodo}/habilitar`))}
                                  disabled={busy[semBusyKey]}
                                  title="Habilitar todos los días hábiles de esta semana"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                    borderRadius: 7, border: '1px solid rgba(51,40,154,.25)',
                                    background: feedback[semBusyKey] ? 'rgba(48,105,59,.1)' : 'rgba(51,40,154,.07)',
                                    color: feedback[semBusyKey] ? '#30693B' : 'var(--c-accent)',
                                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    opacity: busy[semBusyKey] ? .5 : 1, flexShrink: 0 }}>
                                  {busy[semBusyKey] ? '...'
                                    : feedback[semBusyKey] ? <><Check size={10} /> Hecho</>
                                    : <><Unlock size={10} /> Habilitar semana</>}
                                </button>
                              </div>

                              {/* Días */}
                              {openSem[semKey] && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 4 }}>
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
                                      <div key={dia.fecha} style={{ display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 5, padding: '10px 10px', borderRadius: 10,
                                        background: bgColor, border: `1px solid ${borderColor}`, minWidth: 74 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{dia.label}</div>
                                        <Chip estado={dia.estado} small />
                                        {dia.habilitado === 1 && dia.estado !== 'borrador' && (
                                          <span style={{ fontSize: 9, color: '#30693B', fontWeight: 700 }}>
                                            🔓 Habilitado
                                          </span>
                                        )}
                                        {/* Acción según estado */}
                                        {feedback[diasKey] ? (
                                          <span style={{ fontSize: 9, color: '#30693B', fontWeight: 700 }}>
                                            ✓ Listo
                                          </span>
                                        ) : sinReg ? (
                                          // Sin registro previo → crear y habilitar
                                          <button
                                            onClick={() => doAction(diasKey, () => api.post('/admin-jefe/periodos/crear-y-habilitar', {
                                              idEmpleado: esp.id, idPeriodo: sem.idPeriodo, fecha: dia.fecha
                                            }))}
                                            disabled={busy[diasKey]}
                                            title="Permitir que el especialista ingrese actividades en este día"
                                            style={{ display: 'flex', alignItems: 'center', gap: 3,
                                              padding: '3px 7px', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
                                              border: '1px solid rgba(51,40,154,.25)', background: 'rgba(51,40,154,.08)',
                                              color: 'var(--c-accent)', cursor: 'pointer',
                                              opacity: busy[diasKey] ? .5 : 1 }}>
                                            {busy[diasKey] ? '...' : <><Unlock size={8} /> Habilitar</>}
                                          </button>
                                        ) : bloqueado ? (
                                          // Tiene registro pero está bloqueado → re-habilitar
                                          <button
                                            onClick={() => doAction(diasKey, () =>
                                              api.post(`/admin-jefe/periodos/registro/${dia.idRegistro}/habilitar`))}
                                            disabled={busy[diasKey]}
                                            title="Permitir edición de este día"
                                            style={{ display: 'flex', alignItems: 'center', gap: 3,
                                              padding: '3px 7px', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
                                              border: '1px solid rgba(214,88,48,.3)', background: 'rgba(214,88,48,.08)',
                                              color: '#D65830', cursor: 'pointer',
                                              opacity: busy[diasKey] ? .5 : 1 }}>
                                            {busy[diasKey] ? '...' : <><Unlock size={8} /> Re-habilitar</>}
                                          </button>
                                        ) : (
                                          // Borrador = ya editable
                                          <span style={{ fontSize: 9, color: 'var(--t-muted)' }}>Editable</span>
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
    <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,15,30,.55)', backdropFilter:'blur(6px)', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--c-surface)', borderRadius:24, width:'100%', maxWidth:420,
        overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.22)', border:'1px solid var(--c-border)' }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'22px 24px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
          borderBottom:'1px solid var(--c-border)' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(99,102,241,.1)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <UserPlus size={16} style={{ color:'#6366F1' }}/>
              </div>
              <span style={{ fontSize:16, fontWeight:900 }}>Asignar al equipo</span>
            </div>
            <div style={{ fontSize:12, color:'var(--t-muted)', paddingLeft:40 }}>
              Proyecto: <strong style={{ color:'var(--t-secondary)' }}>{proyecto.nombre}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none',
            background:'var(--c-surface2)', cursor:'pointer', display:'flex',
            alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
            <X size={14}/>
          </button>
        </div>

        {/* Lista especialistas */}
        <div style={{ padding:'14px 20px', maxHeight:300, overflowY:'auto' }}>
          <div style={{ fontSize:9.5, fontWeight:800, textTransform:'uppercase', letterSpacing:1,
            color:'var(--t-muted)', marginBottom:10 }}>Seleccionar especialistas</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
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

        {/* Error si no seleccionó nadie */}
        {error && (
          <div style={{ margin:'0 20px', padding:'10px 14px', borderRadius:10,
            background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.25)',
            fontSize:12.5, color:'#EF4444', fontWeight:600, display:'flex', alignItems:'center', gap:7 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:'14px 20px', display:'flex', gap:8,
          borderTop:'1px solid var(--c-border)', marginTop:12, background:'var(--c-surface2)' }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:12, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-secondary)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={busy}
            style={{ flex:2, padding:'10px', borderRadius:12, border:'none',
              background:'#6366F1', color:'white', fontSize:13, fontWeight:700,
              cursor:busy?'not-allowed':'pointer', opacity:busy?.7:1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
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
    <div style={{ position:'fixed', inset:0, zIndex:700, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,15,30,.55)', backdropFilter:'blur(6px)', padding:20 }}>
      <div style={{ background:'var(--c-surface)', borderRadius:24, width:'100%', maxWidth:360,
        padding:'28px 24px', boxShadow:'0 24px 64px rgba(0,0,0,.22)', border:'1px solid var(--c-border)', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:18, background:'rgba(239,68,68,.1)',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', transform:'rotate(8deg)' }}>
          <AlertTriangle size={28} style={{ color:'#EF4444' }}/>
        </div>
        <div style={{ fontSize:17, fontWeight:900, marginBottom:6 }}>¿Retirar especialista?</div>
        <div style={{ fontSize:13, color:'var(--t-muted)', lineHeight:1.6, marginBottom:22 }}>
          Vas a desvincular a <strong style={{ color:'var(--t-primary)' }}>{nombre}</strong> del proyecto.
          Se le notificará automáticamente.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:12, border:'1px solid var(--c-border)',
            background:'var(--c-surface2)', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-secondary)' }}>
            No, mantener</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'10px', borderRadius:12, border:'none',
            background:'#EF4444', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Sí, retirar</button>
        </div>
      </div>
    </div>
  )
}

// ── PopupEliminarIniciativa ────────────────────────────────────────────────
function PopupEliminarIniciativa({ nombre, onConfirm, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:700, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,15,30,.55)', backdropFilter:'blur(6px)', padding:20 }}>
      <div style={{ background:'var(--c-surface)', borderRadius:24, width:'100%', maxWidth:380,
        padding:'28px 24px', boxShadow:'0 24px 64px rgba(0,0,0,.22)', border:'1px solid var(--c-border)', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:18, background:'rgba(239,68,68,.1)',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Trash2 size={28} style={{ color:'#EF4444' }}/>
        </div>
        <div style={{ fontSize:17, fontWeight:900, marginBottom:6 }}>¿Eliminar iniciativa?</div>
        <div style={{ fontSize:13, color:'var(--t-muted)', lineHeight:1.6, marginBottom:22 }}>
          Se eliminará <strong style={{ color:'var(--t-primary)' }}>{nombre}</strong> y se desvinculará
          a todos los especialistas asignados. Se les notificará.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:12, border:'1px solid var(--c-border)',
            background:'var(--c-surface2)', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-secondary)' }}>
            Cancelar</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'10px', borderRadius:12, border:'none',
            background:'#EF4444', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ── PopupFicha proyecto (solo lectura + ficha de iniciativa con editar/eliminar) ─────
function PopupFicha({ proyecto: p, asigData, esIniciativa, onEditar, onEliminar, onClose }) {
  const col     = EST_COLOR[p.estado]||'#888'
  const yaAsig  = (asigData||[]).filter(e=>e.proyectos.some(pp=>pp.id_proyecto===p.id_proyecto))
  return (
    <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,15,30,.55)', backdropFilter:'blur(6px)', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--c-surface)', borderRadius:24, width:'100%', maxWidth:620,
        maxHeight:'88vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,.22)',
        border:'1px solid var(--c-border)' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'26px 28px' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Chip estado={p.estado} small/>
                {p.tipo_proyecto && <TipoBadge tipo={p.tipo_proyecto}/>}
                {p.clasificacion && <TipoBadge tipo={p.clasificacion}/>}
              </div>
              <div style={{ fontSize:21, fontWeight:900, letterSpacing:-.3 }}>{p.nombre}</div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none',
              background:'var(--c-surface2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14}/>
            </button>
          </div>

          {/* Barra progreso */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--t-secondary)' }}>Avance</span>
              <span style={{ fontSize:16, fontWeight:900, color:col, fontFamily:'JetBrains Mono, monospace' }}>{p.avance_pct||0}%</span>
            </div>
            <div style={{ height:8, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${p.avance_pct||0}%`, background:col, borderRadius:99 }}/>
            </div>
          </div>

          {/* Campos según tipo */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', marginBottom:18 }}>
            {p.lider_nombre   && <div><div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:3 }}>Líder</div><div style={{ fontSize:13, fontWeight:600 }}>{p.lider_nombre}</div></div>}
            {p.area_nombre    && <div><div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:3 }}>Área</div><div style={{ fontSize:13, fontWeight:600 }}>{p.area_nombre}</div></div>}
            {p.fecha_inicio   && <div><div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:3 }}>Fecha inicio</div><div style={{ fontSize:13, fontWeight:600 }}>{fmtDate(p.fecha_inicio)}</div></div>}
            {p.fecha_fin      && <div><div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:3 }}>Fecha fin</div><div style={{ fontSize:13, fontWeight:600 }}>{fmtDate(p.fecha_fin)}</div></div>}
            {!esIniciativa && p.costo_est_anual  && <div><div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:3 }}>Costo estimado</div><div style={{ fontSize:13, fontWeight:600 }}>{fmtUSD(p.costo_est_anual)}</div></div>}
            {!esIniciativa && p.costo_ejec_anual && <div><div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:3 }}>Costo ejecutado</div><div style={{ fontSize:13, fontWeight:600 }}>{fmtUSD(p.costo_ejec_anual)}</div></div>}
          </div>

          {p.descripcion && (
            <div style={{ marginBottom:18, padding:'12px 16px', borderRadius:12,
              background:'var(--c-surface2)', border:'1px solid var(--c-border)' }}>
              <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--t-muted)', marginBottom:5 }}>Descripción</div>
              <div style={{ fontSize:13, color:'var(--t-secondary)', lineHeight:1.6 }}>{p.descripcion}</div>
            </div>
          )}

          {/* Equipo asignado */}
          <div style={{ borderTop:'1px solid var(--c-border)', paddingTop:16 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>Equipo asignado ({yaAsig.length})</div>
            {yaAsig.length ? (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
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
              <div style={{ fontSize:12, color:'var(--t-muted)', fontStyle:'italic' }}>Sin especialistas asignados</div>
            )}
          </div>
        </div>

        {/* Footer — acciones según tipo */}
        <div style={{ padding:'14px 28px', background:'var(--c-surface2)', borderTop:'1px solid var(--c-border)',
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          {esIniciativa ? (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onEliminar}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10,
                  border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.06)',
                  color:'#EF4444', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                <Trash2 size={13}/> Eliminar iniciativa
              </button>
              <button onClick={onEditar}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10,
                  border:'1px solid var(--c-border)', background:'var(--c-surface)',
                  color:'var(--t-secondary)', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                <Edit3 size={13}/> Editar
              </button>
            </div>
          ) : <div/>}
          <button onClick={onClose}
            style={{ padding:'9px 24px', borderRadius:12, border:'none',
              background:'#1E293B', color:'white', fontSize:13, fontWeight:800, cursor:'pointer' }}>
            Cerrar ficha
          </button>
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

  const inp = { width:'100%', padding:'11px 14px', borderRadius:12, border:'1.5px solid var(--c-border)',
    background:'var(--c-surface2)', fontSize:13, fontWeight:600, color:'var(--t-primary)',
    outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
    color:'var(--t-muted)', display:'block', marginBottom:6 }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:700, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,15,30,.55)', backdropFilter:'blur(6px)', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--c-surface)', borderRadius:24, width:'100%', maxWidth:480,
        overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.22)', border:'1px solid var(--c-border)' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'26px 26px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'rgba(99,102,241,.1)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Edit3 size={18} style={{ color:'#6366F1' }}/>
              </div>
              <div style={{ fontSize:17, fontWeight:900 }}>Editar iniciativa</div>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none',
              background:'var(--c-surface2)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
              <X size={14}/>
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={lbl}>Nombre *</label>
              <input value={form.nombre} onChange={e=>set('nombre',e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)}
                rows={3} style={{ ...inp, resize:'none' }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={lbl}>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} style={inp}/></div>
              <div><label style={lbl}>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={e=>set('fecha_fin',e.target.value)} style={inp}/></div>
            </div>
            {/* Estado */}
            <div>
              <label style={lbl}>Estado de la iniciativa</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { v:'sin_iniciar', l:'Sin iniciar', bg:'rgba(107,114,128,.1)', col:'#6B7280' },
                  { v:'activo',      l:'En curso',    bg:'rgba(16,185,129,.1)', col:'#10B981' },
                  { v:'pausado',     l:'Pausado',     bg:'rgba(249,115,22,.1)', col:'#F97316' },
                  { v:'cerrado',     l:'Finalizado',  bg:'rgba(99,102,241,.1)', col:'#6366F1' },
                ].map(opt=>(
                  <button key={opt.v} onClick={()=>set('estado',opt.v)}
                    style={{ padding:'7px 14px', borderRadius:9, border:`2px solid ${form.estado===opt.v?opt.col:'var(--c-border)'}`,
                      background:form.estado===opt.v?opt.bg:'transparent',
                      color:form.estado===opt.v?opt.col:'var(--t-muted)',
                      fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {form.estado==='cerrado'&&(
                <div style={{ fontSize:11.5, color:'#6366F1', marginTop:8, padding:'7px 11px',
                  borderRadius:9, background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)' }}>
                  ✅ Al guardar como <strong>Finalizado</strong> la iniciativa dejará de aparecer en la lista activa.
                </div>
              )}
            </div>
          </div>
          {err && <div style={{ color:'#EF4444', fontSize:12, marginTop:10, fontWeight:600 }}>❌ {err}</div>}
        </div>
        <div style={{ padding:'14px 26px', display:'flex', gap:10, background:'var(--c-surface2)', borderTop:'1px solid var(--c-border)' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:14, border:'none',
            background:'transparent', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-muted)' }}>
            Cancelar</button>
          <button onClick={submit} disabled={!form.nombre.trim()||busy}
            style={{ flex:2, padding:'11px', borderRadius:14, border:'none',
              background:form.nombre.trim()?'#6366F1':'var(--c-border)',
              color:'white', fontSize:13, fontWeight:800,
              cursor:!form.nombre.trim()||busy?'not-allowed':'pointer', opacity:busy?.7:1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
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

  const inp = { width:'100%', padding:'11px 14px', borderRadius:12, border:'1.5px solid var(--c-border)',
    background:'var(--c-surface2)', fontSize:13, fontWeight:600, color:'var(--t-primary)',
    outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color .15s' }
  const lbl = { fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
    color:'var(--t-muted)', display:'block', marginBottom:6 }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,15,30,.55)', backdropFilter:'blur(6px)', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--c-surface)', borderRadius:28, width:'100%', maxWidth:480,
        overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.22)', border:'1px solid var(--c-border)' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'26px 26px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'rgba(99,102,241,.12)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Star size={22} style={{ color:'#6366F1' }}/>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none',
              background:'var(--c-surface2)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
              <X size={14}/>
            </button>
          </div>
          <div style={{ fontSize:20, fontWeight:900, marginBottom:4 }}>Nueva iniciativa interna</div>
          <div style={{ fontSize:12.5, color:'var(--t-muted)', marginBottom:22 }}>
            Solo visible para tu área. Asigna responsables libremente.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={lbl}>Nombre *</label>
              <input autoFocus value={form.nombre} onChange={e=>set('nombre',e.target.value)}
                placeholder="Ej: Optimización de reportes internos..." style={inp}/>
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)}
                rows={3} placeholder="Describe el objetivo..." style={{ ...inp, resize:'none' }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={lbl}>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} style={inp}/></div>
              <div><label style={lbl}>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={e=>set('fecha_fin',e.target.value)} style={inp}/></div>
            </div>
          </div>
          {err && <div style={{ color:'#EF4444', fontSize:12, marginTop:10, fontWeight:600 }}>❌ {err}</div>}
        </div>
        <div style={{ padding:'14px 26px', display:'flex', gap:10, background:'var(--c-surface2)', borderTop:'1px solid var(--c-border)' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:14, border:'none',
            background:'transparent', fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--t-muted)' }}>
            Cancelar</button>
          <button onClick={submit} disabled={!form.nombre.trim()||busy}
            style={{ flex:2, padding:'11px', borderRadius:14, border:'none',
              background:form.nombre.trim()?'#6366F1':'var(--c-border)',
              color:'white', fontSize:13, fontWeight:800,
              cursor:!form.nombre.trim()||busy?'not-allowed':'pointer', opacity:busy?.7:1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
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
      <div
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{ borderRadius:14, overflow:'hidden', transition:'all .18s ease',
          background: hovered ? `${tipoCol}04` : 'var(--c-surface)',
          border:`1px solid ${hovered?tipoCol+'45':'var(--c-border)'}`,
          boxShadow: hovered ? `0 4px 20px ${tipoCol}14` : 'none' }}>

        {/* Zona info del proyecto */}
        <div style={{ display:'flex', alignItems:'center', padding:'13px 16px 13px 0', gap:0 }}>
          {/* Barra lateral color */}
          <div style={{ width:4, alignSelf:'stretch', flexShrink:0, minHeight:36,
            background: tipoCol, marginRight:14, borderRadius:'0 0 0 0' }}/>

          {/* Info — clickable */}
          <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={onVerFicha}>
            {/* Nombre + badges */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
              <span style={{ fontSize:14.5, fontWeight:900, color: hovered ? tipoCol : 'var(--t-primary)',
                transition:'color .15s' }}>{p.nombre}</span>
              <Chip estado={p.estado} small/>
              {p.clasificacion && <TipoBadge tipo={p.clasificacion}/>}
            </div>
            {/* Descripción */}
            {p.descripcion && (
              <div style={{ fontSize:12, color:'var(--t-muted)', marginBottom:8,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'88%' }}>
                {p.descripcion}
              </div>
            )}
            {/* Barra progreso */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:160, flexShrink:0, height:6, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${p.avance_pct||0}%`, background:tipoCol,
                  borderRadius:99, transition:'width .6s ease' }}/>
              </div>
              <span style={{ fontSize:12, fontWeight:900, color:tipoCol,
                fontFamily:'JetBrains Mono, monospace', flexShrink:0 }}>
                {p.avance_pct||0}%
              </span>
            </div>
          </div>

          {/* Botón asignar */}
          <div style={{ flexShrink:0, paddingRight:16 }} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setPopupAsig(true)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer',
                border:`1px solid ${hovered?'rgba(99,102,241,.5)':'rgba(99,102,241,.3)'}`,
                background: hovered?'rgba(99,102,241,.12)':'rgba(99,102,241,.06)',
                color:'#6366F1', transition:'all .15s', whiteSpace:'nowrap' }}>
              <UserPlus size={13}/>
              Asignar especialista{yaAsig.length>0?` (${yaAsig.length})`:' '}
            </button>
          </div>
        </div>

        {/* Separador + especialistas asignados */}
        {tieneAsig && (
          <>
            <div style={{ height:1, background: hovered ? `${tipoCol}30` : 'var(--c-border)',
              marginLeft:18, transition:'background .18s' }}/>
            <div style={{ padding:'10px 16px 12px 18px', display:'flex',
              alignItems:'center', flexWrap:'wrap', gap:7 }}>
              {/* Avatares apilados */}
              <div style={{ display:'flex', marginRight:4 }}>
                {yaAsig.slice(0,4).map((e,i)=>(
                  <div key={e.id} style={{ width:28, height:28, borderRadius:'50%',
                    marginLeft:i?-9:0, zIndex:yaAsig.length-i, flexShrink:0,
                    background:`linear-gradient(135deg,${tipoCol}88,${tipoCol})`,
                    border:'2px solid var(--c-surface)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:800, color:'white' }}>
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
              {/* Chips */}
              {yaAsig.map(e=>(
                <div key={e.id}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px 4px 8px',
                    borderRadius:8, background:'var(--c-surface2)', border:'1px solid var(--c-border)',
                    transition:'border-color .15s' }}
                  onMouseEnter={el=>el.currentTarget.style.borderColor=tipoCol+'50'}
                  onMouseLeave={el=>el.currentTarget.style.borderColor='var(--c-border)'}>
                  <div style={{ width:22, height:22, borderRadius:6,
                    background:`${tipoCol}18`, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:9.5, fontWeight:800, color:tipoCol }}>
                    {e.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--t-secondary)', whiteSpace:'nowrap' }}>
                    {e.nombre.split(' ').slice(0,2).join(' ')}
                  </span>
                  <button onClick={ev=>{ev.stopPropagation();setConfirmRetiro(e)}}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', padding:0, color:'#CBD5E1', transition:'color .15s' }}
                    onMouseEnter={el=>el.currentTarget.style.color='#EF4444'}
                    onMouseLeave={el=>el.currentTarget.style.color='#CBD5E1'}>
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
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h3 style={{ fontSize:18, fontWeight:900 }}>Proyectos</h3>
          <p style={{ fontSize:12.5, color:'var(--t-muted)', marginTop:4 }}>
            Haz clic en un proyecto para ver su ficha completa
          </p>
        </div>
        <button onClick={()=>setModalNueva(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
            borderRadius:11, border:'none', background:'#6366F1', color:'white',
            fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,.35)' }}>
          <Plus size={15}/> Nueva iniciativa
        </button>
      </div>

      {/* Secciones acordeón */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {secciones.map(sec => {
          const isOpen = expanded[sec.id]
          const pal    = OFC_PALETTE[sec.paletteIdx % OFC_PALETTE.length]

          return (
            <div key={sec.id} style={{ background:'var(--c-surface)', borderRadius:20,
              border:`1px solid ${isOpen?pal.bg+'30':'var(--c-border)'}`,
              overflow:'hidden', transition:'border-color .2s, box-shadow .2s',
              boxShadow:isOpen?`0 4px 24px ${pal.bg}12`:'none' }}>

              {/* Header sección */}
              <button onClick={()=>setExpanded(p=>({...p,[sec.id]:!p[sec.id]}))}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'17px 22px', background:isOpen?`${pal.bg}08`:'var(--c-surface)',
                  border:'none', cursor:'pointer', transition:'background .15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:50, height:50, borderRadius:16, background:pal.bg,
                    flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:`0 6px 16px ${pal.bg}50` }}>
                    {sec.esIniciativa ? <Star size={23} style={{ color:'white' }}/> : <Folder size={23} style={{ color:'white' }}/>}
                  </div>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:16.5, fontWeight:900 }}>{sec.nombre}</span>
                      <span style={{ padding:'2px 10px', borderRadius:99, fontSize:11.5, fontWeight:800,
                        background:pal.light, color:pal.bg, border:`1px solid ${pal.bg}30` }}>
                        {sec.proyectos.length}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>{sec.descripcion}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9.5, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'var(--t-muted)' }}>Estado</div>
                    <div style={{ fontSize:12, fontWeight:800, color:'#10B981' }}>Activa</div>
                  </div>
                  {isOpen ? <ChevronUp size={20} style={{ color:'var(--t-muted)' }}/> : <ChevronDown size={20} style={{ color:'var(--t-muted)' }}/>}
                </div>
              </button>

              {/* Lista proyectos */}
              {isOpen && (
                <div style={{ padding:'8px 22px 22px' }}>
                  {!sec.proyectos.length ? (
                    <div style={{ textAlign:'center', padding:'32px 0', borderRadius:14,
                      border:'2px dashed var(--c-border)', background:`${pal.bg}04`, marginTop:10 }}>
                      <div style={{ fontSize:13, color:'var(--t-muted)', fontStyle:'italic' }}>
                        {sec.esIniciativa
                          ? <span>Aún no has creado iniciativas internas.<br/>Usa el botón <strong>"Nueva iniciativa"</strong> para comenzar.</span>
                          : 'Sin proyectos activos en esta oficina.'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
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
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:800 }}>Asignaciones del equipo</h3>
          <p style={{ fontSize:12.5, color:'var(--t-muted)', marginTop:4 }}>
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

      {/* Buscador */}
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
            boxSizing:'border-box', transition:'border-color .15s',
            fontFamily:'inherit' }}
          onFocus={e=>e.target.style.borderColor='#6366F1'}
          onBlur={e=>e.target.style.borderColor='var(--c-border)'}
        />
        {buscar && (
          <button onClick={()=>setBuscar('')}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              width:22, height:22, borderRadius:'50%', border:'none',
              background:'var(--c-surface2)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--t-muted)' }}>
            <X size={11}/>
          </button>
        )}
      </div>

      {/* Sin resultados */}
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

      {/* Lista de especialistas */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtrado.map(esp => {
          const totalMins = esp.proyectos.reduce((s,p) => s + (p.mins_invertidos||0), 0)
          const initials  = esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')

          return (
            <div key={esp.id} style={{ borderRadius:16, border:'1px solid var(--c-border)',
              overflow:'hidden', background:'var(--c-surface)',
              boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>

              {/* Header especialista */}
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
                background:'linear-gradient(135deg, rgba(99,102,241,.04), rgba(99,102,241,.02))',
                borderBottom: esp.proyectos.length ? '1px solid var(--c-border)' : 'none' }}>
                <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                  background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(99,102,241,.12))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:15, fontWeight:900, color:'#6366F1',
                  border:'1px solid rgba(99,102,241,.2)' }}>
                  {initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14.5, fontWeight:800 }}>{esp.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {esp.oficio || '—'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                  {/* Total horas */}
                  {totalMins > 0 && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase',
                        letterSpacing:.8, color:'var(--t-muted)', marginBottom:1 }}>Total invertido</div>
                      <div style={{ fontSize:15, fontWeight:900, color:'#6366F1',
                        fontFamily:'JetBrains Mono, monospace' }}>{fmtMins(totalMins)}</div>
                    </div>
                  )}
                  {/* Badge proyectos */}
                  <div style={{ padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:800,
                    background: esp.proyectos.length ? 'rgba(99,102,241,.1)' : 'var(--c-surface2)',
                    color: esp.proyectos.length ? '#6366F1' : 'var(--t-muted)',
                    border:`1px solid ${esp.proyectos.length?'rgba(99,102,241,.2)':'var(--c-border)'}`,
                    display:'flex', alignItems:'center', alignSelf:'center' }}>
                    {esp.proyectos.length} proy.
                  </div>
                </div>
              </div>

              {/* Proyectos del especialista */}
              {esp.proyectos.length > 0 ? (
                <div style={{ padding:'12px 20px 16px',
                  display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:10 }}>
                  {esp.proyectos.map(p => {
                    const isIniciativa = p.alcance_visibilidad === 'equipo'
                    const tipoCol = {
                      continuidad_operativa:'#10B981', estrategico:'#6366F1',
                      operativo:'#F97316', innovacion:'#EF4444'
                    }[p.clasificacion] || (isIniciativa ? '#6366F1' : '#6B7280')
                    const estadoCol = EST_COLOR[p.estado] || '#888'

                    return (
                      <div key={p.id_proyecto}
                        style={{ padding:'12px 14px', borderRadius:12,
                          background:'var(--c-surface2)',
                          border:`1px solid ${p.mins_invertidos>0?tipoCol+'25':'var(--c-border)'}`,
                          transition:'border-color .15s, box-shadow .15s' }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor=tipoCol+'50'; e.currentTarget.style.boxShadow=`0 2px 12px ${tipoCol}15` }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=p.mins_invertidos>0?tipoCol+'25':'var(--c-border)'; e.currentTarget.style.boxShadow='none' }}>

                        {/* Nombre proyecto */}
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

                        {/* Meta */}
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

                        {/* Barra progreso */}
                        <div style={{ marginBottom:10 }}>
                          <div style={{ height:4, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${p.avance_pct||0}%`,
                              background:estadoCol, borderRadius:99 }}/>
                          </div>
                        </div>

                        {/* Horas invertidas — protagonista */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase',
                            letterSpacing:.7, color:'var(--t-muted)' }}>Tiempo invertido</div>
                          <div style={{
                            fontSize:16, fontWeight:900,
                            fontFamily:'JetBrains Mono, monospace',
                            color: p.mins_invertidos > 0 ? tipoCol : 'var(--t-muted)',
                          }}>
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
                <div style={{ padding:'14px 20px', color:'var(--t-muted)', fontSize:12.5,
                  fontStyle:'italic' }}>
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
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -.4 }}>Administración</h2>
        <p style={{ fontSize: 13, color: 'var(--t-muted)', marginTop: 3 }}>
          Gestión de períodos y proyectos del equipo
        </p>
      </div>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'sprints'      && <TabSprints />}
      {tab === 'periodos'     && <TabPeriodos />}
      {tab === 'proyectos'    && <TabProyectos />}
      {tab === 'asignaciones' && <TabAsignaciones />}
    </div>
  )
}
