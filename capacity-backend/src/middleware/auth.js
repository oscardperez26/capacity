'use strict'

const jwt     = require('jsonwebtoken')
const { JWT } = require('../config/env')
const { query } = require('../config/database')

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acceso requerido' })
    }

    const token   = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT.secret)

    const [user] = await query(
      `SELECT
         u.id_usuario                      AS id,
         u.correo                          AS email,
         r.nombre                          AS role,
         CONCAT(e.nombre,' ',e.apellido)   AS name,
         o.NOM_OFICIO                      AS cargo,
         u.estado                          AS active,
         a.area_key                        AS area,
         a.NOM_AREA                        AS areaLabel,
         e.id_empleado
       FROM usuarios u
       JOIN roles     r  ON u.id_rol     = r.id_rol
       JOIN empleados e  ON e.id_usuario = u.id_usuario
       LEFT JOIN oficios o  ON e.id_oficio  = o.id_oficio
       LEFT JOIN areas   a  ON e.id_area    = a.id_area
       WHERE u.id_usuario = ? AND u.estado = 'activo'`,
      [decoded.userId]
    )

    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado o inactivo' })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, error: 'Token expirado', expired: true })
    if (err.name === 'JsonWebTokenError')
      return res.status(401).json({ success: false, error: 'Token inválido' })
    next(err)
  }
}

module.exports = { authenticate }
