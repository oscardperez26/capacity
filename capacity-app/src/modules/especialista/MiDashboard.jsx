import './MiDashboard.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Tooltip,
} from 'recharts'
import { RefreshCw, X } from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

const MODEL_META = {
  RUN:   { color: '#3E5D9D', desc: 'Operación y Soporte',     meta: '≤60%' },
  BUILD: { color: '#30693B', desc: 'Proyectos, Iniciativas',  meta: '≥40%' },
  ADMIN: { color: '#D65830', desc: 'Gestión Administrativa',  meta: '≤15%' },
  GROW:  { color: '#4554A1', desc: 'Formación e Innovación',  meta: '≥10%' },
  OFF:   { color: '#992C26', desc: 'Novedades y Ausentismos', meta: '—'    },
}

function fmtMins(mins) {
  if (!mins) return '0h'
  const h = Math.floor(mins / 60), m = mins % 60
  if (h === 0) return `${m}m`; if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── KPI Card — hover vía CSS ───────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, warn, danger }) {
  const colorClass = accent ? 'mdb-kpi-card--accent' : 'mdb-kpi-card--default'
  const labelColor = accent ? 'rgba(255,255,255,0.6)' : 'var(--t-muted)'
  const valueColor = accent ? 'white' : warn ? 'var(--brand-orange)' : danger ? 'var(--brand-red)' : 'var(--c-accent)'
  const subColor   = accent ? 'rgba(255,255,255,0.55)' : 'var(--t-muted)'
  return (
    <div className={`mdb-kpi-card ${colorClass}`}>
      <div className="mdb-kpi-label" style={{ color: labelColor }}>{label}</div>
      <div className="mdb-kpi-value" style={{ color: valueColor }}>{value}</div>
      {sub && <div className="mdb-kpi-sub" style={{ color: subColor }}>{sub}</div>}
    </div>
  )
}

// ── Popup detalle de dominio ───────────────────────────────────────────────
function ModelPopup({ model, detail, totalMins, onClose }) {
  if (!model || !detail) return null
  const meta = MODEL_META[model]
  const pct  = totalMins > 0 ? Math.round(detail.totalMins / totalMins * 100) : 0
  return (
    <div className="mdb-popup-overlay" onClick={onClose}>
      <div className="mdb-popup" onClick={e => e.stopPropagation()}>
        <div className="mdb-popup-hdr">
          <div>
            <div className="mdb-popup-model">
              <div className="mdb-popup-dot" style={{ background: meta.color }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>{model}</span>
              <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>{meta.desc}</span>
            </div>
            <div className="mdb-popup-stats">
              <span className="mdb-popup-pct" style={{ color: meta.color }}>{pct}%</span>
              <span className="mdb-popup-time">{fmtMins(detail.totalMins)}</span>
            </div>
          </div>
          <button onClick={onClose} className="mdb-popup-close"><X size={14}/></button>
        </div>
        <div className="mdb-popup-dist-ttl">Distribución de tareas</div>
        <div className="mdb-popup-tasks">
          {detail.tasks.map((t, i) => (
            <div key={i} className="mdb-task-row" style={{
              background: i === 0 ? `${meta.color}10` : 'var(--c-surface2)',
              border: `1px solid ${i === 0 ? meta.color + '30' : 'var(--c-border)'}`,
            }}>
              <div className="mdb-task-top">
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500 }}>{i === 0 ? '🏆 ' : ''}{t.name}</span>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 900, color: meta.color }}>{t.pct}%</span>
                  <span style={{ fontSize: 12, color: 'var(--t-muted)', marginLeft: 6 }}>{fmtMins(t.mins)}</span>
                </div>
              </div>
              <div className="mdb-task-bar">
                <div className="mdb-task-fill" style={{ width: `${t.pct}%`, background: meta.color, opacity: i === 0 ? 1 : 0.55 }} />
              </div>
            </div>
          ))}
        </div>
        {detail.topTask && (
          <div className="mdb-popup-top" style={{ background: `${meta.color}10` }}>
            🏆 Mayor tiempo: <strong>{detail.topTask.name}</strong> — {fmtMins(detail.topTask.mins)} ({detail.topTask.pct}%)
          </div>
        )}
      </div>
    </div>
  )
}

// ── Model Card — hover vía CSS ─────────────────────────────────────────────
function ModelCard({ model, mins, totalMins, onDoubleClick }) {
  const meta = MODEL_META[model]
  const pct  = totalMins > 0 ? Math.round(mins / totalMins * 100) : 0
  return (
    <div className="mdb-model-card"
      onDoubleClick={() => onDoubleClick(model)}
      title="Doble clic para ver detalle"
      style={{
        border: `1.5px solid var(--c-border)`,
        background: 'var(--c-surface)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1.5px solid ${meta.color}`
        e.currentTarget.style.background = `${meta.color}12`
        e.currentTarget.style.boxShadow = `0 4px 16px ${meta.color}30`
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = '1.5px solid var(--c-border)'
        e.currentTarget.style.background = 'var(--c-surface)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="mdb-model-name" style={{ color: meta.color }}>{model}</div>
          <div className="mdb-model-desc">{meta.desc}</div>
        </div>
        <span className="mdb-model-pct" style={{ color: meta.color }}>{pct}%</span>
      </div>
      <div className="mdb-model-bar">
        <div className="mdb-model-fill" style={{ width: `${Math.min(pct, 100)}%`, background: meta.color }} />
      </div>
      <div className="mdb-model-footer">
        <span className="mdb-model-time">{fmtMins(mins)}</span>
        <span className="mdb-model-meta">Meta {meta.meta}</span>
      </div>
    </div>
  )
}

// ── Tooltips ───────────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="mdb-tooltip">
      <div className="mdb-tooltip-label">{label}</div>
      <div style={{ color: payload[0]?.fill, fontWeight: 600 }}>{fmtMins(payload[0]?.value)}</div>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0], meta = MODEL_META[d.name] ?? {}
  return (
    <div className="mdb-tooltip" style={{ border: `1px solid ${meta.color ?? 'var(--c-border)'}40` }}>
      <div style={{ fontWeight: 800, color: meta.color, marginBottom: 2 }}>{d.name} · {meta.desc}</div>
      <div style={{ color: 'var(--t-primary)', fontWeight: 700 }}>{fmtMins(d.value)}</div>
      <div style={{ color: 'var(--t-muted)', fontSize: 12 }}>{d.payload.pct ?? 0}% del total</div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function MiDashboard() {
  const hoy = new Date().toISOString().split('T')[0]
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [filtro,     setFiltro]     = useState('dia')
  const [customIni,  setCustomIni]  = useState(hoy)
  const [customFin,  setCustomFin]  = useState(hoy)
  const [sprintId,   setSprintId]   = useState(null)
  const [popupModel, setPopupModel] = useState(null)

  const buildQs = () => {
    if (filtro === 'sprint') return `?filtro=sprint${sprintId ? `&sprintId=${sprintId}` : ''}`
    if (filtro === 'rango' && customIni && customFin) return `?filtro=rango&desde=${customIni}&hasta=${customFin}`
    return `?filtro=rango&desde=${hoy}&hasta=${hoy}`
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/dashboard-personal${buildQs()}`)
      setData(res.data)
    } catch (err) { console.error('[MiDashboard]', err) }
    finally { setLoading(false) }
  }, [filtro, customIni, customFin, sprintId])

  useEffect(() => { load() }, [])

  if (loading) return <PageLoader message="Cargando dashboard..." />
  if (!data)   return null

  const { empleado, sprint, sprints, kpis, byModel, modelDetail, horasPorDia, rango } = data
  const totalMins  = Object.values(byModel).reduce((a, b) => a + b, 0)
  const initials   = empleado.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')
  const rangoLabel = rango?.ini === rango?.fin ? rango?.ini : `${rango?.ini} — ${rango?.fin}`

  const pieData = Object.entries(byModel).filter(([, m]) => m > 0)
    .map(([model, mins]) => ({ name: model, value: mins, color: MODEL_META[model].color,
      pct: totalMins > 0 ? Math.round(mins / totalMins * 100) : 0 }))

  return (
    <div>
      {/* Título */}
      <div className="mdb-page-title">
        <h2 className="mdb-title">Mi Dashboard</h2>
        <p className="mdb-subtitle">
          Indicadores personales ·{' '}
          <strong>{{ dia: 'Día', semana: 'Semana', mes: 'Mes', sprint: 'Sprint', rango: 'Rango' }[filtro]} · {rangoLabel}</strong>
        </p>
      </div>

      {/* Header empleado */}
      <div className="mdb-emp-header">
        <div className="mdb-emp-info">
          <div className="mdb-avatar">{initials}</div>
          <div>
            <div className="mdb-emp-name">{empleado.nombre}</div>
            <div className="mdb-emp-detail">
              {empleado.cargo}
              <span className="mdb-emp-detail-sep">·</span>
              {empleado.area}
              {empleado.jefe && <span style={{ color: 'var(--t-muted)', marginLeft: 8 }}>· Jefe: {empleado.jefe}</span>}
            </div>
            <div className="mdb-emp-tags">
              {sprint && <span className="mdb-sprint-tag">{sprint.nombre} · ACTIVO</span>}
              <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: '1px solid',
                background: kpis.capacityPct >= 80 ? 'rgba(48,105,59,0.1)' : kpis.capacityPct >= 40 ? 'rgba(214,88,48,0.1)' : 'rgba(153,44,38,0.1)',
                color: kpis.capacityPct >= 80 ? '#30693B' : kpis.capacityPct >= 40 ? '#D65830' : '#992C26',
                borderColor: kpis.capacityPct >= 80 ? 'rgba(48,105,59,0.3)' : kpis.capacityPct >= 40 ? 'rgba(214,88,48,0.3)' : 'rgba(153,44,38,0.3)',
              }}>
                {kpis.capacityPct >= 80 ? '✓' : '⚠'} Capacity {kpis.capacityPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mdb-filters">
        <div className="mdb-date-filter">
          <span className="mdb-date-icon">📅</span>
          <input type="date" value={customIni} max={hoy}
            className="mdb-date-input"
            onChange={e => { const v = e.target.value; setCustomIni(v); if (v > customFin) setCustomFin(v); setFiltro('rango'); setTimeout(() => load(), 50) }}/>
          <span className="mdb-date-sep">→</span>
          <input type="date" value={customFin} min={customIni} max={hoy}
            className="mdb-date-input"
            onChange={e => { setCustomFin(e.target.value); setFiltro('rango'); setTimeout(() => load(), 50) }}/>
        </div>
        <select value={sprintId ?? ''} onChange={e => { const v = e.target.value ? parseInt(e.target.value) : null; setSprintId(v); setFiltro('sprint'); setTimeout(() => load(), 50) }}
          style={{
            padding: '6px 10px', borderRadius: 10,
            border: `1px solid ${filtro === 'sprint' ? 'var(--c-accent)' : 'var(--c-border)'}`,
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            background: filtro === 'sprint' ? 'rgba(99,102,241,.07)' : 'var(--c-surface)',
            color: 'var(--t-primary)', minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          }}>
          <option value="">Sprint activo</option>
          {sprints?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <button className="mdb-reset-btn" title="Ver hoy"
          onClick={() => { setFiltro('rango'); setCustomIni(hoy); setCustomFin(hoy); setSprintId(null); setTimeout(() => load(), 50) }}>
          <RefreshCw size={13}/>
        </button>
      </div>

      {/* KPIs */}
      <div className="mdb-kpi-grid">
        <KpiCard accent label="Capacity"         value={`${kpis.capacityPct}%`}    sub={`${fmtMins(kpis.totalMins)} registradas`} />
        <KpiCard       label="Horas registradas" value={fmtMins(kpis.totalMins)}   sub={`${kpis.totalActividades} act. · ${kpis.diasConActividad} días`} />
        <KpiCard       label="Promedio diario"   value={fmtMins(kpis.promMins)}    sub="Por día con actividad" />
        <KpiCard       label="Días finalizados"  value={kpis.diasFinalizados}       sub="Con actividad registrada" />
        <KpiCard       label="Tareas no plan."   value={`${kpis.noPlaneadasPct}%`}  sub="Meta ≤ 20%"
          warn={kpis.noPlaneadasPct > 20} danger={kpis.noPlaneadasPct > 35} />
      </div>

      {/* Distribución por dominio */}
      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div className="mdb-section-hdr">
          <div className="mdb-section-dot" style={{ background: 'var(--c-accent)' }} />
          <span className="mdb-section-ttl">Capacity — Distribución por Dominio</span>
        </div>
        <div className="mdb-section-tip">💡 Doble clic en cada dominio para ver el detalle de tareas</div>
        {totalMins === 0
          ? <div className="mdb-no-data">Sin actividades en el período seleccionado</div>
          : <div className="mdb-model-grid">
              {Object.keys(MODEL_META).map(m => (
                <ModelCard key={m} model={m} mins={byModel[m] ?? 0} totalMins={totalMins} onDoubleClick={setPopupModel} />
              ))}
            </div>
        }
      </div>

      {/* Gráficas */}
      <div className="mdb-charts">
        <div className="card" style={{ padding: 20 }}>
          <div className="mdb-section-hdr">
            <div className="mdb-section-dot" style={{ background: 'var(--brand-orange)' }} />
            <span className="mdb-section-ttl">Horas por Día</span>
          </div>
          {horasPorDia.length === 0
            ? <div className="mdb-no-data">Sin datos</div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={horasPorDia} margin={{ top: 22, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 12, fill: 'var(--t-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${Math.floor(v / 60)}h`} tick={{ fontSize: 12, fill: 'var(--t-muted)' }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<BarTooltip />} />
                  <Bar dataKey="mins" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {horasPorDia.map((d, i) => <Cell key={i} fill={d.mins >= 480 ? '#30693B' : d.mins >= 240 ? '#D65830' : '#3E5D9D'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="mdb-section-hdr">
            <div className="mdb-section-dot" style={{ background: 'var(--c-accent)' }} />
            <span className="mdb-section-ttl">Distribución por Dominio</span>
          </div>
          {pieData.length === 0
            ? <div className="mdb-no-data">Sin datos</div>
            : <div className="mdb-pie-wrap">
                <ResponsiveContainer width={170} height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                      dataKey="value" strokeWidth={2} stroke="var(--c-surface)">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mdb-pie-legend">
                  {pieData.map((d, i) => (
                    <div key={i} className="mdb-legend-row">
                      <div className="mdb-legend-left">
                        <span className="mdb-legend-dot" style={{ background: d.color }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.name}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: d.color }}>{d.pct}%</span>
                        <span style={{ fontSize: 12, color: 'var(--t-muted)', marginLeft: 6 }}>{fmtMins(d.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          }
        </div>
      </div>

      {popupModel && <ModelPopup model={popupModel} detail={modelDetail[popupModel]} totalMins={totalMins} onClose={() => setPopupModel(null)} />}
    </div>
  )
}
