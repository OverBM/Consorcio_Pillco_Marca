# Consorcio Pillco Marca — Dashboard geo-inventario

Dashboard geolocalizado de inventario multi-almacén (Huancayo / Junín, Perú), construido sobre el
scaffold **Laravel + Inertia (React) + Vite + Tailwind v4** que trae el repositorio.
**Solo mock data** — la lógica de negocio vive en un store React en el cliente; `DB_CONNECTION=sqlite`
permanece inerte en esta fase de prototipo.

## Ejecutar

```bash
composer install
npm install

php artisan serve        # http://localhost:8000  (sirve las 4 pantallas Inertia)
npm run dev              # Vite: hot reload de assets          (terminal 2)
```

Verificar tipos/compilación:

```bash
npm run types:check      # tsc --noEmit
npm run build            # vp build (vite build de producción)
```

> En `npm run dev` no hace falta un puerto separado: Vite inyecta el bundle en `php artisan serve`.

## Pantallas

| Ruta         | Pantalla           | Spec de referencia                 |
| ------------ | ------------------ | ---------------------------------- |
| `/`          | Panel General      | `openspec/changes/…/specs/panel-general/spec.md` |
| `/stock`     | Matriz de Stock    | `…/specs/matriz-de-stock/spec.md`  |
| `/recepcion` | Recepción de Obra  | `…/specs/recepcion-de-obra/spec.md`|
| `/despachos` | Despacho y Rutas   | `…/specs/despacho-y-rutas/spec.md` |

Rutas Inertia en `routes/web.php` (nombres: `panel`, `stock`, `recepcion`, `despachos`).
Páginas en `resources/js/pages/`; layout persistente `resources/js/components/layout/AppLayout.tsx`.

## Recorrido demo (caso central: sobrantes por cierre)

1. **Panel General** (`/`): en "Sobrantes por cierre de obra" aparece el cemento de
   **IE Los Andes (cerrada)** con receptoras sugeridas por cercanía. Pulsa **Crear despacho**.
2. **Despachos & Rutas** (`/despachos`): se abre el formulario **prellenado** con la
   receptora más cercana (`suggestReceivingObras`). Confirma → queda `pendiente`.
3. Usa **Iniciar tránsito** (vehículo + responsable) → la ruta se anima en el
   `MapaSchematic` y avanza el % de progreso (`useSimulatedTransit`).
4. Al llegar al 100% el despacho se **entrega**: `UPDATE_DESPACHO` descuenta el origen,
   suma al destino y la alerta de sobrante pasa a acusada/resuelta. Vuelve a **Matriz
   de Stock** (`/stock`) para ver el movimiento.

También disponible: "Aprobar Traslado" directo en el banner del optimizador, recepciones
con conformidad y evidencia simulada, y exportación CSV de la matriz filtrada.

## Fuente visual (Stitch)

Las 4 pantallas reflejan el proyecto Stitch **"Geolocated Construction Inventory System"**
(`projects/4669547262637231231`) con el dialecto visual del Dashboard (Decisión 8: indigo
`#5468FF`, radios generosos, sombras suaves, íconos de trazo). Los HTML exportados de referencia
se conservaron en `%TEMP%\opencode\stitch-{dashboard,stock,recepcion,rutas}.html`; si alguna URL
del conector MCP venció, re-obtenerlas con `get_screen` antes de retocar esa pantalla.

## Notas

- Offline: fuentes vía `@fontsource-variable` e íconos SVG inline (sin CDN; se retiró `bunny()`).
  Imágenes remotas de Stitch (`lh3.googleusercontent.com`) usan fallback SVG local si no hay red.
- El mapa es un SVG esquemático propio (`MapaSchematic`), sin tiles ni librerías de mapas.
- Obra activa y alertas acusadas persisten en `localStorage`.
- Sesión/caché/cola usan drivers `file`/`sync` en `.env` para que el prototipo no dependa de la BD.
- Antes de esta revisión arquitectónica (Decisión 14) el prototipo vivía como SPA autónoma en
  `frontend/`; se migró a `resources/js` + rutas Laravel para reutilizar el stack del scaffold.