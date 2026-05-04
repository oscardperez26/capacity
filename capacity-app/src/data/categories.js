// ── ITIL 4 / PMI Model Badges ──────────────────────────────────────────────
export const MODEL_BADGE = {
  RUN:   'badge-blue',
  BUILD: 'badge-green',
  ADMIN: 'badge-amber',
  GROW:  'badge-purple',
  OFF:   'badge-gray',
}

// ── Colombian Holidays 2025-2026 ───────────────────────────────────────────
export const FESTIVOS_CO = new Set([
  // 2025
  '2025-01-01','2025-01-06','2025-03-24','2025-04-17','2025-04-18',
  '2025-05-01','2025-06-02','2025-06-23','2025-06-30','2025-07-20',
  '2025-08-07','2025-08-18','2025-10-13','2025-11-03','2025-11-17',
  '2025-12-08','2025-12-25',
  // 2026
  '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03',
  '2026-05-01','2026-05-18','2026-06-08','2026-06-29','2026-07-20',
  '2026-08-07','2026-08-17','2026-10-12','2026-11-02','2026-11-16',
  '2026-12-08','2026-12-25',
])

export const isFestivo = (dateStr) => FESTIVOS_CO.has(dateStr)

// ── Activity Categories ────────────────────────────────────────────────────
// IMPORTANTE: el campo dbId corresponde al id_subcategoria en MariaDB
// Debe coincidir exactamente con los IDs del seed.js
export const CATS = {
  OPERACION: {
    id: 'operacion', label: 'Operación', color: '#3E5D9D',
    subs: [
      { id: 'incidentes',     dbId: 1,  label: 'Incidentes',                 m: 'RUN' },
      { id: 'requerimientos', dbId: 2,  label: 'Requerimientos',             m: 'RUN' },
      { id: 'problemas',      dbId: 3,  label: 'Problemas',                  m: 'RUN' },
      { id: 'cambios',        dbId: 4,  label: 'Cambios',                    m: 'RUN' },
      { id: 'soporte',        dbId: 5,  label: 'Soporte técnico',            m: 'RUN' },
      { id: 'monitoreo',      dbId: 6,  label: 'Monitoreo',                  m: 'RUN' },
      { id: 'disponibilidad', dbId: 7,  label: 'Disponibilidad fuera turno', m: 'RUN' },
      { id: 'adm_plat',       dbId: 8,  label: 'Administración plataformas', m: 'ADMIN' },
    ],
  },
  PROYECTO: {
    id: 'proyecto', label: 'Proyectos, iniciativas y evolutivos', color: '#30693B',
    subs: [
      { id: 'proy_est',  dbId: 9,  label: 'Proyectos estratégicos',          m: 'BUILD', req: true },
      { id: 'proy_cont', dbId: 10, label: 'Proyectos continuidad operativa', m: 'BUILD', req: true },
    ],
  },
  GESTION: {
    id: 'gestion', label: 'Gestión y Coordinación', color: '#D65830',
    subs: [
      { id: 'seguimiento',  dbId: 11, label: 'Seguimiento / Planeación',   m: 'ADMIN' },
      { id: 'cab',          dbId: 12, label: 'Comités (CAB, ECAB)',         m: 'ADMIN' },
      { id: 'reu_int',      dbId: 13, label: 'Reuniones internas',          m: 'ADMIN' },
      { id: 'reu_ext',      dbId: 14, label: 'Reuniones externas',          m: 'ADMIN' },
      { id: 'reportes',     dbId: 15, label: 'Reportes e informes',         m: 'ADMIN' },
      { id: 'docs',         dbId: 16, label: 'Gestión documental',          m: 'ADMIN' },
      { id: 'tareas',       dbId: 17, label: 'Tareas administrativas',      m: 'ADMIN' },
      { id: 'proveedores',  dbId: 18, label: 'Proveedores y contratos',     m: 'ADMIN' },
      { id: 'compras',      dbId: 19, label: 'Compras',                     m: 'ADMIN' },
      { id: 'auditorias',   dbId: 20, label: 'Auditorías',                  m: 'ADMIN' },
      { id: 'activos',      dbId: 21, label: 'Gestión de activos',          m: 'ADMIN' },
    ],
  },
  DESARROLLO: {
    id: 'desarrollo', label: 'Desarrollo Profesional', color: '#4554A1',
    subs: [
      { id: 'cursos', dbId: 22, label: 'Cursos / Certificaciones', m: 'GROW' },
      { id: 'pocs',   dbId: 23, label: 'POCs Mejora continua',     m: 'GROW' },
    ],
  },
  AUSENCIAS: {
    id: 'ausencias', label: 'Novedades', color: '#992C26',
    subs: [
      { id: 'vacaciones',    dbId: 24, label: 'Vacaciones',    m: 'OFF' },
      { id: 'incapacidades', dbId: 25, label: 'Incapacidades', m: 'OFF' },
      { id: 'permisos',      dbId: 26, label: 'Permisos',      m: 'OFF' },
      { id: 'festivos',      dbId: 27, label: 'Festivos',      m: 'OFF' },
    ],
  },
}
