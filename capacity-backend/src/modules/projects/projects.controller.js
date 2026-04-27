'use strict'

const service = require('./projects.service')

async function getByArea(req, res, next) {
  try {
    const projects = await service.getByArea(parseInt(req.params.areaId))
    res.json({ success: true, data: projects })
  } catch (err) { next(err) }
}

async function getAll(req, res, next) {
  try {
    const projects = await service.getAll()
    res.json({ success: true, data: projects })
  } catch (err) { next(err) }
}

async function create(req, res, next) {
  try {
    const project = await service.create(req.body, req.user.id, req.user.name)
    res.status(201).json({ success: true, data: project })
  } catch (err) { next(err) }
}

async function assignMembers(req, res, next) {
  try {
    const project = await service.assignMembers(
      parseInt(req.params.id),
      req.body.userIds,
      req.user.id,
      req.user.name
    )
    res.json({ success: true, data: project })
  } catch (err) { next(err) }
}

module.exports = { getByArea, getAll, create, assignMembers }
