import { Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { MODEL_BADGE } from '../../data/categories'
import { PROJECTS_BY_AREA } from '../../data/mockData'

function ProjectSelect({ value, onChange, area = 'infraestructura' }) {
  const projects = PROJECTS_BY_AREA[area] ?? []
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      style={{
        flex: 1, padding: '5px 8px', background: 'var(--c-surface)',
        border: '1.5px solid var(--c-border2)', borderRadius: 6,
        fontSize: 10.5, fontWeight: 600, color: 'var(--t-primary)',
        cursor: 'pointer', minWidth: 0,
      }}
    >
      <option value="">— Sin proyecto —</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}

export default function ActivityCard({ task, locked, onUpdate, onDelete, area }) {
  const isProject = task.catId === 'proyecto'
  const needsObs = (parseInt(task.dur) || 0) > 240
  const missingObs = needsObs && !task.desc?.trim()

  return (
    <div
      className="act-item"
      style={{
        borderLeft: `3px solid ${task.catColor}`,
        background: `linear-gradient(to right,${task.catColor}08,var(--c-surface2))`,
        opacity: locked ? 0.82 : 1,
        outline: missingObs ? '1.5px solid var(--brand-orange)' : 'none',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span className={`badge ${MODEL_BADGE[task.model] ?? 'badge-gray'}`}>{task.model}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{task.name}</span>
          <span style={{ fontSize: 8.5, color: 'var(--t-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>{task.catLabel}</span>
          {locked && <span className="badge badge-accent" style={{ fontSize: 7.5, marginLeft: 'auto' }}>✓ Finalizado</span>}
          {missingObs && (
            <span style={{ fontSize: 8, color: 'var(--brand-orange)', fontWeight: 800, marginLeft: 'auto', background: 'var(--c-warn-bg)', padding: '2px 6px', borderRadius: 99 }}>
              ⚠ Obs. requerida
            </span>
          )}
        </div>

        {/* Project selector */}
        {isProject && !locked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--t-muted)', letterSpacing: .4, flexShrink: 0 }}>Proyecto</span>
            <ProjectSelect value={task.projectId} onChange={v => onUpdate(task.id, 'projectId', v)} area={area} />
          </div>
        )}
        {isProject && locked && task.projectId && (
          <div style={{ fontSize: 9.5, color: 'var(--c-success)', fontWeight: 600, marginBottom: 4 }}>
            📁 {(PROJECTS_BY_AREA[area] ?? []).find(p => p.id === task.projectId)?.name ?? '—'}
          </div>
        )}

        {/* Description */}
        <textarea
          className="act-desc"
          placeholder={needsObs ? '⚠ Observación OBLIGATORIA para actividades > 4h...' : 'Descripción opcional...'}
          rows={1}
          value={task.desc}
          disabled={locked}
          onChange={e => onUpdate(task.id, 'desc', e.target.value)}
          style={locked ? { color: 'var(--t-muted)', cursor: 'default' } : {}}
        />
        {missingObs && (
          <div style={{ fontSize: 9, color: 'var(--brand-orange)', fontWeight: 700, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
            <AlertCircle size={10} /> Agrega una observación — supera los 240 minutos
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <input
            type="number"
            min={1}
            step={15}
            className="dur-field"
            value={task.dur}
            disabled={locked}
            onChange={e => { const v = parseInt(e.target.value) || 0; onUpdate(task.id, 'dur', v < 1 ? 1 : v) }}
            style={locked ? { background: 'var(--c-surface2)', color: 'var(--t-muted)', cursor: 'default' } : {}}
          />
          <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--t-muted)', textAlign: 'center', marginTop: 2, letterSpacing: .4 }}>Mins</div>
        </div>
        {!locked && (
          <button className="del-btn" onClick={() => onDelete(task.id)} title="Eliminar">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
