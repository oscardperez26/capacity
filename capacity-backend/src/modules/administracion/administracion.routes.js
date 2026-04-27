'use strict'
const { Router }       = require('express')
const ctrl             = require('./administracion.controller')
const { authenticate } = require('../../middleware/auth')
const { requireJefe }  = require('../../middleware/roles')

const r = Router()
r.use(authenticate, requireJefe)

// Períodos
r.get   ('/periodos/equipo',                                            ctrl.getEquipoHabilitar)
r.post  ('/periodos/registro/:idRegistro/habilitar',                    ctrl.habilitarRegistro)
r.post  ('/periodos/crear-y-habilitar',                                 ctrl.crearYHabilitar)
r.post  ('/periodos/empleado/:idEmpleado/semana/:idPeriodo/habilitar',  ctrl.habilitarSemana)

// Proyectos / Iniciativas
r.get   ('/proyectos/oficinas',                                         ctrl.getOficinas)
r.get   ('/proyectos/asignaciones',                                     ctrl.getAsignaciones)
r.post  ('/proyectos/iniciativas',                                      ctrl.crearIniciativa)
r.put   ('/proyectos/iniciativas/:idProyecto',                          ctrl.editarIniciativa)
r.delete('/proyectos/iniciativas/:idProyecto',                          ctrl.eliminarIniciativa)
r.post  ('/proyectos/:idProyecto/asignar',                              ctrl.asignar)
r.delete('/proyectos/:idProyecto/especialista/:idEmpleado',             ctrl.desasignar)

module.exports = r
