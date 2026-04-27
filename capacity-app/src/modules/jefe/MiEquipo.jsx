/**
 * MiEquipo.jsx — v3
 * 1. Lista de especialistas con expand/collapse por clic
 * 2. KPIs: especialistas, horas totales, promedio/día, capacity promedio
 * 3. Gráficas: capacity por oficio, distribución dominio, comparativa, carga diaria, heatmap, pastel
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, ReferenceLine, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { Users, Clock, TrendingUp, RefreshCw, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

// ── Constantes ─────────────────────────────────────────────────────────────
const MC = { RUN:'#3E5D9D', BUILD:'#30693B', ADMIN:'#D65830', GROW:'#4554A1', OFF:'#992C26' }
const ML = { RUN:'Operación', BUILD:'Proyectos', ADMIN:'Gestión', GROW:'Formación', OFF:'Ausencias' }

function fmtM(m) {
  if (!m) return '0h'
  const h=Math.floor(m/60), r=m%60
  if (!h)return`${r}m`;if(!r)return`${h}h`;return`${h}h ${r}m`
}
function capCol(p) { return p>=80?'#30693B':p>=50?'#D65830':'#992C26' }

// ── Tooltip custom ─────────────────────────────────────────────────────────
function CTip({ active, payload, label }) {
  if (!active||!payload?.length) return null
  return (
    <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',
      borderRadius:10,padding:'10px 14px',fontSize:12,boxShadow:'var(--s-md)'}}>
      <div style={{fontWeight:700,marginBottom:4}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.fill||p.color}}>
          {p.name}: {typeof p.value==='number'&&p.value>60?fmtM(p.value):`${p.value}%`}
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KCard({ label, value, sub, icon, accent, warn }) {
  const [hov, setHov]=useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:accent?'linear-gradient(135deg,#33289A,#4554A1)':'var(--c-surface)',
        borderRadius:14,padding:'16px 18px',
        border:accent?'none':'1px solid var(--c-border)',
        boxShadow:hov?(accent?'0 8px 28px rgba(51,40,154,.4)':'0 6px 20px rgba(0,0,0,.12)')
                     :(accent?'0 4px 14px rgba(51,40,154,.2)':'none'),
        transform:hov?'translateY(-3px)':'none',transition:'all .2s cubic-bezier(.34,1.56,.64,1)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <div style={{color:accent?'rgba(255,255,255,.7)':warn?'var(--brand-orange)':'var(--c-accent)'}}>{icon}</div>
        <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,
          color:accent?'rgba(255,255,255,.6)':'var(--t-muted)'}}>{label}</div>
      </div>
      <div style={{fontSize:28,fontWeight:900,letterSpacing:-1,lineHeight:1,
        color:accent?'white':warn?'var(--brand-orange)':'var(--c-accent)'}}>{value}</div>
      {sub&&<div style={{fontSize:12,marginTop:5,color:accent?'rgba(255,255,255,.55)':'var(--t-muted)'}}>{sub}</div>}
    </div>
  )
}

// ── Sección con título ─────────────────────────────────────────────────────
function Sec({ title, dot, children, cols=1 }) {
  return (
    <div className="card" style={{padding:20,marginBottom:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <div style={{width:9,height:9,borderRadius:'50%',background:dot||'var(--c-accent)'}}/>
        <span style={{fontSize:15,fontWeight:700}}>{title}</span>
      </div>
      {cols>1
        ? <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:12}}>{children}</div>
        : children
      }
    </div>
  )
}

// ── Filtro dropdown ────────────────────────────────────────────────────────
function FiltroBtn({ label, active, children }) {
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{
    const fn=e=>{ if(ref.current&&!ref.current.contains(e.target))setOpen(false) }
    document.addEventListener('mousedown',fn); return()=>document.removeEventListener('mousedown',fn)
  },[])
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
          fontSize:13,fontWeight:700,cursor:'pointer',border:'none',transition:'all .15s',
          background:active?'var(--c-accent)':'rgba(51,40,154,.08)',
          color:active?'white':'var(--c-accent)'}}>
        {label}
        <ChevronDown size={12} style={{transform:open?'rotate(180deg)':'none',transition:'transform .2s'}}/>
      </button>
      {open&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:149}} onClick={()=>setOpen(false)}/>
          <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'var(--c-surface)',
            borderRadius:14,border:'1px solid var(--c-border)',boxShadow:'var(--s-xl)',
            padding:16,zIndex:150,minWidth:220}}>
            {typeof children==='function'?children(()=>setOpen(false)):children}
          </div>
        </>
      )}
    </div>
  )
}

// ── Modal detalle especialista por dominio ────────────────────────────────
function ModalDetalle({ data, modelo, onClose }) {
  if (!data||!modelo) return null
  const acts = data.actividades?.filter(a=>a.modelo===modelo)||[]
  const mins  = acts.reduce((s,a)=>s+a.duracion_mins,0)
  const meta  = MC[modelo]
  return (
    <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',
      background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)',padding:20}} onClick={onClose}>
      <div style={{background:'var(--c-surface)',borderRadius:20,padding:26,maxWidth:560,width:'100%',
        maxHeight:'80vh',overflowY:'auto',boxShadow:'var(--s-xl)',border:'1px solid var(--c-border)'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:800,
                background:`${meta}15`,color:meta}}>{modelo}</span>
              <h3 style={{fontSize:17,fontWeight:800}}>{data.especialista?.nombre}</h3>
            </div>
            <div style={{fontSize:12,color:'var(--t-muted)',marginTop:4}}>
              {ML[modelo]} · {fmtM(mins)} · {acts.length} actividades
            </div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:'none',
            background:'var(--c-surface2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <X size={14}/>
          </button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {acts.length===0&&<div style={{textAlign:'center',color:'var(--t-muted)',padding:'20px 0',fontSize:13}}>Sin actividades en este dominio</div>}
          {acts.map((a,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',
              padding:'9px 12px',borderRadius:9,background:'var(--c-surface2)',border:'1px solid var(--c-border)'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700}}>{a.sub_nombre}</div>
                {a.descripcion&&<div style={{fontSize:11,color:'var(--t-muted)',marginTop:2,fontStyle:'italic'}}>{a.descripcion}</div>}
                {a.proyecto_nombre&&<div style={{fontSize:10,color:'var(--c-accent)',marginTop:2}}>📁 {a.proyecto_nombre}</div>}
              </div>
              <span style={{fontSize:12,fontWeight:800,fontFamily:'JetBrains Mono, monospace',
                color:'var(--t-secondary)',flexShrink:0,marginLeft:12}}>{fmtM(a.duracion_mins)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tarjetas de dominio para el especialista seleccionado ─────────────────
function DominioCards({ espData, detalleCache, onDblClick }) {
  if (!espData) return null
  const total = Object.values(espData.byModel).reduce((s,v)=>s+v,1)
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginTop:12,marginBottom:4}}>
      {Object.entries(MC).map(([m, color])=>{
        const mins = espData.byModel[m]||0
        const pct  = Math.round(mins/total*100)
        return (
          <div key={m}
            onDoubleClick={()=>onDblClick(m)}
            title="Doble clic para ver detalle"
            style={{padding:'12px 10px',borderRadius:12,textAlign:'center',cursor:'pointer',
              background:`${color}10`,border:`1.5px solid ${color}25`,
              transition:'all .2s',userSelect:'none'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.04)';e.currentTarget.style.boxShadow=`0 4px 16px ${color}30`}}
            onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none'}}>
            <div style={{fontSize:11,fontWeight:800,color,marginBottom:4}}>{m}</div>
            <div style={{fontSize:22,fontWeight:900,color,lineHeight:1}}>{pct}%</div>
            <div style={{fontSize:10,color:'var(--t-muted)',marginTop:4}}>{fmtM(mins)}</div>
            <div style={{fontSize:9,color:'var(--t-muted)',marginTop:2}}>{ML[m]}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Barra horizontal de capacity ──────────────────────────────────────────
function CapBar({ pct }) {
  const col = capCol(pct)
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:3}}>
      <div style={{height:6,borderRadius:99,background:'var(--c-border)',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:col,borderRadius:99,transition:'width .5s'}}/>
      </div>
    </div>
  )
}

// ── Fila individual de especialista ───────────────────────────────────────
function FilaEspecialista({ esp, buildQs }) {
  const [isOpen,    setIsOpen]    = useState(false)
  const [detalle,   setDetalle]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [modal,     setModal]     = useState(null)

  const handleClick = async () => {
    if (isOpen) { setIsOpen(false); return }
    setIsOpen(true)
    if (!detalle) {
      setLoading(true)
      try {
        const res = await api.get(`/dashboard/equipo/${esp.id}/detalle${buildQs()}`)
        setDetalle(res.data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
  }

  const col      = capCol(esp.capacity)
  const initials = esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')

  return (
    <>
      <div style={{borderRadius:10, border:'1px solid var(--c-border)',
        overflow:'hidden', boxShadow:isOpen?'var(--s-sm)':'none', marginBottom:4}}>
        <div onClick={handleClick}
          style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',
            background:isOpen?`${col}08`:'var(--c-surface)', transition:'background .15s',
            borderBottom:isOpen?'1px solid var(--c-border)':'none'}}>
          <div style={{width:32,height:32,borderRadius:8,background:`${col}20`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:11,fontWeight:800,color:col,flexShrink:0}}>{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12.5,fontWeight:700}}>{esp.nombre}</div>
            <div style={{fontSize:10,color:'var(--t-muted)',overflow:'hidden',
              textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>{esp.oficio||'—'}</div>
          </div>
          <CapBar pct={esp.capacity}/>
          <div style={{fontSize:13,fontWeight:900,color:col,fontFamily:'JetBrains Mono,monospace',
            flexShrink:0,minWidth:38,textAlign:'right'}}>{esp.capacity}%</div>
          <div style={{fontSize:10,color:'var(--t-muted)',flexShrink:0,minWidth:36,textAlign:'right'}}>
            {fmtM(esp.totalMins)}</div>
          {isOpen?<ChevronUp size={13} style={{color:'var(--t-muted)',flexShrink:0}}/>
                 :<ChevronDown size={13} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        </div>
        {isOpen && (
          <div style={{padding:'10px 14px 14px',background:'var(--c-surface2)'}}>
            {loading
              ? <div style={{textAlign:'center',padding:'12px 0',fontSize:12,color:'var(--t-muted)'}}>Cargando...</div>
              : <>
                  <div style={{fontSize:10,color:'var(--t-muted)',fontWeight:700,
                    textTransform:'uppercase',letterSpacing:.8,marginBottom:6}}>
                    Distribución por dominio · <span style={{fontWeight:400}}>doble clic para ver actividades</span>
                  </div>
                  <DominioCards espData={esp} detalleCache={detalle}
                    onDblClick={modelo=>setModal({esp,modelo,detalle})}/>
                </>
            }
          </div>
        )}
      </div>
      {modal && <ModalDetalle data={modal} modelo={modal.modelo} onClose={()=>setModal(null)}/>}
    </>
  )
}

// ── Lista de especialistas agrupada por área — colapsable ──────────────────
function ListaEspecialistas({ especialistas, rango, filtro, sprintId, customIni, customFin }) {
  // Agrupa por área
  const porArea = especialistas.reduce((acc, esp) => {
    const key = esp.area || 'Sin área'
    if (!acc[key]) acc[key] = []
    acc[key].push(esp)
    return acc
  }, {})

  // Todas las áreas colapsadas por defecto
  const [openAreas, setOpenAreas] = useState({})
  const toggleArea = (area) => setOpenAreas(p => ({...p, [area]: !p[area]}))

  const buildQs = () => {
    if (filtro==='rango') return `?filtro=rango&desde=${customIni}&hasta=${customFin}`
    if (filtro==='sprint') return `?filtro=sprint${sprintId?`&sprintId=${sprintId}`:''}`
    if (filtro==='dia')    return `?filtro=rango&desde=${customIni}&hasta=${customIni}`
    return `?filtro=${filtro}&desde=${customIni}&hasta=${customFin}`
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {Object.entries(porArea).map(([area, esps]) => {
        const isOpen = openAreas[area]
        const avgCap = Math.round(esps.reduce((s,e)=>s+e.capacity,0)/esps.length)
        const col    = capCol(avgCap)
        return (
          <div key={area} style={{borderRadius:12,border:'1px solid var(--c-border)',overflow:'hidden'}}>
            {/* Cabecera del área — clic para colapsar/expandir */}
            <div onClick={()=>toggleArea(area)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',
                cursor:'pointer',background:isOpen?'var(--c-surface2)':'var(--c-surface)',
                borderBottom:isOpen?'1px solid var(--c-border)':'none',
                transition:'background .15s'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:col,flexShrink:0}}/>
              <div style={{flex:1,fontSize:13,fontWeight:800,color:'var(--t-primary)'}}>{area}</div>
              <span style={{fontSize:11,color:'var(--t-muted)',fontWeight:600,marginRight:6}}>
                {esps.length} especialista{esps.length!==1?'s':''}
              </span>
              <span style={{fontSize:12,fontWeight:800,color:col,fontFamily:'JetBrains Mono,monospace',
                marginRight:4}}>{avgCap}% prom</span>
              {isOpen?<ChevronUp size={14} style={{color:'var(--t-muted)',flexShrink:0}}/>
                     :<ChevronDown size={14} style={{color:'var(--t-muted)',flexShrink:0}}/>}
            </div>
            {/* Lista de especialistas del área */}
            {isOpen && (
              <div style={{padding:'10px 12px'}}>
                {esps.map(esp => (
                  <FilaEspecialista key={esp.id} esp={esp} buildQs={buildQs}/>
                ))}
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}

// ── Gráfica: capacity promedio por oficio ─────────────────────────────────
function GraficaOficio({ data }) {
  if (!data?.length) return <div style={{textAlign:'center',color:'var(--t-muted)',padding:'20px 0',fontSize:13}}>Sin datos</div>
  const truncated = data.map(d=>({
    ...d,
    oficio: d.oficio.length>28 ? d.oficio.substring(0,28)+'…' : d.oficio
  }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, truncated.length*36)}>
      <BarChart data={truncated} layout="vertical" margin={{top:5,right:40,left:0,bottom:5}}>
        <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`}
          tick={{fontSize:10,fill:'var(--t-muted)'}} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="oficio" width={180}
          tick={{fontSize:10,fill:'var(--t-muted)'}} axisLine={false} tickLine={false}/>
        <Tooltip content={<CTip/>} formatter={(v,n)=>[`${v}%`,n==='avgCapacity'?'Capacity prom.':n]}/>
        <ReferenceLine x={80} stroke="#30693B" strokeDasharray="4 3" label={{value:'Meta 80%',position:'top',fontSize:9,fill:'#30693B'}}/>
        <Bar dataKey="avgCapacity" radius={[0,6,6,0]} maxBarSize={22} name="Capacity prom.">
          {truncated.map((d,i)=><Cell key={i} fill={capCol(d.avgCapacity)}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Gráfica: distribución por dominio (dona) ──────────────────────────────
function GraficaDistribucion({ byModel }) {
  const total = Object.values(byModel).reduce((s,v)=>s+v,0)
  if (!total) return <div style={{textAlign:'center',color:'var(--t-muted)',padding:'20px 0',fontSize:13}}>Sin datos</div>
  const pieData = Object.entries(byModel).filter(([,v])=>v>0).map(([m,mins])=>({name:m,value:mins,color:MC[m]}))
  return (
    <div style={{display:'flex',alignItems:'center',gap:16}}>
      <ResponsiveContainer width={170} height={170}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
            dataKey="value" strokeWidth={2} stroke="var(--c-surface)">
            {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
          </Pie>
          <Tooltip formatter={v=>fmtM(v)}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{flex:1}}>
        {pieData.map(d=>{
          const pct=Math.round(d.value/total*100)
          return (
            <div key={d.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:d.color,display:'inline-block'}}/>
                <span style={{fontSize:12.5,fontWeight:700,color:d.color}}>{d.name}</span>
                <span style={{fontSize:10,color:'var(--t-muted)'}}>{ML[d.name]}</span>
              </div>
              <div>
                <span style={{fontSize:14,fontWeight:800,color:d.color}}>{pct}%</span>
                <span style={{fontSize:10,color:'var(--t-muted)',marginLeft:5}}>{fmtM(d.value)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Gráfica: comparativa entre especialistas (stacked) ────────────────────
function GraficaComparativa({ data }) {
  if (!data?.length) return <div style={{textAlign:'center',color:'var(--t-muted)',padding:'20px 0',fontSize:13}}>Sin datos</div>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{top:5,right:10,left:-20,bottom:5}}>
        <XAxis dataKey="name" tick={{fontSize:10,fill:'var(--t-muted)'}} axisLine={false} tickLine={false}/>
        <YAxis tickFormatter={v=>`${Math.floor(v/60)}h`} tick={{fontSize:10,fill:'var(--t-muted)'}} axisLine={false} tickLine={false}/>
        <Tooltip content={<CTip/>}/>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
        {Object.entries(MC).map(([m,col])=>(
          <Bar key={m} dataKey={m} stackId="a" fill={col} name={m} maxBarSize={52}/>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Gráfica: carga de trabajo diaria con línea de capacidad máxima ────────
function GraficaCarga({ data }) {
  if (!data?.length) return <div style={{textAlign:'center',color:'var(--t-muted)',padding:'20px 0',fontSize:13}}>Sin datos</div>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{top:10,right:30,left:-20,bottom:5}}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
        <XAxis dataKey="label" tick={{fontSize:10,fill:'var(--t-muted)'}} axisLine={false} tickLine={false}/>
        <YAxis tickFormatter={v=>`${Math.floor(v/60)}h`} tick={{fontSize:10,fill:'var(--t-muted)'}} axisLine={false} tickLine={false}/>
        <Tooltip content={<CTip/>} formatter={v=>fmtM(v)}/>
        <ReferenceLine y={528} stroke="#30693B" strokeDasharray="5 4" strokeWidth={2}
          label={{value:'Capacidad diaria 8.8h',position:'insideTopRight',fontSize:9.5,fill:'#30693B'}}/>
        <Bar dataKey="avgMins" name="Prom. equipo" radius={[5,5,0,0]} maxBarSize={40}>
          {data.map((d,i)=><Cell key={i} fill={d.avgMins>=480?'#30693B':d.avgMins>=240?'#D65830':'#3E5D9D'}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Gráfica: heatmap de disponibilidad (día de semana) ────────────────────
function GraficaHeatmap({ data }) {
  if (!data?.length||!data.some(d=>d.mins>0))
    return <div style={{textAlign:'center',color:'var(--t-muted)',padding:'20px 0',fontSize:13}}>Sin datos para el período</div>
  const max = Math.max(...data.map(d=>d.mins),1)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        {data.map((d,i)=>{
          const intensity = d.mins/max
          const bg = d.mins===0 ? 'var(--c-surface2)'
            : `rgba(51,40,154,${0.1+intensity*0.8})`
          const textColor = intensity>0.5?'white':'var(--t-primary)'
          return (
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
              <div style={{width:68,height:68,borderRadius:12,background:bg,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                border:'1px solid rgba(51,40,154,.15)',transition:'transform .2s',cursor:'default'}}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.07)'}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <div style={{fontSize:13,fontWeight:700,color:textColor}}>{d.dia}</div>
                {d.mins>0&&(
                  <>
                    <div style={{fontSize:11,fontWeight:800,color:textColor,fontFamily:'JetBrains Mono, monospace'}}>{fmtM(d.avg)}</div>
                    <div style={{fontSize:9,color:intensity>0.5?'rgba(255,255,255,.7)':'var(--t-muted)'}}>avg/act</div>
                  </>
                )}
              </div>
              <div style={{fontSize:9.5,color:'var(--t-muted)',fontWeight:600}}>{fmtM(d.mins)}</div>
            </div>
          )
        })}
      </div>
      {/* Leyenda */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:10.5,color:'var(--t-muted)'}}>
        <span>Menos actividad</span>
        {[0.1,0.3,0.5,0.7,0.9].map((v,i)=>(
          <div key={i} style={{width:22,height:14,borderRadius:4,
            background:`rgba(51,40,154,${v})`}}/>
        ))}
        <span>Más actividad</span>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function MiEquipo() {
  const hoy    = new Date().toISOString().split('T')[0]
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState('sprint')
  const [sprintId,  setSprintId]  = useState(null)
  const [customIni, setIni]       = useState(hoy)
  const [customFin, setFin]       = useState(hoy)

  const buildQs = () => {
    if (filtro==='rango') return `?filtro=rango&desde=${customIni}&hasta=${customFin}`
    if (filtro==='sprint') return `?filtro=sprint${sprintId?`&sprintId=${sprintId}`:''}`
    if (filtro==='dia') return `?filtro=rango&desde=${customIni}&hasta=${customIni}`
    return `?filtro=${filtro}&desde=${customIni}&hasta=${customFin}`
  }

  const load = useCallback(async()=>{
    setLoading(true)
    try { const r=await api.get(`/dashboard/equipo${buildQs()}`); setData(r.data) }
    catch(e){ console.error(e) }
    finally { setLoading(false) }
  },[filtro,sprintId,customIni,customFin])

  useEffect(()=>{ load() },[])

  const applyFiltro = (tipo, ini, fin, sid=null) => {
    setFiltro(tipo); if(ini)setIni(ini); if(fin)setFin(fin); if(sid!==undefined)setSprintId(sid)
  }

  if (loading||!data) return <PageLoader message="Cargando equipo..."/>

  const { jefe, kpis, especialistas, byModel, byOficio, heatmap, cargaDiaria, comparativa, rango, sprints } = data
  const initials = jefe.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')

  return (
    <div>
      {/* ── Header del jefe ── */}
      <div style={{background:'linear-gradient(135deg,#eeeaf8,#ddd7f0)',borderRadius:16,
        padding:'18px 22px',marginBottom:12,display:'flex',alignItems:'center',
        justifyContent:'space-between',flexWrap:'wrap',gap:12,
        border:'1px solid rgba(51,40,154,.12)',boxShadow:'0 2px 12px rgba(51,40,154,.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:50,height:50,borderRadius:14,
            background:'linear-gradient(135deg,#33289A,#4554A1)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:18,fontWeight:800,color:'white',boxShadow:'0 4px 14px rgba(51,40,154,.3)'}}>
            {initials}
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800}}>{jefe.nombre}</div>
            <div style={{fontSize:13,color:'var(--t-secondary)',marginTop:2}}>
              {jefe.cargo} · <span style={{color:'var(--t-muted)'}}>{jefe.area}</span>
            </div>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          {/* DÍA */}
          <FiltroBtn label="Día" active={filtro==='dia'}>
            {close=>(
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--t-muted)',marginBottom:6}}>Seleccionar día</div>
                <input type="date" defaultValue={customIni} max={hoy}
                  onChange={e=>{setIni(e.target.value);setFin(e.target.value)}}
                  style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--c-border)',
                    background:'var(--c-surface2)',fontSize:13,color:'var(--t-primary)'}}/>
                <button onClick={()=>{applyFiltro('dia',customIni,customIni);close();load()}}
                  style={{width:'100%',marginTop:10,padding:'8px',borderRadius:8,background:'var(--c-accent)',
                    color:'white',fontSize:13,fontWeight:700,cursor:'pointer',border:'none'}}>Aplicar</button>
              </div>
            )}
          </FiltroBtn>

          {/* SEMANA */}
          <FiltroBtn label="Semana" active={filtro==='semana'}>
            {close=>(
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--t-muted)',marginBottom:6}}>Semana</div>
                <input type="week" onChange={e=>{
                  const [y,w]=e.target.value.split('-W')
                  if(!y||!w)return
                  const d=new Date(parseInt(y),0,1+(parseInt(w)-1)*7),dow=d.getDay()
                  const lun=new Date(d);lun.setDate(d.getDate()+(dow===0?-6:1-dow))
                  const dom=new Date(lun);dom.setDate(lun.getDate()+6)
                  const fmt=d2=>d2.toISOString().split('T')[0]
                  setIni(fmt(lun));setFin(fmt(dom))
                }} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--c-border)',
                  background:'var(--c-surface2)',fontSize:13,color:'var(--t-primary)'}}/>
                <button onClick={()=>{applyFiltro('semana',customIni,customFin);close();load()}}
                  style={{width:'100%',marginTop:10,padding:'8px',borderRadius:8,background:'var(--c-accent)',
                    color:'white',fontSize:13,fontWeight:700,cursor:'pointer',border:'none'}}>Aplicar</button>
              </div>
            )}
          </FiltroBtn>

          {/* MES */}
          <FiltroBtn label="Mes" active={filtro==='mes'}>
            {close=>(
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--t-muted)',marginBottom:6}}>Mes</div>
                <input type="month" defaultValue={hoy.slice(0,7)} onChange={e=>{
                  const [y,m]=e.target.value.split('-');if(!y||!m)return
                  setIni(`${y}-${m}-01`)
                  setFin(new Date(parseInt(y),parseInt(m),0).toISOString().split('T')[0])
                }} style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--c-border)',
                  background:'var(--c-surface2)',fontSize:13,color:'var(--t-primary)'}}/>
                <button onClick={()=>{applyFiltro('mes',customIni,customFin);close();load()}}
                  style={{width:'100%',marginTop:10,padding:'8px',borderRadius:8,background:'var(--c-accent)',
                    color:'white',fontSize:13,fontWeight:700,cursor:'pointer',border:'none'}}>Aplicar</button>
              </div>
            )}
          </FiltroBtn>

          {/* SPRINT */}
          <FiltroBtn label="Sprint" active={filtro==='sprint'}>
            {close=>(
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--t-muted)',marginBottom:8}}>Sprint</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <button onClick={()=>{applyFiltro('sprint',null,null,null);close();load()}}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',
                      borderRadius:8,border:'1px solid var(--c-border)',
                      background:!sprintId&&filtro==='sprint'?'var(--c-accent3)':'var(--c-surface2)',
                      cursor:'pointer',fontSize:13,fontWeight:600,
                      color:!sprintId&&filtro==='sprint'?'var(--c-accent)':'var(--t-primary)',textAlign:'left'}}>
                    Sprint activo {!sprintId&&filtro==='sprint'&&<Check size={13} style={{color:'var(--c-accent)'}}/>}
                  </button>
                  {sprints?.map(s=>(
                    <button key={s.id} onClick={()=>{applyFiltro('sprint',null,null,s.id);close();load()}}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',
                        borderRadius:8,border:'1px solid var(--c-border)',
                        background:sprintId===s.id?'var(--c-accent3)':'var(--c-surface2)',
                        cursor:'pointer',fontSize:13,fontWeight:600,
                        color:sprintId===s.id?'var(--c-accent)':'var(--t-primary)',textAlign:'left'}}>
                      {s.nombre} {sprintId===s.id&&<Check size={13} style={{color:'var(--c-accent)'}}/>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </FiltroBtn>

          {/* RANGO */}
          <FiltroBtn label="Rango" active={filtro==='rango'}>
            {close=>(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--t-muted)',marginBottom:4}}>Desde</div>
                  <input type="date" value={customIni} max={hoy} onChange={e=>setIni(e.target.value)}
                    style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--c-border)',
                      background:'var(--c-surface2)',fontSize:13,color:'var(--t-primary)'}}/>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--t-muted)',marginBottom:4}}>Hasta</div>
                  <input type="date" value={customFin} max={hoy} min={customIni} onChange={e=>setFin(e.target.value)}
                    style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--c-border)',
                      background:'var(--c-surface2)',fontSize:13,color:'var(--t-primary)'}}/>
                </div>
                <button onClick={()=>{applyFiltro('rango',customIni,customFin);close();load()}}
                  style={{padding:'8px',borderRadius:8,background:'var(--c-accent)',color:'white',
                    fontSize:13,fontWeight:700,cursor:'pointer',border:'none'}}>Aplicar</button>
              </div>
            )}
          </FiltroBtn>

          <button onClick={load} title="Actualizar"
            style={{width:34,height:34,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(51,40,154,.08)',border:'1px solid rgba(51,40,154,.15)',cursor:'pointer',color:'var(--c-accent)'}}>
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:22,fontWeight:800,letterSpacing:-.4}}>Mi Equipo</h2>
        <p style={{fontSize:13,color:'var(--t-muted)',marginTop:2}}>
          {rango?.label} · {rango?.ini} — {rango?.fin}
        </p>
      </div>

      {/* ── KPIs ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        <KCard accent icon={<Users size={18}/>} label="Especialistas" value={kpis.totalEspecialistas} sub="En tu equipo"/>
        <KCard icon={<Clock size={18}/>} label="Horas registradas" value={fmtM(kpis.totalMins)} sub="Total del equipo"/>
        <KCard icon={<Clock size={16}/>} label="Promedio por día" value={fmtM(kpis.promMinsDia)} sub="Por especialista/día"/>
        <KCard icon={<TrendingUp size={18}/>} label="Capacity promedio" value={`${kpis.avgCapacity}%`}
          sub="Del equipo" warn={kpis.avgCapacity<50}/>
      </div>

      {/* ── Especialistas con expand ── */}
      <Sec title={`Capacidad por especialista (${especialistas.length})`}>
        {especialistas.length===0
          ? <div style={{textAlign:'center',padding:'20px 0',color:'var(--t-muted)',fontSize:13}}>Sin especialistas asignados</div>
          : <ListaEspecialistas
              especialistas={especialistas}
              rango={rango} filtro={filtro} sprintId={sprintId}
              customIni={customIni} customFin={customFin}
            />
        }
      </Sec>

      {/* ── Gráficas en grid 2x2 ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Sec title="Distribución del equipo por dominio" dot="#3E5D9D">
          <GraficaDistribucion byModel={byModel}/>
        </Sec>
        <Sec title="Comparativa entre especialistas" dot="#D65830">
          <GraficaComparativa data={comparativa}/>
        </Sec>
      </div>

      {/* Carga de trabajo diaria */}
      <Sec title="Carga de trabajo diaria del equipo" dot="#30693B">
        <GraficaCarga data={cargaDiaria}/>
      </Sec>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        {/* Capacity por oficio */}
        <Sec title="Capacity promedio por oficio" dot="#4554A1">
          <GraficaOficio data={byOficio}/>
        </Sec>
        {/* Heatmap */}
        <Sec title="Calor de actividad por día de semana" dot="#992C26">
          <GraficaHeatmap data={heatmap}/>
        </Sec>
      </div>


    </div>
  )
}
