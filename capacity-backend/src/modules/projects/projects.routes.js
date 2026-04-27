'use strict'

const { Router }       = require('express')
const controller       = require('./projects.controller')
const { authenticate } = require('../../middleware/auth')
const { requireJefe }  = require('../../middleware/roles')
const { validate }     = require('../../middleware/validate')

const router = Router()
router.use(authenticate)

router.get ('/',                     controller.getAll)
router.get ('/area/:areaId',         controller.getByArea)
router.post('/',         requireJefe, validate('project'),       controller.create)
router.post('/:id/assign', requireJefe, validate('assignProject'), controller.assignMembers)

module.exports = router
