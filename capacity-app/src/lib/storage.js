/**
 * storage.js
 * Wrapper sobre localStorage con serialización JSON,
 * manejo de errores y soporte a TTL opcional.
 */

const PREFIX = 'capacity_v1_'

export const storage = {
  /** Guarda un valor. Retorna true si tuvo éxito. */
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ data: value, ts: Date.now() }))
      return true
    } catch (e) {
      console.warn('[storage.set] Error guardando', key, e)
      return false
    }
  },

  /** Lee un valor. Retorna null si no existe o hay error. */
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return defaultValue
      const parsed = JSON.parse(raw)
      return parsed?.data ?? defaultValue
    } catch (e) {
      console.warn('[storage.get] Error leyendo', key, e)
      return defaultValue
    }
  },

  /** Elimina una clave. */
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key)
      return true
    } catch (e) {
      return false
    }
  },

  /** Elimina todas las claves con el prefijo de la app. */
  clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k))
      return true
    } catch (e) {
      return false
    }
  },

  /** Verifica si localStorage está disponible. */
  isAvailable() {
    try {
      const test = '__capacity_test__'
      localStorage.setItem(test, '1')
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  },
}
