/**
 * NotificationBell.jsx — Sesión D
 * Campana con badge de conteo real desde la API.
 */

import { Bell } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useNotifications } from '../../hooks/useNotifications'
import NotificationPanel   from './NotificationPanel'

export default function NotificationBell() {
  const {
    open, toggle, close,
    ringing, hasUnread, unreadCount,
    notifs,
    handleMarkRead,
    handleMarkAllRead,
  } = useNotifications()

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`bell-btn ${hasUnread ? 'has-notif' : ''} ${ringing ? 'ringing' : ''}`}
        onClick={toggle}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} nuevas)` : ''}`}
      >
        <span className="bell-icon"><Bell size={20} /></span>

        {/* Badge con conteo */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: unreadCount > 9 ? 16 : 14,
            height: 14,
            borderRadius: 99,
            background: 'var(--brand-orange)',
            border: '2px solid var(--c-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7.5, fontWeight: 900, color: 'white',
            padding: '0 3px',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 140 }} onClick={close} />
            <NotificationPanel
              notifs={notifs}
              unreadCount={unreadCount}
              onClose={close}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
