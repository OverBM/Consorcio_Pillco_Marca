# Documento de Mapeo Metodológico PMI / PMU y Trazabilidad de Macroprocesos Bizagi

**Proyecto:** Diseño e implementación de un sistema web geolocalizado para la optimización de inventarios multi-almacén en obras de una empresa constructora bajo el enfoque de PMI y PMU  
**Caso de Aplicación:** Sistema Web "Consorcio Pillco Marca" — Valle del Mantaro (Huancayo, Junín, Perú)  
**Alcance de Etapa:** Macroprocesos Bizagi 16 al 30 (Almacén y Logística)

---

## 1. Matriz de Correspondencia PMI / Bizagi 16-30 / Sistema Web

> **Nota metodológica sobre la columna 4:** Las tres primeras columnas se derivan de manera directa y fidedigna de los diagramas de modelado de procesos Bizagi 16 al 30. La cuarta columna representa la **"Propuesta de aplicación a nivel programa"**, cuyo marco conceptual de **PMU (Program Management Unit)** se encuentra pendiente de confirmación y validación final con el asesor de tesis.

| Área de Conocimiento PMI | Macroprocesos Bizagi | Módulo en el Sistema Web | Propuesta de aplicación a nivel programa *(Pendiente de confirmación con asesor)* |
| :--- | :--- | :--- | :--- |
| **Gestión de las Adquisiciones** | **16:** Solicitud de requerimiento de materiales por obra<br/>**17:** Cotización y selección de proveedores<br/>**18:** Generación de orden de compra<br/>**19:** Coordinación de transporte de materiales<br/>**21:** Gestión de devoluciones a proveedor | **Requerimientos y Compras**<br/>(`ComprasPage.tsx`)<br/><br/>**Mermas y Devoluciones**<br/>(`MermasPage.tsx`) | Visibilidad centralizada de órdenes de compra y contratos de suministro en ejecución en todos los almacenes de la red, evaluando el cumplimiento de proveedores y reposición de materiales devueltos. |
| **Gestión de los Costos** | **16:** Solicitud de requerimiento de materiales por obra (Control de presupuesto por partida) | **Requerimientos y Compras**<br/>(`ComprasPage.tsx`) | Supervisión agregada de desviaciones presupuestales por frente de trabajo, identificando requerimientos que exceden la partida aprobada y requiriendo autorización adicional antes de cotizar. |
| **Gestión de los Recursos y Logística** | **20:** Recepción de materiales en almacén origen<br/>**22:** Registro de solicitud de materiales por obrero/residente<br/>**23:** Geolocalización de almacén asignado<br/>**24:** Consulta de stock en tiempo real<br/>**25:** Búsqueda de stock en almacenes cercanos (multi-almacén)<br/>**26:** Registro de despacho digital de materiales<br/>**27:** Generación de orden de transferencia entre almacenes<br/>**28:** Confirmación de recepción de materiales en almacén destino | **Solicitudes de Material**<br/>(`SolicitudesPage.tsx`)<br/><br/>**Matriz de Stock**<br/>(`StockPage.tsx`)<br/><br/>**Despacho y Rutas**<br/>(`DespachosPage.tsx`)<br/><br/>**Transferencias**<br/>(`TransferenciasPage.tsx`)<br/><br/>**Recepción de Obra**<br/>(`RecepcionPage.tsx`) | Optimización y balance dinámico de recursos físicos en la red multi-almacén: asignación automática por proximidad GPS al almacén más cercano con stock disponible, derivación ordenada por distancia ante faltantes y redistribución de saldos de obras cerradas. |
| **Gestión de la Calidad** | **20:** Recepción de materiales en almacén origen (Inspección contra OC)<br/>**21:** Gestión de devoluciones a proveedor (Reclamos formales)<br/>**28:** Confirmación de recepción en destino (Incidencias de traslado)<br/>**30:** Control de mermas y materiales dañados (Clasificación de pérdidas) | **Recepción de Obra**<br/>(`RecepcionPage.tsx`)<br/><br/>**Transferencias**<br/>(`TransferenciasPage.tsx`)<br/><br/>**Mermas y Devoluciones**<br/>(`MermasPage.tsx`) | Aseguramiento de la integridad técnica de los materiales mediante actas de conformidad digital, captura fotográfica de evidencias, registro formal de no conformidades con proveedores y control de mermas según umbral tolerable. |
| **Gestión de los Riesgos** | **25:** Búsqueda en almacenes cercanos (Alerta de desabastecimiento total en la red)<br/>**29:** Actualización de inventario multi-almacén (Inconsistencias de saldo)<br/>**30:** Control de mermas (Pérdidas sobre el umbral) | **Panel General**<br/>(`PanelGeneral.tsx`)<br/><br/>**Mermas y Devoluciones**<br/>(`MermasPage.tsx`) | Monitoreo y alertas tempranas a nivel directivo sobre riesgos de paralización por desabastecimiento crítico, diferencias injustificadas entre despachos y recepciones, y mermas anómalas que requieren auditoría e investigación. |
| **Seguimiento y Control (Nivel Programa)** | **29:** Actualización de inventario multi-almacén en tiempo real<br/>**30:** Control de mermas y materiales dañados | **Panel General**<br/>(`PanelGeneral.tsx`)<br/><br/>**Matriz de Stock**<br/>(`StockPage.tsx`) | Tablero consolidado de supervisión del programa de obras del Valle del Mantaro, gobernando el estado integral de la red, indicadores de desempeño logístico, tiempos de atención y conciliación de inventarios. |

---

## 2. Flujo Operativo y Trazabilidad Transversal

```
  [ Campo / Residente ]              [ Logística / Compras ]            [ Almacenes / Red ]
         │                                      │                                 │
  (22) Solicitud Material                       │                                 │
         │                                      │                                 │
  (23) Asignación GPS Almacén Cercano           │                                 │
         │                                      │                                 │
  (24/25) ¿Hay Stock en Red?                    │                                 │
         ├── SÍ ─────────────────────────────────────────────────────────▶ (26) Despacho Digital
         │                                      │                                 │
         └── NO (Desabastecimiento)             │                                 ▼
                    │                           │                          (27/28) Transferencia
                    ▼                           ▼                                 │
         (16) Requerimiento Obra ──────▶ (17) Cotización Comparada                ▼
                                                │                          (29) Actualización Stock
                                                ▼                                 │
                                         (18) Orden de Compra                     ▼
                                                │                          (30) Control de Mermas
                                                ▼                                 │
                                         (19) Transporte Flete                    ▼
                                                │                          (21) Devolución Proveedor
                                                ▼
                                         (20) Recepción Conforme ──▶ [ Matriz de Stock ]
```

---

## 3. Consideraciones de Implementación y Gobernanza

1. **Lenguaje Operativo en la Interfaz**: Los números de proceso Bizagi (16 al 30) viven únicamente en esta documentación técnica. En la interfaz de usuario se emplean denominaciones claras y constructivas.
2. **Red de Almacenes Dinámica**: La lógica del sistema no asume una cantidad fija de almacenes; procesa dinámicamente "todos los almacenes registrados" en `resources/js/data/obras.ts` y `resources/js/data/almacenes.ts`.
3. **Persistencia y Sustitución de Backend**: El store centralizado (`store/AppContext.tsx`) mantiene sincronizados los saldos de inventario en `localStorage` con control de versión de esquema (`SCHEMA_VERSION`), permitiendo su reemplazo directo por controladores Laravel / Inertia cuando se habilite la base de datos relacional.
