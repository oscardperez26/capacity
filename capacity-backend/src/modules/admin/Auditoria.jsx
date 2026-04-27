import { Download } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import Button from '../../components/ui/Button'

export default function Auditoria() {
  const { state } = useStore()

  const allLog = [
    ...state.auditLog,
    { action: 'Login — Carlos Ramírez',                  user: 'Sistema',    time: 'Hace 3h' },
    { action: 'Aprobación Sprint 4 — Infraestructura',   user: 'C. Ramírez', time: 'Hace 4h' },
    { action: 'Rechazo actividad — Laura Martínez',      user: 'C. Ramírez', time: 'Hace 6h' },
    { action: 'Nuevo usuario habilitado — D. Herrera',   user: 'Admin',      time: 'Ayer' },
    { action: 'Sprint 4 cerrado',                        user: 'Sistema',    time: 'Ayer' },
  ]

  const exportLog = () => {
    const csv = 'Acción,Usuario,Tiempo\n' + allLog.map(l => `"${l.action}","${l.user}","${l.time}"`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'audit_log_sprint5.csv'
    document.body.appendChild(link); link.click()
    document.body.removeChild(link); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Auditoría Global</h2>
          <p className="sec-sub">Trazabilidad completa de cambios y aprobaciones</p>
        </div>
        <Button className="btn-primary btn-sm" onClick={exportLog}>
          <Download size={11} /> Exportar log
        </Button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card accent-card">
          <div className="kpi-label">Eventos hoy</div>
          <div className="kpi-value">{state.auditLog.length + 2}</div>
          <div className="kpi-sub">Últimas 24h</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Aprobaciones</div>
          <div className="kpi-value" style={{ color: 'var(--brand-green)' }}>14</div>
          <div className="kpi-sub">Sprint actual</div>
        </div>
        <div className="kpi-card warn-card">
          <div className="kpi-label">Rechazos</div>
          <div className="kpi-value">3</div>
          <div className="kpi-sub">Sprint actual</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ediciones habilitadas</div>
          <div className="kpi-value" style={{ color: 'var(--c-accent)' }}>5</div>
          <div className="kpi-sub">Períodos cerrados</div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--t-muted)', marginBottom: 14 }}>
          Log de eventos
        </h3>
        {allLog.map((a, i) => (
          <div key={i} className="audit-row">
            <div className="audit-dot" style={{ background: i === 0 ? 'var(--brand-orange)' : 'var(--brand-violet)' }} />
            <div style={{ flex: 1 }}>
              <div className="audit-act">{a.action}</div>
              <div className="audit-meta">{a.user} · {a.time}</div>
            </div>
            <span className="badge badge-gray" style={{ fontSize: 7.5, alignSelf: 'center' }}>
              {i === 0 ? 'Reciente' : 'Anterior'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
