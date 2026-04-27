/*
  04_postload_checks.sql
  Validaciones de conteo e integridad luego de cargar datos y constraints.
*/

SET NOCOUNT ON;

PRINT '=== Conteos esperados por tabla ===';

DECLARE @Expected TABLE (
  table_name SYSNAME NOT NULL,
  expected_count INT NOT NULL
);

INSERT INTO @Expected (table_name, expected_count)
VALUES
  ('actividades', 48),
  ('areas', 7),
  ('auditoria', 0),
  ('categorias_actividad', 5),
  ('centros_costo', 1),
  ('config_capacidad', 1),
  ('departamentos', 1),
  ('empleado_proyecto', 7),
  ('empleados', 79),
  ('favoritos_empleado', 0),
  ('grupos', 4),
  ('historial_aprobaciones', 6),
  ('jefe_areas_visibilidad', 12),
  ('notificaciones', 28),
  ('oficinas_proyecto', 3),
  ('oficios', 828),
  ('periodos', 4),
  ('programas_proyecto', 7),
  ('proyectos', 9),
  ('registro_dia', 21),
  ('roles', 3),
  ('sprints', 2),
  ('subcategorias_actividad', 27),
  ('usuarios', 80);

DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql +
  N'SELECT N''' + e.table_name + N''' AS table_name, ' +
  N'COUNT(1) AS actual_count FROM dbo.[' + e.table_name + N'] UNION ALL '
FROM @Expected e;
SET @sql = LEFT(@sql, LEN(@sql) - LEN(N' UNION ALL '));

DECLARE @Actual TABLE (
  table_name SYSNAME,
  actual_count INT
);

INSERT INTO @Actual (table_name, actual_count)
EXEC sp_executesql @sql;

SELECT
  e.table_name,
  e.expected_count,
  a.actual_count,
  CASE WHEN e.expected_count = a.actual_count THEN 'OK' ELSE 'MISMATCH' END AS status
FROM @Expected e
LEFT JOIN @Actual a ON a.table_name = e.table_name
ORDER BY e.table_name;

PRINT '=== Orfandades (debe retornar 0) ===';

SELECT COUNT(1) AS orphans_areas_departamento
FROM dbo.areas a
LEFT JOIN dbo.departamentos d ON d.id_departamento = a.id_departamento
WHERE a.id_departamento IS NOT NULL AND d.id_departamento IS NULL;

SELECT COUNT(1) AS orphans_usuarios_roles
FROM dbo.usuarios u
LEFT JOIN dbo.roles r ON r.id_rol = u.id_rol
WHERE r.id_rol IS NULL;

SELECT COUNT(1) AS orphans_empleados_usuario
FROM dbo.empleados e
LEFT JOIN dbo.usuarios u ON u.id_usuario = e.id_usuario
WHERE u.id_usuario IS NULL;

SELECT COUNT(1) AS orphans_empleados_jefe
FROM dbo.empleados e
LEFT JOIN dbo.empleados j ON j.id_empleado = e.id_jefe
WHERE e.id_jefe IS NOT NULL AND j.id_empleado IS NULL;

SELECT COUNT(1) AS orphans_periodos_sprints
FROM dbo.periodos p
LEFT JOIN dbo.sprints s ON s.id_sprint = p.id_sprint
WHERE s.id_sprint IS NULL;

SELECT COUNT(1) AS orphans_registro_dia_periodo
FROM dbo.registro_dia rd
LEFT JOIN dbo.periodos p ON p.id_periodo = rd.id_periodo
WHERE p.id_periodo IS NULL;

SELECT COUNT(1) AS orphans_registro_dia_empleado
FROM dbo.registro_dia rd
LEFT JOIN dbo.empleados e ON e.id_empleado = rd.id_empleado
WHERE e.id_empleado IS NULL;

SELECT COUNT(1) AS orphans_actividades_registro
FROM dbo.actividades a
LEFT JOIN dbo.registro_dia rd ON rd.id_registro = a.id_registro
WHERE rd.id_registro IS NULL;

SELECT COUNT(1) AS orphans_actividades_subcategoria
FROM dbo.actividades a
LEFT JOIN dbo.subcategorias_actividad s ON s.id_subcategoria = a.id_subcategoria
WHERE s.id_subcategoria IS NULL;

SELECT COUNT(1) AS orphans_actividades_proyecto
FROM dbo.actividades a
LEFT JOIN dbo.proyectos p ON p.id_proyecto = a.id_proyecto
WHERE a.id_proyecto IS NOT NULL AND p.id_proyecto IS NULL;

SELECT COUNT(1) AS orphans_empleado_proyecto_empleado
FROM dbo.empleado_proyecto ep
LEFT JOIN dbo.empleados e ON e.id_empleado = ep.id_empleado
WHERE e.id_empleado IS NULL;

SELECT COUNT(1) AS orphans_empleado_proyecto_proyecto
FROM dbo.empleado_proyecto ep
LEFT JOIN dbo.proyectos p ON p.id_proyecto = ep.id_proyecto
WHERE p.id_proyecto IS NULL;

SELECT COUNT(1) AS orphans_jefe_areas_visibilidad_jefe
FROM dbo.jefe_areas_visibilidad jv
LEFT JOIN dbo.empleados e ON e.id_empleado = jv.id_jefe
WHERE e.id_empleado IS NULL;

SELECT COUNT(1) AS orphans_jefe_areas_visibilidad_area
FROM dbo.jefe_areas_visibilidad jv
LEFT JOIN dbo.areas a ON a.id_area = jv.id_area
WHERE a.id_area IS NULL;

SELECT COUNT(1) AS orphans_notificaciones_usuario
FROM dbo.notificaciones n
LEFT JOIN dbo.usuarios u ON u.id_usuario = n.id_usuario
WHERE u.id_usuario IS NULL;

PRINT '=== Muestreo Unicode ===';
SELECT TOP 5 id_notificacion, titulo, mensaje FROM dbo.notificaciones ORDER BY id_notificacion;
SELECT TOP 5 id_usuario, correo FROM dbo.usuarios ORDER BY id_usuario;
SELECT TOP 5 id_empleado, nombre, apellido FROM dbo.empleados ORDER BY id_empleado;
