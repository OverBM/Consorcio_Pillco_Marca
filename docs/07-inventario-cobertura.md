# 07. Inventario de Cobertura y Brechas Conocidas

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén — Consorcio Pillco Marca
**Referencia:** ISO 9001:2015, cláusula 9.1 (Seguimiento y medición)
**Fecha de registro:** Octubre 2026

Este documento responde a tres preguntas: qué está cubierto, con cuántas pruebas y qué queda pendiente. Sirve como evidencia de trazabilidad entre módulos y pruebas.

---

## 1. Resumen

| Ámbito                     | Archivos                  | Medida                      | Resultado      |
| -------------------------- | ------------------------- | --------------------------- | -------------- |
| Pruebas JS                 | 73 archivos               | 460 pruebas                 | 100 % en verde |
| Cobertura JS               | 3.828 líneas              | 3.660 cubiertas             | 95,61 %        |
| Pruebas PHP                | 138 archivos con métricas | 137 pruebas, 899 aserciones | 100 % en verde |
| Cobertura PHP              | 4.427 sentencias          | 3.407 cubiertas             | 76,96 %        |
| Cobertura combinada local  | 8.255                     | 7.067                       | 85,61 %        |
| Cobertura en el analizador | 9.522 líneas              | 8.078 cubiertas             | 84,3 %         |

La diferencia entre la medición local y la del analizador se explica en `06-configuracion-analisis.md`: Sonar cuenta líneas ejecutables propias, incluidas las que Vitest excluye de su reporte.

---

## 2. Cobertura JavaScript por grupo

| Grupo         | Archivos medidos | Líneas | Cubiertas | %      |
| ------------- | ---------------- | ------ | --------- | ------ |
| Páginas       | 40               | 2.411  | 2.270     | 94,15  |
| Componentes   | 16               | 968    | 949       | 98,04  |
| Utilidades    | 10               | 218    | 214       | 98,17  |
| Design system | 5                | 121    | 118       | 97,52  |
| Servicios     | 1                | 46     | 46        | 100,00 |
| Hooks         | 1                | 31     | 31        | 100,00 |
| Navegación    | 1                | 33     | 32        | 96,97  |

---

## 3. Inventario de pruebas por página

| Página (archivo de prueba) | Pruebas |
| -------------------------- | ------- |
| AdelantosPage              | 2       |
| AsistenciaPage             | 7       |
| AuditoriaPage              | 5       |
| CalidadPage                | 5       |
| CambiosPage                | 5       |
| CapacitacionesPage         | 5       |
| CicloVidaPage              | 6       |
| CierreObraPage             | 6       |
| Compras                    | 2       |
| CotizacionesPage           | 8       |
| CronogramaEvmPage          | 6       |
| DespachosPage              | 7       |
| DevolucionesPage           | 6       |
| EppPage                    | 6       |
| FasesAdminPage             | 10      |
| IncidentesPage             | 4       |
| InventarioFisicoPage       | 7       |
| MermasPage                 | 5       |
| MonitoreoAmbientalPage     | 4       |
| NotFound                   | 2       |
| OrdenesCompra              | 7       |
| PanelGeneral               | 6       |
| ParametrosPage             | 8       |
| PartidasPage               | 6       |
| PerfilPage                 | 6       |
| PlanillasPage              | 4       |
| PresupuestoPage            | 1       |
| ProgramaPage               | 4       |
| ProveedoresPage            | 6       |
| RecepcionPage              | 6       |
| RedistribucionPage         | 7       |
| Requerimientos             | 9       |
| ResiduosPage               | 5       |
| RiesgosPage                | 6       |
| Solicitudes                | 6       |
| SolicitudesAccesoPage      | 6       |
| StockPage                  | 7       |
| transferencias             | 5       |
| UsuariosPage               | 7       |
| ValorizacionesPage         | 6       |

**Total páginas:** 40 archivos, 39 páginas del directorio `pages/` más `NotFound`.

---

## 4. Inventario de componentes

| Componente (archivo de prueba) | Pruebas |
| ------------------------------ | ------- |
| AlertaBanner                   | 3       |
| AppLayout                      | 11      |
| charts                         | 3       |
| DashboardSidebar               | 5       |
| DataTable                      | 4       |
| DataTableDesign                | 4       |
| EmptyState                     | 2       |
| form                           | 9       |
| GeoDetalle                     | 8       |
| HeaderBar                      | 10      |
| icons                          | 41      |
| KpiCard                        | 3       |
| KpiCardDesign                  | 4       |
| MapaLeaflet                    | 8       |
| MapaSchematic                  | 7       |
| NotificationProvider           | 12      |
| PageHeader                     | 4       |
| RemoteImage                    | 4       |
| Skeleton                       | 7       |
| StatusBadge                    | 3       |
| ui                             | 8       |

**Total componentes:** 21 archivos, 160 pruebas.

---

## 5. Utilidades, hooks y servicios

| Módulo                    | Pruebas |
| ------------------------- | ------- |
| utils/cicloVida           | 4       |
| utils/crud                | 3       |
| utils/csv                 | 4       |
| utils/estados             | 6       |
| utils/format              | 3       |
| utils/geo                 | 8       |
| utils/navigation          | 4       |
| utils/refrescar           | 2       |
| utils/validation          | 9       |
| hooks/useSimulatedTransit | 8       |
| services/client           | 18      |
| navigation.config         | 5       |

**Total:** 74 pruebas en 12 archivos.

---

## 6. Cobertura PHP por área

| Área            | Archivos | Sentencias | Cubiertas | %     |
| --------------- | -------- | ---------- | --------- | ----- |
| `app/Models`    | 74       | 382        | 249       | 65,18 |
| `app/Domain`    | 9        | 474        | 356       | 75,11 |
| `app/Providers` | 1        | 26         | 20        | 76,92 |
| `app/Http`      | 47       | 3.341      | 2.599     | 77,79 |
| `app/Enums`     | 2        | 35         | 30        | 85,71 |
| `app/Support`   | 5        | 169        | 153       | 90,53 |

---

## 7. Brechas conocidas

### 7.1 Frontend

| Archivo                    | Cobertura      | Motivo                                                              |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `pages/CicloVidaPage.tsx`  | 82,9 % (63/76) | El modal de justificación no es alcanzable desde la interfaz actual |
| `pages/CierreObraPage.tsx` | 85,7 % (30/35) | Ramas de confirmación no ejercitadas                                |
| `pages/ResiduosPage.tsx`   | 87,0 % (47/54) | Estados de error de carga                                           |
| `pages/UsuariosPage.tsx`   | 87,1 % (61/70) | Variantes de rol poco frecuentes                                    |
| `pages/AuditoriaPage.tsx`  | 89,7 % (35/39) | Filtros combinados                                                  |

Estas brechas no comprometen el umbral: el grupo de páginas se mantiene en 94,15 %.

### 7.2 Backend

| Archivo                        | Cobertura      | Motivo                          |
| ------------------------------ | -------------- | ------------------------------- |
| `DevolucionController.php`     | 0,0 % (0/58)   | Sin pruebas dedicadas           |
| `ProveedorController.php`      | 0,0 % (0/32)   | Sin pruebas dedicadas           |
| `RankingReceptoresService.php` | 2,3 % (1/43)   | Lógica AHP sin pruebas          |
| `ComprasViewController.php`    | 2,6 % (1/39)   | Sin pruebas dedicadas           |
| `LogisticaViewController.php`  | 32,3 % (31/96) | Flujos parciales                |
| `GeoService.php`               | 43,6 % (17/39) | Cálculos espaciales sin cubrir  |
| `AuthController.php`           | 59,3 % (48/81) | Ramas de error de autenticación |

El total PHP (76,96 %) supera el umbral de 65 % y la cobertura global del analizador (84,3 %) supera el 80 %.

### 7.3 Exclusiones declaradas

Vitest no reporta `actions/`, `routes/`, `wayfinder/` (generados), `types/` (solo tipos), `tests/` (infraestructura), `components/ui.tsx`, `components/icons.tsx` y `app.tsx`. El analizador estático sí los considera cuando están dentro de `sonar.sources`, por lo que la métrica del servidor no queda inflada.

---

## 8. Cómo regenerar este inventario

```bash
npm run test:coverage
php artisan test --coverage-clover=coverage.xml
```

1. Normalizar rutas en `coverage/lcov.info` y `coverage.xml` a formato relativo.
2. Sumar `LF`/`LH` por archivo en el lcov para la cobertura JS.
3. Sumar `statements`/`coveredstatements` por archivo en el Clover para la cobertura PHP.
4. Contrastar con la métrica del servidor antes de publicar el informe.
