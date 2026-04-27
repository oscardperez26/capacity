'use strict'

const service = require('./audit.service')

async function getLog(req, res, next) {
  try {
    const { from, to, type, userId, limit, offset } = req.query
    const result = await service.getLog({ from, to, type, userId, limit, offset })
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

async function getStats(req, res, next) {
  try {
    const stats = await service.getStats()
    res.json({ success: true, data: stats })
  } catch (err) { next(err) }
}

module.exports = { getLog, getStats }
