# 06. Configuración Reproducible del Análisis Estático

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca
**Referencia:** ISO 9001:2015, cláusulas 8.5.1 y 9.1
**Fecha de registro:** Octubre 2026

---

## 1. Objetivo

Documentar cómo se configura, ejecuta y verifica el análisis estático para que cualquier integrante obtenga los mismos resultados sobre el mismo commit, sin depender de la máquina donde se generaron los reportes.

---

## 2. Archivos y responsabilidades

| Archivo | Función |
| --- | --- |
| `sonar-project.properties` | Alcance, pruebas y rutas de reportes |
| `coverage/lcov.info` | Cobertura JavaScript generada por Vitest |
| `coverage.xml` | Cobertura PHP generada por Pest en formato Clover |
| `.gitignore` | Excluye dependencias, artefactos y directorios generados |
| `.gitattributes` | Fuerza fin de línea LF en el repositorio |
| `vite.config.ts` | Configuración de Vitest y de la cobertura |
| `phpunit.xml` | Configuración de la suite PHP |

---

## 3. Configuración del análisis

| Propiedad | Valor | Justificación |
| --- | --- | --- |
| `sonar.projectKey` | `consorcio-pillco-marca_version-2` | Identificador del proyecto; se puede sobrescribir por CLI |
| `sonar.projectVersion` | `3.0.0` | Versión del entregable |
| `sonar.sources` | Lista explícita de directorios de producción | Evita solapamiento con pruebas y excluye generados |
| `sonar.tests` | `tests,resources/js/tests` | Pruebas PHP y JS |
| `sonar.sourceEncoding` | `UTF-8` | Codificación única |
| `sonar.php.tests.reportPath` | `phpunit-report.xml` | Reporte JUnit de Pest (opcional) |
| `sonar.php.coverage.reportPaths` | `coverage.xml` | Cobertura PHP |
| `sonar.javascript.lcov.reportPaths` | `coverage/lcov.info` | Cobertura JS |
| `sonar.qualitygate.wait` | `false` | El escaneo no bloquea la entrega |

**No se define `sonar.exclusions`.** El alcance se controla con `sonar.sources`/`sonar.tests` y con `.gitignore`; excluir carpetas está penalizado en la evaluación y no aporta precisión.

---

## 4. Generación y normalización de reportes

```bash
npm run test:coverage
php artisan test --coverage-clover=coverage.xml
```

Los reportes se normalizan antes de versionarlos:

- `coverage/lcov.info`: rutas `resources\js\...` → `resources/js/...`.
- `coverage.xml`: rutas absolutas `D:\...\app\...` → `app/...`.

Ambos quedan sin retornos de carro (LF), condición necesaria para que las rutas coincidan en Linux.

---

## 5. Ejecución del escáner

```bash
sonar-scanner -Dsonar.host.url=<servidor> -Dsonar.token=<token>
```

- **Versión utilizada:** SonarScanner CLI 8.1.0.6389.
- El token nunca se versiona; se pasa por variable de entorno o parámetro.
- Si el servidor inyecta su propio `projectKey`, el valor de CLI tiene prioridad sobre el archivo.

---

## 6. Evidencia experimental de la cobertura

Se comparó el mismo commit con y sin el reporte PHP:

| Escenario | Cobertura | Cobertura de líneas | Ramas | Líneas a cubrir | No cubiertas |
| --- | --- | --- | --- | --- | --- |
| Solo `lcov.info` | 74,7 % | 69,6 % | 83,1 % | 6.266 | 1.905 |
| `lcov.info` + `coverage.xml` | **84,3 %** | **84,8 %** | 83,1 % | 9.522 | 1.444 |

Conclusión: **ambos reportes son obligatorios**. Sin el Clover, el analizador ignora las pruebas PHP.

---

## 7. Consulta de métricas

```bash
curl -s -u "$SONAR_TOKEN:" \
  "https://sonarcloud.io/api/measures/component?component=<proyecto>&metricKeys=coverage,line_coverage,branch_coverage,lines_to_cover,uncovered_lines,ncloc,duplicated_lines_density,bugs,vulnerabilities,code_smells,security_hotspots"
```

El estado de la última tarea de análisis se consulta en `api/ce/activity`. El Quality Gate se verifica en `api/qualitygates/project_status`.

---

## 8. Resultado obtenido

| Métrica | Valor |
| --- | --- |
| Cobertura | 84,3 % |
| Cobertura de líneas | 84,8 % |
| Cobertura de ramas | 83,1 % |
| Líneas a cubrir | 9.522 |
| Líneas no cubiertas | 1.444 |
| Líneas de código (ncloc) | 31.122 |
| Duplicación | 1,2 % |
| Bugs / vulnerabilidades / smells | 0 / 0 / 0 |
| Hotspots | 0 |
| Calificaciones | A / A / A |
| Quality Gate | Aprobado |

---

## 9. Decisiones y restricciones

1. **Sin exclusiones de carpeta:** la evaluación penaliza ese patrón; además, `vendor` y `node_modules` no están versionados y no se analizan.
2. **Sources y tests disjuntos:** un archivo no puede indexarse dos veces; el solapamiento aborta el escaneo.
3. **Proyecto público:** el plan gratuito limita las líneas de proyectos privados; el entregable debe ser público o eliminarse el proyecto auxiliar.
4. **Reportes versionados:** el análisis no depende de ejecutar las suites en el servidor.
5. **Rutas relativas:** imprescindibles porque el servidor de evaluación usa Linux.

---

## 10. Portabilidad al servidor de evaluación

1. Descargar el ZIP del commit (incluye los reportes y el properties).
2. Extraer y ejecutar el escáner desde la raíz del proyecto.
3. Ajustar, si corresponde, `sonar.host.url`, `sonar.projectKey` y la rama.
4. Verificar que el servidor tenga el analizador PHP; sin él solo se leerá el lcov (74,7 %).
5. No es necesario `composer install` ni `npm install` para analizar.

---

## 11. Diagnóstico de problemas

| Síntoma | Causa | Acción |
| --- | --- | --- |
| `can't be indexed twice` | Sources y tests solapados | Mantener listas disjuntas |
| Límite de 50.000 líneas | Proyecto privado en plan gratuito | Proyecto público o limpieza de proyectos |
| Cobertura 74,7 % | Falta Clover PHP | Agregar `coverage.xml` |
| Cobertura 0 % | Reportes ausentes o rutas absolutas | Regenerar y normalizar |
| Cobertura distinta entre máquinas | Reportes desfasados del commit | Regenerar antes de entregar |
| Rama no coincide | `sonar.branch.name` distinto | Escanear sin parámetro o alinear ramas |
