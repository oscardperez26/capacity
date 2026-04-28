'use strict'

const app = require('./app')
const { PORT, IS_PROD } = require('./config/env')
const { testConnection, pool } = require('./config/database')

async function waitForDatabase(maxAttempts = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await testConnection()
    if (ok) return true

    if (attempt < maxAttempts) {
      console.warn(`[Server] Reintentando conexion a DB (${attempt + 1}/${maxAttempts})...`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return false
}

async function start() {
  const dbOk = await waitForDatabase()
  if (!dbOk) {
    console.error('No se pudo conectar a la base de datos. Verifica tu .env y que el servidor este corriendo.')
    process.exit(1)
  }

  const { server, port } = await listenOnAvailablePort(PORT)
  console.log(`[Server] Capacity API escuchando en puerto ${port} (${process.env.NODE_ENV ?? 'development'})`)

  const shutdown = (signal) => {
    console.log(`[Server] ${signal} recibido - cerrando...`)
    server.close(async () => {
      console.log('[Server] HTTP server cerrado.')
      try { await pool.end(); console.log('[Server] Pool de DB cerrado.') }
      catch (e) { console.error('[Server] Error cerrando pool:', e.message) }
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled Rejection:', reason)
  })

  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err)
    process.exit(1)
  })
}

async function listenOnAvailablePort(initialPort) {
  const startPort = Number(initialPort) || 3001

  if (IS_PROD) {
    const server = await listenOnce(startPort)
    return { server, port: startPort }
  }

  const maxAttempts = 10
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = startPort + i
    try {
      const server = await listenOnce(candidate)
      if (candidate !== startPort) {
        console.warn(`[Server] Puerto ${startPort} ocupado. Usando ${candidate}.`)
      }
      return { server, port: candidate }
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err
    }
  }

  throw new Error(`No hay puertos disponibles entre ${startPort} y ${startPort + maxAttempts - 1}`)
}

function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)

    const onError = (err) => {
      server.off('listening', onListening)
      reject(err)
    }

    const onListening = () => {
      server.off('error', onError)
      resolve(server)
    }

    server.once('error', onError)
    server.once('listening', onListening)
  })
}

start()
