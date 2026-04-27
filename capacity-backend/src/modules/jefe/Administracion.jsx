import { useState } from 'react'
import { Unlock, Briefcase, Plus, UserCheck, Check } from 'lucide-react'
import { AREAS_DATA, PROJECTS_BY_AREA } from '../../data/mockData'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

export default function Administracion({ user }) {
  const areaKey = user?.area ?? 'infraestructura'
  const areaData = AREAS_DATA[areaKey]
  const especialistas = areaData?.especialistas ?? []

  const [tab, setTab] = useState('periodos')
  const [granted, setGranted] = useState({})
  const [modal, setModal] = useState(null)
  const [newProjName, setNewProjName] = useState('')
  const [newProjType, setNewProjType] = useState('estrategico')
  const [areaProjects, setAreaProjects] = useState(PROJECTS_BY_AREA[areaKey] ?? [])
  const [assignments, setAssignments] = useState(() => {
    const init = {}
    ;(PROJECTS_BY_AREA[areaKey] ?? []).forEach(p => { init[p.id] = p.assignedTo ?? [] })
    return init
  })
  const [assignModal, setAssignModal] = useState(null)
  const [selEspsForProject, setSelEspsForProject] = useState([])
  const [selPeriodType, setSelPeriodType] = useState('Sprint')

  const openAssign = (projId) => {
    setSelEspsForProject(assignments[projId] ?? [])
    setAssignModal(projId)
  }
  const toggleEspAssign = (espId) =>
    setSelEspsForProject(prev => prev.includes(espId) ? prev.filter(x => x !== espId) : [...prev, espId])
  const saveAssign = () => {
    setAssignments(prev => ({ ...prev, [assignModal]: selEspsForProject }))
    setAssignModal(null)
  }

  const assignedProj = assignModal ? areaProjects.find(p => p.id === assignModal) : null

  return (
    <div>
      <div className="sec-hdr">
        <h2 className="sec-title">Administración — {areaData?.label}</h2>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        {[{ id: 'periodos', label: 'Períodos', Icon: Unlock }, { id: 'proyectos', label: 'Proyectos', Icon: Briefcase }].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Períodos */}
      {tab === 'periodos' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.3, color: 'var(--t-muted)', marginBottom: 12 }}>Habilitar edición de períodos cerrados</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['Sprint', 'Semana', 'Día específico'].map(pt => (
                <button key={pt} onClick={() => setSelPeriodType(pt)}
                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', transition: 'all .2s', background: selPeriodType === pt ? 'var(--c-accent)' : 'transparent', borderColor: selPeriodType === pt ? 'var(--c-accent)' : 'var(--c-border2)', color: selPeriodType === pt ? 'white' : 'var(--t-secondary)' }}>
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {especialistas.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < especialistas.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--c-accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: 'var(--c-accent)' }}>{e.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>{e.name}</div>
                  <div style={{ fontSize: 8.5, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: .4, marginTop: 2 }}>{e.cargo}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {selPeriodType === 'Sprint' && (
                  <select style={{ padding: '5px 10px', background: 'var(--c-surface2)', border: '1.5px solid var(--c-border2)', borderRadius: 7, fontSize: 10.5, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer' }}>
                    <option>Sprint 5</option><option>Sprint 4</option><option>Sprint 3</option>
                  </select>
                )}
                {selPeriodType === 'Semana' && (
                  <select style={{ padding: '5px 10px', background: 'var(--c-surface2)', border: '1.5px solid var(--c-border2)', borderRadius: 7, fontSize: 10.5, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer' }}>
                    <option>S5 — Semana 1</option><option>S5 — Semana 2</option><option>S4 — Semana 1</option>
                  </select>
                )}
                {selPeriodType === 'Día específico' && (
                  <input type="date" style={{ padding: '5px 10px', background: 'var(--c-surface2)', border: '1.5px solid var(--c-border2)', borderRadius: 7, fontSize: 10.5, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer' }} />
                )}
                {granted[e.id] ? (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--c-success)', background: 'var(--c-success-bg)', padding: '4px 11px', borderRadius: 7 }}>✓ Acceso concedido</span>
                ) : (
                  <Button className="btn-primary btn-sm" onClick={() => setGranted(p => ({ ...p, [e.id]: true }))}>
                    <Unlock size={11} /> Conceder
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proyectos */}
      {tab === 'proyectos' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.3, color: 'var(--t-muted)' }}>Proyectos del área — {areaData?.label}</h3>
              <Button className="btn-primary btn-sm" onClick={() => setModal('new_project')}><Plus size={11} /> Nuevo Proyecto</Button>
            </div>

            {areaProjects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--c-surface2)', borderRadius: 9, border: '1px solid var(--c-border)', marginBottom: 7 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.name}</div>
                  <div style={{ fontSize: 8.5, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: .4, marginTop: 2 }}>{p.type} · {p.area}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                    {(assignments[p.id] ?? []).length === 0
                      ? <span style={{ fontSize: 8.5, color: 'var(--t-muted)', fontStyle: 'italic' }}>Sin asignados</span>
                      : (assignments[p.id] ?? []).map(espId => {
                        const e = especialistas.find(x => x.id === espId)
                        return e ? <span key={espId} style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'var(--c-accent3)', color: 'var(--c-accent)' }}>{e.name.split(' ')[0]}</span> : null
                      })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className={`badge ${p.type === 'estrategico' ? 'badge-accent' : 'badge-blue'}`}>{p.type}</span>
                  <Button className="btn-ghost btn-sm" onClick={() => openAssign(p.id)}><UserCheck size={11} /> Asignar</Button>
                </div>
              </div>
            ))}
            {areaProjects.length === 0 && <div className="empty-state"><p>Sin proyectos creados para esta área</p></div>}
          </div>

          {/* Per-specialist summary */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.3, color: 'var(--t-muted)', marginBottom: 12 }}>Asignación por especialista</h3>
            {especialistas.map((e, i) => {
              const myProjects = areaProjects.filter(p => (assignments[p.id] ?? []).includes(e.id))
              return (
                <div key={e.id} style={{ padding: '11px 0', borderBottom: i < especialistas.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 7 }}>
                    {e.name}<span style={{ fontSize: 8.5, color: 'var(--t-muted)', marginLeft: 7, textTransform: 'uppercase', letterSpacing: .4 }}>{e.cargo}</span>
                  </div>
                  {myProjects.length === 0
                    ? <span style={{ fontSize: 9.5, color: 'var(--t-muted)', fontStyle: 'italic' }}>Sin proyectos asignados</span>
                    : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {myProjects.map(p => (
                        <span key={p.id} style={{ padding: '3px 9px', borderRadius: 99, fontSize: 8.5, fontWeight: 700, background: p.type === 'estrategico' ? 'var(--c-accent3)' : 'rgba(62,93,157,0.1)', color: p.type === 'estrategico' ? 'var(--c-accent)' : 'var(--brand-blue)', border: `1px solid ${p.type === 'estrategico' ? 'rgba(51,40,154,0.15)' : 'rgba(62,93,157,0.2)'}` }}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New project modal */}
      <Modal open={modal === 'new_project'} onClose={() => setModal(null)} iconCls="mi-i" icon={<Briefcase size={24} />} title="Nuevo Proyecto">
        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <div className="form-grp"><label className="form-lbl">Nombre del proyecto</label><input className="form-inp" placeholder="Ej: Migración SAP S/4HANA" value={newProjName} onChange={e => setNewProjName(e.target.value)} /></div>
          <div className="form-grp">
            <label className="form-lbl">Tipo</label>
            <select className="form-inp" value={newProjType} onChange={e => setNewProjType(e.target.value)}>
              <option value="estrategico">Estratégico</option>
              <option value="operativo">Operativo / Continuidad</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancelar</Button>
          <Button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!newProjName.trim()} onClick={() => {
            const newP = { id: 'p' + Date.now(), name: newProjName, type: newProjType, area: areaData?.label, assignedTo: [] }
            setAreaProjects(p => [...p, newP])
            setAssignments(prev => ({ ...prev, [newP.id]: [] }))
            setModal(null); setNewProjName('')
          }}>Crear</Button>
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} iconCls="mi-i" icon={<UserCheck size={24} />} title="Asignar especialistas" wide>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--t-secondary)', marginBottom: 12 }}>
          Proyecto: <strong>{assignedProj?.name}</strong>
        </p>
        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          {especialistas.map(e => (
            <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${selEspsForProject.includes(e.id) ? 'var(--brand-indigo)' : 'var(--c-border2)'}`, marginBottom: 6, cursor: 'pointer', background: selEspsForProject.includes(e.id) ? 'var(--c-accent3)' : 'var(--c-surface2)', transition: 'all .15s' }}>
              <input type="checkbox" checked={selEspsForProject.includes(e.id)} onChange={() => toggleEspAssign(e.id)} style={{ accentColor: 'var(--brand-indigo)', width: 14, height: 14 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{e.name}</div>
                <div style={{ fontSize: 8.5, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: .3 }}>{e.cargo}</div>
              </div>
              {selEspsForProject.includes(e.id) && <Check size={14} style={{ color: 'var(--c-accent)' }} />}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAssignModal(null)}>Cancelar</Button>
          <Button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveAssign}><Check size={12} /> Guardar asignación</Button>
        </div>
      </Modal>
    </div>
  )
}
