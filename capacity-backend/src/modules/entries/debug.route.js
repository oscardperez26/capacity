'use strict'
// Ruta temporal de diagnóstico — remover en producción
const { Router } = require('express')
const { query }  = require('../../config/database')
const { authenticate } = require('../../middleware/auth')

const router = Router()
router.use(authenticate)

router.get('/debug-historico', async (req, res) => {
  try {
    const userId = req.user.id

    // 1. Obtiene id_empleado
    const [emp] = await query(
      'SELECT id_empleado FROM empleados WHERE id_usuario = ?', [userId]
    )

    if (!emp) return res.json({ error: 'No se encontró empleado para este usuario', userId })

    // 2. Busca registros del empleado
    const registros = await query(
      `SELECT rd.id_registro, rd.fecha, rd.estado, rd.id_periodo,
              p.id_sprint, p.numero_semana,
              s.nombre AS sprint_nombre, s.estado AS sprint_estado
       FROM registro_dia rd
       JOIN periodos p ON rd.id_periodo = p.id_periodo
       JOIN sprints  s ON p.id_sprint   = s.id_sprint
       WHERE rd.id_empleado = ?
       ORDER BY rd.fecha DESC`,
      [emp.id_empleado]
    )

    // 3. Busca actividades de esos registros
    const actividades = registros.length > 0 ? await query(
      `SELECT a.id_actividad, a.id_registro, a.duracion_mins, a.estado,
              s.nombre AS sub_nombre, s.modelo
       FROM actividades a
       JOIN subcategorias_actividad s ON a.id_subcategoria = s.id_subcategoria
       WHERE a.id_registro IN (${registros.map(() => '?').join(',')})`,
      registros.map(r => r.id_registro)
    ) : []

    res.json({
      userId,
      idEmpleado:   emp.id_empleado,
      totalRegistros: registros.length,
      registros: registros.map(r => ({
        ...r,
        fecha: r.fecha instanceof Date ? r.fecha.toISOString().split('T')[0] : r.fecha
      })),
      totalActividades: actividades.length,
      actividades,
    })
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

module.exports = router
