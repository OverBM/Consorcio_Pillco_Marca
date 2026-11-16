# Actividad 3. Integración y aplicación de Cypress para la automatización de pruebas

**Proyecto:** Consorcio Pillco Marca — ObraFlow
**Runner:** Cypress 16.2.1 (Electron)
**Aplicación evaluada:** `http://127.0.0.1:8000` con assets compilados y PostgreSQL

---

## 3.1. Configuración de Cypress

| Elemento | Configuración |
|---|---|
| Instalación | `cypress@16.2.1` en `devDependencies` |
| Archivo de configuración | `cypress.config.ts` |
| `baseUrl` | `http://127.0.0.1:8000` (override con `CYPRESS_BASE_URL`) |
| Patrón de specs | `cypress/e2e/**/*.cy.ts` |
| Soporte | `cypress/support/e2e.ts` y `cypress/support/commands.ts` |
| Comando de sesión | `cy.login()` basado en `cy.session` |
| Fixtures | `cypress/fixtures/usuarios.json` |
| Capturas | `cypress/screenshots` (solo en fallo o por `cy.screenshot`) |
| Video | Desactivado para agilizar la corrida |

### Organización de archivos

```text
cypress/
├── config: cypress.config.ts
├── e2e/
│   ├── 01-autenticacion.cy.ts
│   ├── 02-navegacion.cy.ts
│   ├── 03-proveedores.cy.ts
│   ├── 04-redistribucion.cy.ts
│   ├── 05-reportes.cy.ts
│   └── 06-notificaciones.cy.ts
├── fixtures/usuarios.json
├── support/{e2e.ts,commands.ts,index.d.ts}
├── screenshots/
└── downloads/
```

### Comando de ejecución

```powershell
npm run build
php artisan serve --host=127.0.0.1 --port=8000
npx cypress run --browser electron
```

La aplicación se evaluó realmente: no se usaron mocks de red ni componentes
aislados. Cypress inició sesión con usuarios del seeder y ejecutó los flujos
sobre PostgreSQL.

---

## 3.2 y 3.3. Escenarios automatizados

| Identificador | Funcionalidad | Objetivo | Datos de prueba | Procedimiento | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|
| E2E-01.1 | Autenticación | Rechazar credenciales inválidas | `admin@pillcomarca.pe` / `clave-incorrecta` | Visitar `/login`, completar formulario y enviar | Mensaje de credenciales incorrectas y permanencia en `/login` | Mensaje mostrado y URL `/login` | Aprobado |
| E2E-01.2 | Autenticación / sesión | Iniciar y cerrar sesión | Usuario administrador del seeder | Login por UI, verificar panel y pulsar cerrar sesión | Sesión iniciada y redirección al inicio | Panel visible y logout correcto | Aprobado |
| E2E-02.1 | Navegación / búsqueda | Encontrar un módulo por nombre exacto | Término `mermas` | Abrir buscador global, escribir y pulsar Enter | Resultado “Control de Mermas” y ruta `/mermas` | Módulo encontrado y ruta abierta | Aprobado |
| E2E-02.2 | Navegación / reportes | Verificar acceso al módulo de reportes | Usuario administrador | Visitar `/reportes` | Título e indicadores visibles | Reportes e indicadores renderizados | Aprobado |
| E2E-02.3 | Preferencias UI | Alternar y persistir modo oscuro | Tema por defecto | Pulsar botón de tema y recargar | `data-theme="oscuro"` antes y después de recargar | Tema oscuro persistente | Aprobado |
| E2E-02.4 | Buscador global | Verificar que el overlay se superpone al encabezado | Usuario administrador | Abrir buscador, comparar `z-index` del overlay y del `header`, buscar `reportes` | `z-index(overlay) > z-index(header)` y resultado visible | 2600 > 2500 y “Reportes e Indicadores” visible | Aprobado |
| E2E-03 | Registro / validación | Validar RUC y registrar proveedor | RUC único de 11 dígitos y razón social `Proveedor Cypress ...` | Abrir modal, enviar vacío, completar y guardar | Error de validación y luego registro visible | Validación y alta correctas | Aprobado |
| E2E-04 | Registro, edición y eliminación | CRUD de excedente | Obra, almacén y material del catálogo; cantidad 12.5 → 13.5 | Crear, editar y eliminar desde `/programa/redistribucion` | Registro creado, actualizado y eliminado | CRUD completo con notificaciones | Aprobado |
| E2E-05.1 | Reportes / filtros | Verificar indicadores y filtro por obra | Primera obra del catálogo | Visitar `/reportes`, seleccionar obra y aplicar | KPI visibles y URL con `obra_id` | Indicadores y filtro correctos | Aprobado |
| E2E-05.2 | Reportes / exportación | Exportar tabla filtrada | Reporte con datos | Pulsar “Exportar CSV” | Descarga y confirmación | CSV generado y aviso mostrado | Aprobado |
| E2E-06 | Notificaciones | Verificar panel y filtro por rol | Usuario administrador | Abrir campana y pulsar “Mi rol” | Panel con pestañas y estado `aria-pressed` | Panel y filtro funcionando | Aprobado |

Cada escenario cubre al menos uno de los ejes solicitados: autenticación,
registro, edición/actualización, eliminación, validación de formularios,
navegación entre módulos y proceso principal del negocio.

---

## 3.4. Ejecución y presentación de resultados

**Comando ejecutado**

```powershell
npx cypress run --browser electron
```

| Métrica | Resultado |
|---|---|
| Especificaciones | 6 |
| Total de pruebas ejecutadas | 11 |
| Aprobadas | 11 |
| Fallidas | 0 |
| Porcentaje de aprobación | **100 %** |
| Duración total | 41 segundos |
| Navegador | Electron (Chromium) |
| Evidencia de salida | `cypress/run-output.txt`, `cypress/last-run.txt` |

### Evidencias de ejecución

| Evidencia | Ubicación |
|---|---|
| Configuración | `cypress.config.ts` |
| Soporte y comandos | `cypress/support/e2e.ts`, `cypress/support/commands.ts` |
| Fixtures | `cypress/fixtures/usuarios.json` |
| Código de escenarios | `cypress/e2e/01-autenticacion.cy.ts` … `06-notificaciones.cy.ts` |
| Salida completa de la corrida | `cypress/run-output.txt` |
| Capturas de pantalla | `cypress/screenshots/02-navegacion.cy.ts/reportes-escritorio.png`, `panel-modo-oscuro.png`, `buscador-superposicion.png` |
| Capturas para el informe | `docs/evidencias/cypress-reportes.png`, `docs/evidencias/cypress-modo-oscuro.png`, `docs/evidencias/buscador-superposicion.png` |
| Capturas por prueba | `docs/evidencias/cypress/E2E-*.png` (una por escenario) |
| Capturas del módulo | `docs/evidencias/reportes-actual.png`, `docs/evidencias/modo-oscuro-actual.png` |
| Descarga generada por la prueba | `cypress/downloads/reporte-materiales-2026-10-11-2026-11-09.csv` |
| Capturas de fallos corregidos | `cypress/screenshots/01`, `02`, `04`, `06` |

![Reportes capturado por Cypress](evidencias/cypress-reportes.png)

![Modo oscuro capturado por Cypress](evidencias/cypress-modo-oscuro.png)

![Buscador superpuesto](evidencias/buscador-superposicion.png)

### Análisis de errores encontrados

1. **Página en blanco al iniciar:** existía un archivo `public/hot` de una
   sesión Vite anterior; el navegador intentaba cargar assets desde
   `[::1]:5173` y fallaba por CORS. Se eliminó `public/hot`, se recompiló con
   `npm run build` y se verificó el manifest.
2. **El buscador no abría el módulo desde el atajo:** la primera versión usaba
   `cy.get('body').type('{ctrl}k')`; se cambió a un clic real en el botón
   “Buscar” del riel, que es el mismo flujo del usuario.
3. **Eliminación de excedente:** el selector `button` coincidía con botones de
   la tabla detrás del modal. Se acotó la acción al panel del modal (`.panel`).
4. **Notificaciones:** la prueba buscaba el texto del `aria-label`; se corrigió
   para usar `button[aria-label="Actualizar notificaciones"]`.
5. **Modo oscuro:** los selectores usaban `data-theme='dark'` mientras el
   proveedor escribía `oscuro`; se alinearon los tokens y se movieron las reglas
   a `@layer components` para ganar la cascada.
6. **Buscador tapado por el encabezado:** el overlay tenía `z-[60]` y el header
   `z-[2500]`, por lo que no se superponía. Se elevó a `z-[2600]` y se agregó el
   escenario E2E-02.4 que compara los `z-index` calculados en el navegador.

**Funcionalidades con problemas pendientes:** ninguna en los escenarios
cubiertos. Los fallos encontrados fueron de configuración de entorno, selectores
o apilamiento visual; no del flujo de negocio. El buscador y el modo oscuro
quedaron corregidos y verificados.
