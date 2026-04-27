'use strict'

const { Router }    = require('express')
const svc           = require('./auth.service')
const { authenticate } = require('../../middleware/auth')

const r = Router()

// POST /api/auth/login
r.post('/login', async (req, res, next) => {
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
r.post('/recover', async (req, res, next) => {
  try {
    const data = await svc.recoverPassword(req.body.email)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

module.exports = r
