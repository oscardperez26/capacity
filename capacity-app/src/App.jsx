import { useState } from 'react'
import { useAuth }       from './context/AuthContext'
import CambiarPassword  from './components/ui/CambiarPassword'
import { StoreProvider } from './context/StoreContext'
import { ROLES }         from './data/mockData'

import AppShell  from './layout/AppShell'
import LoginPage from './modules/auth/LoginPage'

// ── Especialista ─────────────────────────────────────────────────
import MiDia        from './modules/especialista/MiDia'
import MiDashboard  from './modules/especialista/MiDashboard'
import MisProyectos from './modules/especialista/MisProyectos'
import Historico    from './modules/especialista/Historico'

// ── Jefe ─────────────────────────────────────────────────────────
import MiEquipo      from './modules/jefe/MiEquipo'
import Aprobaciones  from './modules/jefe/Aprobaciones'
import Administracion from './modules/jefe/Administracion'

// ── Admin ─────────────────────────────────────────────────────────
import GlobalCapacity     from './modules/admin/GlobalCapacity'
import PortafolioTI       from './modules/admin/PortafolioTI'
import ConfiguracionAdmin from './modules/admin/ConfiguracionAdmin'
import Auditoria           from './modules/admin/Auditoria'

const DEFAULT_VIEW = {
  [ROLES.ESP]:   'mi-dia',
  [ROLES.JEFE]:  'mi-equipo',
  [ROLES.ADMIN]: 'global',
}

function AppContent() {
  const { user } = useAuth()
  const [view, setView] = useState(() => DEFAULT_VIEW[user?.role] ?? 'mi-dia')

  const renderPage = () => {
    switch (view) {
      // Especialista
      case 'mi-dia':         return <MiDia         user={user} />
      case 'mi-dashboard':   return <MiDashboard   user={user} />
      case 'mis-proyectos':  return <MisProyectos  user={user} />
      case 'historico':      return <Historico     user={user} />

      // Jefe — comparte módulos del especialista + los propios
      case 'jefe-mi-dia':      return <MiDia         user={user} />
      case 'jefe-dashboard':   return <MiDashboard   user={user} />
      case 'mi-equipo':        return <MiEquipo      user={user} />
      case 'aprobaciones':     return <Aprobaciones  user={user} />
      case 'administracion':   return <Administracion user={user} />

      // Admin
      case 'global':         return <GlobalCapacity />
      case 'portafolio':     return <PortafolioTI />
      case 'config':         return <ConfiguracionAdmin />
      case 'auditoria':      return <Auditoria />

      default: return null
    }
  }

  return (
    <AppShell currentView={view} onNavigate={setView}>
      {renderPage()}
    </AppShell>
  )
}

export default function App() {
  const { user, refreshUser, logout } = useAuth()
  if (!user) return <LoginPage />
  // Primer acceso: debe cambiar contraseña antes de entrar
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
      <AppContent />
    </StoreProvider>
  )
}
