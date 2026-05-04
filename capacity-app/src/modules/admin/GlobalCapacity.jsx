/**
 * GlobalCapacity.jsx — v3
 * Heatmap por ÁREA · Gráfica comparativa entre áreas · Animación KPI hover ·
 * Filtros: Área + Sprint + Calendario (día / semana / rango)
 */
import './GlobalCapacity.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, Clock, TrendingUp, AlertTriangle, ArrowLeft,
  RefreshCw, Download, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, CartesianGrid,
} from 'recharts'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES Y HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const MC      = { RUN:'#3B6FD4', BUILD:'#2E8B57', ADMIN:'#D4700A', GROW:'#6A5ACD', OFF:'#B22222' }
const ML      = { RUN:'Operación', BUILD:'Proyectos', ADMIN:'Gestión', GROW:'Formación', OFF:'Ausencias' }
const MODELOS = ['RUN','BUILD','ADMIN','GROW','OFF']

function reglaDominio(modelo, pct) {
  if (modelo==='RUN') {
    if (pct>=45&&pct<=60) return { emoji:'🟢', nivel:'ok',     desc:'Correcto'  }
    if (pct<=70)          return { emoji:'🟡', nivel:'warn',   desc:'Presión alta' }
    return                       { emoji:'🔴', nivel:'danger', desc:'Firefighting' }
  }
  if (modelo==='BUILD') {
    if (pct>=15&&pct<=25) return { emoji:'🟢', nivel:'ok',     desc:'Saludable' }
    if (pct>=10)          return { emoji:'🟡', nivel:'warn',   desc:'Bajo'      }
    return                       { emoji:'🔴', nivel:'danger', desc:'Peligro'   }
  }
  if (modelo==='ADMIN') {
    if (pct>=10&&pct<=15) return { emoji:'🟢', nivel:'ok',     desc:'Normal'           }
    if (pct>20)           return { emoji:'🔴', nivel:'danger', desc:'Ineficiencia org.' }
    return                       { emoji:'🟡', nivel:'warn',   desc:'Aceptable'        }
  }
  if (modelo==='GROW') {
    if (pct>=5&&pct<=10)  return { emoji:'🟢', nivel:'ok',     desc:'Aceptable'        }
    if (pct<5)            return { emoji:'🔴', nivel:'danger', desc:'Estancamiento'    }
    return                       { emoji:'🟡', nivel:'warn',   desc:'Sobre el rango'   }
  }
  if (modelo==='OFF') {
    if (pct>=10)          return { emoji:'🟢', nivel:'ok',     desc:'Correcto'         }
    return                       { emoji:'🔴', nivel:'danger', desc:'Riesgo burnout'   }
  }
  return { emoji:'⚪', nivel:'ok', desc:'' }
}

function heatColor(modelo, pct) {
  if (!pct) return 'var(--c-surface2)'
  const { nivel } = reglaDominio(modelo, pct)
  if (nivel==='ok')     return 'rgba(46,139,87,.78)'
  if (nivel==='warn')   return 'rgba(212,112,10,.78)'
  return                       'rgba(178,34,34,.78)'
}

function fmtM(m) {
  if (!m) return '0h'
  const h=Math.floor(m/60), r=m%60
  return !h?`${r}m`:!r?`${h}h`:`${h}h ${r}m`
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }) {
  if (!active||!payload?.length) return null
  return (
    <div className="gc-chart-tip">
      <div className="gc-chart-tip-title">{label}</div>
      {payload.map((p,i)=>(
        <div key={i} className="gc-chart-tip-row" style={{ color:p.color||p.fill }}>
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  )
}

// KPI general con animación hover — todo inline (bg/border/shadow/transform dependen de hov + accent + color)
function KpiCard({ label, value, sub, icon, accent, color='#6366F1' }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        borderRadius:14, padding:'15px 17px', cursor:'default',
        background: accent ? `linear-gradient(135deg,${color},${color}bb)` : 'var(--c-surface)',
        border: accent ? 'none' : `1.5px solid ${hov ? color : 'var(--c-border)'}`,
        boxShadow: hov
          ? (accent ? `0 10px 28px ${color}55` : `0 6px 22px ${color}22`)
          : (accent ? `0 4px 16px ${color}33` : 'none'),
        transform: hov ? 'translateY(-3px) scale(1.012)' : 'translateY(0) scale(1)',
        transition: 'all .22s cubic-bezier(.34,1.56,.64,1)',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
        <div style={{ color: accent ? 'rgba(255,255,255,.7)' : color,
          transform: hov ? 'scale(1.15)' : 'scale(1)', transition:'transform .2s' }}>
          {icon}
        </div>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.9,
          color: accent ? 'rgba(255,255,255,.6)' : 'var(--t-muted)' }}>{label}</div>
      </div>
      <div style={{ fontSize:26, fontWeight:900, letterSpacing:-1, lineHeight:1,
        color: accent ? 'white' : color }}>{value}</div>
      {sub && <div style={{ fontSize:11, marginTop:5,
        color: accent ? 'rgba(255,255,255,.55)' : 'var(--t-muted)' }}>{sub}</div>}
    </div>
  )
}

// KPI de dominio — todo inline (bg/border/shadow/transform dependen de nivel + hov)
function DomainKpi({ modelo, pct }) {
  const [hov, setHov] = useState(false)
  const { emoji, nivel, desc } = reglaDominio(modelo, pct)
  const col    = nivel==='ok'?'#2E8B57':nivel==='warn'?'#D4700A':'#B22222'
  const bg     = nivel==='ok'?'rgba(46,139,87,.07)':nivel==='warn'?'rgba(212,112,10,.07)':'rgba(178,34,34,.07)'
  const border = nivel==='ok'?'rgba(46,139,87,.28)':nivel==='warn'?'rgba(212,112,10,.32)':'rgba(178,34,34,.32)'
  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{ borderRadius:13, padding:'12px 14px', background:bg,
        border:`1.5px solid ${hov?col:border}`,
        boxShadow: hov ? `0 6px 20px ${col}25` : 'none',
        transform: hov ? 'translateY(-3px) scale(1.015)' : 'translateY(0) scale(1)',
        transition: 'all .22s cubic-bezier(.34,1.56,.64,1)', cursor:'default' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
        <span style={{ fontSize:15, transform: hov?'scale(1.2)':'scale(1)', transition:'transform .2s' }}>
          {emoji}
        </span>
        <span style={{ fontSize:10.5, fontWeight:800, color:MC[modelo],
          textTransform:'uppercase', letterSpacing:.8 }}>{modelo}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:900, color:col,
        fontFamily:'JetBrains Mono, monospace', lineHeight:1 }}>{pct}%</div>
      <div style={{ fontSize:10.5, color:col, marginTop:4, fontWeight:600 }}>{desc}</div>
      <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:2 }}>{ML[modelo]}</div>
    </div>
  )
}

// Tarjeta de alerta — bg/border/color dependen de alerta.nivel, todo inline
function AlertCard({ alerta }) {
  const cfg = {
    rojo:     { bg:'rgba(178,34,34,.07)',  border:'rgba(178,34,34,.25)',  col:'#B22222' },
    naranja:  { bg:'rgba(212,112,10,.07)', border:'rgba(212,112,10,.25)', col:'#D4700A' },
    amarillo: { bg:'rgba(234,179,8,.07)',  border:'rgba(234,179,8,.3)',   col:'#B45309' },
  }[alerta.nivel] || { bg:'var(--c-surface2)', border:'var(--c-border)', col:'var(--t-muted)' }
  return (
    <div style={{ borderRadius:11, padding:'11px 14px',
      background:cfg.bg, border:`1.5px solid ${cfg.border}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        <span style={{ fontSize:16, flexShrink:0 }}>{alerta.emoji}</span>
        <div>
          <div style={{ fontSize:12.5, fontWeight:700, color:cfg.col }}>{alerta.msg}</div>
          {alerta.nombres?.length>0 && (
            <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:3 }}>
              {alerta.nombres.join(', ')}{alerta.nombres.length>=3?'...':''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── HEATMAP por ÁREA × dominio ────────────────────────────────────────────
function HeatmapAreas({ areasList, onClickArea }) {
  const [hovered, setHovered] = useState(null)

  if (!areasList?.length) return (
    <div className="gc-heat-no-data">Sin datos para el heatmap</div>
  )

  return (
    <div>
      {/* Header dominios — gridTemplateColumns dinámico por MODELOS.length */}
      <div style={{ display:'grid',
        gridTemplateColumns:`200px repeat(${MODELOS.length},1fr)`, gap:4, marginBottom:4 }}>
        <div/>
        {MODELOS.map(m=>(
          <div key={m} style={{ textAlign:'center', fontSize:10, fontWeight:800,
            color:MC[m], textTransform:'uppercase', letterSpacing:.8, padding:'4px 0' }}>
            {m}
          </div>
        ))}
      </div>

      {/* Filas de área */}
      {areasList.map(area => {
        const tot = Object.values(area.byModel).reduce((s,v)=>s+v,1)
        return (
          <div key={area.id} style={{ display:'grid',
            gridTemplateColumns:`200px repeat(${MODELOS.length},1fr)`, gap:4, marginBottom:4 }}>
            <div
              className="gc-heat-area-name"
              onClick={()=>onClickArea?.(area)}
              style={{ background: hovered?.areaId===area.id ? 'var(--c-surface2)' : 'transparent' }}
              onMouseEnter={()=>setHovered(h=>({ ...h, areaId:area.id }))}
              onMouseLeave={()=>setHovered(h=>({ ...h, areaId:null }))}
              title={area.nombre}>
              {area.nombre.length > 22 ? area.nombre.substring(0,22)+'…' : area.nombre}
            </div>

            {/* Celdas — bg/border/shadow/transform dinámicos */}
            {MODELOS.map(m=>{
              const pct = area.modelPcts?.[m] ?? Math.round((area.byModel[m]||0)/tot*100)
              const isHov = hovered?.areaId===area.id && hovered?.modelo===m
              return (
                <div key={m}
                  onMouseEnter={()=>setHovered({ areaId:area.id, modelo:m, pct, nombre:area.nombre })}
                  onMouseLeave={()=>setHovered(null)}
                  onClick={()=>onClickArea?.(area)}
                  style={{
                    borderRadius:8, cursor:'pointer', minHeight:34,
                    background: heatColor(m, pct),
                    border: isHov ? '2px solid white' : '2px solid transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .12s',
                    boxShadow: isHov ? '0 3px 12px rgba(0,0,0,.35)' : 'none',
                    transform: isHov ? 'scale(1.06)' : 'scale(1)',
                  }}>
                  {pct>0&&(
                    <span style={{ fontSize:10.5, fontWeight:800, color:'white',
                      textShadow:'0 1px 3px rgba(0,0,0,.5)' }}>{pct}%</span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {hovered?.modelo && (
        <div className="gc-heat-tooltip">
          <strong>{hovered.nombre}</strong> · {hovered.modelo}: <strong>{hovered.pct}%</strong>
          {' '}— {reglaDominio(hovered.modelo,hovered.pct).emoji} {reglaDominio(hovered.modelo,hovered.pct).desc}
        </div>
      )}
    </div>
  )
}

// ── Gráfica comparativa entre áreas (barras apiladas) ────────────────────
function GraficaComparativaAreas({ areasList }) {
  if (!areasList?.length) return null
  const data = areasList.map(a=>{
    const tot = Object.values(a.byModel).reduce((s,v)=>s+v,1)
    const row = { name: a.nombre.split(' ').slice(0,3).join(' '), fullName: a.nombre }
    MODELOS.forEach(m=>{ row[m] = a.modelPcts?.[m] ?? Math.round((a.byModel[m]||0)/tot*100) })
    return row
  })
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length*44)}>
      <BarChart data={data} layout="vertical" margin={{ top:0, right:40, left:4, bottom:0 }}>
        <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`}
          tick={{ fontSize:10, fill:'var(--t-muted)' }} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="name" width={148}
          tick={{ fontSize:10.5, fill:'var(--t-secondary)', fontWeight:600 }}
          axisLine={false} tickLine={false}/>
        <Tooltip content={<ChartTip/>}/>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10.5 }}/>
        {MODELOS.map(m=>(
          <Bar key={m} dataKey={m} stackId="a" fill={MC[m]} name={`${m} — ${ML[m]}`}
            maxBarSize={24} radius={m==='OFF'?[0,6,6,0]:[0,0,0,0]}/>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Selector de filtros unificado ────────────────────────────────────────
function FiltrosBar({ areas, sprints, filtro, sprintId, idArea, desde, hasta,
  onFiltro, onSprintId, onIdArea, onDesde, onHasta, onAplicar }) {
  const [showCal, setShowCal] = useState(false)
  const calRef = useRef(null)
  const hoy    = new Date().toISOString().split('T')[0]
  const calActive = ['dia','semana','rango'].includes(filtro)

  useEffect(() => {
    const fn = e => { if (calRef.current && !calRef.current.contains(e.target)) setShowCal(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="gc-filtros-bar">

      {/* Área */}
      <select className="gc-filtros-sel" value={idArea}
        onChange={e=>{ onIdArea(e.target.value); onAplicar(filtro, sprintId, desde, hasta, e.target.value) }}>
        <option value="">🏢 Todas las áreas</option>
        {(areas||[]).map(a=><option key={a.id_area} value={a.id_area}>{a.nombre}</option>)}
      </select>

      {/* Sprint — background/borderColor dinámicos según filtro activo */}
      <select value={sprintId}
        onChange={e=>{ onSprintId(e.target.value); onFiltro('sprint'); onAplicar('sprint',e.target.value,desde,hasta,idArea) }}
        style={{ padding:'7px 12px', borderRadius:9, fontSize:12.5, color:'var(--t-primary)',
          fontFamily:'inherit', cursor:'pointer', fontWeight:600,
          background: filtro==='sprint' ? 'rgba(99,102,241,.1)' : 'var(--c-surface2)',
          border: `1px solid ${filtro==='sprint' ? '#6366F1' : 'var(--c-border)'}` }}>
        <option value="">🚀 Sprint activo</option>
        {(sprints||[]).map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>

      {/* Botón Calendario */}
      <div ref={calRef} className="gc-cal-wrap">
        <button className={`gc-cal-btn ${calActive ? 'active' : ''}`}
          onClick={()=>setShowCal(o=>!o)}>
          📅 Período
          {calActive && (
            <span className="gc-cal-badge">
              {filtro==='dia'?'Día':filtro==='semana'?'Semana':'Rango'}
            </span>
          )}
          <ChevronDown size={12} style={{ transform:showCal?'rotate(180deg)':'none', transition:'transform .2s' }}/>
        </button>

        {showCal && (
          <div className="gc-cal-dropdown">

            {/* Tabs período */}
            <div className="gc-cal-tabs">
              {[['dia','Día'],['semana','Semana'],['rango','Rango']].map(([k,l])=>(
                <button key={k} className={`gc-cal-tab ${filtro===k ? 'active' : ''}`}
                  onClick={()=>onFiltro(k)}>
                  {l}
                </button>
              ))}
            </div>

            {/* Día */}
            {filtro==='dia' && (
              <div>
                <label className="gc-cal-lbl">Selecciona el día</label>
                <input type="date" className="gc-cal-inp" max={hoy} defaultValue={hoy}
                  onChange={e=>{ onDesde(e.target.value); onHasta(e.target.value) }}/>
                <button className="gc-cal-apply"
                  onClick={()=>{ onAplicar('dia',sprintId,desde||hoy,hasta||hoy,idArea); setShowCal(false) }}>
                  Aplicar día
                </button>
              </div>
            )}

            {/* Semana */}
            {filtro==='semana' && (
              <div>
                <label className="gc-cal-lbl">Selecciona la semana</label>
                <input type="week" className="gc-cal-inp"
                  onChange={e=>{
                    const [y,w] = e.target.value.split('-W')
                    if (!y||!w) return
                    const d=new Date(parseInt(y),0,1+(parseInt(w)-1)*7), dow=d.getDay()
                    const lun=new Date(d); lun.setDate(d.getDate()+(dow===0?-6:1-dow))
                    const dom=new Date(lun); dom.setDate(lun.getDate()+6)
                    const fmt=dd=>dd.toISOString().split('T')[0]
                    onDesde(fmt(lun)); onHasta(fmt(dom))
                  }}/>
                <button className="gc-cal-apply"
                  onClick={()=>{ if(desde&&hasta){ onAplicar('semana',sprintId,desde,hasta,idArea); setShowCal(false) } }}>
                  Aplicar semana
                </button>
              </div>
            )}

            {/* Rango */}
            {filtro==='rango' && (
              <div>
                <label className="gc-cal-lbl">Desde</label>
                <input type="date" className="gc-cal-inp" value={desde} max={hoy}
                  onChange={e=>onDesde(e.target.value)}/>
                <label className="gc-cal-lbl" style={{ marginTop:10 }}>Hasta</label>
                <input type="date" className="gc-cal-inp" value={hasta} max={hoy} min={desde}
                  onChange={e=>onHasta(e.target.value)}/>
                <button className="gc-cal-apply" disabled={!desde||!hasta}
                  onClick={()=>{ if(desde&&hasta){ onAplicar('rango',sprintId,desde,hasta,idArea); setShowCal(false) } }}>
                  Aplicar rango
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vista detalle de área ─────────────────────────────────────────────────
function VistaArea({ area, onVolver }) {
  const tot = Object.values(area.byModel).reduce((s,v)=>s+v,1)
  const barData = MODELOS.map(m=>({
    name:m, pct:area.modelPcts?.[m]??Math.round((area.byModel[m]||0)/tot*100), color:MC[m]
  }))
  return (
    <div>
      <div className="gc-va-hdr">
        <button className="gc-va-back-btn" onClick={onVolver}>
          <ArrowLeft size={15}/> Volver a Global
        </button>
        <div>
          <h2 className="gc-va-title">{area.nombre}</h2>
          <p className="gc-va-sub">
            {area.count} especialista{area.count!==1?'s':''} · Capacity prom.{' '}
            <strong style={{ color:area.avgCapacity>=80?'#2E8B57':area.avgCapacity>=50?'#D4700A':'#B22222' }}>
              {area.avgCapacity}%
            </strong>
          </p>
        </div>
      </div>

      <div className="gc-va-domain-grid">
        {MODELOS.map(m=>(
          <DomainKpi key={m} modelo={m} pct={area.modelPcts?.[m]??Math.round((area.byModel[m]||0)/tot*100)}/>
        ))}
      </div>

      <div className="card gc-card-p20" style={{ marginBottom:14 }}>
        <div className="gc-card-title">% por Dominio · {area.nombre}</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} layout="vertical" margin={{ top:0, right:40, left:10, bottom:0 }}>
            <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`}
              tick={{ fontSize:10, fill:'var(--t-muted)' }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" width={52}
              tick={{ fontSize:11, fontWeight:700 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<ChartTip/>}/>
            <Bar dataKey="pct" radius={[0,8,8,0]} maxBarSize={20} name="% dominio">
              {barData.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card gc-card-p20">
        <div className="gc-card-title">Especialistas ({area.especialistas?.length||0})</div>
        <div className="gc-va-esp-list">
          {(area.especialistas||[]).map(esp=>{
            const eTot = Object.values(esp.byModel).reduce((s,v)=>s+v,1)
            const capCol = esp.capacity>=80?'#2E8B57':esp.capacity>=50?'#D4700A':'#B22222'
            return (
              <div key={esp.id_empleado} className="gc-va-esp-row">
                <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                  background:`${capCol}18`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:13, fontWeight:800, color:capCol }}>
                  {esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                </div>
                <div className="gc-va-esp-info">
                  <div className="gc-va-esp-name">{esp.nombre}</div>
                  <div className="gc-va-esp-role">{esp.oficio||'—'}</div>
                </div>
                <div className="gc-va-esp-models">
                  {MODELOS.filter(m=>esp.byModel[m]>0).map(m=>{
                    const pct = Math.round(esp.byModel[m]/eTot*100)
                    return (
                      <div key={m} className="gc-va-esp-model">
                        <div className="gc-va-esp-m-lbl" style={{ color:MC[m] }}>{m}</div>
                        <div className="gc-va-esp-m-pct" style={{ color:MC[m] }}>{pct}%</div>
                        <div style={{ fontSize:11 }}>{reglaDominio(m,pct).emoji}</div>
                      </div>
                    )
                  })}
                </div>
                <div className="gc-va-esp-cap">
                  <div style={{ fontSize:18, fontWeight:900, color:capCol,
                    fontFamily:'JetBrains Mono, monospace' }}>{esp.capacity}%</div>
                  <div className="gc-va-esp-mins">{fmtM(esp.totalMins)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function GlobalCapacity() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState('sprint')
  const [sprintId,  setSprintId]  = useState('')
  const [desde,     setDesde]     = useState('')
  const [hasta,     setHasta]     = useState('')
  const [idArea,    setIdArea]    = useState('')
  const [vistaArea, setVistaArea] = useState(null)

  const load = useCallback(async (f=filtro, sid=sprintId, d=desde, h=hasta, area=idArea) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        filtro: f,
        ...(sid  ? { sprintId:sid } : {}),
        ...(d    ? { desde:d }      : {}),
        ...(h    ? { hasta:h }      : {}),
        ...(area ? { idArea:area }  : {}),
      }).toString()
      const r = await api.get(`/admin-global/capacity?${qs}`)
      setData(r.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [filtro, sprintId, desde, hasta, idArea])

  useEffect(() => { load() }, [])

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Especialista','Área','Cargo','Capacity %','Horas',...MODELOS.map(m=>`${m}%`)],
      ...data.especialistas.map(e=>{
        const tot = Object.values(e.byModel).reduce((s,v)=>s+v,1)
        return [e.nombre, e.area_nombre||'—', e.oficio||'—', e.capacity, fmtM(e.totalMins),
          ...MODELOS.map(m=>Math.round((e.byModel[m]||0)/tot*100)+'%')]
      })
    ]
    const csv  = rows.map(r=>r.join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`capacity_${data.rango?.label||'export'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (vistaArea) {
    return <VistaArea area={vistaArea} onVolver={()=>setVistaArea(null)}/>
  }

  if (loading||!data) return <PageLoader message="Cargando datos globales..."/>

  const { kpis, modelPcts={}, areasList=[], especialistas=[], alertas=[], tendencia=[], rango, sprints, areas=[], byModel={} } = data

  const barDomainData = MODELOS.map(m=>({ name:m, pct:modelPcts[m]||0, color:MC[m] }))

  return (
    <div>
      {/* ── Header ── */}
      <div className="gc-page-hdr">
        <div>
          <h2 className="gc-page-title">Global Capacity TI</h2>
          <p className="gc-page-sub">{rango?.label} · {rango?.ini} → {rango?.fin}</p>
        </div>
        <div className="gc-hdr-acts">
          <FiltrosBar
            areas={areas} sprints={sprints} filtro={filtro} sprintId={sprintId}
            idArea={idArea} desde={desde} hasta={hasta}
            onFiltro={setFiltro} onSprintId={setSprintId} onIdArea={setIdArea}
            onDesde={setDesde} onHasta={setHasta}
            onAplicar={(f,sid,d,h,area)=>{
              setFiltro(f); if(sid!==undefined) setSprintId(sid)
              if(d!==undefined) setDesde(d); if(h!==undefined) setHasta(h)
              if(area!==undefined) setIdArea(area)
              load(f, sid??sprintId, d??desde, h??hasta, area??idArea)
            }}
          />
          <button className="gc-refresh-btn" onClick={()=>load()} title="Actualizar">
            <RefreshCw size={14}/>
          </button>
          <button className="gc-export-btn" onClick={exportCSV}>
            <Download size={13}/> Exportar
          </button>
        </div>
      </div>

      {/* ── KPIs generales ── */}
      <div className="gc-kpi-grid">
        <KpiCard accent color='#6366F1' icon={<TrendingUp size={17}/>}
          label="Capacity global" value={`${kpis.avgCapacity}%`} sub="Promedio TI"/>
        <KpiCard icon={<Users size={17}/>} label="Especialistas" color='#6366F1'
          value={kpis.totalEsps} sub={`${kpis.totalAreas} área(s)`}/>
        <KpiCard icon={<Clock size={17}/>} label="Horas registradas" color='#2E8B57'
          value={fmtM(kpis.totalMins)} sub="Total equipo TI"/>
        <KpiCard icon={<AlertTriangle size={17}/>} color="#B22222" label="Áreas sobrecargadas"
          value={kpis.areasSObre} sub="> 100% capacity"/>
      </div>

      {/* ── KPIs por dominio ── */}
      <div className="gc-domain-grid">
        {MODELOS.map(m=><DomainKpi key={m} modelo={m} pct={modelPcts[m]||0}/>)}
      </div>

      {/* ── Alertas ── */}
      {alertas?.length>0 && (
        <div className="gc-alerts-grid">
          {alertas.map((a,i)=><AlertCard key={i} alerta={a}/>)}
        </div>
      )}

      {/* ── Barras dominio + Tendencia ── */}
      <div className="gc-charts-2col">
        <div className="card gc-card-p20">
          <div className="gc-card-title">
            % por Dominio de Capacidad · Global TI · {rango?.label}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barDomainData} layout="vertical"
              margin={{ top:0, right:40, left:10, bottom:0 }}>
              <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`}
                tick={{ fontSize:10, fill:'var(--t-muted)' }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" width={52}
                tick={{ fontSize:11, fontWeight:700 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="pct" radius={[0,8,8,0]} maxBarSize={22} name="% dominio">
                {barDomainData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="gc-domain-legend">
            {barDomainData.map(d=>{
              const r = reglaDominio(d.name, d.pct)
              return (
                <span key={d.name} style={{ fontSize:10.5, padding:'2px 8px', borderRadius:99,
                  background:`${d.color}12`, color:d.color, fontWeight:700 }}>
                  {r.emoji} {d.name} {d.pct}%
                </span>
              )
            })}
          </div>
        </div>

        <div className="card gc-card-p20">
          <div className="gc-card-title">Tendencia por dominio (semanas)</div>
          {tendencia?.length>1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tendencia} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
                <XAxis dataKey="semana" tick={{ fontSize:10, fill:'var(--t-muted)' }}
                  axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${v}%`} tick={{ fontSize:10, fill:'var(--t-muted)' }}
                  axisLine={false} tickLine={false} domain={[0,100]}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                {MODELOS.map(m=>(
                  <Line key={m} type="monotone" dataKey={m} stroke={MC[m]}
                    strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} name={`${m} — ${ML[m]}`}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="gc-no-trend">
              Se necesitan al menos 2 semanas de datos para mostrar la tendencia
            </div>
          )}
        </div>
      </div>

      {/* ── Heatmap por ÁREA ── */}
      <div className="card gc-card-p20" style={{ marginBottom:14 }}>
        <div className="gc-heat-hdr">
          <div className="gc-heat-title">Mapa de calor por área y dominio</div>
          <div className="gc-heat-legend">
            {[['rgba(46,139,87,.2)','#2E8B57','🟢 Correcto'],
              ['rgba(212,112,10,.2)','#D4700A','🟡 Atención'],
              ['rgba(178,34,34,.2)','#B22222','🔴 Crítico']].map(([bg,col,lbl])=>(
              <span key={lbl} style={{ fontSize:10, padding:'2px 8px', borderRadius:4,
                background:bg, color:col, fontWeight:700 }}>{lbl}</span>
            ))}
          </div>
        </div>
        <p className="gc-heat-sub">
          Hover → % exacto del área en ese dominio · Clic → detalle del área
        </p>
        <HeatmapAreas areasList={areasList} onClickArea={setVistaArea}/>
      </div>

      {/* ── Gráfica comparativa entre áreas ── */}
      {areasList.length>1 && (
        <div className="card gc-card-p20" style={{ marginBottom:14 }}>
          <div className="gc-card-title">Comparativa de áreas por dominio (% acumulado)</div>
          <GraficaComparativaAreas areasList={areasList}/>
        </div>
      )}

      {/* ── Tarjetas de área ── */}
      <div className="gc-areas-section-hdr">
        Detalle por área
        <span className="gc-areas-section-hint">Clic → kpis, gráficas y especialistas del área</span>
      </div>
      <div className="gc-areas-grid">
        {areasList.map(area=>{
          const tot    = Object.values(area.byModel).reduce((s,v)=>s+v,1)
          const capPct = area.avgCapacity
          const capCol = capPct>=80?'#2E8B57':capPct>=50?'#D4700A':'#B22222'
          return (
            <div key={area.id} className="gc-area-card"
              onClick={()=>setVistaArea(area)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=capCol;e.currentTarget.style.boxShadow=`0 4px 16px ${capCol}25`;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--c-border)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}>
              <div className="gc-area-card-hdr">
                <div className="gc-area-card-name">{area.nombre}</div>
                <div style={{ fontSize:22, fontWeight:900, color:capCol,
                  fontFamily:'JetBrains Mono, monospace', flexShrink:0 }}>{capPct}%</div>
              </div>
              <div className="gc-area-prog-track">
                <div style={{ height:'100%', width:`${Math.min(capPct,100)}%`,
                  background:capCol, borderRadius:99, transition:'width .5s' }}/>
              </div>
              <div className="gc-area-model-bar">
                {MODELOS.map(m=>{
                  const pct = area.modelPcts?.[m] ?? Math.round((area.byModel[m]||0)/tot*100)
                  return pct>0 ? <div key={m} style={{ flex:pct, background:MC[m], minWidth:2 }} title={`${m}: ${pct}%`}/> : null
                })}
              </div>
              <div className="gc-area-alerts">
                {MODELOS.map(m=>{
                  const pct = area.modelPcts?.[m] ?? Math.round((area.byModel[m]||0)/tot*100)
                  const r   = reglaDominio(m,pct)
                  if (r.nivel==='ok') return null
                  return (
                    <span key={m} style={{ fontSize:9.5, padding:'1px 6px', borderRadius:4,
                      background:`${MC[m]}15`, color:MC[m], fontWeight:700 }}>
                      {r.emoji}{m}
                    </span>
                  )
                })}
              </div>
              <div className="gc-area-card-foot">
                {area.count} especialista{area.count!==1?'s':''} · {fmtM(area.totalMins)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
