'use strict'

const service = require('./notifications.service')

async function getMyNotifications(req, res, next) {
  try {
    const soloNoLeidas = req.query.unread === 'true'
    const limit  = Math.min(parseInt(req.query.limit  ?? '50', 10), 200)
    const offset = Math.max(parseInt(req.query.offset ?? '0',  10), 0)
    const result = await service.getByUser(req.user.id, { soloNoLeidas, limit, offset })
    res.json({ success: true, data: result.data, pagination: result.pagination })
  } catch (err) { next(err) }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await service.countUnread(req.user.id)
    res.json({ success: true, data: { count } })
  } catch (err) { next(err) }
}

async function markRead(req, res, next) {
  try {
    await service.markRead(parseInt(req.params.id), req.user.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

async function markAllRead(req, res, next) {
  try {
    await service.markAllRead(req.user.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// Solo admin puede disparar recordatorios manuales
async function sendReminder(req, res, next) {
  try {
    const { diasRestantes, fechaCierre } = req.body
    const count = await service.notifyRecordatorioCierre({ diasRestantes, fechaCierre })
    res.json({ success: true, data: { notificados: count } })
  } catch (err) { next(err) }
}

module.exports = { getMyNotifications, getUnreadCount, markRead, markAllRead, sendReminder }
