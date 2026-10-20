# 04. Registro de Prompts y Trazabilidad del Trabajo Asistido por IA

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca
**Referencia:** ISO 9001:2015, cláusula 7.5 (Información documentada) e ISO/IEC 29119-3
**Fecha de registro:** Octubre 2026

Este registro conserva las instrucciones que guiaron el trabajo asistido por IA, el resultado obtenido y la evidencia que lo respalda. Su finalidad es auditar decisiones, reproducir resultados y evitar que el conocimiento quede solo en la conversación.

---

## 1. Convención de registro

Cada prompt debe declarar:

1. **Objetivo** verificable (qué debe quedar funcionando).
2. **Alcance** (archivos o módulos involucrados).
3. **Restricciones** (qué no se debe tocar).
4. **Criterio de aceptación** (comando o métrica que lo demuestra).
5. **Evidencia** (archivo, reporte o resultado).

Reglas de uso:

- Un prompt aborda un solo cambio verificable.
- No se aceptan métricas sin comando que las reproduzca.
- Toda modificación de pruebas debe ejecutarse antes de darse por cerrada.
- Los cambios de producción y de configuración se registran por separado.

---

## 2. Prompts ejecutados en la etapa

| ID | Objetivo | Restricciones | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| P-01 | Auditar qué módulos del frontend carecían de pruebas y priorizar por cobertura | No modificar código de producción | Inventario de páginas, componentes y utilidades sin cobertura | Reporte de cobertura inicial |
| P-02 | Implementar pruebas de páginas con el harness, fixtures y mocks existentes | Reutilizar `harness.tsx`, `fixtures.ts` y `mocks/inertia.tsx`; no crear infraestructura nueva | 460 pruebas sobre 73 archivos | Suite en verde |
| P-03 | Cubrir el lote 4: Ciclo de Vida, Calidad, Cambios, Incidentes, Mermas y Monitoreo Ambiental | Seguir las convenciones de `DataTable`, modales y toasts | 29 pruebas nuevas | Suite en verde |
| P-04 | Configurar el análisis estático sin patrones de exclusión | No excluir carpetas; el alcance se define con `sonar.sources` y `sonar.tests` | `sonar-project.properties` con 0 exclusiones | Escaneo sin error de solapamiento |
| P-05 | Generar y normalizar reportes de cobertura JS y PHP | Rutas relativas; fin de línea LF | `coverage/lcov.info` y `coverage.xml` versionables | Medición combinada 85,61 % |
| P-06 | Verificar la cobertura real en el servidor de análisis | Solo lectura; sin cambiar el código | 84,3 % global, 0 hallazgos, Quality Gate aprobado | Métricas del proyecto |
| P-07 | Comparar cobertura con y sin reporte PHP | Mismo código y misma configuración | 74,7 % con lcov; 84,3 % con lcov + Clover | Diferencia de 9,6 puntos |
| P-08 | Comprobar que un clon limpio funciona | Ocultar temporalmente los directorios generados | `tsc` y pruebas en verde solo con los dos módulos versionados | Verificación reproducible |
| P-09 | Preparar la entrega para repositorio y análisis | No incluir dependencias, secretos ni reportes ignorados | Commit preparado sin artefactos indebidos | `git add -A -n` |
| P-10 | Documentar el aseguramiento de la calidad | Trazabilidad con ISO 9001, ISO/IEC 25010 e ISO/IEC 29119-3 | Documentos `02`, `03` y `04` | `docs/` |

---

## 3. Plantillas reutilizables

### P-01 · Auditoría de cobertura

```text
Rol: ingeniero de calidad.
Objetivo: identificar módulos sin pruebas y priorizar por impacto.
Contexto: proyecto Laravel + Inertia + React con Vitest y Pest.
Alcance: recursos de frontend y backend, sin modificar código de producción.
Restricciones: no crear infraestructura de pruebas nueva; reutilizar harness y fixtures.
Entregable: lista priorizada con archivo, motivo y prueba propuesta.
Criterio de aceptación: cada archivo listado existe y no tiene pruebas asociadas.
```

### P-02 · Prueba de página o componente

```text
Rol: ingeniero de pruebas.
Objetivo: cubrir los flujos visibles de <componente> con pruebas deterministas.
Contexto: usar harness.tsx, fixtures.ts y mocks/inertia.tsx del repositorio.
Alcance: un archivo de prueba por componente; no tocar código de producción.
Restricciones: no depender de red, reloj, geolocalización real ni orden de pruebas.
Entregable: archivo de prueba en resources/js/tests/...
Criterio de aceptación: la suite del archivo pasa y no introduce fallos en el resto.
Evidencia: salida de Vitest y cobertura del archivo.
```

### P-03 · Configuración de análisis estático

```text
Rol: ingeniero DevOps.
Objetivo: analizar el proyecto sin patrones de exclusión de carpetas.
Contexto: SonarQube/SonarCloud con reportes lcov y Clover ya generados.
Alcance: sonar-project.properties.
Restricciones: no excluir directorios; sources y tests deben ser disjuntos.
Entregable: properties con sources explícitos, tests, rutas de reportes y encoding.
Criterio de aceptación: el escaneo termina sin errores y reporta cobertura.
Evidencia: log del escáner y métricas del proyecto.
```

### P-04 · Verificación de clon limpio

```text
Rol: ingeniero de calidad.
Objetivo: demostrar que el repositorio funciona sin archivos locales.
Contexto: clonar o simular un clon ocultando directorios generados e ignorados.
Alcance: instalación, tipos, pruebas y build.
Restricciones: no modificar el repositorio original de forma permanente.
Entregable: informe con comandos y resultados.
Criterio de aceptación: tipos y pruebas pasan solo con archivos versionados.
Evidencia: salida de tsc y del runner de pruebas.
```

### P-05 · Registro de incidencia

```text
Rol: responsable de calidad.
Objetivo: registrar una no conformidad con causa raíz y acción correctiva.
Contexto: incidencia detectada en pruebas, build o análisis estático.
Alcance: docs/03-registro-incidencias.md.
Restricciones: describir hechos verificables; no incluir credenciales ni datos personales.
Entregable: fila con ID, síntoma, causa, acción, evidencia y estado.
Criterio de aceptación: la evidencia permite reproducir el cierre.
```

### P-06 · Revisión previa a la entrega

```text
Rol: revisor de entrega.
Objetivo: confirmar que el paquete es reproducible y no contiene artefactos indebidos.
Contexto: commit pendiente de subir a repositorio remoto.
Alcance: archivos versionados, reportes, configuración y secretos.
Restricciones: no reescribir historial ni ejecutar commits.
Entregable: checklist con archivos incluidos, excluidos y verificación de secretos.
Criterio de aceptación: los reportes de cobertura están versionados y no hay secretos.
Evidencia: git status, git ls-files y simulación de add.
```

---

## 4. Relación con las normas

| Plantilla | ISO 9001:2015 | ISO/IEC 25010 | ISO/IEC 29119-3 |
| --- | --- | --- | --- |
| P-01 | 9.1 Seguimiento y medición | Mantenibilidad | Planificación de pruebas |
| P-02 | 8.5.1 Control de la producción | Adecuación funcional | Casos y procedimientos |
| P-03 | 9.1 Seguimiento y medición | Mantenibilidad / Seguridad | Resultados de pruebas |
| P-04 | 8.5.1 Control de la producción | Portabilidad | Entorno de pruebas |
| P-05 | 10.2 No conformidad | Fiabilidad | Registro de incidentes |
| P-06 | 7.5 Información documentada | Mantenibilidad | Informe de pruebas |
