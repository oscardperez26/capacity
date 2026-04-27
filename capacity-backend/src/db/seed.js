'use strict'

/**
 * seed.js
 * Inserta datos iniciales en la base de datos.
 * Uso: node src/db/seed.js
 * NOTA: genera el hash real de 'demo1234' antes de insertar.
 */

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { query, testConnection, pool } = require('../config/database')
const { BCRYPT_ROUNDS } = require('../config/env')

async function seed() {
  console.log('\n🌱 Ejecutando seeds...\n')

  const ok = await testConnection()
  if (!ok) process.exit(1)

  try {
    // 1. Áreas
    const areas = [
      { key: 'infraestructura', label: 'Infraestructura' },
      { key: 'seguridad',       label: 'Seguridad' },
      { key: 'soporte',         label: 'Soporte' },
      { key: 'aplicaciones',    label: 'Aplicaciones' },
      { key: 'mesi',            label: 'Mesi' },
    ]
    for (const a of areas) {
      await query('INSERT IGNORE INTO areas (area_key, label) VALUES (?, ?)', [a.key, a.label])
    }
    console.log('   ✓ Áreas insertadas')

    // 2. Sprints
    await query(`INSERT IGNORE INTO sprints (id, name, start_date, end_date, status) VALUES
      (5, 'Sprint 5', '2025-02-17', '2025-03-05', 'activo'),
      (4, 'Sprint 4', '2025-02-04', '2025-02-18', 'cerrado'),
      (3, 'Sprint 3', '2025-01-20', '2025-02-03', 'cerrado')`)
    console.log('   ✓ Sprints insertados')

    // 3. Hash de contraseña demo
    const hash = await bcrypt.hash('demo1234', BCRYPT_ROUNDS)
    console.log('   ✓ Hash generado')

    // 4. Usuarios
    const [infraArea]  = await query('SELECT id FROM areas WHERE area_key = ?', ['infraestructura'])
    const [seguArea]   = await query('SELECT id FROM areas WHERE area_key = ?', ['seguridad'])
    const [appArea]    = await query('SELECT id FROM areas WHERE area_key = ?', ['aplicaciones'])
    const [mesiArea]   = await query('SELECT id FROM areas WHERE area_key = ?', ['mesi'])

    const users = [
      { email: 'especialista@permoda.com.co', name: 'Laura Martínez',  role: 'especialista',  cargo: 'Especialista TI',       area_id: infraArea.id },
      { email: 'jefe@permoda.com.co',          name: 'Carlos Ramírez',  role: 'jefe',          cargo: 'Jefe de Área',          area_id: infraArea.id },
      { email: 'admin@permoda.com.co',          name: 'Ana Gómez',       role: 'administrador', cargo: 'PMO Administrator',     area_id: mesiArea.id  },
      { email: 'cdiaz@permoda.com.co',          name: 'Carlos Díaz',     role: 'especialista',  cargo: 'Analista de Redes',     area_id: infraArea.id },
      { email: 'mrivas@permoda.com.co',         name: 'Marta Rivas',     role: 'especialista',  cargo: 'Especialista TI',       area_id: infraArea.id },
      { email: 'alopez@permoda.com.co',         name: 'Andrea López',    role: 'especialista',  cargo: 'Analista de Seguridad', area_id: seguArea.id  },
      { email: 'storres@permoda.com.co',        name: 'Sofia Torres',    role: 'especialista',  cargo: 'Consultor SAP',         area_id: appArea.id   },
      { email: 'agomez2@permoda.com.co',        name: 'Ana Gómez BI',    role: 'especialista',  cargo: 'Analista MESI',         area_id: mesiArea.id  },
    ]

    for (const u of users) {
      await query(
        `INSERT IGNORE INTO users (email, name, password_hash, role, cargo, area_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [u.email, u.name, hash, u.role, u.cargo, u.area_id]
      )
    }
    console.log('   ✓ Usuarios insertados (contraseña: demo1234)')

    // 5. Proyectos
    const projects = [
      { area_key: 'infraestructura', name: 'Migración Core Bancario',  type: 'estrategico' },
      { area_key: 'infraestructura', name: 'Continuidad DR Site',       type: 'operativo'   },
      { area_key: 'seguridad',       name: 'Hardening Servidores',      type: 'estrategico' },
      { area_key: 'aplicaciones',    name: 'Migración SAP S/4HANA',     type: 'estrategico' },
      { area_key: 'aplicaciones',    name: 'Portal E-commerce',         type: 'estrategico' },
      { area_key: 'mesi',            name: 'Dashboard BI Corporativo',  type: 'estrategico' },
      { area_key: 'mesi',            name: 'Integración Datos ERP',     type: 'operativo'   },
    ]

    for (const p of projects) {
      const [area] = await query('SELECT id FROM areas WHERE area_key = ?', [p.area_key])
      if (area) {
        await query(
          'INSERT IGNORE INTO projects (area_id, name, type, status) VALUES (?, ?, ?, ?)',
          [area.id, p.name, p.type, 'activo']
        )
      }
    }
    console.log('   ✓ Proyectos insertados')

    console.log('\n✅ Seeds completados.\n')
    console.log('   Credenciales de acceso:')
    console.log('   especialista@permoda.com.co / demo1234')
    console.log('   jefe@permoda.com.co / demo1234')
    console.log('   admin@permoda.com.co / demo1234\n')

  } finally {
    await pool.end()
  }
}

seed().catch(err => {
  console.error('❌ Error en seeds:', err)
  process.exit(1)
})
