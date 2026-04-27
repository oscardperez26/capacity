/**
 * SprintBar.jsx — muestra info del sprint activo y semana actual
 * Maneja correctamente cuando sprint=null o no hay periodo activo
 */
export default function SprintBar({ sprint, currentWeek, periodoCerrado }) {
  if (!currentWeek) return null

  const hoy     = new Date().toISOString().split('T')[0]
  const { ini, fin } = currentWeek

  // Calcula días hasta fin del sprint
  let diasLabel = null
  if (sprint?.fin) {
    const diff = Math.ceil((new Date(sprint.fin + 'T12:00:00') - new Date()) / 86400000)
    if (diff > 0)      diasLabel = `${diff} día${diff !== 1 ? 's' : ''} para cierre`
    else if (diff === 0) diasLabel = 'Cierra hoy'
    else                 diasLabel = 'Sprint vencido'
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
      padding:'10px 16px', borderRadius:12, marginBottom:14,
      background: sprint && !periodoCerrado
        ? 'linear-gradient(135deg,rgba(51,40,154,0.06),rgba(69,84,161,0.04))'
        : 'rgba(153,44,38,0.05)',
      border: `1px solid ${sprint && !periodoCerrado ? 'rgba(51,40,154,0.15)' : 'rgba(153,44,38,0.2)'}`,
    }}>
      {/* Estado del sprint */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{
          padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:800,
          letterSpacing:.4,
          background: sprint && !periodoCerrado ? 'rgba(51,40,154,0.1)' : 'rgba(153,44,38,0.1)',
          color: sprint && !periodoCerrado ? '#33289A' : '#992C26',
          border: `1px solid ${sprint && !periodoCerrado ? 'rgba(51,40,154,0.2)' : 'rgba(153,44,38,0.2)'}`,
        }}>
          {sprint && !periodoCerrado
            ? `🟢 ${sprint.nombre} · ACTIVO`
            : periodoCerrado && sprint
            ? `🔒 ${sprint.nombre} · PERÍODO CERRADO`
            : '⛔ Sin sprint activo'}
        </span>

        {diasLabel && sprint && !periodoCerrado && (
          <span style={{ fontSize:11, color:'var(--t-muted)', fontWeight:600 }}>
            {diasLabel}
          </span>
        )}
      </div>

      {/* Rango de semana */}
      <div style={{ fontSize:11, color:'var(--t-muted)', marginLeft:'auto' }}>
        Semana: <strong style={{ color:'var(--t-secondary)' }}>
          {ini} → {fin}
        </strong>
      </div>
    </div>
  )
}
