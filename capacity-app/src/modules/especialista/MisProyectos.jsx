/**
 * MisProyectos.jsx — mejoras v2
 * - KPI cards con animación hover y colores por estado
 * - Doble clic en proyecto → modal con detalle completo
 */

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

// ── KPI Card con animación y color ─────────────────────────────────────────
function KpiCard({ label, value, sub, accent, bgColor }) {
  const [hov, setHov] = useState(false)
  const bg     = accent ? 'linear-gradient(135deg,#33289A,#4554A1)' : bgColor ? bgColor : 'var(--c-surface)'
  const shadow = hov ? `0 6px 20px ${bgColor ?? 'rgba(51,40,154,0.3)'}60` : 'none'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:bg, borderRadius:12, padding:'14px 16px',
        border: accent||bgColor ? 'none' : '1px solid var(--c-border)',
        boxShadow:shadow,
        transform: hov ? 'translateY(-3px)' : 'none',
        transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
        cursor:'default',
      }}
    >
      <div style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color: accent||bgColor?'rgba(255,255,255,0.65)':'var(--t-muted)', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:900, color: accent||bgColor?'white':'var(--c-accent)', letterSpacing:-1, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:9, color: accent||bgColor?'rgba(255,255,255,0.55)':'var(--t-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Modal detalle de proyecto ──────────────────────────────────────────────
function ProyectoModal({ p, onClose }) {
  if (!p) return null
  const estado = ESTADO_MAP[p.estado] ?? { label:p.estado, cls:'badge-gray', color:'#666' }

  const Row = ({ label, value }) => value ? (
    <div style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:'1px solid var(--c-border)' }}>
      <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, color:'var(--t-muted)', minWidth:140, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:11, color:'var(--t-primary)' }}>{value}</span>
    </div>
  ) : null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:28, maxWidth:580, width:'100%', boxShadow:'var(--s-xl)', border:'1px solid var(--c-border)', maxHeight:'90vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ padding:'2px 8px', borderRadius:99, fontSize:8.5, fontWeight:800, background:`${p.oficina.color}18`, color:p.oficina.color, border:`1px solid ${p.oficina.color}40` }}>
                {p.oficina.nombre}
              </span>
              {p.programa && p.programa !== '—' && (
                <span style={{ padding:'2px 8px', borderRadius:99, fontSize:8.5, fontWeight:700, background:'var(--c-surface2)', color:'var(--t-muted)', border:'1px solid var(--c-border)' }}>
                  {p.programa}
                </span>
              )}
              <span className={`badge ${estado.cls}`}>{estado.label}</span>
            </div>
            <h2 style={{ fontSize:18, fontWeight:900, letterSpacing:-.4, marginBottom:4 }}>{p.nombre}</h2>
            {p.descripcion && <p style={{ fontSize:11, color:'var(--t-secondary)', lineHeight:1.6 }}>{p.descripcion}</p>}
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-surface2)', border:'none', cursor:'pointer', flexShrink:0, marginLeft:12 }}>
            <X size={14} />
          </button>
        </div>

        {/* Avance */}
        <div style={{ marginBottom:20, padding:'14px 16px', background:'var(--c-surface2)', borderRadius:12, border:'1px solid var(--c-border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, color:'var(--t-muted)' }}>% Avance</span>
            <span style={{ fontSize:22, fontWeight:900, color: p.avancePct>=70?'#30693B':p.avancePct>=40?'#D65830':'#3E5D9D' }}>{p.avancePct}%</span>
          </div>
          <div style={{ height:8, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${p.avancePct}%`, background: p.avancePct>=70?'#30693B':p.avancePct>=40?'#D65830':'#3E5D9D', borderRadius:99, transition:'width .5s' }} />
          </div>
          {p.estadoDetalle && <p style={{ fontSize:9.5, color:'var(--t-secondary)', marginTop:6, fontStyle:'italic' }}>📋 {p.estadoDetalle}</p>}
        </div>

        {/* Detalles */}
        <div>
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
            <div style={{ padding:'10px 0', borderBottom:'1px solid var(--c-border)' }}>
              <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, color:'var(--t-muted)', marginBottom:5 }}>Observaciones</div>
              <p style={{ fontSize:11, color:'var(--t-primary)', lineHeight:1.6 }}>{p.observaciones}</p>
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

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onDoubleClick={() => onDoubleClick(p)}
      title="Doble clic para ver detalle"
      style={{
        background:'var(--c-surface)', borderRadius:14, padding:'18px 20px',
        border:`1px solid ${hov ? p.oficina.color : 'var(--c-border)'}`,
        boxShadow: hov ? `0 6px 20px ${p.oficina.color}25` : 'none',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition:'all .2s cubic-bezier(.34,1.56,.64,1)', cursor:'pointer',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
            <span style={{ padding:'2px 8px', borderRadius:99, fontSize:8.5, fontWeight:800, background:`${p.oficina.color}18`, color:p.oficina.color, border:`1px solid ${p.oficina.color}40` }}>
              {p.oficina.nombre}
            </span>
            <span style={{ fontSize:8.5, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:.4 }}>{p.tipo==='estrategico'?'PROY':'OPE'}</span>
          </div>
          <h3 style={{ fontSize:14, fontWeight:800, letterSpacing:-.3, marginBottom:4 }}>{p.nombre}</h3>
          {p.descripcion && <p style={{ fontSize:10.5, color:'var(--t-secondary)', lineHeight:1.5, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.descripcion}</p>}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', fontSize:9.5, color:'var(--t-muted)' }}>
            {p.lider && p.lider!=='—' && <span>👤 {p.lider}</span>}
            {p.fechaInicio && p.fechaFin && <span>📅 {p.fechaInicio} → {p.fechaFin}</span>}
          </div>
        </div>
        <span className={`badge ${estado.cls}`} style={{ flexShrink:0, marginLeft:8 }}>{estado.label}</span>
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <span style={{ fontSize:9.5, fontWeight:700, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:.6 }}>Avance</span>
          <span style={{ fontSize:13, fontWeight:900, color:p.avancePct>=70?'#30693B':p.avancePct>=40?'#D65830':'#3E5D9D' }}>{p.avancePct}%</span>
        </div>
        <div style={{ height:6, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${p.avancePct}%`, background:p.avancePct>=70?'#30693B':p.avancePct>=40?'#D65830':'#3E5D9D', borderRadius:99, transition:'width .5s' }} />
        </div>
      </div>

      {p.estadoDetalle && <div style={{ fontSize:9.5, color:'var(--t-secondary)', fontStyle:'italic', marginBottom:10 }}>📋 {p.estadoDetalle}</div>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--c-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <Clock size={11} style={{ color:'var(--c-accent)' }} />
          <span style={{ fontSize:10.5, fontWeight:700, color:'var(--c-accent)' }}>{fmtMins(p.minInvertidos)}</span>
          <span style={{ fontSize:9, color:'var(--t-muted)' }}>invertidas</span>
        </div>
        <span style={{ fontSize:8.5, color:'var(--t-muted)', opacity: hov?1:0, transition:'opacity .15s' }}>Doble clic para ver detalle</span>
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:16 }}>
        <KpiCard accent   label="Total"          value={kpis.total}      sub="Proyectos / Iniciativas" />
        <KpiCard bgColor="#30693B" label="En ejecución"  value={kpis.ejecucion}  sub="Activos" />
        <KpiCard bgColor="#D65830" label="Sin iniciar"   value={kpis.sinIniciar} sub="Pendientes" />
        <KpiCard bgColor="#992C26" label="Suspendidos"   value={kpis.suspendido} sub="En pausa" />
        <KpiCard bgColor="#666666" label="Cerrados"      value={kpis.cerrado}    sub="Finalizados" />
        <KpiCard          label="Avance prom."  value={`${kpis.avanceProm}%`} sub="Global" />
      </div>

      {proyectos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ico" style={{ opacity:.22 }}><TrendingUp size={38} /></div>
          <p>No tienes proyectos asignados en esta oficina</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:12 }}>
          {proyectos.map(p => (
            <ProyectoCard key={p.id} p={p} onDoubleClick={setModal} />
          ))}
        </div>
      )}

      {modal && <ProyectoModal p={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
