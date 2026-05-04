/**
 * Auditoria.jsx — Registro de auditoría del sistema (Rol Admin)
 * Tabla con filtros: usuario, tipo, rango de fechas + export CSV
 */
import './Auditoria.css'
import { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, Search, X } from 'lucide-react'
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
  return (
    <span className="aud-badge" style={{ background:`${col}15`, color:col }}>
      {tipo}
    </span>
  )
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
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`auditoria_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div className="aud-hdr">
        <div>
          <h2 className="aud-hdr-title">Auditoría del sistema</h2>
          <p className="aud-hdr-sub">
            {filtrado.length} registro{filtrado.length!==1?'s':''} · últimas 200 acciones
          </p>
        </div>
        <div className="aud-hdr-actions">
          <button className="aud-refresh-btn" onClick={load}>
            <RefreshCw size={14}/>
          </button>
          <button className="aud-export-btn" onClick={exportCSV}>
            <Download size={13}/> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="aud-filters">
        <div className="aud-search-wrap">
          <div className="aud-search-icon"><Search size={14}/></div>
          <input className="aud-search-inp" value={buscar} onChange={e=>setBuscar(e.target.value)}
            placeholder="Buscar por usuario, acción o tipo..."/>
          {buscar && (
            <button className="aud-search-clear" onClick={()=>setBuscar('')}>
              <X size={10}/>
            </button>
          )}
        </div>

        <select className="aud-select" value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tiposUnicos.map(t=><option key={t}>{t}</option>)}
        </select>

        <div>
          <div className="aud-date-lbl">Desde</div>
          <input className="aud-date-inp" type="date" value={desde} onChange={e=>setDesde(e.target.value)}/>
        </div>
        <div>
          <div className="aud-date-lbl">Hasta</div>
          <input className="aud-date-inp" type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/>
        </div>

        <button className="aud-filter-btn" onClick={load}>Filtrar</button>

        {(filtroTipo||desde||hasta) && (
          <button className="aud-clear-btn" onClick={()=>{ setFiltroTipo(''); setDesde(''); setHasta(''); load() }}>
            Limpiar
          </button>
        )}
      </div>

      {loading ? <PageLoader message="Cargando auditoría..."/> : (
        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead>
              <tr>
                {['Fecha','Usuario','Tipo','Acción','ID'].map(h => (
                  <th key={h} className="aud-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 && (
                <tr>
                  <td colSpan={5} className="aud-empty">Sin registros de auditoría</td>
                </tr>
              )}
              {filtrado.map((r, i) => {
                let accion = r.accion || '—'
                try { const parsed = JSON.parse(r.valor_nuevo||'{}'); if (parsed.action) accion = parsed.action } catch {}
                return (
                  <tr key={i} className="aud-tr">
                    <td className="aud-td aud-td-fecha">{fmtFecha(r.fecha||r.creado_en)}</td>
                    <td className="aud-td aud-td-user">
                      {r.nombre_usuario || <span className="aud-td-sistema">Sistema</span>}
                    </td>
                    <td className="aud-td">
                      <TipoBadge tipo={r.tabla_afectada||'sistema'}/>
                    </td>
                    <td className="aud-td aud-td-accion">{accion}</td>
                    <td className="aud-td aud-td-id">{r.id_registro||'—'}</td>
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
