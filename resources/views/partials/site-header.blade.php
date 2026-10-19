@php($anchor = $anchorPrefix ?? '')
<header class="site-header" id="inicio">
  <div class="nav-pill">
    <a class="brand" href="{{ $anchor }}#inicio" aria-label="Consorcio Pillco Marca, inicio">
      <img src="/assets/brand-mark.svg" alt="" width="44" height="44" />
      <span class="brand-name"><span>CONSORCIO</span><strong>PILLCO MARCA</strong></span>
    </a>

    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation">
      <span class="menu-toggle-label">Menú</span>
      <span class="menu-toggle-icon" aria-hidden="true"><i></i><i></i></span>
    </button>

    <nav class="primary-navigation" id="primary-navigation" aria-label="Navegación principal">
      <a href="{{ $anchor }}#empresa">Nosotros</a>
      <a href="{{ $anchor }}#servicios">Servicios</a>
      <a href="{{ $anchor }}#proyectos">Proyectos</a>
      <a href="{{ $anchor }}#sistema">Sistema</a>
      <a class="login-nav-link" href="/login">Acceso interno <span aria-hidden="true">↗</span></a>
    </nav>

    <a class="button button-dark nav-cta" href="{{ $anchor }}#contacto">Conversemos <span aria-hidden="true">↗</span></a>
  </div>
</header>
