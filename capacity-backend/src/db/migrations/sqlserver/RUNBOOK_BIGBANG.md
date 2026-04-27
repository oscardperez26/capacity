# RUNBOOK Big Bang MariaDB -> SQL Server

## Objetivo
Migrar `capacity` a SQL Server manteniendo contratos API actuales y con rollback inmediato.

## Prerequisitos
- SQL Server accesible con usuario de escritura y DDL (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`).
- Backup de MariaDB tomado justo antes de la ventana.
- Backend desplegable con `DB_CLIENT=sqlserver`.
- Herramientas: `sqlcmd` y `node`.

## Scripts
1. `01_schema_sqlserver.sql`
2. `03_data_sqlserver.sql`
3. `02_constraints_indexes_sqlserver.sql`
4. `04_postload_checks.sql`
5. `05_api_smoke_sqlserver.js`

Ruta: `src/db/migrations/sqlserver`

## Orden de Ejecucion (Staging y Produccion)
1. **Congelar escrituras** de la app hacia MariaDB.
2. Ejecutar esquema:
   ```powershell
   sqlcmd -S localhost,53604 -U SQL2025TEST -P Admin1234 -d capacity -i "src/db/migrations/sqlserver/01_schema_sqlserver.sql"
   ```
3. Ejecutar datos:
   ```powershell
   sqlcmd -S localhost,53604 -U SQL2025TEST -P Admin1234 -d capacity -i "src/db/migrations/sqlserver/03_data_sqlserver.sql"
   ```
4. Ejecutar constraints + indices:
   ```powershell
   sqlcmd -S localhost,53604 -U SQL2025TEST -P Admin1234 -d capacity -i "src/db/migrations/sqlserver/02_constraints_indexes_sqlserver.sql"
   ```
5. Ejecutar checks:
   ```powershell
   sqlcmd -S localhost,53604 -U SQL2025TEST -P Admin1234 -d capacity -i "src/db/migrations/sqlserver/04_postload_checks.sql"
   ```
6. Cambiar variables del backend a SQL Server y reiniciar.
7. Correr smoke tests API:
   ```powershell
   npm run smoke:sqlserver
   ```

   Opcional (credenciales/base URL personalizados):
   ```powershell
   $env:SMOKE_BASE_URL="http://127.0.0.1:3001"
   $env:SMOKE_EMAIL="admin@permoda.com.co"
   $env:SMOKE_PASSWORD="00000001"
   npm run smoke:sqlserver
   ```

## Validaciones Minimas de Aceptacion
- Conteos `OK` en `04_postload_checks.sql`.
- Orfandades en `0`.
- Login y `auth/me` exitosos.
- Flujo especialista (crear/editar/finalizar jornada) sin errores 5xx.
- Flujo jefe (aprobar/rechazar/habilitar) sin errores 5xx.

## Rollback
1. Sacar backend de rotacion.
2. Restaurar variables a MariaDB:
   - `DB_CLIENT=mariadb`
   - host/puerto/usuario/password anteriores
3. Reiniciar backend.
4. Reactivar escrituras en MariaDB.
5. Levantar incidente con evidencia de:
   - ultimo script exitoso,
   - error exacto,
   - delta de conteos.

## Notas Operativas
- Este corte es **big bang controlado**: no hay dual-write.
- Si falla `02_constraints_indexes`, no habilitar trafico hasta corregir integridad.
