<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#e5e5e5" />
    <meta
      name="description"
      content="Cómo trabajamos: maqueta interactiva de una obra para explicar PMI, PMU y la gestión de proyectos del Consorcio Pillco Marca."
    />
    <meta property="og:title" content="Cómo trabajamos — Consorcio Pillco Marca" />
    <meta
      property="og:description"
      content="Explora la obra en 3D y descubre cómo planificamos, abastecemos y controlamos cada proyecto."
    />
    <meta property="og:type" content="website" />
    <title>Cómo trabajamos — Consorcio Pillco Marca</title>
    <link rel="icon" href="/assets/brand-mark.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/fonts.css" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/como-trabajamos.css?v=24" />
    @foreach ([
        'site-cabin-e9ee10',
        'mobile-crane-671d3f',
        'articulated-dump-truck-ee50f3',
        'tracked-excavator-8ebd3c',
        'loading-gantry-34460f',
        'material-pallet-6af263',
    ] as $asset)
        <link rel="preload" href="/assets/vitrina/{{ $asset }}.glb" as="fetch" crossorigin />
    @endforeach
    @vite('resources/js/como-trabajamos.tsx')
  </head>
  <body>
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    @include('partials.site-header', ['anchorPrefix' => '/'])

    <main id="contenido" class="hub-page">
      <div id="como-trabajamos-app" class="hub-app hub-app--full"></div>

      <noscript>
        <div class="hub-noscript page-shell">
          <strong>La maqueta 3D necesita JavaScript.</strong>
          <ul>
            <li>El programa (PMU): portafolio, EVM y redistribución.</li>
            <li>El ciclo PMI: fases y gates.</li>
            <li>La obra: frentes, almacén, partidas, EPP, residuos y calidad.</li>
            <li>Materiales: solicitud → almacén → transferencia → obra → Kardex.</li>
            <li>Geolocalización: mapa, geocercas, rutas y ETA.</li>
            <li>Cierre: valorizaciones, conformidad y lecciones.</li>
          </ul>
        </div>
      </noscript>
    </main>

    @include('partials.site-footer', ['anchorPrefix' => '/'])
  </body>
</html>
