/**
 * Aprobaciones.jsx — v3
 * Botones compactos (solo icono ✅ ❌) en sprint/semana/día
 * Histórico organizado por especialista
 */
import './Aprobaciones.css'
import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, ChevronUp, RefreshCw,
  CheckCircle, XCircle, History, Clock, Users,
} from 'lucide-react'
import { api }       from '../../lib/apiClient'
import { PageLoader }from '../../components/ui/Spinner'

const MODEL_COLOR = {
  RUN:'#3E5D9D', BUILD:'#30693B', ADMIN:'#D65830', GROW:'#4554A1', OFF:'#992C26',
}
function fmtM(m) {
  if (!m) return '0h'
  const h=Math.floor(m/60), r=m%60
  if(!h)return`${r}m`;if(!r)return`${h}h`;return`${h}h ${r}m`
}
function capColor(p) { return p>=80?'#30693B':p>=50?'#D65830':'#992C26' }

function Badge({ accion }) {
  const C = {
    aprobado: ['rgba(48,105,59,.12)','#30693B','✓ Aprobado'],
    rechazado:['rgba(153,44,38,.12)','#992C26','✕ Rechazado'],
    reabierto:['rgba(214,88,48,.12)','#D65830','↺ Reabierto'],
    enviado:  ['rgba(62,93,157,.12)','#3E5D9D','→ Enviado'],
  }[accion] ?? ['var(--c-surface2)','var(--t-muted)', accion]
  return <span style={{padding:'2px 8px',borderRadius:99,fontSize:10.5,fontWeight:700,
    background:C[0],color:C[1]}}>{C[2]}</span>
}

// ── Modal rechazo ─────────────────────────────────────────────────────────
function ModalRechazo({ info, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState('')
  const [busy,   setBusy]   = useState(false)
  if (!info) return null
  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e=>e.stopPropagation()}>
        <div className="ap-modal-title">❌ Rechazar {info.nivel}</div>
        <div className="ap-modal-sub">
          {info.desc} — el especialista podrá corregir y reenviar.
        </div>
        <textarea autoFocus value={motivo} onChange={e=>setMotivo(e.target.value)}
          placeholder="Motivo del rechazo (obligatorio)..." rows={4}
          className="ap-modal-textarea" />
        <div className="ap-modal-btns">
          <button onClick={onClose} className="ap-modal-cancel">Cancelar</button>
          <button disabled={!motivo.trim()||busy}
            onClick={async()=>{if(!motivo.trim()||busy)return;setBusy(true);await onConfirm(motivo);setBusy(false);onClose()}}
            className="ap-modal-confirm" style={{opacity:!motivo.trim()||busy?.5:1}}>
            {busy?'Rechazando...':'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Botones icono compactos ✅ ❌ ─────────────────────────────────────────
function IcoAccion({ onAprobar, onRechazar, loadingKey, myKey }) {
  const busy = loadingKey === myKey
  return (
    <div className="ap-ico-btns" onClick={e=>e.stopPropagation()}>
      <button title="Rechazar" onClick={onRechazar} disabled={busy}
        className="ap-ico-reject" style={{opacity:busy?.5:1}}>❌</button>
      <button title="Aprobar" onClick={onAprobar} disabled={busy}
        className="ap-ico-approve" style={{opacity:busy?.5:1}}>✅</button>
    </div>
  )
}

// ── Botón "Aprobar todo" del especialista ─────────────────────────────────
function AprobTodo({ onClick, busy }) {
  return (
    <button onClick={e=>{e.stopPropagation();onClick()}} disabled={busy}
      className="ap-aprob-todo" style={{cursor:busy?'not-allowed':'pointer',opacity:busy?.6:1}}>
      ✅ Aprobar todo
    </button>
  )
}

// ── Fila DÍA ──────────────────────────────────────────────────────────────
function DiaRow({ dia, onAprobar, onRechazar, loadingKey }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ap-dia-card">
      <div onClick={()=>setOpen(o=>!o)} className="ap-dia-hdr"
        style={{background:open?'var(--c-surface2)':'var(--c-surface)'}}>
        {open?<ChevronUp size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>
             :<ChevronDown size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        <span className="ap-dia-label">{dia.label}</span>
        <span className="ap-dia-count">{dia.actividades.length} act.</span>
        <div className="ap-dia-models">
          {Object.entries(dia.actividades.reduce((acc,a)=>{acc[a.modelo]=(acc[a.modelo]||0)+a.mins;return acc},{}))
            .map(([m,mins])=>(
              <span key={m} style={{fontSize:9,fontWeight:800,color:MODEL_COLOR[m]}}>
                {m} {Math.round(mins/(dia.totalMins||1)*100)}%
              </span>
            ))}
        </div>
        <span className="ap-dia-mins" style={{color:capColor(dia.capacityPct)}}>
          {dia.capacityPct}% · {fmtM(dia.totalMins)}
        </span>
        <IcoAccion
          myKey={`d-${dia.idRegistro}`} loadingKey={loadingKey}
          onAprobar={()=>onAprobar([dia.idRegistro],`d-${dia.idRegistro}`)}
          onRechazar={()=>onRechazar({nivel:'jornada',desc:`Jornada del ${dia.fecha}`,ids:[dia.idRegistro]})}
        />
      </div>
      {open && (
        <div className="ap-dia-body">
          {dia.actividades.map((a,i)=>(
            <div key={i} className="ap-act-row">
              <span className="ap-act-model"
                style={{background:`${MODEL_COLOR[a.modelo]}15`,color:MODEL_COLOR[a.modelo]}}>{a.modelo}</span>
              <span className="ap-act-name">{a.nombre}</span>
              <span className="ap-act-cat">{a.cat}</span>
              {a.desc&&<span className="ap-act-desc">{a.desc}</span>}
              <span className="ap-act-mins">{fmtM(a.mins)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fila SEMANA ───────────────────────────────────────────────────────────
function SemanaRow({ sem, idEsp, onAprobar, onRechazar, loadingKey }) {
  const [open, setOpen] = useState(false)
  const ids = sem.dias.map(d=>d.idRegistro)
  return (
    <div className="ap-sem-card">
      <div onClick={()=>setOpen(o=>!o)} className="ap-sem-hdr"
        style={{background:open?'rgba(51,40,154,.04)':'var(--c-surface)'}}>
        {open?<ChevronUp size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>
             :<ChevronDown size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        <span className="ap-sem-label">{sem.label}</span>
        <span className="ap-sem-count">{sem.dias.length} día(s)</span>
        <span className="ap-sem-mins" style={{color:capColor(sem.capacityPct)}}>
          {sem.capacityPct}% · {fmtM(sem.totalMins)}
        </span>
        <IcoAccion
          myKey={`s-${idEsp}-${sem.numero}`} loadingKey={loadingKey}
          onAprobar={()=>onAprobar(ids,`s-${idEsp}-${sem.numero}`)}
          onRechazar={()=>onRechazar({nivel:'semana',desc:`Semana ${sem.numero} (${ids.length} jornadas)`,ids})}
        />
      </div>
      {open && (
        <div className="ap-sem-body">
          {sem.dias.map(d=>(
            <DiaRow key={d.idRegistro} dia={d} onAprobar={onAprobar} onRechazar={onRechazar} loadingKey={loadingKey}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fila SPRINT ───────────────────────────────────────────────────────────
function SprintRow({ sp, idEsp, onAprobar, onRechazar, loadingKey }) {
  const [open, setOpen] = useState(true)
  const ids = sp.semanas.flatMap(s=>s.dias.map(d=>d.idRegistro))
  return (
    <div className="ap-sp-card">
      <div onClick={()=>setOpen(o=>!o)} className="ap-sp-hdr"
        style={{background:open?'rgba(51,40,154,.06)':'var(--c-surface)'}}>
        {open?<ChevronUp size={13} style={{color:'var(--t-muted)',flexShrink:0}}/>
             :<ChevronDown size={13} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        <span className="ap-sp-label">{sp.nombre}</span>
        <span className="ap-sp-count">{sp.semanas.length} semana(s)</span>
        <span className="ap-sp-mins" style={{color:capColor(sp.capacityPct)}}>
          {sp.capacityPct}% · {fmtM(sp.totalMins)}
        </span>
        <IcoAccion
          myKey={`sp-${idEsp}-${sp.id}`} loadingKey={loadingKey}
          onAprobar={()=>onAprobar(ids,`sp-${idEsp}-${sp.id}`)}
          onRechazar={()=>onRechazar({nivel:'sprint',desc:`${sp.nombre} (${ids.length} jornadas)`,ids})}
        />
      </div>
      {open && (
        <div className="ap-sp-body">
          {sp.semanas.map((sem,i)=>(
            <SemanaRow key={i} sem={sem} idEsp={idEsp} onAprobar={onAprobar} onRechazar={onRechazar} loadingKey={loadingKey}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tarjeta ESPECIALISTA ──────────────────────────────────────────────────
function EspCard({ esp, onAprobar, onRechazar, loadingKey }) {
  const [open, setOpen] = useState(false)
  const init = esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')
  const ids  = esp.sprints.flatMap(sp=>sp.semanas.flatMap(s=>s.dias.map(d=>d.idRegistro)))
  return (
    <div className="ap-esp-card" style={{boxShadow:open?'var(--s-md)':'none'}}>
      <div onClick={()=>setOpen(o=>!o)} className="ap-esp-hdr"
        style={{background:open?'linear-gradient(135deg,rgba(51,40,154,.07),rgba(51,40,154,.03))':'var(--c-surface)'}}>
        <div style={{width:44,height:44,borderRadius:12,background:`${capColor(esp.capacityPct)}18`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,
          color:capColor(esp.capacityPct),flexShrink:0}}>{init}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="ap-esp-name">{esp.nombre}</div>
          <div className="ap-esp-role">{esp.oficio}</div>
        </div>
        <div className="ap-esp-cap">
          <div className="ap-esp-pct" style={{color:capColor(esp.capacityPct)}}>{esp.capacityPct}%</div>
          <div className="ap-esp-meta">{fmtM(esp.totalMins)} · {esp.totalDias} día(s)</div>
        </div>
        <div className="ap-esp-actions" onClick={e=>e.stopPropagation()}>
          <AprobTodo busy={loadingKey===`esp-${esp.id}`} onClick={()=>onAprobar(ids,`esp-${esp.id}`)} />
          <div onClick={e=>{e.stopPropagation();setOpen(o=>!o)}} className="ap-esp-chevron">
            {open?<ChevronUp size={16} style={{color:'var(--t-muted)'}}/>:<ChevronDown size={16} style={{color:'var(--t-muted)'}}/>}
          </div>
        </div>
      </div>
      {open && (
        <div className="ap-esp-body">
          {esp.sprints.map(sp=>(
            <SprintRow key={sp.id} sp={sp} idEsp={esp.id}
              onAprobar={onAprobar} onRechazar={onRechazar} loadingKey={loadingKey}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Histórico organizado por especialista ─────────────────────────────────
function HistoricoJefe() {
  const [data,        setData]    = useState([])
  const [loading,     setLoading] = useState(true)
  const [loadingMore, setLoadMore]= useState(false)
  const [pagination,  setPagination] = useState(null)
  const [offset,      setOffset]  = useState(0)
  const [openEsp,     setOpenEsp] = useState({})

  const LIMIT = 3

  const load = useCallback(async (currentOffset = 0, append = false) => {
    if (append) setLoadMore(true); else setLoading(true)
    try {
      const r = await api.get(`/approvals/historico?limit=${LIMIT}&offset=${currentOffset}`)
      setData(prev => append ? [...prev, ...(r.data ?? [])] : (r.data ?? []))
      setPagination(r.pagination ?? null)
    } catch (e) { console.error(e) }
    finally { if (append) setLoadMore(false); else setLoading(false) }
  }, [])

  const cargarMas = useCallback(() => {
    const next = offset + LIMIT
    setOffset(next)
    load(next, true)
  }, [offset, load])

  useEffect(() => { load(0, false) }, [])

  if (loading) return <PageLoader message="Cargando histórico..." />
  if (!data.length) return (
    <div className="ap-hist-empty">Sin actividades aprobadas o rechazadas aún</div>
  )

  return (
    <div className="ap-hist-list">
      {data.map((esp)=>(
        <div key={esp.id} className="ap-hist-card">
          <button onClick={()=>setOpenEsp(p=>({...p,[esp.id]:!p[esp.id]}))}
            className="ap-hist-btn"
            style={{background:openEsp[esp.id]?'rgba(51,40,154,.05)':'var(--c-surface)'}}>
            <div style={{width:40,height:40,borderRadius:11,background:'rgba(51,40,154,.1)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,
              color:'var(--c-accent)',flexShrink:0}}>
              {esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
            </div>
            <div style={{flex:1}}>
              <div className="ap-hist-name">{esp.nombre}</div>
              <div className="ap-hist-role">{esp.oficio}</div>
            </div>
            <span className="ap-hist-count">{esp.registros.length} jornada(s)</span>
            {openEsp[esp.id]?<ChevronUp size={14} style={{color:'var(--t-muted)',flexShrink:0}}/>
                            :<ChevronDown size={14} style={{color:'var(--t-muted)',flexShrink:0}}/>}
          </button>

          {openEsp[esp.id] && (
            <div className="ap-hist-body">
              {esp.registros.map(rd=>(
                <div key={rd.idRegistro} className="ap-reg-card">
                  <div className="ap-reg-hdr">
                    <span className="ap-reg-date">{rd.fecha}</span>
                    <span className="ap-reg-sprint">{rd.sprintNombre} · Sem. {rd.semana}</span>
                    <span className="ap-reg-mins">{fmtM(rd.totalMins)}</span>
                    <Badge accion={rd.estadoActual}/>
                  </div>
                  <div className="ap-timeline">
                    {rd.historial.map((h,i)=>(
                      <div key={i} className="ap-tl-row">
                        <div className="ap-tl-icon"
                          style={{background:h.accion==='aprobado'?'rgba(48,105,59,.12)':'rgba(153,44,38,.12)',
                            color:h.accion==='aprobado'?'#30693B':'#992C26'}}>
                          {h.accion==='aprobado'?<CheckCircle size={12}/>:<XCircle size={12}/>}
                        </div>
                        <div className="ap-tl-body">
                          <div className="ap-tl-meta">
                            <Badge accion={h.accion}/>
                            <span className="ap-tl-by">por {h.revisor}</span>
                            <span className="ap-tl-date">
                              {h.fecha?new Date(h.fecha).toLocaleString('es-CO',
                                {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}
                            </span>
                          </div>
                          {h.comentario && (
                            <div className="ap-tl-comment"
                              style={{background:h.accion==='rechazado'?'rgba(153,44,38,.06)':'rgba(48,105,59,.06)'}}>
                              "{h.comentario}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {pagination?.hasMore && (
        <div className="ap-load-more">
          <button onClick={cargarMas} disabled={loadingMore} className="ap-load-btn"
            style={{cursor:loadingMore?'wait':'pointer'}}>
            {loadingMore ? 'Cargando...' : `Cargar más (${pagination.total - data.length} sprints restantes)`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────
export default function Aprobaciones() {
  const [tab,        setTab]       = useState('pendientes')
  const [data,       setData]      = useState([])
  const [loading,    setLoading]   = useState(true)
  const [loadingKey, setKey]       = useState(null)
  const [modal,      setModal]     = useState(null)

  const load = useCallback(async ()=>{
    setLoading(true)
    try { const r=await api.get('/approvals/pendientes'); setData(r.data??[]) }
    catch(e){ console.error(e) }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[])

  const doAprobar = async (ids, key) => {
    setKey(key)
    try { await Promise.all(ids.map(id=>api.post(`/approvals/registro/${id}/aprobar`))); await load() }
    catch(e){ console.error(e) }
    finally { setKey(null) }
  }
  const doRechazar = async (motivo) => {
    if (!modal) return
    setKey(`rej-${modal.ids.join('-')}`)
    try { await Promise.all(modal.ids.map(id=>api.post(`/approvals/registro/${id}/rechazar`,{comentario:motivo}))); await load() }
    catch(e){ console.error(e) }
    finally { setKey(null) }
  }

  const total = data.reduce((s,e)=>s+e.totalDias,0)

  return (
    <div>
      <div className="ap-page-hdr">
        <div>
          <h2 className="ap-title">Aprobaciones</h2>
          <p className="ap-subtitle">Gestión de jornadas del equipo</p>
        </div>
        <button onClick={load} className="ap-refresh-btn">
          <RefreshCw size={13}/> Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="ap-tabs">
        {[
          {k:'pendientes',l:'Pendientes',i:<Clock size={13}/>},
          {k:'historico', l:'Histórico', i:<History size={13}/>},
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`ap-tab ${tab===t.k?'ap-tab--on':'ap-tab--off'}`}>
            {t.i} {t.l}
            {t.k==='pendientes'&&total>0&&(
              <span className="ap-tab-count">{total}</span>
            )}
          </button>
        ))}
      </div>

      {tab==='pendientes' && (
        loading ? <PageLoader message="Cargando pendientes..."/> :
        data.length===0 ? (
          <div className="ap-empty">
            <CheckCircle size={52} style={{color:'#30693B',opacity:.35,margin:'0 auto 14px',display:'block'}}/>
            <div className="ap-empty-text">¡Todo al día!</div>
            <div className="ap-empty-sub">No hay jornadas pendientes de aprobación</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {data.map(esp=>(
              <EspCard key={esp.id} esp={esp} loadingKey={loadingKey}
                onAprobar={doAprobar}
                onRechazar={info=>setModal(info)}/>
            ))}
          </div>
        )
      )}

      {tab==='historico' && <HistoricoJefe/>}

      {modal && (
        <ModalRechazo info={modal} onConfirm={doRechazar} onClose={()=>setModal(null)}/>
      )}
    </div>
  )
}
