import { barClass } from '../../utils/capacityUtils'

export default function BarChart({ data = [], height = 120 }) {
  // data: [{ l: 'label', p: percentage }]
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((a, i) => (
        <div key={i} className="bar-col">
          <span className={`bar-pct-lbl ${a.p > 100 ? 'pct-over' : 'mono'}`}>{a.p}%</span>
          <div
            className={`bar-fill ${barClass(a.p)}`}
            style={{ height: `${Math.min(a.p, 100) * 0.9}%` }}
          />
          <span className="bar-lbl" style={{ fontSize: 7 }}>{a.l}</span>
        </div>
      ))}
    </div>
  )
}
