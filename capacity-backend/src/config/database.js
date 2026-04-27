'use strict'

const mariadb = require('mariadb')
const mssql = require('mssql')
const { DB } = require('./env')

const DB_CLIENT = (DB.client || 'sqlserver').toLowerCase()
const IS_SQLSERVER = DB_CLIENT === 'sqlserver'

const TABLE_PRIMARY_KEY = Object.freeze({
  actividades: 'id_actividad',
  areas: 'id_area',
  auditoria: 'id',
  categorias_actividad: 'id_categoria',
  config_capacidad: 'id_config',
  departamentos: 'id_departamento',
  empleados: 'id_empleado',
  grupos: 'id_grupo',
  historial_aprobaciones: 'id_aprobacion',
  notificaciones: 'id_notificacion',
  oficinas_proyecto: 'id_oficina',
  oficios: 'id_oficio',
  periodos: 'id_periodo',
  programas_proyecto: 'id_programa',
  projects: 'id',
  proyectos: 'id_proyecto',
  registro_dia: 'id_registro',
  roles: 'id_rol',
  sprints: 'id_sprint',
  subcategorias_actividad: 'id_subcategoria',
  usuarios: 'id_usuario',
})

let mariadbPool = null
let sqlPool = null
let sqlPoolPromise = null
const SQL_CONNECT_RETRIES = 8
const SQL_CONNECT_RETRY_DELAY_MS = 1000
const SQL_TLS_SERVER_NAME =
  DB.host === '127.0.0.1' || DB.host === '::1'
    ? 'localhost'
    : DB.host

function createMariadbPool() {
  return mariadb.createPool({
    host: DB.host,
    port: DB.port,
    database: DB.database,
    user: DB.user,
    password: DB.password,
    connectionLimit: DB.poolMax,
    minimumIdle: DB.poolMin,
    acquireTimeout: 10000,
    idleTimeout: 60000,
    connectTimeout: 10000,
    multipleStatements: false,
    bigNumberStrings: false,
    supportBigNumbers: true,
    timezone: 'Z',
  })
}

function createSqlServerPool() {
  return new mssql.ConnectionPool({
    server: DB.host,
    port: DB.port,
    database: DB.database,
    user: DB.user,
    password: DB.password,
    pool: {
      min: 0,
      max: DB.poolMax,
      idleTimeoutMillis: 8000,
      acquireTimeoutMillis: 15000,
      createTimeoutMillis: 15000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    options: {
      encrypt: DB.encrypt,
      trustServerCertificate: DB.trustCert,
      serverName: SQL_TLS_SERVER_NAME,
      enableArithAbort: true,
    },
    requestTimeout: 30000,
    connectionTimeout: 15000,
  })
}

async function getSqlPool() {
  if (!sqlPoolPromise) {
    sqlPoolPromise = (async () => {
      let lastError = null

      for (let attempt = 1; attempt <= SQL_CONNECT_RETRIES; attempt++) {
        const candidate = createSqlServerPool()
        try {
          await candidate.connect()
          sqlPool = candidate
          return sqlPool
        } catch (err) {
          lastError = err
          try { await candidate.close() } catch {}
          if (attempt < SQL_CONNECT_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, SQL_CONNECT_RETRY_DELAY_MS * attempt))
          }
        }
      }

      throw lastError
    })().catch((err) => {
      sqlPool = null
      sqlPoolPromise = null
      throw err
    })
  }
  await sqlPoolPromise
  return sqlPool
}

if (IS_SQLSERVER) {
  // SQL Server: conexion lazy en primer uso (query/testConnection/transaction)
} else {
  mariadbPool = createMariadbPool()
}

const pool = {
  async end() {
    if (IS_SQLSERVER) {
      if (sqlPool) {
        await sqlPool.close()
      } else if (sqlPoolPromise) {
        try {
          const pending = await sqlPoolPromise
          if (pending) await pending.close()
        } catch {}
      }
      sqlPool = null
      sqlPoolPromise = null
      return
    }
    if (mariadbPool) await mariadbPool.end()
    mariadbPool = null
  },
}

function withBrackets(sql) {
  return sql.replace(/`([a-zA-Z0-9_]+)`/g, '[$1]')
}

function replaceGroupConcat(sql) {
  return sql.replace(
    /\bGROUP_CONCAT\s*\(\s*([^)]+?)\s*\)/ig,
    "STRING_AGG(CAST($1 AS NVARCHAR(MAX)), ',')"
  )
}

function replaceLimitWithTop(sql) {
  const limitOffset = sql.match(/\s+LIMIT\s+(\d+)\s+OFFSET\s+(\d+)\s*$/i)
  if (limitOffset) {
    const limit = Number(limitOffset[1])
    const offset = Number(limitOffset[2])
    return sql.replace(/\s+LIMIT\s+\d+\s+OFFSET\s+\d+\s*$/i, ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`)
  }

  const onlyLimit = sql.match(/\s+LIMIT\s+(\d+)\s*$/i)
  if (!onlyLimit) return sql
  const top = Number(onlyLimit[1])
  const noLimit = sql.replace(/\s+LIMIT\s+\d+\s*$/i, '')

  if (!/^\s*SELECT\b/i.test(noLimit)) return noLimit
  return noLimit.replace(/^\s*SELECT\b/i, (m) => `${m} TOP (${top})`)
}

function replaceInsertIgnore(sql) {
  if (!/^\s*INSERT\s+IGNORE\b/i.test(sql)) return sql
  const pureInsert = sql.replace(/^\s*INSERT\s+IGNORE\b/i, 'INSERT')
  return [
    'BEGIN TRY',
    pureInsert,
    'END TRY',
    'BEGIN CATCH',
    '  IF ERROR_NUMBER() NOT IN (2601, 2627) THROW;',
    'END CATCH',
  ].join('\n')
}

function injectInsertOutput(sql) {
  if (!/^\s*INSERT\b/i.test(sql)) return sql
  if (/OUTPUT\s+INSERTED\./i.test(sql)) return sql

  const match = sql.match(/^\s*INSERT\s+INTO\s+([`[\]a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*VALUES/i)
  if (!match) return sql

  const table = match[1].replace(/[\[\]`]/g, '').toLowerCase()
  const pk = TABLE_PRIMARY_KEY[table]
  if (!pk) return sql

  return sql.replace(/\)\s*VALUES/i, `) OUTPUT INSERTED.${pk} AS insertId VALUES`)
}

function replaceNow(sql) {
  return sql.replace(/\bNOW\s*\(\s*\)/ig, 'GETDATE()')
}

function replaceOnDuplicateKey(sql) {
  if (!/ON\s+DUPLICATE\s+KEY/i.test(sql)) return sql
  throw new Error('ON DUPLICATE KEY no es compatible en SQL Server. Usa MERGE o IF EXISTS.')
}

function applySqlServerCompat(rawSql, rawParams = []) {
  let sql = String(rawSql || '').trim()
  let params = Array.isArray(rawParams) ? [...rawParams] : []

  sql = withBrackets(sql)
  sql = replaceNow(sql)
  sql = replaceGroupConcat(sql)
  sql = replaceOnDuplicateKey(sql)

  if (/\s+LIMIT\s+\?\s+OFFSET\s+\?\s*$/i.test(sql)) {
    sql = sql.replace(/\s+LIMIT\s+\?\s+OFFSET\s+\?\s*$/i, ' OFFSET ? ROWS FETCH NEXT ? ROWS ONLY')
    if (params.length >= 2) {
      const offset = params[params.length - 1]
      const limit = params[params.length - 2]
      params[params.length - 2] = offset
      params[params.length - 1] = limit
    }
  } else {
    sql = replaceLimitWithTop(sql)
  }

  sql = replaceInsertIgnore(sql)
  sql = injectInsertOutput(sql)

  return { sql, params }
}

function convertPositionalParams(sql) {
  let out = ''
  let index = 1
  let inString = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const next = i + 1 < sql.length ? sql[i + 1] : ''

    if (ch === "'") {
      out += ch
      if (inString && next === "'") {
        out += next
        i++
      } else {
        inString = !inString
      }
      continue
    }

    if (!inString && ch === '?') {
      out += `@p${index}`
      index++
      continue
    }

    out += ch
  }

  return { sql: out, count: index - 1 }
}

function normalizeParam(value) {
  if (value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  return value
}

function buildWriteResult(result) {
  const affectedRows = (result.rowsAffected || []).reduce((acc, n) => acc + n, 0)
  const payload = { affectedRows }
  const insertIdRow = Array.isArray(result.recordset)
    ? result.recordset.find((row) => row && Object.prototype.hasOwnProperty.call(row, 'insertId'))
    : null

  if (insertIdRow && insertIdRow.insertId !== null && insertIdRow.insertId !== undefined) {
    payload.insertId = Number(insertIdRow.insertId)
  }

  return payload
}

const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEOUT', 'ESOCKET', 'ENOTOPEN'])

function isRetryableError(err) {
  if (RETRYABLE_CODES.has(err.code)) return true
  const msg = (err.message || '').toLowerCase()
  return (
    msg.includes('connection reset') ||
    msg.includes('socket closed') ||
    msg.includes('connection is closed') ||
    msg.includes('econnreset') ||
    msg === 'aborted'  // tarn abort when pool closes while acquire is pending
  )
}

// Solo un reset concurrente a la vez — el resto comparte la misma promesa.
// Evita que múltiples requests simultáneos cierren el pool en paralelo
// (pool.close() aborta los acquires pendientes de tarn, generando más errores).
let poolResetInFlight = null
function triggerPoolReset() {
  if (poolResetInFlight) return poolResetInFlight
  poolResetInFlight = (async () => {
    if (sqlPool) {
      try { await sqlPool.close() } catch {}
      sqlPool = null
      sqlPoolPromise = null
    }
  })().finally(() => { poolResetInFlight = null })
  return poolResetInFlight
}

async function withQueryRetry(fn, maxAttempts = 3) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isRetryableError(err) || attempt === maxAttempts) {
        // Todos los reintentos agotados: resetear pool para la próxima llamada
        if (isRetryableError(err)) triggerPoolReset()
        throw err
      }
      console.warn(`[DB] ECONNRESET intento ${attempt}/${maxAttempts} — reintentando en 1000ms`)
      // NO resetear el pool aquí — si 6 requests fallan en paralelo y todas resetean
      // el pool, SQL Server recibe 6 reconexiones simultáneas → más ECONNRESET.
      // Dejar que tarn retire la conexión muerta y cree una nueva sola.
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastErr
}

async function _executeSingle(sqlText, params = [], tx = null) {
  const { sql: compatibleSql, params: compatibleParams } = applySqlServerCompat(sqlText, params)
  const { sql: namedSql, count } = convertPositionalParams(compatibleSql)

  if (count !== compatibleParams.length) {
    throw new Error(
      `Cantidad de parametros invalida: SQL espera ${count} pero llegaron ${compatibleParams.length}`
    )
  }

  const poolOrTx = tx || (await getSqlPool())
  const req = new mssql.Request(poolOrTx)
  compatibleParams.forEach((value, idx) => {
    req.input(`p${idx + 1}`, normalizeParam(value))
  })

  const result = await req.query(namedSql)
  const isRead = /^\s*(SELECT|WITH)\b/i.test(compatibleSql)
  if (isRead) return result.recordset || []
  return buildWriteResult(result)
}

async function executeSqlServerQuery(sqlText, params = [], tx = null) {
  if (tx) return _executeSingle(sqlText, params, tx)
  return withQueryRetry(() => _executeSingle(sqlText, params, null))
}

/**
 * Ejecuta una query y libera la conexion automaticamente.
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
async function query(sql, params = []) {
  if (IS_SQLSERVER) return executeSqlServerQuery(sql, params)

  let conn
  try {
    conn = await mariadbPool.getConnection()
    const rows = await conn.query(sql, params)
    return rows
  } finally {
    if (conn) conn.release()
  }
}

/**
 * Ejecuta multiples queries en una transaccion.
 * @param {Function} fn - recibe { query } como argumento
 */
async function transaction(fn) {
  if (IS_SQLSERVER) {
    const sp = await getSqlPool()
    const tx = new mssql.Transaction(sp)
    await tx.begin()
    try {
      const txQuery = (sql, params = []) => executeSqlServerQuery(sql, params, tx)
      const result = await fn({ query: txQuery })
      await tx.commit()
      return result
    } catch (err) {
      try { await tx.rollback() } catch {}
      throw err
    }
  }

  let conn
  try {
    conn = await mariadbPool.getConnection()
    await conn.beginTransaction()
    const txQuery = (sql, params) => conn.query(sql, params)
    const result = await fn({ query: txQuery })
    await conn.commit()
    return result
  } catch (err) {
    if (conn) await conn.rollback()
    throw err
  } finally {
    if (conn) conn.release()
  }
}

/**
 * Verifica que la conexion a la DB sea exitosa.
 */
async function testConnection() {
  if (IS_SQLSERVER) {
    try {
      const sp = await getSqlPool()
      await sp.request().query('SELECT 1 AS ok')
      console.log(`SQL Server conectado - ${DB.host}:${DB.port}/${DB.database}`)
      return true
    } catch (err) {
      console.error('Error conectando a SQL Server:', err.message)
      return false
    }
  }

  let conn
  try {
    conn = await mariadbPool.getConnection()
    await conn.ping()
    console.log(`MariaDB conectado - ${DB.host}:${DB.port}/${DB.database}`)
    return true
  } catch (err) {
    console.error('Error conectando a MariaDB:', err.message)
    return false
  } finally {
    if (conn) conn.release()
  }
}

module.exports = { pool, query, transaction, testConnection }
