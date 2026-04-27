'use strict'

const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const { query } = require('../../config/database')
const { JWT }   = require('../../config/env')
const { logEvent } = require('../audit/audit.service')

const USER_SELECT = `
  SELECT
    u.id_usuario                        AS id,
    u.correo                            AS email,
    u.password_hash,
    u.estado                            AS active,
    u.debe_cambiar_password,
    r.nombre                            AS role,
    e.nombre                            AS firstName,
    e.apellido                          AS lastName,
    CONCAT(e.nombre, ' ', e.apellido)   AS name,
    e.numero_documento,
    o.NOM_OFICIO                        AS cargo,
    a.area_key                          AS area,
    a.NOM_AREA                          AS areaLabel,
    u.ultimo_acceso                     AS lastLogin,
    e.id_empleado
  FROM usuarios u
  JOIN roles     r  ON u.id_rol      = r.id_rol
  JOIN empleados e  ON e.id_usuario  = u.id_usuario
  LEFT JOIN oficios o  ON e.id_oficio   = o.id_oficio
  LEFT JOIN areas   a  ON e.id_area     = a.id_area
`

// ── Login ──────────────────────────────────────────────────────────────────
async function login(email, password, ip) {
  const [user] = await query(USER_SELECT + ' WHERE u.correo = ?', [email])

  if (!user) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 })
  if (user.active !== 'activo') throw Object.assign(new Error('Usuario inactivo. Contacta al administrador'), { status: 403 })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 })

  await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?', [user.id])

  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    JWT.secret,
    { expiresIn: JWT.expiresIn }
  )

  // Auditoría deshabilitada hasta alinear schema de tabla auditoria

  const { password_hash, numero_documento, ...safeUser } = user
  return { token, user: safeUser }
}

// ── Me ─────────────────────────────────────────────────────────────────────
async function getMe(userId) {
  const [user] = await query(
    USER_SELECT + " WHERE u.id_usuario = ? AND u.estado = 'activo'",
    [userId]
  )
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })
  const { password_hash, numero_documento, ...safeUser } = user
  return safeUser
}

// ── Cambiar contraseña ─────────────────────────────────────────────────────
async function changePassword(userId, { passwordNueva }) {
  if (!passwordNueva || passwordNueva.length < 8)
    throw Object.assign(new Error('La nueva contraseña debe tener al menos 8 caracteres'), { status: 400 })

  const [user] = await query(
    `SELECT u.id_usuario, u.password_hash, e.numero_documento
     FROM usuarios u
     JOIN empleados e ON e.id_usuario = u.id_usuario
     WHERE u.id_usuario = ?`,
    [userId]
  )
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 })

  // No permitir que la nueva sea igual al número de documento
  if (String(passwordNueva).trim() === String(user.numero_documento).trim())
    throw Object.assign(new Error('La nueva contraseña no puede ser tu número de documento'), { status: 400 })

  const nuevoHash = await bcrypt.hash(passwordNueva, 10)
  await query(
    'UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 0 WHERE id_usuario = ?',
    [nuevoHash, userId]
  )

  return { ok: true }
}

// ── Recover password ───────────────────────────────────────────────────────
async function recoverPassword(email) {
  const [user] = await query(
    "SELECT id_usuario FROM usuarios WHERE correo = ? AND estado = 'activo'", [email]
  )
  if (!user) return { sent: true }
  console.log(`[Auth] Recuperación solicitada para: ${email}`)
  return { sent: true }
}

module.exports = { login, getMe, changePassword, recoverPassword }
