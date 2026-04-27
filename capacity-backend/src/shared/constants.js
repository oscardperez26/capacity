'use strict'

module.exports = {
  ROLES: {
    ESP:   'especialista',
    JEFE:  'jefe',
    ADMIN: 'admin',
  },

  MODELS: ['RUN', 'BUILD', 'ADMIN', 'GROW', 'OFF'],

  ENTRY_STATUS: {
    DRAFT:     'borrador',
    FINALIZED: 'finalizado',
  },

  SPRINT_STATUS: {
    ACTIVE: 'activo',
    CLOSED: 'cerrado',
  },

  APPROVAL_STATUS: {
    PENDING:  'pendiente',
    APPROVED: 'aprobado',
    REJECTED: 'rechazado',
  },

  STANDARD_MINUTES: 480,

  AUDIT_TYPES: {
    AUTH:      'auth',
    ENTRY:     'entry',
    APPROVAL:  'approval',
    SPRINT:    'sprint',
    PROJECT:   'project',
    ACCESS:    'access',
  },
}
