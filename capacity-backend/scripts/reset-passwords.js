/**
 * scripts/reset-passwords.js
 * Setea la contraseña inicial de cada usuario = su número de documento
 * y marca debe_cambiar_password = 1
 *
 * Uso: node scripts/reset-passwords.js
 * Desde: capacity-backend/
 */
'use strict'

require('dotenv').config()
const bcrypt    = require('bcryptjs')
const { query } = require('./src/config/database')

async function main() {
  console.log('🔑 Reseteando contraseñas iniciales...\n')

  const usuarios = await query(`
    SELECT u.id_usuario, u.correo, e.nombre, e.apellido, e.numero_documento
    FROM usuarios u
    JOIN empleados e ON e.id_usuario = u.id_usuario
    WHERE u.estado = 'activo'
    ORDER BY u.id_usuario
  `)

  if (!usuarios.length) {
    console.log('⚠️  No se encontraron usuarios activos.')
    process.exit(0)
  }

  let ok = 0, err = 0
  for (const u of usuarios) {
    try {
      const doc  = String(u.numero_documento).trim()
      const hash = await bcrypt.hash(doc, 10)
      await query(
        'UPDATE usuarios SET password_hash=?, debe_cambiar_password=1 WHERE id_usuario=?',
        [hash, u.id_usuario]
      )
      console.log(`  ✅ ${u.correo.padEnd(45)} → documento: ${doc}`)
      ok++
    } catch (e) {
      console.error(`  ❌ ${u.correo} → ERROR: ${e.message}`)
      err++
    }
  }

  console.log(`\n✔  ${ok} usuarios actualizados, ${err} errores`)
  console.log('   Contraseña inicial = número de documento de cada usuario')
  console.log('   Al iniciar sesión se les pedirá cambiarla.\n')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
