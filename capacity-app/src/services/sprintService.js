/**
 * sprintService.js — v2 REAL API
 * Reemplaza la versión con mockData por llamadas reales al backend.
 */

import { api } from '../lib/apiClient'

// ── Sprint activo desde el backend ────────────────────────────────────────
export async function getActiveSprint() {
  // GET /api/entries devuelve los registros del sprint activo
  // Pero necesitamos la info del sprint (fechas, semanas) → llamamos a /api/sprints/active
  const res = await api.get('/sprints/active')
  return res.data  // { sprint, currentWeek, weeks, ... }
}

export async function getSprints() {
  const res = await api.get('/sprints')
  return res.data ?? []
}
