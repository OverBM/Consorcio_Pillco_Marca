# 02. Aseguramiento de la Calidad y Trazabilidad ISO

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca
**Etapa:** Verificación de calidad, cobertura y análisis estático
**Fecha de registro:** Octubre 2026

> Este documento es una **adaptación** de buenas prácticas de aseguramiento de la calidad a las normas ISO 9001:2015, ISO/IEC 25010 e ISO/IEC 29119-3. No constituye una certificación; su finalidad es dejar evidencia verificable de cómo se planificó, ejecutó y controló la calidad del entregable.

---

## 1. Alcance normativo

| Norma           | Cláusula / concepto                                     | Aplicación en el proyecto                                                                                    |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| ISO 9001:2015   | 7.5 Información documentada                             | Los registros `02` a `07` de `docs/` conservan evidencia de pruebas, incidencias, configuración y cobertura. |
| ISO 9001:2015   | 8.5.1 Control de la producción y provisión del servicio | Procedimiento reproducible de pruebas y cobertura (sección 2).                                               |
| ISO 9001:2015   | 9.1 Seguimiento, medición, análisis y evaluación        | Métricas de cobertura, duplicación, hallazgos y Quality Gate.                                                |
| ISO 9001:2015   | 10.2 No conformidad y acción correctiva                 | Registro de incidencias con causa raíz y acción correctiva (`03-registro-incidencias.md`).                   |
| ISO/IEC 25010   | Calidad del producto software                           | Matriz de características y evidencias (sección 3).                                                          |
| ISO/IEC 29119-3 | Documentación de pruebas                                | Organización de la suite, casos y reportes de cobertura.                                                     |

---

## 2. Procedimiento de verificación

1. **Preparar el entorno** con las versiones declaradas: PHP 8.4, Node 22, Pest, Vitest.
2. **Ejecutar la suite funcional** y registrar el resultado:

    ```bash
    php artisan test
    npm test
    npm run types:check
    ```

3. **Generar los reportes de cobertura**:

    ```bash
    npm run test:coverage                      # coverage/lcov.info
    php artisan test --coverage-clover=coverage.xml
    ```

4. **Normalizar rutas** de ambos reportes a formato relativo (`app/...` y `resources/js/...`) para que sean portables entre Windows y Linux.
5. **Versionar los reportes** junto con el código, de modo que el análisis estático sea reproducible sin volver a ejecutar las suites.
6. **Ejecutar el análisis estático** desde la raíz del proyecto, con `sonar-project.properties`, y verificar el Quality Gate.

---

## 3. Matriz ISO/IEC 25010

| Característica           | Evidencia en el repositorio                                                                    | Resultado                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Adecuación funcional     | Suite de 460 pruebas sobre 73 archivos; las 40 páginas del frontend tienen al menos una prueba | Suite en verde                            |
| Eficiencia de desempeño  | No se ejecutaron pruebas de carga                                                              | Fuera de alcance (declarado)              |
| Compatibilidad           | Build de cliente y SSR; stub de Leaflet para SSR                                               | `vp build` y `vp build --ssr` sin errores |
| Capacidad de interacción | Pruebas de componentes y páginas por rol, texto y `aria-label`                                 | Cubierto por la suite                     |
| Fiabilidad               | 0 bugs reportados por el analizador; suite sin fallos                                          | Calificación A                            |
| Seguridad                | 0 vulnerabilidades y 0 hotspots; autorización por roles y policies de Laravel                  | Calificación A                            |
| Mantenibilidad           | 0 code smells, duplicación 1,2 %, cobertura 84,3 %                                             | Calificación A                            |
| Portabilidad             | Reportes con rutas relativas y fin de línea LF; stack declarado                                | Reproducible en Linux                     |

---

## 4. Umbrales y resultados

| Métrica                      | Umbral   | Resultado          | Estado |
| ---------------------------- | -------- | ------------------ | ------ |
| Cobertura (global, JS + PHP) | ≥ 80 %   | 84,3 %             | Cumple |
| Cobertura de líneas          | ≥ 80 %   | 84,8 %             | Cumple |
| Duplicación                  | ≤ 3 %    | 1,2 %              | Cumple |
| Bugs                         | 0        | 0                  | Cumple |
| Vulnerabilidades             | 0        | 0                  | Cumple |
| Code smells                  | 0        | 0                  | Cumple |
| Security hotspots revisados  | 100 %    | 100 % (0 abiertos) | Cumple |
| Quality Gate                 | Aprobado | Aprobado           | Cumple |

**Desglose de cobertura local:** JavaScript 3.660/3.828 líneas (95,61 %); PHP 3.407/4.427 sentencias (76,96 %); combinado 7.067/8.255 (85,61 %).

---

## 5. Control de la información documentada

| Documento                            | Contenido                                          | Responsable de actualización |
| ------------------------------------ | -------------------------------------------------- | ---------------------------- |
| `docs/02-calidad-iso.md`             | Marco normativo, procedimiento y matriz de calidad | Equipo de calidad            |
| `docs/03-registro-incidencias.md`    | No conformidades y acciones correctivas            | Equipo de calidad            |
| `docs/04-registro-prompts.md`        | Trazabilidad del uso de asistentes de IA           | Equipo de desarrollo         |
| `docs/05-plan-pruebas.md`            | Estrategia, criterios y registro de ejecución      | Equipo de calidad            |
| `docs/06-configuracion-analisis.md`  | Configuración reproducible del análisis estático   | Equipo DevOps                |
| `docs/07-inventario-cobertura.md`    | Cobertura por módulo y brechas conocidas           | Equipo de calidad            |
| `coverage/lcov.info`, `coverage.xml` | Evidencia cuantitativa de cobertura                | Integración continua         |
| `sonar-project.properties`           | Configuración reproducible del análisis            | Equipo de calidad            |
