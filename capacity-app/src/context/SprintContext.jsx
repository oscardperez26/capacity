import { createContext, useContext } from 'react'
import { useSprint } from '../hooks/useSprint'

const SprintContext = createContext(null)

export function SprintProvider({ children }) {
  const sprint = useSprint()
  return (
    <SprintContext.Provider value={sprint}>
      {children}
    </SprintContext.Provider>
  )
}

export function useSprintContext() {
  const ctx = useContext(SprintContext)
  if (!ctx) throw new Error('useSprintContext debe usarse dentro de SprintProvider')
  return ctx
}
