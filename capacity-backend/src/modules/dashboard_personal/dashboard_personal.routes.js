'use strict'
const { Router }       = require('express')
const ctrl             = require('./dashboard_personal.controller')
const { authenticate } = require('../../middleware/auth')

const router = Router()
router.use(authenticate)
router.get('/dashboard-personal',     ctrl.getDashboard)
router.get('/mis-proyectos',          ctrl.getProyectos)
router.get('/mis-proyectos/selector', ctrl.getProyectosSelector)
module.exports = router
