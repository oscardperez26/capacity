'use strict'

const { ROLES } = require('../shared/constants')

/**
 * Fábrica de middleware de roles.
 * Uso: router.get('/ruta', authenticate, requireRole('jefe', 'administrador'), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autenticado' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}`,
      })
    }
    next()
  }
}

// Guards predefinidos
const requireJefe  = requireRole(ROLES.JEFE, ROLES.ADMIN)
const requireAdmin = requireRole(ROLES.ADMIN)
const requireAny   = requireRole(ROLES.ESP, ROLES.JEFE, ROLES.ADMIN)

/**
 * Verifica que el usuario solo acceda a sus propios recursos
 * a menos que sea jefe o admin.
 */
function requireOwnerOrJefe(req, res, next) {
  const { user } = req
  const targetUserId = parseInt(req.params.userId ?? req.body.userId)

  if (user.role === ROLES.ADMIN || user.role === ROLES.JEFE) return next()
  if (user.id === targetUserId) return next()

  return res.status(403).json({
    success: false,
    error: 'Solo puedes acceder a tus propios recursos',
  })
}

module.exports = { requireRole, requireJefe, requireAdmin, requireAny, requireOwnerOrJefe }
