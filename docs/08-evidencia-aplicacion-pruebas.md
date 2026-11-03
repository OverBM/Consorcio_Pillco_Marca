# 08. Evidencia de aplicación de todos los tipos de pruebas considerados en el proyecto

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca  
**Documento:** Evidencia de ejecución y cobertura de pruebas  
**Referencias:** ISO 9001:2015 (8.5.1, 9.1, 10.2), ISO/IEC 29119-3 e ISO/IEC 25010  
**Fecha de corte:** Noviembre 2026  
**Responsable:** Equipo de calidad del proyecto

---

## 1. Propósito

Este documento deja evidencia verificable de que los tipos de prueba definidos en el `05-plan-pruebas.md` fueron aplicados sobre el sistema, con su comando de ejecución, alcance, resultado y artefacto de respaldo.

No sustituye al plan de pruebas: lo complementa con la evidencia de la última ejecución registrada.

---

## 2. Resumen ejecutivo

| Ámbito | Herramienta | Resultado de la última ejecución | Estado |
| --- | --- | ---: | --- |
| Backend Laravel | Pest | **186 pruebas / 1 179 aserciones** | Sin fallos |
| Frontend React | Vitest + Testing Library | **503 pruebas / 79 archivos** | Sin fallos |
| Tipos TypeScript | `tsc --noEmit` | Sin errores | Correcto |
| Formato PHP | Laravel Pint | Sin errores | Correcto |
| Build de producción | Vite+ | Compilación correcta | Correcto |
| Smoke / E2E manual | Navegador real + sesión autenticada | **39 rutas verificadas** | Sin errores 5xx |
| Cobertura registrada | Vitest V8 + Xdebug + Clover | **84,3 % global** (medición de octubre 2026) | Cumple ≥ 80 % |
| Análisis estático | Sonar | Quality Gate aprobado (medición de octubre 2026) | Cumple |

**Conclusión:** la suite automatizada, las verificaciones estáticas, el build y la validación funcional en navegador se encuentran en estado satisfactorio para el alcance declarado.

---

## 3. Tipos de prueba considerados y evidencia

### 3.1 Matriz general

| N.º | Tipo de prueba | Nivel | Herramienta | Evidencia principal |
| ---: | --- | --- | --- | --- |
| 1 | Unitaria de dominio backend | Unitario | Pest | `tests/Unit/StockServiceTest.php` |
| 2 | Integración de backend | Integración | Pest + SQLite `:memory:` | `tests/Feature/*.php` |
| 3 | API REST | Integración HTTP | Pest (`getJson`, `postJson`, `putJson`) | `tests/Feature/*ApiTest.php` |
| 4 | Seguridad y autorización | Integración | Pest + roles/permisos | `ApiAutorizacionTest`, `AccesoModulosTest`, `AuthApiTest` |
| 5 | Unitaria de utilidades frontend | Unitario | Vitest | `resources/js/tests/utils/`, utilidades del design system |
| 6 | Componentes de interfaz | Componente | Vitest + Testing Library | `resources/js/tests/components/*.test.tsx` |
| 7 | Integración de páginas Inertia | Integración de página | Vitest + harness + mocks de Inertia | `resources/js/tests/pages/*.test.tsx` |
| 8 | Regresión funcional | Regresión | Suite completa PHP + JS | `php artisan test` y `npm run test` |
| 9 | Verificación de tipos | Estática | TypeScript | `npm run types:check` |
| 10 | Formato y estilo PHP | Estática | Laravel Pint | `vendor/bin/pint --dirty --format agent` |
| 11 | Build de cliente/SSR | Compilación | Vite+ | `npm run build` |
| 12 | Smoke / E2E manual web | Sistema | Navegador real + login | Rutas verificadas en la sección 5 |
| 13 | Cobertura de código | Métrica | V8, Xdebug, LCOV y Clover | `coverage/lcov.info`, `coverage.xml` |
| 14 | Análisis estático | Calidad | Sonar | `sonar-project.properties` y Quality Gate |
| 15 | Carga y estrés | No funcional | — | Declarada fuera de alcance |
| 16 | Penetración | Seguridad ofensiva | — | Declarada fuera de alcance |
| 17 | Accesibilidad con lectores de pantalla | No funcional | — | Declarada fuera de alcance |
| 18 | Dispositivos físicos | Compatibilidad | — | Declarada fuera de alcance |

---

## 4. Evidencia por tipo de prueba

### 4.1 Pruebas unitarias de backend

**Objetivo:** validar reglas de dominio aisladas, sin depender de HTTP ni de la interfaz.

**Alcance:**

- `tests/Unit/StockServiceTest.php`
- `tests/Unit/ExampleTest.php`

**Comando:**

```powershell
php artisan test --compact tests/Unit
```

**Resultado:** suite unitaria sin fallos.

**Evidencia:** archivos de prueba versionados en `tests/Unit/`.

---

### 4.2 Pruebas de integración y Feature backend

**Objetivo:** comprobar controladores, modelos, políticas, persistencia, validaciones y relaciones Eloquent.

**Alcance:**

- 41 archivos `Feature`
- Base de datos SQLite en memoria declarada en `phpunit.xml`
- Migraciones y factories ejecutadas por prueba
- Cobertura de módulos de panel, obras, almacén, compras, personal, calidad, administración y analítica

**Comando:**

```powershell
php artisan test --compact
```

**Resultado de la última ejecución:**

```text
Tests:    186 passed
Assertions: 1 179
Duration: ~30–60 s
```

**Evidencia:**

- `tests/Feature/*.php`
- Salida de consola de Pest
- `storage/logs/laravel.log` para trazabilidad de fallos corregidos

---

### 4.3 Pruebas de API REST

**Objetivo:** validar contratos JSON, códigos HTTP, validación de entrada y persistencia.

**Alcance representativo:**

| Archivo | Cobertura |
| --- | --- |
| `AuthApiTest` | Login, identidad y token |
| `AlmacenNucleoApiTest` | Almacenes y stock |
| `ComprasProveedoresApiTest` | Compras y proveedores |
| `ExcedentesApiTest` | Excedentes y redistribución |
| `GestionProyectosPmiApiTest` | PMI, EVM y cierre de obra |
| `LogisticaGeolocalizadaApiTest` | Rutas, geocercas y tracking |
| `AnaliticaPipelineTest` | Pipeline analítico |
| `AnaliticaPaginaTest` | Página, resumen y regeneración |
| `PersonalSstApiTest` | Asistencia, SST y personal |
| `CalidadAmbienteApiTest` | Calidad y ambiente |
| `UsuarioApiTest` | Usuarios, roles y permisos |
| `NotificacionesTest` | Notificaciones operativas |
| `BusquedaGlobalApiTest` | Búsqueda transversal |

**Comando:**

```powershell
php artisan test --compact tests/Feature
```

**Resultado:** todos los contratos API cubiertos por la suite terminan en verde.

---

### 4.4 Pruebas de seguridad y autorización

**Objetivo:** verificar que cada módulo responde solo a usuarios autenticados y con permisos válidos.

**Alcance:**

- `ApiAutorizacionTest`
- `AccesoModulosTest`
- `AuthWebLoginTest`
- `AuthApiTest`
- `LogoutTest`
- `ResolveApiUserTest`
- `RegistroSolicitudTest`
- `SolicitudesAccesoRevisionTest`

**Casos verificados:**

- Acceso permitido con rol autorizado.
- Acceso denegado con rol sin permiso.
- Rechazo de peticiones sin identidad.
- Middleware `modulo:*` por módulo y acción.
- Aislamiento por contexto operativo de obra/almacén.

**Resultado:** sin fallos de autorización en la suite.

---

### 4.5 Pruebas unitarias de frontend

**Objetivo:** validar funciones puras de formato, validación, navegación y utilidades.

**Herramienta:** Vitest.

**Alcance representativo:**

- `formatMoneda`, `formatFecha`, `formatCantidad`
- utilidades de búsqueda, CSV, estados y validación
- hooks simulados de tránsito
- configuración de navegación

**Comando:**

```powershell
npm run test
```

**Resultado:** suite frontend completa en verde.

---

### 4.6 Pruebas de componentes

**Objetivo:** validar renderizado, accesibilidad básica, interacción y variantes visuales de componentes reutilizables.

**Herramienta:** Vitest + Testing Library + jsdom.

**Componentes cubiertos:**

- `DataTable`, `DataTableDesign`
- `form`, `ui`
- `AppLayout`, `AppRail`, `HeaderBar`
- `MapaLeaflet`, `MapaSchematic`, `GeoDetalle`
- `NotificationProvider`
- `KpiCard`, `KpiCardDesign`, `charts`
- `EmptyState`, `Skeleton`, `StatusBadge`
- `icons`, `PageHeader`, `AlertaBanner`
- `GlobalSearch`, `RemoteImage`

**Evidencia:**

- `resources/js/tests/components/*.test.tsx`
- 21 archivos de componentes registrados en `07-inventario-cobertura.md`

**Resultado:** sin fallos.

---

### 4.7 Pruebas de integración de páginas Inertia

**Objetivo:** validar que cada página renderiza con props reales simuladas, filtra, abre modales, ejecuta acciones y muestra estados vacíos.

**Infraestructura:**

- `resources/js/tests/harness.tsx`
- `resources/js/tests/mocks/inertia.tsx`
- `resources/js/tests/fixtures.ts`

**Alcance:**

- 40 archivos de página
- Módulos de panel, programa, obra, finanzas, almacén, compras, personal, SST, calidad, ambiente y administración

**Comando:**

```powershell
npm run test
```

**Resultado de la última ejecución completa:**

```text
Test Files: 79 passed
Tests:      503 passed
Duration:   ~3–4 min
```

---

### 4.8 Pruebas de regresión

**Objetivo:** confirmar que las correcciones de incidencias no rompen funcionalidad previamente validada.

**Momentos de ejecución:**

- Después de corregir `unidad_medida_id` en Redistribución.
- Después de corregir las fechas ISO y el desfase de zona horaria.
- Después de corregir el gráfico de estados de Asistencia.
- Después de corregir la relación `trabajador` en Incidentes.
- Después de agregar el botón **Regenerar analítica**.
- Después de ajustar el cierre de obra y las validaciones de Finanzas.

**Comandos:**

```powershell
php artisan test --compact
npm run test
```

**Resultado final:**

- PHP: 186/186
- JS: 503/503
- Sin fallos pendientes

---

### 4.9 Verificación estática de tipos

**Objetivo:** detectar errores de contrato entre props, componentes y utilidades antes del build.

**Comando:**

```powershell
npm run types:check
```

**Resultado:**

```text
tsc --noEmit
Sin errores
```

**Evidencia:** configuración `tsconfig.json` y salida de consola.

---

### 4.10 Formato y estilo PHP

**Objetivo:** mantener consistencia de estilo y evitar ruido en revisiones.

**Comando:**

```powershell
vendor/bin/pint --dirty --format agent
```

**Resultado:** `pint passed`.

---

### 4.11 Build de producción

**Objetivo:** comprobar que el frontend compila con las rutas, assets y dependencias resueltas.

**Comando:**

```powershell
npm run build
```

**Resultado:** build de Vite completado sin errores.

**Evidencia:** artefactos generados en `public/build/` y salida de consola.

---

### 4.12 Smoke / E2E manual web

**Objetivo:** validar el sistema desde el navegador con sesión real, datos reales y navegación completa.

**Método:** cuatro frentes de QA asistidos por navegador, con login real, captura de consola, red, DOM y errores HTTP.

**Cobertura:** 39 rutas.

| Frente | Rutas verificadas |
| --- | --- |
| Panel, Programa, Gestión de Obra y Finanzas | `/panel`, `/programa`, `/gestion-obra/ciclo-vida`, `/gestion-obra/cronograma-evm`, `/gestion-obra/partidas`, `/gestion-obra/riesgos`, `/gestion-obra/valorizaciones`, `/gestion-obra/cambios`, `/gestion-obra/cierre`, `/finanzas/presupuesto`, `/finanzas/adelantos` |
| Almacén y Logística | `/stock`, `/mermas`, `/inventario-fisico`, `/recepcion`, `/despachos`, `/transferencias`, `/solicitudes`, `/programa/redistribucion`, `/mapa-operativo` |
| Compras y Calidad | `/compras`, `/compras/requerimientos`, `/compras/cotizaciones`, `/compras/ordenes-compra`, `/compras/proveedores`, `/compras/devoluciones`, `/calidad/observaciones` |
| Personal, SST, Ambiente y Administración | `/personal/asistencia`, `/personal/planillas`, `/personal/capacitaciones`, `/sst/epp`, `/sst/incidentes`, `/ambiente/monitoreo`, `/ambiente/residuos`, `/admin/usuarios`, `/admin/auditoria`, `/admin/parametros`, `/admin/solicitudes`, `/perfil` |

**Resultado global:**

- 39/39 rutas respondieron HTTP 200.
- 0 errores 500.
- 0 excepciones SQLSTATE.
- 0 errores de consola JavaScript.
- 0 respuestas 4xx/5xx en navegación normal.

**Evidencia complementaria:**

- Capturas de pantalla en el entorno de QA.
- Revisión de consola y red.
- Verificación manual adicional de mapa, gráficos, modales y botón de analítica.

---

## 5. Evidencia de correcciones verificadas

| Incidencia | Verificación aplicada | Resultado |
| --- | --- | --- |
| Columna `unidad_medida_id` inexistente | Carga de `/programa/redistribucion` | Sin SQLSTATE; 2 excedentes y tabla AHP visibles |
| “Almacén #undefined” en modal de redistribución | Consulta a `/api/v1/excedentes/1/sugerencias` y render del modal | Sin `undefined`; respuesta 200 |
| Unidad `und` en recepción de transferencias | Apertura del modal “Recibir” | Muestra `80 bls` |
| Fechas ISO crudas en tablas | Revisión de Requerimientos, Órdenes, Calidad y Cronograma | Fechas legibles, sin `T00:00:00` |
| Desfase de un día en fechas calendario | Comparación con dato de origen | `23-oct.` correcto |
| Gráfico de estados de Asistencia vacío | Render de `/personal/asistencia` | Barras `Observada 2` y `Consolidada 2` |
| “Personal involucrado” vacío en Incidentes | Render de `/sst/incidentes` | Muestra `Juan Pérez Ramos` |
| Botón de cierre habilitado sin iniciar cierre | Render de `/gestion-obra/cierre` | Botón deshabilitado; guard backend agregado |
| Detalle JSON crudo en Auditoría | Render de `/admin/auditoria` | Muestra `email: admin@pillcomarca.pe` |
| Contador “Usuarios Registrados (0)” durante carga | Render de `/admin/usuarios` | Sin estado falso; muestra 6 al cargar |
| Etiqueta del camión descentrada | Medición DOM del centro de etiqueta vs. polilínea | Centro coincide con el tramo |
| Tooltip de gráfico sin fecha exacta | Hover sobre gráfico de Analítica | Fecha y hora exactas + pie de figura |
| Botón **Regenerar analítica** | Ejecución desde navegador | `12 parámetros, 360 pronósticos y 17 alertas` |

---

## 6. Cobertura y análisis estático

La medición de cobertura y el Quality Gate se conservan como evidencia versionada de octubre de 2026. No se regeneraron en esta fecha; los archivos permanecen en el repositorio.

| Métrica | Resultado registrado | Umbral | Estado |
| --- | ---: | ---: | --- |
| Cobertura global JS + PHP | 84,3 % | ≥ 80 % | Cumple |
| Cobertura local combinada | 85,61 % | ≥ 80 % | Cumple |
| Cobertura JavaScript | 95,61 % | — | Registrada |
| Cobertura PHP | 76,96 % | — | Registrada |
| Duplicación | 1,2 % | ≤ 3 % | Cumple |
| Bugs | 0 | 0 | Cumple |
| Vulnerabilidades | 0 | 0 | Cumple |
| Code smells | 0 | 0 | Cumple |
| Quality Gate | Aprobado | Aprobado | Cumple |

**Artefactos:**

- `coverage/lcov.info`
- `coverage.xml`
- `sonar-project.properties`
- `docs/07-inventario-cobertura.md`
- `docs/06-configuracion-analisis.md`

---

## 7. Entorno de ejecución

| Componente | Versión / configuración |
| --- | --- |
| PHP | 8.4 |
| Laravel | 13 |
| Pest | Suite del proyecto |
| Base de datos de pruebas | SQLite `:memory:` |
| Node.js | 22 |
| Vitest | 4.1.11 |
| Testing Library | Configuración del proyecto |
| TypeScript | Configuración del proyecto |
| Cobertura PHP | Xdebug |
| Cobertura JS | V8 |
| Navegador QA | Chromium/Edge con sesión real |

---

## 8. Comandos reproducibles

```powershell
# Suite backend completa
php artisan test --compact

# Suite frontend completa
npm run test

# Verificación de tipos
npm run types:check

# Formato PHP
vendor/bin/pint --dirty --format agent

# Build de producción
npm run build

# Cobertura (cuando se requiera regenerar)
npm run test:coverage
php artisan test --coverage-clover=coverage.xml
```

---

## 9. Brechas declaradas y justificación

| Tipo de prueba | Estado | Justificación |
| --- | --- | --- |
| Carga y estrés | No ejecutada | El alcance del proyecto no incluye pruebas de concurrencia masiva ni SLA de infraestructura. |
| Penetración | No ejecutada | Se validó autorización funcional, pero no pruebas ofensivas con herramientas externas. |
| Accesibilidad con lector de pantalla | No ejecutada | Se usan etiquetas `aria-label`, roles y foco visible, sin auditoría formal con NVDA/JAWS. |
| Dispositivos físicos | No ejecutada | La validación se realizó en navegador de escritorio y viewport responsive. |

Estas brechas están registradas como aceptadas en `03-registro-incidencias.md` y `05-plan-pruebas.md`.

---

## 10. Conclusión

La evidencia reunida demuestra que el proyecto aplicó:

1. Pruebas unitarias de backend y frontend.
2. Pruebas de integración de backend y de páginas Inertia.
3. Pruebas de API, autorización y seguridad funcional.
4. Pruebas de componentes y de regresión.
5. Verificación estática de tipos, formato y build.
6. Validación smoke/E2E manual en 39 rutas con sesión real.
7. Medición de cobertura y análisis estático con Quality Gate aprobado.

Con **186 pruebas PHP**, **503 pruebas JS**, **0 fallos**, **TypeScript sin errores**, **build correcto** y **39 rutas verificadas sin errores 5xx**, se considera que los tipos de prueba considerados en el proyecto fueron aplicados y documentados.

---

## Anexo A. Trazabilidad documental

| Documento | Relación con esta evidencia |
| --- | --- |
| `docs/02-calidad-iso.md` | Marco ISO y criterios de calidad |
| `docs/03-registro-incidencias.md` | Incidencias corregidas y acciones |
| `docs/05-plan-pruebas.md` | Estrategia y criterios de entrada/salida |
| `docs/06-configuracion-analisis.md` | Configuración de cobertura y Sonar |
| `docs/07-inventario-cobertura.md` | Cobertura por módulo y brechas |
| `docs/08-evidencia-aplicacion-pruebas.md` | Este documento |

---

## Anexo B. Declaración de evidencia

Los resultados aquí registrados corresponden a la última ejecución disponible al cierre del documento. Para reproducirlos, se debe partir de un entorno con dependencias instaladas, base de datos de pruebas disponible y el código en el estado validado.

**Fin del documento.**
