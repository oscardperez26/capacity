'use strict'

/**
 * Smoke API SQL Server
 * Uso:
 *   node src/db/migrations/sqlserver/05_api_smoke_sqlserver.js
 *
 * Variables opcionales:
 *   SMOKE_BASE_URL=http://127.0.0.1:3001
 *   SMOKE_EMAIL=admin@permoda.com.co
 *   SMOKE_PASSWORD=00000001
 *   SMOKE_ENTRY_DATE=2026-04-08
 */

require('dotenv').config({ override: true })

const app = require('../../../app')
const { pool } = require('../../../config/database')

const DEFAULT_EMAIL = 'admin@permoda.com.co'
const DEFAULT_PASSWORD = '00000001'

function parseJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

async function callApi(baseUrl, method, path, token, body) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await res.text()
  return {
    status: res.status,
    json: parseJson(raw),
    raw,
  }
}

function row(name, result, strict2xx = true) {
  const ok = strict2xx ? (result.status >= 200 && result.status < 300) : result.status < 500
  return {
    name,
    status: result.status,
    ok,
    error: result.json?.error || null,
  }
}

async function runWithEmbeddedServer(fn) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    return await fn(baseUrl)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

async function runWithExternalServer(fn) {
  const baseUrl = process.env.SMOKE_BASE_URL
  return fn(baseUrl)
}

async function main() {
  const email = process.env.SMOKE_EMAIL || DEFAULT_EMAIL
  const password = process.env.SMOKE_PASSWORD || DEFAULT_PASSWORD
  const entryDate = process.env.SMOKE_ENTRY_DATE || '2026-04-08'

  const runner = process.env.SMOKE_BASE_URL ? runWithExternalServer : runWithEmbeddedServer
  const results = await runner(async (baseUrl) => {
    const out = []

    const health = await callApi(baseUrl, 'GET', '/health')
    out.push(row('health', health, true))

    const login = await callApi(baseUrl, 'POST', '/api/auth/login', null, { email, password })
    out.push(row('auth.login', login, true))
    const token = login.json?.data?.token
    if (!token) {
      throw new Error('No se obtuvo token en login. Revisa SMOKE_EMAIL/SMOKE_PASSWORD.')
    }

    out.push(row('auth.me', await callApi(baseUrl, 'GET', '/api/auth/me', token), true))
    out.push(row('sprints.list', await callApi(baseUrl, 'GET', '/api/sprints', token), true))
    out.push(row('sprints.active-week', await callApi(baseUrl, 'GET', '/api/sprints/active-week', token), true))
    out.push(row('dashboard.equipo', await callApi(baseUrl, 'GET', '/api/dashboard/equipo', token), true))
    out.push(row('approvals.pendientes', await callApi(baseUrl, 'GET', '/api/approvals/pendientes', token), true))
    out.push(row('admin-global.capacity', await callApi(baseUrl, 'GET', '/api/admin-global/capacity', token), true))
    out.push(row('notifications.list', await callApi(baseUrl, 'GET', '/api/notifications', token), true))
    out.push(row('audit.list', await callApi(baseUrl, 'GET', '/api/audit', token), true))
    out.push(row('dashboard-personal', await callApi(baseUrl, 'GET', '/api/dashboard-personal', token), true))
    out.push(row('mis-proyectos', await callApi(baseUrl, 'GET', '/api/mis-proyectos', token), true))
    out.push(row('projects.list', await callApi(baseUrl, 'GET', '/api/projects', token), true))

    // Flujo especialista base (sin exigir sprint activo): no debe generar 5xx
    out.push(row(
      'entries.getOrCreate',
      await callApi(baseUrl, 'GET', `/api/entries/${entryDate}?date=${entryDate}`, token),
      false
    ))

    const add = await callApi(
      baseUrl,
      'POST',
      `/api/entries/${entryDate}/activities`,
      token,
      { date: entryDate, subcategoriaId: 1, dur: 15, desc: 'Smoke SQL Server' }
    )
    out.push(row('entries.addActivity', add, false))

    const taskId = add.json?.data?.tasks?.at?.(-1)?.id
    if (taskId) {
      const update = await callApi(
        baseUrl,
        'PATCH',
        `/api/entries/activities/${taskId}`,
        token,
        { field: 'desc', value: 'Smoke SQL Server OK' }
      )
      const remove = await callApi(baseUrl, 'DELETE', `/api/entries/activities/${taskId}`, token)
      out.push(row('entries.updateActivity', update, true))
      out.push(row('entries.deleteActivity', remove, true))
    }

    return out
  })

  const hasFailures = results.some((r) => !r.ok)
  console.table(results)

  if (hasFailures) {
    const failed = results.filter((r) => !r.ok)
    console.error('SMOKE_FAIL:', JSON.stringify(failed, null, 2))
    process.exitCode = 1
  } else {
    console.log('SMOKE_OK')
  }
}

main()
  .catch((err) => {
    console.error('SMOKE_ERROR:', err.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try { await pool.end() } catch {}
  })
