'use strict'
const svc = require('./dashboard.service')

async function getEquipo(req, res, next) {
  try {
    const { filtro='sprint', sprintId, desde, hasta } = req.query
    const data = await svc.getEquipoDashboard(req.user.id, filtro,
      sprintId ? parseInt(sprintId) : null, desde||null, hasta||null)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

async function getEspecialistaDetalle(req, res, next) {
  try {
    const { empId } = req.params
    const { filtro='sprint', sprintId, desde, hasta } = req.query
    const data = await svc.getEspecialistaDetalle(req.user.id, parseInt(empId), filtro,
      sprintId ? parseInt(sprintId) : null, desde||null, hasta||null)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

module.exports = { getEquipo, getEspecialistaDetalle }
