# Actividad 4. Integración de SonarQube para el análisis de calidad del software

**Proyecto:** Consorcio Pillco Marca — ObraFlow
**Plataforma:** SonarCloud (motor SonarQube en la nube)
**Organización:** `consorcio-pillco-marca`
**Project key:** `consorcio-pillco-marca_version-2`
**Dashboard:** https://sonarcloud.io/dashboard?id=consorcio-pillco-marca_version-2
**Análisis final:** 10/11/2026 16:15 UTC

---

## 4.1. Configuración de SonarQube

### Registro y parámetros

| Parámetro | Valor |
|---|---|
| Host | `https://sonarcloud.io` |
| Organización | `consorcio-pillco-marca` |
| Project key | `consorcio-pillco-marca_version-2` |
| Nombre | Consorcio Pillco Marca v2 |
| Versión analizada | `3.2.0` |
| Fuentes | `app`, `resources/js` (componentes, páginas, hooks, servicios, utilidades) |
| Pruebas | `tests`, `resources/js/tests` |
| Exclusiones | `vendor`, `node_modules`, `public/build`, `bootstrap/ssr`, `storage`, `coverage`, `cypress/screenshots`, `cypress/videos`, código generado por Wayfinder |
| Codificación | UTF-8 |
| Token | Variable `SONAR_TOKEN` (nunca versionada) |

### Reportes enlazados

| Lenguaje | Reporte | Generación |
|---|---|---|
| PHP | `coverage.xml` | Pest + Xdebug 3.5.3 (`--coverage-clover`) |
| PHP | `phpunit-report.xml` | Pest (`--log-junit`) |
| JavaScript | `coverage/lcov.info` | Vitest + V8 (`npm run test:coverage`) |

### Comando de ejecución

```powershell
$env:SONAR_TOKEN='<token>'
npx --yes @sonar/scan
```

Resultado del escáner: **`ANALYSIS SUCCESSFUL`**. La tarea de procesamiento
`AaHGK18suxlxxzhHFpl0` terminó en estado `SUCCESS` y las métricas quedaron
disponibles en el panel.

### Evidencia de la corrida

```text
[INFO] ScannerEngine: Analysis report uploaded in 2408ms
[INFO] ScannerEngine: ANALYSIS SUCCESSFUL
[INFO] ScannerEngine: Analysis total time: 4:37.563 min
[INFO] ScannerEngine: SonarScanner Engine completed successfully
```

---

## 4.2. Análisis de los resultados

### Métricas finales

| Métrica | Resultado | Interpretación |
|---|---|---|
| **Quality Gate** | **OK / APROBADO** | Todas las condiciones en verde; cobertura global 81.2 % y cobertura del código nuevo 93.2 % |
| **Bugs** | **0** | Sin defectos de fiabilidad; Reliability Rating = A |
| **Vulnerabilities** | **0** | Se corrigieron las 4 vulnerabilidades iniciales de hashing débil; Security Rating = A |
| **Code Smells** | **0** | Sin problemas de mantenibilidad; deuda técnica = 0 |
| **Coverage** | **81.2 %** | Cobertura global de líneas; 93.2 % en código nuevo |
| **Duplicated Lines** | **0.8 % (391 líneas)** | Por debajo del umbral de 3 %; 29 bloques duplicados |
| Security Hotspots | 0 | Sin hotspots pendientes |
| Líneas de código (NCLOC) | 42 583 | Tamaño del código analizado |
| Complejidad cognitiva | 2 394 | Se concentra en paneles y mapas extensos |
| Deuda técnica (`sqale_index`) | 0 min | Sin esfuerzo pendiente de remediación |

![Dashboard de SonarCloud con Quality Gate y cobertura](evidencias/sonar-dashboard.png)

### Comparación de la evolución

| Métrica | Primer análisis | Análisis previo | Análisis final |
|---|---|---|---|
| Vulnerabilities | 4 | 0 | **0** |
| Code Smells | 2 | 0 | **0** |
| Security Rating | D (4) | A (1) | **A (1)** |
| Deuda técnica | 40 min | 0 min | **0 min** |
| Coverage | 25.3 % | 72.0 % | **81.2 %** |
| Duplicated Lines | — | 510 | **391** |
| Duplicated Density | — | 1.0 % | **0.8 %** |
| Quality Gate | ERROR | OK | **OK** |

### Mejoras aplicadas en este ciclo

1. **Cobertura PHP regenerada** con Xdebug y toda la suite: 242 pruebas y 1 318
   aserciones; el reporte anterior era parcial (25.3 %).
2. **Pruebas nuevas:** catálogo de módulos, cliente analítico, contadores de
   módulos, cola offline, gráfico y resumen de analítica, y 41 casos de
   cobertura de vistas operativas y geolocalización.
3. **Duplicidad reducida de 510 a 391 líneas:** trait
   `BelongsToAlmacenYMaterial` para 10 modelos y consultas compartidas
   `ConsultasInventario` para panel y reportes.
4. **Corrección del buscador** (apilamiento) validada con prueba unitaria y E2E,
   incluida en la cobertura del código nuevo.

### Interpretación de los hallazgos restantes

La duplicación restante no representa riesgo funcional; se concentra en:

- `app/Models/ParametroInventario.php` (46 líneas): coincidencia de listas
  `$fillable` con otros modelos de inventario.
- `SolicitudMaterialController` y `SolicitudCambioController` (38 y 35 líneas):
  estructura repetida de listado paginado.
- `PartidasPage.tsx` y `ValorizacionesPage.tsx` (36 líneas cada una): tablas y
  formularios con estructura similar.

---

## 4.3. Interpretación y propuestas de mejora

### 1. ¿Qué resultado obtuvo el proyecto en el Quality Gate?

**OK / APROBADO.** Las condiciones de fiabilidad, seguridad, mantenibilidad,
duplicación, hotspots y cobertura del código nuevo (93.2 %) están en verde. No
hay bugs, vulnerabilidades ni code smells abiertos.

### 2. ¿Qué problemas fueron identificados?

- **Inicialmente:** 4 vulnerabilidades CRITICAL por `md5`/`sha1` en claves de
  caché de geocodificación y ruteo, y 2 code smells MAJOR por expresiones
  regulares con rendimiento superlineal.
- **En este ciclo:** duplicación de boilerplate en modelos y consultas, y
  cobertura PHP desactualizada por un reporte parcial.
- **Después de las correcciones:** no quedan issues abiertos; la duplicación
  bajó a 0.8 % y la cobertura subió a 81.2 %.

### 3. ¿Qué componentes presentan mayores observaciones?

- `app/Models/ParametroInventario.php` y modelos de inventario con `$fillable`
  extenso.
- `app/Http/Controllers/Api/V1/SolicitudMaterialController.php` y
  `SolicitudCambioController.php` (listados paginados).
- `resources/js/pages/PartidasPage.tsx` y `ValorizacionesPage.tsx` (tablas y
  formularios similares).
- `resources/js/pages/AnaliticaPage.tsx` y `AnaliticaChart.tsx` por complejidad
  y tamaño; ya cuentan con pruebas de render.

### 4. ¿Qué vulnerabilidades fueron detectadas, si existen?

Se detectaron 4 vulnerabilidades CRITICAL (`php:S4790`, weak hash) en:

- `app/Domain/Geo/GeocodificacionService.php` (líneas 29, 55 y 133).
- `app/Domain/Geo/RuteoService.php` (línea 27).

Se sustituyeron por `hash('sha256', ...)`, adecuado para claves de caché y sin
impacto funcional. Análisis final: **0 vulnerabilidades**.

### 5. ¿Cuál es el nivel de cobertura obtenido?

- **Global:** 81.2 % de líneas (SonarCloud).
- **Código nuevo:** **93.2 %**, superior al 80 % exigido.
- **PHP:** 83.52 % de líneas según `coverage.xml` (242 pruebas).
- **JS:** 85.66 % de líneas según `coverage/lcov.info` (Vitest + V8).

### 6. ¿Qué mejoras deberían implementarse para elevar la calidad?

1. **Cobertura PHP:** mantener Xdebug/PCOV en CI y publicar `coverage.xml` en
   cada push para evitar reportes parciales.
2. **Duplicación de controladores:** extraer un trait de listado paginado con
   filtros comunes (obra, almacén, estado).
3. **Duplicación de UI:** crear componentes de tabla/formulario reutilizables
   para Partidas y Valorizaciones.
4. **Complejidad cognitiva:** dividir `AnaliticaPage`, `MapaOperativoPage` y
   `ReportesPage` en hooks y subcomponentes.
5. **Quality Gate en CI:** ejecutar el escáner en GitHub Actions y usar
   `sonar.qualitygate.wait=true` para bloquear merges con regresiones.
6. **Modelos:** evaluar `$guarded` controlado o traits de columnas para los
   modelos con `$fillable` casi idéntico.

---

## Evidencias de la Actividad 4

| Evidencia | Ubicación |
|---|---|
| Configuración del proyecto | `sonar-project.properties` |
| Salida del escáner | `sonar-scan-output-8.txt` |
| Captura del dashboard | `docs/evidencias/sonar-dashboard.png` |
| Métricas exportadas | `docs/evidencias/sonarcloud-metricas.json` |
| Panel y Quality Gate | https://sonarcloud.io/dashboard?id=consorcio-pillco-marca_version-2 |
| Cobertura PHP | `coverage.xml` |
| Cobertura JS | `coverage/lcov.info` |
| Reporte de pruebas | `phpunit-report.xml` (242 pruebas, 0 fallos) |
