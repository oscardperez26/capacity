/**
 * StoreContext.jsx — corregido
 * CLAVE: todas las mutaciones reciben dayKey explícito
 * para no depender de state.activeDay que puede ser null al inicio.
 */

import { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { storage }         from '../lib/storage'
import * as entriesService from '../services/entriesService'

const buildInitialState = () => ({
  dayEntries:   storage.get('day_entries_cache', {}),
  favorites:    storage.get('favorites_cache', []),
  activeDay:    null,
  activeDateStr:null,
  auditLog:     storage.get('audit_log_local', []),
})

function storeReducer(state, action) {
  switch (action.type) {

    case 'SET_DAY':
      return {
        ...state,
        activeDay:     action.day,
        activeDateStr: action.dateStr ?? state.activeDateStr,
      }

    case 'HYDRATE':
      return {
        ...state,
        dayEntries: action.dayEntries ?? state.dayEntries,
        favorites:  action.favorites  ?? state.favorites,
      }

    case 'SYNC_ENTRY': {
      if (!action.dayKey) return state
      const updated = { ...state.dayEntries, [action.dayKey]: action.entry }
      storage.set('day_entries_cache', updated)
      return { ...state, dayEntries: updated }
    }

    // ── Usa action.dayKey en lugar de state.activeDay ─────────────────────
    case 'ADD_TASK_OPTIMISTIC': {
      const key   = action.dayKey ?? state.activeDay
      if (!key) return state
      const entry = state.dayEntries[key] ?? { status: 'borrador', tasks: [] }
      if (entry.status === 'enviado' || entry.status === 'finalizado') return state
      const newTask = {
        id:             'opt_' + Date.now(),
        name:           action.sub.label,
        model:          action.sub.m,
        catId:          action.cat.id,
        catLabel:       action.cat.label,
        catColor:       action.cat.color,
        subcategoriaId: action.sub.dbId ?? action.sub.id,
        dur:            15,
        desc:           '',
        projectId:      null,
        estado:         'borrador',
      }
      const newEntries = { ...state.dayEntries, [key]: { ...entry, tasks: [...entry.tasks, newTask] } }
      storage.set('day_entries_cache', newEntries)
      return { ...state, dayEntries: newEntries }
    }

    case 'UPDATE_TASK': {
      const key   = action.dayKey ?? state.activeDay
      if (!key) return state
      const entry = state.dayEntries[key]
      if (!entry || entry.status === 'enviado' || entry.status === 'finalizado') return state
      // eslint-disable-next-line eqeqeq
      const tasks = entry.tasks.map(t => t.id == action.id ? { ...t, [action.field]: action.value } : t)
      const newEntries = { ...state.dayEntries, [key]: { ...entry, tasks } }
      storage.set('day_entries_cache', newEntries)
      return { ...state, dayEntries: newEntries }
    }

    case 'DELETE_TASK': {
      const key   = action.dayKey ?? state.activeDay
      if (!key) return state
      const entry = state.dayEntries[key]
      if (!entry || entry.status === 'enviado' || entry.status === 'finalizado') return state
      // eslint-disable-next-line eqeqeq
      const tasks = entry.tasks.filter(t => t.id != action.id)
      const newEntries = { ...state.dayEntries, [key]: { ...entry, tasks } }
      storage.set('day_entries_cache', newEntries)
      return { ...state, dayEntries: newEntries }
    }

    case 'SAVE_DRAFT': {
      const key   = action.dayKey ?? state.activeDay
      if (!key) return state
      const entry = state.dayEntries[key] ?? { status: 'borrador', tasks: [] }
      const newEntries = { ...state.dayEntries, [key]: { ...entry, status: 'borrador', savedAt: new Date().toISOString() } }
      storage.set('day_entries_cache', newEntries)
      return { ...state, dayEntries: newEntries }
    }

    case 'FINALIZE_DAY': {
      const key   = action.dayKey ?? state.activeDay
      if (!key) return state
      const entry = state.dayEntries[key]
      if (!entry) return state
      const newEntries = { ...state.dayEntries, [key]: { ...entry, status: 'finalizado', finalizedAt: new Date().toISOString() } }
      storage.set('day_entries_cache', newEntries)
      return { ...state, dayEntries: newEntries }
    }

    case 'TOGGLE_FAV': {
      const favs = state.favorites.includes(action.id)
        ? state.favorites.filter(x => x !== action.id)
        : [...state.favorites, action.id]
      storage.set('favorites_cache', favs)
      return { ...state, favorites: favs }
    }

    case 'ADD_AUDIT': {
      const log = [{ action: action.action, user: action.user, time: 'Ahora', ts: Date.now() }, ...state.auditLog]
      storage.set('audit_log_local', log)
      return { ...state, auditLog: log }
    }

    default:
      return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, undefined, buildInitialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    async function hydrate() {
      try {
        const [entries, favorites] = await Promise.all([
          entriesService.getAllEntries(1),
          entriesService.getFavorites(),
        ])
        dispatch({ type: 'HYDRATE', dayEntries: entries, favorites })
      } catch (e) {
        console.warn('[StoreContext] Hidratación parcial:', e.message)
      } finally {
        setHydrated(true)
      }
    }
    hydrate()
  }, [])

  return (
    <StoreContext.Provider value={{ state, dispatch, hydrated }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}
