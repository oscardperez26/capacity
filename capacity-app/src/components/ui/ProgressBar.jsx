import { minsToH, progClass, pctClass } from '../../utils/capacityUtils'

export default function ProgressBar({ pct, showLabel = true }) {
  const cls = progClass(pct)
  const capped = Math.min(pct, 100)
  const state = pctClass(pct)

  return (
    <div>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>
            {minsToH(pct * 4.8)} / 8.0 h
            <span style={{ fontSize: 11, color: 'var(--t-muted)', marginLeft: 7 }}>{Math.round(pct)}%</span>
          </span>
          {state === 'overflow' && (
            <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-red)', background: 'var(--c-danger-bg)', padding: '2px 7px', borderRadius: 99 }}>
              ⚡ Capacidad excedida
            </span>
          )}
          {state === 'warn' && (
            <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-warn)', background: 'var(--c-warn-bg)', padding: '2px 7px', borderRadius: 99 }}>
              ⚠ Próximo al límite
            </span>
          )}
        </div>
      )}
      <div className="prog-wrap">
        <div className={`prog-fill ${cls}`} style={{ width: `${capped}%` }} />
        {capped > 0 && <div className="prog-shimmer" />}
      </div>
    </div>
  )
}
