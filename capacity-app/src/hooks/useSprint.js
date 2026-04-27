/**
 * useSprint.js — v2 REAL API
 * - Llama al backend para obtener el sprint activo
 * - Calcula la semana REAL del calendario (semana en curso según la fecha de hoy)
 * - Si no hay sprint activo o el periodo está cerrado, sprint = null
 * - Los días mostrados siempre son los de la semana actual del calendario
 */

import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../lib/apiClient'

// ── Construye los días de la semana actual del calendario ─────────────────
function buildCurrentCalendarWeek() {
  const hoy   = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const dow   = hoy.getDay()                          // 0=Dom, 1=Lun...
  const diff  = dow === 0 ? -6 : 1 - dow              // cuántos días hasta el lunes
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diff)

  const SHORTS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const days = []

  for (let i = 0; i < 7; i++) {                       // Lun a Dom
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      key:     dateStr,
      short:   SHORTS[d.getDay()],
      num:     String(d.getDate()),
      date:    dateStr,
      isToday: dateStr === hoyStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }

  const lunesStr  = days[0].date
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
  const [sprint,      setSprint]      = useState(null)      // sprint activo o null
  const [currentWeek, setCurrentWeek] = useState(null)      // semana actual del calendario
  const [activeDay,   setActiveDay]   = useState(null)      // día seleccionado (key = fecha)
  const [loading,     setLoading]     = useState(true)
  const [periodoCerrado, setPeriodoCerrado] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Semana del calendario SIEMPRE se muestra (independiente del sprint)
      const calWeek = buildCurrentCalendarWeek()
      setCurrentWeek(calWeek)

      // 2. Día de hoy por defecto (primer día laborable de la semana o hoy si está)
      const hoyStr  = new Date().toISOString().split('T')[0]
      const todayDay = calWeek.days.find(d => d.isToday)
      setActiveDay(todayDay?.key ?? calWeek.days[0]?.key ?? null)

      // 3. Verifica si hay sprint activo y si la semana actual tiene periodo abierto
      try {
        const res = await api.get('/sprints/active-week', {
          signal: AbortSignal.timeout?.(5000),
        })
        const data = res.data

        if (data?.sprint) {
          setSprint(data.sprint)
          setPeriodoCerrado(data.periodoCerrado === true)
        } else {
          setSprint(null)
          setPeriodoCerrado(false)
        }
      } catch (err) {
        // 429 = rate limit: no disparar fallback, el backend está vivo
        // 401 = no autorizado: no tiene sentido reintentar
        if (err instanceof ApiError && (err.status === 429 || err.status === 401)) {
          setSprint(null)
          setPeriodoCerrado(true)
          return
        }
        // Fallback a /sprints solo si el endpoint no existe (404) o hay error de red (0)
        const shouldFallback = !(err instanceof ApiError) || err.status === 0 || err.status === 404
        if (shouldFallback) {
          try {
            const res2 = await api.get('/sprints')
            const sprints = res2.data ?? []
            const activo  = sprints.find(s => s.estado === 'activo')
            setSprint(activo ? { id: activo.id_sprint, nombre: activo.nombre, inicio: activo.fecha_inicio, fin: activo.fecha_fin } : null)
            setPeriodoCerrado(!activo)
          } catch {
            setSprint(null)
            setPeriodoCerrado(true)
          }
        } else {
          setSprint(null)
          setPeriodoCerrado(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return {
    sprint,           // null si no hay sprint activo
    currentWeek,      // siempre tiene los días de la semana actual del calendario
    activeDay,        // día seleccionado por defecto (hoy)
    setActiveDay,
    periodoCerrado,   // true si no hay período abierto para esta semana
    loading,
    reload: load,
  }
}
