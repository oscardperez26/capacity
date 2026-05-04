import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }          from './context/AuthContext'
import CambiarPassword      from './components/ui/CambiarPassword'
import { StoreProvider }    from './context/StoreContext'
import { SprintProvider }   from './context/SprintContext'
import { ROUTES, DEFAULT_PATH } from './router/routes'
import ProtectedRoute       from './router/ProtectedRoute'
import { PageLoader }       from './components/ui/Spinner'

import AppShell  from './layout/AppShell'
import LoginPage from './modules/auth/LoginPage'

function AppContent() {
  const { user } = useAuth()
  const routes      = ROUTES[user?.role] ?? []
  const defaultPath = DEFAULT_PATH[user?.role] ?? '/mi-dia'

  return (
    <AppShell>
      <Suspense fallback={<PageLoader message="Cargando..." />}>
        <Routes>
          {routes.map(({ path, roles, component: Page }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={roles}>
                  <Page user={user} />
                </ProtectedRoute>
              }
            />
          ))}
          {/* URL desconocida o sin acceso → página por defecto del rol */}
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  const { user, refreshUser, logout } = useAuth()
  if (!user) return <LoginPage />
  if (user.debe_cambiar_password) {
    return (
      <CambiarPassword
        usuario={{ nombre: user.name, numeroDocumento: user.numeroDocumento }}
        onCambiado={() => refreshUser()}
        onVolver={() => logout()}
      />
    )
  }
  return (
    <StoreProvider>
      <SprintProvider>
        <AppContent />
      </SprintProvider>
    </StoreProvider>
  )
}
