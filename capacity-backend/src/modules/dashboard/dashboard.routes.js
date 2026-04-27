'use strict'
const { Router }       = require('express')
const ctrl             = require('./dashboard.controller')
const { authenticate } = require('../../middleware/auth')
const { requireJefe }  = require('../../middleware/roles')

const router = Router()
router.use(authenticate)
router.use(requireJefe)
router.get('/equipo',                 ctrl.getEquipo)
router.get('/equipo/:empId/detalle',  ctrl.getEspecialistaDetalle)
module.exports = router
