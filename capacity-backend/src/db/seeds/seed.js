'use strict'
/**
 * seed.js v2.0 — Esquema relacional completo
 * Uso: node src/db/seeds/seed.js  (desde capacity-backend/)
 */

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { query, pool, testConnection } = require('../../config/database')
const { BCRYPT_ROUNDS } = require('../../config/env')

async function seed() {
  console.log('\n🌱 Ejecutando seeds v2.0...\n')
  const ok = await testConnection()
  if (!ok) process.exit(1)

  try {
    // ── 1. Roles ──────────────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO roles (id_rol, nombre) VALUES
      (1, 'admin'),
      (2, 'jefe'),
      (3, 'especialista')`)
    console.log('   ✓ Roles')

    // ── 2. Departamentos ──────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO departamentos (id_departamento, nombre) VALUES
      (1, 'Tecnología e Información')`)
    console.log('   ✓ Departamentos')

    // ── 3. Áreas ──────────────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO areas
      (id_area, nombre, area_key, id_departamento) VALUES
      (1, 'Infraestructura', 'infraestructura', 1),
      (2, 'Seguridad',       'seguridad',        1),
      (3, 'Soporte',         'soporte',          1),
      (4, 'Aplicaciones',    'aplicaciones',     1),
      (5, 'Mesi',            'mesi',             1)`)
    console.log('   ✓ Áreas')

    // ── 4. Cargos ─────────────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO cargos (id_cargo, nombre) VALUES
      (1,  'Jefe de Infraestructura'),
      (2,  'Especialista TI'),
      (3,  'Analista de Redes'),
      (4,  'Jefe de Seguridad'),
      (5,  'Analista de Seguridad'),
      (6,  'Especialista Ciberseguridad'),
      (7,  'Jefe de Soporte'),
      (8,  'Técnico de Soporte'),
      (9,  'Analista N2'),
      (10, 'Jefe de Aplicaciones'),
      (11, 'Desarrollador Senior'),
      (12, 'Analista Funcional'),
      (13, 'Consultor SAP'),
      (14, 'Jefe Mesi'),
      (15, 'Analista MESI'),
      (16, 'Especialista BI'),
      (17, 'PMO Administrator')`)
    console.log('   ✓ Cargos')

    // ── 5. Categorías de actividad ────────────────────────────────────────
    await query(`INSERT IGNORE INTO categorias_actividad
      (id_categoria, nombre, color, orden) VALUES
      (1, 'Operación',              '#3E5D9D', 1),
      (2, 'Proyectos y Mejora',     '#30693B', 2),
      (3, 'Gestión y Coordinación', '#D65830', 3),
      (4, 'Desarrollo Profesional', '#4554A1', 4),
      (5, 'Ausencias',              '#992C26', 5)`)
    console.log('   ✓ Categorías de actividad')

    // ── 6. Subcategorías ──────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO subcategorias_actividad
      (id_subcategoria, id_categoria, nombre, modelo, requiere_proyecto) VALUES
      (1,  1, 'Incidentes',                    'RUN',   0),
      (2,  1, 'Requerimientos',                'RUN',   0),
      (3,  1, 'Problemas',                     'RUN',   0),
      (4,  1, 'Cambios',                       'RUN',   0),
      (5,  1, 'Soporte técnico',               'RUN',   0),
      (6,  1, 'Monitoreo',                     'RUN',   0),
      (7,  1, 'Disponibilidad fuera turno',    'RUN',   0),
      (8,  1, 'Administración plataformas',    'ADMIN', 0),
      (9,  2, 'Proyectos estratégicos',        'BUILD', 1),
      (10, 2, 'Proyectos continuidad operativa','BUILD',1),
      (11, 3, 'Seguimiento / Planeación',      'ADMIN', 0),
      (12, 3, 'Comités (CAB, ECAB)',            'ADMIN', 0),
      (13, 3, 'Reuniones internas',             'ADMIN', 0),
      (14, 3, 'Reuniones externas',             'ADMIN', 0),
      (15, 3, 'Reportes e informes',            'ADMIN', 0),
      (16, 3, 'Gestión documental',             'ADMIN', 0),
      (17, 3, 'Tareas administrativas',         'ADMIN', 0),
      (18, 3, 'Proveedores y contratos',        'ADMIN', 0),
      (19, 3, 'Compras',                        'ADMIN', 0),
      (20, 3, 'Auditorías',                     'ADMIN', 0),
      (21, 3, 'Gestión de activos',             'ADMIN', 0),
      (22, 4, 'Cursos / Certificaciones',       'GROW',  0),
      (23, 4, 'POCs Mejora continua',           'GROW',  0),
      (24, 5, 'Vacaciones',                     'OFF',   0),
      (25, 5, 'Incapacidades',                  'OFF',   0),
      (26, 5, 'Permisos',                       'OFF',   0),
      (27, 5, 'Festivos',                       'OFF',   0)`)
    console.log('   ✓ Subcategorías de actividad')

    // ── 7. Hash de contraseña ─────────────────────────────────────────────
    const hash = await bcrypt.hash('demo1234', BCRYPT_ROUNDS)
    console.log('   ✓ Hash generado')

    // ── 8. Usuarios ───────────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO usuarios
      (id_usuario, correo, password_hash, id_rol, estado) VALUES
      (1,  'admin@permoda.com.co',           '${hash}', 1, 'activo'),
      (2,  'jefe@permoda.com.co',            '${hash}', 2, 'activo'),
      (3,  'jefe.seg@permoda.com.co',        '${hash}', 2, 'activo'),
      (4,  'jefe.sop@permoda.com.co',        '${hash}', 2, 'activo'),
      (5,  'jefe.app@permoda.com.co',        '${hash}', 2, 'activo'),
      (6,  'jefe.mesi@permoda.com.co',       '${hash}', 2, 'activo'),
      (7,  'especialista@permoda.com.co',    '${hash}', 3, 'activo'),
      (8,  'cdiaz@permoda.com.co',           '${hash}', 3, 'activo'),
      (9,  'mrivas@permoda.com.co',          '${hash}', 3, 'activo'),
      (10, 'alopez@permoda.com.co',          '${hash}', 3, 'activo'),
      (11, 'pmendoza@permoda.com.co',        '${hash}', 3, 'activo'),
      (12, 'jperez@permoda.com.co',          '${hash}', 3, 'activo'),
      (13, 'lcastro@permoda.com.co',         '${hash}', 3, 'activo'),
      (14, 'storres@permoda.com.co',         '${hash}', 3, 'activo'),
      (15, 'dherrera@permoda.com.co',        '${hash}', 3, 'activo'),
      (16, 'cruiz@permoda.com.co',           '${hash}', 3, 'activo'),
      (17, 'agomez@permoda.com.co',          '${hash}', 3, 'activo'),
      (18, 'rsilva@permoda.com.co',          '${hash}', 3, 'activo')`)
    console.log('   ✓ Usuarios (contraseña: demo1234)')

    // ── 9. Empleados ──────────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO empleados
      (id_empleado, codigo_empleado, tipo_documento, numero_documento,
       nombre, apellido, id_cargo, id_area, id_departamento, id_jefe, id_usuario, activo)
      VALUES
      (1,  'EMP001','CC','10000001','Ana',    'Gómez',    17, 5, 1, NULL, 1,  1),
      (2,  'EMP002','CC','10000002','Carlos', 'Ramírez',  1,  1, 1, NULL, 2,  1),
      (3,  'EMP003','CC','10000003','Pedro',  'Sánchez',  4,  2, 1, NULL, 3,  1),
      (4,  'EMP004','CC','10000004','María',  'Rodríguez',7,  3, 1, NULL, 4,  1),
      (5,  'EMP005','CC','10000005','Luis',   'Morales',  10, 4, 1, NULL, 5,  1),
      (6,  'EMP006','CC','10000006','Jorge',  'Vargas',   14, 5, 1, NULL, 6,  1),
      (7,  'EMP007','CC','10000007','Laura',  'Martínez', 2,  1, 1, 2,   7,  1),
      (8,  'EMP008','CC','10000008','Carlos', 'Díaz',     3,  1, 1, 2,   8,  1),
      (9,  'EMP009','CC','10000009','Marta',  'Rivas',    2,  1, 1, 2,   9,  1),
      (10, 'EMP010','CC','10000010','Andrea', 'López',    5,  2, 1, 3,   10, 1),
      (11, 'EMP011','CC','10000011','Pablo',  'Mendoza',  6,  2, 1, 3,   11, 1),
      (12, 'EMP012','CC','10000012','Juan',   'Pérez',    8,  3, 1, 4,   12, 1),
      (13, 'EMP013','CC','10000013','Luisa',  'Castro',   9,  3, 1, 4,   13, 1),
      (14, 'EMP014','CC','10000014','Sofia',  'Torres',   13, 4, 1, 5,   14, 1),
      (15, 'EMP015','CC','10000015','Diego',  'Herrera',  12, 4, 1, 5,   15, 1),
      (16, 'EMP016','CC','10000016','Camila', 'Ruiz',     11, 4, 1, 5,   16, 1),
      (17, 'EMP017','CC','10000017','Ana',    'Gómez',    15, 5, 1, 6,   17, 1),
      (18, 'EMP018','CC','10000018','Roberto','Silva',    16, 5, 1, 6,   18, 1)`)
    console.log('   ✓ Empleados')

    // ── 10. Sprint dinámico (semana actual) ───────────────────────────────
    const now       = new Date()
    const dayOfWeek = now.getDay()                         // 0=dom,1=lun...
    const diffLun   = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const lunes     = new Date(now)
    lunes.setDate(now.getDate() + diffLun)
    lunes.setHours(0, 0, 0, 0)

    const fmt = d => d.toISOString().split('T')[0]

    // Sprint: lunes actual → domingo +13 días (2 semanas)
    const sprintStart   = fmt(lunes)
    const sprintEnd     = fmt(new Date(lunes.getTime() + 13 * 86400000))

    // Semana 1: lunes → domingo
    const sem1Inicio    = fmt(lunes)
    const sem1Fin       = fmt(new Date(lunes.getTime() +  6 * 86400000))

    // Semana 2: lunes+7 → domingo+13
    const sem2Inicio    = fmt(new Date(lunes.getTime() +  7 * 86400000))
    const sem2Fin       = fmt(new Date(lunes.getTime() + 13 * 86400000))

    await query(
      `INSERT IGNORE INTO sprints
       (id_sprint, nombre, fecha_inicio, fecha_fin, estado) VALUES (1,?,?,?,'activo')`,
      ['Sprint 1', sprintStart, sprintEnd]
    )
    await query(
      `INSERT IGNORE INTO periodos
       (id_periodo, id_sprint, fecha_inicio, fecha_fin, numero_semana, estado) VALUES
       (1, 1, ?, ?, 1, 'abierto'),
       (2, 1, ?, ?, 2, 'abierto')`,
      [sem1Inicio, sem1Fin, sem2Inicio, sem2Fin]
    )
    console.log(`   ✓ Sprint activo  : ${sprintStart} → ${sprintEnd}`)
    console.log(`     Semana 1       : ${sem1Inicio} → ${sem1Fin}`)
    console.log(`     Semana 2       : ${sem2Inicio} → ${sem2Fin}`)

    // ── 11. Proyectos ─────────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO proyectos
      (id_proyecto, id_area, nombre, tipo, estado, creado_por) VALUES
      (1, 1, 'Migración Core Bancario',  'estrategico', 'activo', 2),
      (2, 1, 'Continuidad DR Site',      'operativo',   'activo', 2),
      (3, 2, 'Hardening Servidores',     'estrategico', 'activo', 3),
      (4, 3, 'Portal Autoservicio IT',   'operativo',   'activo', 4),
      (5, 4, 'Migración SAP S/4HANA',    'estrategico', 'activo', 5),
      (6, 4, 'Portal E-commerce',        'estrategico', 'activo', 5),
      (7, 5, 'Dashboard BI Corporativo', 'estrategico', 'activo', 6),
      (8, 5, 'Integración Datos ERP',    'operativo',   'activo', 6)`)
    console.log('   ✓ Proyectos')

    // ── 12. Asignaciones ──────────────────────────────────────────────────
    await query(`INSERT IGNORE INTO empleado_proyecto
      (id_empleado, id_proyecto, activo) VALUES
      (7,  1, 1),(8,  1, 1),
      (7,  2, 1),(9,  2, 1),
      (10, 3, 1),
      (12, 4, 1),
      (14, 5, 1),(15, 5, 1),
      (16, 6, 1),
      (17, 7, 1),(18, 7, 1),
      (17, 8, 1)`)
    console.log('   ✓ Asignaciones de proyectos')

    // ── 13. Notificaciones iniciales ──────────────────────────────────────
    const diasRestantes = Math.ceil(
      (new Date(sprintEnd) - new Date()) / (1000 * 60 * 60 * 24)
    )
    const espUsers = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    for (const uid of espUsers) {
      await query(
        `INSERT IGNORE INTO notificaciones
         (id_usuario, tipo, mensaje, metadata) VALUES (?, 'cierre_sprint', ?, ?)`,
        [
          uid,
          `El sprint activo cierra el ${sprintEnd}. Tienes ${diasRestantes} días para registrar tus actividades.`,
          JSON.stringify({ id_sprint: 1, dias_restantes: diasRestantes, fecha_cierre: sprintEnd }),
        ]
      )
    }
    console.log('   ✓ Notificaciones iniciales')

    console.log(`
╔══════════════════════════════════════════════════════╗
║   ✅  Seeds v2.0 completados                         ║
╠══════════════════════════════════════════════════════╣
║   Credenciales (contraseña: demo1234)                ║
║   admin@permoda.com.co        → Administrador PMO   ║
║   jefe@permoda.com.co         → Jefe Infraestructura║
║   especialista@permoda.com.co → Especialista TI     ║
╚══════════════════════════════════════════════════════╝
    `)
  } catch (err) {
    console.error('\n❌ Error en seed:', err.message)
    console.error(err)
  } finally {
    await pool.end()
  }
}

seed()