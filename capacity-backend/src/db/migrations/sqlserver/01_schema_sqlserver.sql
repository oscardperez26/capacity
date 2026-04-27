/*
  01_schema_sqlserver.sql
  Fuente: capacity.sql (dump de datos) + consultas runtime del backend
  Objetivo: crear estructura base SIN FKs (se agregan en 02_constraints_indexes_sqlserver.sql)
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.roles (
    id_rol TINYINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre NVARCHAR(30) NOT NULL
  );
END;
GO

IF OBJECT_ID('dbo.departamentos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.departamentos (
    id_departamento SMALLINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    DPTO INT NULL,
    NOM_DPTO NVARCHAR(150) NOT NULL
  );
END;
GO

IF OBJECT_ID('dbo.areas', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.areas (
    id_area SMALLINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    AREA BIGINT NULL,
    NOM_AREA NVARCHAR(150) NOT NULL,
    area_key NVARCHAR(100) NOT NULL,
    id_departamento SMALLINT NULL,
    id AS CONVERT(INT, id_area) PERSISTED,
    label AS NOM_AREA PERSISTED
  );
END;
GO

IF OBJECT_ID('dbo.oficios', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.oficios (
    id_oficio INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OFICIO BIGINT NULL,
    NOM_OFICIO NVARCHAR(220) NOT NULL
  );
END;
GO

IF OBJECT_ID('dbo.grupos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.grupos (
    id_grupo INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    GRUPO BIGINT NULL,
    NOM_GRUPO NVARCHAR(150) NOT NULL
  );
END;
GO

IF OBJECT_ID('dbo.centros_costo', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.centros_costo (
    id_ccosto INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CCOSTO BIGINT NULL,
    NOM_CCOSTO NVARCHAR(150) NULL,
    habilitado_capacity BIT NOT NULL CONSTRAINT DF_centros_costo_habilitado_capacity DEFAULT (1),
    activo BIT NOT NULL CONSTRAINT DF_centros_costo_activo DEFAULT (1),
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_centros_costo_creado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.categorias_actividad', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.categorias_actividad (
    id_categoria SMALLINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_ccosto INT NULL,
    nombre NVARCHAR(120) NOT NULL,
    color NVARCHAR(20) NOT NULL CONSTRAINT DF_categorias_actividad_color DEFAULT (N'#3E5D9D'),
    orden TINYINT NOT NULL CONSTRAINT DF_categorias_actividad_orden DEFAULT (0),
    activo BIT NOT NULL CONSTRAINT DF_categorias_actividad_activo DEFAULT (1)
  );
END;
GO

IF OBJECT_ID('dbo.subcategorias_actividad', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.subcategorias_actividad (
    id_subcategoria SMALLINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_categoria SMALLINT NOT NULL,
    id_ccosto INT NULL,
    nombre NVARCHAR(180) NOT NULL,
    modelo NVARCHAR(20) NOT NULL,
    requiere_proyecto BIT NOT NULL CONSTRAINT DF_subcategorias_actividad_requiere_proyecto DEFAULT (0),
    activo BIT NOT NULL CONSTRAINT DF_subcategorias_actividad_activo DEFAULT (1)
  );
END;
GO

IF OBJECT_ID('dbo.usuarios', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuarios (
    id_usuario INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    correo NVARCHAR(200) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    id_rol TINYINT NOT NULL,
    estado NVARCHAR(20) NOT NULL CONSTRAINT DF_usuarios_estado DEFAULT (N'activo'),
    ultimo_acceso DATETIME2(0) NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_usuarios_creado_en DEFAULT (SYSUTCDATETIME()),
    debe_cambiar_password BIT NOT NULL CONSTRAINT DF_usuarios_debe_cambiar_password DEFAULT (1)
  );
END;
GO

IF OBJECT_ID('dbo.empleados', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.empleados (
    id_empleado INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    EMPLEADO BIGINT NULL,
    tipo_documento NVARCHAR(10) NOT NULL CONSTRAINT DF_empleados_tipo_documento DEFAULT (N'CC'),
    numero_documento NVARCHAR(30) NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    apellido NVARCHAR(120) NOT NULL,
    id_oficio INT NULL,
    id_area SMALLINT NULL,
    id_departamento SMALLINT NULL,
    id_ccosto INT NULL,
    id_grupo INT NULL,
    id_jefe INT NULL,
    id_usuario INT NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_empleados_activo DEFAULT (1),
    fecha_ingreso DATE NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_empleados_creado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.sprints', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.sprints (
    id_sprint INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_ccosto INT NULL,
    nombre NVARCHAR(80) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado NVARCHAR(30) NOT NULL CONSTRAINT DF_sprints_estado DEFAULT (N'planificado'),
    creado_por INT NULL,
    cerrado_en DATETIME2(0) NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_sprints_creado_en DEFAULT (SYSUTCDATETIME()),
    actualizado_en DATETIME2(0) NULL
  );
END;
GO

IF OBJECT_ID('dbo.periodos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.periodos (
    id_periodo INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_sprint INT NOT NULL,
    numero_semana TINYINT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado NVARCHAR(20) NOT NULL CONSTRAINT DF_periodos_estado DEFAULT (N'abierto')
  );
END;
GO

IF OBJECT_ID('dbo.oficinas_proyecto', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.oficinas_proyecto (
    id_oficina INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre NVARCHAR(120) NOT NULL,
    descripcion NVARCHAR(MAX) NULL,
    color NVARCHAR(20) NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_oficinas_proyecto_activo DEFAULT (1)
  );
END;
GO

IF OBJECT_ID('dbo.programas_proyecto', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.programas_proyecto (
    id_programa INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre NVARCHAR(120) NOT NULL,
    descripcion NVARCHAR(MAX) NULL
  );
END;
GO

IF OBJECT_ID('dbo.proyectos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.proyectos (
    id_proyecto INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_oficina INT NULL,
    id_programa INT NULL,
    id_area SMALLINT NULL,
    id_ccosto INT NULL,
    id_lider INT NULL,
    creado_por INT NULL,
    nombre NVARCHAR(220) NOT NULL,
    descripcion NVARCHAR(MAX) NULL,
    tipo NVARCHAR(30) NOT NULL CONSTRAINT DF_proyectos_tipo DEFAULT (N'estrategico'),
    tipo_proyecto NVARCHAR(30) NOT NULL CONSTRAINT DF_proyectos_tipo_proyecto DEFAULT (N'proyecto'),
    clasificacion NVARCHAR(40) NOT NULL CONSTRAINT DF_proyectos_clasificacion DEFAULT (N'estrategico'),
    alcance_visibilidad NVARCHAR(30) NOT NULL CONSTRAINT DF_proyectos_alcance_visibilidad DEFAULT (N'oficina'),
    estado NVARCHAR(30) NOT NULL CONSTRAINT DF_proyectos_estado DEFAULT (N'sin_iniciar'),
    avance_pct INT NOT NULL CONSTRAINT DF_proyectos_avance_pct DEFAULT (0),
    estado_detalle NVARCHAR(255) NULL,
    presupuesto_est DECIMAL(18,2) NULL,
    costo_est_anual DECIMAL(18,2) NULL,
    costo_ejec_anual DECIMAL(18,2) NULL,
    observaciones NVARCHAR(MAX) NULL,
    fecha_inicio DATE NULL,
    fecha_fin DATE NULL,
    fecha_fin_real DATE NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_proyectos_creado_en DEFAULT (SYSUTCDATETIME()),
    actualizado_en DATETIME2(0) NULL
  );
END;
GO

IF OBJECT_ID('dbo.empleado_proyecto', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.empleado_proyecto (
    id_empleado INT NOT NULL,
    id_proyecto INT NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_empleado_proyecto_activo DEFAULT (1),
    asignado_por INT NULL,
    asignado_en DATETIME2(0) NOT NULL CONSTRAINT DF_empleado_proyecto_asignado_en DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_empleado_proyecto PRIMARY KEY (id_empleado, id_proyecto)
  );
END;
GO

IF OBJECT_ID('dbo.registro_dia', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.registro_dia (
    id_registro INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_empleado INT NOT NULL,
    id_sprint INT NOT NULL,
    id_periodo INT NOT NULL,
    fecha DATE NOT NULL,
    estado NVARCHAR(20) NOT NULL CONSTRAINT DF_registro_dia_estado DEFAULT (N'borrador'),
    habilitado_edicion BIT NOT NULL CONSTRAINT DF_registro_dia_habilitado DEFAULT (0),
    fecha_envio DATETIME2(0) NULL,
    fecha_aprobacion DATETIME2(0) NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_registro_dia_creado_en DEFAULT (SYSUTCDATETIME()),
    actualizado_en DATETIME2(0) NOT NULL CONSTRAINT DF_registro_dia_actualizado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.actividades', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.actividades (
    id_actividad INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_registro INT NOT NULL,
    id_subcategoria SMALLINT NOT NULL,
    id_proyecto INT NULL,
    duracion_mins SMALLINT NOT NULL CONSTRAINT DF_actividades_duracion_mins DEFAULT (15),
    descripcion NVARCHAR(MAX) NULL,
    estado NVARCHAR(20) NOT NULL CONSTRAINT DF_actividades_estado DEFAULT (N'borrador'),
    comentario_rechazo NVARCHAR(MAX) NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_actividades_creado_en DEFAULT (SYSUTCDATETIME()),
    actualizado_en DATETIME2(0) NOT NULL CONSTRAINT DF_actividades_actualizado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.favoritos_empleado', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.favoritos_empleado (
    id_empleado INT NOT NULL,
    id_subcategoria SMALLINT NOT NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_favoritos_empleado_creado_en DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_favoritos_empleado PRIMARY KEY (id_empleado, id_subcategoria)
  );
END;
GO

IF OBJECT_ID('dbo.historial_aprobaciones', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.historial_aprobaciones (
    id_aprobacion INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_registro INT NOT NULL,
    id_revisor INT NOT NULL,
    accion NVARCHAR(20) NOT NULL,
    comentario NVARCHAR(MAX) NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_historial_aprobaciones_creado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.jefe_areas_visibilidad', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.jefe_areas_visibilidad (
    id_jefe INT NOT NULL,
    id_area SMALLINT NOT NULL,
    CONSTRAINT PK_jefe_areas_visibilidad PRIMARY KEY (id_jefe, id_area)
  );
END;
GO

IF OBJECT_ID('dbo.notificaciones', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.notificaciones (
    id_notificacion INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    titulo NVARCHAR(220) NOT NULL,
    mensaje NVARCHAR(MAX) NOT NULL,
    leida BIT NOT NULL CONSTRAINT DF_notificaciones_leida DEFAULT (0),
    id_referencia INT NULL,
    tipo_referencia NVARCHAR(50) NULL,
    metadata NVARCHAR(MAX) NULL,
    creado_en DATETIME2(0) NOT NULL CONSTRAINT DF_notificaciones_creado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.config_capacidad', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.config_capacidad (
    id_config INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_ccosto INT NOT NULL,
    horas_semana DECIMAL(6,2) NOT NULL,
    pct_meta_run TINYINT NOT NULL,
    pct_meta_build TINYINT NOT NULL,
    pct_meta_admin TINYINT NOT NULL,
    pct_meta_grow TINYINT NOT NULL,
    permite_sabado BIT NOT NULL CONSTRAINT DF_config_capacidad_permite_sabado DEFAULT (0),
    permite_domingo BIT NOT NULL CONSTRAINT DF_config_capacidad_permite_domingo DEFAULT (0),
    creado_por INT NULL,
    actualizado_en DATETIME2(0) NOT NULL CONSTRAINT DF_config_capacidad_actualizado_en DEFAULT (SYSUTCDATETIME())
  );
END;
GO

IF OBJECT_ID('dbo.auditoria', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.auditoria (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tabla_afectada NVARCHAR(80) NOT NULL,
    id_registro INT NULL,
    accion NVARCHAR(20) NOT NULL,
    id_usuario INT NULL,
    nombre_usuario NVARCHAR(200) NULL,
    valor_anterior NVARCHAR(MAX) NULL,
    valor_nuevo NVARCHAR(MAX) NULL,
    ip_address NVARCHAR(45) NULL,
    fecha DATETIME2(0) NOT NULL CONSTRAINT DF_auditoria_fecha DEFAULT (SYSUTCDATETIME())
  );
END;
GO

/* Compatibilidad /api/projects (legacy) */
IF OBJECT_ID('dbo.projects', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.projects (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    area_id SMALLINT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    type NVARCHAR(30) NOT NULL CONSTRAINT DF_projects_type DEFAULT (N'estrategico'),
    status NVARCHAR(30) NOT NULL CONSTRAINT DF_projects_status DEFAULT (N'activo'),
    created_by INT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_projects_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(0) NULL
  );
END;
GO

IF OBJECT_ID('dbo.project_members', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.project_members (
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_project_members_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_project_members PRIMARY KEY (project_id, user_id)
  );
END;
GO

/* Checks de dominio */
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_subcategorias_modelo')
  ALTER TABLE dbo.subcategorias_actividad
    ADD CONSTRAINT CK_subcategorias_modelo CHECK (modelo IN (N'RUN', N'BUILD', N'ADMIN', N'GROW', N'OFF'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_usuarios_estado')
  ALTER TABLE dbo.usuarios
    ADD CONSTRAINT CK_usuarios_estado CHECK (estado IN (N'activo', N'inactivo'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_registro_dia_estado')
  ALTER TABLE dbo.registro_dia
    ADD CONSTRAINT CK_registro_dia_estado CHECK (estado IN (N'borrador', N'enviado', N'aprobado', N'rechazado'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_actividades_estado')
  ALTER TABLE dbo.actividades
    ADD CONSTRAINT CK_actividades_estado CHECK (estado IN (N'borrador', N'enviado', N'aprobado', N'rechazado'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_notificaciones_metadata_json')
  ALTER TABLE dbo.notificaciones
    ADD CONSTRAINT CK_notificaciones_metadata_json CHECK (metadata IS NULL OR ISJSON(metadata) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_auditoria_valor_anterior_json')
  ALTER TABLE dbo.auditoria
    ADD CONSTRAINT CK_auditoria_valor_anterior_json CHECK (valor_anterior IS NULL OR ISJSON(valor_anterior) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_auditoria_valor_nuevo_json')
  ALTER TABLE dbo.auditoria
    ADD CONSTRAINT CK_auditoria_valor_nuevo_json CHECK (valor_nuevo IS NULL OR ISJSON(valor_nuevo) = 1);
GO
