'use strict'
const svc = require('./admin_global.service')

const wrap = fn => async (req, res, next) => {
  try { res.json({ success:true, data: await fn(req) }) }
  catch(err) { next(err) }
}

exports.getGlobalCapacity = wrap(req => svc.getGlobalCapacity({
  filtro:   req.query.filtro   || 'sprint',
  sprintId: req.query.sprintId || null,
  desde:    req.query.desde    || null,
  hasta:    req.query.hasta    || null,
  idArea:   req.query.idArea   || null,
}))
exports.getPortafolio   = wrap(req => svc.getPortafolio())
exports.crearProyecto  = wrap(req => svc.crearProyecto(req.body))
exports.getEmpleadosTI = wrap(req => svc.getEmpleadosTI())
exports.updateLider    = wrap(req => svc.updateProyecto(parseInt(req.params.idProyecto), { id_lider: req.body.idLider||null }, req.user?.id||null))
exports.updateProyecto = wrap(req => svc.updateProyecto(parseInt(req.params.idProyecto), req.body, req.user?.id||null))
exports.getSprints     = wrap(req => svc.getSprints())
exports.crearSprint    = wrap(req => svc.crearSprint(req.user.id, req.body))
exports.activarSprint  = wrap(req => svc.activarSprint(parseInt(req.params.id)))
exports.cerrarSprint   = wrap(req => svc.cerrarSprint(parseInt(req.params.id)))
exports.editarSprint   = wrap(req => svc.editarSprint(parseInt(req.params.id), req.body))
