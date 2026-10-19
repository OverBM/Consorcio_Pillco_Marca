<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#e5e5e5" />
    <meta name="description" content="Solicita tu acceso al portal interno de operaciones de Consorcio Pillco Marca." />
    <title>Solicitud de acceso — Consorcio Pillco Marca</title>
    <link rel="icon" href="/assets/brand-mark.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <script src="/registro.js" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    @include('partials.site-header', ['anchorPrefix' => '/'])

    <main id="contenido">
      <section class="section section-contact" aria-labelledby="registro-title">
        <div class="page-shell">
          <div class="section-index"><span>REGISTRO / 01</span><span>SOLICITUD DE ACCESO INTERNO</span></div>
          <div class="contact-layout">
            <div class="contact-copy">
              <p class="eyebrow"><span class="mint-tag">ACCESO INTERNO</span></p>
              <h2 class="display-heading" id="registro-title">SOLICITA<br />TU ACCESO.</h2>
              <p>Completa tus datos. El responsable del sistema revisará tu solicitud y se pondrá en contacto contigo para habilitar tu cuenta.</p>
              <p class="form-note">El envío de esta solicitud no crea una cuenta ni otorga acceso automático.</p>

              @if ($enviada)
                <div class="registro-confirm" role="status">
                  <strong>Solicitud enviada.</strong>
                  <p>Gracias, recibimos tus datos. El responsable del sistema se pondrá en contacto contigo.</p>
                  <div class="prepared-actions">
                    @if ($contactoWhatsapp)
                      <a class="button button-dark" href="{{ $contactoWhatsapp }}" target="_blank" rel="noopener">Escribir por WhatsApp <span aria-hidden="true">↗</span></a>
                    @endif
                    @if ($contactoEmail)
                      <a class="button button-mint" href="{{ $contactoEmail }}">Enviar correo <span aria-hidden="true">↗</span></a>
                    @endif
                  </div>
                </div>
              @endif
            </div>

            <div class="contact-card">
              <form method="POST" action="{{ route('registro.store') }}" aria-label="Solicitud de acceso" novalidate>
                @csrf
                <div class="field-row">
                  <label for="registro-nombre">Nombre completo</label>
                  <input id="registro-nombre" name="nombre_completo" type="text" value="{{ old('nombre_completo') }}" autocomplete="name" minlength="5" maxlength="150" placeholder="Nombres y apellidos" required />
                  @include('partials.registro-reglas', ['campo' => 'nombre_completo'])
                  @error('nombre_completo')<span class="form-error">{{ $message }}</span>@enderror
                </div>
                <div class="field-row">
                  <label for="registro-email">Correo electrónico</label>
                  <input id="registro-email" name="email" type="email" value="{{ old('email') }}" autocomplete="email" placeholder="nombre@empresa.com" required />
                  @include('partials.registro-reglas', ['campo' => 'email'])
                  @error('email')<span class="form-error">{{ $message }}</span>@enderror
                </div>
                <div class="registro-row">
                  <div class="field-row">
                    <label for="registro-dni">DNI</label>
                    <input id="registro-dni" name="dni" type="text" value="{{ old('dni') }}" inputmode="numeric" maxlength="8" placeholder="8 dígitos" required />
                    @include('partials.registro-reglas', ['campo' => 'dni'])
                    @error('dni')<span class="form-error">{{ $message }}</span>@enderror
                  </div>
                  <div class="field-row">
                    <label for="registro-telefono">Teléfono</label>
                    <input id="registro-telefono" name="telefono" type="tel" value="{{ old('telefono') }}" autocomplete="tel" minlength="6" maxlength="30" pattern="[0-9+\-\s()]+" placeholder="+51 999 999 999" required />
                    @include('partials.registro-reglas', ['campo' => 'telefono'])
                    @error('telefono')<span class="form-error">{{ $message }}</span>@enderror
                  </div>
                </div>
                <div class="registro-row">
                  <div class="field-row">
                    <label for="registro-empresa">Empresa</label>
                    <input id="registro-empresa" name="empresa" type="text" value="{{ old('empresa') }}" minlength="2" maxlength="150" placeholder="Empresa o entidad" required />
                    @include('partials.registro-reglas', ['campo' => 'empresa'])
                    @error('empresa')<span class="form-error">{{ $message }}</span>@enderror
                  </div>
                  <div class="field-row">
                    <label for="registro-ruc">RUC</label>
                    <input id="registro-ruc" name="ruc" type="text" value="{{ old('ruc') }}" inputmode="numeric" maxlength="11" placeholder="11 dígitos" required />
                    <span class="form-note">Ej.: 20100070970.</span>
                    @include('partials.registro-reglas', ['campo' => 'ruc'])
                    @error('ruc')<span class="form-error">{{ $message }}</span>@enderror
                  </div>
                </div>
                <div class="field-row">
                  <label for="registro-cargo">Cargo</label>
                  <input id="registro-cargo" name="cargo" type="text" value="{{ old('cargo') }}" maxlength="150" placeholder="Cargo o función (opcional)" />
                  @include('partials.registro-reglas', ['campo' => 'cargo'])
                  @error('cargo')<span class="form-error">{{ $message }}</span>@enderror
                </div>
                <div class="field-row">
                  <label for="registro-rol">Rol solicitado</label>
                  <select id="registro-rol" name="rol_solicitado" required>
                    <option value="" selected disabled>Selecciona un rol</option>
                    @foreach ($roles as $rol)
                      <option value="{{ $rol->codigo }}" @selected(old('rol_solicitado') === $rol->codigo)>{{ $rol->nombre }}</option>
                    @endforeach
                  </select>
                  @include('partials.registro-reglas', ['campo' => 'rol_solicitado'])
                  @error('rol_solicitado')<span class="form-error">{{ $message }}</span>@enderror
                </div>
                <div class="field-row">
                  <label for="registro-motivo">Motivo de la solicitud</label>
                  <textarea id="registro-motivo" name="motivo" rows="4" minlength="10" maxlength="1000" placeholder="Cuéntanos para qué necesitas el acceso." required>{{ old('motivo') }}</textarea>
                  @include('partials.registro-reglas', ['campo' => 'motivo'])
                  @error('motivo')<span class="form-error">{{ $message }}</span>@enderror
                </div>
                <button class="button button-dark form-submit" type="submit">Enviar solicitud <span aria-hidden="true">↗</span></button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>

    @include('partials.site-footer', ['anchorPrefix' => '/'])
  </body>
</html>
