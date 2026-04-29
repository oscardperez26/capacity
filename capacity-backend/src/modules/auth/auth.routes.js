'use strict'

const { Router }       = require('express')
const rateLimit        = require('express-rate-limit')
const svc              = require('./auth.service')
const { authenticate } = require('../../middleware/auth')
const { RATE_LIMIT, IS_DEV } = require('../../config/env')

const r = Router()

const authLimiter = rateLimit({
  windowMs:        RATE_LIMIT.windowMs,
  max:             IS_DEV ? RATE_LIMIT.devMax : RATE_LIMIT.authMax,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiados intentos. Espera 15 minutos.' },
})

// POST /api/auth/login
r.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Correo y contraseña son requeridos' })
    const data = await svc.login(email.trim().toLowerCase(), password, req.ip)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// GET /api/auth/me
r.get('/me', authenticate, async (req, res, next) => {
  try {
    const data = await svc.getMe(req.user.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// POST /api/auth/change-password
r.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const data = await svc.changePassword(req.user.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// POST /api/auth/recover
r.post('/recover', authLimiter, async (req, res, next) => {
  try {
    const data = await svc.recoverPassword(req.body.email)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

module.exports = r
