import { lazy } from 'react'
import { ROLES } from '../data/mockData'

// ── Especialista ─────────────────────────────────────────────────────────────
const MiDia        = lazy(() => import('../modules/especialista/MiDia'))
const MiDashboard  = lazy(() => import('../modules/especialista/MiDashboard'))
const MisProyectos = lazy(() => import('../modules/especialista/MisProyectos'))
const Historico    = lazy(() => import('../modules/especialista/Historico'))

// ── Jefe ──────────────────────────────────────────────────────────────────────
const MiEquipo       = lazy(() => import('../modules/jefe/MiEquipo'))
const Aprobaciones   = lazy(() => import('../modules/jefe/Aprobaciones'))
const Administracion = lazy(() => import('../modules/jefe/Administracion'))

// ── Admin ─────────────────────────────────────────────────────────────────────
const GlobalCapacity     = lazy(() => import('../modules/admin/GlobalCapacity'))
const PortafolioTI       = lazy(() => import('../modules/admin/PortafolioTI'))
const ConfiguracionAdmin = lazy(() => import('../modules/admin/ConfiguracionAdmin'))
const Auditoria          = lazy(() => import('../modules/admin/Auditoria'))

// Roles que pueden acceder a cada ruta.
// /mi-dia y /mi-dashboard son compartidas entre ESP y JEFE.
export const ROUTES = {
  [ROLES.ESP]: [
    { path: '/mi-dia',        roles: [ROLES.ESP, ROLES.JEFE], component: MiDia,        label: 'Mi Día',       icon: 'home'    },
    { path: '/mi-dashboard',  roles: [ROLES.ESP, ROLES.JEFE], component: MiDashboard,  label: 'Mi Dashboard', icon: 'chart'   },
    { path: '/mis-proyectos', roles: [ROLES.ESP],             component: MisProyectos, label: 'Proyectos',    icon: 'folder'  },
    { path: '/historico',     roles: [ROLES.ESP],             component: Historico,    label: 'Histórico',    icon: 'history' },
  ],
  [ROLES.JEFE]: [
    { path: '/mi-dia',         roles: [ROLES.ESP, ROLES.JEFE], component: MiDia,          label: 'Mi Día',         icon: 'home'     },
    { path: '/mi-dashboard',   roles: [ROLES.ESP, ROLES.JEFE], component: MiDashboard,    label: 'Mi Dashboard',   icon: 'chart'    },
    { path: '/mi-equipo',      roles: [ROLES.JEFE],            component: MiEquipo,       label: 'Mi Equipo',      icon: 'team'     },
    { path: '/aprobaciones',   roles: [ROLES.JEFE],            component: Aprobaciones,   label: 'Aprobaciones',   icon: 'shield'   },
    { path: '/administracion', roles: [ROLES.JEFE],            component: Administracion, label: 'Administración', icon: 'settings' },
  ],
  [ROLES.ADMIN]: [
    { path: '/global',        roles: [ROLES.ADMIN], component: GlobalCapacity,     label: 'Global Capacity TI', icon: 'pie'      },
    { path: '/portafolio',    roles: [ROLES.ADMIN], component: PortafolioTI,       label: 'Portafolio TI',      icon: 'folder'   },
    { path: '/configuracion', roles: [ROLES.ADMIN], component: ConfiguracionAdmin, label: 'Administración',     icon: 'settings' },
    { path: '/auditoria',     roles: [ROLES.ADMIN], component: Auditoria,          label: 'Auditoría',          icon: 'shield'   },
  ],
}

export const DEFAULT_PATH = {
  [ROLES.ESP]:   '/mi-dia',
  [ROLES.JEFE]:  '/mi-equipo',
  [ROLES.ADMIN]: '/global',
}
