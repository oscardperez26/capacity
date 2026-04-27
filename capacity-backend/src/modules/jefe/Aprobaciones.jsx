import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { AREAS_DATA } from '../../data/mockData'
import { MODEL_BADGE } from '../../data/categories'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const MOCK_ACTS = {
  esp1: [
    { id: 'a1', cat: 'OPERACIÓN',  sub: 'Incidentes',              model: 'RUN',   time: '120 min', desc: 'Atención INC-9902 fallo red' },
    { id: 'a2', cat: 'GESTIÓN',    sub: 'Reuniones internas',      model: 'ADMIN', time: '60 min',  desc: 'Sync semanal del equipo' },
    { id: 'a3', cat: 'PROYECTOS',  sub: 'Proyectos estratégicos',  model: 'BUILD', time: '300 min', desc: 'Avance módulo autenticación — detalle técnico completo' },
  ],
  esp2: [
    { id: 'a4', cat: 'OPERACIÓN',  sub: 'Monitoreo',               model: 'RUN',   time: '240 min', desc: 'Monitoreo red 24/7' },
    { id: 'a5', cat: 'GESTIÓN',    sub: 'Reportes e informes',     model: 'ADMIN', time: '90 min',  desc: 'Informe mensual' },
  ],
  esp3: [
    { id: 'a6', cat: 'OPERACIÓN',  sub: 'Cambios',                 model: 'RUN',   time: '180 min', desc: 'CHG-441 ventana mantenimiento' },
  ],
}

const PREV_REJECTED = [
  {
    id: 'pa1', esp: 'esp1', cat: 'PROYECTOS', sub: 'Proyectos estratégicos', model: 'BUILD', time: '300 min',
    rejectedAt: 'Lun 10 Feb', rejComment: 'Falta descripción técnica detallada del avance',
    corrected: true, correctedAt: 'Mar 11 Feb',
    correctedDesc: 'Se agregó diseño de arquitectura y métricas del módulo de autenticación biométrica',
    finalStatus: 'aprobado', approvedBy: 'Carlos Ramírez', approvedAt: 'Mar 11 Feb',
  },
  {
    id: 'pa2', esp: 'esp2', cat: 'GESTIÓN', sub: 'Tareas administrativas', model: 'ADMIN', time: '120 min',
    rejectedAt: 'Mié 12 Feb', rejComment: 'Tiempo excesivo sin justificación',
    corrected: false, correctedAt: null, correctedDesc: null,
    finalStatus: 'pendiente_correccion', approvedBy: null, approvedAt: null,
  },
]

export default function Aprobaciones({ user }) {
  const areaKey = user?.area ?? 'infraestructura'
  const areaData = AREAS_DATA[areaKey]
  const especialistas = areaData?.especialistas ?? []

  const [sel, setSel] = useState(null)
  const [showRej, setShowRej] = useState(null)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [rejCmt, setRejCmt] = useState('')
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('success')
  const [actStatus, setActStatus] = useState({})

  const showToastMsg = (msg, type = 'success') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(null), 2500)
  }

  const approve = (actId) => {
    setActStatus(p => ({ ...p, [`${sel.id}-${actId}`]: { status: 'aprobado', at: new Date().toLocaleTimeString() } }))
    showToastMsg('Actividad aprobada')
  }

  const reject = (actId) => {
    if (!rejCmt.trim()) return
    setActStatus(p => ({ ...p, [`${sel.id}-${actId}`]: { status: 'rechazado', comment: rejCmt, at: new Date().toLocaleTimeString() } }))
    showToastMsg('Actividad rechazada', 'danger')
    setShowRej(null); setRejCmt('')
  }

  const getActSt = (actId) => actStatus[`${sel?.id}-${actId}`] ?? { status: 'pendiente' }

  const getEspStatus = (espId) => {
    const acts = MOCK_ACTS[espId] ?? []
    const statuses = acts.map(a => actStatus[`${espId}-${a.id}`]?.status ?? 'pendiente')
    if (statuses.every(s => s === 'aprobado')) return 'aprobado'
    if (statuses.some(s => s === 'rechazado')) return 'rechazado'
    return 'pendiente'
  }

  const filterBtns = [
    { id: 'todos', label: 'Todos', count: especialistas.length },
    { id: 'pendiente', label: 'Pendiente', count: especialistas.filter(e => getEspStatus(e.id) === 'pendiente').length },
    { id: 'aprobado', label: 'Aprobado', count: especialistas.filter(e => getEspStatus(e.id) === 'aprobado').length },
    { id: 'rechazado', label: 'Rechazado', count: especialistas.filter(e => getEspStatus(e.id) === 'rechazado').length },
    { id: 'corregido', label: 'Corregido', count: PREV_REJECTED.filter(pr => pr.corrected && pr.finalStatus !== 'aprobado').length },
  ]

  const filteredEsp = especialistas.filter(e => {
    if (filterStatus === 'todos') return true
    if (filterStatus === 'corregido') return PREV_REJECTED.some(pr => pr.esp === e.id && pr.corrected && pr.finalStatus !== 'aprobado')
    return getEspStatus(e.id) === filterStatus
  })

  const acts = sel ? MOCK_ACTS[sel.id] ?? [] : []
  const prevRejByEsp = sel ? PREV_REJECTED.filter(pr => pr.esp === sel.id) : []

  const stCfg = {
    aprobado:  { cls: 'badge-green', label: 'Aprobado' },
    rechazado: { cls: 'badge-red',   label: 'Rechazado' },
    pendiente: { cls: 'badge-amber', label: 'Pendiente' },
  }

  return (
    <div style={{ position: 'relative' }}>
      <Toast message={toast} type={toastType} />

      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Aprobaciones</h2>
          <p className="sec-sub">Área: {areaData?.label} · Sprint 5</p>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filterBtns.map(f => (
          <button key={f.id} onClick={() => setFilterStatus(f.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 9.5, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', transition: 'all .2s', background: filterStatus === f.id ? 'var(--c-accent)' : 'transparent', borderColor: filterStatus === f.id ? 'var(--c-accent)' : 'var(--c-border2)', color: filterStatus === f.id ? 'white' : 'var(--t-secondary)' }}>
            {f.label}
            <span style={{ background: filterStatus === f.id ? 'rgba(255,255,255,0.25)' : 'var(--c-surface2)', borderRadius: 99, padding: '1px 5px', fontSize: 8.5, fontWeight: 800 }}>{f.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 12 }}>
        {/* Left list */}
        <div>
          {filteredEsp.map(e => {
            const st = getEspStatus(e.id)
            const hasCorrected = PREV_REJECTED.some(pr => pr.esp === e.id && pr.corrected)
            return (
              <button key={e.id} className={`appr-card ${sel?.id === e.id ? 'sel' : ''}`} onClick={() => setSel(e)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={`badge ${stCfg[st]?.cls ?? 'badge-gray'}`}>{stCfg[st]?.label ?? 'Pendiente'}</span>
                  {hasCorrected && <span className="badge badge-teal" style={{ fontSize: 7 }}>↩ Corregido</span>}
                </div>
                <div className="appr-name">{e.name}</div>
                <div className="appr-meta">{e.cargo} · Sprint 5</div>
              </button>
            )
          })}
          {filteredEsp.length === 0 && <div className="empty-state" style={{ margin: '8px 0' }}><p>Sin resultados</p></div>}
        </div>

        {/* Right detail */}
        <div>
          {sel ? (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid var(--c-border)', paddingBottom: 13 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 900 }}>{sel.name}</h3>
                    <p style={{ fontSize: 9, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: .4, marginTop: 2 }}>Sprint 5 · {sel.cargo}</p>
                  </div>
                  <Button className="btn-success btn-sm" onClick={() => { acts.forEach(a => approve(a.id)); showToastMsg('Todas las actividades aprobadas') }}>
                    <Check size={11} /> Aprobar todo
                  </Button>
                </div>

                <h4 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--t-muted)', marginBottom: 10 }}>Actividades Sprint Actual</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {acts.map(act => {
                    const st = getActSt(act.id)
                    return (
                      <div key={act.id} style={{ padding: '12px 14px', background: st.status === 'aprobado' ? 'var(--c-success-bg)' : st.status === 'rechazado' ? 'var(--c-danger-bg)' : 'var(--c-surface2)', borderRadius: 9, border: `1px solid ${st.status === 'aprobado' ? 'rgba(48,105,59,0.2)' : st.status === 'rechazado' ? 'rgba(153,44,38,0.15)' : 'var(--c-border)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'all .3s' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span className={`badge ${MODEL_BADGE[act.model] ?? 'badge-gray'}`}>{act.model}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 700 }}>{act.sub}</span>
                            <span style={{ fontSize: 8.5, color: 'var(--t-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{act.cat}</span>
                          </div>
                          <p style={{ fontSize: 9.5, color: 'var(--t-muted)', fontStyle: 'italic' }}>{act.desc}</p>
                          {st.status === 'rechazado' && <p style={{ fontSize: 8.5, color: 'var(--c-danger2)', fontWeight: 700, marginTop: 3 }}>✕ {st.comment}</p>}
                          {st.status === 'aprobado' && <p style={{ fontSize: 8.5, color: 'var(--c-success)', fontWeight: 700, marginTop: 3 }}>✓ Aprobado a las {st.at}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 11, marginTop: 6 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700 }}>{act.time}</span>
                          {st.status === 'pendiente' && <>
                            <Button className="btn-success btn-sm btn-icon" style={{ padding: 6 }} onClick={() => approve(act.id)}><Check size={12} /></Button>
                            <Button className="btn-danger btn-sm btn-icon" style={{ padding: 6 }} onClick={() => setShowRej(act.id)}><X size={12} /></Button>
                          </>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Previous rejections */}
              {prevRejByEsp.length > 0 && (
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--t-muted)', marginBottom: 12 }}>Historial de Rechazos / Correcciones</h4>
                  {prevRejByEsp.map(pr => (
                    <div key={pr.id} style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid var(--c-border)', marginBottom: 8, background: 'var(--c-surface2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className={`badge ${MODEL_BADGE[pr.model] ?? 'badge-gray'}`}>{pr.model}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700 }}>{pr.sub}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {pr.corrected ? <span className="badge badge-teal">↩ Corregido</span> : <span className="badge badge-red">Sin corrección</span>}
                          {pr.finalStatus === 'aprobado' && <span className="badge badge-green">✓ Aprobado</span>}
                          {pr.finalStatus === 'pendiente_correccion' && <span className="badge badge-amber">Pendiente</span>}
                        </div>
                      </div>
                      <div style={{ padding: '7px 10px', background: 'var(--c-danger-bg)', borderRadius: 7, marginBottom: pr.corrected ? 6 : 0 }}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--c-danger2)', marginBottom: 2 }}>✕ Rechazado el {pr.rejectedAt}</div>
                        <p style={{ fontSize: 9.5, color: 'var(--c-danger2)', fontStyle: 'italic' }}>{pr.rejComment}</p>
                      </div>
                      {pr.corrected && (
                        <div style={{ padding: '7px 10px', background: 'var(--c-success-bg)', borderRadius: 7, marginBottom: 6 }}>
                          <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--c-success)', marginBottom: 2 }}>↩ Corregido el {pr.correctedAt}</div>
                          <p style={{ fontSize: 9.5, color: 'var(--c-success)', fontStyle: 'italic' }}>{pr.correctedDesc}</p>
                        </div>
                      )}
                      {pr.finalStatus === 'aprobado' && (
                        <div style={{ padding: '5px 10px', background: 'rgba(48,105,59,0.06)', borderRadius: 7, fontSize: 8.5, color: 'var(--c-success)', fontWeight: 600 }}>
                          ✓ Aprobado por {pr.approvedBy} el {pr.approvedAt}
                        </div>
                      )}
                      {pr.corrected && pr.finalStatus === 'pendiente_correccion' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          <Button className="btn-success btn-sm" onClick={() => showToastMsg('Corrección aprobada')}><Check size={11} /> Aprobar corrección</Button>
                          <Button className="btn-danger btn-sm" onClick={() => showToastMsg('Rechazado nuevamente', 'danger')}><X size={11} /> Rechazar de nuevo</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state">
                <div className="empty-ico" style={{ opacity: .22 }}>
                  <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p>Selecciona un especialista para revisar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <Modal open={!!showRej} onClose={() => setShowRej(null)} iconCls="mi-d" icon={<X size={26} />} title="Rechazar actividad" desc="El comentario es obligatorio para notificar al especialista.">
        <textarea
          style={{ width: '100%', padding: '9px 12px', background: 'var(--c-surface2)', border: '1.5px solid var(--c-border2)', borderRadius: 9, fontSize: 11.5, resize: 'none', color: 'var(--t-primary)', fontFamily: 'Outfit, sans-serif', marginBottom: 14 }}
          rows={3} placeholder="Motivo del rechazo..." value={rejCmt} onChange={e => setRejCmt(e.target.value)} />
        <div className="modal-actions">
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowRej(null); setRejCmt('') }}>Cancelar</Button>
          <Button className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} disabled={!rejCmt.trim()} onClick={() => reject(showRej)}>Rechazar</Button>
        </div>
      </Modal>
    </div>
  )
}
