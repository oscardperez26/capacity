/**
 * useNotifications.js — Sesión D
 * Carga notificaciones reales desde la API.
 * Polling cada 60 segundos para detectar nuevas.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import * as notifService from '../services/notificationsService'

const POLL_INTERVAL = 60 * 1000  // 60 segundos

export function useNotifications() {
  const [open,       setOpen]       = useState(false)
  const [ringing,    setRinging]    = useState(false)
  const [notifs,     setNotifs]     = useState([])
  const [unreadCount,setUnreadCount]= useState(0)
  const prevUnread   = useRef(0)
  const pollRef      = useRef(null)

  const loadNotifs = useCallback(async () => {
    const data  = await notifService.getNotifications()
    const count = data.filter(n => !n.leido).length
    setNotifs(data)
    setUnreadCount(count)

    // Hace sonar la campana si llegaron notificaciones nuevas
    if (count > prevUnread.current && prevUnread.current >= 0) {
      setRinging(true)
      setTimeout(() => setRinging(false), 700)
    }
    prevUnread.current = count
  }, [])

  // Carga inicial y polling
  useEffect(() => {
    loadNotifs()
    pollRef.current = setInterval(loadNotifs, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [loadNotifs])

  const toggle = () => {
    setOpen(o => !o)
    setRinging(false)
  }
  const close = () => setOpen(false)

  const handleMarkAllRead = async () => {
    await notifService.markAllRead()
    setNotifs(prev => prev.map(n => ({ ...n, leido: true })))
    setUnreadCount(0)
  }

  const handleMarkRead = async (id) => {
    await notifService.markRead(id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return {
    open,
    toggle,
    close,
    ringing,
    hasUnread:    unreadCount > 0,
    unreadCount,
    notifs,
    handleMarkRead,
    handleMarkAllRead,
    reload: loadNotifs,
  }
}
