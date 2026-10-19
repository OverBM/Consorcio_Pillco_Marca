@php
  $descripcionMeta = \Illuminate\Support\Str::limit(
    $obra['programa_descripcion'] ?: ($obra['nombre'].' — obra registrada por Consorcio Pillco Marca.'),
    150
  );
  $ubicacion = trim(collect([$obra['direccion'], $obra['distrito']])->filter()->implode(' — '), ' —');
@endphp
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#e5e5e5" />
    <meta name="description" content="{{ $descripcionMeta }}" />
    <meta property="og:title" content="{{ $obra['nombre'] }} — Consorcio Pillco Marca" />
    <meta property="og:description" content="{{ $descripcionMeta }}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="{{ url()->current() }}" />
    <title>{{ $obra['nombre'] }} — Consorcio Pillco Marca</title>
    <link rel="canonical" href="{{ url()->current() }}" />
    <link rel="icon" href="/assets/brand-mark.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <script src="/script.js" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    @include('partials.site-header', ['anchorPrefix' => '/'])

    <main id="contenido">
      <section class="section page-shell project-detail-hero" aria-labelledby="proyecto-title">
        <div class="section-index"><span>PROYECTO / {{ $obra['codigo'] }}</span><span>{{ strtoupper($obra['estado_label']) }}</span></div>
        <p class="eyebrow"><span class="mint-tag">{{ $obra['programa'] ?? 'OBRA' }}</span></p>
        <h1 class="display-heading" id="proyecto-title">{{ $obra['nombre'] }}</h1>

        <figure class="project-detail-art" aria-label="Imagen referencial de la obra {{ $obra['nombre'] }}">
          <svg viewBox="0 0 480 230" role="img" aria-hidden="true">
            <path d="M54 193h372M95 193V93l70-42 70 42v100M235 193V72l71-34 70 34v121" />
            <path d="M117 112h24v29h-24zm52 0h24v29h-24zm89-18h25v31h-25zm53 0h25v31h-25zm-53 57h25v31h-25zm53 0h25v31h-25z" />
            <path class="art-accent" d="m90 86 75-45 74 45M230 65l76-36 76 36" />
          </svg>
          <figcaption>
            <span class="mono-label">{{ $obra['codigo'] }}</span>
            <span>Imagen referencial de la obra</span>
          </figcaption>
        </figure>

        <div class="project-detail-meta">
          <div><span class="mono-label">DISTRITO</span><strong>{{ $obra['distrito'] ?? '—' }}</strong></div>
          <div><span class="mono-label">ESTADO</span><strong>{{ $obra['estado_label'] }}</strong></div>
          <div><span class="mono-label">AVANCE FÍSICO</span><strong>{{ number_format($obra['avance'], 0) }}%</strong></div>
          @if ($obra['fecha_inicio'])
            <div><span class="mono-label">INICIO</span><strong>{{ $obra['fecha_inicio']->format('d/m/Y') }}</strong></div>
          @endif
          @if ($obra['entidad_contratante'])
            <div><span class="mono-label">ENTIDAD</span><strong>{{ $obra['entidad_contratante'] }}</strong></div>
          @endif
        </div>

        @if ($obra['descripcion'])
          <p class="lead-copy project-detail-lead">{{ $obra['descripcion'] }}</p>
        @endif

        <div class="project-detail-progress" role="img" aria-label="Avance físico {{ number_format($obra['avance'], 0) }} por ciento">
          <span class="project-detail-progress-bar" style="width: {{ max(0, min(100, $obra['avance'])) }}%"></span>
        </div>

        @if ($ubicacion !== '')
          <p class="project-detail-location"><span class="mono-label">UBICACIÓN APROXIMADA</span> {{ $ubicacion }}</p>
        @endif

        <div class="hero-actions">
          <a class="button button-dark" href="/#contacto">Conversemos <span aria-hidden="true">↗</span></a>
          <a class="text-link" href="/#proyectos">Ver más proyectos <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      @if ($mapa)
        <section class="section page-shell" aria-labelledby="mapa-title">
          <div class="section-index"><span>UBICACIÓN</span><span>REFERENCIA APROXIMADA</span></div>
          <h2 class="project-detail-map-title" id="mapa-title">Dónde se ubica.</h2>
          <p class="project-detail-map-note">La ubicación mostrada es referencial (a nivel de distrito) y no corresponde a las coordenadas exactas de la obra.</p>
          <figure class="project-detail-map">
            <iframe
              title="Mapa referencial de {{ $obra['nombre'] }}"
              src="{{ $mapa['embed_url'] }}"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
            <figcaption>
              <span>{{ $ubicacion !== '' ? $ubicacion : ($obra['distrito'] ?? 'Valle del Mantaro') }}</span>
              <a class="text-link" href="{{ $mapa['externo_url'] }}" target="_blank" rel="noopener noreferrer">Abrir en OpenStreetMap <span aria-hidden="true">↗</span></a>
            </figcaption>
          </figure>
        </section>
      @endif

      <section class="section page-shell" aria-labelledby="hitos-title">
        <div class="section-index"><span>HITOS Y FASES</span><span>SEGUIMIENTO DEL PROYECTO</span></div>
        <div class="project-detail-grid">
          <div class="project-detail-panel">
            <h2 id="hitos-title">Cronograma de hitos.</h2>
            @if ($hitos->isEmpty())
              <p class="project-detail-empty">Aún no se registran hitos para este proyecto.</p>
            @else
              <ul class="hito-list">
                @foreach ($hitos as $hito)
                  <li class="hito-item">
                    <span class="hito-name">{{ $hito->nombre }}</span>
                    <span class="hito-dates">
                      {{ $hito->fecha_planificada?->format('d/m/Y') ?? '—' }}
                      @if ($hito->fecha_real)
                        · <span class="hito-real">real {{ $hito->fecha_real->format('d/m/Y') }}</span>
                      @endif
                    </span>
                  </li>
                @endforeach
              </ul>
            @endif
          </div>

          <div class="project-detail-panel">
            <h2>Ciclo de vida.</h2>
            @if ($fases->isEmpty())
              <p class="project-detail-empty">Aún no se registran fases para este proyecto.</p>
            @else
              <ul class="fase-list">
                @foreach ($fases as $fase)
                  <li class="fase-item">
                    <span class="fase-name">{{ $etiquetasFase[$fase->fase] ?? $fase->fase }}</span>
                    <span class="fase-state">{{ $etiquetasEstadoFase[$fase->estado] ?? $fase->estado }}</span>
                  </li>
                @endforeach
              </ul>
            @endif
          </div>
        </div>
      </section>
    </main>

    @include('partials.site-footer', ['anchorPrefix' => '/'])

    <button class="back-to-top" type="button" data-back-to-top hidden aria-label="Volver arriba">
      <span aria-hidden="true">↑</span>
    </button>
  </body>
</html>
