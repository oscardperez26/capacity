/**
 * useToast.js
 * Hook para mostrar toasts / notificaciones flotantes.
 *
 * Uso:
 *   const { toast, showToast } = useToast()
 *   showToast('Guardado correctamente', 'success')
 *   <Toast message={toast.message} type={toast.type} />
 */

import { useState, useCallback, useRef } from 'react'

export function useToast(duration = 2500) {
  const [toast, setToast] = useState({ message: null, type: 'success' })
  const timerRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type })
    timerRef.current = setTimeout(() => setToast({ message: null, type: 'success' }), duration)
  }, [duration])

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message: null, type: 'success' })
  }, [])

  return { toast, showToast, hideToast }
}
