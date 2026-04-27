-- ============================================================
-- CAPACITY — Esquema Relacional Completo v2.0
-- Koaj Permoda · Área de Tecnología
-- Orden: de menor a mayor dependencia
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ══════════════════════════════════════════════════════════════
-- CAPA 1: ESTRUCTURA ORGANIZACIONAL
-- ══════════════════════════════════════════════════════════════

-- 1.1 Roles del sistema
CREATE TABLE IF NOT EXISTS roles (
  id_rol    TINYINT      NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(30)  NOT NULL UNIQUE
            COMMENT 'admin | jefe | especialista',
  PRIMARY KEY (id_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Roles de acceso al sistema';

-- 1.2 Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id_departamento  SMALLINT     NOT NULL AUTO_INCREMENT,
  nombre           VARCHAR(100) NOT NULL UNIQUE,
  PRIMARY KEY (id_departamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 Áreas (dentro de departamentos)
CREATE TABLE IF NOT EXISTS areas (
  id_area          SMALLINT     NOT NULL AUTO_INCREMENT,
  nombre           VARCHAR(100) NOT NULL UNIQUE,
  area_key         VARCHAR(50)  NOT NULL UNIQUE
                   COMMENT 'clave corta: infraestructura, seguridad...',
  id_departamento  SMALLINT     NOT NULL,
  PRIMARY KEY (id_area),
  FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Cargos
CREATE TABLE IF NOT EXISTS cargos (
  id_cargo   SMALLINT     NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  PRIMARY KEY (id_cargo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 2: CATÁLOGO DE ACTIVIDADES
-- ══════════════════════════════════════════════════════════════

-- 2.1 Categorías (Operación, Proyectos, Gestión...)
CREATE TABLE IF NOT EXISTS categorias_actividad (
  id_categoria  SMALLINT     NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  color         VARCHAR(20)  NOT NULL DEFAULT '#3E5D9D',
  orden         TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Subcategorías (Incidentes, Monitoreo, Cambios...)
CREATE TABLE IF NOT EXISTS subcategorias_actividad (
  id_subcategoria    SMALLINT     NOT NULL AUTO_INCREMENT,
  id_categoria       SMALLINT     NOT NULL,
  nombre             VARCHAR(150) NOT NULL,
  modelo             ENUM('RUN','BUILD','ADMIN','GROW','OFF') NOT NULL,
  requiere_proyecto  TINYINT(1)   NOT NULL DEFAULT 0
                     COMMENT '1 si es obligatorio asociar proyecto',
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_subcategoria),
  FOREIGN KEY (id_categoria) REFERENCES categorias_actividad(id_categoria)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 3: PERSONAS
-- ══════════════════════════════════════════════════════════════

-- 3.1 Usuarios del sistema (autenticación)
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      INT          NOT NULL AUTO_INCREMENT,
  correo          VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  id_rol          TINYINT      NOT NULL,
  estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  ultimo_login    DATETIME     NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Empleados (información personal y organizacional)
CREATE TABLE IF NOT EXISTS empleados (
  id_empleado      INT          NOT NULL AUTO_INCREMENT,
  codigo_empleado  VARCHAR(20)  NOT NULL UNIQUE,
  tipo_documento   ENUM('CC','CE','PA','TI') NOT NULL DEFAULT 'CC',
  numero_documento VARCHAR(20)  NOT NULL UNIQUE,
  nombre           VARCHAR(100) NOT NULL,
  apellido         VARCHAR(100) NOT NULL,
  id_cargo         SMALLINT     NOT NULL,
  id_area          SMALLINT     NOT NULL,
  id_departamento  SMALLINT     NOT NULL,
  id_jefe          INT          NULL
                   COMMENT 'FK a sí misma — jefe directo',
  id_usuario       INT          NOT NULL UNIQUE
                   COMMENT 'Vínculo con login',
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  fecha_ingreso    DATE         NULL,
  PRIMARY KEY (id_empleado),
  FOREIGN KEY (id_cargo)       REFERENCES cargos(id_cargo)        ON DELETE RESTRICT,
  FOREIGN KEY (id_area)        REFERENCES areas(id_area)          ON DELETE RESTRICT,
  FOREIGN KEY (id_departamento)REFERENCES departamentos(id_departamento) ON DELETE RESTRICT,
  FOREIGN KEY (id_jefe)        REFERENCES empleados(id_empleado)  ON DELETE SET NULL,
  FOREIGN KEY (id_usuario)     REFERENCES usuarios(id_usuario)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 4: CONTROL DE TIEMPO
-- ══════════════════════════════════════════════════════════════

-- 4.1 Sprints globales
CREATE TABLE IF NOT EXISTS sprints (
  id_sprint    INT         NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(50) NOT NULL,
  fecha_inicio DATE        NOT NULL,
  fecha_fin    DATE        NOT NULL,
  estado       ENUM('activo','cerrado') NOT NULL DEFAULT 'activo',
  creado_por   INT         NULL,
  fecha_cierre DATETIME    NULL,
  fecha_creacion DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sprint),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CHECK (fecha_fin > fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.2 Períodos semanales (dentro de cada sprint)
CREATE TABLE IF NOT EXISTS periodos (
  id_periodo    INT         NOT NULL AUTO_INCREMENT,
  id_sprint     INT         NOT NULL,
  fecha_inicio  DATE        NOT NULL COMMENT 'Siempre lunes',
  fecha_fin     DATE        NOT NULL COMMENT 'Siempre domingo',
  numero_semana TINYINT     NOT NULL COMMENT 'Semana 1, 2... del sprint',
  estado        ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  fecha_cierre  DATETIME    NULL,
  PRIMARY KEY (id_periodo),
  FOREIGN KEY (id_sprint) REFERENCES sprints(id_sprint) ON DELETE CASCADE,
  UNIQUE KEY uq_sprint_semana (id_sprint, numero_semana),
  CHECK (fecha_fin > fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.3 Reaperturas de período por jefe
CREATE TABLE IF NOT EXISTS periodos_empleado (
  id               INT         NOT NULL AUTO_INCREMENT,
  id_periodo       INT         NOT NULL,
  id_empleado      INT         NOT NULL,
  habilitado       TINYINT(1)  NOT NULL DEFAULT 1,
  motivo           TEXT        NULL,
  habilitado_por   INT         NOT NULL COMMENT 'Jefe que habilitó',
  fecha_habilitacion DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_periodo_empleado (id_periodo, id_empleado),
  FOREIGN KEY (id_periodo)     REFERENCES periodos(id_periodo)   ON DELETE CASCADE,
  FOREIGN KEY (id_empleado)    REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  FOREIGN KEY (habilitado_por) REFERENCES empleados(id_empleado) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 5: PROYECTOS
-- ══════════════════════════════════════════════════════════════

-- 5.1 Proyectos
CREATE TABLE IF NOT EXISTS proyectos (
  id_proyecto  INT          NOT NULL AUTO_INCREMENT,
  id_area      SMALLINT     NOT NULL,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT         NULL,
  tipo         ENUM('estrategico','operativo') NOT NULL DEFAULT 'estrategico',
  estado       ENUM('activo','pausado','cerrado') NOT NULL DEFAULT 'activo',
  creado_por   INT          NULL,
  fecha_inicio DATE         NULL,
  fecha_fin    DATE         NULL,
  fecha_creacion DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_proyecto),
  FOREIGN KEY (id_area)    REFERENCES areas(id_area)          ON DELETE RESTRICT,
  FOREIGN KEY (creado_por) REFERENCES empleados(id_empleado)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.2 Asignación de empleados a proyectos
CREATE TABLE IF NOT EXISTS empleado_proyecto (
  id               INT      NOT NULL AUTO_INCREMENT,
  id_empleado      INT      NOT NULL,
  id_proyecto      INT      NOT NULL,
  fecha_asignacion DATE     NOT NULL DEFAULT (CURRENT_DATE),
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_emp_proy (id_empleado, id_proyecto),
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE CASCADE,
  FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 6: REGISTRO DE ACTIVIDADES (CORE)
-- ══════════════════════════════════════════════════════════════

-- 6.1 Cabecera diaria (1 por empleado por día)
CREATE TABLE IF NOT EXISTS registro_dia (
  id_registro      INT      NOT NULL AUTO_INCREMENT,
  id_empleado      INT      NOT NULL,
  id_periodo       INT      NOT NULL,
  fecha            DATE     NOT NULL,
  estado           ENUM('borrador','enviado','aprobado','rechazado')
                   NOT NULL DEFAULT 'borrador',
  fecha_envio      DATETIME NULL,
  fecha_aprobacion DATETIME NULL,
  id_aprobador     INT      NULL,
  fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_registro),
  UNIQUE KEY uq_emp_fecha (id_empleado, fecha)
             COMMENT '1 registro por empleado por día',
  FOREIGN KEY (id_empleado)  REFERENCES empleados(id_empleado)  ON DELETE CASCADE,
  FOREIGN KEY (id_periodo)   REFERENCES periodos(id_periodo)    ON DELETE CASCADE,
  FOREIGN KEY (id_aprobador) REFERENCES empleados(id_empleado)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6.2 Detalle de actividades (N por registro_dia)
CREATE TABLE IF NOT EXISTS actividades (
  id_actividad     INT          NOT NULL AUTO_INCREMENT,
  id_registro      INT          NOT NULL,
  id_subcategoria  SMALLINT     NOT NULL,
  id_proyecto      INT          NULL
                   COMMENT 'NULL si no aplica proyecto',
  descripcion      TEXT         NULL,
  duracion_mins    SMALLINT     NOT NULL DEFAULT 15
                   COMMENT 'Duración en minutos',
  estado           ENUM('borrador','enviado','aprobado','rechazado')
                   NOT NULL DEFAULT 'borrador',
  comentario_rechazo TEXT       NULL,
  fecha_creacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_actividad),
  FOREIGN KEY (id_registro)     REFERENCES registro_dia(id_registro)              ON DELETE CASCADE,
  FOREIGN KEY (id_subcategoria) REFERENCES subcategorias_actividad(id_subcategoria) ON DELETE RESTRICT,
  FOREIGN KEY (id_proyecto)     REFERENCES proyectos(id_proyecto)                 ON DELETE SET NULL,
  CHECK (duracion_mins >= 1 AND duracion_mins <= 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6.3 Favoritos del especialista
CREATE TABLE IF NOT EXISTS favoritos_empleado (
  id_empleado      INT      NOT NULL,
  id_subcategoria  SMALLINT NOT NULL,
  fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_empleado, id_subcategoria),
  FOREIGN KEY (id_empleado)     REFERENCES empleados(id_empleado)               ON DELETE CASCADE,
  FOREIGN KEY (id_subcategoria) REFERENCES subcategorias_actividad(id_subcategoria) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 7: APROBACIONES Y TRAZABILIDAD
-- ══════════════════════════════════════════════════════════════

-- 7.1 Historial completo de aprobaciones
CREATE TABLE IF NOT EXISTS historial_aprobaciones (
  id            INT      NOT NULL AUTO_INCREMENT,
  id_registro   INT      NOT NULL,
  id_actividad  INT      NULL
                COMMENT 'NULL = aprobación del día completo',
  id_jefe       INT      NOT NULL,
  decision      ENUM('aprobado','rechazado') NOT NULL,
  comentario    TEXT     NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (id_registro)  REFERENCES registro_dia(id_registro)  ON DELETE CASCADE,
  FOREIGN KEY (id_actividad) REFERENCES actividades(id_actividad)  ON DELETE CASCADE,
  FOREIGN KEY (id_jefe)      REFERENCES empleados(id_empleado)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 8: NOTIFICACIONES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion  INT          NOT NULL AUTO_INCREMENT,
  id_usuario       INT          NOT NULL,
  tipo             ENUM(
                     'aprobacion',
                     'rechazo',
                     'recordatorio_cierre',
                     'cierre_periodo',
                     'cierre_sprint',
                     'reabrir_periodo'
                   ) NOT NULL,
  mensaje          TEXT         NOT NULL,
  leido            TINYINT(1)   NOT NULL DEFAULT 0,
  metadata         JSON         NULL
                   COMMENT 'Datos extra: id_registro, dias_restantes, etc.',
  fecha_creacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacion),
  INDEX idx_usuario_leido (id_usuario, leido),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════
-- CAPA 9: AUDITORÍA
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auditoria (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  tabla_afectada   VARCHAR(50)  NOT NULL,
  id_registro      INT          NULL,
  accion           ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  id_usuario       INT          NULL,
  nombre_usuario   VARCHAR(200) NULL,
  valor_anterior   JSON         NULL,
  valor_nuevo      JSON         NULL,
  ip_address       VARCHAR(45)  NULL,
  fecha            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tabla   (tabla_afectada),
  INDEX idx_fecha   (fecha),
  INDEX idx_usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
