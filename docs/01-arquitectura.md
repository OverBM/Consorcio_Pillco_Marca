# 01. Arquitectura del Sistema

**Consorcio Pillco Marca — Sistema Web Geolocalizado Multi-Almacén y Gestión de Proyectos**

---

## 1. Topología del Sistema y Despliegue DevOps

El sistema está estructurado en dos módulos desacoplados bajo el estándar del Laboratorio DevOps:

```
                                 LABORATORIO DEVOPS
       ┌──────────────────────────────────────────────────────────────────┐
       │                                                                  │
       │   frontend/web (Puerto 4200)          backend/api (Puerto 3000)  │
       │   ├── React 19 + TypeScript           ├── Laravel 11/13          │
       │   ├── ObraFlow Design System          ├── PHP 8.4 REST API       │
       │   ├── TanStack Query / Zustand        ├── Sanctum Bearer Auth    │
       │   ├── Leaflet + OpenStreetMap         ├── Domain Business Layer  │
       │   └── Dockerfile (ARG PORT=4200)      └── Dockerfile (PORT=3000) │
       │                │                                    │            │
       │                └────────── API REST JSON ───────────┘            │
       │                                     │                            │
       │                                     ▼                            │
       │                         PostgreSQL 16 + PostGIS 3.4              │
       │                         (83 Tablas, Vistas EVM, Funciones fn_*)  │
       └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Reglas Arquitectónicas de Backend (Laravel)

1. **Controladores Delgados**:
    - `FormRequest` para validación estricta.
    - Policies/Gates para autorización por rol y asignación de obra.
    - Invocación a servicios en `app/Domain/`.
    - Respuesta exclusivamente formateada con `JsonResource`.
2. **Capa de Dominio (`app/Domain/`)**:
    - `Domain/Inventario/StockService`: Único punto de mutación de stock (`lockForUpdate` + `DB::transaction`).
    - `Domain/Inventario/KardexService`: Único punto de inserción en `kardex`.
    - `Domain/Geo/GeoService`: Cálculos de geodistancia, geocercas con `ST_DWithin` y GeoJSON.
    - `Domain/Excedentes/RankingReceptoresService`: Ponderación AHP auditable con pesos de `parametros_sistema`.
    - `Domain/Proyecto/EvmService`: Métricas de Valor Ganado (PV, EV, AC, SPI, CPI, EAC, VAC).
3. **Inmutabilidad y Auditoría**:
    - Trigger PL/pgSQL `fn_kardex_inmutable()` que rechaza `UPDATE` y `DELETE` en la tabla `kardex`.
    - Tabla `auditorias` con registro de usuario, IP, entidad, antes/después y hash encadenado opcional.

---

## 3. Reglas Arquitectónicas de Frontend (React + ObraFlow)

1. **Tokens de Diseño ObraFlow**:
    - Colores: `--color-black: #000000`, `--color-mint: #d1ffca`, `--color-yellow: #fff100`, `--color-canvas: #e5e5e5`, `--color-slate: #444444`.
    - Tipografías: `Barlow Condensed` para encabezados display industriales mayúsculos, `Inter` para cuerpo e `IBM Plex Mono` para datos técnicos y coordenadas.
2. **Navegación Dinámica por Roles**:
    - Menú lateral modular filtrado por permisos de usuario.
    - Prohibición estricta de mostrar códigos o números de proceso en la UI.
    - Título oficial en pestaña y encabezado: `"Consorcio Pillco Marca"`.
3. **Capa de Comunicación**:
    - Cliente Axios/Fetch configurado hacia `/api/v1` con interceptores de token Bearer y cierre de sesión automático ante error 401.
    - Adaptador Mock disponible como alternativa para demostración sin servidor.
