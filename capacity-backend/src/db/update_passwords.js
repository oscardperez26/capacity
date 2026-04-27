'use strict'
/**
 * update_passwords.js
 * Actualiza el password placeholder de todos los empleados reales con bcrypt.
 * Contraseña temporal: Koaj2026*
 * Uso: node src/db/seeds/update_passwords.js
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { query, pool, testConnection } = require('../../config/database')
const { BCRYPT_ROUNDS } = require('../../config/env')

async function run() {
  console.log('\n🔑 Actualizando contraseñas de empleados reales...\n')
  const ok = await testConnection()
  if (!ok) process.exit(1)

  try {
    const hash = await bcrypt.hash('Koaj2026*', BCRYPT_ROUNDS)
    console.log('   ✓ Hash generado')

    const result = await query(
      `UPDATE usuarios
       SET password_hash = ?
       WHERE id_usuario >= 100
         AND password_hash LIKE '$2a$12$placeholder%'`,
      [hash]
    )
    console.log(`   ✓ ${Number(result.affectedRows)} usuarios actualizados`)

    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM usuarios
       WHERE id_usuario >= 100 AND password_hash LIKE '$2a$12$placeholder%'`
    )
    if (Number(total) === 0) {
      console.log('\n✅ Todos los passwords actualizados.')
      console.log('   Correo:      nombre.apellido@permoda.com.co')
      console.log('   Contraseña:  Koaj2026*\n')
    }
  } finally {
    await pool.end()
  }
}
run().catch(err => { console.error('❌', err.message); process.exit(1) })
