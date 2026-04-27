-- ── Áreas ──────────────────────────────────────────────────────────────────
INSERT IGNORE INTO areas (area_key, label) VALUES
  ('infraestructura', 'Infraestructura'),
  ('seguridad',       'Seguridad'),
  ('soporte',         'Soporte'),
  ('aplicaciones',    'Aplicaciones'),
  ('mesi',            'Mesi');

-- ── Sprint inicial ─────────────────────────────────────────────────────────
INSERT IGNORE INTO sprints (id, name, start_date, end_date, status) VALUES
  (5, 'Sprint 5', '2025-02-17', '2025-03-05', 'activo'),
  (4, 'Sprint 4', '2025-02-04', '2025-02-18', 'cerrado'),
  (3, 'Sprint 3', '2025-01-20', '2025-02-03', 'cerrado');

-- ── Usuarios demo ──────────────────────────────────────────────────────────
-- Contraseña para todos: demo1234
-- Hash bcrypt de 'demo1234' con 12 rounds
INSERT IGNORE INTO users (email, name, password_hash, role, cargo, area_id) VALUES
  (
    'especialista@permoda.com.co',
    'Laura Martínez',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'especialista',
    'Especialista TI',
    (SELECT id FROM areas WHERE area_key = 'infraestructura')
  ),
  (
    'jefe@permoda.com.co',
    'Carlos Ramírez',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'jefe',
    'Jefe de Área',
    (SELECT id FROM areas WHERE area_key = 'infraestructura')
  ),
  (
    'admin@permoda.com.co',
    'Ana Gómez',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'administrador',
    'PMO Administrator',
    (SELECT id FROM areas WHERE area_key = 'mesi')
  ),
  (
    'cdiaz@permoda.com.co',
    'Carlos Díaz',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'especialista',
    'Analista de Redes',
    (SELECT id FROM areas WHERE area_key = 'infraestructura')
  ),
  (
    'mrivas@permoda.com.co',
    'Marta Rivas',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'especialista',
    'Especialista TI',
    (SELECT id FROM areas WHERE area_key = 'infraestructura')
  ),
  (
    'alopez@permoda.com.co',
    'Andrea López',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'especialista',
    'Analista de Seguridad',
    (SELECT id FROM areas WHERE area_key = 'seguridad')
  ),
  (
    'storres@permoda.com.co',
    'Sofia Torres',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'especialista',
    'Consultor SAP',
    (SELECT id FROM areas WHERE area_key = 'aplicaciones')
  ),
  (
    'agomez@permoda.com.co',
    'Ana Gómez',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8l4V6eM5kR3J2G1qO2i',
    'especialista',
    'Analista MESI',
    (SELECT id FROM areas WHERE area_key = 'mesi')
  );

-- ── Proyectos demo ─────────────────────────────────────────────────────────
INSERT IGNORE INTO projects (area_id, name, type, status) VALUES
  ((SELECT id FROM areas WHERE area_key = 'infraestructura'), 'Migración Core Bancario',   'estrategico', 'activo'),
  ((SELECT id FROM areas WHERE area_key = 'infraestructura'), 'Continuidad DR Site',        'operativo',   'activo'),
  ((SELECT id FROM areas WHERE area_key = 'seguridad'),       'Hardening Servidores',       'estrategico', 'activo'),
  ((SELECT id FROM areas WHERE area_key = 'aplicaciones'),    'Migración SAP S/4HANA',      'estrategico', 'activo'),
  ((SELECT id FROM areas WHERE area_key = 'aplicaciones'),    'Portal E-commerce',          'estrategico', 'activo'),
  ((SELECT id FROM areas WHERE area_key = 'mesi'),            'Dashboard BI Corporativo',   'estrategico', 'activo'),
  ((SELECT id FROM areas WHERE area_key = 'mesi'),            'Integración Datos ERP',      'operativo',   'activo');
