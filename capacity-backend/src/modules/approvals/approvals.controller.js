'use strict'
const svc = require('./approvals.service')

async function getPendientes(req, res, next) {
  try { res.json({ success:true, data: await svc.getPendientes(req.user.id) }) }
  catch (err) { next(err) }
}
async function aprobar(req, res, next) {
  try {
    const result = await svc.aprobar(req.user.id, parseInt(req.params.idRegistro), req.body.comentario)
    res.json({ success:true, data: result })
  } catch (err) { next(err) }
}
async function rechazar(req, res, next) {
  try {
    const result = await svc.rechazar(req.user.id, parseInt(req.params.idRegistro), req.body.comentario)
    res.json({ success:true, data: result })
  } catch (err) { next(err) }
}
async function aprobarTodo(req, res, next) {
  try {
    const result = await svc.aprobarTodo(req.user.id, parseInt(req.params.idEmpleado))
    res.json({ success:true, data: result })
  } catch (err) { next(err) }
}
async function aprobarSemana(req, res, next) {
  try {
    const { idEmpleado, idPeriodo } = req.params
    const result = await svc.aprobarSemana(req.user.id, parseInt(idEmpleado), parseInt(idPeriodo))
    res.json({ success:true, data: result })
  } catch (err) { next(err) }
}
async function aprobarSprint(req, res, next) {
  try {
    const { idEmpleado, idSprint } = req.params
    const result = await svc.aprobarSprint(req.user.id, parseInt(idEmpleado), parseInt(idSprint))
    res.json({ success:true, data: result })
  } catch (err) { next(err) }
}
async function getHistorico(req, res, next) {
  try {
    const limit  = Math.min(parseInt(req.query.limit  ?? '3',  10), 10)
    const offset = Math.max(parseInt(req.query.offset ?? '0',  10), 0)
    const result = await svc.getHistorico(req.user.id, { limit, offset })
    res.json({ success: true, data: result.data, pagination: result.pagination })
  } catch (err) { next(err) }
}

module.exports = { getPendientes, aprobar, rechazar, aprobarTodo, aprobarSemana, aprobarSprint, getHistorico }
