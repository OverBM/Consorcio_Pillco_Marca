# 01. Arquitectura del Sistema (corregido)

**Consorcio Pillco Marca — ObraFlow**
**Última verificación:** 10/11/2026
**Documento detallado:** [`docs/12-actividad-1-arquitectura-software.md`](12-actividad-1-arquitectura-software.md)

---

## Corrección del documento anterior

La versión previa describía dos módulos desplegados por separado
(`frontend/web` en el puerto 4200 y `backend/api` en el puerto 3000) con
TanStack Query y Axios. Esa descripción **no corresponde al sistema ejecutable**:

- `frontend/web` y `backend/api` solo contienen `Dockerfile` y `.env.example`
  heredados del laboratorio DevOps; no tienen código de la aplicación.
- El sistema real es un **monolito modular Laravel 13** que sirve la interfaz y
  la API desde el mismo proceso.
- El cliente usa **Inertia.js + React 19**, no TanStack Query; las llamadas
  asíncronas usan `fetch` nativo.

## Arquitectura vigente

```text
Navegador
  │  Props Inertia (HTML) + fetch JSON a /api/v1
  ▼
Laravel 13.30 (PHP 8.5)
  ├── Middleware: sesión, RBAC (EnsureModuleAccess), ResolveApiUser
  ├── Controladores Web (Inertia::render) y API V1 (JSON)
  ├── Dominio: Inventario, Geo, Métricas, Analítica, Excedentes, Proyectos
  ├── Eloquent + Query Builder
  ├── PostgreSQL 18.6 + PostGIS 3.7 (104 tablas)
  ├── FastAPI :8001 (motor predictivo)
  └── ORS / OSRM / OpenStreetMap / WhatsApp
```

| Elemento        | Implementación                                             |
| --------------- | ---------------------------------------------------------- |
| Estilo          | Monolito modular con SPA Inertia/React                     |
| Frontend        | React 19.2, TypeScript 5.7, Tailwind 4.1, Vite 8           |
| Backend         | Laravel 13.30, Inertia Laravel 3.3, PHP 8.5                |
| Base de datos   | PostgreSQL 18.6 + PostGIS 3.7, 104 tablas, 25 migraciones  |
| Autenticación   | Sesión web + Bearer `remember_token` para API              |
| Rutas           | 179 rutas, 122 bajo `/api/v1`                              |
| Stock           | `StockService` con `DB::transaction` + `lockForUpdate`     |
| Auditoría       | Trigger `trg_kardex_inmutable` sobre `kardex`              |
| Analítica       | FastAPI/uvicorn en `127.0.0.1:8001` con `X-Internal-Token` |
| Geolocalización | PostGIS + OpenRouteService + OSRM (respaldo) + OSM         |

Para el detalle de capas, módulos, diagramas Mermaid y justificación de APIs,
consultar `docs/12-actividad-1-arquitectura-software.md`. Para el stack y el
entorno de despliegue, `docs/13-actividad-2-arquitectura-tecnologica.md`.
