'use strict'

const service = require('./entries.service')

// ── Entries ────────────────────────────────────────────────────────────────
async function getAllEntries(req, res, next) {
  try {
    const sprintId = req.query.sprint ? parseInt(req.query.sprint) : null
    const entries  = await service.getAllEntries(req.user.id, sprintId)
    res.json({ success: true, data: entries })
  } catch (err) { next(err) }
}

async function getOrCreateEntry(req, res, next) {
  try {
    const dateStr = req.query.date ?? req.body.date ?? null
    if (!dateStr) return res.status(400).json({ success: false, error: 'Se requiere date (YYYY-MM-DD)' })
    const entry = await service.getOrCreateEntry(req.user.id, dateStr)
    res.json({ success: true, data: entry })
  } catch (err) { next(err) }
}

async function saveDraft(req, res, next) {
  try {
    const dateStr = req.query.date ?? req.body.date ?? null
    if (!dateStr) return res.status(400).json({ success: false, error: 'Se requiere date' })
    const entry = await service.saveDraft(req.user.id, dateStr)
    res.json({ success: true, data: entry })
  } catch (err) { next(err) }
}

async function finalizeEntry(req, res, next) {
  try {
    const dateStr = req.query.date ?? req.body.date ?? null
    if (!dateStr) return res.status(400).json({ success: false, error: 'Se requiere date' })
    const entry = await service.finalizeEntry(req.user.id, dateStr, req.user.name)
    res.json({ success: true, data: entry })
  } catch (err) { next(err) }
}

// ── Activities ─────────────────────────────────────────────────────────────
async function addActivity(req, res, next) {
  try {
    const dateStr = req.query.date ?? req.body.date ?? null
    if (!dateStr) return res.status(400).json({ success: false, error: 'Se requiere date' })
    const entry = await service.addTask(req.user.id, dateStr, req.body)
    res.status(201).json({ success: true, data: entry })
  } catch (err) { next(err) }
}

async function updateActivity(req, res, next) {
  try {
    const rawId = req.params.activityId
    if (typeof rawId === 'string' && rawId.startsWith('opt_')) {
      return res.status(400).json({
        success: false,
        error: 'Actividad pendiente de sincronización. Recarga la página.',
        code: 'OPTIMISTIC_ID_NOT_SYNCED',
      })
    }
    const taskId = parseInt(rawId, 10)
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ success: false, error: 'activityId inválido' })
    }
    const { field, value } = req.body
    await service.updateTask(req.user.id, taskId, field, value)
    res.json({ success: true })
  } catch (err) { next(err) }
}

async function deleteActivity(req, res, next) {
  try {
    const rawId = req.params.activityId
    if (typeof rawId === 'string' && rawId.startsWith('opt_')) {
      return res.status(400).json({
        success: false,
        error: 'Actividad pendiente de sincronización. Recarga la página.',
        code: 'OPTIMISTIC_ID_NOT_SYNCED',
      })
    }
    const taskId = parseInt(rawId, 10)
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ success: false, error: 'activityId inválido' })
    }
    await service.deleteTask(req.user.id, taskId)
    res.json({ success: true, message: 'Actividad eliminada' })
  } catch (err) { next(err) }
}

// ── Favorites ──────────────────────────────────────────────────────────────
async function getFavorites(req, res, next) {
  try {
    const favs = await service.getFavorites(req.user.id)
    res.json({ success: true, data: favs })
  } catch (err) { next(err) }
}

async function toggleFavorite(req, res, next) {
  try {
    const result = await service.toggleFavorite(req.user.id, req.params.subcategoryId)
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

async function getHistorico(req, res, next) {
  try {
    const data = await service.getHistorico(req.user.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}


async function reenviarJornada(req, res, next) {
  try {
    const idRegistro = parseInt(req.params.idRegistro)
    const entry = await service.reenviarJornada(req.user.id, idRegistro)
    res.json({ success: true, data: entry })
  } catch (err) { next(err) }
}

module.exports = {
  getAllEntries, getOrCreateEntry,
  saveDraft, finalizeEntry,
  addActivity, updateActivity, deleteActivity,
  getFavorites, toggleFavorite,
  getHistorico,
  reenviarJornada,
}
