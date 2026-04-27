/**
 * PortafolioTI.jsx — v3
 * Tabla estilo referencia + popup de detalle con edición completa +
 * confirmación de cambios + registro en auditoría
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Briefcase, TrendingUp, Play, Pause, CheckCircle, AlertCircle,
  DollarSign, RefreshCw, X, Check, Save, Eye,
} from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtUSD(n) {
  if (!n) return '$0K'
  if (n>=1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n>=1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}
function fmtFecha(s) {
  if (!s) return '—'
  return new Date(s+'T12:00:00').toISOString().split('T')[0]
}
function fmtFechaCorta(s) {
  if (!s) return '—'
  const d = new Date(s+'T12:00:00')
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const ESTADOS = {
  sin_iniciar: { color:'#8B95A5', bg:'rgba(139,149,165,.12)', label:'Sin iniciar' },
  activo:      { color:'#10B981', bg:'rgba(16,185,129,.12)',  label:'Ejecución'   },
  pausado:     { color:'#F97316', bg:'rgba(249,115,22,.12)',  label:'Suspendido'  },
  cerrado:     { color:'#6366F1', bg:'rgba(99,102,241,.12)',  label:'Finalizado'  },
}
const TIPOS_CORTOS = {
  proyecto:'PROY', programa:'PROG', iniciativa:'INIC', servicio:'SERV',
}
const TIPO_PROY_COLS = {
  proyecto:   '#6366F1', programa: '#10B981', iniciativa:'#F97316', servicio:'#8B5CF6',
}
const CLASIF_CORTOS = {
  estrategico:'ESTRA', operativo:'OPER', innovacion:'INNOV', continuidad_operativa:'CONT',
}

function EstBadge({ estado }) {
  const e = ESTADOS[estado]||ESTADOS.sin_iniciar
  return (
    <span style={{ padding:'3px 11px', borderRadius:99, fontSize:11, fontWeight:700,
      background:e.bg, color:e.color, whiteSpace:'nowrap' }}>{e.label}</span>
  )
}
function TipoBadge({ tipo }) {
  const label = TIPOS_CORTOS[tipo] || (tipo||'').toUpperCase().slice(0,4)
  const col   = TIPO_PROY_COLS[tipo] || '#888'
  return (
    <span style={{ padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:800,
      background:`${col}15`, color:col, letterSpacing:.4 }}>{label}</span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD clicable con animación hover
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, accent, active, onClick }) {
  const [hov, setHov] = useState(false)
  const on = active || hov
  // Siempre colored: accent=true → gradiente sólido siempre, active añade borde/sombra extra
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        borderRadius:13, padding:'13px 15px', cursor:onClick?'pointer':'default', userSelect:'none',
        background: accent
          ? `linear-gradient(135deg,${color},${color}cc)`
          : active ? `${color}15` : `${color}08`,
        border: active
          ? `2px solid ${color}`
          : `1.5px solid ${on ? color+'60' : color+'25'}`,
        boxShadow: active
          ? `0 8px 24px ${color}35`
          : on ? `0 4px 14px ${color}20` : `0 2px 8px ${color}10`,
        transform: on ? 'translateY(-3px) scale(1.015)' : 'translateY(0) scale(1)',
        transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
        <div style={{ color: accent ? 'rgba(255,255,255,.8)' : color,
          transform:on?'scale(1.12)':'scale(1)', transition:'transform .15s' }}>{icon}</div>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.9,
          color: accent ? 'rgba(255,255,255,.65)' : color+'cc' }}>{label}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:900, letterSpacing:-1,
        color: accent ? 'white' : color, lineHeight:1 }}>{value}</div>
      {sub&&<div style={{ fontSize:11, marginTop:4,
        color: accent ? 'rgba(255,255,255,.55)' : color+'99' }}>{sub}</div>}
      {active&&onClick&&<div style={{ marginTop:5, fontSize:9.5, fontWeight:700,
        padding:'2px 8px', borderRadius:99, display:'inline-block',
        background: accent ? 'rgba(255,255,255,.2)' : color+'20',
        color: accent ? 'white' : color }}>✓ Filtrando</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE OFICINA clicable
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaOficina({ of, active, onClick }) {
  const color = of.color||'#6366F1'
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderRadius:16, border:`1.5px solid ${active?color:hov?color+'55':'var(--c-border)'}`,
        overflow:'hidden', background:'var(--c-surface)', cursor:'pointer', transition:'all .18s',
        boxShadow:active?`0 6px 24px ${color}25`:hov?`0 4px 14px ${color}15`:'none',
        transform:active||hov?'translateY(-2px)':'translateY(0)' }}>
      <div style={{ padding:'13px 16px', background:active?`${color}10`:`${color}06`,
        borderBottom:'1px solid var(--c-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:900, color }}>{of.nombre}</div>
          <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:2 }}>
            {of.total} proyecto{of.total!==1?'s':''}{active?' · filtrando':''}
          </div>
        </div>
        <div style={{ width:40, height:40, borderRadius:11, background:color,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 12px ${color}50` }}>
          <Briefcase size={18} style={{ color:'white' }}/>
        </div>
      </div>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {[['activos','Activos','#10B981'],['sinIniciar','Sin iniciar','#6B7280'],
            ['suspendidos','Susp.','#F97316'],['finalizados','Final.','#6366F1']].map(([k,l,c])=>(
            <span key={k} style={{ padding:'3px 9px', borderRadius:99, fontSize:10.5,
              fontWeight:700, background:`${c}12`, color:c }}>{of[k]} {l}</span>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[['avgCostoEst','Est.','#6B7280'],['avgCostoEjec','Ejec.','#10B981']].map(([k,l,c])=>(
            <div key={k} style={{ padding:'8px 10px', borderRadius:9, background:'var(--c-surface2)',
              border:'1px solid var(--c-border)' }}>
              <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:.7,
                color:'var(--t-muted)', marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:14, fontWeight:900, color:c,
                fontFamily:'JetBrains Mono, monospace' }}>{fmtUSD(of[k])}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── DescTextarea — completamente aislado, nunca re-renderiza mientras escribes
// Actualiza el form del padre SOLO al perder el foco (onBlur)
function DescTextarea({ initial, onCommit, style }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && ref.current.value !== initial) {
      ref.current.value = initial
    }
  }, [initial])
  return (
    <textarea
      ref={ref}
      defaultValue={initial}
      rows={4}
      onBlur={e => onCommit(e.target.value)}
      onFocus={e => { e.target.style.borderColor = '#6366F1' }}
      style={style}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POPUP DETALLE + EDICIÓN
// ─────────────────────────────────────────────────────────────────────────────
function PopupProyecto({ proyecto: pOrig, empleados, onGuardar, onClose }) {
  const [form,     setForm]     = useState({ ...pOrig })
  const [dirty,    setDirty]    = useState(false)   // hay cambios sin guardar
  const [confirm,  setConfirm]  = useState(false)   // mostrar modal de confirmación
  const [busy,     setBusy]     = useState(false)
  const [saved,    setSaved]    = useState(false)    // feedback de éxito
  const [closeReq, setCloseReq] = useState(false)   // quiere cerrar con cambios

  const set = (k, v) => { setForm(p=>({...p, [k]:v})); setDirty(true) }

  const changedFields = () => {
    const changes = []
    const compare = {
      nombre:'Nombre', descripcion:'Descripción', tipo:'Tipo',
      tipo_proyecto:'Tipo de proyecto', clasificacion:'Clasificación',
      estado:'Estado', avance_pct:'Avance', fecha_inicio:'Fecha inicio',
      fecha_fin:'Fecha fin', costo_est_anual:'Costo estimado',
      costo_ejec_anual:'Costo ejecución', id_lider:'Responsable',
    }
    for (const [k, label] of Object.entries(compare)) {
      if (String(form[k]||'') !== String(pOrig[k]||'')) changes.push(label)
    }
    return changes
  }

  const handleSave = async () => {
    setBusy(true)
    try {
      await onGuardar(pOrig.id_proyecto, form)
      setSaved(true)
      setDirty(false)
      setTimeout(()=>setSaved(false), 2500)
    } catch(e) { alert(e.message) }
    finally { setBusy(false); setConfirm(false) }
  }

  const handleClose = () => {
    if (dirty) { setCloseReq(true) } else { onClose() }
  }

  const avPct = form.avance_pct||0
  const avCol = avPct>=75?'#10B981':avPct>=40?'#F97316':'#6366F1'
  const ofCol = pOrig.oficina_color||'#6366F1'

  const inp = {
    width:'100%', padding:'9px 12px', borderRadius:10,
    border:'1.5px solid var(--c-border)', background:'var(--c-surface2)',
    fontSize:13, color:'var(--t-primary)', fontFamily:'inherit',
    outline:'none', boxSizing:'border-box', transition:'border-color .15s',
  }
  const lbl = {
    fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:.8,
    color:'var(--t-muted)', display:'block', marginBottom:5,
  }
  const F = ({ label, children, span2 }) => (
    <div style={span2?{ gridColumn:'span 2' }:{}}>
      <label style={lbl}>{label}</label>{children}
    </div>
  )

  return (
    <>
      {/* Overlay principal */}
      <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center',
        justifyContent:'center', background:'rgba(10,10,20,.6)', backdropFilter:'blur(6px)', padding:20 }}
        onClick={handleClose}>
        <div style={{ background:'var(--c-surface)', borderRadius:24, width:'100%', maxWidth:780,
          maxHeight:'92vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.3)',
          border:'1px solid var(--c-border)' }}
          onClick={e=>e.stopPropagation()}>

          {/* Header del popup */}
          <div style={{ padding:'22px 28px 18px', borderBottom:'1px solid var(--c-border)',
            background:`linear-gradient(135deg,${ofCol}08,transparent)`,
            display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <div style={{ width:4, height:28, borderRadius:99, background:ofCol, flexShrink:0 }}/>
                <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                  background:`${ofCol}18`, color:ofCol }}>{pOrig.oficina_nombre||'Oficina'}</span>
                <TipoBadge tipo={pOrig.tipo_proyecto}/>
                <EstBadge estado={pOrig.estado}/>
              </div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-.3 }}>{pOrig.nombre}</div>
              {pOrig.lider_nombre && (
                <div style={{ fontSize:12.5, color:'var(--t-muted)', marginTop:4 }}>
                  Responsable: <strong style={{ color:'var(--t-secondary)' }}>{pOrig.lider_nombre}</strong>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              {saved && (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                  borderRadius:9, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)',
                  fontSize:12.5, fontWeight:700, color:'#10B981' }}>
                  <CheckCircle size={13}/> Guardado
                </div>
              )}
              {dirty && !saved && (
                <button onClick={()=>setConfirm(true)} disabled={busy}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                    borderRadius:10, border:'none', background:'#6366F1', color:'white',
                    fontSize:13, fontWeight:700, cursor:'pointer', opacity:busy?.7:1 }}>
                  <Save size={14}/> Guardar cambios
                </button>
              )}
              <button onClick={handleClose}
                style={{ width:34, height:34, borderRadius:9, border:'none',
                  background:'var(--c-surface2)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
                <X size={15}/>
              </button>
            </div>
          </div>

          {/* Avance del proyecto */}
          <div style={{ padding:'16px 28px', borderBottom:'1px solid var(--c-border)',
            background:'var(--c-surface2)', display:'flex', alignItems:'center', gap:20 }}>
            {/* Barra decorativa */}
            <div style={{ flex:1, height:10, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${avPct}%`, background:avCol,
                borderRadius:99, transition:'width .4s' }}/>
            </div>
            {/* Input numérico — la única forma de editar */}
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <input
                type="number" min="0" max="100"
                value={avPct}
                onChange={e => set('avance_pct', Math.min(100, Math.max(0, parseInt(e.target.value)||0)))}
                style={{ width:64, fontSize:18, fontWeight:900, textAlign:'center',
                  padding:'6px 8px', borderRadius:10,
                  border:`2px solid ${avCol}`, background:'var(--c-surface)',
                  color:avCol, fontFamily:'JetBrains Mono, monospace',
                  outline:'none' }}
              />
              <span style={{ fontSize:14, fontWeight:700, color:avCol }}>%</span>
            </div>
          </div>

          {/* Formulario de edición */}
          <div style={{ padding:'22px 28px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 20px' }}>

              <F label="Nombre del proyecto" span2>
                <input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)}
                  style={inp} onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Estado">
                <select value={form.estado||'sin_iniciar'} onChange={e=>set('estado',e.target.value)}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="sin_iniciar">Sin iniciar</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Suspendido</option>
                  <option value="cerrado">Finalizado</option>
                </select>
              </F>

              <F label="Responsable">
                <select value={form.id_lider||''} onChange={e=>set('id_lider',e.target.value||null)}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Sin asignar</option>
                  {empleados.map(e=>(
                    <option key={e.id_empleado} value={e.id_empleado}>
                      {e.nombre}{e.oficio?` — ${e.oficio.substring(0,35)}`:''}
                    </option>
                  ))}
                </select>
              </F>

              <F label="Tipo de proyecto">
                <select value={form.tipo_proyecto||'proyecto'} onChange={e=>set('tipo_proyecto',e.target.value)}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="proyecto">Proyecto</option>
                  <option value="programa">Programa</option>
                  <option value="iniciativa">Iniciativa</option>
                  <option value="servicio">Servicio</option>
                </select>
              </F>

              <F label="Clasificación">
                <select value={form.clasificacion||'estrategico'} onChange={e=>set('clasificacion',e.target.value)}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="estrategico">Estratégico</option>
                  <option value="operativo">Operativo</option>
                  <option value="innovacion">Innovación</option>
                  <option value="continuidad_operativa">Continuidad Operativa</option>
                </select>
              </F>

              <F label="Tipo">
                <select value={form.tipo||'estrategico'} onChange={e=>set('tipo',e.target.value)}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="estrategico">Estratégico</option>
                  <option value="operativo">Operativo</option>
                  <option value="innovacion">Innovación</option>
                  <option value="continuidad_operativa">Continuidad Operativa</option>
                </select>
              </F>

              <F label="Fecha inicio">
                <input type="date" value={form.fecha_inicio||''} onChange={e=>set('fecha_inicio',e.target.value)}
                  style={inp} onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Fecha fin">
                <input type="date" value={form.fecha_fin||''} min={form.fecha_inicio||''}
                  onChange={e=>set('fecha_fin',e.target.value)}
                  style={inp} onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Costo estimado anual ($)">
                <input type="number" value={form.costo_est_anual||''} min="0"
                  onChange={e=>set('costo_est_anual',parseFloat(e.target.value)||0)}
                  style={inp} onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Costo ejecución anual ($)">
                <input type="number" value={form.costo_ejec_anual||''} min="0"
                  onChange={e=>set('costo_ejec_anual',parseFloat(e.target.value)||0)}
                  style={inp} onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Descripción" span2>
                <DescTextarea
                  key={pOrig.id_proyecto}
                  initial={form.descripcion||''}
                  onCommit={v=>set('descripcion',v)}
                  style={{ ...inp, resize:'vertical' }}
                />
              </F>
            </div>

            {/* Indicador de cambios pendientes */}
            {dirty && (
              <div style={{ marginTop:16, padding:'10px 14px', borderRadius:10,
                background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.2)',
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:12.5, color:'#6366F1', fontWeight:600 }}>
                  ✏️ Cambios pendientes: {changedFields().join(', ')}
                </div>
                <button onClick={()=>setConfirm(true)} disabled={busy}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px',
                    borderRadius:9, border:'none', background:'#6366F1', color:'white',
                    fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                  <Save size={13}/> Guardar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmación de guardado */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center',
          justifyContent:'center', background:'rgba(0,0,0,.4)', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--c-surface)', borderRadius:20, padding:'28px 28px 22px',
            maxWidth:420, width:'100%', margin:'0 16px',
            boxShadow:'0 24px 60px rgba(0,0,0,.25)', border:'1px solid var(--c-border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:14,
                background:'rgba(99,102,241,.1)', display:'flex',
                alignItems:'center', justifyContent:'center' }}>
                <Save size={20} style={{ color:'#6366F1' }}/>
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:900 }}>¿Guardar cambios?</div>
                <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>
                  Esta acción quedará registrada en auditoría
                </div>
              </div>
            </div>

            {/* Lista de campos modificados */}
            <div style={{ padding:'12px 14px', borderRadius:11, marginBottom:18,
              background:'var(--c-surface2)', border:'1px solid var(--c-border)' }}>
              <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase',
                letterSpacing:.8, color:'var(--t-muted)', marginBottom:8 }}>
                Campos modificados
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {changedFields().map(f=>(
                  <span key={f} style={{ padding:'2px 9px', borderRadius:99, fontSize:11.5,
                    fontWeight:700, background:'rgba(99,102,241,.1)', color:'#6366F1' }}>
                    {f}
                  </span>
                ))}
                {changedFields().length===0 && (
                  <span style={{ fontSize:12, color:'var(--t-muted)', fontStyle:'italic' }}>
                    Sin cambios detectados
                  </span>
                )}
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirm(false)}
                style={{ flex:1, padding:'10px', borderRadius:12, border:'1px solid var(--c-border)',
                  background:'var(--c-surface2)', fontSize:13, fontWeight:700,
                  cursor:'pointer', color:'var(--t-secondary)' }}>
                Revisar
              </button>
              <button onClick={handleSave} disabled={busy||changedFields().length===0}
                style={{ flex:2, padding:'10px', borderRadius:12, border:'none',
                  background:changedFields().length>0?'#6366F1':'var(--c-border)',
                  color:'white', fontSize:13, fontWeight:800,
                  cursor:changedFields().length===0||busy?'not-allowed':'pointer',
                  opacity:busy?.7:1, display:'flex', alignItems:'center',
                  justifyContent:'center', gap:7 }}>
                <Check size={14}/>{busy?'Guardando...':'Confirmar y guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cierre con cambios sin guardar */}
      {closeReq && (
        <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center',
          justifyContent:'center', background:'rgba(0,0,0,.4)', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--c-surface)', borderRadius:20, padding:'26px 26px 20px',
            maxWidth:380, width:'100%', margin:'0 16px',
            boxShadow:'0 24px 60px rgba(0,0,0,.25)', border:'1px solid var(--c-border)' }}>
            <div style={{ fontSize:16, fontWeight:900, marginBottom:8 }}>
              ⚠️ Cambios sin guardar
            </div>
            <div style={{ fontSize:13, color:'var(--t-muted)', marginBottom:20, lineHeight:1.6 }}>
              Tienes cambios que no se han guardado. ¿Qué deseas hacer?
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setCloseReq(false)}
                style={{ flex:1, padding:'10px', borderRadius:11, border:'1px solid var(--c-border)',
                  background:'var(--c-surface2)', fontSize:13, fontWeight:700,
                  cursor:'pointer', color:'var(--t-secondary)' }}>
                Seguir editando
              </button>
              <button onClick={onClose}
                style={{ flex:1, padding:'10px', borderRadius:11, border:'none',
                  background:'#EF4444', color:'white', fontSize:13,
                  fontWeight:700, cursor:'pointer' }}>
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


// ── InlineEstado — select directo en tabla ────────────────────────────────
function InlineEstado({ estado, onChange }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const e = ESTADOS[estado]||ESTADOS.sin_iniciar
  const ref = useRef(null)

  useEffect(() => {
    const fn = ev => { if (ref.current && !ref.current.contains(ev.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handle = async (val) => {
    setBusy(true); setOpen(false)
    try { await onChange(val) } catch(err) { alert(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={()=>setOpen(o=>!o)} disabled={busy}
        style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
          background:e.bg, color:e.color, border:`1px solid ${e.color}40`,
          cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
        {busy ? '…' : e.label}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:200,
          background:'var(--c-surface)', border:'1px solid var(--c-border)',
          borderRadius:11, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,.15)',
          minWidth:140 }}>
          {Object.entries(ESTADOS).map(([k,v])=>(
            <button key={k} onClick={()=>handle(k)}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'8px 14px', border:'none', background: estado===k?`${v.color}10`:'transparent',
                cursor:'pointer', fontSize:12, fontWeight:700, color:v.color, textAlign:'left',
                transition:'background .1s' }}
              onMouseEnter={e=>{ if(estado!==k) e.currentTarget.style.background=`${v.color}08` }}
              onMouseLeave={e=>{ if(estado!==k) e.currentTarget.style.background='transparent' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:v.color, flexShrink:0 }}/>
              {v.label}
              {estado===k && <span style={{ marginLeft:'auto', fontSize:10 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── InlineAvance — barra visual + número editable al hacer clic ──────────
function InlineAvance({ avance, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val,     setVal]     = useState(avance)
  const [busy,    setBusy]    = useState(false)
  const inputRef  = useRef(null)
  const avCol = val>=75?'#10B981':val>=40?'#F97316':'#6366F1'

  useEffect(() => { setVal(avance) }, [avance])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select() }, [editing])

  const commit = async (newVal) => {
    const clamped = Math.min(100, Math.max(0, parseInt(newVal)||0))
    setVal(clamped); setBusy(true); setEditing(false)
    try { await onChange(clamped) } catch(e) { alert(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:110 }}>
      {/* Barra solo decorativa */}
      <div style={{ flex:1, height:6, borderRadius:99, background:'var(--c-border)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${val}%`, background:avCol,
          borderRadius:99, transition:'width .4s' }}/>
      </div>
      {/* Número — clic para editar */}
      {editing ? (
        <input
          ref={inputRef}
          type="number" min="0" max="100"
          defaultValue={val}
          onBlur={e=>commit(e.target.value)}
          onKeyDown={e=>{
            if (e.key==='Enter') commit(e.target.value)
            if (e.key==='Escape') { setVal(avance); setEditing(false) }
          }}
          style={{ width:50, fontSize:12, fontWeight:900, textAlign:'center',
            padding:'3px 4px', borderRadius:7, border:`1.5px solid ${avCol}`,
            background:'var(--c-surface)', color:avCol,
            fontFamily:'JetBrains Mono, monospace', outline:'none' }}/>
      ) : (
        <span
          onClick={()=>setEditing(true)}
          title="Clic para editar"
          style={{ fontSize:12, fontWeight:900, color:avCol, minWidth:34,
            textAlign:'right', fontFamily:'JetBrains Mono, monospace',
            cursor:'text', userSelect:'none',
            padding:'2px 5px', borderRadius:6,
            border:'1px dashed transparent', transition:'border-color .15s' }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=avCol+'60'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
          {busy ? '…' : `${val}%`}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLA DE PROYECTOS — estilo referencia
// ─────────────────────────────────────────────────────────────────────────────
function TablaProyectos({ proyectos, onClickProyecto, onUpdateInline }) {
  // Ancho de columnas ajustable con drag
  const [colW, setColW] = useState({
    oficina:80, tipo:60, nombre:220, clasif:120,
    inicio:100, fin:100, estado:120, avance:140,
    costoE:90, costoX:90, resp:150, acc:60,
  })
  const dragging = useRef(null)

  const onMouseDown = (col, e) => {
    e.preventDefault()
    dragging.current = { col, startX: e.clientX, startW: colW[col] }
    const onMove = ev => {
      const diff = ev.clientX - dragging.current.startX
      setColW(w => ({ ...w, [col]: Math.max(50, dragging.current.startW + diff) }))
    }
    const onUp = () => { dragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const TH = ({ children, col, center }) => (
    <th style={{ padding:'9px 8px 9px 12px', textAlign:center?'center':'left',
      fontSize:9.5, fontWeight:800, textTransform:'uppercase', letterSpacing:1,
      color:'var(--t-muted)', background:'var(--c-surface2)',
      borderBottom:'2px solid var(--c-border)', whiteSpace:'nowrap',
      width: col ? colW[col] : undefined, position:'relative', userSelect:'none' }}>
      {children}
      {col && (
        <div onMouseDown={e=>onMouseDown(col,e)}
          style={{ position:'absolute', right:0, top:0, bottom:0, width:6, cursor:'col-resize',
            background:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}
          title="Arrastrar para ajustar ancho">
          <div style={{ width:2, height:14, background:'var(--c-border)', borderRadius:1 }}/>
        </div>
      )}
    </th>
  )

  return (
    <div style={{ overflowX:'auto', borderRadius:14,
      border:'1px solid var(--c-border)', boxShadow:'0 2px 10px rgba(0,0,0,.04)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
        <thead>
          <tr>
            <TH col="oficina">Oficina</TH>
            <TH col="tipo">Tipo</TH>
            <TH col="nombre">Nombre</TH>
            <TH col="clasif">Clasificación</TH>
            <TH col="inicio">Inicio</TH>
            <TH col="fin">Fin</TH>
            <TH col="estado">Estado</TH>
            <TH col="avance">Avance</TH>
            <TH col="costoE">Costo est.</TH>
            <TH col="costoX">Costo ejec.</TH>
            <TH col="resp">Responsable</TH>
            <TH col="acc" center>Acc.</TH>
          </tr>
        </thead>
        <tbody>
          {proyectos.length===0 && (
            <tr><td colSpan={12} style={{ textAlign:'center', padding:'40px 0',
              color:'var(--t-muted)', fontSize:13, fontStyle:'italic' }}>
              Sin proyectos con los filtros actuales
            </td></tr>
          )}
          {proyectos.map((p, i) => {
            const ofCol  = p.oficina_color || '#888'
            const avPct  = p.avance_pct||0
            const avCol  = avPct>=75?'#10B981':avPct>=40?'#F97316':'#6366F1'
            const rowBg  = i%2===0 ? 'var(--c-surface)' : 'rgba(0,0,0,.012)'
            return (
              <tr key={p.id_proyecto}
                style={{ background:rowBg, borderBottom:'1px solid var(--c-border)',
                  transition:'background .1s', borderLeft:`3px solid ${ofCol}` }}
                onMouseEnter={e=>e.currentTarget.style.background=`${ofCol}07`}
                onMouseLeave={e=>e.currentTarget.style.background=rowBg}>

                {/* Oficina */}
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ padding:'2px 8px', borderRadius:5, fontSize:10, fontWeight:800,
                    background:`${ofCol}20`, color:ofCol }}>
                    {(p.oficina_nombre||'').toUpperCase().replace('PROYECTOS TI','PROY TI').slice(0,6)}
                  </span>
                </td>

                {/* Tipo */}
                <td style={{ padding:'10px 12px' }}>
                  <TipoBadge tipo={p.tipo_proyecto}/>
                </td>

                {/* Nombre */}
                <td style={{ padding:'10px 12px', maxWidth:colW.nombre, width:colW.nombre }}>
                  <div style={{ fontWeight:700, overflow:'hidden', textOverflow:'ellipsis',
                    whiteSpace:'nowrap', cursor:'pointer', color:'var(--t-primary)',
                    transition:'color .12s' }}
                    onMouseEnter={e=>e.target.style.color=ofCol}
                    onMouseLeave={e=>e.target.style.color='var(--t-primary)'}
                    onClick={()=>onClickProyecto(p)}>
                    {p.nombre}
                  </div>
                  {p.descripcion&&(
                    <div style={{ fontSize:10.5, color:'var(--t-muted)', marginTop:2,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>
                      {p.descripcion}
                    </div>
                  )}
                </td>

                {/* Clasificación */}
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:11.5, color:'var(--t-muted)', fontStyle:'italic' }}>
                    {(p.clasificacion||'—').replace('_',' ')}
                  </span>
                </td>

                {/* Inicio */}
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono, monospace',
                  fontSize:12, color:'#10B981', fontWeight:600 }}>
                  {fmtFechaCorta(p.fecha_inicio)}
                </td>

                {/* Fin */}
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono, monospace',
                  fontSize:12, color:'#F97316', fontWeight:600 }}>
                  {fmtFechaCorta(p.fecha_fin)}
                </td>

                {/* Estado — editable directo en tabla */}
                <td style={{ padding:'8px 12px' }}>
                  <InlineEstado
                    estado={p.estado}
                    onChange={async (nuevoEstado) => {
                      await onUpdateInline(p.id_proyecto, { estado: nuevoEstado })
                    }}
                  />
                </td>

                {/* Avance — editable directo en tabla */}
                <td style={{ padding:'8px 12px', minWidth:130 }}>
                  <InlineAvance
                    avance={avPct}
                    onChange={async (v) => {
                      await onUpdateInline(p.id_proyecto, { avance_pct: v })
                    }}
                  />
                </td>

                {/* Costo est */}
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono, monospace',
                  fontSize:12.5, color:'#6B7280', fontWeight:700 }}>
                  {fmtUSD(p.costo_est_anual)}
                </td>

                {/* Costo ejec */}
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono, monospace',
                  fontSize:12.5, color:'#10B981', fontWeight:700 }}>
                  {fmtUSD(p.costo_ejec_anual)}
                </td>

                {/* Responsable */}
                <td style={{ padding:'10px 12px' }}>
                  {p.lider_nombre ? (
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--t-secondary)' }}>
                      {p.lider_nombre}
                    </span>
                  ) : (
                    <span style={{ fontSize:11.5, color:'var(--t-muted)', fontStyle:'italic' }}>—</span>
                  )}
                </td>

                {/* Acciones */}
                <td style={{ padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                    <button onClick={()=>onClickProyecto(p)}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px',
                        borderRadius:7, border:`1px solid ${ofCol}40`,
                        background:`${ofCol}0a`, color:ofCol,
                        fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        transition:'all .12s' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=`${ofCol}18`}}
                      onMouseLeave={e=>{ e.currentTarget.style.background=`${ofCol}0a`}}>
                      <Eye size={11}/> Ver
                    </button>

                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function PortafolioTI() {
  const [data,       setData]       = useState(null)
  const [empleados,  setEmpleados]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filtroEst,  setFiltroEst]  = useState(null)
  const [filtroOf,   setFiltroOf]   = useState(null)
  const [buscar,     setBuscar]     = useState('')
  const [popup,      setPopup]      = useState(null)   // proyecto abierto en popup

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        api.get('/admin-global/portafolio'),
        api.get('/admin-global/empleados-ti'),
      ])
      setData(r1.data)
      setEmpleados(r2.data||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  // Actualización rápida inline (estado/avance directo desde tabla)
  const handleUpdateInline = useCallback(async (idProyecto, campos) => {
    await api.patch(`/admin-global/portafolio/${idProyecto}`, campos)
    // Actualiza localmente sin reload completo para no perder filtros
    setData(d => {
      if (!d) return d
      const proyectos = d.proyectos.map(p =>
        p.id_proyecto === idProyecto ? { ...p, ...campos } : p
      )
      return { ...d, proyectos }
    })
  }, [])

  // Guardar desde popup: envía todos los campos modificados
  const handleGuardar = async (idProyecto, form) => {
    await api.patch(`/admin-global/portafolio/${idProyecto}`, {
      nombre:          form.nombre,
      descripcion:     form.descripcion,
      tipo:            form.tipo,
      tipo_proyecto:   form.tipo_proyecto,
      clasificacion:   form.clasificacion,
      estado:          form.estado,
      avance_pct:      form.avance_pct,
      fecha_inicio:    form.fecha_inicio,
      fecha_fin:       form.fecha_fin,
      costo_est_anual: form.costo_est_anual,
      costo_ejec_anual:form.costo_ejec_anual,
      id_lider:        form.id_lider||null,
    })
    await load()
    // Actualiza el popup con los nuevos datos
    setPopup(p => p ? { ...p, ...form } : null)
  }

  if (loading||!data) return <PageLoader message="Cargando portafolio..."/>

  const { kpis, oficinasStats, proyectos } = data

  // Filtrado compuesto
  const filtrado = proyectos.filter(p => {
    if (filtroEst && p.estado!==filtroEst) return false
    if (filtroOf  && p.id_oficina!==filtroOf) return false
    if (buscar.trim()) {
      const q = buscar.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) &&
          !(p.lider_nombre||'').toLowerCase().includes(q) &&
          !(p.clasificacion||'').toLowerCase().includes(q) &&
          !(p.oficina_nombre||'').toLowerCase().includes(q)) return false
    }
    return true
  })

  const hayFiltro = filtroEst||filtroOf||buscar
  const clearAll  = () => { setFiltroEst(null); setFiltroOf(null); setBuscar('') }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:-.4 }}>Portafolio TI</h2>
          <p style={{ fontSize:12.5, color:'var(--t-muted)', marginTop:3 }}>
            {kpis.total} proyectos · 3 oficinas
            {hayFiltro && (
              <span> · <span style={{ color:'#6366F1', fontWeight:700 }}>
                {filtrado.length} mostrando
              </span></span>
            )}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {hayFiltro && (
            <button onClick={clearAll}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
                borderRadius:9, border:'1px solid rgba(99,102,241,.3)',
                background:'rgba(99,102,241,.07)', color:'#6366F1',
                fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
              <X size={12}/> Limpiar filtros
            </button>
          )}
          <button onClick={load} style={{ width:34, height:34, borderRadius:8,
            border:'1px solid var(--c-border)', background:'var(--c-surface)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--c-accent)' }}>
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* KPIs clicables */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10, marginBottom:18 }}>
        <KpiCard accent color='#6366F1' icon={<Briefcase size={15}/>}
          label="Total Proyectos" value={kpis.total}
          active={!filtroEst&&!filtroOf} onClick={clearAll}/>
        <KpiCard icon={<Play size={15}/>} color='#10B981' label="En ejecución"
          value={kpis.enEjecucion} sub="Activos"
          active={filtroEst==='activo'}
          onClick={()=>setFiltroEst(filtroEst==='activo'?null:'activo')}/>
        <KpiCard icon={<AlertCircle size={15}/>} color='#6B7280' label="Sin iniciar"
          value={kpis.sinIniciar}
          active={filtroEst==='sin_iniciar'}
          onClick={()=>setFiltroEst(filtroEst==='sin_iniciar'?null:'sin_iniciar')}/>
        <KpiCard icon={<Pause size={15}/>} color='#F97316' label="Suspendidos"
          value={kpis.suspendidos}
          active={filtroEst==='pausado'}
          onClick={()=>setFiltroEst(filtroEst==='pausado'?null:'pausado')}/>
        <KpiCard icon={<CheckCircle size={15}/>} color='#6366F1' label="Finalizados"
          value={kpis.finalizados}
          active={filtroEst==='cerrado'}
          onClick={()=>setFiltroEst(filtroEst==='cerrado'?null:'cerrado')}/>
        <KpiCard icon={<DollarSign size={15}/>} color='#6B7280' label="Costo est."
          value={fmtUSD(kpis.avgCostoEst)} sub="Promedio" onClick={null}/>
        <KpiCard icon={<TrendingUp size={15}/>} color='#10B981' label="Costo ejec."
          value={fmtUSD(kpis.avgCostoEjec)} sub="Promedio" onClick={null}/>
      </div>

      {/* Tarjetas oficinas clicables */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {oficinasStats.map(of=>(
          <TarjetaOficina key={of.id_oficina} of={of}
            active={filtroOf===of.id_oficina}
            onClick={()=>setFiltroOf(filtroOf===of.id_oficina?null:of.id_oficina)}/>
        ))}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:800 }}>
            Lista de proyectos ·{' '}
            <span style={{ fontWeight:400, color:'var(--t-muted)' }}>
              {hayFiltro
                ? `${filtrado.length} de ${kpis.total}`
                : 'Todas las oficinas'}
            </span>
          </div>
          {/* Buscador inline */}
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
              color:'var(--t-muted)', pointerEvents:'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input value={buscar} onChange={e=>setBuscar(e.target.value)}
              placeholder="Buscar proyecto…"
              style={{ padding:'7px 12px 7px 30px', borderRadius:9, width:200,
                border:'1px solid var(--c-border)', background:'var(--c-surface2)',
                fontSize:12.5, color:'var(--t-primary)', fontFamily:'inherit', outline:'none' }}/>
            {buscar&&(
              <button onClick={()=>setBuscar('')}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                  width:18, height:18, borderRadius:'50%', border:'none',
                  background:'var(--c-border)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
                <X size={9}/>
              </button>
            )}
          </div>
        </div>
        <TablaProyectos proyectos={filtrado} onClickProyecto={setPopup} onUpdateInline={handleUpdateInline}/>
        <div style={{ fontSize:11.5, color:'var(--t-muted)', marginTop:8, textAlign:'right' }}>
          {filtrado.length} proyecto{filtrado.length!==1?'s':''} · Clic en "Ver" o en el nombre para editar
        </div>
      </div>

      {/* Popup de detalle + edición */}
      {popup && (
        <PopupProyecto
          proyecto={popup}
          empleados={empleados}
          onGuardar={handleGuardar}
          onClose={()=>setPopup(null)}
        />
      )}
    </div>
  )
}
