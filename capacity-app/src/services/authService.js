/**
 * authService.js — corregido
 * El token se guarda inmediatamente después del login.
 * Log de diagnóstico incluido para verificar.
 */

import { api, tokenStore, ApiError } from '../lib/apiClient'
import { storage } from '../lib/storage'

const SESSION_KEY = 'session'

export async function login(email, password) {
  try {
    // La API retorna: { success: true, token: 'eyJ...', user: {...} }
    const resp = await api.post('/auth/login', { email, password })

    // Extrae el token directamente
    const token = resp.token
    const user  = resp.user

    if (!token) {
      console.error('[authService] El backend no retornó token. Respuesta:', resp)
      return { success: false, error: 'Error interno: token no recibido' }
    }

    // Guarda el token en localStorage
    tokenStore.set(token)

    // Verifica que se guardó correctamente
    const saved = tokenStore.get()
    console.log('[authService] Token guardado:', saved ? `${saved.substring(0,20)}...` : 'NO SE GUARDÓ')

    // Guarda sesión para restauración optimista
    storage.set(SESSION_KEY, {
      user,
      loginAt:   Date.now(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    })

    return { success: true, user }

  } catch (err) {
    console.error('[authService] Error en login:', err)
    return {
      success: false,
      error: err instanceof ApiError ? err.message : 'Error de conexión',
    }
  }
}

export async function logout() {
  try { await api.post('/auth/logout') } catch { /* silencioso */ }
  finally {
    tokenStore.remove()
    storage.remove(SESSION_KEY)
  }
}

export function restoreSession() {
  const token = tokenStore.get()
  if (!token) return null

  const session = storage.get(SESSION_KEY)
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    tokenStore.remove()
    storage.remove(SESSION_KEY)
    return null
  }
  return session.user ?? null
}

export async function verifySession() {
  try {
    const resp = await api.get('/auth/me')
    const user = resp.user
    const session = storage.get(SESSION_KEY)
    if (session && user) storage.set(SESSION_KEY, { ...session, user })
    return user ?? null
  } catch {
    tokenStore.remove()
    storage.remove(SESSION_KEY)
    return null
  }
}

export async function recoverPassword(email) {
  try {
    await api.post('/auth/recover', { email })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Error de conexión' }
  }
}
