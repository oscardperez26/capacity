'use strict'

const service = require('./sprints.service')

async function getAll(req, res, next) {
  try {
    const sprints = await service.getAll()
    res.json({ success: true, data: sprints })
  } catch (err) { next(err) }
}

async function getActive(req, res, next) {
  try {
    const sprint = await service.getActive()
    res.json({ success: true, data: sprint })
  } catch (err) { next(err) }
}

async function create(req, res, next) {
  try {
    const { name, startDate, endDate } = req.body
    const sprint = await service.create(
      { name, startDate, endDate },
      req.user.id,
      req.user.name
    )
    res.status(201).json({ success: true, data: sprint })
  } catch (err) { next(err) }
}

async function close(req, res, next) {
  try {
    const sprint = await service.close(
      parseInt(req.params.id),
      req.user.id,
      req.user.name
    )
    res.json({ success: true, data: sprint })
  } catch (err) { next(err) }
}

module.exports = { getAll, getActive, create, close }
