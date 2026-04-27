'use strict'
const { Router }       = require('express')
const ctrl             = require('./admin_global.controller')
const { authenticate } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/roles')

const r = Router()
r.use(authenticate, requireAdmin)

// Global Capacity
r.get ('/capacity',                  ctrl.getGlobalCapacity)

// Portafolio
r.get ('/portafolio',                ctrl.getPortafolio)
r.patch('/portafolio/:idProyecto',   ctrl.updateProyecto)
r.post ('/portafolio',                 ctrl.crearProyecto)
r.patch('/portafolio/:idProyecto/lider', ctrl.updateLider)
r.get  ('/empleados-ti',               ctrl.getEmpleadosTI)

// Sprints
r.get ('/sprints',                   ctrl.getSprints)
r.post('/sprints',                   ctrl.crearSprint)
r.put ('/sprints/:id',               ctrl.editarSprint)
r.post('/sprints/:id/activar',       ctrl.activarSprint)
r.post('/sprints/:id/cerrar',        ctrl.cerrarSprint)

module.exports = r
