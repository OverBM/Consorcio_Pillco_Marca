# Runbook de producción — Supabase

## Modelo

- **81 tablas de dominio en `public`** + `spatial_ref_sys` en `extensions` (PostGIS).
- 13 tablas retiradas: acciones correctivas, búsquedas multi-almacén, capacitación (participantes/certificaciones), comunicaciones, interesados, EPP solicitudes, equipos, lecciones aprendidas, partida materiales, plan de manejo.
- 8 tablas consolidadas: `solicitudes`/`solicitud_detalles`, `transferencias`, `alertas`, `documentos`, `personas`, `proveedores`.
- `stock_almacen` es la fuente operativa; `parametros_inventario.*_calculado` es recomendación analítica.
- `USAGE` sobre el esquema `extensions` está otorgado a los tres roles; sin él, `ST_*` y `geography` fallan.

## Supabase validado

| Dato                         | Valor                                                             |
| ---------------------------- | ----------------------------------------------------------------- |
| Región                       | `sa-east-1`                                                       |
| PostgreSQL                   | **17.12**                                                         |
| PostGIS                      | **3.3.7** en `extensions`                                         |
| pg_stat_statements           | 1.11 en `extensions`                                              |
| pg_cron                      | 1.6.4 en `pg_catalog`                                             |
| Pooler                       | session, puerto `5432`, IPv4 + SSL                                |
| Data API                     | **deshabilitada** (`api.db_schema = pg_pgrst_no_exposed_schemas`) |
| Tamaño de base               | ~27 MB con dataset demo                                           |
| Conexiones                   | `max_connections = 60`                                            |
| `log_min_duration_statement` | `500ms` para `app_user`                                           |
| Keep-alive                   | job `keep-alive` de pg_cron, diario 06:00 UTC                     |

## Roles

| Rol              | Uso                    | Privilegios                                                                    |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `migration_user` | migraciones y baseline | dueño de `public`; DDL; **nunca runtime**                                      |
| `app_user`       | runtime Laravel        | `SELECT/INSERT/UPDATE/DELETE`, secuencias y funciones; sin `CREATE`/`TRUNCATE` |
| `readonly_user`  | monitoreo              | `SELECT` + `pg_monitor`                                                        |

Los privilegios por defecto de `migration_user` cubren tablas, secuencias y funciones nuevas. Las contraseñas viven fuera del repositorio.

## Entorno

```
APP_ENV=production
APP_DEBUG=false
APP_KEY=<clave única de producción>
APP_URL=<dominio definitivo>

DB_CONNECTION=pgsql
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=app_user.<project-ref>
DB_PASSWORD=<secreto>
DB_SSLMODE=require
DB_SEARCH_PATH=public,extensions
DB_URL=
```

Para migrar se usa `migration_user.<project-ref>`; para runtime, `app_user.<project-ref>`.

Generar una `APP_KEY` única por entorno (`php artisan key:generate --show`) y no reutilizar la de local. Configurar `APP_URL` con el dominio definitivo cuando exista el hosting.

`config/database.php` lee `DB_SEARCH_PATH`. Si Windows define `DB_HOST`/`DB_PASSWORD` globales, `DB_URL` explícito evita que pisen el `.env`.

## Primer despliegue

Requisitos: `psql` en el `PATH` (Laravel lo usa para cargar el baseline).

```bash
php artisan down --retry=60
php artisan migrate:fresh --seed --force
php artisan optimize:clear
php artisan optimize
php artisan up
```

- `migrate:fresh` carga `database/schema/pgsql-schema.sql` y luego siembra.
- Solo se ejecuta **una vez**, con la base vacía.
- El seeder inicial es `DemoProduccionSeeder`; si el programa ya existe, se omite.

## Despliegues posteriores

```bash
php artisan down --retry=60
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
php artisan up
```

**No usar `migrate:fresh`**: producción conserva el dataset demo.

## Baseline portable

`database/schema/pgsql-schema.sql` se genera con `pg_dump -n public` sanitizado + datos de `public.migrations`. No usar `php artisan schema:dump` directo contra Supabase: vuelca `auth`, `storage`, `extensions`, etc.

Reglas de sanitización aplicadas:

- Quitar `SET transaction_timeout` (solo PG18; Supabase es PG17).
- Quitar `CREATE SCHEMA public` y su comentario (el esquema ya existe).
- Quitar `\restrict` / `\unrestrict` (meta-comandos de psql 18).
- Dejar `geography` **sin** calificar y fijar `SET search_path = public, extensions;` para que resuelva con PostGIS en `public` (CI) o `extensions` (Supabase).
- **No** eliminar los terminadores `\.` de los bloques `COPY` al sanitizar dumps planos.

`pg_dump` 18 contra Supabase emite `pg_attver` (reloption propia del servidor). Es inocuo al restaurar en Supabase, pero un restore en PostgreSQL vanilla lo rechaza; en dumps planos se eliminan esas líneas.

## Respaldos

```bash
pg_dump "host=... user=migration_user.<ref> dbname=postgres sslmode=require" \
  -Fc -n public --no-owner --no-acl -f respaldo-$(date +%F).dump
```

- Retención: 30 diarios + 12 semanales.
- Restauración probada: 81 tablas, 1444 kardex, 5 solicitudes, 5 usuarios, 30 migraciones y 9 columnas geography.
- Para restore en PostgreSQL vanilla: instalar PostGIS en `extensions` y usar un dump plano sin `pg_attver`.

## Operación

- `ANALYZE` ejecutado en el despliegue inicial.
- `autovacuum` reforzado en `kardex`, `auditorias` y `pronosticos_demanda`.
- Umbral de particionado: 5 M filas o 2 GB para `kardex`/`auditorias`.
- Monitoreo: `extensions.pg_stat_statements`, `pg_stat_user_tables`, `pg_stat_user_indexes`.
- El tuning de instancia (`shared_buffers`, `random_page_cost`, etc.) lo gestiona Supabase; valores observados: `shared_buffers=28672`, `effective_cache_size=49152`, `work_mem=2184`, `maintenance_work_mem=32768`, `random_page_cost=1.1`.

## Analítica

- El motor FastAPI debe estar en `ANALYTICS_BASE_URL`: local `http://127.0.0.1:8001`, producción en Render.
- Local: `cd analytics` y `D:\Python312\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001` (o `node analytics/start-analytics.cjs`). `ANALYTICS_API_TOKEN` debe coincidir con Laravel.
- El pipeline persiste por lotes (`upsert` de pronósticos): ~10-12 s; antes tardaba 77-82 s y el request web moría a los 30 s.
- `POST /api/v1/analitica/ejecutar` es síncrono (~14 s, con `set_time_limit(120)`); responde 200 y deja la ejecución `completada`.
- Si el motor está caído, el endpoint responde 422 con `cURL error 7` y la ejecución queda `fallida`.
- Las ejecuciones `en_proceso` con más de 5 min se marcan `fallida`; el lock de ejecución dura 300 s.
- Producción: servicio Python en Render con root `analytics`, `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` y health check `/health`.
- El primer arranque del motor puede tardar; el cliente espera hasta `ANALYTICS_STARTUP_WAIT` (20 s) en `/health` antes de enviar el pipeline. Si no está disponible, la ejecución queda `fallida` con un mensaje claro.
- Las ejecuciones expiradas guardan su duración al pasar a `fallida` (ya no muestran `-`).
- SSR está deshabilitado por defecto (`INERTIA_SSR_ENABLED=false`). Si se habilita, ejecutar `npm run build:ssr` y mantener el proceso SSR; de lo contrario el HTML del servidor queda desincronizado y React lanza un hydration mismatch (por ejemplo en `OfflineIndicator`).

## Rendimiento

- `PDO::ATTR_EMULATE_PREPARES` en la conexión `pgsql`: el pooler tarda ~96 ms por consulta emulada frente a ~328 ms con prepared statements nativos.
- Props compartidos de Inertia cacheados: usuario 60 s, notificaciones 30 s, catálogos 300 s, badges 60 s. En producción usar `CACHE_STORE=file` (una instancia) o Redis; `database` añade un round trip por lectura de caché.
- El panel separa sus props diferidos en tres grupos paralelos: `panel-rapido`, `panel-datos` y `panel-pmi`; las cards rápidas no esperan a PMI.
- `panel:precalentar` se ejecuta cada minuto (`withoutOverlapping`) y recalcula las cards; si todas siguen frescas, retorna sin consultar. TTLs: cards 120 s, PMI/rutas 300 s, hero/eventos/materiales 120 s.
- El scheduler requiere `* * * * * php artisan schedule:run` (o `php artisan schedule:work` en local).
- PMI: el EVM consolida las valorizaciones en una sola consulta y no carga `partidas`/`almacenes`; la card baja de ~27 a 10 consultas.
- Inventario: stock, kardex y transferencias se leen una vez y las series/salud se calculan en PHP; baja de ~11 a 3 consultas.
- En local, `PHP_CLI_SERVER_WORKERS=4` evita que los deferred se serialicen en `php artisan serve`.
- Medición con prewarm: panel inicial 2.8 s, cards 1.8-2.7 s; precalentamiento frío 7.4 s y tibio ~1.6 s (arranque de Artisan).
- ORS activo (`RUTEO_DRIVER=ors` + `ORS_API_KEY`); los tests usan `haversine` para no consumir cuota.
- Fase 2: contadores en una sola consulta; `$with = ['persona']` en `Usuario` y `Trabajador`; índices `kardex(tipo_movimiento, created_at)`, `alertas(estado, tipo)`, `hitos(fecha_planificada, estado)` y `solicitudes(tipo, urgente, estado)`; invalidación de caché en `Obra`, `Almacen`, `Material`, `Rol`, `Permiso` y `Notificacion`.
- Cuello restante: ~96 ms por round trip más ~0.6 s de conexión por request. Para bajar de 2 s de forma consistente, alojar Laravel en una región cercana a Supabase (São Paulo).
- **Importante**: los valores cacheados deben ser arrays (`->all()`), nunca `Collection`/objetos; el store de archivo los devuelve como `__PHP_Incomplete_Class` y el layout Inertia falla con `_.find is not a function`.
- Tras desplegar cambios en props cacheados, ejecutar `php artisan cache:clear`.

## Pendiente de infraestructura

- Probar la conexión desde el hosting definitivo (IPv4/SSL); desde local ya está validada.
- Medir 24 h de errores, latencia, locks y uso de índices.
- Aprobación de go-live con respaldo verificado.
- Revocar el token temporal de la Management API usado para el aprovisionamiento.
