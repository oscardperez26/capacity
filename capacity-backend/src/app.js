'use strict'

const express    = require('express')
const helmet     = require('helmet')
const cors       = require('cors')
const morgan     = require('morgan')
const compression = require('compression')
const rateLimit  = require('express-rate-limit')

const { CORS_ORIGIN, RATE_LIMIT, IS_DEV } = require('./config/env')
const { errorHandler, notFound }          = require('./middleware/errorHandler')

// ── Rutas ──────────────────────────────────────────────────────────────────
const authRoutes          = require('./modules/auth/auth.routes')
const entriesRoutes       = require('./modules/entries/entries.routes')
const sprintsRoutes       = require('./modules/sprints/sprints.routes')
const projectsRoutes      = require('./modules/projects/projects.routes')
const dashboardRoutes     = require('./modules/dashboard/dashboard.routes')
const approvalsRoutes     = require('./modules/approvals/approvals.routes')
const adminGlobalRoutes   = require('./modules/admin_global/admin_global.routes')
const adminJefeRoutes     = require('./modules/administracion/administracion.routes')
const auditRoutes         = require('./modules/audit/audit.routes')
const notificationsRoutes     = require('./modules/notifications/notifications.routes')
const dashboardPersonalRoutes = require('./modules/dashboard_personal/dashboard_personal.routes')

// ── App ────────────────────────────────────────────────────────────────────
const app = express()
const allowedOrigins = Array.isArray(CORS_ORIGIN) ? CORS_ORIGIN : [CORS_ORIGIN]
const localhostOriginRegex = /^http:\/\/localhost:\d+$/

// ── Seguridad ──────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: (origin, cb) => {
    // Permite herramientas sin Origin (curl/postman/server-to-server)
    if (!origin) return cb(null, true)

    if (allowedOrigins.includes(origin)) return cb(null, true)

    // En desarrollo permite localhost con puerto dinamico (5173/5174/5175...)
    if (IS_DEV && localhostOriginRegex.test(origin)) return cb(null, true)

    return cb(new Error(`CORS bloqueado para origin: ${origin}`))
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Parsers y utilidades ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(compression())

// ── Logging ────────────────────────────────────────────────────────────────
if (IS_DEV) {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// ── Health check — ANTES del rate limiter para no consumir presupuesto ─────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  })
})

// ── Rate limiting global — solo aplica a /api/* ────────────────────────────
// En desarrollo se usa un límite más amplio para no bloquear el flujo de dev
const apiLimiter = rateLimit({
  windowMs:        RATE_LIMIT.windowMs,
  max:             IS_DEV ? RATE_LIMIT.devMax : RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
})
app.use('/api', apiLimiter)

// ── API Routes ─────────────────────────────────────────────────────────────
const API = '/api'
app.use(`${API}/auth`,          authRoutes)
app.use(`${API}/entries`,       entriesRoutes)
app.use(`${API}/sprints`,       sprintsRoutes)
app.use(`${API}/projects`,      projectsRoutes)
app.use(`${API}/dashboard`,     dashboardRoutes)
app.use(`${API}/approvals`,     approvalsRoutes)
app.use(`${API}/admin-global`,   adminGlobalRoutes)
app.use(`${API}/admin-jefe`,     adminJefeRoutes)
app.use(`${API}/audit`,         auditRoutes)
app.use(`${API}/notifications`,       notificationsRoutes)
app.use(`${API}`,                     dashboardPersonalRoutes)

// ── Error handling ─────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

module.exports = app
