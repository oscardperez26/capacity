import { useState } from 'react'
import { Filter, X, Download } from 'lucide-react'
import { AREAS_DATA, AREA_LOADS, AREA_TREND, ESP_LOADS } from '../../data/mockData'
import { loadPctClass, pctColor, barClass, minsToH } from '../../utils/capacityUtils'
import TrendChart from '../../components/charts/TrendChart'
import Button from '../../components/ui/Button'
import Toast from '../../components/ui/Toast'

export default function GlobalPMO() {
  const [filterArea, setFilterArea] = useState('')
  const [filterCargo, setFilterCargo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selArea, setSelArea] = useState(null)
  const [compareMode, setCompareMode] = useState('sprint')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const areasArr = Object.entries(AREAS_DATA).map(([k, v]) => ({ key: k, ...v }))
  const allCargos = [...new Set(areasArr.flatMap(a => a.cargos ?? []))]

  const filteredAreas = areasArr.filter(a => {
    const matchArea = !filterArea || a.label.toLowerCase().includes(filterArea.toLowerCase())
    const matchCargo = !filterCargo || a.cargos?.includes(filterCargo)
    return matchArea && matchCargo
  })

  const totalHoras = filteredAreas.reduce((acc, a) => acc + (AREA_LOADS[a.key]?.horas ?? 0), 0)
  const avgProd = Math.round(
    filteredAreas.reduce((acc, a) => acc + (AREA_LOADS[a.key]?.avg ?? 0), 0) / Math.max(filteredAreas.length, 1)
  )

  const selAreaData = selArea ? AREAS_DATA[selArea] : null
  const selEsps = selAreaData?.especialistas ?? []
  const selLoad = selArea ? AREA_LOADS[selArea] : null
  const selTrend = selArea ? AREA_TREND[selArea] : null

  const trendData = selArea ? {
    dia:    [82,88,91,78,95,87,90,85,92,88,94,96].map((v, i) => ({ l: `D${i+1}`, v })),
    semana: [88,91,85,93,95,97].map((v, i) => ({ l: `S${i+1}`, v })),
    sprint: (AREA_TREND[selArea] ?? []).map((v, i) => ({ l: `Sp${i+1}`, v })),
  }[compareMode] : null

  const exportCSV = () => {
    showToast('📊 Exportando estadísticas en Excel...')
    const header = 'Área,Carga%,RUN%,BUILD%,ADMIN%,Horas\n'
    const rows = filteredAreas.map(a => {
      const d = AREA_LOADS[a.key]
      return `${a.label},${d.avg},${d.run},${d.build},${d.admin},${(d.horas / 60).toFixed(1)}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'capacity_report_sprint5.csv'
    document.body.appendChild(link); link.click()
    document.body.removeChild(link); URL.revokeObjectURL(url)
  }

  const areaKPIs = selArea ? [
    { l: 'Carga promedio',     v: `${selLoad?.avg}%`,                   c: pctColor(selLoad?.avg ?? 0) },
    { l: 'RUN',                v: `${selLoad?.run}%`,                   c: 'var(--brand-blue)' },
    { l: 'BUILD',              v: `${selLoad?.build}%`,                 c: 'var(--brand-green)' },
    { l: 'ADMIN',              v: `${selLoad?.admin}%`,                 c: 'var(--brand-orange)' },
    { l: 'Horas registradas',  v: `${((selLoad?.horas ?? 0) / 60).toFixed(0)}h`, c: 'var(--c-accent)' },
    { l: 'Especialistas',      v: selEsps.length,                        c: 'var(--t-primary)' },
  ] : []

  return (
    <div>
      <Toast message={toast} type="success" />

      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Global PMO Dashboard</h2>
          <p className="sec-sub">Visión estratégica · Todas las áreas TI · Sprint 5</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button className={`btn-ghost btn-sm ${showFilters ? 'btn-outline-accent' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={11} /> Filtros
          </Button>
          <Button className="btn-primary btn-sm" onClick={exportCSV}>
            <Download size={11} /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div className="filter-group">
            <label className="filter-label">Área</label>
            <input className="filter-inp" placeholder="Filtrar por área..." value={filterArea} onChange={e => setFilterArea(e.target.value)} />
          </div>
          <div className="filter-group" style={{ maxWidth: 220 }}>
            <label className="filter-label">Cargo</label>
            <select className="filter-inp" value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
              <option value="">Todos los cargos</option>
              {allCargos.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Button className="btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => { setFilterArea(''); setFilterCargo('') }}>
            <X size={11} /> Limpiar
          </Button>
        </div>
      )}

      {/* KPIs principales */}
      <div className="kpi-grid">
        <div className="kpi-card accent-card">
          <div className="kpi-label">Productividad Global</div>
          <div className="kpi-value">{avgProd}%</div>
          <div className="kpi-sub">↑ +2.1% vs Sprint 4</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Horas Registradas</div>
          <div className="kpi-value" style={{ color: 'var(--c-accent)' }}>{(totalHoras / 60).toFixed(0)}h</div>
          <div className="kpi-sub">Sprint actual · {areasArr.length} áreas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Build Global</div>
          <div className="kpi-value" style={{ color: 'var(--brand-green)' }}>33%</div>
          <div className="kpi-sub">Meta: 40%</div>
        </div>
        <div className="kpi-card danger-card">
          <div className="kpi-label">Áreas Sobrecargadas</div>
          <div className="kpi-value">{Object.values(AREA_LOADS).filter(a => a.avg > 100).length}</div>
          <div className="kpi-sub">Sobre el 100%</div>
        </div>
      </div>

      {/* KPIs secundarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { l: 'RUN vs BUILD',        v: '65% / 33%', obj: 'Obj: 60/40',      c: 'var(--brand-blue)' },
          { l: 'Ausentismo',          v: '4.2%',      obj: 'Rango aceptable',  c: 'var(--brand-orange)' },
          { l: 'Horas extra',         v: '127h',      obj: 'Soporte y Seg.',   c: 'var(--brand-red)' },
          { l: 'Total especialistas', v: Object.values(AREAS_DATA).flatMap(a => a.especialistas).length, obj: '5 áreas', c: 'var(--c-accent)' },
        ].map((k, i) => (
          <div key={i} style={{ padding: '11px 13px', background: 'var(--c-surface)', borderRadius: 9, border: '1px solid var(--c-border)', boxShadow: 'var(--s-xs)' }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--t-muted)' }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: k.c, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{k.v}</div>
            <div style={{ fontSize: 8.5, color: 'var(--t-muted)', marginTop: 2 }}>{k.obj}</div>
          </div>
        ))}
      </div>

      {/* Area cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {filteredAreas.map(area => {
          const d = AREA_LOADS[area.key] ?? { avg: 80, run: 65, build: 25, admin: 10, horas: 400 }
          const trend = AREA_TREND[area.key] ?? []
          const isSel = selArea === area.key
          return (
            <div
              key={area.key}
              className={`area-card ${isSel ? 'sel-area' : ''}`}
              onClick={() => setSelArea(isSel ? null : area.key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{area.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`badge ${d.avg > 100 ? 'badge-red' : d.avg > 80 ? 'badge-amber' : 'badge-green'}`}>{d.avg}%</span>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {isSel
                      ? <polyline points="18 15 12 9 6 15" />
                      : <polyline points="6 9 12 15 18 9" />}
                  </svg>
                </div>
              </div>

              <div className="prog-wrap" style={{ marginBottom: 8, height: 5 }}>
                <div className={`prog-fill ${d.avg > 100 ? 'prog-danger' : d.avg > 80 ? 'prog-warn' : 'prog-normal'}`}
                  style={{ width: `${Math.min(d.avg, 100)}%` }} />
              </div>

              {/* Mini trend bars */}
              <div className="trend-bars" style={{ height: 28, marginBottom: 6 }}>
                {trend.map((v, ti) => (
                  <div key={ti} className="trend-bar" style={{
                    height: `${(v / 120) * 100}%`,
                    background: v > 100 ? 'var(--brand-red)' : v > 80 ? 'var(--brand-orange)' : 'var(--brand-violet)',
                    opacity: ti === trend.length - 1 ? 1 : 0.4 + ti * 0.1,
                  }} />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                {[{ l: 'RUN', v: d.run, c: 'var(--brand-blue)' }, { l: 'BUILD', v: d.build, c: 'var(--brand-green)' }, { l: 'ADMIN', v: d.admin, c: 'var(--brand-orange)' }].map(x => (
                  <span key={x.l} style={{ fontSize: 8, fontWeight: 700, color: x.c }}>{x.l}: {x.v}%</span>
                ))}
              </div>
              <div style={{ fontSize: 8.5, color: 'var(--t-muted)' }}>
                {area.especialistas.length} especialistas · {(d.horas / 60).toFixed(1)}h
              </div>
            </div>
          )
        })}
      </div>

      {/* Detalle área seleccionada */}
      {selArea && (
        <div className="card" style={{ padding: 20, border: '2px solid var(--brand-violet)', animation: 'actIn .25s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 900 }}>{selAreaData?.label} — Análisis Detallado</h3>
              <p style={{ fontSize: 9.5, color: 'var(--t-muted)', marginTop: 2 }}>Sprint 5 · {selEsps.length} especialistas</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Button className="btn-ghost btn-sm" onClick={exportCSV}><Download size={11} /> Excel</Button>
              <button onClick={() => setSelArea(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-muted)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* KPI del área */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 16 }}>
            {areaKPIs.map((k, i) => (
              <div key={i} style={{ padding: '9px 11px', background: 'var(--c-surface2)', borderRadius: 9, border: '1px solid var(--c-border)', textAlign: 'center' }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--t-muted)', marginBottom: 4 }}>{k.l}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: k.c, fontFamily: 'JetBrains Mono, monospace' }}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Carga por especialista */}
            <div>
              <h4 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--t-muted)', marginBottom: 10 }}>
                Carga por Especialista
              </h4>
              {selEsps.map((e, i) => {
                const d = ESP_LOADS[e.id] ?? { load: 75, run: 60, build: 30, admin: 10, hours: '6.0' }
                return (
                  <div key={e.id} style={{ padding: '9px 0', borderBottom: i < selEsps.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 11.5 }}>{e.name}</span>
                        <span style={{ fontSize: 8.5, color: 'var(--t-muted)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: .3 }}>{e.cargo}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 9, color: 'var(--t-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{d.hours}h</span>
                        <span className={`load-pct ${loadPctClass(d.load)}`}>{d.load}%</span>
                      </div>
                    </div>
                    <div className="prog-wrap" style={{ height: 4 }}>
                      <div className={`prog-fill ${d.load > 100 ? 'prog-danger' : d.load > 80 ? 'prog-warn' : 'prog-normal'}`}
                        style={{ width: `${Math.min(d.load, 100)}%` }} />
                    </div>
                    <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
                      {[{ l: 'RUN', v: d.run, c: 'var(--brand-blue)' }, { l: 'BUILD', v: d.build, c: 'var(--brand-green)' }, { l: 'ADMIN', v: d.admin, c: 'var(--brand-orange)' }].map(x => (
                        <span key={x.l} style={{ fontSize: 7.5, fontWeight: 700, color: x.c }}>{x.l}: {x.v}%</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trend chart */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--t-muted)' }}>
                  Comparativa en el tiempo
                </h4>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'sprint', label: 'Sprint' }].map(m => (
                    <button key={m.id} onClick={() => setCompareMode(m.id)}
                      style={{ padding: '3px 8px', borderRadius: 6, fontSize: 8.5, fontWeight: 700, border: '1px solid', cursor: 'pointer', transition: 'all .15s', background: compareMode === m.id ? 'var(--c-accent)' : 'transparent', borderColor: compareMode === m.id ? 'var(--c-accent)' : 'var(--c-border2)', color: compareMode === m.id ? 'white' : 'var(--t-muted)' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {trendData && <TrendChart data={trendData} height={100} />}

              <div style={{
                padding: '9px 12px', borderRadius: 8,
                background: (selLoad?.avg ?? 0) > 100 ? 'var(--c-danger-bg)' : (selLoad?.avg ?? 0) > 80 ? 'var(--c-warn-bg)' : 'var(--c-success-bg)',
                border: `1px solid ${(selLoad?.avg ?? 0) > 100 ? 'rgba(153,44,38,0.18)' : (selLoad?.avg ?? 0) > 80 ? 'rgba(214,88,48,0.18)' : 'rgba(48,105,59,0.18)'}`,
              }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: (selLoad?.avg ?? 0) > 100 ? 'var(--c-danger2)' : (selLoad?.avg ?? 0) > 80 ? 'var(--c-warn)' : 'var(--c-success)' }}>
                  {(selLoad?.avg ?? 0) > 100 ? '⚡ Área sobrecargada' : (selLoad?.avg ?? 0) > 80 ? '⚠ Área próxima al límite' : '✓ Área en rango óptimo'}
                </p>
                <p style={{ fontSize: 8.5, color: 'var(--t-muted)', marginTop: 3 }}>
                  {selEsps.filter(e => (ESP_LOADS[e.id]?.load ?? 75) > 100).length} especialistas sobre el 100% · {selLoad?.run ?? 0}% tiempo en RUN
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
