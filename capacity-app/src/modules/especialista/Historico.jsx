/**
 * Historico.jsx — v4
 * KPIs + sección de rechazadas editables + acordeón sprint→semana→día→acts
 */
import './Historico.css'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Filter, X, Calendar, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle, Clock, XCircle, Edit3,
  Send, AlertCircle,
} from 'lucide-react'
import { api }         from '../../lib/apiClient'
import { PageLoader }  from '../../components/ui/Spinner'
import ProgressBar     from '../../components/ui/ProgressBar'
import Button          from '../../components/ui/Button'

const MODEL_COLOR = {
  RUN:'#3E5D9D', BUILD:'#30693B', ADMIN:'#D65830', GROW:'#4554A1', OFF:'#992C26',
}
function fmtM(m) {
  if (!m) return '0h'
  const h=Math.floor(m/60), r=m%60
  if (!h) return `${r}m`; if (!r) return `${h}h`; return `${h}h ${r}m`
}
const ST = {
  aprobado: { bg:'rgba(48,105,59,.1)',  color:'#30693B', label:'Aprobado'  },
  enviado:  { bg:'rgba(62,93,157,.1)', color:'#3E5D9D', label:'Enviado'   },
  borrador: { bg:'rgba(214,88,48,.1)', color:'#D65830', label:'Borrador'  },
  rechazado:{ bg:'rgba(153,44,38,.1)', color:'#992C26', label:'Rechazado' },
  activo:   { bg:'rgba(51,40,154,.1)', color:'var(--c-accent)', label:'Activo' },
  cerrado:  { bg:'var(--c-surface2)',  color:'var(--t-muted)',  label:'Cerrado' },
}
function Chip({ s }) {
  const c = ST[s] ?? ST.cerrado
  return <span className="his-chip" style={{ background:c.bg, color:c.color }}>{c.label}</span>
}

// ── KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, pct, color }) {
  return (
    <div className="his-kpi-card">
      <div className="his-kpi-icon" style={{ background:`${color}15` }}>{icon}</div>
      <div>
        <div className="his-kpi-label">{label}</div>
        <div className="his-kpi-value" style={{ color }}>{value}</div>
        {pct !== undefined && <div className="his-kpi-pct">{pct}% del total</div>}
      </div>
    </div>
  )
}

// ── Editor inline de actividad rechazada ──────────────────────────────────
function EditorAct({ act, onSaved }) {
  const [dur,  setDur]  = useState(act.mins)
  const [desc, setDesc] = useState(act.desc ?? '')
  const [busy, setBusy] = useState(false)
  const [ok,   setOk]   = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api.patch(`/entries/activities/${act.id}`, { field:'dur',  value: dur  })
      await api.patch(`/entries/activities/${act.id}`, { field:'desc', value: desc })
      setOk(true); onSaved?.()
    } catch (e) { alert(e.message) }
    finally { setBusy(false) }
  }

  if (ok) return (
    <div className="his-editor-saved">
      <CheckCircle size={12}/> Guardado — listo para reenviar
    </div>
  )

  return (
    <div className="his-editor">
      <div className="his-editor-ttl">✏️ Corregir</div>
      <div className="his-editor-row">
        <div>
          <div className="his-editor-mins-lbl">Mins</div>
          <input type="number" min={1} step={15} value={dur}
            onChange={e => setDur(parseInt(e.target.value)||1)}
            className="his-editor-input" />
        </div>
        <div className="his-editor-desc-wrap">
          <div className="his-editor-desc-lbl">Descripción / corrección</div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="Escribe la corrección según las observaciones del jefe..."
            className="his-editor-textarea" />
        </div>
        <button onClick={save} disabled={busy}
          className="his-editor-ok"
          style={{ cursor:busy?'not-allowed':'pointer', opacity:busy?.6:1 }}>
          <CheckCircle size={11}/> {busy?'...':'OK'}
        </button>
      </div>
    </div>
  )
}

// ── Bloque de jornada rechazada ────────────────────────────────────────────
function BloqueRechazado({ sprint, semana, dia, onReenviado }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const reenviar = async () => {
    setBusy(true)
    try {
      await api.post(`/entries/reenviar/${dia.idRegistro}`)
      setDone(true); onReenviado?.()
    } catch (e) { alert(e.message) }
    finally { setBusy(false) }
  }

  if (done) return (
    <div className="his-blk-done">
      <CheckCircle size={16}/> Corrección enviada al jefe para aprobación
    </div>
  )

  const motivo = dia.acts.find(a => a.comentario)?.comentario

  return (
    <div className="his-blk-card">
      {/* Header */}
      <div className="his-blk-hdr">
        <XCircle size={15} style={{ color:'#992C26', flexShrink:0 }} />
        <span className="his-blk-date">{dia.date}</span>
        <span className="his-blk-info">{sprint} · {semana}</span>
        <span className="his-blk-mins">{fmtM(dia.mins)}</span>
      </div>

      <div className="his-blk-body">
        {motivo && (
          <div className="his-blk-motivo">
            <span style={{ flexShrink:0 }}>💬</span>
            <span><strong>Motivo del jefe:</strong> {motivo}</span>
          </div>
        )}

        <div className="his-blk-acts">
          {dia.acts.map((act, i) => (
            <div key={i}>
              <div className="his-blk-act-hdr">
                <span className="his-blk-act-model"
                  style={{ background:`${MODEL_COLOR[act.model]}15`, color:MODEL_COLOR[act.model] }}>
                  {act.model}
                </span>
                <span className="his-blk-act-name">{act.name}</span>
                <span className="his-blk-act-cat">{act.cat}</span>
                <span className="his-blk-act-mins">{fmtM(act.mins)}</span>
              </div>
              <EditorAct act={{ id:act.id, mins:act.mins, desc:act.desc }} />
            </div>
          ))}
        </div>

        <button onClick={reenviar} disabled={busy}
          className="his-blk-reenviar"
          style={{ cursor:busy?'not-allowed':'pointer', opacity:busy?.6:1 }}>
          <Send size={14}/> {busy ? 'Enviando...' : 'Reenviar corrección para aprobación'}
        </button>
      </div>
    </div>
  )
}

// ── Sección rechazadas ─────────────────────────────────────────────────────
function SeccionRechazadas({ data, onReenviado }) {
  const items = []
  for (const sp of data) {
    for (const w of sp.weeks) {
      for (const d of w.days) {
        if (d.status === 'rechazado') {
          items.push({ sprint: sp.name, semana: w.label, dia: d })
        }
      }
    }
  }
  if (!items.length) return null
  return (
    <div className="his-rejected-section">
      <div className="his-rejected-hdr">
        <AlertCircle size={18} style={{ color:'#992C26' }} />
        <div>
          <div className="his-rejected-title">
            Actividades rechazadas — corrección pendiente ({items.length})
          </div>
          <div className="his-rejected-sub">
            Corrige cada actividad y reenvía para aprobación del jefe
          </div>
        </div>
      </div>
      {items.map((item, i) => (
        <BloqueRechazado key={i} sprint={item.sprint} semana={item.semana}
          dia={item.dia} onReenviado={onReenviado} />
      ))}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Historico() {
  const [data,        setData]      = useState([])
  const [loading,     setLoading]   = useState(true)
  const [loadingMore, setLoadMore]  = useState(false)
  const [pagination,  setPagination]= useState(null)
  const [offset,      setOffset]    = useState(0)
  const [error,       setError]     = useState(null)
  const [openSprint,  setOpenSprint]= useState(null)
  const [openWeek,    setOpenWeek]  = useState({})
  const [openDay,     setOpenDay]   = useState({})
  const [filterModel, setFilter]    = useState('')
  const [showF,       setShowF]     = useState(false)

  const LIMIT = 5

  const load = useCallback(async (currentOffset = 0, append = false) => {
    if (append) setLoadMore(true); else setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/entries/historico?limit=${LIMIT}&offset=${currentOffset}`)
      const sprints = res.data ?? []
      setData(prev => append ? [...prev, ...sprints] : sprints)
      setPagination(res.pagination ?? null)
      if (!append && sprints.length) setOpenSprint(sprints[0].id)
    } catch (e) { setError(e.message) }
    finally { if (append) setLoadMore(false); else setLoading(false) }
  }, [])

  const cargarMas = useCallback(() => {
    const next = offset + LIMIT
    setOffset(next)
    load(next, true)
  }, [offset, load])

  useEffect(() => { load(0, false) }, [])

  const stats = useMemo(() => {
    const allActs = data.flatMap(s => s.weeks.flatMap(w => w.days.flatMap(d => d.acts)))
    const total      = allActs.length
    const aprobadas  = allActs.filter(a => a.status === 'aprobado').length
    const rechazadas = allActs.filter(a => a.status === 'rechazado').length
    const pendientes = allActs.filter(a => ['enviado','borrador'].includes(a.status)).length
    const pct = n => total > 0 ? Math.round(n/total*100) : 0
    return { total, aprobadas, rechazadas, pendientes, pct }
  }, [data])

  if (loading) return <PageLoader message="Cargando histórico..." />
  if (error)   return (
    <div className="his-error">
      <span className="his-error-msg">❌ {error}</span>
      <Button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={11}/> Reintentar</Button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="his-page-hdr">
        <div>
          <h2 className="his-title">Histórico de actividades</h2>
          <p className="his-subtitle">
            {data.length} sprint(s) · {stats.total} actividades registradas
          </p>
        </div>
        <div className="his-hdr-btns">
          <Button className={`btn-ghost btn-sm${showF?' btn-active':''}`} onClick={() => setShowF(!showF)}>
            <Filter size={11}/> Filtros
          </Button>
          <Button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={11}/> Actualizar</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="his-kpi-grid">
        <KpiCard icon={<CheckCircle size={19} style={{color:'#30693B'}}/>} label="Aprobadas"
          value={stats.aprobadas} pct={stats.pct(stats.aprobadas)} color="#30693B" />
        <KpiCard icon={<Clock size={19} style={{color:'#3E5D9D'}}/>} label="Pendientes"
          value={stats.pendientes} pct={stats.pct(stats.pendientes)} color="#3E5D9D" />
        <KpiCard icon={<XCircle size={19} style={{color:'#992C26'}}/>} label="Rechazadas"
          value={stats.rechazadas} pct={stats.pct(stats.rechazadas)} color="#992C26" />
        <KpiCard icon={<Calendar size={19} style={{color:'#D65830'}}/>} label="Total"
          value={stats.total} color="#D65830" />
      </div>

      {/* Rechazadas editables */}
      <SeccionRechazadas data={data} onReenviado={load} />

      {/* Filtro modelo */}
      {showF && (
        <div className="his-filter-box">
          <div>
            <div className="his-filter-lbl">Modelo</div>
            <select value={filterModel} onChange={e => setFilter(e.target.value)}
              className="his-filter-sel">
              <option value="">Todos</option>
              {['RUN','BUILD','ADMIN','GROW','OFF'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {filterModel && <Button className="btn-ghost btn-sm" onClick={()=>setFilter('')}><X size={11}/> Limpiar</Button>}
        </div>
      )}

      {!data.length && (
        <div className="his-empty">
          <Calendar size={36} className="his-empty-icon" />
          <div className="his-empty-text">No tienes actividades registradas aún</div>
        </div>
      )}

      {/* Acordeón Sprint → Semana → Día → Actividades */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.map((sp) => (
          <div key={sp.id} className="card" style={{ overflow:'hidden' }}>
            {/* Sprint */}
            <button className="his-sprint-btn"
              onClick={()=>setOpenSprint(openSprint===sp.id?null:sp.id)}>
              <div className="his-sprint-left">
                <div className="his-sprint-icon" style={{
                  background: sp.status==='activo' ? 'var(--c-accent3)' : 'var(--c-surface2)',
                  borderColor: sp.status==='activo' ? 'rgba(51,40,154,.2)' : 'var(--c-border2)',
                }}>
                  <Calendar size={14} style={{ color: sp.status==='activo' ? 'var(--c-accent)' : 'var(--t-muted)' }}/>
                </div>
                <div className="his-sprint-info">
                  <div className="his-sprint-name">{sp.name}</div>
                  <div className="his-sprint-dates">{sp.dates}</div>
                </div>
              </div>
              <div className="his-sprint-right">
                <Chip s={sp.status}/>
                <span className="his-sprint-mins">{fmtM(sp.totalMins)}</span>
                {openSprint===sp.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </div>
            </button>

            {openSprint===sp.id && (
              <div style={{ borderTop:'1px solid var(--c-border)' }}>
                {sp.weeks.map((wk,wi) => {
                  const wk_key = `${sp.id}-${wi}`
                  return (
                    <div key={wk.id} style={{ borderBottom:'1px solid var(--c-border)' }}>
                      {/* Semana */}
                      <button className="his-week-btn"
                        style={{ background: openWeek[wk_key] ? 'var(--c-surface2)' : 'none' }}
                        onClick={()=>setOpenWeek(p=>({...p,[wk_key]:!p[wk_key]}))}>
                        <div className="his-week-left">
                          <Calendar size={11} style={{ color:'var(--t-muted)', flexShrink:0 }}/>
                          <span className="his-week-label">{wk.label}</span>
                          <span className="his-week-range">{wk.dateRange}</span>
                        </div>
                        <div className="his-week-right">
                          <Chip s={wk.status}/>
                          <span className="his-week-mins">{fmtM(wk.totalMins)}</span>
                          {openWeek[wk_key] ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        </div>
                      </button>

                      {openWeek[wk_key] && (
                        <div className="his-days-wrap">
                          {!wk.days.length && (
                            <p className="his-no-data">Sin actividades esta semana</p>
                          )}
                          {wk.days.map((d, di) => {
                            const d_key = `${wk_key}-${di}`
                            const fActs = d.acts.filter(a => !filterModel || a.model === filterModel)
                            const dayPct = Math.min(100, Math.round(d.mins/480*100))
                            return (
                              <div key={d_key} className="his-day-card">
                                {/* Día */}
                                <button className="his-day-btn"
                                  onClick={()=>setOpenDay(p=>({...p,[d_key]:!p[d_key]}))}>
                                  <div className="his-day-left">
                                    <span className="his-day-label">{d.date}</span>
                                    <Chip s={d.status}/>
                                  </div>
                                  <div className="his-day-right">
                                    <span className="his-day-count">{d.acts.length} act.</span>
                                    <div className="his-day-bar"><ProgressBar pct={dayPct} showLabel={false}/></div>
                                    <span className="his-day-mins">{fmtM(d.mins)}</span>
                                    {openDay[d_key] ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                                  </div>
                                </button>

                                {openDay[d_key] && (
                                  <div className="his-acts-wrap">
                                    {!fActs.length && (
                                      <p className="his-no-filter">Sin coincidencias con el filtro</p>
                                    )}
                                    {fActs.map((act, ai) => (
                                      <div key={ai} className="his-act-row" style={{
                                        background: act.status==='aprobado' ? 'rgba(48,105,59,.06)'
                                          : act.status==='rechazado' ? 'rgba(153,44,38,.06)' : 'var(--c-surface)',
                                        borderColor: act.status==='aprobado' ? 'rgba(48,105,59,.15)'
                                          : act.status==='rechazado' ? 'rgba(153,44,38,.15)' : 'var(--c-border)',
                                      }}>
                                        <div className="his-act-left">
                                          <div className="his-act-tags">
                                            <span className="his-act-model"
                                              style={{ background:`${MODEL_COLOR[act.model]}15`, color:MODEL_COLOR[act.model] }}>
                                              {act.model}
                                            </span>
                                            <span className="his-act-name">{act.name}</span>
                                            <span className="his-act-cat">{act.cat}</span>
                                          </div>
                                          {act.desc && <p className="his-act-desc">{act.desc}</p>}
                                          {act.comentario && (
                                            <p className="his-act-comment">💬 {act.comentario}</p>
                                          )}
                                        </div>
                                        <div className="his-act-right">
                                          <span className="his-act-mins">{fmtM(act.mins)}</span>
                                          <Chip s={act.status}/>
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

      {pagination?.hasMore && (
        <div className="his-load-more">
          <button
            onClick={cargarMas}
            disabled={loadingMore}
            className="his-load-btn"
            style={{ cursor: loadingMore ? 'wait' : 'pointer' }}>
            {loadingMore ? 'Cargando...' : `Cargar más (${pagination.total - data.length} sprints restantes)`}
          </button>
        </div>
      )}
    </div>
  )
}
