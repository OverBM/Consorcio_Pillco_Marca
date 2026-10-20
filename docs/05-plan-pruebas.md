# 05. Plan de Pruebas

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca
**Referencia:** ISO/IEC 29119-3 (documentación de pruebas) e ISO 9001:2015, cláusula 8.5.1
**Fecha de registro:** Octubre 2026

---

## 1. Objetivo y alcance

Demostrar que el sistema cumple sus flujos funcionales visibles, que el código de producción está cubierto por pruebas automatizadas y que los artefactos de cobertura son reproducibles en cualquier entorno.

**Incluido:** frontend React (páginas, componentes, hooks, servicios y utilidades), backend Laravel (Feature y Unit), verificación de tipos, build de cliente y SSR.

**Excluido:** pruebas de carga, pruebas de penetración, pruebas de accesibilidad con lectores de pantalla y pruebas en dispositivos físicos. Se registran como aceptadas en `03-registro-incidencias.md`.

---

## 2. Niveles y tipos de prueba

| Nivel | Herramienta | Alcance | Evidencia |
| --- | --- | --- | --- |
| Unitaria JS | Vitest | Utilidades (`format`, `geo`, `csv`, `estados`, `crud`, `validation`, `refrescar`, `cicloVida`, `navigation`) y hook `useSimulatedTransit` | 51 pruebas |
| Componentes | Vitest + Testing Library | `DataTable`, formularios, modales, iconos, mapas, notificaciones, KPIs | 21 archivos |
| Integración de página | Vitest + Inertia simulado | Render, filtros, acciones y modales de las 39 páginas | 40 archivos |
| Servicio HTTP | Vitest | Cliente `services/http/client` | 18 pruebas |
| Backend | Pest | Feature y Unit de controladores, dominio, modelos y políticas | 137 pruebas, 899 aserciones |
| Tipos | TypeScript | Todo el frontend | `tsc --noEmit` |
| Build | Vite+ | Cliente y SSR | `vp build` y `vp build --ssr` |
| Análisis estático | Sonar | Código de producción JS/PHP | Quality Gate |

---

## 3. Entorno de ejecución

| Componente | Versión |
| --- | --- |
| PHP | 8.4.26 (NTS) |
| Laravel | 13 |
| Pest | Suite del proyecto |
| Node.js | 22.22.2 |
| Vitest | 4.1.11 |
| TypeScript | Configuración del proyecto |
| Cobertura PHP | Xdebug 3.5.3 |
| Cobertura JS | V8 (integrada en Vitest) |

---

## 4. Datos de prueba y aislamiento

- **Fixtures compartidos:** `resources/js/tests/fixtures.ts` (`propsBase`, catálogos de obras, almacenes y materiales).
- **Inertia simulado:** `resources/js/tests/mocks/inertia.tsx`; permite fijar props, interceptar visitas y simular respuestas HTTP sin servidor.
- **Harness:** `resources/js/tests/harness.tsx` centraliza el render de páginas.
- **Sin red:** ninguna prueba depende de servicios externos.
- **Geolocalización:** `navigator.geolocation` se simula por prueba y se elimina en `afterEach`.
- **Determinismo:** no se usan fechas reales ni temporizadores dependientes del reloj.
- **Formato de moneda:** las aserciones normalizan el espacio duro (NBSP) que inserta `formatMoneda`.
- **DOM duplicado:** `DataTable` renderiza tabla y tarjetas; las pruebas usan `getAllByText(...)[0]` e índices por fila multiplicados por dos.

---

## 5. Criterios de entrada y salida

**Entrada**

1. Dependencias instaladas y entorno con las versiones de la sección 3.
2. Código compilando (`tsc --noEmit`).
3. Reportes de cobertura generados y normalizados.

**Salida**

| Criterio | Umbral | Resultado |
| --- | --- | --- |
| Pruebas JS | 0 fallos | 460/460 |
| Pruebas PHP | 0 fallos | 137/137 |
| Cobertura combinada | ≥ 80 % | 85,61 % local; 84,3 % en el analizador |
| Duplicación | ≤ 3 % | 1,2 % |
| Bugs / vulnerabilidades / smells | 0 | 0 / 0 / 0 |
| Quality Gate | Aprobado | Aprobado |

---

## 6. Política de cobertura

1. Se mide **código de producción**, no la infraestructura de pruebas.
2. Vitest excluye de su reporte: `actions/`, `routes/` y `wayfinder/` (generados), `types/` (solo tipos), `tests/` (infraestructura), `components/ui.tsx` y `components/icons.tsx` (primitivas ejercitadas indirectamente) y `app.tsx` (arranque de Inertia).
3. **Excluir en Vitest no oculta archivos al analizador estático:** Sonar cuenta sus propias líneas ejecutables sobre `sonar.sources`, por eso la métrica del servidor (84,3 %) es menor que la local (95,61 % en JS) y sigue siendo honesta.
4. Los reportes se versionan (`coverage/lcov.info`, `coverage.xml`) y usan rutas relativas para ser portables.

---

## 7. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| jsdom no implementa APIs del navegador | Pruebas frágiles | Stubs explícitos y limpieza en `afterEach` |
| Textos repetidos por el doble render de `DataTable` | Falsos negativos | Aserciones por colección e índices controlados |
| Dependencia de catálogos y props | Pruebas acopladas | Fixtures versionados y mínimos |
| Cobertura inflada por exclusiones | Métrica engañosa | Se reporta también la métrica del analizador |
| Deriva entre código y reportes | Cobertura incorrecta | Regenerar reportes antes de cada entrega |
| Entorno distinto (Linux) | Rutas inválidas | Rutas relativas y fin de línea LF |

---

## 8. Registro de ejecución

| Fecha | Suite | Resultado | Observación |
| --- | --- | --- | --- |
| Octubre 2026 | Frontend (73 archivos) | 460/460 | Sin fallos |
| Octubre 2026 | Backend (Pest) | 137/137, 899 aserciones | Sin fallos |
| Octubre 2026 | Tipos | Sin errores | `tsc --noEmit` |
| Octubre 2026 | Build cliente + SSR | Correcto | Stub de Leaflet para SSR |
| Octubre 2026 | Análisis estático | Quality Gate aprobado | 84,3 % de cobertura, 1,2 % de duplicación |

El detalle por archivo está en `07-inventario-cobertura.md`.
