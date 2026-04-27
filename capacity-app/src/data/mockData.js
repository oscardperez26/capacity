// ── Roles ──────────────────────────────────────────────────────────────────
export const ROLES = {
  ESP:   'especialista',
  JEFE:  'jefe',
  ADMIN: 'admin',
}

// ── Users ──────────────────────────────────────────────────────────────────
export const USERS = {
  'especialista@permoda.com.co': {
    name: 'Laura Martínez', role: ROLES.ESP,
    cargo: 'Especialista TI', area: 'infraestructura', areaLabel: 'Infraestructura',
  },
  'jefe@permoda.com.co': {
    name: 'Carlos Ramírez', role: ROLES.JEFE,
    cargo: 'Jefe de Área', area: 'infraestructura', areaLabel: 'Infraestructura',
  },
  'admin@permoda.com.co': {
    name: 'Ana Gómez', role: ROLES.ADMIN,
    cargo: 'PMO Administrator', area: 'mesi', areaLabel: 'PMO & Estrategia',
  },
}

// ── Areas ─────────────────────────────────────────────────────────────────
export const AREAS_DATA = {
  infraestructura: {
    label: 'Infraestructura',
    jefe: 'jefe@permoda.com.co',
    cargos: ['Especialista TI', 'Analista de Redes'],
    especialistas: [
      { id: 'esp1', name: 'Laura Martínez', cargo: 'Especialista TI',    email: 'especialista@permoda.com.co' },
      { id: 'esp2', name: 'Carlos Díaz',    cargo: 'Analista de Redes',  email: 'cdiaz@permoda.com.co' },
      { id: 'esp3', name: 'Marta Rivas',    cargo: 'Especialista TI',    email: 'mrivas@permoda.com.co' },
    ],
  },
  seguridad: {
    label: 'Seguridad',
    jefe: 'jefe.seg@permoda.com.co',
    cargos: ['Analista de Seguridad', 'Especialista Ciberseguridad'],
    especialistas: [
      { id: 'esp4',  name: 'Andrea López',   cargo: 'Analista de Seguridad',       email: 'alopez@permoda.com.co' },
      { id: 'esp4b', name: 'Pablo Mendoza',  cargo: 'Especialista Ciberseguridad', email: 'pmendoza@permoda.com.co' },
    ],
  },
  soporte: {
    label: 'Soporte',
    jefe: 'jefe.sop@permoda.com.co',
    cargos: ['Técnico de Soporte', 'Analista N2'],
    especialistas: [
      { id: 'esp5',  name: 'Juan Pérez',    cargo: 'Técnico de Soporte', email: 'jperez@permoda.com.co' },
      { id: 'esp5b', name: 'Luisa Castro',  cargo: 'Analista N2',        email: 'lcastro@permoda.com.co' },
    ],
  },
  aplicaciones: {
    label: 'Aplicaciones',
    jefe: 'jefe.app@permoda.com.co',
    cargos: ['Desarrollador Senior', 'Analista Funcional', 'Consultor SAP'],
    especialistas: [
      { id: 'esp6',  name: 'Sofia Torres',   cargo: 'Consultor SAP',       email: 'storres@permoda.com.co' },
      { id: 'esp7',  name: 'Diego Herrera',  cargo: 'Analista Funcional',  email: 'dherrera@permoda.com.co' },
      { id: 'esp7b', name: 'Camila Ruiz',    cargo: 'Desarrollador Senior',email: 'cruiz@permoda.com.co' },
    ],
  },
  mesi: {
    label: 'Mesi',
    jefe: 'jefe.mesi@permoda.com.co',
    cargos: ['Analista MESI', 'Especialista Inteligencia de Negocios'],
    especialistas: [
      { id: 'esp8',  name: 'Ana Gómez',      cargo: 'Analista MESI',            email: 'agomez@permoda.com.co' },
      { id: 'esp8b', name: 'Roberto Silva',  cargo: 'Especialista BI',          email: 'rsilva@permoda.com.co' },
    ],
  },
}

// ── Projects ───────────────────────────────────────────────────────────────
export const PROJECTS_BY_AREA = {
  infraestructura: [
    { id: 'p1', name: 'Migración Core Bancario',    type: 'estrategico', area: 'Infraestructura', assignedTo: ['esp1','esp2'] },
    { id: 'p2', name: 'Continuidad DR Site',        type: 'operativo',   area: 'Infraestructura', assignedTo: ['esp1','esp3'] },
  ],
  seguridad: [
    { id: 'p3', name: 'Hardening Servidores',       type: 'estrategico', area: 'Seguridad',       assignedTo: ['esp4'] },
  ],
  soporte: [
    { id: 'p4', name: 'Portal Autoservicio IT',     type: 'operativo',   area: 'Soporte',         assignedTo: ['esp5'] },
  ],
  aplicaciones: [
    { id: 'p5', name: 'Renovación Licencias SAP',   type: 'operativo',   area: 'Aplicaciones',    assignedTo: ['esp6'] },
    { id: 'p6', name: 'Migración SAP S/4HANA',      type: 'estrategico', area: 'Aplicaciones',    assignedTo: ['esp6','esp7'] },
    { id: 'p6b',name: 'Portal E-commerce',          type: 'estrategico', area: 'Aplicaciones',    assignedTo: ['esp7b'] },
  ],
  mesi: [
    { id: 'p7',  name: 'Dashboard BI Corporativo',  type: 'estrategico', area: 'Mesi',            assignedTo: ['esp8','esp8b'] },
    { id: 'p7b', name: 'Integración Datos ERP',     type: 'operativo',   area: 'Mesi',            assignedTo: ['esp8'] },
  ],
}

// ── Notifications ─────────────────────────────────────────────────────────
export const NOTIFS = [
  { title: 'Cierre de periodo próximo', desc: 'Sprint 5 finaliza en 4 días.', time: 'Hace 5 min', bg: 'rgba(214,88,48,0.1)', color: '#D65830', icon: '⚠️', read: false },
  { title: 'Actividad aprobada ✓',      desc: 'Tus horas del lunes fueron validadas.', time: 'Hace 1h', bg: 'rgba(48,105,59,0.1)', color: '#30693B', icon: '✅', read: false },
  { title: 'Sprint 4 cerrado',          desc: 'El ciclo Sprint 4 ha sido cerrado.',    time: 'Ayer',    bg: 'rgba(69,84,161,0.1)', color: '#4554A1', icon: '🔒', read: true },
]

// ── Sprint ─────────────────────────────────────────────────────────────────
export const SPRINT_ACTIVO = {
  id: 5, name: 'Sprint 5',
  start: new Date(2025,1,17), end: new Date(2025,2,5),
  daysLeft: 4,
  weeks: [
    {
      id: 'w1', label: 'Semana 1', dateRange: '17–21 Feb', isCurrent: true,
      days: [
        { key: 'lun-17', short: 'Lun', num: '17', date: '2025-02-17' },
        { key: 'mar-18', short: 'Mar', num: '18', date: '2025-02-18' },
        { key: 'mie-19', short: 'Mié', num: '19', date: '2025-02-19' },
        { key: 'jue-20', short: 'Jue', num: '20', date: '2025-02-20' },
        { key: 'vie-21', short: 'Vie', num: '21', date: '2025-02-21' },
        { key: 'sab-22', short: 'Sáb', num: '22', date: '2025-02-22' },
        { key: 'dom-23', short: 'Dom', num: '23', date: '2025-02-23' },
      ],
    },
    {
      id: 'w2', label: 'Semana 2', dateRange: '24 Feb–05 Mar', isCurrent: false,
      days: [
        { key: 'lun-24', short: 'Lun', num: '24', date: '2025-02-24' },
        { key: 'mar-25', short: 'Mar', num: '25', date: '2025-02-25' },
        { key: 'mie-26', short: 'Mié', num: '26', date: '2025-02-26' },
        { key: 'jue-27', short: 'Jue', num: '27', date: '2025-02-27' },
        { key: 'vie-28', short: 'Vie', num: '28', date: '2025-02-28' },
        { key: 'lun-03', short: 'Lun', num: '03', date: '2025-03-03' },
        { key: 'mar-04', short: 'Mar', num: '04', date: '2025-03-04' },
      ],
    },
  ],
}

// Mark today
const _todayStr = new Date().toISOString().split('T')[0]
SPRINT_ACTIVO.weeks.forEach(w => w.days.forEach(d => { d.isToday = d.date === _todayStr }))

export const CURRENT_WEEK = SPRINT_ACTIVO.weeks.find(w => w.isCurrent)

// ── Area Load Stats ────────────────────────────────────────────────────────
export const AREA_LOADS = {
  infraestructura: { avg: 95,  run: 65, build: 25, admin: 10, horas: 2184 },
  seguridad:       { avg: 110, run: 70, build: 20, admin: 10, horas: 528 },
  soporte:         { avg: 80,  run: 75, build: 10, admin: 15, horas: 320 },
  aplicaciones:    { avg: 75,  run: 50, build: 40, admin: 10, horas: 640 },
  mesi:            { avg: 68,  run: 30, build: 45, admin: 25, horas: 340 },
}

export const AREA_TREND = {
  infraestructura: [88,91,85,93,95],
  seguridad:       [98,105,108,103,110],
  soporte:         [72,75,78,82,80],
  aplicaciones:    [68,71,73,78,75],
  mesi:            [55,60,63,70,68],
}

export const ESP_LOADS = {
  esp1:  { load: 95,  run: 60, build: 30, admin: 10, hours: '7.6' },
  esp2:  { load: 80,  run: 70, build: 10, admin: 20, hours: '6.4' },
  esp3:  { load: 110, run: 55, build: 35, admin: 10, hours: '8.8' },
  esp4:  { load: 112, run: 72, build: 18, admin: 10, hours: '9.0' },
  esp4b: { load: 108, run: 68, build: 22, admin: 10, hours: '8.6' },
  esp5:  { load: 82,  run: 78, build: 8,  admin: 14, hours: '6.6' },
  esp5b: { load: 78,  run: 72, build: 12, admin: 16, hours: '6.2' },
  esp6:  { load: 74,  run: 48, build: 42, admin: 10, hours: '5.9' },
  esp7:  { load: 76,  run: 52, build: 38, admin: 10, hours: '6.1' },
  esp7b: { load: 75,  run: 50, build: 40, admin: 10, hours: '6.0' },
  esp8:  { load: 70,  run: 30, build: 46, admin: 24, hours: '5.6' },
  esp8b: { load: 66,  run: 30, build: 44, admin: 26, hours: '5.3' },
}

// ── Historical Sprints ─────────────────────────────────────────────────────
export const HIST_SPRINTS = [
  {
    id: 4, name: 'Sprint 4', dates: '04 Feb – 18 Feb', status: 'cerrado',
    weeks: [
      {
        label: 'Semana 1', dateRange: '04–10 Feb', totalMins: 1930, status: 'aprobado',
        days: [
          {
            date: 'Lun 04', mins: 480,
            acts: [
              { cat: 'Operación',  name: 'Incidentes',             model: 'RUN',   mins: 240, desc: 'INC-8801 caída base datos',           status: 'aprobado' },
              { cat: 'Gestión',    name: 'Reuniones internas',     model: 'ADMIN', mins: 60,  desc: 'Sync semanal',                        status: 'aprobado' },
              { cat: 'Proyectos',  name: 'Proyectos estratégicos', model: 'BUILD', mins: 180, desc: 'Diseño arquitectura DR',               status: 'aprobado' },
            ],
          },
          {
            date: 'Mar 05', mins: 360,
            acts: [
              { cat: 'Operación',  name: 'Requerimientos',         model: 'RUN',   mins: 180, desc: 'Atención REQ-2233',                   status: 'aprobado' },
              { cat: 'Gestión',    name: 'Reportes e informes',    model: 'ADMIN', mins: 120, desc: 'Informe semanal',                     status: 'aprobado' },
              { cat: 'Operación',  name: 'Monitoreo',              model: 'RUN',   mins: 60,  desc: 'Monitoreo nocturno',                  status: 'aprobado' },
            ],
          },
        ],
      },
    ],
  },
]

// ── Initial day entries (demo data) ──────────────────────────────────────
export const INITIAL_DAY_ENTRIES = {
  'lun-17': {
    status: 'borrador',
    tasks: [
      { id: 't001', name: 'Incidentes',              model: 'RUN',   catId: 'operacion', catLabel: 'Operación',  catColor: '#3E5D9D', dur: 120, desc: 'Atención INC-9900 fallo firewall perimetral', projectId: null },
      { id: 't002', name: 'Proyectos estratégicos',  model: 'BUILD', catId: 'proyecto',  catLabel: 'Proyectos',  catColor: '#30693B', dur: 180, desc: 'Diseño módulo autenticación biométrica',       projectId: 'p1' },
      { id: 't003', name: 'Reuniones internas',      model: 'ADMIN', catId: 'gestion',   catLabel: 'Gestión',    catColor: '#D65830', dur: 60,  desc: 'Sync semanal del equipo',                      projectId: null },
    ],
  },
  'mar-18': {
    status: 'finalizado',
    tasks: [
      { id: 't004', name: 'Monitoreo',               model: 'RUN',   catId: 'operacion', catLabel: 'Operación',  catColor: '#3E5D9D', dur: 240, desc: 'Monitoreo plataforma core banking 24h', projectId: null },
      { id: 't005', name: 'Reportes e informes',     model: 'ADMIN', catId: 'gestion',   catLabel: 'Gestión',    catColor: '#D65830', dur: 120, desc: 'Informe semanal capacidad operativa',  projectId: null },
    ],
  },
}
