'use strict'

const { Router }       = require('express')
const controller       = require('./entries.controller')
const { authenticate } = require('../../middleware/auth')

const router = Router()
router.use(authenticate)

// Jornadas — el parámetro date=YYYY-MM-DD va en query string
router.get ('/historico',                     controller.getHistorico)
router.get ('/',                              controller.getAllEntries)
router.get ('/:dayKey',                       controller.getOrCreateEntry)
router.post('/:dayKey/draft',                 controller.saveDraft)
router.post('/:dayKey/finalize',              controller.finalizeEntry)

// Actividades
router.post  ('/:dayKey/activities',          controller.addActivity)
router.patch ('/activities/:activityId',      controller.updateActivity)
router.delete('/activities/:activityId',      controller.deleteActivity)

// Favoritos
router.post  ('/reenviar/:idRegistro',        controller.reenviarJornada)
router.get   ('/favorites/list',              controller.getFavorites)
router.post  ('/favorites/:subcategoryId/toggle', controller.toggleFavorite)

module.exports = router
