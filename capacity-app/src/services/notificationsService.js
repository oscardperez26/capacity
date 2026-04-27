/**
 * notificationsService.js — Sesión D
 * Notificaciones reales desde la API.
 */

import { api } from '../lib/apiClient'

export async function getNotifications({ unread = false } = {}) {
  try {
    const { data } = await api.get(`/notifications${unread ? '?unread=true' : ''}`)
    return data ?? []
  } catch {
    return []
  }
}

export async function getUnreadCount() {
  try {
    const { data } = await api.get('/notifications/unread-count')
    return data?.count ?? 0
  } catch {
    return 0
  }
}

export async function markRead(id) {
  try {
    await api.post(`/notifications/${id}/read`)
  } catch { /* silencioso */ }
}

export async function markAllRead() {
  try {
    await api.post('/notifications/read-all')
  } catch { /* silencioso */ }
}
