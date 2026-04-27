'use strict'

const authService = require('./auth.service')

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const ip = req.ip || req.connection.remoteAddress
    const result = await authService.login(email, password, ip)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

async function logout(req, res, next) {
  try {
    // Con JWT stateless el logout lo maneja el cliente borrando el token.
    // Aquí se podría agregar a una blacklist (Redis) en el futuro.
    res.json({ success: true, message: 'Sesión cerrada' })
  } catch (err) { next(err) }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id)
    res.json({ success: true, user })
  } catch (err) { next(err) }
}

async function recoverPassword(req, res, next) {
  try {
    const { email } = req.body
    await authService.recoverPassword(email)
    res.json({ success: true, message: 'Si el correo existe, recibirás instrucciones' })
  } catch (err) { next(err) }
}

module.exports = { login, logout, me, recoverPassword }
