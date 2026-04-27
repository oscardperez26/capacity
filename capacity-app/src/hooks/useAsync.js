/**
 * useAsync.js
 * Hook genérico para manejar estados async:
 * loading, error, data y función de ejecución.
 *
 * Uso:
 *   const { data, loading, error, execute } = useAsync(myService.getData)
 *   useEffect(() => { execute(params) }, [])
 */

import { useState, useCallback, useRef } from 'react'

export function useAsync(asyncFn, { immediate = false, initialData = null } = {}) {
  const [data,    setData]    = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error,   setError]   = useState(null)
  const mountedRef = useRef(true)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await asyncFn(...args)
      if (mountedRef.current) setData(result)
      return result
    } catch (err) {
      if (mountedRef.current) setError(err?.message ?? 'Error inesperado')
      throw err
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [asyncFn])

  const reset = useCallback(() => {
    setData(initialData)
    setLoading(false)
    setError(null)
  }, [initialData])

  return { data, loading, error, execute, reset, setData }
}

/**
 * useAsyncEffect — ejecuta automáticamente al montar
 */
export function useAsyncEffect(asyncFn, deps = []) {
  const { data, loading, error, execute } = useAsync(asyncFn)

  useState(() => {
    execute()
  }, deps)

  return { data, loading, error, refetch: execute }
}
