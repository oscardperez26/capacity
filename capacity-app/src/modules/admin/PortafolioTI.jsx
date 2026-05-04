/**
 * PortafolioTI.jsx — v3
 * Tabla estilo referencia + popup de detalle con edición completa +
 * confirmación de cambios + registro en auditoría
 */
import './PortafolioTI.css'
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

// bg/color inline — derivados de ESTADOS y TIPO_PROY_COLS (datos)
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
// KPI CARD — todo inline (bg/border/shadow/transform dependen de hov + active + color/accent)
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, accent, active, onClick }) {
  const [hov, setHov] = useState(false)
  const on = active || hov
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
// TARJETA DE OFICINA — todo inline (color = of.color, dinámico)
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

// Textarea aislado — actualiza el padre solo al perder el foco
function DescTextarea({ initial, onCommit }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && ref.current.value !== initial) {
      ref.current.value = initial
    }
  }, [initial])
  return (
    <textarea
      ref={ref}
      className="pt-inp"
      defaultValue={initial}
      rows={4}
      onFocus={e => { e.target.style.borderColor = '#6366F1' }}
      onBlur={e => { onCommit(e.target.value); e.target.style.borderColor = 'var(--c-border)' }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POPUP DETALLE + EDICIÓN
// ─────────────────────────────────────────────────────────────────────────────
function PopupProyecto({ proyecto: pOrig, empleados, onGuardar, onClose }) {
  const [form,     setForm]     = useState({ ...pOrig })
  const [dirty,    setDirty]    = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [closeReq, setCloseReq] = useState(false)

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

  // Wrapper de campo con label — usa CSS classes en lugar de const lbl/inp
  const F = ({ label, children, span2 }) => (
    <div className={span2 ? 'pt-ff-span2' : ''}>
      <label className="pt-lbl">{label}</label>{children}
    </div>
  )

  return (
    <>
      {/* Overlay principal */}
      <div className="pt-popup-overlay" onClick={handleClose}>
        <div className="pt-popup" onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div className="pt-popup-hdr"
            style={{ background:`linear-gradient(135deg,${ofCol}08,transparent)` }}>
            <div className="pt-popup-hdr-l">
              <div className="pt-popup-badges">
                <div className="pt-popup-stripe" style={{ background:ofCol }}/>
                <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                  background:`${ofCol}18`, color:ofCol }}>{pOrig.oficina_nombre||'Oficina'}</span>
                <TipoBadge tipo={pOrig.tipo_proyecto}/>
                <EstBadge estado={pOrig.estado}/>
              </div>
              <div className="pt-popup-name">{pOrig.nombre}</div>
              {pOrig.lider_nombre && (
                <div className="pt-popup-lider">
                  Responsable: <strong style={{ color:'var(--t-secondary)' }}>{pOrig.lider_nombre}</strong>
                </div>
              )}
            </div>
            <div className="pt-popup-hdr-r">
              {saved && (
                <div className="pt-popup-saved"><CheckCircle size={13}/> Guardado</div>
              )}
              {dirty && !saved && (
                <button className="pt-popup-save-btn" onClick={()=>setConfirm(true)} disabled={busy}>
                  <Save size={14}/> Guardar cambios
                </button>
              )}
              <button className="pt-popup-close-btn" onClick={handleClose}>
                <X size={15}/>
              </button>
            </div>
          </div>

          {/* Avance */}
          <div className="pt-popup-avance">
            <div className="pt-popup-av-track">
              <div style={{ height:'100%', width:`${avPct}%`, background:avCol,
                borderRadius:99, transition:'width .4s' }}/>
            </div>
            <div className="pt-popup-av-num-wrap">
              <input
                type="number" min="0" max="100"
                value={avPct}
                onChange={e => set('avance_pct', Math.min(100, Math.max(0, parseInt(e.target.value)||0)))}
                style={{ width:64, fontSize:18, fontWeight:900, textAlign:'center',
                  padding:'6px 8px', borderRadius:10,
                  border:`2px solid ${avCol}`, background:'var(--c-surface)',
                  color:avCol, fontFamily:'JetBrains Mono, monospace', outline:'none' }}
              />
              <span className="pt-popup-av-pct-sign" style={{ color:avCol }}>%</span>
            </div>
          </div>

          {/* Formulario */}
          <div className="pt-popup-body">
            <div className="pt-popup-form-grid">

              <F label="Nombre del proyecto" span2>
                <input className="pt-inp" value={form.nombre||''} onChange={e=>set('nombre',e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Estado">
                <select className="pt-inp" value={form.estado||'sin_iniciar'} onChange={e=>set('estado',e.target.value)}>
                  <option value="sin_iniciar">Sin iniciar</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Suspendido</option>
                  <option value="cerrado">Finalizado</option>
                </select>
              </F>

              <F label="Responsable">
                <select className="pt-inp" value={form.id_lider||''} onChange={e=>set('id_lider',e.target.value||null)}>
                  <option value="">Sin asignar</option>
                  {empleados.map(e=>(
                    <option key={e.id_empleado} value={e.id_empleado}>
                      {e.nombre}{e.oficio?` — ${e.oficio.substring(0,35)}`:''}
                    </option>
                  ))}
                </select>
              </F>

              <F label="Tipo de proyecto">
                <select className="pt-inp" value={form.tipo_proyecto||'proyecto'} onChange={e=>set('tipo_proyecto',e.target.value)}>
                  <option value="proyecto">Proyecto</option>
                  <option value="programa">Programa</option>
                  <option value="iniciativa">Iniciativa</option>
                  <option value="servicio">Servicio</option>
                </select>
              </F>

              <F label="Clasificación">
                <select className="pt-inp" value={form.clasificacion||'estrategico'} onChange={e=>set('clasificacion',e.target.value)}>
                  <option value="estrategico">Estratégico</option>
                  <option value="operativo">Operativo</option>
                  <option value="innovacion">Innovación</option>
                  <option value="continuidad_operativa">Continuidad Operativa</option>
                </select>
              </F>

              <F label="Tipo">
                <select className="pt-inp" value={form.tipo||'estrategico'} onChange={e=>set('tipo',e.target.value)}>
                  <option value="estrategico">Estratégico</option>
                  <option value="operativo">Operativo</option>
                  <option value="innovacion">Innovación</option>
                  <option value="continuidad_operativa">Continuidad Operativa</option>
                </select>
              </F>

              <F label="Fecha inicio">
                <input type="date" className="pt-inp" value={form.fecha_inicio||''} onChange={e=>set('fecha_inicio',e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Fecha fin">
                <input type="date" className="pt-inp" value={form.fecha_fin||''} min={form.fecha_inicio||''}
                  onChange={e=>set('fecha_fin',e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Costo estimado anual ($)">
                <input type="number" className="pt-inp" value={form.costo_est_anual||''} min="0"
                  onChange={e=>set('costo_est_anual',parseFloat(e.target.value)||0)}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Costo ejecución anual ($)">
                <input type="number" className="pt-inp" value={form.costo_ejec_anual||''} min="0"
                  onChange={e=>set('costo_ejec_anual',parseFloat(e.target.value)||0)}
                  onFocus={e=>e.target.style.borderColor='#6366F1'}
                  onBlur={e=>e.target.style.borderColor='var(--c-border)'}/>
              </F>

              <F label="Descripción" span2>
                <DescTextarea
                  key={pOrig.id_proyecto}
                  initial={form.descripcion||''}
                  onCommit={v=>set('descripcion',v)}
                />
              </F>
            </div>

            {dirty && (
              <div className="pt-dirty-bar">
                <div className="pt-dirty-msg">✏️ Cambios pendientes: {changedFields().join(', ')}</div>
                <button className="pt-dirty-save" onClick={()=>setConfirm(true)} disabled={busy}>
                  <Save size={13}/> Guardar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmación de guardado */}
      {confirm && (
        <div className="pt-modal-overlay">
          <div className="pt-modal pt-modal-lg">
            <div className="pt-modal-hdr">
              <div className="pt-modal-icon"><Save size={20} style={{ color:'#6366F1' }}/></div>
              <div>
                <div className="pt-modal-title">¿Guardar cambios?</div>
                <div className="pt-modal-sub">Esta acción quedará registrada en auditoría</div>
              </div>
            </div>
            <div className="pt-modal-fields">
              <div className="pt-modal-f-lbl">Campos modificados</div>
              <div className="pt-modal-f-tags">
                {changedFields().map(f=>(
                  <span key={f} className="pt-modal-f-tag">{f}</span>
                ))}
                {changedFields().length===0 && (
                  <span className="pt-modal-f-none">Sin cambios detectados</span>
                )}
              </div>
            </div>
            <div className="pt-modal-acts">
              <button className="pt-modal-cancel" onClick={()=>setConfirm(false)}>Revisar</button>
              <button className="pt-modal-confirm" onClick={handleSave}
                disabled={busy||changedFields().length===0}>
                <Check size={14}/>{busy?'Guardando...':'Confirmar y guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cierre con cambios sin guardar */}
      {closeReq && (
        <div className="pt-modal-overlay">
          <div className="pt-modal pt-modal-sm">
            <div className="pt-modal-warn-title">⚠️ Cambios sin guardar</div>
            <div className="pt-modal-warn-body">
              Tienes cambios que no se han guardado. ¿Qué deseas hacer?
            </div>
            <div className="pt-modal-sm-acts">
              <button className="pt-modal-keep" onClick={()=>setCloseReq(false)}>Seguir editando</button>
              <button className="pt-modal-exit" onClick={onClose}>Salir sin guardar</button>
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
    <div ref={ref} className="pt-iesta-wrap">
      <button className="pt-iesta-btn" onClick={()=>setOpen(o=>!o)} disabled={busy}
        style={{ background:e.bg, color:e.color, border:`1px solid ${e.color}40` }}>
        {busy ? '…' : e.label}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="pt-iesta-dropdown">
          {Object.entries(ESTADOS).map(([k,v])=>(
            <button key={k} className="pt-iesta-option"
              onClick={()=>handle(k)}
              style={{ background: estado===k?`${v.color}10`:'transparent', color:v.color }}
              onMouseEnter={e=>{ if(estado!==k) e.currentTarget.style.background=`${v.color}08` }}
              onMouseLeave={e=>{ if(estado!==k) e.currentTarget.style.background='transparent' }}>
              <span className="pt-iesta-dot" style={{ background:v.color }}/>
              {v.label}
              {estado===k && <span className="pt-iesta-check">✓</span>}
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
    <div className="pt-iav-wrap">
      <div className="pt-iav-track">
        <div style={{ height:'100%', width:`${val}%`, background:avCol,
          borderRadius:99, transition:'width .4s' }}/>
      </div>
      {editing ? (
        <input ref={inputRef} className="pt-iav-inp" type="number" min="0" max="100"
          defaultValue={val}
          style={{ border:`1.5px solid ${avCol}`, background:'var(--c-surface)', color:avCol }}
          onBlur={e=>commit(e.target.value)}
          onKeyDown={e=>{
            if (e.key==='Enter') commit(e.target.value)
            if (e.key==='Escape') { setVal(avance); setEditing(false) }
          }}/>
      ) : (
        <span className="pt-iav-num" onClick={()=>setEditing(true)} title="Clic para editar"
          style={{ color:avCol }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=avCol+'60'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
          {busy ? '…' : `${val}%`}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLA DE PROYECTOS
// ─────────────────────────────────────────────────────────────────────────────
function TablaProyectos({ proyectos, onClickProyecto, onUpdateInline }) {
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
    <th className={`pt-th ${center ? 'pt-th-center' : ''}`}
      style={{ width: col ? colW[col] : undefined }}>
      {children}
      {col && (
        <div className="pt-col-resize" onMouseDown={e=>onMouseDown(col,e)}
          title="Arrastrar para ajustar ancho">
          <div className="pt-col-resize-line"/>
        </div>
      )}
    </th>
  )

  return (
    <div className="pt-tbl-wrap">
      <table className="pt-tbl">
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
            <tr><td colSpan={12} className="pt-tbl-empty">
              Sin proyectos con los filtros actuales
            </td></tr>
          )}
          {proyectos.map((p, i) => {
            const ofCol  = p.oficina_color || '#888'
            const avPct  = p.avance_pct||0
            const rowBg  = i%2===0 ? 'var(--c-surface)' : 'rgba(0,0,0,.012)'
            return (
              <tr key={p.id_proyecto}
                style={{ background:rowBg, borderBottom:'1px solid var(--c-border)',
                  transition:'background .1s', borderLeft:`3px solid ${ofCol}` }}
                onMouseEnter={e=>e.currentTarget.style.background=`${ofCol}07`}
                onMouseLeave={e=>e.currentTarget.style.background=rowBg}>

                <td className="pt-td">
                  <span style={{ padding:'2px 8px', borderRadius:5, fontSize:10, fontWeight:800,
                    background:`${ofCol}20`, color:ofCol }}>
                    {(p.oficina_nombre||'').toUpperCase().replace('PROYECTOS TI','PROY TI').slice(0,6)}
                  </span>
                </td>

                <td className="pt-td"><TipoBadge tipo={p.tipo_proyecto}/></td>

                <td className="pt-td" style={{ maxWidth:colW.nombre, width:colW.nombre }}>
                  <div className="pt-proj-name"
                    onMouseEnter={e=>e.target.style.color=ofCol}
                    onMouseLeave={e=>e.target.style.color='var(--t-primary)'}
                    onClick={()=>onClickProyecto(p)}>
                    {p.nombre}
                  </div>
                  {p.descripcion&&(
                    <div className="pt-proj-desc">{p.descripcion}</div>
                  )}
                </td>

                <td className="pt-td">
                  <span className="pt-clasif">{(p.clasificacion||'—').replace('_',' ')}</span>
                </td>

                <td className="pt-td-mono" style={{ color:'#10B981' }}>{fmtFechaCorta(p.fecha_inicio)}</td>
                <td className="pt-td-mono" style={{ color:'#F97316' }}>{fmtFechaCorta(p.fecha_fin)}</td>

                <td className="pt-td-estado">
                  <InlineEstado estado={p.estado}
                    onChange={async (nuevoEstado) => {
                      await onUpdateInline(p.id_proyecto, { estado: nuevoEstado })
                    }}/>
                </td>

                <td className="pt-td-avance">
                  <InlineAvance avance={avPct}
                    onChange={async (v) => {
                      await onUpdateInline(p.id_proyecto, { avance_pct: v })
                    }}/>
                </td>

                <td className="pt-td-mono" style={{ color:'#6B7280' }}>{fmtUSD(p.costo_est_anual)}</td>
                <td className="pt-td-mono" style={{ color:'#10B981' }}>{fmtUSD(p.costo_ejec_anual)}</td>

                <td className="pt-td">
                  {p.lider_nombre
                    ? <span className="pt-resp-name">{p.lider_nombre}</span>
                    : <span className="pt-resp-none">—</span>}
                </td>

                <td className="pt-td-center">
                  <div className="pt-acc-wrap">
                    <button className="pt-btn-ver" onClick={()=>onClickProyecto(p)}
                      style={{ border:`1px solid ${ofCol}40`, background:`${ofCol}0a`, color:ofCol }}
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
  const [popup,      setPopup]      = useState(null)

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

  const handleUpdateInline = useCallback(async (idProyecto, campos) => {
    await api.patch(`/admin-global/portafolio/${idProyecto}`, campos)
    setData(d => {
      if (!d) return d
      const proyectos = d.proyectos.map(p =>
        p.id_proyecto === idProyecto ? { ...p, ...campos } : p
      )
      return { ...d, proyectos }
    })
  }, [])

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
    setPopup(p => p ? { ...p, ...form } : null)
  }

  if (loading||!data) return <PageLoader message="Cargando portafolio..."/>

  const { kpis, oficinasStats, proyectos } = data

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
      <div className="pt-page-hdr">
        <div>
          <h2 className="pt-page-title">Portafolio TI</h2>
          <p className="pt-page-sub">
            {kpis.total} proyectos · 3 oficinas
            {hayFiltro && (
              <span> · <span style={{ color:'#6366F1', fontWeight:700 }}>
                {filtrado.length} mostrando
              </span></span>
            )}
          </p>
        </div>
        <div className="pt-hdr-acts">
          {hayFiltro && (
            <button className="pt-clear-btn" onClick={clearAll}>
              <X size={12}/> Limpiar filtros
            </button>
          )}
          <button className="pt-refresh-btn" onClick={load}><RefreshCw size={14}/></button>
        </div>
      </div>

      {/* KPIs clicables */}
      <div className="pt-kpi-grid">
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

      {/* Tarjetas oficinas */}
      <div className="pt-offices-grid">
        {oficinasStats.map(of=>(
          <TarjetaOficina key={of.id_oficina} of={of}
            active={filtroOf===of.id_oficina}
            onClick={()=>setFiltroOf(filtroOf===of.id_oficina?null:of.id_oficina)}/>
        ))}
      </div>

      {/* Tabla */}
      <div className="card pt-table-card">
        <div className="pt-table-hdr">
          <div className="pt-table-lbl">
            Lista de proyectos ·{' '}
            <span className="pt-table-lbl-sub">
              {hayFiltro ? `${filtrado.length} de ${kpis.total}` : 'Todas las oficinas'}
            </span>
          </div>
          <div className="pt-search-wrap">
            <div className="pt-search-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input className="pt-search-inp" value={buscar} onChange={e=>setBuscar(e.target.value)}
              placeholder="Buscar proyecto…"/>
            {buscar&&(
              <button className="pt-search-clear" onClick={()=>setBuscar('')}>
                <X size={9}/>
              </button>
            )}
          </div>
        </div>
        <TablaProyectos proyectos={filtrado} onClickProyecto={setPopup} onUpdateInline={handleUpdateInline}/>
        <div className="pt-table-foot">
          {filtrado.length} proyecto{filtrado.length!==1?'s':''} · Clic en "Ver" o en el nombre para editar
        </div>
      </div>

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
