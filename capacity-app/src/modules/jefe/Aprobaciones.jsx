/**
 * Aprobaciones.jsx — v3
 * Botones compactos (solo icono ✅ ❌) en sprint/semana/día
 * Histórico organizado por especialista
 */
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
    <div style={{position:'fixed',inset:0,zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',
      background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:'var(--c-surface)',borderRadius:16,padding:24,maxWidth:420,width:'100%',margin:'0 16px',
        boxShadow:'var(--s-xl)',border:'1px solid var(--c-border)'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>❌ Rechazar {info.nivel}</div>
        <div style={{fontSize:12,color:'var(--t-muted)',marginBottom:14}}>
          {info.desc} — el especialista podrá corregir y reenviar.
        </div>
        <textarea autoFocus value={motivo} onChange={e=>setMotivo(e.target.value)}
          placeholder="Motivo del rechazo (obligatorio)..." rows={4}
          style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid var(--c-border2)',
            background:'var(--c-surface2)',fontSize:13,resize:'vertical',fontFamily:'inherit',color:'var(--t-primary)'}} />
        <div style={{display:'flex',gap:10,marginTop:12}}>
          <button onClick={onClose} style={{flex:1,padding:'9px',borderRadius:9,border:'1px solid var(--c-border)',
            background:'var(--c-surface2)',fontSize:13,fontWeight:700,cursor:'pointer',color:'var(--t-secondary)'}}>
            Cancelar
          </button>
          <button disabled={!motivo.trim()||busy}
            onClick={async()=>{if(!motivo.trim()||busy)return;setBusy(true);await onConfirm(motivo);setBusy(false);onClose()}}
            style={{flex:1,padding:'9px',borderRadius:9,border:'none',fontSize:13,fontWeight:700,cursor:'pointer',
              background:'#992C26',color:'white',opacity:!motivo.trim()||busy?.5:1}}>
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
    <div style={{display:'flex',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
      <button title="Rechazar" onClick={onRechazar} disabled={busy}
        style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(153,44,38,.25)',
          background:'rgba(153,44,38,.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
          opacity:busy?.5:1,fontSize:14}}>
        ❌
      </button>
      <button title="Aprobar" onClick={onAprobar} disabled={busy}
        style={{width:28,height:28,borderRadius:7,border:'none',background:'rgba(48,105,59,.12)',
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
          opacity:busy?.5:1,fontSize:14}}>
        ✅
      </button>
    </div>
  )
}

// ── Botón "Aprobar todo" del especialista ─────────────────────────────────
function AprobTodo({ onClick, busy }) {
  return (
    <button onClick={e=>{e.stopPropagation();onClick()}} disabled={busy}
      style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
        border:'none',background:'#30693B',color:'white',fontSize:11.5,fontWeight:700,
        cursor:busy?'not-allowed':'pointer',opacity:busy?.6:1,flexShrink:0}}>
      ✅ Aprobar todo
    </button>
  )
}

// ── Fila DÍA ──────────────────────────────────────────────────────────────
function DiaRow({ dia, onAprobar, onRechazar, loadingKey }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{borderRadius:9,border:'1px solid var(--c-border)',overflow:'hidden',background:'var(--c-surface)'}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',cursor:'pointer',
          background:open?'var(--c-surface2)':'var(--c-surface)'}}>
        {open?<ChevronUp size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>
             :<ChevronDown size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        <span style={{fontSize:12.5,fontWeight:700,minWidth:52}}>{dia.label}</span>
        <span style={{fontSize:11,color:'var(--t-muted)',flex:1}}>{dia.actividades.length} act.</span>
        {/* Modelo pills */}
        <div style={{display:'flex',gap:5}}>
          {Object.entries(dia.actividades.reduce((acc,a)=>{acc[a.modelo]=(acc[a.modelo]||0)+a.mins;return acc},{}))
            .map(([m,mins])=>(
              <span key={m} style={{fontSize:9,fontWeight:800,color:MODEL_COLOR[m]}}>
                {m} {Math.round(mins/(dia.totalMins||1)*100)}%
              </span>
            ))}
        </div>
        <span style={{fontSize:12.5,fontWeight:800,fontFamily:'JetBrains Mono, monospace',
          color:capColor(dia.capacityPct),marginLeft:8}}>
          {dia.capacityPct}% · {fmtM(dia.totalMins)}
        </span>
        <IcoAccion
          myKey={`d-${dia.idRegistro}`} loadingKey={loadingKey}
          onAprobar={()=>onAprobar([dia.idRegistro],`d-${dia.idRegistro}`)}
          onRechazar={()=>onRechazar({nivel:'jornada',desc:`Jornada del ${dia.fecha}`,ids:[dia.idRegistro]})}
        />
      </div>
      {open && (
        <div style={{padding:'8px 14px',background:'var(--c-surface2)',borderTop:'1px solid var(--c-border)',
          display:'flex',flexDirection:'column',gap:4}}>
          {dia.actividades.map((a,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',
              borderRadius:7,background:'var(--c-surface)',border:'1px solid var(--c-border)'}}>
              <span style={{padding:'1px 6px',borderRadius:99,fontSize:9,fontWeight:800,
                background:`${MODEL_COLOR[a.modelo]}15`,color:MODEL_COLOR[a.modelo]}}>{a.modelo}</span>
              <span style={{fontSize:11.5,fontWeight:600,flex:1}}>{a.nombre}</span>
              <span style={{fontSize:10.5,color:'var(--t-muted)'}}>{a.cat}</span>
              {a.desc&&<span style={{fontSize:10,color:'var(--t-secondary)',fontStyle:'italic',
                maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.desc}</span>}
              <span style={{fontSize:11,fontWeight:800,fontFamily:'JetBrains Mono, monospace',
                color:'var(--t-secondary)',flexShrink:0}}>{fmtM(a.mins)}</span>
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
    <div style={{borderRadius:10,border:'1px solid var(--c-border)',overflow:'hidden',marginBottom:5}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',
          background:open?'rgba(51,40,154,.04)':'var(--c-surface)'}}>
        {open?<ChevronUp size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>
             :<ChevronDown size={12} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        <span style={{fontSize:12.5,fontWeight:700}}>{sem.label}</span>
        <span style={{fontSize:11,color:'var(--t-muted)',flex:1}}>{sem.dias.length} día(s)</span>
        <span style={{fontSize:12.5,fontWeight:800,fontFamily:'JetBrains Mono, monospace',
          color:capColor(sem.capacityPct)}}>
          {sem.capacityPct}% · {fmtM(sem.totalMins)}
        </span>
        <IcoAccion
          myKey={`s-${idEsp}-${sem.numero}`} loadingKey={loadingKey}
          onAprobar={()=>onAprobar(ids,`s-${idEsp}-${sem.numero}`)}
          onRechazar={()=>onRechazar({nivel:'semana',desc:`Semana ${sem.numero} (${ids.length} jornadas)`,ids})}
        />
      </div>
      {open && (
        <div style={{padding:'7px 14px 10px',background:'var(--c-surface2)',
          borderTop:'1px solid var(--c-border)',display:'flex',flexDirection:'column',gap:5}}>
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
    <div style={{borderRadius:11,border:'1px solid var(--c-border)',overflow:'hidden',marginBottom:7}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',cursor:'pointer',
          background:open?'rgba(51,40,154,.06)':'var(--c-surface)'}}>
        {open?<ChevronUp size={13} style={{color:'var(--t-muted)',flexShrink:0}}/>
             :<ChevronDown size={13} style={{color:'var(--t-muted)',flexShrink:0}}/>}
        <span style={{fontSize:13.5,fontWeight:800}}>{sp.nombre}</span>
        <span style={{fontSize:11,color:'var(--t-muted)',flex:1}}>{sp.semanas.length} semana(s)</span>
        <span style={{fontSize:13.5,fontWeight:900,fontFamily:'JetBrains Mono, monospace',
          color:capColor(sp.capacityPct)}}>
          {sp.capacityPct}% · {fmtM(sp.totalMins)}
        </span>
        <IcoAccion
          myKey={`sp-${idEsp}-${sp.id}`} loadingKey={loadingKey}
          onAprobar={()=>onAprobar(ids,`sp-${idEsp}-${sp.id}`)}
          onRechazar={()=>onRechazar({nivel:'sprint',desc:`${sp.nombre} (${ids.length} jornadas)`,ids})}
        />
      </div>
      {open && (
        <div style={{padding:'8px 14px 12px',background:'var(--c-surface2)',borderTop:'1px solid var(--c-border)'}}>
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
    <div style={{borderRadius:14,border:'1px solid var(--c-border)',overflow:'hidden',
      boxShadow:open?'var(--s-md)':'none',transition:'box-shadow .2s',background:'var(--c-surface)'}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',cursor:'pointer',
          background:open?'linear-gradient(135deg,rgba(51,40,154,.07),rgba(51,40,154,.03))':'var(--c-surface)'}}>
        <div style={{width:44,height:44,borderRadius:12,background:`${capColor(esp.capacityPct)}18`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,
          color:capColor(esp.capacityPct),flexShrink:0}}>{init}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:800}}>{esp.nombre}</div>
          <div style={{fontSize:11.5,color:'var(--t-muted)',marginTop:2,
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{esp.oficio}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0,marginRight:12}}>
          <div style={{fontSize:18,fontWeight:900,color:capColor(esp.capacityPct),fontFamily:'JetBrains Mono, monospace'}}>
            {esp.capacityPct}%
          </div>
          <div style={{fontSize:10.5,color:'var(--t-muted)'}}>{fmtM(esp.totalMins)} · {esp.totalDias} día(s)</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}} onClick={e=>e.stopPropagation()}>
          <AprobTodo busy={loadingKey===`esp-${esp.id}`} onClick={()=>onAprobar(ids,`esp-${esp.id}`)} />
          <div onClick={e=>{e.stopPropagation();setOpen(o=>!o)}} style={{cursor:'pointer',padding:4}}>
            {open?<ChevronUp size={16} style={{color:'var(--t-muted)'}}/>:<ChevronDown size={16} style={{color:'var(--t-muted)'}}/>}
          </div>
        </div>
      </div>
      {open && (
        <div style={{padding:'12px 20px 16px',background:'var(--c-surface2)',borderTop:'1px solid var(--c-border)'}}>
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
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [openEsp, setOpenEsp] = useState({})

  useEffect(()=>{
    api.get('/approvals/historico')
      .then(r=>{ setData(r.data??[]); })
      .catch(console.error)
      .finally(()=>setLoading(false))
  },[])

  if (loading) return <PageLoader message="Cargando histórico..." />
  if (!data.length) return (
    <div style={{textAlign:'center',padding:'32px 0',color:'var(--t-muted)',fontSize:14}}>
      Sin actividades aprobadas o rechazadas aún
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {data.map(esp=>(
        <div key={esp.id} style={{borderRadius:14,border:'1px solid var(--c-border)',
          overflow:'hidden',background:'var(--c-surface)'}}>
          {/* Header especialista */}
          <button onClick={()=>setOpenEsp(p=>({...p,[esp.id]:!p[esp.id]}))}
            style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 18px',
              background:openEsp[esp.id]?'rgba(51,40,154,.05)':'var(--c-surface)',
              border:'none',cursor:'pointer',textAlign:'left'}}>
            <div style={{width:40,height:40,borderRadius:11,background:'rgba(51,40,154,.1)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,
              color:'var(--c-accent)',flexShrink:0}}>
              {esp.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800}}>{esp.nombre}</div>
              <div style={{fontSize:11,color:'var(--t-muted)',marginTop:1}}>{esp.oficio}</div>
            </div>
            <span style={{fontSize:11.5,color:'var(--t-muted)',marginRight:8}}>
              {esp.registros.length} jornada(s)
            </span>
            {openEsp[esp.id]?<ChevronUp size={14} style={{color:'var(--t-muted)',flexShrink:0}}/>
                            :<ChevronDown size={14} style={{color:'var(--t-muted)',flexShrink:0}}/>}
          </button>

          {openEsp[esp.id] && (
            <div style={{borderTop:'1px solid var(--c-border)',padding:'10px 18px 14px',
              display:'flex',flexDirection:'column',gap:8,background:'var(--c-surface2)'}}>
              {esp.registros.map(rd=>(
                <div key={rd.idRegistro} style={{borderRadius:11,border:'1px solid var(--c-border)',
                  background:'var(--c-surface)',overflow:'hidden'}}>
                  {/* Día */}
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',
                    background:'var(--c-surface2)',borderBottom:'1px solid var(--c-border)'}}>
                    <span style={{fontSize:13,fontWeight:700}}>{rd.fecha}</span>
                    <span style={{fontSize:11,color:'var(--t-muted)',flex:1}}>
                      {rd.sprintNombre} · Sem. {rd.semana}
                    </span>
                    <span style={{fontSize:11,color:'var(--t-muted)',fontFamily:'JetBrains Mono, monospace'}}>
                      {fmtM(rd.totalMins)}
                    </span>
                    <Badge accion={rd.estadoActual}/>
                  </div>
                  {/* Timeline */}
                  <div style={{padding:'10px 14px',display:'flex',flexDirection:'column',gap:8}}>
                    {rd.historial.map((h,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                        <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,display:'flex',
                          alignItems:'center',justifyContent:'center',marginTop:1,
                          background:h.accion==='aprobado'?'rgba(48,105,59,.12)':'rgba(153,44,38,.12)',
                          color:h.accion==='aprobado'?'#30693B':'#992C26'}}>
                          {h.accion==='aprobado'?<CheckCircle size={12}/>:<XCircle size={12}/>}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                            <Badge accion={h.accion}/>
                            <span style={{fontSize:11,color:'var(--t-muted)'}}>por {h.revisor}</span>
                            <span style={{fontSize:10,color:'var(--t-muted)',marginLeft:'auto'}}>
                              {h.fecha?new Date(h.fecha).toLocaleString('es-CO',
                                {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}
                            </span>
                          </div>
                          {h.comentario && (
                            <div style={{fontSize:11.5,color:'var(--t-secondary)',marginTop:4,padding:'5px 9px',
                              background:h.accion==='rechazado'?'rgba(153,44,38,.06)':'rgba(48,105,59,.06)',
                              borderRadius:7,fontStyle:'italic'}}>
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
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,letterSpacing:-.4}}>Aprobaciones</h2>
          <p style={{fontSize:13,color:'var(--t-muted)',marginTop:3}}>Gestión de jornadas del equipo</p>
        </div>
        <button onClick={load} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,
          border:'1px solid var(--c-border)',background:'var(--c-surface)',fontSize:13,fontWeight:600,
          cursor:'pointer',color:'var(--t-secondary)'}}>
          <RefreshCw size={13}/> Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'rgba(51,40,154,.06)',
        borderRadius:12,padding:4,width:'fit-content'}}>
        {[
          {k:'pendientes',l:'Pendientes',i:<Clock size={13}/>},
          {k:'historico', l:'Histórico', i:<History size={13}/>},
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:9,
              fontSize:13,fontWeight:700,cursor:'pointer',border:'none',transition:'all .15s',
              background:tab===t.k?'white':'transparent',
              color:tab===t.k?'var(--c-accent)':'var(--t-secondary)',
              boxShadow:tab===t.k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>
            {t.i} {t.l}
            {t.k==='pendientes'&&total>0&&(
              <span style={{padding:'1px 6px',borderRadius:99,background:'var(--brand-orange)',
                color:'white',fontSize:10,fontWeight:800}}>{total}</span>
            )}
          </button>
        ))}
      </div>

      {tab==='pendientes' && (
        loading ? <PageLoader message="Cargando pendientes..."/> :
        data.length===0 ? (
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <CheckCircle size={52} style={{color:'#30693B',opacity:.35,margin:'0 auto 14px',display:'block'}}/>
            <div style={{fontSize:16,fontWeight:700,color:'var(--t-muted)'}}>¡Todo al día!</div>
            <div style={{fontSize:13,color:'var(--t-muted)',marginTop:4}}>No hay jornadas pendientes de aprobación</div>
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
