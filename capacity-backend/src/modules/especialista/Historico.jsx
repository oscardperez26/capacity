/**
 * Historico.jsx — Sesión D
 * Carga sprints, semanas y actividades reales desde la API.
 */

import { useState, useEffect, useMemo } from 'react'
import { Filter, X, Clock, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useAuth }         from '../../context/AuthContext'
import { api }             from '../../lib/apiClient'
import { MODEL_BADGE }     from '../../data/categories'
import { minsToH }         from '../../utils/capacityUtils'
import ProgressBar         from '../../components/ui/ProgressBar'
import Button              from '../../components/ui/Button'
import { PageLoader }      from '../../components/ui/Spinner'

// ── Badge de estado ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    aprobado:   { cls: 'badge-green',  label: 'Aprobado' },
    enviado:    { cls: 'badge-blue',   label: 'Enviado' },
    borrador:   { cls: 'badge-amber',  label: 'Borrador' },
    rechazado:  { cls: 'badge-red',    label: 'Rechazado' },
    finalizado: { cls: 'badge-green',  label: 'Finalizado' },
    abierto:    { cls: 'badge-accent', label: 'Abierto' },
    cerrado:    { cls: 'badge-green',  label: 'Cerrado' },
    activo:     { cls: 'badge-accent', label: 'Activo' },
  }
  const c = map[status] ?? { cls: 'badge-gray', label: status ?? '—' }
  return <span className={`badge ${c.cls}`}>{c.label}</span>
}

// ── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, danger, warn }) {
  const cls = accent ? 'accent-card' : danger ? 'danger-card' : warn ? 'warn-card' : ''
  return (
    <div className={`kpi-card ${cls}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={!accent && !danger && !warn ? { color: 'var(--c-accent)' } : {}}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Historico() {
  const { user }  = useAuth()
  const [data,    setData]    = useState([])       // sprints[]
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Accordion
  const [openSprint, setOpenSprint] = useState(null)
  const [openWeek,   setOpenWeek]   = useState(null)
  const [openDay,    setOpenDay]    = useState(null)

  // Filtros
  const [filterCat,   setFilterCat]   = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // ── Carga desde API ──────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/entries/historico')
      setData(res.data ?? [])
      // Abre el sprint más reciente por defecto
      if (res.data?.length > 0) setOpenSprint(res.data[0].id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── KPIs globales ────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const allActs  = data.flatMap(s => s.weeks.flatMap(w => w.days.flatMap(d => d.acts)))
    const total    = allActs.reduce((a, t) => a + t.mins, 0)
    const byModel  = allActs.reduce((acc, a) => { acc[a.model] = (acc[a.model] ?? 0) + a.mins; return acc }, {})
    const diasFin  = data.flatMap(s => s.weeks.flatMap(w => w.days)).filter(d => d.status === 'aprobado' || d.status === 'enviado').length
    const diasTot  = data.flatMap(s => s.weeks.flatMap(w => w.days)).length
    const promDia  = diasTot > 0 ? Math.round(total / diasTot) : 0
    return { total, byModel, diasFin, diasTot, promDia, totalActs: allActs.length }
  }, [data])

  // ── Filtro de actividades ────────────────────────────────────────────────
  const filterActs = (acts) => acts.filter(a =>
    (!filterCat   || a.cat.toLowerCase().includes(filterCat.toLowerCase())) &&
    (!filterModel || a.model === filterModel)
  )

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return <PageLoader message="Cargando histórico..." />

  if (error) return (
    <div style={{ padding: 24 }}>
      <div style={{ padding: '16px 20px', background: 'var(--c-danger-bg)', borderRadius: 12, border: '1px solid rgba(153,44,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--c-danger2)', fontWeight: 700, fontSize: 12 }}>❌ {error}</span>
        <Button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={11} /> Reintentar</Button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Histórico de Actividades</h2>
          <p className="sec-sub">Sprint › Semana › Día · {data.length} sprint(s) registrado(s)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button className={`btn-ghost btn-sm ${showFilters ? 'btn-outline-accent' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={11} /> Filtros
          </Button>
          <Button className="btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={11} /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <KpiCard accent label="Total registrado" value={`${minsToH(globalStats.total)}h`} sub={`${globalStats.totalActs} actividades`} />
        <KpiCard label="Promedio por día"  value={`${minsToH(globalStats.promDia)}h`} sub="Por día con actividad" />
        <KpiCard label="BUILD / RUN"
          value={`${Math.round((globalStats.byModel?.BUILD ?? 0) / Math.max(globalStats.total, 1) * 100)}% / ${Math.round((globalStats.byModel?.RUN ?? 0) / Math.max(globalStats.total, 1) * 100)}%`}
          sub="BUILD vs RUN" />
        <KpiCard label="Días aprobados" value={globalStats.diasFin} sub={`de ${globalStats.diasTot} con actividad`} />
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div className="filter-group">
            <label className="filter-label">Categoría</label>
            <input className="filter-inp" placeholder="Filtrar por categoría..." value={filterCat} onChange={e => setFilterCat(e.target.value)} />
          </div>
          <div className="filter-group" style={{ maxWidth: 160 }}>
            <label className="filter-label">Modelo</label>
            <select className="filter-inp" value={filterModel} onChange={e => setFilterModel(e.target.value)}>
              <option value="">Todos</option>
              {['RUN','BUILD','ADMIN','GROW','OFF'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <Button className="btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => { setFilterCat(''); setFilterModel('') }}>
            <X size={11} /> Limpiar
          </Button>
        </div>
      )}

      {/* Sin datos */}
      {data.length === 0 && (
        <div className="empty-state">
          <div className="empty-ico" style={{ opacity: .22 }}>
            <Calendar size={38} />
          </div>
          <p>No tienes actividades registradas aún</p>
          <p style={{ fontSize: 10, color: 'var(--t-muted)' }}>Registra actividades en "Mi Día" para verlas aquí</p>
        </div>
      )}

      {/* Acordeón: Sprint → Semana → Día → Actividades */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(sprint => (
          <div key={sprint.id} className="card" style={{ overflow: 'hidden' }}>

            {/* ── Cabecera Sprint ── */}
            <button
              onClick={() => setOpenSprint(openSprint === sprint.id ? null : sprint.id)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: sprint.status === 'activo' ? 'var(--c-accent3)' : 'var(--c-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${sprint.status === 'activo' ? 'rgba(51,40,154,0.2)' : 'var(--c-border2)'}` }}>
                  {sprint.status === 'activo'
                    ? <Clock size={16} style={{ color: 'var(--c-accent)' }} />
                    : <Calendar size={16} style={{ color: 'var(--t-muted)' }} />}
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>{sprint.name}</h3>
                  <p style={{ fontSize: 9.5, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: .4, marginTop: 2 }}>{sprint.dates}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={sprint.status} />
                <span style={{ fontSize: 10.5, color: 'var(--t-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {sprint.totalMins > 0 ? `${minsToH(sprint.totalMins)}h` : '—'}
                </span>
                {openSprint === sprint.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {/* ── Semanas ── */}
            {openSprint === sprint.id && (
              <div style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-surface2)' }}>
                {sprint.weeks.map((week, wi) => {
                  const weekKey = `${sprint.id}-${wi}`
                  return (
                    <div key={week.id} style={{ borderBottom: '1px solid var(--c-border)' }}>

                      {/* Cabecera semana */}
                      <button
                        onClick={() => setOpenWeek(openWeek === weekKey ? null : weekKey)}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px 10px 32px', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={12} style={{ color: 'var(--t-muted)' }} />
                          <span style={{ fontSize: 11.5, fontWeight: 700 }}>{week.label}</span>
                          <span style={{ fontSize: 9.5, color: 'var(--t-muted)' }}>{week.dateRange}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          {/* Modelos de la semana */}
                          {Object.entries(week.byModel ?? {}).map(([m, mins]) => (
                            <span key={m} className={`badge ${MODEL_BADGE[m] ?? 'badge-gray'}`} style={{ fontSize: 7 }}>
                              {m}: {minsToH(mins)}h
                            </span>
                          ))}
                          <StatusBadge status={week.status} />
                          <span style={{ fontSize: 10.5, color: 'var(--t-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {week.totalMins ? `${minsToH(week.totalMins)}h` : '0h'}
                          </span>
                          {openWeek === weekKey ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </button>

                      {/* Días de la semana */}
                      {openWeek === weekKey && (
                        <div style={{ padding: '0 20px 12px 44px' }}>
                          {week.days.length === 0 && (
                            <p style={{ fontSize: 11.5, color: 'var(--t-muted)', padding: '10px 0' }}>Sin actividades registradas esta semana</p>
                          )}
                          {week.days.map((day, di) => {
                            const dayKey = `${sprint.id}-${wi}-${di}`
                            const filtered = filterActs(day.acts)
                            return (
                              <div key={dayKey} style={{ marginBottom: 5, background: 'var(--c-surface)', borderRadius: 9, border: '1px solid var(--c-border)', overflow: 'hidden' }}>

                                {/* Cabecera día */}
                                <button
                                  onClick={() => setOpenDay(openDay === dayKey ? null : dayKey)}
                                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>{day.date}</span>
                                    <StatusBadge status={day.status} />
                                    {day.aprobadoPor && (
                                      <span style={{ fontSize: 8.5, color: 'var(--c-success)', fontWeight: 600 }}>
                                        ✓ {day.aprobadoPor}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 60 }}>
                                      <ProgressBar pct={(day.mins / 480) * 100} showLabel={false} />
                                    </div>
                                    <span style={{ fontSize: 10.5, color: 'var(--t-muted)', fontFamily: 'JetBrains Mono, monospace', minWidth: 36, textAlign: 'right' }}>
                                      {minsToH(day.mins)}h
                                    </span>
                                    {openDay === dayKey ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  </div>
                                </button>

                                {/* Actividades del día */}
                                {openDay === dayKey && (
                                  <div style={{ borderTop: '1px solid var(--c-border)', padding: '9px 14px', background: 'var(--c-surface2)' }}>
                                    {filtered.length === 0 && (
                                      <p style={{ fontSize: 10.5, color: 'var(--t-muted)', fontStyle: 'italic' }}>Sin resultados para los filtros aplicados</p>
                                    )}
                                    {filtered.map((act, ai) => (
                                      <div key={ai} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                        padding: '9px 12px',
                                        background: act.status === 'aprobado' ? 'var(--c-success-bg)' : act.status === 'rechazado' ? 'var(--c-danger-bg)' : 'var(--c-surface)',
                                        borderRadius: 8,
                                        border: `1px solid ${act.status === 'aprobado' ? 'rgba(48,105,59,0.15)' : act.status === 'rechazado' ? 'rgba(153,44,38,0.15)' : 'var(--c-border)'}`,
                                        marginBottom: 5,
                                      }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                                            <span className={`badge ${MODEL_BADGE[act.model] ?? 'badge-gray'}`}>{act.model}</span>
                                            <span style={{ fontSize: 11.5, fontWeight: 700 }}>{act.name}</span>
                                            <span style={{ fontSize: 8.5, color: 'var(--t-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{act.cat}</span>
                                          </div>
                                          {act.desc && (
                                            <p style={{ fontSize: 9.5, color: 'var(--t-secondary)', fontStyle: 'italic', marginTop: 2 }}>{act.desc}</p>
                                          )}
                                          {act.comentario && (
                                            <p style={{ fontSize: 9, color: 'var(--c-danger2)', fontWeight: 600, marginTop: 3 }}>
                                              ✕ {act.comentario}
                                            </p>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, marginLeft: 12 }}>
                                          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-secondary)' }}>
                                            {act.mins} min
                                          </span>
                                          <StatusBadge status={act.status} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
