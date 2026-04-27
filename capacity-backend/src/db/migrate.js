'use strict'

/**
 * migrate.js
 * Uso:
 *   node src/db/migrate.js --fresh --with-data --check
 */

require('dotenv').config({ override: true })
const fs = require('fs')
const path = require('path')
const { DB } = require('../config/env')
const { query, testConnection, pool } = require('../config/database')

const isFresh = process.argv.includes('--fresh')
const withData = process.argv.includes('--with-data')
const withChecks = process.argv.includes('--check')

const SQLSERVER_DIR = path.join(__dirname, 'migrations', 'sqlserver')
const SCRIPT_01 = path.join(SQLSERVER_DIR, '01_schema_sqlserver.sql')
const SCRIPT_02 = path.join(SQLSERVER_DIR, '02_constraints_indexes_sqlserver.sql')
const SCRIPT_03 = path.join(SQLSERVER_DIR, '03_data_sqlserver.sql')
const SCRIPT_04 = path.join(SQLSERVER_DIR, '04_postload_checks.sql')

function splitBatches(sqlText) {
  return sqlText
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function runScriptFile(filePath) {
  const exists = fs.existsSync(filePath)
  if (!exists) throw new Error(`No existe el script: ${filePath}`)

  const sql = fs.readFileSync(filePath, 'utf8')
  const batches = splitBatches(sql)

  console.log(`\n[DB] Ejecutando ${path.basename(filePath)} (${batches.length} lotes)`)

  for (let i = 0; i < batches.length; i++) {
    await query(batches[i])
  }

  console.log(`[DB] OK ${path.basename(filePath)}`)
}

async function dropAllSqlServerTables() {
  console.log('[DB] --fresh: eliminando tablas SQL Server...')
  await query(`
    DECLARE @sqlFk NVARCHAR(MAX) = N'';
    SELECT @sqlFk = @sqlFk +
      N'ALTER TABLE [' + SCHEMA_NAME(t.schema_id) + N'].[' + t.name +
      N'] DROP CONSTRAINT [' + fk.name + N'];' + CHAR(10)
    FROM sys.foreign_keys fk
    INNER JOIN sys.tables t ON t.object_id = fk.parent_object_id;

    IF LEN(@sqlFk) > 0 EXEC sp_executesql @sqlFk;

    DECLARE @sqlTables NVARCHAR(MAX) = N'';
    SELECT @sqlTables = @sqlTables + N'DROP TABLE [' + s.name + '].[' + t.name + '];' + CHAR(10)
    FROM sys.tables t
    INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo'
    ORDER BY t.name DESC;

    IF LEN(@sqlTables) > 0 EXEC sp_executesql @sqlTables;
  `)
  console.log('[DB] Tablas eliminadas.')
}

async function runSqlServerMigration() {
  console.log('\n[DB] Migracion SQL Server iniciada\n')

  const ok = await testConnection()
  if (!ok) process.exit(1)

  if (isFresh) {
    await dropAllSqlServerTables()
  }

  await runScriptFile(SCRIPT_01)

  if (withData) {
    await runScriptFile(SCRIPT_03)
  }

  await runScriptFile(SCRIPT_02)

  if (withChecks) {
    await runScriptFile(SCRIPT_04)
  }

  console.log('\n[DB] Migracion SQL Server completada.')
  console.log('     Flags usadas:')
  console.log(`     --fresh: ${isFresh ? 'si' : 'no'}`)
  console.log(`     --with-data: ${withData ? 'si' : 'no'}`)
  console.log(`     --check: ${withChecks ? 'si' : 'no'}`)
}

async function run() {
  const client = (DB.client || 'sqlserver').toLowerCase()
  if (client !== 'sqlserver') {
    throw new Error(`Este migrate.js esta orientado a SQL Server. DB_CLIENT actual: ${client}`)
  }

  try {
    await runSqlServerMigration()
  } finally {
    await pool.end()
  }
}

run().catch((err) => {
  console.error('[DB] Error:', err.message)
  process.exit(1)
})
