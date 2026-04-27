/**
 * Auditoria.jsx — Registro de auditoría del sistema (Rol Admin)
 * Tabla con filtros: usuario, tipo, rango de fechas + export CSV
 */
import { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, Search, X, Filter } from 'lucide-react'
import { api }        from '../../lib/apiClient'
import { PageLoader } from '../../components/ui/Spinner'

function fmtFecha(s) {
  if (!s) return '—'
  return new Date(s).toLocaleString('es-CO', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  })
}

const TIPO_COLOR = {
  proyectos:   '#6366F1',
  registro_dia:'#10B981',
  sistema:     '#6B7280',
  sprint:      '#F97316',
  sprints:     '#F97316',
}

function TipoBadge({ tipo }) {
  const col = TIPO_COLOR[tipo] || '#6B7280'
  return <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:800,
    background:`${col}15`, color:col }}>{tipo}</span>
}

export default function Auditoria() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar,  setBuscar]  = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [desde,   setDesde]   = useState('')
  const [hasta,   setHasta]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        limit: 200,
        ...(filtroTipo ? { type: filtroTipo } : {}),
        ...(desde ? { from: desde } : {}),
        ...(hasta ? { to: hasta } : {}),
      }).toString()
      const r = await api.get(`/audit?${qs}`)
      setData(r.data?.log || r.data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [filtroTipo, desde, hasta])

  useEffect(() => { load() }, [])

  const filtrado = buscar.trim()
    ? data.filter(r =>
        (r.nombre_usuario||'').toLowerCase().includes(buscar.toLowerCase()) ||
        (r.accion||'').toLowerCase().includes(buscar.toLowerCase()) ||
        (r.tabla_afectada||'').toLowerCase().includes(buscar.toLowerCase())
      )
    : data

  const tiposUnicos = [...new Set(data.map(r => r.tabla_afectada).filter(Boolean))]

  const exportCSV = () => {
    const rows = [
      ['Fecha','Usuario','Tipo','Acción','ID Registro'],
      ...filtrado.map(r => [
        fmtFecha(r.fecha||r.creado_en),
        r.nombre_usuario||'—',
        r.tabla_afectada||'—',
        (() => { try { return JSON.parse(r.valor_nuevo||'{}').action||r.accion||'—' } catch { return r.accion||'—' } })(),
        r.id_registro||'—',
      ])
    ]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`auditoria_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:-.4 }}>Auditoría del sistema</h2>
          <p style={{ fontSize:13, color:'var(--t-muted)', marginTop:3 }}>
            {filtrado.length} registro{filtrado.length!==1?'s':''} · últimas 200 acciones
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load}
            style={{ width:34, height:34, borderRadius:8, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', color:'var(--c-accent)' }}>
            <RefreshCw size={14}/>
          </button>
          <button onClick={exportCSV}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
              borderRadius:8, border:'none', background:'#10B981', color:'white',
              fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
            <Download size={13}/> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16, alignItems:'flex-end' }}>
        {/* Buscar */}
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <div style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)',
            color:'var(--t-muted)', pointerEvents:'none' }}>
            <Search size={14}/>
          </div>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)}
            placeholder="Buscar por usuario, acción o tipo..."
            style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:10,
              border:'1px solid var(--c-border)', background:'var(--c-surface)',
              fontSize:13, boxSizing:'border-box', fontFamily:'inherit', color:'var(--t-primary)' }}/>
          {buscar && (
            <button onClick={()=>setBuscar('')}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                width:20, height:20, borderRadius:'50%', border:'none',
                background:'var(--c-surface2)', cursor:'pointer', display:'flex',
                alignItems:'center', justifyContent:'center', color:'var(--t-muted)' }}>
              <X size={10}/>
            </button>
          )}
        </div>

        {/* Tipo */}
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
          style={{ padding:'9px 12px', borderRadius:10, border:'1px solid var(--c-border)',
            background:'var(--c-surface)', fontSize:13, color:'var(--t-primary)' }}>
          <option value="">Todos los tipos</option>
          {tiposUnicos.map(t=><option key={t}>{t}</option>)}
        </select>

        {/* Desde */}
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--t-muted)', marginBottom:3 }}>Desde</div>
          <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
            style={{ padding:'8px 10px', borderRadius:10, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', fontSize:13, color:'var(--t-primary)' }}/>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--t-muted)', marginBottom:3 }}>Hasta</div>
          <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
            style={{ padding:'8px 10px', borderRadius:10, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', fontSize:13, color:'var(--t-primary)' }}/>
        </div>
        <button onClick={load}
          style={{ padding:'9px 16px', borderRadius:10, border:'none',
            background:'var(--c-accent)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          Filtrar
        </button>
        {(filtroTipo||desde||hasta) && (
          <button onClick={()=>{ setFiltroTipo(''); setDesde(''); setHasta(''); load() }}
            style={{ padding:'9px 14px', borderRadius:10, border:'1px solid var(--c-border)',
              background:'var(--c-surface)', fontSize:13, cursor:'pointer', color:'var(--t-muted)' }}>
            Limpiar
          </button>
        )}
      </div>

      {loading ? <PageLoader message="Cargando auditoría..."/> : (
        <div style={{ borderRadius:14, border:'1px solid var(--c-border)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
            <thead>
              <tr style={{ background:'var(--c-surface2)' }}>
                {['Fecha','Usuario','Tipo','Acción','ID'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:800,
                    textTransform:'uppercase', letterSpacing:.8, color:'var(--t-muted)',
                    borderBottom:'1px solid var(--c-border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign:'center', padding:'32px 0',
                    color:'var(--t-muted)', fontSize:13, fontStyle:'italic' }}>
                    Sin registros de auditoría
                  </td>
                </tr>
              )}
              {filtrado.map((r, i) => {
                let accion = r.accion || '—'
                try { const parsed = JSON.parse(r.valor_nuevo||'{}'); if (parsed.action) accion = parsed.action } catch {}
                return (
                  <tr key={i}
                    style={{ background: i%2===0?'var(--c-surface)':'var(--c-surface2)',
                      borderBottom:'1px solid var(--c-border)',
                      transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'var(--c-surface)':'var(--c-surface2)'}>
                    <td style={{ padding:'9px 14px', whiteSpace:'nowrap', color:'var(--t-muted)', fontSize:11.5 }}>
                      {fmtFecha(r.fecha||r.creado_en)}
                    </td>
                    <td style={{ padding:'9px 14px', fontWeight:700 }}>
                      {r.nombre_usuario || <span style={{ color:'var(--t-muted)', fontStyle:'italic' }}>Sistema</span>}
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <TipoBadge tipo={r.tabla_afectada||'sistema'}/>
                    </td>
                    <td style={{ padding:'9px 14px', maxWidth:320 }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {accion}
                      </div>
                    </td>
                    <td style={{ padding:'9px 14px', color:'var(--t-muted)', fontSize:11,
                      fontFamily:'JetBrains Mono, monospace' }}>
                      {r.id_registro||'—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
