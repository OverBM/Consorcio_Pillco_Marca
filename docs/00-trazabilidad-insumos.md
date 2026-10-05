# 00. Trazabilidad de Insumos y Registro de Decisiones

**Proyecto:** Sistema Web Geolocalizado Multi-Almacén para Consorcio Pillco Marca (Enfoque PMI / PMU)  
**Organización:** Consorcio Pillco Marca — Valle del Mantaro (Huancayo, El Tambo, Chilca, San Jerónimo, Junín, Perú)  
**Fecha de registro:** Octubre 2026  
**Etapa:** 3 — Backend Laravel + Frontend React ObraFlow + Gestión Integral de Proyectos + Integración DevOps

---

## 1. Registro de Insumos Consultados

| Insumo / Ubicación | Contenido Principal | Decisión Derivada en el Proyecto |
|---|---|---|
| **Carpeta `obraflow`** (`C:\Users\Bradley\Downloads\obraflow`) | Sistema de diseño, tokens CSS, componentes dashboard, login, SVG brand mark | Adopción de la paleta `#000000`, `#d1ffca` (mint), `#fff100` (yellow alert), tipografía display `Barlow Condensed`, mono `IBM Plex Mono`, sidebar oscuro adhesivo y tarjetas `KpiCard` estándar, dark y alert. |
| **Diagramas Bizagi 01–60** (`D:\procesos`) | Flujos BPMN de todos los macroprocesos de la empresa constructora | Mapeo 1:1 de roles, compuertas y transiciones en backend y frontend sin exhibir números de proceso en la interfaz. |
| **`database/schema.sql`** | 83 tablas relacionales en PostgreSQL 16 + PostGIS 3, funciones espaciales, vistas EVM y trigger inmutable de kardex | Fuente de verdad inmutable de la base de datos implementada a través de 10 migraciones ordenadas en Laravel. |
| **`database/seed_base.sql`** | 18 roles base, catálogo de parámetros de ranking multicriterio AHP, unidades de medida y parámetros ambientales | Semilla obligatoria (`seed_base`) con pesos auditables para asignación geolocalizada de excedentes y materiales críticos. |
| **Manual de Adaptación Laboratorio DevOps** | Reglas de activación CI/CD de módulos, Dockerfiles con `ARG PORT`, `ENV PORT`, `EXPOSE PORT`, `.env.example`, rangos de puerto (3000 backend, 4200 frontend) y SonarQube ≥ 80% | Estructuración modular en `backend/api/` y `frontend/web/` con los 3 archivos obligatorios y reportes `coverage.xml` y `lcov.info`. |
| **Artículos Estado del Arte (Art01–Art40)** | Justificaciones académicas de inventarios multi-almacén, PostGIS, AHP, e-POD, EVM | Respaldo metodológico de cada módulo y limitación explícita de alcances futuros (algoritmos genéticos, blockchain o telemetría en vivo marcados fuera de alcance). |

---

## 2. Matriz de Roles Oficiales (Terminología Bizagi)

Los siguientes roles son los únicos autorizados para la interfaz y políticas de acceso, derivados de los carriles Bizagi:
1. `gerente_general`: Gerente General
2. `planificacion_administracion`: Área de Planificación/Administración
3. `area_tecnica`: Área Técnica/Ingeniería
4. `area_financiera`: Área Financiera
5. `residente_obra`: Residente de Obra
6. `maestro_obra`: Maestro de Obra / Cuadrillas
7. `obrero_obra`: Obrero / Personal de Obra
8. `almacenero_obra`: Almacenero de Obra (Origen y Destino / Ejecutor)
9. `jefe_logistica_compras`: Jefe de Logística / Compras
10. `jefe_recursos_humanos`: Jefe de Recursos Humanos
11. `prevencionista_ssoma`: Prevencionista SSOMA / Especialista SST
12. `supervisor_ambiental`: Supervisor Ambiental
13. `oficina_tecnica`: Oficina Técnica
14. `proveedor`: Proveedor (Actor externo)
15. `banco_fideicomitente`: Banco Fideicomitente (Actor externo)
16. `supervision_obra_entidad`: Supervisión de Obra (Entidad) (Actor externo)
17. `administrador_sistema`: Administrador del Sistema (Rol técnico)
18. `auditor`: Auditor (Rol técnico)

---

## 3. Discrepancias y Resoluciones Formales

1. **Actores Externos**: El Banco Fideicomitente y la Supervisión de la Entidad figuran como carriles en diagramas Bizagi pero no tienen acceso interactivo al sistema. Sus resoluciones y actas son ingresadas por el Área Financiera y la Oficina Técnica respectivamente (`es_externo = true`).
2. **Ubicación de Almacenes**: Los datos del Valle del Mantaro (Huancayo, El Tambo, Chilca) se consideran semilla de demostración y todos los cálculos son dinámicos en base a las coordenadas de la base de datos, sin cantidades fijas en el código.
3. **PMU**: Se rotula como *Program Management Unit* (Unidad de Gestión de Programas / Portafolio Consorcial), configurable en `parametros_sistema`.
