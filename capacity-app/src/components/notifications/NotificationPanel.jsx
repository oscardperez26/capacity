/**
 * NotificationPanel.jsx — Sesión D
 * Panel de notificaciones reales desde la API.
 */

import { motion } from 'framer-motion'
import { X, CheckCheck } from 'lucide-react'

export default function NotificationPanel({ notifs, unreadCount, onClose, onMarkAllRead, onMarkRead }) {
  return (
    <motion.div
      className="notif-panel"
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="notif-hdr">
        <span className="notif-hdr-title">Notificaciones</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <span className="notif-hdr-count">{unreadCount} nuevas</span>
          )}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Marcar todas como leídas"
              style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <CheckCheck size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Lista */}
      {notifs.length === 0 ? (
        <div style={{ padding: '24px 17px', textAlign: 'center', color: 'var(--t-muted)', fontSize: 11 }}>
          No tienes notificaciones
        </div>
      ) : (
        notifs.map(n => (
          <div
            key={n.id}
            className="notif-item"
            style={{ opacity: n.leido ? 0.6 : 1, cursor: !n.leido ? 'pointer' : 'default' }}
            onClick={() => !n.leido && onMarkRead(n.id)}
          >
            <div className="notif-ico" style={{ background: n.bg ?? 'rgba(51,40,154,0.1)', fontSize: 16 }}>
              {n.icon ?? '🔔'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--t-primary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                {n.mensaje}
              </p>
              <div style={{ fontSize: 8.5, color: 'var(--t-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                {n.time}
              </div>
            </div>
            {!n.leido && <div className="notif-dot-unread" />}
          </div>
        ))
      )}

      {/* Footer */}
      {notifs.length > 0 && (
        <div className="notif-footer" onClick={onMarkAllRead}>
          Marcar todas como leídas
        </div>
      )}
    </motion.div>
  )
}
