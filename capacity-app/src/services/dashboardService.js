/**
 * dashboardService.js — Fase 4
 * Métricas de carga desde la API REST.
 * Con caché local como fallback para modo offline.
 */

import { api } from '../lib/apiClient'
import { storage } from '../lib/storage'

const CACHE_AREA_PREFIX   = 'dashboard_area_'
const CACHE_GLOBAL_KEY    = 'dashboard_global'
const CACHE_TTL_MS        = 5 * 60 * 1000  // 5 min — métricas se consideran frescas 5 min

// ── Helpers de caché con TTL ───────────────────────────────────────────────
function getCached(key) {
  const entry = storage.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null  // expirado
  return entry.data
}

function setCached(key, data) {
  storage.set(key, { data, cachedAt: Date.now() })
}

// ── Area Dashboard (Jefe) ──────────────────────────────────────────────────

/**
 * Métricas completas de un área para el dashboard del jefe.
 * @returns {{ area, summary, specialists[] }}
 */
export async function getAreaMetrics(areaKey, sprintId = 5) {
  const cacheKey = `${CACHE_AREA_PREFIX}${areaKey}_${sprintId}`

  try {
    const data = await api.get(`/dashboard/area/${areaKey}?sprint=${sprintId}`)
    setCached(cacheKey, data.data)
    return data.data
  } catch (err) {
    console.warn('[dashboardService] getAreaMetrics falló, usando caché:', err.message)
    const cached = getCached(cacheKey)
    if (cached) return cached
    throw err
  }
}

/**
 * Métricas de especialistas de un área.
 * Extrae del resultado de getAreaMetrics.
 */
export async function getSpecialistMetrics(areaKey, sprintId = 5) {
  const metrics = await getAreaMetrics(areaKey, sprintId)
  return metrics.specialists ?? []
}

/**
 * Carga de un especialista específico.
 * Extrae del área en lugar de un endpoint dedicado.
 */
export async function getSpecialistLoad(userId, areaKey, sprintId = 5) {
  try {
    const metrics = await getAreaMetrics(areaKey, sprintId)
    const specialist = (metrics.specialists ?? []).find(s => s.id === userId)
    return specialist ?? null
  } catch {
    return null
  }
}

// ── Global Dashboard (Admin PMO) ───────────────────────────────────────────

/**
 * Métricas globales de todas las áreas.
 * @returns {{ summary, areas[] }}
 */
export async function getGlobalMetrics(sprintId = 5) {
  try {
    const data = await api.get(`/dashboard/global?sprint=${sprintId}`)
    setCached(CACHE_GLOBAL_KEY, data.data)
    return data.data
  } catch (err) {
    console.warn('[dashboardService] getGlobalMetrics falló, usando caché:', err.message)
    const cached = getCached(CACHE_GLOBAL_KEY)
    if (cached) return cached
    throw err
  }
}

/**
 * Invalida todos los cachés del dashboard.
 * Llamar después de finalizar jornadas o aprobaciones.
 */
export function invalidateDashboardCache() {
  storage.remove(CACHE_GLOBAL_KEY)
  // Las claves por área se invalidan al expirar su TTL
}
