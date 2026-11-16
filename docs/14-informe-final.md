# Informe técnico final — Consorcio Pillco Marca (ObraFlow)

## 1. Portada

| Campo | Detalle |
|---|---|
| Título | Sistema Web Geolocalizado Multi-Almacén y Gestión de Proyectos |
| Proyecto | Consorcio Pillco Marca — ObraFlow v2 |
| Estudiante | _[Completar nombre del estudiante]_ |
| Curso / asignatura | _[Completar curso]_ |
| Docente | _[Completar docente]_ |
| Institución | _[Completar institución]_ |
| Fecha | 10 de noviembre de 2026 |
| Repositorio | https://github.com/OverBM/Consorcio_Pillco_Marca |
| Tecnologías | Laravel 13 · React 19 · Inertia 3 · PostgreSQL/PostGIS · Cypress · SonarCloud |

## 2. Descripción general del proyecto

ObraFlow es un sistema web para la gestión operativa de una empresa constructora. Centraliza inventarios multi-almacén, logística de obra, compras, avance de proyectos, personal, seguridad, calidad y análisis predictivo.

### 2.1 Problema identificado

La información de inventario y avance estaba dispersa entre almacenes y planillas. Esto generaba quiebres de stock, compras urgentes, transferencias innecesarias, mermas sin control y poca visibilidad para la gerencia.

### 2.2 Alcance funcional

| Grupo | Módulos |
|---|---|
| Operación | Panel, stock, recepción, solicitudes, despachos, transferencias, inventario físico y mermas |
| Abastecimiento | Requerimientos, cotizaciones, órdenes de compra, proveedores y devoluciones |
| Proyectos | Programa PMU, partidas, cronograma/EVM, riesgos, cambios, cierre y liquidación |
| Personas | Asistencia con geocerca, planillas, capacitaciones, EPP e incidentes SST |
| Calidad y ambiente | Observaciones técnicas, monitoreo ambiental y residuos |
| Inteligencia | Analítica predictiva, mapa operativo, reportes e indicadores |
| Administración | Usuarios, roles, parámetros, fases y auditoría |

### 2.3 Usuarios del sistema

Gerencia, planificación, área técnica y financiera, residentes y maestros de obra, almaceneros, logística/compras, RRHH, SSOMA, ambiente, proveedores y administración (18 roles definidos).

### 2.4 Objetivos del proyecto

1. Centralizar el inventario multi-almacén y el kardex en una sola fuente de verdad.
2. Automatizar la redistribución de excedentes y el abastecimiento entre obras.
3. Dar visibilidad a la gerencia mediante indicadores y reportes con datos reales.
4. Incorporar geolocalización y ruteo para despachos y geocercas.
5. Demostrar la calidad del software con pruebas automatizadas y análisis estático.

## 3. Arquitectura de software (Actividad 1)

### 1.1 Identificación de la arquitectura

**Tipo de arquitectura:** monolito modular implementado con Laravel 13 y una SPA React 19 comunicada mediante Inertia.js 3. La aplicación web, la API y los procesos de negocio se ejecutan en un único despliegue. El único servicio separado es el motor predictivo en Python/FastAPI, que funciona como servicio satélite interno.

| Característica | Implementación verificada |
|---|---|
| Estilo principal | Monolito modular Laravel 13.30 (PHP 8.5) |
| Presentación | React 19 + Inertia 3 + Tailwind CSS 4 |
| API | REST versionada en `/api/v1` (122 rutas expuestas) |
| Persistencia | PostgreSQL 18.6 + PostGIS 3.7 (104 tablas) |
| Servicio satélite | FastAPI/uvicorn en `127.0.0.1:8001` |
| Comunicación cliente-servidor | Props Inertia en navegación y JSON en la API |
| Autenticación | Sesión web y token Bearer (`remember_token`) para API |

**Capas o componentes principales**

| Capa | Componentes | Responsabilidad |
|---|---|---|
| Presentación | `resources/js` | 42 páginas React, design system, navegación por permisos, modo oscuro y mapa Leaflet |
| Transporte | `routes/web.php`, `routes/api.php`, middleware | Sesión, RBAC, Inertia, `ResolveApiUser` y versionado `api/v1` |
| Aplicación | Controladores Web y API V1 | Validación, autorización y respuesta Inertia/JSON |
| Dominio | `app/Domain` | Reglas de inventario, geo, métricas, analítica, excedentes y proyectos |
| Persistencia | Eloquent + Query Builder | Modelos, relaciones, transacciones y consultas |
| Integración | Http client y servicios | ORS, OSRM, OpenStreetMap, WhatsApp y FastAPI |

**Módulos funcionales y responsabilidades**

| Módulo | Rutas principales | Responsabilidad |
|---|---|---|
| Acceso y seguridad | `/login`, `/admin/usuarios`, `/admin/solicitudes` | Autenticación, RBAC, altas y auditoría |
| Panel general | `/panel` | Consolidado de inventario, nivel de servicio, PMI y analítica |
| Logística e inventario | `/stock`, `/recepcion`, `/solicitudes`, `/despachos`, `/transferencias`, `/inventario-fisico`, `/mermas` | Stock multi-almacén, kardex, reservas, despachos y mermas |
| Compras | `/compras/*` | Requerimientos, cotizaciones, órdenes, proveedores y devoluciones |
| Proyectos y PMI | `/programa`, `/gestion-obra/*` | Partidas, EVM, riesgos, cambios y cierre |
| Personal y SST | `/personal/*`, `/sst/*` | Asistencia con geocerca, planillas, EPP e incidentes |
| Calidad y ambiente | `/calidad/observaciones`, `/ambiente/*` | Observaciones, monitoreo y residuos |
| Geolocalización | `/mapa-operativo`, `/api/v1/geo/*` | Geocodificación, rutas, geocercas y tracking |
| Analítica predictiva | `/analitica`, `/api/v1/analitica/*` | Pronóstico, EOQ, alertas y redistribución |
| Reportes | `/reportes` | Indicadores de negocio con filtros y CSV |
| Administración | `/admin/*` | Usuarios, parámetros, fases y auditoría |

**Comunicación entre componentes**

1. **Navegación web:** el controlador devuelve `Inertia::render()` con props; React recibe los datos sin una llamada API adicional. Los props diferidos cargan métricas pesadas después del primer render.
2. **Operaciones del cliente:** las páginas consumen `/api/v1` con `fetch` y `credentials: 'same-origin'`; la sesión web identifica al usuario.
3. **Consumidores externos:** `ResolveApiUser` acepta un token Bearer almacenado en `remember_token` y lo resuelve contra el guard `web`.
4. **Motor predictivo:** Laravel llama a `http://127.0.0.1:8001/v1/pipeline` con el encabezado `X-Internal-Token`; el resultado se persiste en PostgreSQL.
5. **Procesos programados:** el scheduler ejecuta `analitica:ejecutar`; la cola está configurada en modo `sync` para el entorno local.

**Gestión e interacción con la base de datos**

- Motor PostgreSQL 18.6 con PostGIS 3.7 y columnas `geography(Point,4326)` en obras, almacenes, recepciones, solicitudes y marcaciones.
- 25 migraciones versionadas y 104 tablas en la base `consorcio_pillcomarca`.
- `StockService` es el único punto de mutación del stock: usa `DB::transaction()` y `lockForUpdate()` para ingresos, egresos y reservas.
- El trigger `trg_kardex_inmutable` impide `UPDATE`/`DELETE` sobre `kardex`; los ajustes se registran como movimientos compensatorios.
- Reportes y panel usan el Query Builder con filtros por obra, almacén, categoría y fechas.

**Integración con servicios externos**

| API o servicio | Funcionalidad | Información intercambiada | Justificación |
|---|---|---|---|
| OpenRouteService (ORS) | Geocodificación directa/inversa y rutas | Dirección, coordenadas, distancia y geometría | Ubicar obras y almacenes, y calcular rutas logísticas |
| OSRM | Ruteo alternativo | Coordenadas de origen/destino y ruta | Respaldo si ORS falla o agota presupuesto |
| OpenStreetMap | Mapa base y enlace público | Tiles y coordenadas (bbox/marcador) | Visualización geográfica sin costo de licencia |
| WhatsApp (`wa.me`) | Notificación saliente al proveedor | Teléfono y mensaje prellenado | Avisar sin contratar una API de mensajería |
| Motor analítico FastAPI | Pronóstico y alertas | Payload JSON de inventario/consumo | Cálculo estadístico fuera de PHP |

No se integra una pasarela de pagos porque el sistema gestiona abastecimiento e inventario, no cobros en línea. El correo usa el driver `log` en desarrollo y no depende de un proveedor externo. Las notificaciones internas se generan en la base de datos.

### 1.2 Diagrama de arquitectura de software

El diagrama muestra la interfaz de usuario, el backend Laravel, la base de datos, los módulos principales, los servicios externos y el sentido de la comunicación.

![Figura 1. Arquitectura de software: interfaz, backend, módulos, base de datos y servicios externos.](evidencias/diagrama-arquitectura.png)

El flujo de un despacho permite verificar la comunicación entre componentes: React envía la solicitud, el controlador valida, `StockService` descuenta stock en una transacción, `RuteoService` calcula la ruta con ORS/OSRM y PostgreSQL persiste el despacho y la posición.

![Figura 2. Flujo de un despacho: stock, kardex, ruteo y persistencia.](evidencias/flujo-despacho.png)

**Evidencias de funcionamiento de las integraciones**

La siguiente captura corresponde al módulo `/mapa-operativo` en ejecución real. Se observan las obras y almacenes geolocalizados, las geocercas y el mapa base de OpenStreetMap; el panel de ruteo consume la cuota de ORS.

![Figura 3. Mapa operativo en ejecución con OpenStreetMap, geocercas y obras geolocalizadas.](evidencias/evidencia-mapa.png)

### Evidencias de la Actividad 1

| Evidencia solicitada | Dónde se presenta |
|---|---|
| Descripción de la arquitectura | Secciones 1.1: tipo, capas, módulos, comunicación y base de datos |
| Diagrama de arquitectura de software | Diagramas de la sección 1.2 |
| Identificación y justificación de APIs | Tabla de APIs externas en 1.1 |
| Evidencia de funcionamiento de integraciones | Mapa operativo de la sección 1.2 |

## 4. Arquitectura tecnológica (Actividad 2)

### 2.1 Identificación de las tecnologías

| Componente | Tecnología utilizada | Versión verificada | Propósito |
|---|---|---|---|
| Frontend | React + TypeScript | React 19.2 / TS 5.7.2 | Construcción de la interfaz de usuario |
| Framework full-stack | Laravel + Inertia.js | Laravel 13.30.1 / Inertia 3.3.3 | Lógica de negocio, routing y puente SPA |
| Estilos | Tailwind CSS | 4.1.11 | Design system, modo claro/oscuro y responsive |
| Backend | PHP | 8.5.5 (composer ^8.3) | Ejecución de la lógica de negocio |
| Base de datos | PostgreSQL + PostGIS | 18.6 / 3.7 | Almacenamiento relacional y datos geográficos |
| ORM / acceso a datos | Eloquent + Query Builder | Laravel 13 | Modelos, relaciones, transacciones y consultas |
| Servicio analítico | Python + FastAPI | 3.12 / 0.115.6 | Pronóstico, EOQ y alertas |
| Servidor analítico | uvicorn | 0.34.0 | Exposición del motor en `127.0.0.1:8001` |
| Librerías analíticas | pandas / numpy / statsmodels | 2.2.3 / 2.2.1 / 0.14.4 | Series temporales y estadística |
| Entorno de desarrollo | OpenCode + VS Code compatible | — | Edición, agentes y ejecución de tareas |
| Runtime JS | Node.js | 24.15.0 (CI: 22) | Build, pruebas y tooling |
| Bundler | Vite / vite-plus | Vite 8 / vite-plus 0.3.0 | Compilación de assets y HMR |
| Control de versiones | Git + GitHub | — | Gestión de cambios y repositorio remoto |
| Servidor local | `php artisan serve` | Laravel 13 | Ejecución en `127.0.0.1:8000` |
| CI | GitHub Actions | `tests.yml` | Integración continua en push/PR a `main` |
| Automatización de pruebas | Cypress | 16.2.1 | Pruebas E2E sobre la aplicación real |
| Pruebas backend | Pest + PHPUnit | 5.1.4 / 13.3.2 | Pruebas de feature y unitarias |
| Pruebas frontend | Vitest + Testing Library | Vitest 4.1.11 | Pruebas de componentes y utilidades |
| Cobertura | Xdebug + V8 | 3.5.3 / `@vitest/coverage-v8` | Reportes `coverage.xml` y `coverage/lcov.info` |
| Análisis de calidad | SonarCloud (SonarQube SaaS) | Scanner `@sonar/scan` | Evaluación estática, Quality Gate y métricas |

**Justificación de las elecciones:** Laravel + Inertia permite un monolito con SPA sin mantener dos despliegues ni una API para cada pantalla; PostgreSQL + PostGIS cubre los requisitos de geocercas y rutas; Tailwind 4 mantiene consistentes 42 páginas y el modo oscuro; Cypress valida flujos completos sobre la app real; SonarCloud publica el Quality Gate sin operar un servidor propio; FastAPI es más expresivo para pandas/statsmodels.

### 2.2 Diagrama de arquitectura tecnológica

![Figura 4. Entorno tecnológico: desarrollo, construcción, pruebas, ejecución y calidad.](evidencias/diagrama-tecnologico.png)

### 2.3 Entorno de trabajo y despliegue

1. **Entorno de desarrollo:** Windows 11 x64; PHP 8.5.5 ZTS; Node 24.15.0; PostgreSQL 18.6 + PostGIS 3.7; Python 3.12; OpenCode/VS Code; Xdebug 3.5.3 se carga solo para generar cobertura.
2. **Administración del código:** Git con repositorio `https://github.com/OverBM/Consorcio_Pillco_Marca.git`, ramas de trabajo, pull requests y CI en `.github/workflows/tests.yml`.
3. **Procedimiento de ejecución:** `composer install`, `npm install`, copiar `.env`, `php artisan key:generate`, `php artisan migrate --seed`, `npm run build` y `composer run dev` (Laravel + Vite + cola + scheduler + analítica). La app queda en `http://127.0.0.1:8000` y el motor en `http://127.0.0.1:8001`.
4. **Infraestructura:** desarrollo y demostración en equipo local con `php artisan serve` y PostgreSQL local; CI en GitHub Actions con PHP 8.4 y Node 22. Los Dockerfiles de `backend/api` y `frontend/web` son artefactos heredados del laboratorio DevOps y no representan la topología actual.
5. **Actualización de versiones:** `git pull`, `composer install --no-dev`, `npm ci`, `php artisan migrate --force`, cachés de configuración/rutas/vistas y `npm run build`. Cada release se publica desde `main` y se verifica con el Quality Gate de SonarCloud y el workflow de pruebas.

### Evidencias de la Actividad 2

| Evidencia solicitada | Dónde se presenta |
|---|---|
| Tabla de tecnologías | Sección 2.1 |
| Diagrama de arquitectura tecnológica | Diagrama de la sección 2.2 |
| Capturas del entorno de desarrollo | Ficha de entorno de las Evidencias de la Actividad 2 |
| Evidencia del software en ejecución | Módulo de reportes de las Evidencias de la Actividad 2 |

![Figura 5. Entorno de desarrollo verificado: versiones, base de datos y herramientas.](evidencias/entorno-desarrollo.png)

![Figura 6. Software en ejecución: módulo de reportes con datos reales.](evidencias/evidencia-reportes-app.png)

## 5. Integración y automatización de pruebas con Cypress (Actividad 3)

### 3.1 Configuración de Cypress

| Elemento | Configuración |
|---|---|
| Instalación | `cypress@16.2.1` en `devDependencies` |
| Archivo de configuración | `cypress.config.ts` |
| Dirección evaluada | `http://127.0.0.1:8000` (override con `CYPRESS_BASE_URL`) |
| Patrón de specs | `cypress/e2e/**/*.cy.ts` |
| Soporte | `cypress/support/e2e.ts` y `cypress/support/commands.ts` |
| Comando de sesión | `cy.login()` basado en `cy.session` |
| Fixtures | `cypress/fixtures/usuarios.json` |
| Capturas | `cypress/screenshots` |
| Video | Desactivado para agilizar la corrida |

La verificación de que Cypress ejecuta sobre el software real se realiza con:

```powershell
npm run build
php artisan serve --host=127.0.0.1 --port=8000
npx cypress run --browser electron
```

### 3.2 Diseño de escenarios de pruebas automatizadas

| Eje solicitado | Escenarios que lo cubren |
|---|---|
| Acceso y autenticación | E2E-01.1 (credenciales inválidas), E2E-01.2 (login/logout) |
| Registro de información | E2E-03 (proveedor), E2E-04 (excedente) |
| Edición y actualización | E2E-04 (edición de cantidad) |
| Eliminación de información | E2E-04 (eliminación de excedente) |
| Validación de formularios | E2E-03 (RUC y campos obligatorios) |
| Navegación entre módulos | E2E-02.1, E2E-02.2, E2E-02.4 |
| Procesos principales | E2E-05.1, E2E-05.2 (reportes), E2E-06 (notificaciones) |

### 3.3 Implementación de pruebas automatizadas

Se implementaron **11 escenarios** sobre la aplicación real. Cada fila agrupa los ocho campos exigidos para mantener la tabla legible.

| Identificador | Funcionalidad / Objetivo | Datos / Procedimiento | Esperado / Obtenido / Estado |
|---|---|---|---|
| E2E-01.1 | Autenticación · rechazar credenciales inválidas | `admin@pillcomarca.pe` / `clave-incorrecta` · visitar `/login`, completar y enviar | Mensaje de error y permanencia en `/login` · mismo resultado · Aprobado |
| E2E-01.2 | Autenticación / sesión · iniciar y cerrar sesión | Usuario administrador del seeder · login por UI, verificar panel y logout | Sesión iniciada y redirección · panel visible y logout correcto · Aprobado |
| E2E-02.1 | Navegación / búsqueda · encontrar un módulo | Término `mermas` · abrir buscador, escribir y pulsar Enter | “Control de Mermas” y ruta `/mermas` · módulo encontrado · Aprobado |
| E2E-02.2 | Navegación / reportes · verificar acceso | Usuario administrador · visitar `/reportes` | Título e indicadores visibles · renderizado correcto · Aprobado |
| E2E-02.3 | Preferencias UI · modo oscuro persistente | Tema por defecto · pulsar botón y recargar | `data-theme="oscuro"` persistente · tema conservado · Aprobado |
| E2E-02.4 | Buscador global · verificar superposición | Usuario administrador · comparar `z-index` de overlay y header | Overlay sobre el header y resultado visible · 2600 > 2500 · Aprobado |
| E2E-03 | Registro / validación · proveedor | RUC único de 11 dígitos y razón social `Proveedor Cypress ...` · enviar vacío y luego completar | Error de validación y alta visible · validación y registro correctos · Aprobado |
| E2E-04 | Registro, edición y eliminación · excedente | Obra, almacén y material del catálogo; cantidad 12.5 → 13.5 · crear, editar y eliminar | Registro creado, actualizado y eliminado · CRUD completo · Aprobado |
| E2E-05.1 | Reportes / filtros · indicadores por obra | Primera obra del catálogo · visitar `/reportes`, seleccionar obra y aplicar | KPI visibles y URL con `obra_id` · filtro correcto · Aprobado |
| E2E-05.2 | Reportes / exportación · CSV | Reporte con datos · pulsar “Exportar CSV” | Descarga y confirmación · CSV generado · Aprobado |
| E2E-06 | Notificaciones · panel y filtro por rol | Usuario administrador · abrir campana y pulsar “Mi rol” | Panel con pestañas y `aria-pressed` · filtro funcionando · Aprobado |

### 3.4 Ejecución y presentación de resultados

| Métrica | Resultado |
|---|---|
| Total de pruebas ejecutadas | 11 |
| Aprobadas | 11 |
| Fallidas | 0 |
| Porcentaje de aprobación | 100 % |
| Especificaciones | 6 |
| Duración | 41 segundos |
| Navegador | Electron (Chromium) |

![Figura 7. Resultado de la corrida Cypress: 11 de 11 pruebas aprobadas.](evidencias/grafico-cypress.png)

**Errores encontrados y análisis**

1. **Página en blanco al iniciar:** `public/hot` residual de Vite; se eliminó, se recompiló con `npm run build` y se verificó el manifest.
2. **Atajo `Ctrl+K` en la prueba:** se reemplazó por un clic real en el botón “Buscar”, que es el flujo del usuario.
3. **Eliminación de excedente:** el selector `button` coincidía con la tabla detrás del modal; se acotó al panel del modal.
4. **Notificaciones:** se corrigió el selector del `aria-label` de actualización.
5. **Modo oscuro:** se alinearon los tokens `dark`/`oscuro` y las reglas de cascada.
6. **Buscador tapado por el encabezado:** el overlay tenía `z-[60]` y el header `z-[2500]`; se elevó a `z-[2600]` y se agregó el escenario E2E-02.4.

Ninguna funcionalidad de negocio queda con problemas pendientes en los escenarios cubiertos. Los fallos fueron de configuración, selectores o apilamiento visual; el buscador y el modo oscuro quedaron corregidos y verificados.

### Evidencias de la Actividad 3

| Evidencia solicitada | Dónde se presenta |
|---|---|
| Configuración de Cypress | Sección 3.1 y `cypress.config.ts` |
| Código fuente de escenarios | `cypress/e2e/01-autenticacion.cy.ts` a `06-notificaciones.cy.ts` |
| Capturas de ejecución | Galería de capturas E2E de esta sección, una por prueba |
| Reporte de resultados | Tabla de 3.4, `cypress/run-output.txt` y `docs/evidencias/cypress-resultados.json` |
| Análisis de errores | Lista de errores y análisis de 3.4 |

:::galeria
E2E-01.1 · Credenciales inválidas | cypress/E2E-01.1-credenciales-invalidas.png
E2E-01.2 · Sesión iniciada | cypress/E2E-01.2-sesion-iniciada.png
E2E-02.1 · Búsqueda de módulo | cypress/E2E-02.1-busqueda-mermas.png
E2E-02.2 · Acceso a reportes | cypress/E2E-02.2-reportes.png
E2E-02.3 · Modo oscuro persistente | cypress/E2E-02.3-modo-oscuro.png
E2E-02.4 · Buscador superpuesto | cypress/E2E-02.4-buscador-superposicion.png
E2E-03 · Proveedor registrado | cypress/E2E-03-proveedor-registrado.png
E2E-04 · Excedente creado | cypress/E2E-04-excedente-creado.png
E2E-04 · Excedente editado | cypress/E2E-04-excedente-editado.png
E2E-04 · Excedente eliminado | cypress/E2E-04-excedente-eliminado.png
E2E-05.1 · Reportes filtrados | cypress/E2E-05.1-reportes-filtrados.png
E2E-05.2 · Exportación CSV | cypress/E2E-05.2-exportacion-csv.png
E2E-06 · Notificaciones por rol | cypress/E2E-06-notificaciones-rol.png
:::

## 6. Integración y análisis de calidad con SonarQube (Actividad 4)

### 4.1 Configuración de SonarQube

| Paso | Implementación |
|---|---|
| 1. Configurar SonarQube | SonarCloud en `https://sonarcloud.io`, organización `consorcio-pillco-marca` |
| 2. Registrar el proyecto | Project key `consorcio-pillco-marca_version-2`, nombre “Consorcio Pillco Marca v2” |
| 3. Configurar parámetros | `sonar-project.properties`: fuentes PHP/JS, tests, exclusiones, codificación UTF-8 y reportes |
| 4. Ejecutar el análisis | `$env:SONAR_TOKEN='<token>'; npx --yes @sonar/scan` |
| 5. Verificar disponibilidad | Tarea `AaHGPhihNK14IttdzGTT` en estado `SUCCESS`; dashboard actualizado |

Reportes enlazados: `coverage.xml` y `phpunit-report.xml` para PHP; `coverage/lcov.info` para JavaScript.

### 4.2 Análisis de los resultados

| Métrica | Resultado | Interpretación |
|---|---|---|
| Quality Gate | **OK / APROBADO** | Todas las condiciones en verde |
| Bugs | **0** | Sin defectos de fiabilidad; Reliability Rating A |
| Vulnerabilities | **0** | Se corrigieron las 4 vulnerabilidades iniciales de hashing débil |
| Code Smells | **0** | Sin problemas de mantenibilidad; deuda técnica 0 |
| Coverage | **81.2 %** | Cobertura global de líneas; 93.2 % en código nuevo |
| Duplicated Lines | **0.8 % (391)** | Por debajo del umbral de 3 %; 29 bloques duplicados |

![Figura 11. Dashboard de SonarCloud: Quality Gate Passed, cobertura 81.2 % y duplicación 0.8 %.](evidencias/sonar-dashboard.png)

![Figura 12. Evolución de la cobertura global: 25.3 %, 72.0 % y 81.2 % frente al umbral de 80 %.](evidencias/grafico-cobertura.png)

![Figura 13. Reducción de líneas duplicadas: de 510 a 391 líneas.](evidencias/grafico-duplicacion.png)

### 4.3 Interpretación y propuestas de mejora

1. **¿Qué resultado obtuvo el Quality Gate?** OK/Aprobado: fiabilidad, seguridad, mantenibilidad, duplicación, hotspots y cobertura del código nuevo (93.2 %) están en verde.
2. **¿Qué problemas fueron identificados?** Inicialmente 4 vulnerabilidades CRITICAL por `md5`/`sha1` y 2 code smells por regex con backtracking; luego se corrigió la cobertura parcial y se redujo la duplicidad.
3. **¿Qué componentes presentan mayores observaciones?** `ParametroInventario` y modelos con `$fillable` extenso; controladores de solicitudes con listados paginados; `PartidasPage` y `ValorizacionesPage` con tablas similares.
4. **¿Qué vulnerabilidades fueron detectadas?** 4 CRITICAL (`php:S4790`) en `GeocodificacionService` y `RuteoService`; se sustituyeron por SHA-256. Análisis final: 0.
5. **¿Cuál es el nivel de cobertura?** Global 81.2 %; código nuevo 93.2 %; PHP 83.52 %; JS 85.66 %.
6. **¿Qué mejoras implementar?** Mantener Xdebug/PCOV en CI, extraer un trait de listado paginado, crear componentes de tabla reutilizables, dividir páginas extensas y ejecutar el Quality Gate en CI con `sonar.qualitygate.wait=true`.

### Evidencias de la Actividad 4

| Evidencia solicitada | Dónde se presenta |
|---|---|
| Captura del proyecto en SonarQube | Dashboard de la sección 4.2 |
| Captura del Quality Gate | Dashboard de la sección 4.2 (Quality Gate Passed) |
| Resultados de las métricas | Tabla de 4.2 y gráficos de la sección 4.2 |
| Interpretación de los resultados | Sección 4.3 y `docs/evidencias/sonarcloud-metricas.json` |

## 7. Implementación del módulo de reportes (Actividad 5)

### 5.1 Identificación de indicadores del negocio

El problema que aborda ObraFlow es la gestión de inventarios multi-almacén en obras: quiebres de stock, compras urgentes, transferencias innecesarias y mermas sin visibilidad consolidada.

| Indicador | Fórmula / fuente | Uso para el negocio |
|---|---|---|
| Valor del inventario | `Σ(cantidad × costo_referencial)` en `stock_almacen` | Dimensionar el capital inmovilizado |
| Stock crítico | `(cantidad − cantidad_reservada) < stock_minimo` | Priorizar reposición y conteos |
| Mermas del período | `Σ mermas.cantidad` y valorización | Medir pérdidas y enfocar auditorías |
| Cumplimiento de transferencias | completadas / total del período | Evaluar el flujo entre almacenes |
| Rotación estimada | salidas / existencias normalizadas a 30 días | Detectar materiales de baja rotación |
| Compras del período | `Σ ordenes_compra.total` | Controlar el abastecimiento |
| Avance de obras | promedio de `obras.avance_fisico_pct` | Relacionar recursos con ejecución |
| Movimientos por día | kardex de ingresos y salidas | Ver estacionalidad y picos |
| Valor por categoría | stock valorizado agrupado por categoría | Enfocar decisiones por rubro |
| Materiales con mayor movimiento | Top 10 por movimientos absolutos | Detectar materiales críticos |

### 5.2 Implementación del módulo de reportes

| Requisito | Implementación |
|---|---|
| 1. Indicadores principales | Cuatro tarjetas KPI: valor, stock crítico, mermas y cumplimiento |
| 2. Reportes estadísticos | Serie diaria de ingresos/salidas, barras por categoría y tabla Top 10 |
| 3. Filtros de consulta | Rango de fechas (`desde`, `hasta`), obra, almacén y categoría; se reflejan en la URL |
| 4. Información actualizada | Cada request consulta PostgreSQL; no hay valores estáticos en la vista |

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Ruta | `/reportes` | Autenticación y permiso `panel.ver` |
| Controlador | `ReportesViewController.php` | Valida filtros y entrega props Inertia |
| Dominio | `ReportesService.php` | Calcula indicadores, series y rankings |
| Consultas compartidas | `ConsultasInventario.php` | Joins y filtros comunes con el panel |
| Vista | `ReportesPage.tsx` | KPI, gráficos, tabla, filtros y exportación CSV |

**Datos reales del 10/11/2026**

| Consulta / indicador | Resultado |
|---|---|
| Inventario | 12 SKUs · S/ 89 962.50 |
| Stock crítico | 1 SKU |
| Mermas | 2 registros · 4.5 unidades · S/ 195.00 |
| Transferencias | 1 completada, 1 en tránsito → 50 % |
| Compras | 2 OC · S/ 35 750.00 |
| Avance de obras | 2 obras activas · 55.3 % |

![Figura 14. Módulo de reportes con indicadores, filtros y datos reales.](evidencias/evidencia-reportes-app.png)

![Figura 15. Módulo de reportes y filtros capturado durante la prueba E2E-02.2.](evidencias/evidencia-reportes.png)

![Figura 16. Valor del inventario por categoría con datos reales del sistema.](evidencias/grafico-categorias.png)

La exportación CSV se evidencia en `cypress/downloads/reporte-materiales-2026-10-11-2026-11-09.csv` y la prueba E2E-05.2.

### Evidencias de la Actividad 5

| Evidencia solicitada | Dónde se presenta |
|---|---|
| Capturas del módulo de reportes | Capturas de la sección 5.2 |
| Visualización de indicadores y gráficos | Capturas y gráfico de la sección 5.2; tablas de 5.1 y 5.2 |
| Evidencia de datos reales | Tabla “Datos reales” de 5.2 y consultas SQL ejecutadas sobre PostgreSQL |
| Descripción del impacto | Sección 8 (5.3) |

## 8. Análisis del impacto funcional del software

### 5.3 Evaluación del impacto funcional

**¿Qué problema busca solucionar el software?** La dispersión de información entre almacenes: quiebres, compras urgentes, transferencias tardías y mermas sin control.

**¿Qué información permite visualizar el módulo de reportes?** Valor y composición del inventario, SKUs críticos, mermas y su valor, cumplimiento de transferencias, rotación, compras, avance de obra, serie diaria, categorías y ranking de materiales.

**¿Qué indicadores permiten evaluar los resultados del proceso?** Stock crítico, rotación, mermas, cumplimiento de transferencias, compras y avance de obras.

**¿Cómo facilita el software la toma de decisiones?** Permite priorizar transferencias desde almacenes con excedente hacia obras con déficit, decidir compras según stock crítico y rotación, y enfocar auditorías donde la merma es mayor.

**¿Qué actividades o procesos pueden optimizarse?** Redistribución de excedentes, compras de emergencia, conteos físicos, seguimiento de transferencias y reporte mensual a gerencia.

**¿Qué beneficios concretos se esperan?** Menor quiebre de stock, menos compras urgentes, menor capital inmovilizado, reducción de mermas y un único tablero para gerencia y obra.

**Comparación antes / después**

| Tipo | Evidencia |
|---|---|
| Medido | Valor S/ 89 962.50; 1 SKU crítico; 2 mermas (4.5 unidades, S/ 195); cumplimiento 50 %; 2 OC por S/ 35 750; avance 55.3 % |
| Potencial | Menos quiebres, compras urgentes y mermas; mejor redistribución |
| No demostrado aún | Mejora porcentual contra una línea base histórica inexistente |

No se inventan porcentajes de mejora: el módulo deja preparada la comparación por rangos de fechas para cuando exista historial suficiente.

### Evidencias del análisis de impacto

![Figura 17. Tablero en modo oscuro con los indicadores del negocio.](evidencias/evidencia-modo-oscuro-app.png)

La evidencia de que los datos provienen de registros reales se sustenta en las consultas SQL de la sección 5.2, en los filtros por obra/almacén/fecha y en la fecha de generación que muestra la vista.

## 9. Conclusiones

1. La arquitectura real quedó documentada y corregida: monolito modular Laravel + Inertia/React, PostgreSQL/PostGIS y servicio satélite FastAPI.
2. El stack tecnológico está justificado y es reproducible en local y CI.
3. Cypress quedó integrado con 11 escenarios reales, 100 % aprobados y evidencia de ejecución, capturas y descargas.
4. SonarCloud mantiene Quality Gate OK, con 0 bugs, 0 vulnerabilidades y 0 code smells.
5. La cobertura subió de 72.0 % a 81.2 % y la duplicación bajó de 510 a 391 líneas (1.0 % → 0.8 %).
6. El módulo de reportes demuestra el impacto con datos reales y filtros, sin valores estáticos.
7. El defecto del buscador quedó corregido y protegido con pruebas unitarias y E2E.
8. La principal limitación es la ausencia de una línea base histórica para medir mejoras porcentuales; se documentó como beneficio potencial.

## 10. Anexos y evidencias

> Las evidencias están integradas en cada actividad, tal como exige la rúbrica. Este apartado solo indexa los archivos y comandos de reproducción.

### 10.1 Índice de evidencias por actividad

| Actividad | Evidencia principal | Ubicación |
|---|---|---|
| Actividad 1 | Diagrama, flujo y mapa operativo | Sección 1.2 |
| Actividad 2 | Diagrama tecnológico, entorno y software en ejecución | Secciones 2.2 y Evidencias de la Actividad 2 |
| Actividad 3 | Resultados y capturas E2E por prueba | Sección 3.4 y galería de Evidencias de la Actividad 3 |
| Actividad 4 | Dashboard, cobertura y duplicación | Sección 4.2 |
| Actividad 5 | Reportes, filtros y valor por categoría | Sección 5.2 |
| Impacto | Tablero en modo oscuro y comparación medida | Sección 8 |

### 10.2 Documentos y archivos de soporte

| Documento | Contenido |
|---|---|
| `docs/09-actividad-3-cypress.md` | Detalle de Cypress y matriz completa de escenarios |
| `docs/10-actividad-4-sonarqube.md` | Detalle de SonarCloud y métricas |
| `docs/11-actividad-5-reportes.md` | Detalle de reportes e impacto |
| `docs/12-actividad-1-arquitectura-software.md` | Arquitectura de software ampliada |
| `docs/13-actividad-2-arquitectura-tecnologica.md` | Arquitectura tecnológica ampliada |
| `docs/14-informe-final.docx` | Versión Word de este informe |
| `docs/15-checklist-rubrica.md` | Checklist de rúbrica (documento aparte) |

### 10.3 Comandos de reproducción

```powershell
# Pruebas backend con cobertura
php -d zend_extension="<ruta-xdebug>" -d extension=pdo_sqlite -d extension=sqlite3 `
    -d xdebug.mode=coverage vendor/bin/pest --coverage-clover coverage.xml `
    --log-junit phpunit-report.xml

# Cobertura frontend
npm run test:coverage

# Análisis de calidad
$env:SONAR_TOKEN='<token>'
npx --yes @sonar/scan

# Pruebas E2E
npm run build
php artisan serve --host=127.0.0.1 --port=8000
npx cypress run --browser electron

# Regenerar gráficos y documento Word
python docs/generar_graficos.py
$env:NODE_PATH="<ruta-a-node_modules-con-docx>"
node docs/generar_informe_docx.cjs
```
