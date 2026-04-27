'use strict'
const svc = require('./administracion.service')

const wrap = fn => async (req, res, next) => {
  try { res.json({ success: true, data: await fn(req) }) }
  catch (err) { next(err) }
}

// Períodos
exports.getEquipoHabilitar = wrap(r => svc.getEquipoParaHabilitar(r.user.id))
exports.habilitarRegistro  = wrap(r => svc.habilitarRegistro(r.user.id, parseInt(r.params.idRegistro)))
exports.crearYHabilitar    = wrap(r => svc.crearYHabilitar(r.user.id, parseInt(r.body.idEmpleado), parseInt(r.body.idPeriodo), r.body.fecha))
exports.habilitarSemana    = wrap(r => svc.habilitarSemana(r.user.id, parseInt(r.params.idEmpleado), parseInt(r.params.idPeriodo)))

// Proyectos
exports.getOficinas         = wrap(r => svc.getOficinas(r.user.id))
exports.crearIniciativa     = wrap(r => svc.crearIniciativa(r.user.id, r.body))
exports.editarIniciativa    = wrap(r => svc.editarIniciativa(r.user.id, parseInt(r.params.idProyecto), r.body))
exports.eliminarIniciativa  = wrap(r => svc.eliminarIniciativa(r.user.id, parseInt(r.params.idProyecto)))
exports.asignar             = wrap(r => svc.asignarEspecialistas(r.user.id, parseInt(r.params.idProyecto), r.body.idEmpleados))
exports.desasignar          = wrap(r => svc.desasignarEspecialista(r.user.id, parseInt(r.params.idProyecto), parseInt(r.params.idEmpleado)))
exports.getAsignaciones     = wrap(r => svc.getAsignacionesEquipo(r.user.id))
