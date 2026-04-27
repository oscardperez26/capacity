/**
 * auditService.js — Fase 4
 * Log de auditoría desde la API REST.
 */

import { api } from '../lib/apiClient'
import { storage } from '../lib/storage'

const CACHE_KEY = 'audit_log_cache'

// ── Log ────────────────────────────────────────────────────────────────────

/**
 * Obtiene el log de auditoría con filtros opcionales.
 * @param {{ from?, to?, type?, userId?, limit?, offset? }} filters
 */
export async function getAuditLog(filters = {}) {
  const params = new URLSearchParams()
  if (filters.from)   params.set('from',   filters.from)
  if (filters.to)     params.set('to',     filters.to)
  if (filters.type)   params.set('type',   filters.type)
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.limit)  params.set('limit',  filters.limit)
  if (filters.offset) params.set('offset', filters.offset)

  const qs = params.toString()

  try {
    const data = await api.get(`/audit${qs ? `?${qs}` : ''}`)
    // Normaliza al formato que usa el componente Auditoria.jsx
    const rows = (data.rows ?? []).map(row => ({
      id:     row.id,
      action: row.action,
      user:   row.user_name ?? 'Sistema',
      time:   formatRelativeTime(row.created_at),
      type:   row.entity_type ?? 'generic',
      ts:     new Date(row.created_at).getTime(),
    }))
    storage.set(CACHE_KEY, rows)
    return rows
  } catch (err) {
    console.warn('[auditService] getAuditLog falló, usando caché:', err.message)
    return storage.get(CACHE_KEY, [])
  }
}

/**
 * Estadísticas del log de auditoría.
 */
export async function getAuditStats() {
  try {
    const data = await api.get('/audit/stats')
    return data.data
  } catch (err) {
    console.warn('[auditService] getAuditStats falló:', err.message)
    // Fallback: calcula desde caché
    const log   = storage.get(CACHE_KEY, [])
    const today = Date.now() - 86400000
    return {
      todayEvents:  log.filter(e => e.ts > today).length,
      approvals:    log.filter(e => e.type === 'approval').length,
      rejections:   log.filter(e => e.action?.includes('rechazada')).length,
      accessGranted:log.filter(e => e.type === 'access').length,
    }
  }
}

/**
 * Registra un evento de auditoría desde el frontend.
 * El backend también registra eventos propios — este endpoint
 * es para acciones client-side que no pasan por el backend
 * (ej: cambio de tema, navegación de módulo).
 * En producción este endpoint puede desactivarse para reducir ruido.
 */
export async function logEvent({ action, user, type = 'frontend' }) {
  // Solo persiste localmente — no tiene sentido enviar cada click a la API
  const log = storage.get(CACHE_KEY, [])
  const entry = {
    id:     'fe_' + Date.now(),
    action,
    user,
    time:   'Ahora',
    ts:     Date.now(),
    type,
  }
  storage.set(CACHE_KEY, [entry, ...log].slice(0, 200)) // máx 200 entradas locales
  return entry
}

/**
 * Exporta el log como CSV y dispara la descarga.
 */
export function exportLogCSV(log) {
  const header = 'Acción,Usuario,Tiempo,Tipo\n'
  const rows   = log
    .map(l => `"${l.action}","${l.user}","${l.time}","${l.type}"`)
    .join('\n')
  const csv  = header + rows
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Utils ──────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins  < 1)  return 'Ahora mismo'
  if (mins  < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days  < 7)  return days === 1 ? 'Ayer' : `Hace ${days} días`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}
