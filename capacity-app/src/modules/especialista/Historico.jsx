/**
 * Historico.jsx — v4
 * KPIs + sección de rechazadas editables + acordeón sprint→semana→día→acts
 */
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
  return <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700,
    background:c.bg, color:c.color }}>{c.label}</span>
}

// ── KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, pct, color }) {
  return (
    <div style={{ background:'var(--c-surface)', borderRadius:12, padding:'14px 18px',
      border:'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:38, height:38, borderRadius:10, background:`${color}15`,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--t-muted)', marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:900, color, letterSpacing:-1, lineHeight:1 }}>{value}</div>
        {pct !== undefined && <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:1 }}>{pct}% del total</div>}
      </div>
    </div>
  )
}

// ── Editor inline de actividad rechazada ──────────────────────────────────
function EditorAct({ act, onSaved }) {
  const [dur,   setDur]   = useState(act.mins)
  const [desc,  setDesc]  = useState(act.desc ?? '')
  const [busy,  setBusy]  = useState(false)
  const [ok,    setOk]    = useState(false)

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
    <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(48,105,59,.08)',
      border:'1px solid rgba(48,105,59,.2)', fontSize:12, color:'#30693B', fontWeight:600,
      display:'flex', alignItems:'center', gap:6 }}>
      <CheckCircle size={12}/> Guardado — listo para reenviar
    </div>
  )

  return (
    <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(153,44,38,.05)',
      border:'1px solid rgba(153,44,38,.2)' }}>
      <div style={{ fontSize:10.5, fontWeight:700, color:'#992C26', marginBottom:8 }}>✏️ Corregir</div>
      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:9.5, fontWeight:600, color:'var(--t-muted)', marginBottom:3 }}>Mins</div>
          <input type="number" min={1} step={15} value={dur}
            onChange={e => setDur(parseInt(e.target.value)||1)}
            style={{ width:64, padding:'5px 8px', borderRadius:7, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', fontSize:13, fontWeight:700, color:'var(--t-primary)' }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9.5, fontWeight:600, color:'var(--t-muted)', marginBottom:3 }}>Descripción / corrección</div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="Escribe la corrección según las observaciones del jefe..."
            style={{ width:'100%', padding:'5px 9px', borderRadius:7, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', fontSize:11.5, resize:'none', fontFamily:'inherit', color:'var(--t-primary)' }} />
        </div>
        <button onClick={save} disabled={busy}
          style={{ marginTop:18, padding:'7px 11px', borderRadius:8, border:'none',
            background:'var(--c-accent)', color:'white', fontSize:11.5, fontWeight:700,
            cursor:busy?'not-allowed':'pointer', opacity:busy?.6:1, flexShrink:0,
            display:'flex', alignItems:'center', gap:4 }}>
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
    <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(48,105,59,.08)',
      border:'1px solid rgba(48,105,59,.2)', fontSize:13, color:'#30693B', fontWeight:700,
      display:'flex', alignItems:'center', gap:8 }}>
      <CheckCircle size={16}/> Corrección enviada al jefe para aprobación
    </div>
  )

  const motivo = dia.acts.find(a => a.comentario)?.comentario

  return (
    <div style={{ borderRadius:12, border:'1px solid rgba(153,44,38,.25)',
      background:'var(--c-surface)', overflow:'hidden', marginBottom:10 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px',
        background:'rgba(153,44,38,.05)', borderBottom:'1px solid rgba(153,44,38,.15)' }}>
        <XCircle size={15} style={{ color:'#992C26', flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:800, color:'#992C26' }}>{dia.date}</span>
        <span style={{ fontSize:11, color:'var(--t-muted)', flex:1 }}>{sprint} · {semana}</span>
        <span style={{ fontSize:12, color:'var(--t-secondary)', fontFamily:'JetBrains Mono, monospace' }}>{fmtM(dia.mins)}</span>
      </div>

      <div style={{ padding:'12px 16px' }}>
        {/* Motivo del jefe */}
        {motivo && (
          <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(153,44,38,.07)',
            border:'1px solid rgba(153,44,38,.2)', marginBottom:12,
            fontSize:12, color:'#992C26', fontWeight:600, display:'flex', gap:6, alignItems:'flex-start' }}>
            <span style={{ flexShrink:0 }}>💬</span>
            <span><strong>Motivo del jefe:</strong> {motivo}</span>
          </div>
        )}

        {/* Actividades editables */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {dia.acts.map((act, i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                <span style={{ padding:'2px 6px', borderRadius:99, fontSize:9.5, fontWeight:800,
                  background:`${MODEL_COLOR[act.model]}15`, color:MODEL_COLOR[act.model] }}>{act.model}</span>
                <span style={{ fontSize:12, fontWeight:700 }}>{act.name}</span>
                <span style={{ fontSize:10, color:'var(--t-muted)' }}>{act.cat}</span>
                <span style={{ fontSize:11, fontWeight:700, fontFamily:'JetBrains Mono, monospace',
                  color:'var(--t-secondary)', marginLeft:'auto' }}>{fmtM(act.mins)}</span>
              </div>
              <EditorAct act={{ id:act.id, mins:act.mins, desc:act.desc }} />
            </div>
          ))}
        </div>

        {/* Reenviar */}
        <button onClick={reenviar} disabled={busy}
          style={{ marginTop:14, width:'100%', padding:'10px', borderRadius:9, border:'none',
            background:'var(--c-accent)', color:'white', fontSize:13, fontWeight:700,
            cursor:busy?'not-allowed':'pointer', opacity:busy?.6:1,
            display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
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
    <div style={{ marginBottom:16, padding:18, borderRadius:14,
      background:'rgba(153,44,38,.04)', border:'2px solid rgba(153,44,38,.2)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <AlertCircle size={18} style={{ color:'#992C26' }} />
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'#992C26' }}>
            Actividades rechazadas — corrección pendiente ({items.length})
          </div>
          <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:2 }}>
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 18px', borderRadius:12, background:'rgba(153,44,38,.07)',
      border:'1px solid rgba(153,44,38,.2)' }}>
      <span style={{ color:'#992C26', fontWeight:700, fontSize:13 }}>❌ {error}</span>
      <Button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={11}/> Reintentar</Button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-.4 }}>Histórico de actividades</h2>
          <p style={{ fontSize:13, color:'var(--t-muted)', marginTop:3 }}>
            {data.length} sprint(s) · {stats.total} actividades registradas
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Button className={`btn-ghost btn-sm${showF?' btn-active':''}`} onClick={() => setShowF(!showF)}>
            <Filter size={11}/> Filtros
          </Button>
          <Button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={11}/> Actualizar</Button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
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
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', padding:'12px 16px',
          background:'var(--c-surface)', borderRadius:10, border:'1px solid var(--c-border)', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9.5, fontWeight:700, color:'var(--t-muted)', marginBottom:5,
              textTransform:'uppercase', letterSpacing:.8 }}>Modelo</div>
            <select value={filterModel} onChange={e => setFilter(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--c-border)',
                background:'var(--c-surface2)', fontSize:12, color:'var(--t-primary)' }}>
              <option value="">Todos</option>
              {['RUN','BUILD','ADMIN','GROW','OFF'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {filterModel && <Button className="btn-ghost btn-sm" onClick={()=>setFilter('')}><X size={11}/> Limpiar</Button>}
        </div>
      )}

      {!data.length && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t-muted)' }}>
          <Calendar size={36} style={{ opacity:.2, margin:'0 auto 10px', display:'block' }}/>
          <div style={{ fontSize:14 }}>No tienes actividades registradas aún</div>
        </div>
      )}

      {/* Acordeón Sprint → Semana → Día → Actividades */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.map((sp) => (
          <div key={sp.id} className="card" style={{ overflow:'hidden' }}>
            {/* Sprint */}
            <button onClick={()=>setOpenSprint(openSprint===sp.id?null:sp.id)}
              style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'14px 20px', background:'none', border:'none', cursor:'pointer', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:8, flexShrink:0,
                  background:sp.status==='activo'?'var(--c-accent3)':'var(--c-surface2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border:`1px solid ${sp.status==='activo'?'rgba(51,40,154,.2)':'var(--c-border2)'}` }}>
                  <Calendar size={14} style={{color:sp.status==='activo'?'var(--c-accent)':'var(--t-muted)'}}/>
                </div>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:800}}>{sp.name}</div>
                  <div style={{fontSize:10,color:'var(--t-muted)',marginTop:2}}>{sp.dates}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <Chip s={sp.status}/>
                <span style={{fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono, monospace',color:'var(--t-secondary)'}}>
                  {fmtM(sp.totalMins)}
                </span>
                {openSprint===sp.id?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
              </div>
            </button>

            {openSprint===sp.id && (
              <div style={{borderTop:'1px solid var(--c-border)'}}>
                {sp.weeks.map((wk,wi) => {
                  const wk_key = `${sp.id}-${wi}`
                  return (
                    <div key={wk.id} style={{borderBottom:'1px solid var(--c-border)'}}>
                      {/* Semana */}
                      <button onClick={()=>setOpenWeek(p=>({...p,[wk_key]:!p[wk_key]}))}
                        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',
                          padding:'10px 20px 10px 36px',background:openWeek[wk_key]?'var(--c-surface2)':'none',
                          border:'none',cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <Calendar size={11} style={{color:'var(--t-muted)',flexShrink:0}}/>
                          <span style={{fontSize:12,fontWeight:700}}>{wk.label}</span>
                          <span style={{fontSize:10,color:'var(--t-muted)'}}>{wk.dateRange}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <Chip s={wk.status}/>
                          <span style={{fontSize:11,fontFamily:'JetBrains Mono, monospace',color:'var(--t-muted)'}}>
                            {fmtM(wk.totalMins)}
                          </span>
                          {openWeek[wk_key]?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
                        </div>
                      </button>

                      {openWeek[wk_key] && (
                        <div style={{padding:'6px 20px 10px 48px',background:'var(--c-surface2)'}}>
                          {!wk.days.length && (
                            <p style={{fontSize:11.5,color:'var(--t-muted)',padding:'8px 0',fontStyle:'italic'}}>Sin actividades esta semana</p>
                          )}
                          {wk.days.map((d, di) => {
                            const d_key = `${wk_key}-${di}`
                            const fActs = d.acts.filter(a => !filterModel || a.model === filterModel)
                            const dayPct = Math.min(100, Math.round(d.mins/480*100))
                            return (
                              <div key={d_key} style={{marginBottom:5,background:'var(--c-surface)',
                                borderRadius:9,border:'1px solid var(--c-border)',overflow:'hidden'}}>
                                {/* Día */}
                                <button onClick={()=>setOpenDay(p=>({...p,[d_key]:!p[d_key]}))}
                                  style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',
                                    padding:'9px 14px',background:'none',border:'none',cursor:'pointer'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:12,fontWeight:700,minWidth:52}}>{d.date}</span>
                                    <Chip s={d.status}/>
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:10,color:'var(--t-muted)'}}>{d.acts.length} act.</span>
                                    <div style={{width:50}}><ProgressBar pct={dayPct} showLabel={false}/></div>
                                    <span style={{fontSize:11,fontFamily:'JetBrains Mono, monospace',color:'var(--t-secondary)',minWidth:36,textAlign:'right'}}>
                                      {fmtM(d.mins)}
                                    </span>
                                    {openDay[d_key]?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
                                  </div>
                                </button>

                                {openDay[d_key] && (
                                  <div style={{borderTop:'1px solid var(--c-border)',padding:'8px 14px',
                                    background:'var(--c-surface2)',display:'flex',flexDirection:'column',gap:4}}>
                                    {!fActs.length && (
                                      <p style={{fontSize:11,color:'var(--t-muted)',fontStyle:'italic'}}>Sin coincidencias con el filtro</p>
                                    )}
                                    {fActs.map((act, ai) => (
                                      <div key={ai} style={{display:'flex',justifyContent:'space-between',
                                        alignItems:'flex-start',padding:'8px 12px',borderRadius:8,
                                        background:act.status==='aprobado'?'rgba(48,105,59,.06)':
                                          act.status==='rechazado'?'rgba(153,44,38,.06)':'var(--c-surface)',
                                        border:`1px solid ${act.status==='aprobado'?'rgba(48,105,59,.15)':
                                          act.status==='rechazado'?'rgba(153,44,38,.15)':'var(--c-border)'}`}}>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                            <span style={{padding:'2px 6px',borderRadius:99,fontSize:9.5,fontWeight:800,
                                              background:`${MODEL_COLOR[act.model]}15`,color:MODEL_COLOR[act.model]}}>{act.model}</span>
                                            <span style={{fontSize:12,fontWeight:700}}>{act.name}</span>
                                            <span style={{fontSize:10,color:'var(--t-muted)'}}>{act.cat}</span>
                                          </div>
                                          {act.desc && <p style={{fontSize:10.5,color:'var(--t-secondary)',marginTop:3,fontStyle:'italic'}}>{act.desc}</p>}
                                          {act.comentario && (
                                            <p style={{fontSize:10.5,color:'#992C26',fontWeight:600,marginTop:3}}>
                                              💬 {act.comentario}
                                            </p>
                                          )}
                                        </div>
                                        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,marginLeft:12}}>
                                          <span style={{fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono, monospace',color:'var(--t-secondary)'}}>
                                            {fmtM(act.mins)}
                                          </span>
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
        <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
          <button
            onClick={cargarMas}
            disabled={loadingMore}
            style={{ padding:'8px 22px', borderRadius:10, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', color:'var(--t-muted)', fontSize:13,
              fontWeight:600, cursor:loadingMore ? 'wait' : 'pointer' }}>
            {loadingMore ? 'Cargando...' : `Cargar más (${pagination.total - data.length} sprints restantes)`}
          </button>
        </div>
      )}
    </div>
  )
}
