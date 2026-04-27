'use strict'

const { Router }       = require('express')
const { query }        = require('../../config/database')
const { authenticate } = require('../../middleware/auth')

const r = Router()
r.use(authenticate)

// ── GET /api/sprints — todos los sprints ──────────────────────────────────
r.get('/', async (req, res, next) => {
  try {
    const sprints = await query(
      `SELECT id_sprint, nombre, fecha_inicio, fecha_fin, estado, creado_en
       FROM sprints ORDER BY id_sprint DESC`
    )
    res.json({ success: true, data: sprints })
  } catch (err) { next(err) }
})

// ── GET /api/sprints/active-week — sprint activo + valida semana actual ───
r.get('/active-week', async (req, res, next) => {
  try {
    // 1. Sprint activo
    const [sprintActivo] = await query(
      `SELECT id_sprint, nombre, fecha_inicio, fecha_fin, estado
       FROM sprints WHERE estado = 'activo' ORDER BY id_sprint DESC LIMIT 1`
    )

    if (!sprintActivo) {
      return res.json({ success: true, data: { sprint: null, periodoCerrado: true } })
    }

    // 2. Verifica si hay un período ABIERTO que cubra la semana actual
    const hoy = new Date().toISOString().split('T')[0]
    const [periodo] = await query(
      `SELECT p.id_periodo, p.numero_semana, p.fecha_inicio, p.fecha_fin, p.estado
       FROM periodos p
       WHERE p.id_sprint = ?
         AND p.estado = 'abierto'
         AND ? BETWEEN p.fecha_inicio AND p.fecha_fin
       LIMIT 1`,
      [sprintActivo.id_sprint, hoy]
    )

    const fmt = v => v ? (v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0]) : null

    res.json({
      success: true,
      data: {
        sprint: {
          id:     sprintActivo.id_sprint,
          nombre: sprintActivo.nombre,
          inicio: fmt(sprintActivo.fecha_inicio),
          fin:    fmt(sprintActivo.fecha_fin),
          estado: sprintActivo.estado,
        },
        periodo: periodo ? {
          id:       periodo.id_periodo,
          semana:   periodo.numero_semana,
          inicio:   fmt(periodo.fecha_inicio),
          fin:      fmt(periodo.fecha_fin),
          estado:   periodo.estado,
        } : null,
        // periodoCerrado = true cuando no hay período abierto para hoy
        periodoCerrado: !periodo,
      }
    })
  } catch (err) { next(err) }
})

// ── GET /api/sprints/active — alias simple ────────────────────────────────
r.get('/active', async (req, res, next) => {
  try {
    const [sp] = await query(
      `SELECT id_sprint, nombre, fecha_inicio, fecha_fin, estado
       FROM sprints WHERE estado = 'activo' ORDER BY id_sprint DESC LIMIT 1`
    )
    const fmt = v => v ? String(v).split('T')[0] : null
    res.json({
      success: true,
      data: sp ? { id: sp.id_sprint, nombre: sp.nombre,
        inicio: fmt(sp.fecha_inicio), fin: fmt(sp.fecha_fin) } : null
    })
  } catch (err) { next(err) }
})

module.exports = r
