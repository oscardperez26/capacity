'use strict'

const { Router }       = require('express')
const controller       = require('./notifications.controller')
const { authenticate } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/roles')

const router = Router()
router.use(authenticate)

router.get ('/',              controller.getMyNotifications)  // mis notificaciones
router.get ('/unread-count',  controller.getUnreadCount)      // badge de campana
router.post('/:id/read',      controller.markRead)            // marcar una leída
router.post('/read-all',      controller.markAllRead)         // marcar todas leídas
router.post('/send-reminder', requireAdmin, controller.sendReminder) // recordatorio manual

module.exports = router
