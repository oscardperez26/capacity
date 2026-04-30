import './MisProyectos.css'
import { useState, useEffect } from 'react'
import { RefreshCw, X, Clock, TrendingUp } from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'
import Button         from '../../components/ui/Button'

function fmtMins(mins) {
  if (!mins) return '0h'
  const h=Math.floor(mins/60), m=mins%60
  return m===0?`${h}h`:`${h}h ${m}m`
}

const ESTADO_MAP = {
  activo:      { label:'En ejecución', cls:'badge-green',  color:'#30693B' },
  pausado:     { label:'Suspendido',   cls:'badge-amber',  color:'#D65830' },
  cerrado:     { label:'Cerrado',      cls:'badge-gray',   color:'#666'    },
  sin_iniciar: { label:'Sin iniciar',  cls:'badge-blue',   color:'#3E5D9D' },
}

// ── KPI Card — hover vía CSS puro ──────────────────────────────────────────
function KpiCard({ label, value, sub, accent, bgColor }) {
  const isColored = accent || bgColor
  const cardClass = `mp-kpi-card ${accent ? 'mp-kpi-card--accent' : bgColor ? 'mp-kpi-card--colored' : 'mp-kpi-card--default'}`

  return (
    <div
      className={cardClass}
      style={bgColor && !accent ? { background: bgColor } : undefined}
    >
      <div className={`mp-kpi-label ${isColored ? 'mp-kpi-label--accent' : ''}`}>{label}</div>
      <div className={`mp-kpi-value ${isColored ? 'mp-kpi-value--accent' : ''}`}>{value}</div>
      {sub && <div className={`mp-kpi-sub ${isColored ? 'mp-kpi-sub--accent' : ''}`}>{sub}</div>}
    </div>
  )
}

// ── Modal detalle de proyecto ──────────────────────────────────────────────
function ProyectoModal({ p, onClose }) {
  if (!p) return null
  const estado = ESTADO_MAP[p.estado] ?? { label:p.estado, cls:'badge-gray', color:'#666' }
  const avanceColor = p.avancePct>=70?'#30693B':p.avancePct>=40?'#D65830':'#3E5D9D'

  const Row = ({ label, value }) => value ? (
    <div className="mp-detail-row">
      <span className="mp-detail-lbl">{label}</span>
      <span className="mp-detail-val">{value}</span>
    </div>
  ) : null

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mp-modal-hdr">
          <div className="mp-modal-title-wrap">
            <div className="mp-modal-tags">
              <span className="mp-oficina-tag" style={{ background:`${p.oficina.color}18`, color:p.oficina.color, border:`1px solid ${p.oficina.color}40` }}>
                {p.oficina.nombre}
              </span>
              {p.programa && p.programa !== '—' && (
                <span className="badge badge-gray">{p.programa}</span>
              )}
              <span className={`badge ${estado.cls}`}>{estado.label}</span>
            </div>
            <h2 className="mp-modal-title">{p.nombre}</h2>
            {p.descripcion && <p className="mp-modal-desc">{p.descripcion}</p>}
          </div>
          <button onClick={onClose} className="mp-modal-close">
            <X size={14} />
          </button>
        </div>

        {/* Avance */}
        <div className="mp-modal-avance">
          <div className="mp-modal-avance-hdr">
            <span className="mp-modal-avance-lbl">% Avance</span>
            <span style={{ fontSize:22, fontWeight:900, color:avanceColor }}>{p.avancePct}%</span>
          </div>
          <div className="mp-modal-bar">
            <div className="mp-modal-bar-fill" style={{ width:`${p.avancePct}%`, background:avanceColor }} />
          </div>
          {p.estadoDetalle && <p className="mp-modal-estado-det">📋 {p.estadoDetalle}</p>}
        </div>

        {/* Detalles */}
        <div className="mp-modal-rows">
          <Row label="Oficina de proyectos"  value={p.oficina.nombre} />
          <Row label="Programa"              value={p.programa !== '—' ? p.programa : null} />
          <Row label="Tipo"                  value={p.tipoProyecto} />
          <Row label="Clasificación"         value={p.clasificacion} />
          <Row label="Área responsable"      value={p.area} />
          <Row label="Jefe / Líder"          value={p.lider !== '—' ? p.lider : null} />
          <Row label="Fecha de inicio"       value={p.fechaInicio} />
          <Row label="Fecha fin estimada"    value={p.fechaFin} />
          <Row label="Fecha fin real"        value={p.fechaFinReal} />
          <Row label="Costo estimado (USD)"  value={p.costoEstAnual  ? `$${Number(p.costoEstAnual).toLocaleString('es-CO')}` : null} />
          <Row label="Costo ejecutado (USD)" value={p.costoEjecAnual ? `$${Number(p.costoEjecAnual).toLocaleString('es-CO')}` : null} />
          <Row label="Horas invertidas"      value={fmtMins(p.minInvertidos)} />
          {p.observaciones && (
            <div className="mp-obs-wrap">
              <div className="mp-obs-lbl">Observaciones</div>
              <p className="mp-obs-text">{p.observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de proyecto ────────────────────────────────────────────────────
function ProyectoCard({ p, onDoubleClick }) {
  const [hov, setHov] = useState(false)
  const estado = ESTADO_MAP[p.estado] ?? { label:p.estado, cls:'badge-gray', color:'#666' }
  const avanceColor = p.avancePct>=70?'#30693B':p.avancePct>=40?'#D65830':'#3E5D9D'

  return (
    <div
      className="mp-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onDoubleClick={() => onDoubleClick(p)}
      title="Doble clic para ver detalle"
      style={{
        border: `1px solid ${hov ? p.oficina.color : 'var(--c-border)'}`,
        boxShadow: hov ? `0 6px 20px ${p.oficina.color}25` : 'none',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      <div className="mp-card-hdr">
        <div className="mp-card-body">
          <div className="mp-card-tags">
            <span className="mp-oficina-tag" style={{ background:`${p.oficina.color}18`, color:p.oficina.color, border:`1px solid ${p.oficina.color}40` }}>
              {p.oficina.nombre}
            </span>
            <span className="mp-tipo-tag">{p.tipo==='estrategico'?'PROY':'OPE'}</span>
          </div>
          <h3 className="mp-card-title">{p.nombre}</h3>
          {p.descripcion && <p className="mp-card-desc">{p.descripcion}</p>}
          <div className="mp-card-meta">
            {p.lider && p.lider!=='—' && <span>👤 {p.lider}</span>}
            {p.fechaInicio && p.fechaFin && <span>📅 {p.fechaInicio} → {p.fechaFin}</span>}
          </div>
        </div>
        <span className={`badge ${estado.cls}`} style={{ flexShrink:0, marginLeft:8 }}>{estado.label}</span>
      </div>

      <div className="mp-avance-wrap">
        <div className="mp-avance-hdr">
          <span className="mp-avance-lbl">Avance</span>
          <span style={{ fontSize:13, fontWeight:900, color:avanceColor }}>{p.avancePct}%</span>
        </div>
        <div className="mp-bar">
          <div className="mp-bar-fill" style={{ width:`${p.avancePct}%`, background:avanceColor }} />
        </div>
      </div>

      {p.estadoDetalle && <div className="mp-estado-det">📋 {p.estadoDetalle}</div>}

      <div className="mp-card-footer">
        <div className="mp-time-wrap">
          <Clock size={11} style={{ color:'var(--c-accent)' }} />
          <span className="mp-time-val">{fmtMins(p.minInvertidos)}</span>
          <span className="mp-time-lbl">invertidas</span>
        </div>
        <span className="mp-hint" style={{ opacity: hov ? 1 : 0 }}>Doble clic para ver detalle</span>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function MisProyectos() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/mis-proyectos')
      setData(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <PageLoader message="Cargando proyectos..." />
  if (!data)   return null

  const { kpis, proyectos } = data

  return (
    <div>
      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Proyectos, Iniciativas y Evolutivos</h2>
          <p className="sec-sub">En los que participo</p>
        </div>
        <Button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={11} /> Actualizar</Button>
      </div>

      {/* KPIs */}
      <div className="mp-kpi-grid">
        <KpiCard accent    label="Total"          value={kpis.total}      sub="Proyectos / Iniciativas" />
        <KpiCard bgColor="#30693B" label="En ejecución"  value={kpis.ejecucion}  sub="Activos" />
        <KpiCard bgColor="#D65830" label="Sin iniciar"   value={kpis.sinIniciar} sub="Pendientes" />
        <KpiCard bgColor="#992C26" label="Suspendidos"   value={kpis.suspendido} sub="En pausa" />
        <KpiCard bgColor="#666666" label="Cerrados"      value={kpis.cerrado}    sub="Finalizados" />
        <KpiCard           label="Avance prom."  value={`${kpis.avanceProm}%`} sub="Global" />
      </div>

      {proyectos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ico" style={{ opacity:.22 }}><TrendingUp size={38} /></div>
          <p>No tienes proyectos asignados en esta oficina</p>
        </div>
      ) : (
        <div className="mp-cards-grid">
          {proyectos.map(p => (
            <ProyectoCard key={p.id} p={p} onDoubleClick={setModal} />
          ))}
        </div>
      )}

      {modal && <ProyectoModal p={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
