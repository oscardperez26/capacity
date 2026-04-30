import './ActivityCard.css'
import { Trash2, AlertCircle, Plus, Minus } from 'lucide-react'
import { MODEL_BADGE } from '../../data/categories'

function ProjectSelect({ value, onChange, proyectos }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
      className="ac-project-select"
    >
      <option value="">— Sin proyecto —</option>
      {proyectos.map(p => (
        <option key={p.id} value={p.id}>[{p.oficina}] {p.nombre}</option>
      ))}
    </select>
  )
}

export default function ActivityCard({ task, locked, onUpdate, onDelete, proyectos = [] }) {
  const dur        = parseInt(task.dur) || 0
  const needsObs   = dur > 240
  const missingObs = needsObs && !task.desc?.trim()
  const isProject  = task.model === 'BUILD'

  const proyectoSel = proyectos.find(p => p.id === task.projectId || p.id === parseInt(task.projectId))

  const changeDur = (delta) => {
    const next = Math.max(1, dur + delta)
    onUpdate(task.id, 'dur', next)
  }

  return (
    <div className="act-item" style={{
      borderLeft: `3px solid ${task.catColor}`,
      background: `linear-gradient(to right,${task.catColor}08,var(--c-surface2))`,
      opacity: locked ? 0.82 : 1,
      outline: missingObs ? '1.5px solid var(--brand-orange)' : 'none',
    }}>
      <div className="ac-inner">
        {/* Header */}
        <div className="ac-header">
          <span className={`badge ${MODEL_BADGE[task.model] ?? 'badge-gray'}`}>{task.model}</span>
          <span className="ac-task-name">{task.name}</span>
          <span className="ac-cat-label">{task.catLabel}</span>
          {locked && <span className="badge badge-accent" style={{ fontSize: 7.5, marginLeft: 'auto' }}>✓ Finalizado</span>}
          {missingObs && <span className="ac-obs-badge">⚠ Obs. requerida</span>}
        </div>

        {/* Selector de proyecto */}
        {isProject && !locked && (
          <div className="ac-project-row">
            <span className="ac-project-label">Proyecto</span>
            <ProjectSelect value={task.projectId} onChange={v => onUpdate(task.id, 'projectId', v)} proyectos={proyectos} />
          </div>
        )}
        {isProject && locked && proyectoSel && (
          <div className="ac-project-locked">
            <span className="ac-project-dot" style={{ background: proyectoSel.color }} />
            <span className="ac-project-name">[{proyectoSel.oficina}] {proyectoSel.nombre}</span>
          </div>
        )}

        {/* Descripción */}
        <textarea
          className="act-desc"
          placeholder={needsObs ? '⚠ Observación OBLIGATORIA (> 4h)...' : 'Descripción u observaciones...'}
          rows={1}
          value={task.desc ?? ''}
          disabled={locked}
          onChange={e => onUpdate(task.id, 'desc', e.target.value)}
          style={locked ? { color: 'var(--t-muted)', cursor: 'default' } : {}}
        />
        {missingObs && (
          <div className="ac-obs-warn">
            <AlertCircle size={10} /> Agrega una observación — supera los 240 minutos
          </div>
        )}
      </div>

      {/* Controles de tiempo */}
      <div className="ac-controls">
        <div className="ac-dur-row">
          {!locked && (
            <button onClick={() => changeDur(-15)} className="ac-ctrl-btn">
              <Minus size={10} />
            </button>
          )}
          <div className="ac-dur-center">
            <input
              type="number" min={1} step={15}
              className="dur-field"
              value={task.dur}
              disabled={locked}
              onChange={e => { const v = parseInt(e.target.value) || 0; onUpdate(task.id, 'dur', v < 1 ? 1 : v) }}
              style={locked ? { background: 'var(--c-surface2)', color: 'var(--t-muted)', cursor: 'default' } : {}}
            />
            <div className="ac-mins-label">Mins</div>
          </div>
          {!locked && (
            <button onClick={() => changeDur(15)} className="ac-ctrl-btn">
              <Plus size={10} />
            </button>
          )}
        </div>

        {!locked && (
          <button className="del-btn" type="button" onClick={() => onDelete(task.id)} title="Eliminar actividad">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
