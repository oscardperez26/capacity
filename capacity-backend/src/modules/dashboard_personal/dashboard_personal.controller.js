'use strict'
const svc = require('./dashboard_personal.service')

async function getDashboard(req, res, next) {
  try {
    const filtro   = req.query.filtro   ?? 'dia'
    const sprintId = req.query.sprintId ? parseInt(req.query.sprintId) : null
    const desde    = req.query.desde    ?? null
    const hasta    = req.query.hasta    ?? null
    const data = await svc.getDashboard(req.user.id, filtro, sprintId, desde, hasta)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

async function getProyectos(req, res, next) {
  try {
    const data = await svc.getProyectos(req.user.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

async function getProyectosSelector(req, res, next) {
  try {
    const data = await svc.getProyectosSelector(req.user.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

module.exports = { getDashboard, getProyectos, getProyectosSelector }
