/**
 * useSprint.js — v3
 * Fixes:
 * - Mantiene el último sprint conocido en un ref: errores transitorios no borran el sprint
 * - Timeout aumentado de 5s a 12s para conexiones lentas a SQL Server
 * - fetchError distingue "error de red" de "genuinamente sin sprint"
 * - Retry automático silencioso al volver a la pestaña (visibilitychange)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../lib/apiClient'

// ── Construye los días de la semana actual del calendario ─────────────────
function buildCurrentCalendarWeek() {
  const hoy    = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const dow    = hoy.getDay()                     // 0=Dom, 1=Lun...
  const diff   = dow === 0 ? -6 : 1 - dow         // cuántos días hasta el lunes
  const lunes  = new Date(hoy)
  lunes.setDate(hoy.getDate() + diff)

  const SHORTS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const days   = []

  for (let i = 0; i < 7; i++) {                   // Lun a Dom
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      key:       dateStr,
      short:     SHORTS[d.getDay()],
      num:       String(d.getDate()),
      date:      dateStr,
      isToday:   dateStr === hoyStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }

  const lunesStr   = days[0].date
  const viernesStr = days[4].date
  return {
    id:        `week-${lunesStr}`,
    label:     `Semana del ${days[0].num} al ${days[4].num}`,
    dateRange: `${days[0].short} ${days[0].num} — ${days[4].short} ${days[4].num}`,
    isCurrent: true,
    days,
    ini:       lunesStr,
    fin:       viernesStr,
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────
export function useSprint() {
  const [sprint,         setSprint]         = useState(null)
  const [currentWeek,    setCurrentWeek]    = useState(null)
  const [activeDay,      setActiveDay]      = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [periodoCerrado, setPeriodoCerrado] = useState(false)
  const [fetchError,     setFetchError]     = useState(false) // true = error de red/timeout

  // Último sprint cargado con éxito — no se borra en errores transitorios
  const lastKnownSprint = useRef(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const calWeek = buildCurrentCalendarWeek()
      setCurrentWeek(calWeek)

      // Solo resetear el día activo en carga inicial (no en re-fetches silenciosos)
      if (!silent) {
        const todayDay = calWeek.days.find(d => d.isToday)
        setActiveDay(prev => prev ?? todayDay?.key ?? calWeek.days[0]?.key ?? null)
      }

      try {
        const res  = await api.get('/sprints/active-week', {
          signal: AbortSignal.timeout?.(12000), // 12s — suficiente para SQL Server frío
        })
        const data = res.data

        // Respuesta exitosa — actualizar estado
        setFetchError(false)
        if (data?.sprint) {
          lastKnownSprint.current = data.sprint
          setSprint(data.sprint)
          setPeriodoCerrado(data.periodoCerrado === true)
        } else {
          // El backend confirmó que no hay sprint → limpiar sin ambigüedad
          lastKnownSprint.current = null
          setSprint(null)
          setPeriodoCerrado(false)
        }
      } catch (err) {
        const isTransient =
          err.name === 'TimeoutError' ||
          err.name === 'AbortError'   ||
          !(err instanceof ApiError)  ||
          err.status === 0

        // Error transitorio + ya teníamos un sprint → conservar estado anterior
        if (isTransient && lastKnownSprint.current) {
          setFetchError(true)
          return
        }

        // 401/429 → no tiene sentido reintentar
        if (err instanceof ApiError && (err.status === 401 || err.status === 429)) {
          setSprint(null)
          setPeriodoCerrado(true)
          setFetchError(false)
          return
        }

        // Fallback a /sprints cuando el endpoint no existe o hay error de red sin sprint previo
        const shouldFallback = isTransient || err.status === 404
        if (shouldFallback) {
          try {
            const res2    = await api.get('/sprints')
            const sprints = res2.data ?? []
            const activo  = sprints.find(s => s.estado === 'activo')
            const mapped  = activo
              ? { id: activo.id_sprint, nombre: activo.nombre, inicio: activo.fecha_inicio, fin: activo.fecha_fin }
              : null
            lastKnownSprint.current = mapped
            setSprint(mapped)
            setPeriodoCerrado(!activo)
            setFetchError(false)
          } catch {
            // Ambos endpoints fallaron
            if (!lastKnownSprint.current) {
              setSprint(null)
              setPeriodoCerrado(true)
            }
            setFetchError(true)
          }
        } else {
          // Error de servidor (500, etc.)
          if (!lastKnownSprint.current) {
            setSprint(null)
            setPeriodoCerrado(true)
          }
          setFetchError(true)
        }
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => { load() }, [load])

  // Re-fetch silencioso cuando el usuario vuelve a la pestaña
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  return {
    sprint,
    currentWeek,
    activeDay,
    setActiveDay,
    periodoCerrado,
    loading,
    fetchError,        // true = fallo de red, false = estado real del sprint
    reload: load,
  }
}
