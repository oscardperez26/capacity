import { useState } from 'react'
import { Filter, X, Download } from 'lucide-react'
import { AREAS_DATA, AREA_LOADS, ESP_LOADS } from '../../data/mockData'
import { loadPctClass, minsToH } from '../../utils/capacityUtils'
import ProgressBar from '../../components/ui/ProgressBar'
import BarChart from '../../components/charts/BarChart'
import Button from '../../components/ui/Button'

export default function DashboardEquipo({ user }) {
  const areaKey = user?.area ?? 'infraestructura'
  const areaData = AREAS_DATA[areaKey]
  const especialistas = areaData?.especialistas ?? []
  const cargos = areaData?.cargos ?? []
  const [filterCargo, setFilterCargo] = useState('')
  const [filterEsp, setFilterEsp] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = especialistas.filter(e =>
    (!filterCargo || e.cargo === filterCargo) &&
    (!filterEsp || e.name.toLowerCase().includes(filterEsp.toLowerCase()))
  )

  const avgLoad = Math.round(
    filtered.reduce((a, e) => a + (ESP_LOADS[e.id]?.load ?? 75), 0) / Math.max(filtered.length, 1)
  )

  const areasBar = cargos.map(c => {
    const cargoEsps = especialistas.filter(e => e.cargo === c)
    const avg = Math.round(
      cargoEsps.reduce((a, e) => a + (ESP_LOADS[e.id]?.load ?? 75), 0) / Math.max(cargoEsps.length, 1)
    )
    return { l: c.split(' ').slice(-1)[0], p: avg }
  })

  return (
    <div>
      <div className="sec-hdr">
        <div>
          <h2 className="sec-title">Dashboard — {areaData?.label}</h2>
          <p className="sec-sub">Sprint 5 · {especialistas.length} colaboradores en tu área</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button className={`btn-ghost btn-sm ${showFilters ? 'btn-outline-accent' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={11} /> Filtros
          </Button>
          <Button className="btn-primary btn-sm"><Download size={11} /> Exportar</Button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div className="filter-group">
            <label className="filter-label">Especialista</label>
            <input className="filter-inp" placeholder="Buscar por nombre..." value={filterEsp} onChange={e => setFilterEsp(e.target.value)} />
          </div>
          <div className="filter-group" style={{ maxWidth: 200 }}>
            <label className="filter-label">Cargo</label>
            <select className="filter-inp" value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
              <option value="">Todos los cargos</option>
              {cargos.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Button className="btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => { setFilterCargo(''); setFilterEsp('') }}>
            <X size={11} /> Limpiar
          </Button>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card accent-card">
          <div className="kpi-label">Carga Promedio</div>
          <div className="kpi-value">{avgLoad}%</div>
          <div className="kpi-sub">{areaData?.label}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Colaboradores</div>
          <div className="kpi-value" style={{ color: 'var(--c-accent)' }}>{filtered.length}</div>
          <div className="kpi-sub">Filtrados de {especialistas.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Build / Run área</div>
          <div className="kpi-value" style={{ color: 'var(--brand-green)' }}>32/68</div>
          <div className="kpi-sub">Meta: 35/65</div>
        </div>
        <div className="kpi-card danger-card">
          <div className="kpi-label">Sobrecargados</div>
          <div className="kpi-value">{filtered.filter(e => (ESP_LOADS[e.id]?.load ?? 75) > 100).length}</div>
          <div className="kpi-sub">Sobre el 100%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Specialists load */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--t-muted)', marginBottom: 14 }}>
            Carga por Especialista
          </h3>
          {filtered.map(e => {
            const d = ESP_LOADS[e.id] ?? { load: 75, run: 60, build: 30, admin: 10, hours: '6.0' }
            return (
              <div key={e.id} className="load-row">
                <div className="load-name-row">
                  <div>
                    <span className="load-name">{e.name}</span>
                    <span className="load-area-tag">— {e.cargo}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, color: 'var(--t-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{d.hours}h</span>
                    <span className={`load-pct ${loadPctClass(d.load)}`}>{d.load}%</span>
                  </div>
                </div>
                <div className="prog-wrap" style={{ height: 5 }}>
                  <div className={`prog-fill ${d.load > 100 ? 'prog-danger' : d.load > 80 ? 'prog-warn' : 'prog-normal'}`}
                    style={{ width: `${Math.min(d.load, 100)}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
                  {[{ l: 'RUN', v: d.run, c: 'var(--brand-blue)' }, { l: 'BUILD', v: d.build, c: 'var(--brand-green)' }, { l: 'ADMIN', v: d.admin, c: 'var(--brand-orange)' }].map(x => (
                    <span key={x.l} style={{ fontSize: 8.5, fontWeight: 700, color: x.c }}>{x.l}: {x.v}%</span>
                  ))}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state"><p>Sin resultados para los filtros aplicados</p></div>
          )}
        </div>

        {/* Bar chart */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--t-muted)', marginBottom: 12 }}>
            Capacity por Cargo
          </h3>
          <BarChart data={areasBar} />
          <div style={{ height: 1, background: 'var(--c-border)', margin: '10px 0' }} />
          <div style={{ background: 'var(--c-warn-bg)', border: '1px solid rgba(214,88,48,0.2)', borderRadius: 8, padding: '8px 11px' }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--c-warn)' }}>⚡ Insights del área</p>
            <p style={{ fontSize: 8.5, color: 'var(--t-muted)', marginTop: 3 }}>
              {filtered.filter(e => (ESP_LOADS[e.id]?.load ?? 75) > 100).length} especialistas sobrecargados · {AREA_LOADS[areaKey]?.run ?? 65}% en RUN
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
