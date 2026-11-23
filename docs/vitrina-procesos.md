# Vitrina de procesos — assets, figuras y medición

Documento interno del change `implementar-procesos-pmi-sst-calidad`. No se publica en producción.

## 1. Herramientas

| Herramienta                                        | Uso                                            | Licencia                           |
| -------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| [Anatomy](https://github.com/wheresryan22/anatomy) | Figuras isométricas SVG para los seis destinos | MIT                                |
| [Polyfork](https://polyfork.dev)                   | Kit Construction Site para el hub 3D           | Free, uso comercial sin atribución |

Instalación de Anatomy como skill de desarrollo (no es dependencia de runtime):

```powershell
npx skills add wheresryan22/anatomy -a opencode
```

Instalada dentro del proyecto, en `.agents/skills/anatomy` (unidad D:), el 2026-11-21. Sin `-g` para no escribir en `C:`. No es dependencia de runtime ni se versiona (`.agents` está en `.gitignore`); las figuras se versionan como SVG/React y no requieren la skill en producción.

### Fuentes

Vendorizadas en `public/fonts/` y declaradas en `public/fonts.css`. La vitrina ya no llama a Google Fonts (verificado: 0 peticiones externas).

| Familia          | Pesos            | Archivos                         | Licencia    |
| ---------------- | ---------------- | -------------------------------- | ----------- |
| Barlow Condensed | 700, 800         | `barlow-condensed-700/800.woff2` | SIL OFL 1.1 |
| IBM Plex Mono    | 400, 500         | `ibm-plex-mono-400/500.woff2`    | SIL OFL 1.1 |
| Inter            | variable 100–900 | `inter-variable.woff2`           | SIL OFL 1.1 |

Total: **5 woff2 / 119.8 KB**. `font-display: swap`, sin `preconnect` ni CSS remoto.

## 2. Kit usado

**Base: Construction Site (`construction-site-9e40b0`)** — más los props de apoyo que se indican abajo.

- Estructura y obra: `concrete-core-section` (núcleo de 12 × 8 m y dos niveles), `metal-deck-floor-plate` (losa intermedia), `formwork-wall-panel-run`, `rebar-assembly` (acopio junto al edificio), `scaffold-bay`, `scaffold-material-stack`. La viga corona, la escalera de concreto y los pavimentos se resuelven con geometría procedural.
- Maquinaria: `mobile-crane`, `articulated-dump-truck`, `tracked-excavator`, `tandem-road-roller`, `backhoe-loader`, `mini-excavator`.
- Servicios: `site-cabin`, `site-generator`, `site-lighting-tower`, `site-tool-vault`.
- Seguridad y tráfico: `crash-barrier-run`, `site-safety-sign-board`.
- Materiales: `precast-concrete-stack`, `spoil-heap`.
- Grúa: `tower-crane-mast`, `tower-crane-top`.

**Props de apoyo (16, de otros kits de Polyfork)**: `town-car` (NYC City Kit), `whiteboard` (Office), `sidewalk-bollard` (NYC City Kit), `security-gatehouse` (Airport), `privacy-curtain-panel` (Hospital), `mesh-fence-panel` (Hospital), `cordwood-pile` (Campground Lake), `pipe-run` (Salvage Commons), `signal-cable-drum` (World War II), `queue-barrier-stanchion-run` (Airport), `lifting-barrier-arm` (Airport), `olive-tree` (Mediterranean Island Village), `apartment-block` (Japanese Suburban City Street), `three-storey-shophouse` (Japanese Suburban City Street), `hotel` (Frontier Town) y `street-lamp` (Japanese Suburban City Street). Se buscan fuera del kit cuando este no trae el objeto: autos, pizarra, bolardos, caseta de archivo, lonas, cerco metálico, leña/tubería, barrera de pluma, árboles, faroles y los edificios en acabados.

## 3. Guion de la vitrina

| Destino       | Escena                                              |
| ------------- | --------------------------------------------------- |
| `#pmu`        | Portafolio, EVM consolidado, redistribución         |
| `#pmi`        | Ciclo PMI y gates                                   |
| `#obra`       | Frentes, almacén, partidas, EPP, residuos, calidad  |
| `#materiales` | Solicitud → almacén → transferencia → obra → Kardex |
| `#geo`        | Mapa, geocercas, rutas, ETA, tracking               |
| `#cierre`     | Valorizaciones, conformidad, lecciones              |

Reglas: cada destino se abre desde su hotspot, desde la lista de Destinos o con un enlace directo por hash. La página no muestra cifras de ejemplo ni captura datos.

## 4. Assets vendorizados

Ruta: `public/assets/vitrina/`.

- **69 GLB, 12.01 MB** en total: piezas del kit Construction Site + 16 props de apoyo de otros kits.
- El GLB completo del kit pesa 37.9 MB y **no** se vendoriza; se usan piezas sueltas.
- Los 6 modelos principales (caseta, grúa móvil, dumper, excavadora, gantry, pallet) se precargan; el resto se carga en el mismo `Suspense` de la escena.
- **Figuras**: 6 SVG nativos en `resources/js/features/vitrina/figures/markup/` (42.8–70.4 KB) + `figures.css` (12.8 KB / 2.69 KB gzip). Se cargan bajo demanda.
- **Fuentes**: 5 woff2 en `public/fonts/` (119.8 KB) + `fonts.css` (0.7 KB). Sin CDN.

Licencia: los GLB de Polyfork son CC BY 4.0 con crédito o Polyfork licence sin crédito y sin redistribución. Se usa la segunda opción (comercial, sin atribución). El `.mjs` fuente y las ediciones HD no se redistribuyen.

## 5. Figuras de Anatomy (fase 2)

| Destino       | Figura                        | Markup                                                        | Peso    | Chunk (gzip) | Movimiento                                                      | Lectura                     |
| ------------- | ----------------------------- | ------------------------------------------------------------- | ------- | ------------ | --------------------------------------------------------------- | --------------------------- |
| `#pmu`        | Banco de portafolio           | `resources/js/features/vitrina/figures/markup/pmu.svg`        | 70.4 KB | 11.49 KB     | El carro recorre las tres tolvas; la compuerta mint dosifica    | Obras 3, avance 68%         |
| `#pmi`        | Línea de cinco estaciones     | `resources/js/features/vitrina/figures/markup/pmi.svg`        | 69.0 KB | 11.13 KB     | El pallet avanza y las cuatro compuertas se levantan            | Fase 3, gate 3              |
| `#obra`       | Mesa de frentes               | `resources/js/features/vitrina/figures/markup/obra.svg`       | 53.9 KB | 9.00 KB      | El pórtico coloca una losa mint sobre el frente                 | Frentes 2, stock 62%        |
| `#materiales` | Línea de suministro           | `resources/js/features/vitrina/figures/markup/materiales.svg` | 46.2 KB | 8.00 KB      | La cinta lleva el pallet del almacén a la tolva                 | Movimientos 12, almacenes 2 |
| `#geo`        | Mesa de rutas                 | `resources/js/features/vitrina/figures/markup/geo.svg`        | 42.8 KB | 7.83 KB      | El pin recorre la ruta y la geocerca se anima                   | 12.4 km, ETA 28 min         |
| `#cierre`     | Prensa de cierre y archivador | `resources/js/features/vitrina/figures/markup/cierre.svg`     | 50.3 KB | 8.33 KB      | La palanca baja el plato, el documento pasa y la gaveta se abre | Cierre 92%, 8 lecciones     |

Las seis figuras vuelven a mostrarse en el detalle. Las capas 3D de `#obra`, `#materiales` y `#geo` quedan implementadas en el código, pero se desactivan mientras la figura de Anatomy está abierta.

Las figuras corren de forma nativa dentro de la página, no como widgets autocontenidos:

- **Una sola hoja compartida**: `figures/figures.css` (20.3 KB, 2.87 KB gzip) define los tokens y las clases `iso-*` bajo `.figura-iso`. Usa los tokens de la landing (`--color-mint`, `--color-smoke`, `--color-black`, `--color-mist`, `--color-ash`) con valores de respaldo para la vista previa. Se carga una vez, con la primera figura que se abre.
- **Markup puro**: los SVG no llevan `<style>` ni copia del tema; se insertan en el DOM dentro de `.figura-iso` al abrir el detalle y heredan tipografía y color de la página.
- **Carga bajo demanda**: `figures/index.ts` importa cada markup como `?raw` en un chunk propio. Sin abrir un detalle no se descarga ninguna figura ni el CSS (verificado: 0 peticiones antes del click).
- **Detalle sobre el hub**: al inicio solo se ve el panel lateral de **Destinos**, sin ninguna zona marcada; la descripción aparece al hacer click en un hotspot. La figura y la card aparecen juntas y centradas sobre el escenario en los seis destinos. La card describe el proceso con iconos SVG y una nota de **“Cómo lo implementamos”**, sin cifras dentro de las descripciones. Se cierra con `Esc` o "Volver a la obra".
- **Generación**: `node resources/js/features/vitrina/figures/build.mjs` (requiere la skill Anatomy instalada; ver sección 1). Escribe `markup/*.svg`, `figures.css` y `meta.ts`; con `--preview` deja SVG autocontenidos en `D:/_obraflow_tmp/opencode/figures` para revisión e impresión.
- **Solo la figura**: el SVG no lleva etiquetas, placa, tarjeta ni leyenda; va suelto sobre el hub para que el escenario se vea detrás. La explicación queda en el panel de la derecha.
- **El dibujo explica el proceso**: en `#obra` el pórtico baja una losa mint y la encaja sobre el frente; en `#materiales` una cinta continua lleva el pallet del almacén a la tolva con su compuerta; en `#geo` se ven el mapa, los dos puntos, la ruta y el pin que la recorre, más la geocerca.
- **Armado y movimiento**: al aparecer, cada figura se arma en 4 capas de profundidad que suben escalonadas unos 26 px (unos 0.9 s). PMU hace **5 descargas** y el contenido de cada tolva sube en dos tiempos; PMI enciende la **lámpara de la estación** donde está el pallet; obra **coloca una losa en cada frente**; materiales **sella el Kardex en cada movimiento**; geo marca salida y llegada con **pulsos**; cierre comprime el mazo y **sube los separadores**. Los ciclos son de 24 s (PMU), 30 s (PMI), 22 s (obra), 26 s (materiales), 27 s (geo) y 26 s (cierre) con easing `cubic-bezier(.4,0,.2,1)`; al abrir arrancan al 35 % y `prefers-reduced-motion` los desactiva. **Rendimiento**: la figura va en una capa propia (`contain: content` + `translateZ(0)`), sin `filter` ni `vector-effect` por trazo; el chunk se precarga al pasar el puntero. Carga medida: ~195 ms.
- **Medición**: markup de 42.8–70.4 KB y chunks de 7.83–11.49 KB gzip; la isla queda en 285.7 KB gzip, bajo el presupuesto de 320 KB.

### Hero de la landing (2.24–2.30)

- **Escena propia**: `resources/js/landing-hero.tsx` monta un edificio de concreto en construcción con losas, columnas, vigas, muros con vanos, andamios, mallas, materiales y una grúa torre. Usa geometría de cajas agrupada en 4 `InstancedMesh` (opaco, emisivo, transparente y grúa) y una sombra de contacto.
- **Solo el edificio**: el hero no muestra etiquetas ni panel; el canvas es transparente y la pieza queda directamente sobre el fondo de la landing.
- **Armado y scroll**: entra en ~2.4 s por capas y se desarma al bajar, en orden inverso, sin bloquear el scroll; al subir se rearma con respuesta inmediata. `IntersectionObserver` y `visibilitychange` pausan el render.
- **Movimiento continuo**: el edificio balancea y respira levemente, las ventanas pulsan y la pluma de la grúa gira sobre su torre; las mallas naranjas varían su opacidad.
- **Póster**: `hero-building-poster.png` (518 × 600, **98.9 KB**) captura el mismo encuadre y sostiene el LCP; el canvas entra con crossfade. Sin WebGL o con movimiento reducido queda el póster estático.
- **Sin video**: se eliminó `hero.mp4` y la referencia `<video>` del hero.
- **Medición**: **6 draw calls**, **6,084 triángulos**, **75 fps** escritorio; LCP local **4.32 s** con TTFB de 3.23 s del servidor de desarrollo. La validación en 4G/hardware real queda pendiente.

### Hub interactivo (2.7, 2.8, 2.9, 2.21)

- **Progreso del frente**: cada hotspot nuevo avanza una de las cuatro etapas (`Zanja → Fierro → Encofrado → Losa`). El estado vive en `sessionStorage` (`hub-frente-v1`) y la barra se ve en la card PMI y sobre la pizarra del hub.
- **Hover y click**: el hotspot sube 10 cm, se escala y dibuja un anillo mint; los vehículos a menos de 14 m reducen al 40 % su velocidad. El click hace el tween de cámara de ~600 ms, pulsa el objeto y abre el detalle.
- **Capas por destino**: las capas de anillos, ruta y geocerca quedan implementadas en el canvas, pero se desactivan cuando la figura de Anatomy de `#obra`, `#materiales` o `#geo` está abierta.
- **Pulido**: sombras de contacto para vehículos y trabajadores, canto de losa en tres capas, tilt-shift CSS en los bordes y desgaste contenido en un solo material con decals de barro/huellas.
- **Rendimiento**: 18 draw calls normales y 19 con D; 265,501 triángulos.

### Navegación, accesibilidad e impresión (2.14, 2.18, 2.19)

- **Enlaces directos**: `#pmu`, `#pmi`, `#obra`, `#materiales`, `#geo` y `#cierre` abren el detalle al cargar la página sin recargarla. Abrir un destino o cerrarlo usa `history.pushState`, y `popstate`/`hashchange` mantienen el detalle sincronizado con la URL. Atrás/Adelante del navegador funcionan y `Esc` o “Volver a la obra” limpian el hash.
- **Teclado**: la lista de Destinos son enlaces reales (`href="#destino"`), así que `Tab` los enfoca y `Enter` abre el detalle. Al abrir, el foco pasa a “Volver a la obra”; `Esc` cierra el detalle.
- **Sin WebGL**: si el navegador no puede crear un contexto WebGL no se monta el canvas; se muestra el póster estático y un aviso dentro del panel de Destinos. Las figuras del detalle son SVG nativo y siguen funcionando.
- **Texto alternativo**: el hub lleva `role="img"` con una descripción que remite a la lista de Destinos y cada figura lleva `role="img"` con el nombre del destino.
- **Impresión**: “Imprimir este detalle” llama a `window.print()`. `@media print` oculta navegación, panel, canvas y botones, y deja la figura con su explicación sobre fondo blanco; si se imprime el hub, se genera un resumen con los seis destinos.
- **CTA de cierre**: cada detalle termina con “Conversemos” (`/#contacto`), “Solicitar acceso” (`/registro`) e “Imprimir este detalle”; no hay captura de datos ni peticiones a terceros.

### Peso de la página (2.22)

| Recurso                          | Raw      | Gzip                 |
| -------------------------------- | -------- | -------------------- |
| HTML de `/como-trabajamos`       | 11.3 KB  | 3.35 KB              |
| `styles.css`                     | 56.3 KB  | 9.43 KB              |
| `como-trabajamos.css`            | 15.7 KB  | 2.93 KB              |
| `fonts.css`                      | 0.9 KB   | 0.23 KB              |
| Póster `hub-poster.svg`          | 2.4 KB   | 0.9 KB               |
| Fuentes (5 woff2)                | 119.8 KB | —                    |
| Isla 3D (JS)                     | -        | **285.7 KB**         |
| Figuras (CSS + chunks, diferido) | —        | 2.87 + 7.83–11.49 KB |

- **LCP local**: **4.48 s** con TTFB de **2.55 s** del servidor PHP de desarrollo; el canvas y los 48 GLB se cargan en segundo plano y el póster cubre la espera. La medición en 4G simulada y hardware móvil real sigue pendiente de un entorno con throttling.
- **Cero consultas**: `Route::view` sin controlador ni modelos; la página solo pide estáticos y el bundle.
- **Sin red externa**: 0 peticiones fuera del host local (incluidas las fuentes).
- **FPS**: **68 fps** en escritorio visible y **75 fps** en viewport móvil de 390 × 844 (mismo equipo, no hardware móvil). El render se pausa fuera del viewport/pestaña y `dpr` está limitado a 2.

### Hub vivo (2.2–2.6)

- **Vehículos**: dumper, mixer y telehandler con rutas de 41, 57 y 47 s; el flatbed queda aparcado en la franja derecha para no bloquear la vía. Paradas con acción (volquete, tambor, horquilla) en zonas libres, giro con radio mínimo y validación de la huella orientada (largo × ancho, con tolva/horquilla extendida) cada 0.25 m contra huellas infladas 0.5 m y el borde de la losa. La validación imprime **0 colisiones** para las tres rutas activas y zonas de acción libres.
- **Grúas**: grúa móvil articulada (turntable, pluma, telescópico y gancho) y grúa torre de construcción con giro de la pluma, carro y gancho. El gancho y la carga cuelgan del carro con un cable dinámico, por lo que acompañan el giro y el desplazamiento sin quedarse flotando. El pallet cuelga del gancho; sonido visual con balanceo y gancho en movimiento.
- **Trabajadores**: 13 en total: 3 del kit con pose idle + balanceo procedural, 8 caminando y 2 con chaleco reflectivo. El ciclo de paso avanza por distancia recorrida, se detiene al esperar vehículos o al hacer una pausa, y las velocidades varían ±15 %.
- **Rutas seguras**: huellas de edificios, cercos, casetas, acopios y escombros; validación al cargar con corredores de 2.2 m para vehículos y 0.8 m para peatones. Los vehículos giran con radio mínimo y los peatones esperan si un vehículo se acerca. Tecla **D** para ver huellas, rutas y la huella orientada del vehículo en inicio, parada y curva máxima.
- **Ambiente**: humo del generador y polvo detrás del dumper en un único `Points`, baliza ámbar, arrow board, semáforo, bandera mint con onda, charcos y huellas de neumático.
- **Iluminación nocturna**: hemisférica (#5A6B8C / #2B2B33), luna direccional, 11 luces reales (4 torres de obra, grúa torre y 6 faroles Polyfork `street-lamp`: 5 en las vías y 1 en el estacionamiento), sin postes procedurales ni discos de luz falsos. Las torres proyectan sus conos y los faroles aportan luz cálida y luminarias encendidas; se suman ventanas encendidas en edificios y la iluminación de andamios, cartel de entrada, faros con cono, luces de marcha atrás y balizas. La noche conserva el **28 % de la luminancia del mediodía** en el encuadre completo y el **34 % en el centro**. Los botones **Día / Tarde / Noche / Ciclo normal** junto al texto de ayuda cambian la luz con una transición suave; el ciclo automático sigue disponible.
- **Hora del día**: ciclo de 150 s (amanecer, mediodía, atardecer y noche); primero encienden las torres, después las luces menores. Con `prefers-reduced-motion` queda fijo a mediodía y sin luces de obra.
- **Pausa**: las animaciones se congelan al ocultar la pestaña, al salir el canvas del viewport o con movimiento reducido.
- **Medición actual**: **18 draw calls** normales y **19** con la vista D; **265,501 triángulos**; **68 fps** escritorio y **75 fps** en viewport móvil 390 × 844; isla de **285.7 KB gzip**. Se mantiene en el límite de 20 draw calls y bajo 320k triángulos.

## 6. Medición del spike

| Métrica             | Presupuesto | Medido                                          |
| ------------------- | ----------- | ----------------------------------------------- |
| Isla 3D (JS gzip)   | ≤ 320 KB    | **283.1 KB** ✅                                 |
| Triángulos          | ≤ 320k      | **234,407 de origen / 236,247 renderizados** ✅ |
| Draw calls          | ≤ 20        | **15** ✅                                       |
| FPS desktop         | 60          | **75** (ventana visible) ✅                     |
| Consultas a la BD   | 0           | **0** ✅                                        |
| HTML + CSS + póster | ≤ 180 KB    | 11.6 KB + 4.3 KB + SVG < 10 KB ✅               |

Notas del spike:

- El canvas se midió con el navegador visible: 43 GLB distintos y 234,407 triángulos de origen.
- La escena incluye el edificio principal en obra, el edificio de apartamentos en acabados, el edificio adicional sobre el parche de tierra, el Edificio A (`three-storey-shophouse`) en la franja izquierda y el Edificio B (`hotel`) en la franja beige, más los cercos metálico y naranja. Las rejillas elevadas se retiraron; en su lugar hay andamios, encofrados, acopios y palés.
- La cámara quedó a 132 m (fov 30, azimut 20°, elevación 34°) y la escena se midió en 1446 × 886 con el panel abierto: no hay banda muerta y el encuadre incluye el frente y el portón.
- Los GLB conservan los colores originales de Polyfork; solo el entorno, las escaleras, la viga corona y la señalización usan la paleta de obra. Los hotspots son un cilindro de luz mint de 6 m y 1.55 m de radio, un anillo en el suelo separado 0.16 m y un cono-flecha; están dispersos por el recinto (caseta, pizarra, escaleras de la obra central, cinta de materiales, franja beige y apartamentos del fondo).
- Los GLB se fusionan por material y el estático (suelo, vías, patio, perímetro, escalera y señalización) en una sola geometría con vertex colors: **15 draw calls** (12 de la escena y 3 de los hotspots instanciados).
- Con la ventana en segundo plano R3F no inicializa; la página muestra el póster (`hub-poster.svg`) y no queda vacía.
- El kit completo (37.9 MB) no se usa; se vendorizaron **69 archivos / 12.01 MB**: piezas del kit Construction Site y 16 props de apoyo de otros kits.
- Presupuesto vigente: **320k triángulos**. Los 236,247 renderizados dejan **83,753** de margen para trabajadores, vehículos animados y partículas; el gate 2.10 se mide con toda la animación activa.
- La escena con el hub vivo (2.2–2.6) se mide en §5: **52 draw calls**, **262,977 triángulos** y **75 fps** con 8 trabajadores y 4 vehículos animados.
