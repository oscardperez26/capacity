import './Configuracion.css'
import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { AREAS_DATA } from '../../data/mockData'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const INITIAL_SPRINTS = [
  { id: 5, name: 'Sprint 5', start: '17 Feb', end: '05 Mar', status: 'activo',  areas: 'Todas' },
  { id: 4, name: 'Sprint 4', start: '04 Feb', end: '18 Feb', status: 'cerrado', areas: 'Todas' },
  { id: 3, name: 'Sprint 3', start: '20 Ene', end: '03 Feb', status: 'cerrado', areas: 'Todas' },
]

export default function Configuracion() {
  const [showNew, setShowNew] = useState(false)
  const [sprints, setSprints] = useState(INITIAL_SPRINTS)
  const [newName,  setNewName]  = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd,   setNewEnd]   = useState('')

  const totalAreas  = Object.keys(AREAS_DATA).length
  const totalEsps   = Object.values(AREAS_DATA).flatMap(a => a.especialistas).length

  const createSprint = () => {
    if (!newName) return
    setSprints(p => [{ id: Date.now(), name: newName, start: newStart || '--', end: newEnd || '--', status: 'activo', areas: 'Todas' }, ...p])
    setShowNew(false); setNewName(''); setNewStart(''); setNewEnd('')
  }

  const closeSprint = (id) =>
    setSprints(p => p.map(s => s.id === id ? { ...s, status: 'cerrado' } : s))

  return (
    <div>
      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Configuración de Sprints</h2>
          <p className="sec-sub">Ciclos globales para todas las áreas TI</p>
        </div>
        <Button className="btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <Plus size={11} /> Nuevo Sprint
        </Button>
      </div>

      {/* Summary strip */}
      <div className="cfg-stats">
        {[
          { l: 'Áreas activas',       v: totalAreas,  c: 'var(--c-accent)' },
          { l: 'Especialistas',       v: totalEsps,   c: 'var(--brand-green)' },
          { l: 'Sprints completados', v: sprints.filter(s => s.status === 'cerrado').length, c: 'var(--t-secondary)' },
        ].map((k, i) => (
          <div key={i} className="cfg-stat-card">
            <div className="cfg-stat-lbl">{k.l}</div>
            <div className="cfg-stat-val" style={{ color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="cfg-notice">
          ℹ️ Los sprints son globales y aplican a las {totalAreas} áreas de TI. No pueden editarse una vez cerrados.
        </div>

        {sprints.map(s => (
          <div key={s.id} className="sprint-row">
            <div>
              <div className="sprint-row-name">{s.name}</div>
              <div className="sprint-row-dates">{s.start} — {s.end} · 2025 · {s.areas}</div>
            </div>
            <div className="cfg-row-acts">
              <span className={`badge ${s.status === 'activo' ? 'badge-accent' : 'badge-green'}`}>{s.status}</span>
              {s.status === 'activo' && (
                <Button className="btn-ghost btn-sm" onClick={() => closeSprint(s.id)}>
                  Cerrar Sprint
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New sprint modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} iconCls="mi-i" icon={<Calendar size={24} />} title="Nuevo Sprint Global">
        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          <div className="form-grp">
            <label className="form-lbl">Nombre</label>
            <input className="form-inp" placeholder="Sprint 6" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="cfg-2col">
            <div className="form-grp">
              <label className="form-lbl">Inicio</label>
              <input className="form-inp" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div className="form-grp">
              <label className="form-lbl">Fin</label>
              <input className="form-inp" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowNew(false)}>Cancelar</Button>
          <Button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!newName.trim()} onClick={createSprint}>
            Crear Sprint
          </Button>
        </div>
      </Modal>
    </div>
  )
}
