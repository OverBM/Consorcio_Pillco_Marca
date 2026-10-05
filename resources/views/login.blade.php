<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#e5e5e5" />
    <meta name="description" content="Acceso al portal de operaciones de Consorcio Pillco Marca." />
    <title>Acceso interno — Consorcio Pillco Marca</title>
    <link rel="icon" href="/assets/brand-mark.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/login.css" />
  </head>
  <body class="login-page">
    <a class="skip-link" href="#login-main">Saltar al contenido</a>

    <header class="login-header">
      <div class="login-nav page-shell">
        <a class="brand" href="/" aria-label="Consorcio Pillco Marca, volver al inicio">
          <img src="/assets/brand-mark.svg" alt="" width="44" height="44" />
          <span class="brand-name"><span>CONSORCIO</span><strong>PILLCO MARCA</strong></span>
        </a>
        <p class="login-header-label"><span class="status-dot" aria-hidden="true"></span> ACCESO INTERNO / CPM</p>
        <a class="button button-dark login-back" href="/">Volver al sitio <span aria-hidden="true">↖</span></a>
      </div>
    </header>

    <main class="login-main page-shell" id="login-main">
      <div class="login-section-kicker"><span>PORTAL / 01</span><span>CONSORCIO PILLCO MARCA</span></div>
      <div class="login-layout">
        <section class="login-intro" aria-labelledby="login-title">
          <p class="eyebrow"><span class="mint-tag">ACCESO INTERNO</span></p>
          <h1 class="login-title" id="login-title">OBRA BAJO<br />CONTROL.</h1>
          <p class="login-copy">Planificación, materiales y frentes de obra en un mismo espacio.</p>
          <div class="login-side-note">
            <span class="login-side-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span><strong>OPERACIONES CPM</strong><br />Obras · inventarios · proyectos</span>
          </div>
        </section>

        <section class="login-panel" aria-labelledby="login-panel-title">
          <div class="login-panel-meta"><span>PORTAL INTERNO</span><span class="mint-tag">OPERACIONES</span></div>
          <p class="login-panel-index">CPM — ACCESO / 01</p>
          <h2 id="login-panel-title">INICIAR SESIÓN.</h2>
          <p class="login-panel-copy">Acceso seguro a proyectos, materiales e inventarios.</p>

          @if ($errors->any())
            <div style="background-color: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.8125rem;">
              {{ $errors->first() }}
            </div>
          @endif

          <form action="/login" method="POST" class="login-fields" aria-label="Datos de acceso">
            @csrf
            <div class="login-field">
              <label for="login-email">Correo corporativo</label>
              <input id="login-email" name="email" type="email" value="{{ old('email') }}" placeholder="nombre@empresa.com" autocomplete="email" required />
            </div>
            <div class="login-field">
              <label for="login-password">Contraseña</label>
              <input id="login-password" name="password" type="password" value="" placeholder="••••••••" autocomplete="current-password" required />
            </div>
            <button class="button button-dark login-submit" type="submit" style="width: 100%; margin-top: 1rem;">Ingresar al Panel <span aria-hidden="true">↗</span></button>
          </form>
        </section>
      </div>
      <div class="login-footer"><span>CONSORCIO PILLCO MARCA</span><span>OPERACIONES · INVENTARIOS</span></div>
    </main>
  </body>
</html>
