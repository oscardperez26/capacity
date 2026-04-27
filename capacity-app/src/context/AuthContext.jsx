import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api, tokenStore } from '../lib/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  // Restaura sesión desde localStorage al montar
  useEffect(() => {
    const tk  = tokenStore.get()
    const raw = localStorage.getItem('capacity_user')
    if (tk && raw) {
      try { setUser(JSON.parse(raw)) } catch {}
    }
    setReady(true)
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      // api.post devuelve el JSON completo: { success: true, data: { token, user } }
      const res = await api.post('/auth/login', { email, password })
      const tk  = res.data.token
      const usr = res.data.user
      tokenStore.set(tk)
      localStorage.setItem('capacity_user', JSON.stringify(usr))
      setUser(usr)
      return { success: true }
    } catch (err) {
      // ApiError tiene err.data con el JSON del backend
      const msg = err.data?.error || err.message || 'Credenciales inválidas'
      return { success: false, error: msg }
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return
    try {
      const res = await api.get('/auth/me')
      const usr = res.data
      localStorage.setItem('capacity_user', JSON.stringify(usr))
      setUser(usr)
    } catch {}
  }, [])

  const logout = useCallback(() => {
    tokenStore.remove()
    localStorage.removeItem('capacity_user')
    setUser(null)
  }, [])

  if (!ready) return null

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
