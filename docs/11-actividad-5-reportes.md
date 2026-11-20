# Actividad 5. Implementación de reportes funcionales e impacto del software

**Proyecto:** Consorcio Pillco Marca — ObraFlow
**Módulo:** `/reportes`
**Fecha de corte de datos:** 10/11/2026

---

## 5.1. Identificación de indicadores del negocio

### Problema que aborda el software

La información de inventario está dispersa entre varios almacenes de obra. Esto
provoca quiebres de stock, compras urgentes, transferencias innecesarias y
mermas sin control. ObraFlow centraliza stock, kardex, compras, transferencias y
avance de obra para que esas decisiones se tomen con datos consolidados.

### Indicadores implementados

| Indicador                           | Fórmula / fuente                                          | Uso para el negocio                  |
| ----------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| **Valor del inventario**            | `Σ(cantidad × costo_referencial)` en `stock_almacen`      | Dimensionar el capital inmovilizado  |
| **Stock crítico**                   | SKUs con `(cantidad − cantidad_reservada) < stock_minimo` | Priorizar reposición y conteos       |
| **Mermas del período**              | `Σ mermas.cantidad` y valorización con costo referencial  | Medir pérdidas y enfocar auditorías  |
| **Cumplimiento de transferencias**  | completadas / total del período                           | Evaluar el flujo entre almacenes     |
| **Rotación estimada**               | salidas / existencias, normalizada a 30 días              | Detectar materiales de baja rotación |
| **Compras del período**             | `Σ ordenes_compra.total`                                  | Controlar el abastecimiento          |
| **Avance de obras**                 | promedio de `obras.avance_fisico_pct`                     | Relacionar recursos con ejecución    |
| **Movimientos por día**             | kardex de ingresos y salidas                              | Ver estacionalidad y picos           |
| **Valor por categoría**             | stock valorizado agrupado por categoría                   | Enfocar decisiones por rubro         |
| **Materiales con mayor movimiento** | Top 10 por movimientos absolutos                          | Detectar materiales críticos         |

Los diez indicadores se calculan en el backend; la vista muestra cuatro KPI
principales, una serie diaria, la distribución por categoría y el ranking de
materiales.

---

## 5.2. Implementación del módulo de reportes

### Arquitectura del módulo

| Capa                  | Archivo                                               | Responsabilidad                                          |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Ruta                  | `routes/web.php` → `/reportes`                        | Acceso protegido por autenticación y permiso `panel.ver` |
| Controlador           | `app/Http/Controllers/Web/ReportesViewController.php` | Valida filtros y entrega props Inertia                   |
| Dominio               | `app/Domain/Metricas/ReportesService.php`             | Calcula indicadores, series y rankings desde PostgreSQL  |
| Consultas compartidas | `app/Domain/Metricas/ConsultasInventario.php`         | Joins y filtros comunes con el Panel General             |
| Vista                 | `resources/js/pages/ReportesPage.tsx`                 | KPI, gráficos, tabla, filtros y exportación              |
| Navegación            | `resources/js/navigation.config.ts`                   | Entrada “Reportes e Indicadores”                         |

### Requisitos mínimos del módulo

1. **Indicadores principales:** cuatro tarjetas KPI (valor, stock crítico,
   mermas y cumplimiento) más indicadores secundarios.
2. **Reportes estadísticos:** serie diaria de ingresos/salidas, barras de valor
   por categoría y tabla de materiales con mayor movimiento.
3. **Filtros de consulta:** rango de fechas (`desde`, `hasta`), obra, almacén y
   categoría. Se reflejan en la URL y recalculan los props en cada visita.
4. **Información actualizada:** cada request vuelve a consultar PostgreSQL; no
   hay arreglos estáticos ni datos de demostración incrustados en el componente.

### Evidencia de datos reales (consultas ejecutadas el 10/11/2026)

| Consulta                                                                                  | Resultado                                                   |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `select count(*), sum(cantidad * costo_referencial) from stock_almacen ...`               | **12 SKUs**, **S/ 89 962.50**                               |
| `select count(*) from stock_almacen where (cantidad - cantidad_reservada) < stock_minimo` | **1 SKU crítico**                                           |
| `select count(*), sum(cantidad) from mermas`                                              | **2 registros**, **4.5 unidades**                           |
| `select sum(mermas.cantidad * materiales.costo_referencial) ...`                          | **S/ 195.00**                                               |
| `select estado, count(*) from transferencias group by estado`                             | **1 completada**, **1 en tránsito** → cumplimiento **50 %** |
| `select count(*), sum(total) from ordenes_compra`                                         | **2 órdenes**, **S/ 35 750.00**                             |
| `select count(*), avg(avance_fisico_pct) from obras ...`                                  | **2 obras activas**, avance **55.3 %**                      |

**Distribución por categoría**

| Categoría               | Valor        |
| ----------------------- | ------------ |
| Agregados               | S/ 39 000.00 |
| Acero y fierro          | S/ 36 000.00 |
| Cementos y aglomerantes | S/ 9 262.50  |
| EPP                     | S/ 5 700.00  |

**Materiales con mayor movimiento**

| Material                       | Movimientos absolutos |
| ------------------------------ | --------------------- |
| Cemento Andino Tipo V          | 6 263.53              |
| Fierro Corrugado 1/2" Grado 60 | 2 974.77              |
| Arena Gruesa de Río            | 2 511.58              |
| Casco de Seguridad Dieléctrico | 604.43                |

Al cambiar el filtro de obra o almacén, estos valores cambian; por ejemplo, el
stock crítico y las mermas se reducen al seleccionar un almacén sin movimientos.
Eso demuestra que la vista no usa valores fijos.

### Exportación

El botón **“Exportar CSV”** genera un archivo con las filas visibles y el rango
de fechas en el nombre. Evidencia de una descarga real:
`cypress/downloads/reporte-materiales-2026-10-11-2026-11-09.csv`.

---

## 5.3. Evaluación del impacto funcional

### ¿Qué problema busca solucionar el software?

La falta de visibilidad consolidada del inventario entre almacenes de obra:
compras duplicadas, transferencias tardías, quiebres de stock y mermas no
justificadas. ObraFlow reemplaza planillas y consultas manuales por un tablero
con datos del sistema.

### ¿Qué información permite visualizar el módulo de reportes?

Valor y composición del inventario, SKUs bajo mínimo, mermas y su valor,
cumplimiento de transferencias, rotación, compras, avance de obras, serie diaria
de ingresos/salidas, distribución por categoría y ranking de materiales.

### ¿Qué indicadores permiten evaluar los resultados del proceso?

- **Stock crítico:** efectividad de la reposición.
- **Rotación:** uso real del inventario.
- **Mermas:** control de pérdidas.
- **Cumplimiento de transferencias:** eficiencia del flujo entre almacenes.
- **Compras del período:** disciplina de abastecimiento.
- **Avance de obras:** relación entre recursos y ejecución física.

### ¿Cómo facilita el software la toma de decisiones?

Permite priorizar transferencias desde almacenes con excedente hacia obras con
déficit, decidir compras con base en stock crítico y rotación, y focalizar
conteos o auditorías donde la merma es mayor. Los filtros permiten comparar una
obra o almacén específico sin consolidar hojas de cálculo.

### ¿Qué actividades o procesos pueden optimizarse?

- Redistribución de excedentes entre obras.
- Compras de emergencia y compras duplicadas.
- Conteos físicos y auditorías de inventario.
- Seguimiento de transferencias y tiempos logísticos.
- Reporte mensual a gerencia sin consolidación manual.

### ¿Qué beneficios concretos se esperan?

- Menor quiebre de stock y menos compras urgentes.
- Menor capital inmovilizado en materiales de baja rotación.
- Reducción de mermas no justificadas.
- Decisiones de transferencia más rápidas y sustentadas.
- Un único tablero para gerencia, residentes y almaceneros.

### Comparación antes / después

No existe una línea base histórica formal (tiempos y costos previos al software)
dentro de la base de datos. Por eso se distingue:

- **Resultados efectivamente medidos:** los indicadores actuales del módulo
  (valor S/ 89 962.50, 1 SKU crítico, 2 mermas por 4.5 unidades y S/ 195,
  cumplimiento 50 %, 2 OC por S/ 35 750, avance 55.3 %) y la capacidad de
  recalcularlos con filtros.
- **Beneficios potenciales:** reducción de quiebres, compras urgentes y mermas;
  mejora en la redistribución. Deben validarse comparando períodos con el mismo
  criterio cuando exista historial suficiente.

La comparación antes/después queda preparada: al seleccionar dos rangos de
fechas se pueden contrastar stock crítico, mermas y cumplimiento, sin inventar
una mejora porcentual que los datos aún no demuestran.

---

## Evidencias del módulo

| Evidencia                | Ubicación                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| Captura del módulo y KPI | `docs/evidencias/reportes-actual.png`                                    |
| Captura de tema oscuro   | `docs/evidencias/modo-oscuro-actual.png`                                 |
| Código de la vista       | `resources/js/pages/ReportesPage.tsx`                                    |
| Código del dominio       | `app/Domain/Metricas/ReportesService.php`                                |
| Consultas compartidas    | `app/Domain/Metricas/ConsultasInventario.php`                            |
| Controlador              | `app/Http/Controllers/Web/ReportesViewController.php`                    |
| Pruebas backend          | `tests/Feature/ReportesTest.php`                                         |
| Prueba E2E               | `cypress/e2e/05-reportes.cy.ts`                                          |
| Exportación real         | `cypress/downloads/reporte-materiales-2026-10-11-2026-11-09.csv`         |
| Datos reales             | Consultas SQL de la sección 5.2 ejecutadas sobre `consorcio_pillcomarca` |
