/**
 * MiDashboard.jsx — v4
 * - Título fuera del header
 * - Cada botón de filtro abre su propio dropdown debajo
 * - Dona interactiva con tooltip
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Tooltip,
} from 'recharts'
import { RefreshCw, X, ChevronDown, Check } from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'
import Button         from '../../components/ui/Button'

const MODEL_META = {
  RUN:   { color:'#3E5D9D', desc:'Operación y Soporte',     meta:'≤60%' },
  BUILD: { color:'#30693B', desc:'Proyectos, Iniciativas',  meta:'≥40%' },
  ADMIN: { color:'#D65830', desc:'Gestión Administrativa',  meta:'≤15%' },
  GROW:  { color:'#4554A1', desc:'Formación e Innovación',  meta:'≥10%' },
  OFF:   { color:'#992C26', desc:'Novedades y Ausentismos', meta:'—'    },
}

function fmtMins(mins) {
  if (!mins) return '0h'
  const h=Math.floor(mins/60), m=mins%60
  if (h===0) return `${m}m`; if (m===0) return `${h}h`
  return `${h}h ${m}m`
}

function toWeekValue(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, warn, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: accent ? 'linear-gradient(135deg,#33289A,#4554A1)' : 'var(--c-surface)',
        borderRadius:14, padding:'18px 20px',
        border: accent ? 'none' : '1px solid var(--c-border)',
        boxShadow: hov ? (accent ? '0 8px 28px rgba(51,40,154,0.40)' : '0 6px 20px rgba(0,0,0,0.12)') : (accent ? '0 4px 14px rgba(51,40,154,0.20)' : 'none'),
        transform: hov ? 'translateY(-3px)' : 'none',
        transition:'all .2s cubic-bezier(.34,1.56,.64,1)', cursor:'default',
      }}>
      <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:1, color:accent?'rgba(255,255,255,0.6)':'var(--t-muted)', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:800, letterSpacing:-1, lineHeight:1,
        color: accent?'white':warn?'var(--brand-orange)':danger?'var(--brand-red)':'var(--c-accent)' }}>{value}</div>
      {sub && <div style={{ fontSize:12, marginTop:6, color:accent?'rgba(255,255,255,0.55)':'var(--t-muted)' }}>{sub}</div>}
    </div>
  )
}

// ── Popup detalle de dominio ───────────────────────────────────────────────
function ModelPopup({ model, detail, totalMins, onClose }) {
  if (!model || !detail) return null
  const meta = MODEL_META[model]
  const pct  = totalMins > 0 ? Math.round(detail.totalMins/totalMins*100) : 0
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.40)', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:28, maxWidth:460, width:'100%', margin:'0 16px', boxShadow:'var(--s-xl)', border:'1px solid var(--c-border)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:meta.color }} />
              <span style={{ fontSize:18, fontWeight:800, color:meta.color }}>{model}</span>
              <span style={{ fontSize:12, color:'var(--t-muted)' }}>{meta.desc}</span>
            </div>
            <div style={{ display:'flex', gap:12, alignItems:'baseline' }}>
              <span style={{ fontSize:26, fontWeight:900, color:meta.color }}>{pct}%</span>
              <span style={{ fontSize:15, fontWeight:600, color:'var(--t-secondary)' }}>{fmtMins(detail.totalMins)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-surface2)', border:'none', cursor:'pointer' }}><X size={14}/></button>
        </div>
        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.8, color:'var(--t-muted)', marginBottom:12 }}>Distribución de tareas</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
          {detail.tasks.map((t,i) => (
            <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:i===0?`${meta.color}10`:'var(--c-surface2)', border:`1px solid ${i===0?meta.color+'30':'var(--c-border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:i===0?700:500 }}>{i===0?'🏆 ':''}{t.name}</span>
                <div>
                  <span style={{ fontSize:15, fontWeight:900, color:meta.color }}>{t.pct}%</span>
                  <span style={{ fontSize:12, color:'var(--t-muted)', marginLeft:6 }}>{fmtMins(t.mins)}</span>
                </div>
              </div>
              <div style={{ height:5, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${t.pct}%`, background:meta.color, borderRadius:99, opacity:i===0?1:0.55 }} />
              </div>
            </div>
          ))}
        </div>
        {detail.topTask && <div style={{ marginTop:14, padding:'10px 14px', background:`${meta.color}10`, borderRadius:10, fontSize:13 }}>🏆 Mayor tiempo: <strong>{detail.topTask.name}</strong> — {fmtMins(detail.topTask.mins)} ({detail.topTask.pct}%)</div>}
      </div>
    </div>
  )
}

// ── Model Card ─────────────────────────────────────────────────────────────
function ModelCard({ model, mins, totalMins, onDoubleClick }) {
  const [hov, setHov] = useState(false)
  const meta = MODEL_META[model]
  const pct  = totalMins > 0 ? Math.round(mins/totalMins*100) : 0
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onDoubleClick={() => onDoubleClick(model)} title="Doble clic para ver detalle"
      style={{ padding:'16px', borderRadius:12, cursor:'pointer', transition:'all .18s',
        border:`1.5px solid ${hov?meta.color:'var(--c-border)'}`,
        background:hov?`${meta.color}12`:'var(--c-surface)',
        boxShadow:hov?`0 4px 16px ${meta.color}30`:'none',
        transform:hov?'translateY(-2px)':'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:800, color:meta.color, letterSpacing:.5, textTransform:'uppercase' }}>{model}</div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>{meta.desc}</div>
        </div>
        <span style={{ fontSize:24, fontWeight:900, color:meta.color, letterSpacing:-1 }}>{pct}%</span>
      </div>
      <div style={{ height:5, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:meta.color, borderRadius:99, transition:'width .4s' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <span style={{ fontSize:12, color:'var(--t-muted)' }}>{fmtMins(mins)}</span>
        <span style={{ fontSize:11, color:'var(--t-muted)' }}>Meta {meta.meta}</span>
      </div>
      <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:4, textAlign:'center', opacity:hov?1:0, transition:'opacity .15s' }}>Doble clic para detalle</div>
    </div>
  )
}

// ── Tooltips ───────────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:10, padding:'10px 14px', fontSize:13, boxShadow:'var(--s-md)' }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      <div style={{ color:payload[0]?.fill, fontWeight:600 }}>{fmtMins(payload[0]?.value)}</div>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0], meta = MODEL_META[d.name] ?? {}
  return (
    <div style={{ background:'var(--c-surface)', border:`1px solid ${meta.color ?? 'var(--c-border)'}40`, borderRadius:10, padding:'10px 14px', fontSize:13, boxShadow:'var(--s-md)' }}>
      <div style={{ fontWeight:800, color:meta.color, marginBottom:2 }}>{d.name} · {meta.desc}</div>
      <div style={{ color:'var(--t-primary)', fontWeight:700 }}>{fmtMins(d.value)}</div>
      <div style={{ color:'var(--t-muted)', fontSize:12 }}>{d.payload.pct ?? 0}% del total</div>
    </div>
  )
}

// ── Botón de filtro con dropdown ───────────────────────────────────────────
function FilterBtn({ label, active, children, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Cierra al hacer clic fuera
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:5,
          padding:'6px 12px', borderRadius:8, fontSize:13, fontWeight:700,
          cursor:'pointer', border:'none', transition:'all .15s',
          background: active ? 'var(--c-accent)' : 'rgba(51,40,154,0.08)',
          color:      active ? 'white'           : 'var(--c-accent)',
          boxShadow:  active ? '0 2px 8px rgba(51,40,154,0.25)' : 'none',
        }}
      >
        {label}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay transparente para cerrar */}
          <div style={{ position:'fixed', inset:0, zIndex:149 }} onClick={() => setOpen(false)} />
          <div style={{
            position:'absolute',
            top:'calc(100% + 8px)',
            [align === 'right' ? 'right' : 'left']: 0,
            background:'var(--c-surface)',
            borderRadius:14,
            border:'1px solid var(--c-border)',
            boxShadow:'var(--s-xl)',
            padding:16,
            zIndex:150,
            minWidth:220,
          }}>
            {/* Pasa setOpen a los hijos para que puedan cerrarlo */}
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </div>
        </>
      )}
    </div>
  )
}

// ── Selector de fecha para cada tipo ──────────────────────────────────────
function DaySelector({ customIni, setCustomIni, setCustomFin, onApply }) {
  const hoy = new Date().toISOString().split('T')[0]
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--t-muted)', marginBottom:8 }}>Seleccionar día</div>
      <input type="date" defaultValue={customIni||hoy} max={hoy}
        onChange={e => { setCustomIni(e.target.value); setCustomFin(e.target.value) }}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)', cursor:'pointer' }}
        autoFocus
      />
      <button onClick={onApply} style={{ width:'100%', marginTop:10, padding:'8px', borderRadius:8, background:'var(--c-accent)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', border:'none' }}>
        Aplicar
      </button>
    </div>
  )
}

function WeekSelector({ customIni, setCustomIni, setCustomFin, onApply }) {
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--t-muted)', marginBottom:8 }}>Seleccionar semana</div>
      <input type="week" defaultValue={toWeekValue(customIni)}
        onChange={e => {
          const [y,w] = e.target.value.split('-W')
          if (!y||!w) return
          const d = new Date(parseInt(y),0,1+(parseInt(w)-1)*7)
          const dow = d.getDay()
          const lun = new Date(d); lun.setDate(d.getDate()+(dow===0?-6:1-dow))
          const dom = new Date(lun); dom.setDate(lun.getDate()+6)
          const fmt = d2 => d2.toISOString().split('T')[0]
          setCustomIni(fmt(lun)); setCustomFin(fmt(dom))
        }}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)', cursor:'pointer' }}
        autoFocus
      />
      <button onClick={onApply} style={{ width:'100%', marginTop:10, padding:'8px', borderRadius:8, background:'var(--c-accent)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', border:'none' }}>
        Aplicar
      </button>
    </div>
  )
}

function MonthSelector({ customIni, setCustomIni, setCustomFin, onApply }) {
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--t-muted)', marginBottom:8 }}>Seleccionar mes</div>
      <input type="month" defaultValue={customIni?.slice(0,7)||new Date().toISOString().slice(0,7)}
        onChange={e => {
          const [y,m] = e.target.value.split('-')
          if (!y||!m) return
          setCustomIni(`${y}-${m}-01`)
          setCustomFin(new Date(parseInt(y),parseInt(m),0).toISOString().split('T')[0])
        }}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)', cursor:'pointer' }}
        autoFocus
      />
      <button onClick={onApply} style={{ width:'100%', marginTop:10, padding:'8px', borderRadius:8, background:'var(--c-accent)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', border:'none' }}>
        Aplicar
      </button>
    </div>
  )
}

function SprintSelector({ sprintId, setSprintId, sprints, onApply }) {
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--t-muted)', marginBottom:8 }}>Seleccionar sprint</div>
      <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:200, overflowY:'auto' }}>
        {/* Opción sprint activo */}
        <button onClick={() => { setSprintId(null); onApply() }}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:8, border:'1px solid var(--c-border)', background: !sprintId?'var(--c-accent3)':'var(--c-surface2)', cursor:'pointer', fontSize:13, fontWeight:600, color: !sprintId?'var(--c-accent)':'var(--t-primary)', textAlign:'left' }}>
          Sprint activo
          {!sprintId && <Check size={13} style={{ color:'var(--c-accent)', flexShrink:0 }} />}
        </button>
        {sprints?.map(s => (
          <button key={s.id} onClick={() => { setSprintId(s.id); onApply() }}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:8, border:'1px solid var(--c-border)', background: sprintId===s.id?'var(--c-accent3)':'var(--c-surface2)', cursor:'pointer', fontSize:13, fontWeight:600, color:sprintId===s.id?'var(--c-accent)':'var(--t-primary)', textAlign:'left' }}>
            {s.nombre}
            {sprintId===s.id && <Check size={13} style={{ color:'var(--c-accent)', flexShrink:0 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

function RangoSelector({ customIni, setCustomIni, customFin, setCustomFin, onApply }) {
  const hoy = new Date().toISOString().split('T')[0]
  return (
    <div style={{ minWidth:260 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--t-muted)', marginBottom:8 }}>Rango de fechas</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--t-muted)', marginBottom:4 }}>Desde</div>
          <input type="date" defaultValue={customIni||''} max={customFin||hoy}
            onChange={e => setCustomIni(e.target.value)}
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)' }}
          />
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--t-muted)', marginBottom:4 }}>Hasta</div>
          <input type="date" defaultValue={customFin||''} min={customIni||''} max={hoy}
            onChange={e => setCustomFin(e.target.value)}
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-border)', background:'var(--c-surface2)', fontSize:13, color:'var(--t-primary)' }}
          />
        </div>
      </div>
      <button onClick={onApply} style={{ width:'100%', marginTop:12, padding:'8px', borderRadius:8, background:'var(--c-accent)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', border:'none' }}>
        Aplicar
      </button>
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
    if (filtro === 'sprint') return `?filtro=sprint${sprintId?`&sprintId=${sprintId}`:''}`
    if (filtro === 'rango' && customIni && customFin) return `?filtro=rango&desde=${customIni}&hasta=${customFin}`
    // Por defecto: día actual
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
  const totalMins = Object.values(byModel).reduce((a,b) => a+b, 0)
  const initials  = empleado.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')
  const rangoLabel = rango?.ini === rango?.fin ? rango?.ini : `${rango?.ini} — ${rango?.fin}`

  const filtroLabel = { dia:'Día', semana:'Semana', mes:'Mes', sprint:'Sprint', rango:'Rango' }

  const pieData = Object.entries(byModel).filter(([,m]) => m>0)
    .map(([model,mins]) => ({ name:model, value:mins, color:MODEL_META[model].color,
      pct: totalMins > 0 ? Math.round(mins/totalMins*100) : 0 }))

  return (
    <div>
      {/* ── Título fuera del header ── */}
      <div style={{ marginBottom:14 }}>
        <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-.4, color:'var(--t-primary)' }}>Mi Dashboard</h2>
        <p style={{ fontSize:13, color:'var(--t-muted)', marginTop:3 }}>
          Indicadores personales ·{' '}
          <span style={{ fontWeight:600, color:'var(--t-secondary)' }}>
            {filtroLabel[filtro]} · {rangoLabel}
          </span>
        </p>
      </div>

      {/* ── Header con info del empleado + filtros ── */}
      <div style={{
        background:'linear-gradient(135deg, #eeeaf8 0%, #e8e4f5 50%, #ddd7f0 100%)',
        borderRadius:16, padding:'18px 22px', marginBottom:16,
        display:'flex', alignItems:'center', gap:12,
        border:'1px solid rgba(51,40,154,0.12)',
        boxShadow:'0 2px 12px rgba(51,40,154,0.08)',
      }}>
        {/* Info empleado */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:50, height:50, borderRadius:14, background:'linear-gradient(135deg,#33289A,#4554A1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'white', flexShrink:0, boxShadow:'0 4px 14px rgba(51,40,154,0.3)' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--t-primary)', letterSpacing:-.3 }}>{empleado.nombre}</div>
            <div style={{ fontSize:13, color:'var(--t-secondary)', marginTop:2 }}>
              {empleado.cargo}
              <span style={{ color:'var(--t-muted)', margin:'0 5px' }}>·</span>
              {empleado.area}
              {empleado.jefe && <span style={{ color:'var(--t-muted)', marginLeft:8 }}>· Jefe: {empleado.jefe}</span>}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
              {sprint && (
                <span style={{ padding:'3px 10px', borderRadius:99, background:'rgba(51,40,154,0.12)', fontSize:11, fontWeight:700, color:'var(--c-accent)', border:'1px solid rgba(51,40,154,0.2)' }}>
                  {sprint.nombre} · ACTIVO
                </span>
              )}
              <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, border:'1px solid',
                background: kpis.capacityPct>=80?'rgba(48,105,59,0.1)':kpis.capacityPct>=40?'rgba(214,88,48,0.1)':'rgba(153,44,38,0.1)',
                color: kpis.capacityPct>=80?'#30693B':kpis.capacityPct>=40?'#D65830':'#992C26',
                borderColor: kpis.capacityPct>=80?'rgba(48,105,59,0.3)':kpis.capacityPct>=40?'rgba(214,88,48,0.3)':'rgba(153,44,38,0.3)',
              }}>
                {kpis.capacityPct>=80?'✓':'⚠'} Capacity {kpis.capacityPct}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Filtros — encima de KPIs, alineados a la derecha ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center',
        gap:6, marginBottom:12 }}>
        {/* Calendario — fecha o rango */}
        <div style={{ display:'flex', alignItems:'center', gap:3, padding:'6px 11px',
          borderRadius:10, background:'var(--c-surface)',
          border:'1px solid var(--c-border)', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <span style={{ fontSize:13, flexShrink:0 }}>📅</span>
          <input type="date" value={customIni} max={hoy}
            onChange={e => { const v=e.target.value; setCustomIni(v); if(v>customFin) setCustomFin(v); setFiltro('rango'); setTimeout(()=>load(),50) }}
            style={{ border:'none', background:'transparent', fontSize:12.5, fontWeight:600,
              color:'var(--t-primary)', cursor:'pointer', outline:'none', fontFamily:'inherit', width:108 }}/>
          <span style={{ color:'var(--t-muted)', fontSize:11, flexShrink:0 }}>→</span>
          <input type="date" value={customFin} min={customIni} max={hoy}
            onChange={e => { setCustomFin(e.target.value); setFiltro('rango'); setTimeout(()=>load(),50) }}
            style={{ border:'none', background:'transparent', fontSize:12.5, fontWeight:600,
              color:'var(--t-primary)', cursor:'pointer', outline:'none', fontFamily:'inherit', width:108 }}/>
        </div>
        {/* Sprint */}
        <select value={sprintId??''} onChange={e=>{ const v=e.target.value?parseInt(e.target.value):null; setSprintId(v); setFiltro('sprint'); setTimeout(()=>load(),50) }}
          style={{ padding:'6px 10px', borderRadius:10,
            border:`1px solid ${filtro==='sprint'?'var(--c-accent)':'var(--c-border)'}`,
            fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            background: filtro==='sprint'?'rgba(99,102,241,.07)':'var(--c-surface)',
            color:'var(--t-primary)', minWidth:120,
            boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <option value="">Sprint activo</option>
          {sprints?.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        {/* Reset → hoy */}
        <button onClick={()=>{ setFiltro('rango'); setCustomIni(hoy); setCustomFin(hoy); setSprintId(null); setTimeout(()=>load(),50) }}
          style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center',
            justifyContent:'center', background:'var(--c-surface)',
            border:'1px solid var(--c-border)', cursor:'pointer', color:'var(--c-accent)',
            boxShadow:'0 1px 4px rgba(0,0,0,.06)', flexShrink:0 }}
          title="Ver hoy">
          <RefreshCw size={13}/>
        </button>
      </div>

      {/* Sin sprint activo — aviso pero permite filtrar */}
      {!sprint && filtro === 'sprint' && !sprintId && (
        <div style={{ padding:'14px 18px', borderRadius:12, marginBottom:14,
          background:'rgba(153,44,38,0.06)', border:'1px solid rgba(153,44,38,0.2)',
          display:'flex', alignItems:'center', gap:10 }}>
          <AlertCircle size={18} style={{ color:'#992C26', flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#992C26' }}>No hay sprint activo</div>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>
              No se encontró un sprint activo. Puedes filtrar por fecha o seleccionar un sprint anterior.
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
        <KpiCard accent label="Capacity"         value={`${kpis.capacityPct}%`}   sub={`${fmtMins(kpis.totalMins)} registradas`} />
        <KpiCard       label="Horas registradas" value={fmtMins(kpis.totalMins)}  sub={`${kpis.totalActividades} act. · ${kpis.diasConActividad} días`} />
        <KpiCard       label="Promedio diario"   value={fmtMins(kpis.promMins)}   sub="Por día con actividad" />
        <KpiCard       label="Días finalizados"  value={kpis.diasFinalizados}      sub="Con actividad registrada" />
        <KpiCard       label="Tareas no plan."   value={`${kpis.noPlaneadasPct}%`} sub="Meta ≤ 20%"
          warn={kpis.noPlaneadasPct>20} danger={kpis.noPlaneadasPct>35} />
      </div>

      {/* Distribución por dominio */}
      <div className="card" style={{ padding:20, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--c-accent)' }} />
          <span style={{ fontSize:15, fontWeight:700 }}>Capacity — Distribución por Dominio</span>
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted)', marginBottom:14 }}>💡 Doble clic en cada dominio para ver el detalle de tareas</div>
        {totalMins === 0
          ? <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t-muted)', fontSize:14 }}>Sin actividades en el período seleccionado</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
              {Object.keys(MODEL_META).map(m => (
                <ModelCard key={m} model={m} mins={byModel[m]??0} totalMins={totalMins} onDoubleClick={setPopupModel} />
              ))}
            </div>
        }
      </div>

      {/* Gráficas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--brand-orange)' }} />
            <span style={{ fontSize:15, fontWeight:700 }}>Horas por Día</span>
          </div>
          {horasPorDia.length === 0
            ? <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t-muted)', fontSize:14 }}>Sin datos</div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={horasPorDia} margin={{ top:22, right:10, left:-20, bottom:5 }}>
                  <XAxis dataKey="dayLabel" tick={{ fontSize:12, fill:'var(--t-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${Math.floor(v/60)}h`} tick={{ fontSize:12, fill:'var(--t-muted)' }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<BarTooltip />} />
                  <Bar dataKey="mins" radius={[6,6,0,0]} maxBarSize={44}>
                    {horasPorDia.map((d,i) => <Cell key={i} fill={d.mins>=480?'#30693B':d.mins>=240?'#D65830':'#3E5D9D'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--c-accent)' }} />
            <span style={{ fontSize:15, fontWeight:700 }}>Distribución por Dominio</span>
          </div>
          {pieData.length === 0
            ? <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t-muted)', fontSize:14 }}>Sin datos</div>
            : <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                <ResponsiveContainer width={170} height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                      dataKey="value" strokeWidth={2} stroke="var(--c-surface)">
                      {pieData.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1 }}>
                  {pieData.map((d,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0, display:'inline-block' }} />
                        <span style={{ fontSize:13, fontWeight:700, color:d.color }}>{d.name}</span>
                      </div>
                      <div>
                        <span style={{ fontSize:14, fontWeight:800, color:d.color }}>{d.pct}%</span>
                        <span style={{ fontSize:12, color:'var(--t-muted)', marginLeft:6 }}>{fmtMins(d.value)}</span>
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
