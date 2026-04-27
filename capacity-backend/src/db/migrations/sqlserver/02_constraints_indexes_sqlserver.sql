/*
  02_constraints_indexes_sqlserver.sql
  Agrega llaves foraneas e indices luego de la carga de datos.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* Uniques */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_roles_nombre' AND object_id = OBJECT_ID('dbo.roles'))
  CREATE UNIQUE INDEX UQ_roles_nombre ON dbo.roles(nombre);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_departamentos_nom_dpto' AND object_id = OBJECT_ID('dbo.departamentos'))
  CREATE UNIQUE INDEX UQ_departamentos_nom_dpto ON dbo.departamentos(NOM_DPTO);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_areas_area_key' AND object_id = OBJECT_ID('dbo.areas'))
  CREATE UNIQUE INDEX UQ_areas_area_key ON dbo.areas(area_key);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_usuarios_correo' AND object_id = OBJECT_ID('dbo.usuarios'))
  CREATE UNIQUE INDEX UQ_usuarios_correo ON dbo.usuarios(correo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_empleados_numero_documento' AND object_id = OBJECT_ID('dbo.empleados'))
  CREATE UNIQUE INDEX UQ_empleados_numero_documento ON dbo.empleados(numero_documento);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_empleados_id_usuario' AND object_id = OBJECT_ID('dbo.empleados'))
  CREATE UNIQUE INDEX UQ_empleados_id_usuario ON dbo.empleados(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_periodos_sprint_semana' AND object_id = OBJECT_ID('dbo.periodos'))
  CREATE UNIQUE INDEX UQ_periodos_sprint_semana ON dbo.periodos(id_sprint, numero_semana);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_registro_dia_empleado_fecha' AND object_id = OBJECT_ID('dbo.registro_dia'))
  CREATE UNIQUE INDEX UQ_registro_dia_empleado_fecha ON dbo.registro_dia(id_empleado, fecha);
GO

/* FKs principales */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_areas_departamentos')
  ALTER TABLE dbo.areas
    ADD CONSTRAINT FK_areas_departamentos FOREIGN KEY (id_departamento)
    REFERENCES dbo.departamentos(id_departamento);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_usuarios_roles')
  ALTER TABLE dbo.usuarios
    ADD CONSTRAINT FK_usuarios_roles FOREIGN KEY (id_rol)
    REFERENCES dbo.roles(id_rol);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleados_oficios')
  ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_oficios FOREIGN KEY (id_oficio)
    REFERENCES dbo.oficios(id_oficio);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleados_areas')
  ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_areas FOREIGN KEY (id_area)
    REFERENCES dbo.areas(id_area);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleados_departamentos')
  ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_departamentos FOREIGN KEY (id_departamento)
    REFERENCES dbo.departamentos(id_departamento);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleados_grupos')
  ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_grupos FOREIGN KEY (id_grupo)
    REFERENCES dbo.grupos(id_grupo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleados_jefe')
  ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_jefe FOREIGN KEY (id_jefe)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleados_usuarios')
  ALTER TABLE dbo.empleados
    ADD CONSTRAINT FK_empleados_usuarios FOREIGN KEY (id_usuario)
    REFERENCES dbo.usuarios(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_categorias_ccosto')
  ALTER TABLE dbo.categorias_actividad
    ADD CONSTRAINT FK_categorias_ccosto FOREIGN KEY (id_ccosto)
    REFERENCES dbo.centros_costo(id_ccosto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_subcategorias_categoria')
  ALTER TABLE dbo.subcategorias_actividad
    ADD CONSTRAINT FK_subcategorias_categoria FOREIGN KEY (id_categoria)
    REFERENCES dbo.categorias_actividad(id_categoria);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_subcategorias_ccosto')
  ALTER TABLE dbo.subcategorias_actividad
    ADD CONSTRAINT FK_subcategorias_ccosto FOREIGN KEY (id_ccosto)
    REFERENCES dbo.centros_costo(id_ccosto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_sprints_ccosto')
  ALTER TABLE dbo.sprints
    ADD CONSTRAINT FK_sprints_ccosto FOREIGN KEY (id_ccosto)
    REFERENCES dbo.centros_costo(id_ccosto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_sprints_creado_por')
  ALTER TABLE dbo.sprints
    ADD CONSTRAINT FK_sprints_creado_por FOREIGN KEY (creado_por)
    REFERENCES dbo.usuarios(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_periodos_sprints')
  ALTER TABLE dbo.periodos
    ADD CONSTRAINT FK_periodos_sprints FOREIGN KEY (id_sprint)
    REFERENCES dbo.sprints(id_sprint);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_proyectos_oficina')
  ALTER TABLE dbo.proyectos
    ADD CONSTRAINT FK_proyectos_oficina FOREIGN KEY (id_oficina)
    REFERENCES dbo.oficinas_proyecto(id_oficina);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_proyectos_programa')
  ALTER TABLE dbo.proyectos
    ADD CONSTRAINT FK_proyectos_programa FOREIGN KEY (id_programa)
    REFERENCES dbo.programas_proyecto(id_programa);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_proyectos_area')
  ALTER TABLE dbo.proyectos
    ADD CONSTRAINT FK_proyectos_area FOREIGN KEY (id_area)
    REFERENCES dbo.areas(id_area);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_proyectos_ccosto')
  ALTER TABLE dbo.proyectos
    ADD CONSTRAINT FK_proyectos_ccosto FOREIGN KEY (id_ccosto)
    REFERENCES dbo.centros_costo(id_ccosto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_proyectos_lider')
  ALTER TABLE dbo.proyectos
    ADD CONSTRAINT FK_proyectos_lider FOREIGN KEY (id_lider)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_proyectos_creado_por')
  ALTER TABLE dbo.proyectos
    ADD CONSTRAINT FK_proyectos_creado_por FOREIGN KEY (creado_por)
    REFERENCES dbo.usuarios(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleado_proyecto_empleado')
  ALTER TABLE dbo.empleado_proyecto
    ADD CONSTRAINT FK_empleado_proyecto_empleado FOREIGN KEY (id_empleado)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleado_proyecto_proyecto')
  ALTER TABLE dbo.empleado_proyecto
    ADD CONSTRAINT FK_empleado_proyecto_proyecto FOREIGN KEY (id_proyecto)
    REFERENCES dbo.proyectos(id_proyecto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_empleado_proyecto_asignado_por')
  ALTER TABLE dbo.empleado_proyecto
    ADD CONSTRAINT FK_empleado_proyecto_asignado_por FOREIGN KEY (asignado_por)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_registro_dia_empleado')
  ALTER TABLE dbo.registro_dia
    ADD CONSTRAINT FK_registro_dia_empleado FOREIGN KEY (id_empleado)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_registro_dia_sprint')
  ALTER TABLE dbo.registro_dia
    ADD CONSTRAINT FK_registro_dia_sprint FOREIGN KEY (id_sprint)
    REFERENCES dbo.sprints(id_sprint);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_registro_dia_periodo')
  ALTER TABLE dbo.registro_dia
    ADD CONSTRAINT FK_registro_dia_periodo FOREIGN KEY (id_periodo)
    REFERENCES dbo.periodos(id_periodo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_actividades_registro')
  ALTER TABLE dbo.actividades
    ADD CONSTRAINT FK_actividades_registro FOREIGN KEY (id_registro)
    REFERENCES dbo.registro_dia(id_registro);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_actividades_subcategoria')
  ALTER TABLE dbo.actividades
    ADD CONSTRAINT FK_actividades_subcategoria FOREIGN KEY (id_subcategoria)
    REFERENCES dbo.subcategorias_actividad(id_subcategoria);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_actividades_proyecto')
  ALTER TABLE dbo.actividades
    ADD CONSTRAINT FK_actividades_proyecto FOREIGN KEY (id_proyecto)
    REFERENCES dbo.proyectos(id_proyecto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_favoritos_empleado_empleado')
  ALTER TABLE dbo.favoritos_empleado
    ADD CONSTRAINT FK_favoritos_empleado_empleado FOREIGN KEY (id_empleado)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_favoritos_empleado_subcategoria')
  ALTER TABLE dbo.favoritos_empleado
    ADD CONSTRAINT FK_favoritos_empleado_subcategoria FOREIGN KEY (id_subcategoria)
    REFERENCES dbo.subcategorias_actividad(id_subcategoria);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_historial_aprobaciones_registro')
  ALTER TABLE dbo.historial_aprobaciones
    ADD CONSTRAINT FK_historial_aprobaciones_registro FOREIGN KEY (id_registro)
    REFERENCES dbo.registro_dia(id_registro);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_historial_aprobaciones_revisor')
  ALTER TABLE dbo.historial_aprobaciones
    ADD CONSTRAINT FK_historial_aprobaciones_revisor FOREIGN KEY (id_revisor)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_jefe_areas_visibilidad_jefe')
  ALTER TABLE dbo.jefe_areas_visibilidad
    ADD CONSTRAINT FK_jefe_areas_visibilidad_jefe FOREIGN KEY (id_jefe)
    REFERENCES dbo.empleados(id_empleado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_jefe_areas_visibilidad_area')
  ALTER TABLE dbo.jefe_areas_visibilidad
    ADD CONSTRAINT FK_jefe_areas_visibilidad_area FOREIGN KEY (id_area)
    REFERENCES dbo.areas(id_area);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_notificaciones_usuario')
  ALTER TABLE dbo.notificaciones
    ADD CONSTRAINT FK_notificaciones_usuario FOREIGN KEY (id_usuario)
    REFERENCES dbo.usuarios(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_config_capacidad_ccosto')
  ALTER TABLE dbo.config_capacidad
    ADD CONSTRAINT FK_config_capacidad_ccosto FOREIGN KEY (id_ccosto)
    REFERENCES dbo.centros_costo(id_ccosto);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_config_capacidad_creado_por')
  ALTER TABLE dbo.config_capacidad
    ADD CONSTRAINT FK_config_capacidad_creado_por FOREIGN KEY (creado_por)
    REFERENCES dbo.usuarios(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_project_members_projects')
  ALTER TABLE dbo.project_members
    ADD CONSTRAINT FK_project_members_projects FOREIGN KEY (project_id)
    REFERENCES dbo.projects(id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_projects_areas')
  ALTER TABLE dbo.projects
    ADD CONSTRAINT FK_projects_areas FOREIGN KEY (area_id)
    REFERENCES dbo.areas(id_area);
GO

/* Indices operativos */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_empleados_id_usuario' AND object_id = OBJECT_ID('dbo.empleados'))
  CREATE INDEX IX_empleados_id_usuario ON dbo.empleados(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_empleados_id_jefe' AND object_id = OBJECT_ID('dbo.empleados'))
  CREATE INDEX IX_empleados_id_jefe ON dbo.empleados(id_jefe);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_empleados_id_area' AND object_id = OBJECT_ID('dbo.empleados'))
  CREATE INDEX IX_empleados_id_area ON dbo.empleados(id_area);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_registro_dia_periodo' AND object_id = OBJECT_ID('dbo.registro_dia'))
  CREATE INDEX IX_registro_dia_periodo ON dbo.registro_dia(id_periodo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_registro_dia_sprint' AND object_id = OBJECT_ID('dbo.registro_dia'))
  CREATE INDEX IX_registro_dia_sprint ON dbo.registro_dia(id_sprint);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_registro_dia_estado' AND object_id = OBJECT_ID('dbo.registro_dia'))
  CREATE INDEX IX_registro_dia_estado ON dbo.registro_dia(estado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_registro_dia_fecha' AND object_id = OBJECT_ID('dbo.registro_dia'))
  CREATE INDEX IX_registro_dia_fecha ON dbo.registro_dia(fecha);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_actividades_registro' AND object_id = OBJECT_ID('dbo.actividades'))
  CREATE INDEX IX_actividades_registro ON dbo.actividades(id_registro);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_actividades_subcategoria' AND object_id = OBJECT_ID('dbo.actividades'))
  CREATE INDEX IX_actividades_subcategoria ON dbo.actividades(id_subcategoria);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_actividades_estado' AND object_id = OBJECT_ID('dbo.actividades'))
  CREATE INDEX IX_actividades_estado ON dbo.actividades(estado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sprints_estado' AND object_id = OBJECT_ID('dbo.sprints'))
  CREATE INDEX IX_sprints_estado ON dbo.sprints(estado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_periodos_sprint' AND object_id = OBJECT_ID('dbo.periodos'))
  CREATE INDEX IX_periodos_sprint ON dbo.periodos(id_sprint);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_periodos_estado' AND object_id = OBJECT_ID('dbo.periodos'))
  CREATE INDEX IX_periodos_estado ON dbo.periodos(estado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_notificaciones_usuario_leida' AND object_id = OBJECT_ID('dbo.notificaciones'))
  CREATE INDEX IX_notificaciones_usuario_leida ON dbo.notificaciones(id_usuario, leida);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_jefe_areas_visibilidad_jefe' AND object_id = OBJECT_ID('dbo.jefe_areas_visibilidad'))
  CREATE INDEX IX_jefe_areas_visibilidad_jefe ON dbo.jefe_areas_visibilidad(id_jefe);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_empleado_proyecto_proyecto' AND object_id = OBJECT_ID('dbo.empleado_proyecto'))
  CREATE INDEX IX_empleado_proyecto_proyecto ON dbo.empleado_proyecto(id_proyecto, activo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_proyectos_estado' AND object_id = OBJECT_ID('dbo.proyectos'))
  CREATE INDEX IX_proyectos_estado ON dbo.proyectos(estado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_proyectos_oficina' AND object_id = OBJECT_ID('dbo.proyectos'))
  CREATE INDEX IX_proyectos_oficina ON dbo.proyectos(id_oficina);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_proyectos_lider' AND object_id = OBJECT_ID('dbo.proyectos'))
  CREATE INDEX IX_proyectos_lider ON dbo.proyectos(id_lider);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_auditoria_fecha' AND object_id = OBJECT_ID('dbo.auditoria'))
  CREATE INDEX IX_auditoria_fecha ON dbo.auditoria(fecha DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_auditoria_usuario' AND object_id = OBJECT_ID('dbo.auditoria'))
  CREATE INDEX IX_auditoria_usuario ON dbo.auditoria(id_usuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_auditoria_tabla' AND object_id = OBJECT_ID('dbo.auditoria'))
  CREATE INDEX IX_auditoria_tabla ON dbo.auditoria(tabla_afectada);
GO
