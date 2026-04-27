export default function TrendChart({ data = [], height = 100 }) {
  // data: [{ l: 'label', v: value }]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, paddingBottom: 2, marginBottom: 6 }}>
        {data.map((pt, i) => (
          <div
            key={i}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end',
            }}
          >
            <span style={{
              fontSize: 7, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: pt.v > 100 ? 'var(--brand-red)' : pt.v > 80 ? 'var(--brand-orange)' : 'var(--c-accent)',
            }}>
              {pt.v}
            </span>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              height: `${Math.min(pt.v, 120) / 120 * 100}%`,
              background:
                pt.v > 100
                  ? 'linear-gradient(180deg,var(--brand-orange),var(--brand-red))'
                  : pt.v > 80
                    ? 'linear-gradient(180deg,#E8793C,var(--brand-orange))'
                    : 'linear-gradient(180deg,var(--brand-violet),var(--brand-indigo))',
              opacity: i === data.length - 1 ? 1 : 0.55 + i * (0.45 / data.length),
              transition: 'height .6s cubic-bezier(0.4,0,0.2,1)',
            }} />
            <span style={{ fontSize: 6.5, color: 'var(--t-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              {pt.l}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 8, color: 'var(--t-muted)', textAlign: 'center', marginBottom: 10 }}>
        <span style={{ borderTop: '1px dashed rgba(153,44,38,0.4)', display: 'inline-block', width: 30, verticalAlign: 'middle', marginRight: 5 }} />
        100% = 480 min
      </div>
    </div>
  )
}
