/**
 * validators.js
 * Validaciones de formularios y reglas de negocio.
 * Retorna { valid: boolean, errors: { field: string } }
 */

// ── Auth ───────────────────────────────────────────────────────────────────
export function validateLogin({ email, password }) {
  const errors = {}

  if (!email?.trim()) {
    errors.email = 'El correo es obligatorio'
  } else if (!email.endsWith('@permoda.com.co')) {
    errors.email = 'Debes usar tu correo @permoda.com.co'
  }

  if (!password?.trim()) {
    errors.password = 'La contraseña es obligatoria'
  } else if (password.length < 6) {
    errors.password = 'Mínimo 6 caracteres'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateRecover({ email }) {
  const errors = {}

  if (!email?.trim()) {
    errors.email = 'El correo es obligatorio'
  } else if (!email.endsWith('@permoda.com.co')) {
    errors.email = 'Debes usar tu correo @permoda.com.co'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Activity ───────────────────────────────────────────────────────────────
export function validateActivity(task) {
  const errors = {}

  const dur = parseInt(task.dur) || 0

  if (dur < 1) {
    errors.dur = 'La duración mínima es 1 minuto'
  }
  if (dur > 1440) {
    errors.dur = 'La duración máxima es 1440 minutos (24h)'
  }
  if (dur > 240 && !task.desc?.trim()) {
    errors.desc = 'Observación obligatoria para actividades mayores a 240 minutos'
  }
  if (task.catId === 'proyecto' && !task.projectId) {
    errors.projectId = 'Debes asociar un proyecto'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Day finalization ───────────────────────────────────────────────────────
export function validateDayFinalization(tasks = []) {
  const errors = []

  if (tasks.length === 0) {
    errors.push('Debes registrar al menos una actividad')
  }

  tasks.forEach(t => {
    const { errors: taskErrors } = validateActivity(t)
    if (Object.keys(taskErrors).length > 0) {
      errors.push(`"${t.name}": ${Object.values(taskErrors).join(', ')}`)
    }
  })

  return { valid: errors.length === 0, errors }
}

// ── Sprint ─────────────────────────────────────────────────────────────────
export function validateSprint({ name, start, end }) {
  const errors = {}

  if (!name?.trim()) errors.name = 'El nombre es obligatorio'

  if (start && end && new Date(start) >= new Date(end)) {
    errors.end = 'La fecha de fin debe ser posterior al inicio'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Project ────────────────────────────────────────────────────────────────
export function validateProject({ name }) {
  const errors = {}
  if (!name?.trim()) errors.name = 'El nombre del proyecto es obligatorio'
  if (name?.trim().length > 100) errors.name = 'Máximo 100 caracteres'
  return { valid: Object.keys(errors).length === 0, errors }
}
