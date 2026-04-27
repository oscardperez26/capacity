/**
 * apiClient.js
 * Token guardado en localStorage (sin wrapper externo).
 */

const TOKEN_KEY = 'capacity_v1_token'
const DEFAULT_BASES = [
  'http://localhost:3002/api',
  'http://localhost:3001/api',
  'http://localhost:3003/api',
  'http://localhost:3004/api',
  'http://localhost:3005/api',
  'http://localhost:3006/api',
  'http://localhost:3007/api',
  'http://localhost:3008/api',
  'http://localhost:3009/api',
  'http://localhost:3010/api',
  'http://localhost:3011/api',
]

const configuredBase = normalizeBaseUrl(import.meta.env.VITE_API_URL)
const configuredFallbacks = parseCsv(import.meta.env.VITE_API_FALLBACK_URLS).map(normalizeBaseUrl)

const BASE_URLS = unique([
  configuredBase,
  ...configuredFallbacks,
  ...DEFAULT_BASES,
].filter(Boolean))

let resolvedBaseUrl = BASE_URLS[0]
let resolvePromise = null
let baseResolved   = false   // true una vez que /health confirmó el puerto correcto

function normalizeBaseUrl(url) {
  if (!url) return null
  return String(url).trim().replace(/\/+$/, '')
}

function parseCsv(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function unique(values) {
  return [...new Set(values)]
}

function healthUrl(baseUrl) {
  return baseUrl.replace(/\/api$/, '') + '/health'
}

async function resolveBackendBaseUrl() {
  if (!import.meta.env.DEV) return resolvedBaseUrl
  // Ya se encontró el backend en esta sesión — no repetir health checks
  if (baseResolved) return resolvedBaseUrl
  if (resolvePromise) return resolvePromise

  resolvePromise = (async () => {
    for (const base of BASE_URLS) {
      if (await isBackendAlive(base)) {
        resolvedBaseUrl = base
        baseResolved = true
        return base
      }
    }
    return resolvedBaseUrl
  })()

  try {
    return await resolvePromise
  } finally {
    resolvePromise = null
  }
}

async function isBackendAlive(baseUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1200)

  try {
    const res = await fetch(healthUrl(baseUrl), {
      method: 'GET',
      signal: controller.signal,
    })
    // 429 = backend vivo pero saturado — no intentar otros puertos
    if (res.status === 429) return true
    if (!res.ok) return false

    const data = await res.json().catch(() => null)
    return data?.status === 'ok'
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

// Token store
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => { if (token) localStorage.setItem(TOKEN_KEY, token) },
  remove: () => localStorage.removeItem(TOKEN_KEY),
}

// Custom API error
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.expired = status === 401 && data?.expired === true
  }
}

async function doFetch(baseUrl, method, path, body, options = {}) {
  const url = `${baseUrl}${path}`
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    signal: options.signal,
    body: body !== null ? JSON.stringify(body) : undefined,
  })

  return res
}

// Request
async function request(method, path, body = null, options = {}) {
  const preferredBase = await resolveBackendBaseUrl()
  const basesToTry = unique([preferredBase, ...BASE_URLS])

  let res = null
  let networkFailed = true

  for (const base of basesToTry) {
    try {
      res = await doFetch(base, method, path, body, options)
      resolvedBaseUrl = base
      networkFailed = false
      break
    } catch {
      // Intenta siguiente puerto candidato
    }
  }

  if (networkFailed || !res) {
    // Reset para que el próximo request re-descubra el backend (puede haber cambiado de puerto)
    baseResolved = false
    throw new ApiError('No se pudo conectar con el servidor. Verifica tu conexion.', 0)
  }

  // Parse response
  const ct = res.headers.get('content-type') ?? ''
  const data = ct.includes('application/json')
    ? await res.json()
    : { success: res.ok }

  if (res.status === 401) {
    if (data?.expired) tokenStore.remove()
    throw new ApiError(data?.error ?? 'No autorizado', 401, data)
  }

  if (!res.ok) {
    throw new ApiError(data?.error ?? `Error ${res.status}`, res.status, data)
  }

  return data
}

export const api = {
  get: (path, opts) => request('GET', path, null, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  delete: (path, opts) => request('DELETE', path, null, opts),
}

export default api
