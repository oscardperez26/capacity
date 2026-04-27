import { SPRINT_ACTIVO } from '../data/mockData'

export const getTodayStr = () => new Date().toISOString().split('T')[0]

export const getTodayKey = (weekDays) => {
  const today = getTodayStr()
  const found = weekDays.find((d) => d.date === today)
  return found ? found.key : weekDays[0].key
}

export const getInitialActiveDay = () =>
  getTodayKey(SPRINT_ACTIVO.weeks.find((w) => w.isCurrent)?.days ?? SPRINT_ACTIVO.weeks[0].days)

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
