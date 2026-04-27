/**
 * entriesService.js — corregido
 * Nomenclatura alineada con el nuevo schema de BD.
 */

import { api }     from '../lib/apiClient'
import { storage } from '../lib/storage'

const CACHE_KEY = 'day_entries_cache'
const FAV_KEY   = 'favorites_cache'

function getCached()         { return storage.get(CACHE_KEY, {}) }
function setCache(entries)   { storage.set(CACHE_KEY, entries) }
function getCachedFavs()     { return storage.get(FAV_KEY, []) }
function cacheFavs(favs)     { storage.set(FAV_KEY, favs) }

// ── Entries ────────────────────────────────────────────────────────────────
export async function getAllEntries(sprintId = null) {
  try {
    const qs = sprintId ? `?sprint=${sprintId}` : ''
    const { data } = await api.get(`/entries${qs}`)
    setCache(data)
    return data
  } catch (err) {
    console.warn('[entriesService] getAllEntries fallback cache:', err.message)
    return getCached()
  }
}

export async function getOrCreateEntry(dayKey, dateStr) {
  try {
    const { data } = await api.get(`/entries/${dayKey}?date=${dateStr}`)
    const cached   = getCached()
    setCache({ ...cached, [dayKey]: data })
    return data
  } catch (err) {
    if (err.status === 404) return { status: 'borrador', tasks: [], id: null }
    return getCached()[dayKey] ?? { status: 'borrador', tasks: [], id: null }
  }
}

// ── Actividades ────────────────────────────────────────────────────────────
export async function addTask(dayKey, dateStr, task) {
  // Optimistic update inmediato
  const cached   = getCached()
  const entry    = cached[dayKey] ?? { status: 'borrador', tasks: [] }
  const tempTask = { ...task, id: 'opt_' + Date.now() }
  setCache({ ...cached, [dayKey]: { ...entry, tasks: [...entry.tasks, tempTask] } })

  try {
    const { data } = await api.post(`/entries/${dayKey}/activities?date=${dateStr}`, {
      subcategoriaId: task.subcategoriaId ?? null,
      dur:            task.dur            ?? 15,
      desc:           task.desc           ?? '',
      projectId:      task.projectId      ?? null,
      date:           dateStr,
    })
    setCache({ ...getCached(), [dayKey]: data })
    return data
  } catch (err) {
    setCache(cached)   // revierte
    throw err
  }
}

export async function updateTask(dayKey, taskId, field, value) {
  // Optimistic
  const cached = getCached()
  const entry  = cached[dayKey]
  if (entry) {
    setCache({
      ...cached,
      [dayKey]: {
        ...entry,
        // eslint-disable-next-line eqeqeq
        tasks: entry.tasks.map(t => t.id == taskId ? { ...t, [field]: value } : t),
      },
    })
  }

  // Solo persiste si el campo tiene columna en BD
  if (!['dur','desc','projectId'].includes(field)) return

  try {
    await api.patch(`/entries/activities/${taskId}`, { field, value })
  } catch (err) {
    if (entry) setCache(cached)   // revierte
    console.warn('[entriesService] updateTask:', err.message)
  }
}

export async function deleteTask(dayKey, taskId) {
  const cached = getCached()
  const entry  = cached[dayKey]

  // Optimistic — elimina de la vista de inmediato
  if (entry) {
    setCache({
      ...cached,
      // eslint-disable-next-line eqeqeq
      [dayKey]: { ...entry, tasks: entry.tasks.filter(t => t.id != taskId) },
    })
  }

  try {
    await api.delete(`/entries/activities/${taskId}`)
  } catch (err) {
    if (entry) setCache(cached)   // revierte
    console.warn('[entriesService] deleteTask:', err.message)
  }
}

// ── Borrador y finalizar ───────────────────────────────────────────────────
export async function saveDraft(dayKey, dateStr) {
  try {
    const { data } = await api.post(`/entries/${dayKey}/draft?date=${dateStr}`, { date: dateStr })
    setCache({ ...getCached(), [dayKey]: data })
    return data
  } catch (err) {
    // Modo offline: solo actualiza caché
    const cached = getCached()
    const entry  = cached[dayKey] ?? { status: 'borrador', tasks: [] }
    const draft  = { ...entry, status: 'borrador', savedAt: new Date().toISOString() }
    setCache({ ...cached, [dayKey]: draft })
    console.warn('[entriesService] saveDraft offline:', err.message)
    return draft
  }
}

export async function finalizeEntry(dayKey, dateStr) {
  const { data } = await api.post(`/entries/${dayKey}/finalize?date=${dateStr}`, { date: dateStr })
  const cached = getCached()
  // Mapea estado 'enviado' → 'finalizado' para compatibilidad con el frontend
  const mapped = { ...data, status: data.status === 'enviado' ? 'finalizado' : data.status }
  setCache({ ...cached, [dayKey]: mapped })
  return mapped
}

// ── Favoritos ──────────────────────────────────────────────────────────────
export async function getFavorites() {
  try {
    const { data } = await api.get('/entries/favorites/list')
    cacheFavs(data)
    return data
  } catch {
    return getCachedFavs()
  }
}

export async function toggleFavorite(subId) {
  const current    = getCachedFavs()
  const optimistic = current.includes(String(subId))
    ? current.filter(x => x !== String(subId))
    : [...current, String(subId)]
  cacheFavs(optimistic)
  try {
    const { data } = await api.post(`/entries/favorites/${subId}/toggle`)
    cacheFavs(data)
    return data
  } catch {
    return optimistic
  }
}
