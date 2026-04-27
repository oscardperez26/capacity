'use strict'

const { Router }       = require('express')
const controller       = require('./audit.controller')
const { authenticate } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/roles')

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/',       controller.getLog)
router.get('/stats',  controller.getStats)

module.exports = router
