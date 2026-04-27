/**
 * ActivityCard.jsx — controles +/- minutos, selector proyectos, descripción
 */

import { Trash2, AlertCircle, Plus, Minus } from 'lucide-react'
import { MODEL_BADGE } from '../../data/categories'

function ProjectSelect({ value, onChange, proyectos }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
      style={{ flex:1, padding:'5px 8px', background:'var(--c-surface)', border:'1.5px solid var(--c-border2)', borderRadius:6, fontSize:10.5, fontWeight:600, color:'var(--t-primary)', cursor:'pointer', minWidth:0 }}
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
      borderLeft:`3px solid ${task.catColor}`,
      background:`linear-gradient(to right,${task.catColor}08,var(--c-surface2))`,
      opacity: locked ? 0.82 : 1,
      outline: missingObs ? '1.5px solid var(--brand-orange)' : 'none',
    }}>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
          <span className={`badge ${MODEL_BADGE[task.model] ?? 'badge-gray'}`}>{task.model}</span>
          <span style={{ fontSize:12.5, fontWeight:700 }}>{task.name}</span>
          <span style={{ fontSize:8.5, color:'var(--t-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.4 }}>{task.catLabel}</span>
          {locked && <span className="badge badge-accent" style={{ fontSize:7.5, marginLeft:'auto' }}>✓ Finalizado</span>}
          {missingObs && <span style={{ fontSize:8, color:'var(--brand-orange)', fontWeight:800, marginLeft:'auto', background:'var(--c-warn-bg)', padding:'2px 6px', borderRadius:99 }}>⚠ Obs. requerida</span>}
        </div>

        {/* Selector de proyecto */}
        {isProject && !locked && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', color:'var(--t-muted)', letterSpacing:.4, flexShrink:0 }}>Proyecto</span>
            <ProjectSelect value={task.projectId} onChange={v => onUpdate(task.id,'projectId',v)} proyectos={proyectos} />
          </div>
        )}
        {isProject && locked && proyectoSel && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:proyectoSel.color, flexShrink:0, display:'inline-block' }} />
            <span style={{ fontSize:9.5, color:'var(--c-success)', fontWeight:600 }}>[{proyectoSel.oficina}] {proyectoSel.nombre}</span>
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
          style={locked ? { color:'var(--t-muted)', cursor:'default' } : {}}
        />
        {missingObs && (
          <div style={{ fontSize:9, color:'var(--brand-orange)', fontWeight:700, marginTop:3, display:'flex', alignItems:'center', gap:3 }}>
            <AlertCircle size={10} /> Agrega una observación — supera los 240 minutos
          </div>
        )}
      </div>

      {/* Controles de tiempo */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0, marginLeft:10 }}>



        {/* Control principal ─/+ con input */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {!locked && (
            <button onClick={() => changeDur(-15)}
              style={{ width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-surface2)', border:'1px solid var(--c-border2)', cursor:'pointer', color:'var(--t-secondary)' }}>
              <Minus size={10} />
            </button>
          )}
          <div style={{ textAlign:'center' }}>
            <input
              type="number" min={1} step={15}
              className="dur-field"
              value={task.dur}
              disabled={locked}
              onChange={e => { const v=parseInt(e.target.value)||0; onUpdate(task.id,'dur',v<1?1:v) }}
              style={locked ? { background:'var(--c-surface2)', color:'var(--t-muted)', cursor:'default' } : {}}
            />
            <div style={{ fontSize:7.5, fontWeight:700, textTransform:'uppercase', color:'var(--t-muted)', textAlign:'center', marginTop:2, letterSpacing:.4 }}>Mins</div>
          </div>
          {!locked && (
            <button onClick={() => changeDur(15)}
              style={{ width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-surface2)', border:'1px solid var(--c-border2)', cursor:'pointer', color:'var(--t-secondary)' }}>
              <Plus size={10} />
            </button>
          )}
        </div>

        {/* Eliminar */}
        {!locked && (
          <button className="del-btn" type="button" onClick={() => onDelete(task.id)} title="Eliminar actividad">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
