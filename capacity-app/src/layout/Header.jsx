import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/notifications/NotificationBell'
import { ROLES } from '../data/mockData'

const MENU = {
  [ROLES.ESP]: [
    { id: 'mi-dia',        label: 'Mi Día',       icon: 'home'    },
    { id: 'mi-dashboard',  label: 'Mi Dashboard', icon: 'chart'   },
    { id: 'mis-proyectos', label: 'Proyectos',    icon: 'folder'  },
    { id: 'historico',     label: 'Histórico',    icon: 'history' },
  ],
  [ROLES.JEFE]: [
    { id: 'jefe-mi-dia',    label: 'Mi Día',        icon: 'home'     },
    { id: 'jefe-dashboard', label: 'Mi Dashboard',  icon: 'chart'    },
    { id: 'mi-equipo',      label: 'Mi Equipo',     icon: 'team'     },
    { id: 'aprobaciones',   label: 'Aprobaciones',  icon: 'shield'   },
    { id: 'administracion', label: 'Administración',icon: 'settings' },
  ],
  [ROLES.ADMIN]: [
    { id: 'global',       label: 'Global Capacity TI',  icon: 'pie' },
    { id: 'portafolio',   label: 'Portafolio TI',         icon: 'folder' },
    { id: 'config',       label: 'Administración',         icon: 'settings' },
    { id: 'auditoria',    label: 'Auditoría',              icon: 'shield' },
  ],
}

// Simple inline SVG icons for nav
function NavIcon({ name, size = 20 }) {
  const paths = {
    home:    <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    history: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    chart:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    shield:  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    pie:     <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
    team:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    folder:  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>,
    cal:     <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export default function Header({ currentView, onNavigate }) {
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()
  const menu = MENU[user?.role] ?? []
  const initials = user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <header className="header">
      <div className="header-top">
        {/* Brand */}
        <div className="brand">
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#33289A,#4554A1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 14, color: 'white', letterSpacing: -1,
          }}>C</div>
          <div className="brand-divider" />
          <div>
            <div className="brand-name">Capacity</div>
            <div className="brand-sub">Koaj Permoda</div>
          </div>
        </div>

        <div className="nav-sep" />

        {/* Nav */}
        <nav className="header-nav">
          {menu.map(item => (
            <button
              key={item.id}
              className={`h-nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <NavIcon name={item.icon} size={16} />
              {item.label}
              {item.badge && <span className="h-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <NotificationBell />

          <button className="theme-btn" onClick={toggle} title="Cambiar tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="h-actions-sep" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className="user-av" style={{ flexShrink:0 }}>{initials}</div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth:0 }}>
              <span className="user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'clamp(80px,12vw,160px)' }}>{user?.name}</span>
              <span className="user-detail" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'clamp(80px,14vw,180px)' }}>{user?.cargo} · {user?.areaLabel}</span>
            </div>
          </div>

          {/* Logout siempre visible */}
          <button className="logout-btn" onClick={logout} title="Cerrar sesión"
            style={{ flexShrink:0, marginLeft:2 }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
