'use strict'
const { Router }      = require('express')
const ctrl            = require('./approvals.controller')
const { authenticate} = require('../../middleware/auth')
const { requireJefe } = require('../../middleware/roles')

const router = Router()
router.use(authenticate, requireJefe)

router.get ('/pendientes',                                      ctrl.getPendientes)
router.get ('/historico',                                       ctrl.getHistorico)
router.post('/registro/:idRegistro/aprobar',                    ctrl.aprobar)
router.post('/registro/:idRegistro/rechazar',                   ctrl.rechazar)
router.post('/empleado/:idEmpleado/aprobar-todo',               ctrl.aprobarTodo)
router.post('/empleado/:idEmpleado/sprint/:idSprint/aprobar',   ctrl.aprobarSprint)
router.post('/empleado/:idEmpleado/semana/:idPeriodo/aprobar',  ctrl.aprobarSemana)

module.exports = router
