export const STANDARD_MINUTES = 480 // 8 hours

export const minsToH = (m) => (m / 60).toFixed(1)

export const pctClass = (p) => (p > 100 ? 'overflow' : p > 80 ? 'warn' : 'ok')

export const progClass = (p) =>
  p > 100 ? 'prog-danger' : p > 80 ? 'prog-warn' : 'prog-normal'

export const barClass = (p) =>
  p > 100 ? 'bar-danger' : p > 80 ? 'bar-warn' : 'bar-success'

export const pctColor = (p) =>
  p > 100 ? 'var(--c-danger2)' : p > 80 ? 'var(--c-warn)' : 'var(--c-success)'

export const loadPctClass = (p) =>
  p > 100 ? 'pct-over' : p > 80 ? 'pct-warn' : 'pct-ok'

export const calcCapacity = (tasks = []) => {
  const total = tasks.reduce((a, t) => a + (parseInt(t.dur) || 0), 0)
  const pct = (total / STANDARD_MINUTES) * 100
  return { total, pct }
}

export const addRipple = (e) => {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const d = Math.max(rect.width, rect.height)
  const r = document.createElement('span')
  r.className = 'btn-ripple'
  r.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`
  btn.appendChild(r)
  setTimeout(() => r.remove(), 600)
}
