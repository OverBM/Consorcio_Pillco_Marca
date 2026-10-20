# 03. Registro de Incidencias y Acciones Correctivas

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca
**Referencia:** ISO 9001:2015, cláusula 10.2 (No conformidad y acción correctiva)
**Fecha de registro:** Octubre 2026

Cada incidencia se registra con su síntoma, causa raíz, acción correctiva y evidencia de cierre. El objetivo es que cualquier integrante pueda reproducir el diagnóstico y verificar la solución.

---

## 1. Incidencias de calidad y análisis estático

| ID    | Síntoma                                                                   | Causa raíz                                                                                                                                   | Acción correctiva                                                                                     | Evidencia                                        |
| ----- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| NC-01 | El escáner aborta con `File ... can't be indexed twice`                   | `sonar.sources` incluía `resources/js` y `sonar.tests` incluía `resources/js/tests` (solapamiento)                                           | `sonar.sources` con lista explícita de directorios y `sonar.tests` disjunto                           | Escaneo completado sin error                     |
| NC-02 | La cobertura reportada era 74,7 % pese a tener pruebas PHP                | Solo se enviaba `lcov.info`; el analizador no veía el reporte PHP                                                                            | Agregar `coverage.xml` y `sonar.php.coverage.reportPaths`                                             | Cobertura 84,3 %                                 |
| NC-03 | `reach the maximum allowed lines limit of 50000`                          | El plan gratuito limita líneas solo en proyectos privados; el proyecto nuevo se creó privado                                                 | Proyecto público para el entregable y proyecto espejo público para mediciones                         | Análisis completado y Quality Gate aprobado      |
| NC-04 | Riesgo de penalización por excluir carpetas en `sonar-project.properties` | Patrones de carpeta (`vendor/**`, `resources/js/tests/**`, etc.)                                                                             | Eliminar todo patrón de exclusión; delimitar alcance con `sonar.sources`/`sonar.tests` y `.gitignore` | 0 patrones de exclusión en el properties         |
| NC-05 | No era posible medir la cobertura real antes de configurar el proyecto    | Falta de proyecto vinculado al repositorio                                                                                                   | Crear proyecto público y consultar métricas por API                                                   | Métricas de cobertura y Quality Gate registradas |
| NC-06 | Falta de reporte PHP en el analizador                                     | El comando de pruebas no generaba Clover                                                                                                     | Ejecutar con `--coverage-clover=coverage.xml` y normalizar rutas                                      | `coverage.xml` versionado con rutas `app/...`    |
| NC-07 | El análisis se ejecutaba sobre archivos generados                         | `resources/js/actions`, `routes` y `wayfinder` estaban en `.gitignore` pero dentro de `sonar.sources` cuando se usaba el directorio completo | Lista explícita de sources; los generados quedan fuera del alcance                                    | 31.122 líneas analizadas, sin ruido de generados |

## 2. Incidencias de pruebas automatizadas

| ID    | Síntoma                                                                  | Causa raíz                                               | Acción correctiva                                                                            | Evidencia                                      |
| ----- | ------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| NC-08 | Textos duplicados en las aserciones                                      | `DataTable` renderiza tabla y tarjetas a la vez          | Usar `getAllByText(...)[0]` y multiplicar índices de acciones por dos                        | Pruebas de tablas en verde                     |
| NC-09 | `getAllByRole('table')` no encontraba la tabla; el selector `td` fallaba | Limitaciones de jsdom y textos anidados en `<span>`      | Buscar por contenido con matcher sobre `textContent` y `tagName`                             | Pruebas de tablas en verde                     |
| NC-10 | Aserciones de moneda fallaban por espacios                               | `formatMoneda` inserta espacio duro (NBSP)               | Helper que reemplaza `\u00a0` por espacio normal                                             | Pruebas de importes en verde                   |
| NC-11 | Las pruebas de geolocalización fallaban                                  | jsdom no implementa `navigator.geolocation`              | Stub por prueba y limpieza en `afterEach`                                                    | Pruebas de mapa en verde                       |
| NC-12 | `icons.test.tsx` no compilaba (TS2322)                                   | El tipo del cast no admitía `className`                  | Ampliar el tipo del componente simulado                                                      | `tsc --noEmit` sin errores                     |
| NC-13 | El SSR fallaba por `window` no definido                                  | Leaflet requiere el DOM en tiempo de importación         | Stub de Leaflet para SSR y `ssr.noExternal`                                                  | Build SSR correcto                             |
| NC-14 | Un clon limpio no podía compilar ni probar                               | Los módulos de Wayfinder no se versionaban               | Versionar `resources/js/wayfinder/index.ts` y `resources/js/routes/contexto/index.ts`        | Verificación con directorios generados ocultos |
| NC-15 | Seis páginas del lote 4 sin pruebas                                      | Cobertura incompleta de páginas                          | 29 pruebas nuevas (Ciclo de Vida, Calidad, Cambios, Incidentes, Mermas, Monitoreo Ambiental) | 460 pruebas en verde                           |
| NC-16 | El modal no se localizaba por rol                                        | El componente no expone `role="dialog"`                  | Localizar por `aria-label` (`Cerrar modal`, `Cerrar`) y por título en `h3`                   | Pruebas de modales en verde                    |
| NC-17 | El submit no se disparaba en pruebas de validación                       | Campos `required` bloquean el envío a nivel de navegador | Validar la lógica JS con valores en blanco (`'   '`)                                         | Pruebas de validación en verde                 |

---

## 3. Seguimiento

| Estado   | Criterio                                                          |
| -------- | ----------------------------------------------------------------- |
| Cerrada  | La acción correctiva está aplicada y la evidencia es reproducible |
| Abierta  | La acción está identificada pero no verificada                    |
| Aceptada | La desviación se documenta como fuera de alcance                  |

Todas las incidencias de este registro están **cerradas** al cierre de la etapa. Las pruebas de carga se registran como **aceptadas** (fuera de alcance).
