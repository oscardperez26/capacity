import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_PATH } from './routes'

/**
 * Protege una ruta verificando que el usuario tenga uno de los roles permitidos.
 * Si no tiene acceso → redirige a la página por defecto de su rol.
 *
 * Uso:
 *   <ProtectedRoute allowedRoles={[ROLES.JEFE]}>
 *     <MiEquipo user={user} />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth()
  const defaultPath = DEFAULT_PATH[user?.role] ?? '/'

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={defaultPath} replace />
  }

  return children
}
