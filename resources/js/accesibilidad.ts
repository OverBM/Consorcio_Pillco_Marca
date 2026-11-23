import {
    ESCALAS_TEXTO,
    EVENTO_ACCESIBILIDAD,
    EVENTO_VOZ,
    detenerLectura,
    estadoVoz,
    guardarPreferencias,
    instalarLecturaEtiquetas,
    leerPagina,
    leerPreferencias,
    pausarLectura,
    preferenciasPorDefecto,
    reanudarLectura,
    silenciarEtiquetas,
    siguienteParrafo,
    soportaVoz,
    vocesDisponibles,
    type EstadoVoz,
    type VelocidadVoz,
} from './features/accesibilidad/preferencias';

const PLANTILLA = `
<button class="a11y-launcher" type="button" data-a11y-launcher aria-label="Accesibilidad" title="Accesibilidad" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-panel">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="4.5" r="2" />
    <path d="M4.5 9h15M12 6.5V13M8.5 21 12 13l3.5 8" />
  </svg>
</button>
<div class="a11y-panel" id="a11y-panel" data-a11y-panel role="dialog" aria-label="Accesibilidad" tabindex="-1" hidden>
  <div class="a11y-head">
    <div>
      <p class="a11y-kicker">Accesibilidad</p>
      <p class="a11y-title">Ajusta la página a tu medida</p>
    </div>
    <button class="a11y-close" type="button" data-a11y-cerrar aria-label="Cerrar accesibilidad">×</button>
  </div>

  <div class="a11y-read">
    <div class="a11y-row-head">
      <span>Lectura por voz</span>
      <span class="a11y-tag" data-a11y-soporte>ES</span>
    </div>
    <button class="a11y-primary" type="button" data-a11y-leer>Leer la página</button>
    <div class="a11y-inline" data-a11y-controles hidden>
      <button type="button" data-a11y-pausar>Pausar</button>
      <button type="button" data-a11y-detener>Detener</button>
    </div>
    <div class="a11y-inline" data-a11y-parrafos hidden>
      <button type="button" data-a11y-siguiente>Párrafo siguiente</button>
    </div>
    <p class="a11y-status" data-a11y-estado aria-live="polite">Escucha el contenido de esta página.</p>
    <label class="a11y-field" for="a11y-velocidad">
      <span>Velocidad</span>
      <select id="a11y-velocidad" data-a11y-velocidad aria-label="Velocidad de lectura">
        <option value="0.85">Lenta</option>
        <option value="1">Normal</option>
        <option value="1.2">Rápida</option>
      </select>
    </label>
    <label class="a11y-field" for="a11y-voz">
      <span>Voz</span>
      <select id="a11y-voz" data-a11y-voz aria-label="Voz de lectura">
        <option value="">Voz del sistema</option>
      </select>
    </label>
  </div>

  <div class="a11y-group">
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-solo>
      <span>Leer solo lo seleccionado</span><i aria-hidden="true"></i>
    </button>
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-contraste>
      <span>Alto contraste</span><i aria-hidden="true"></i>
    </button>
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-enlaces>
      <span>Subrayar enlaces</span><i aria-hidden="true"></i>
    </button>
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-movimiento>
      <span>Reducir movimiento</span><i aria-hidden="true"></i>
    </button>
  </div>

  <div class="a11y-size">
    <div class="a11y-row-head">
      <span>Tamaño del texto</span>
    </div>
    <div class="a11y-size-buttons">
      <button type="button" data-a11y-escala-opcion="100" aria-pressed="true" aria-label="Tamaño de texto 100 por ciento">100%</button>
      <button type="button" data-a11y-escala-opcion="112" aria-pressed="false" aria-label="Tamaño de texto 112 por ciento">112%</button>
      <button type="button" data-a11y-escala-opcion="125" aria-pressed="false" aria-label="Tamaño de texto 125 por ciento">125%</button>
      <button type="button" data-a11y-escala-opcion="140" aria-pressed="false" aria-label="Tamaño de texto 140 por ciento">140%</button>
    </div>
  </div>

  <button class="a11y-reset" type="button" data-a11y-reset>Restablecer ajustes</button>
  <p class="a11y-note">Con “Leer solo lo seleccionado”, al seleccionar texto se lee automáticamente. Los ajustes se guardan en este navegador.</p>
</div>
<div class="a11y-toast" data-a11y-toast role="status" aria-live="polite" hidden>
  <span aria-hidden="true">✓</span> Ajustes restablecidos.
</div>
`;

function montarAccesibilidad(): void {
    if (document.querySelector('.a11y')) {
        return;
    }

    const contenedor = document.createElement('div');

    contenedor.className = 'a11y';
    contenedor.setAttribute('data-a11y-ignorar', '');
    contenedor.innerHTML = PLANTILLA;
    document.body.append(contenedor);

    const buscar = <T extends HTMLElement>(selector: string): T => {
        const elemento = contenedor.querySelector<T>(selector);

        if (!elemento) {
            throw new Error(`Falta el elemento ${selector} de accesibilidad`);
        }

        return elemento;
    };

    const lanzador = buscar<HTMLButtonElement>('[data-a11y-launcher]');
    const panel = buscar<HTMLElement>('[data-a11y-panel]');
    const cerrar = buscar<HTMLButtonElement>('[data-a11y-cerrar]');
    const leer = buscar<HTMLButtonElement>('[data-a11y-leer]');
    const pausar = buscar<HTMLButtonElement>('[data-a11y-pausar]');
    const detener = buscar<HTMLButtonElement>('[data-a11y-detener]');
    const siguiente = buscar<HTMLButtonElement>('[data-a11y-siguiente]');
    const estadoTexto = buscar<HTMLElement>('[data-a11y-estado]');
    const soporte = buscar<HTMLElement>('[data-a11y-soporte]');
    const velocidad = buscar<HTMLSelectElement>('[data-a11y-velocidad]');
    const vozSelect = buscar<HTMLSelectElement>('[data-a11y-voz]');
    const controles = buscar<HTMLElement>('[data-a11y-controles]');
    const parrafos = buscar<HTMLElement>('[data-a11y-parrafos]');
    const solo = buscar<HTMLButtonElement>('[data-a11y-solo]');
    const contraste = buscar<HTMLButtonElement>('[data-a11y-contraste]');
    const enlaces = buscar<HTMLButtonElement>('[data-a11y-enlaces]');
    const movimiento = buscar<HTMLButtonElement>('[data-a11y-movimiento]');
    const opcionesEscala = Array.from(
        contenedor.querySelectorAll<HTMLButtonElement>(
            '[data-a11y-escala-opcion]',
        ),
    );
    const restablecer = buscar<HTMLButtonElement>('[data-a11y-reset]');
    const toast = buscar<HTMLElement>('[data-a11y-toast]');

    let abierto = false;
    let aviso: string | null = null;
    let temporizadorToast: number | undefined;

    const pintarApertura = (): void => {
        panel.hidden = !abierto;
        lanzador.setAttribute('aria-expanded', String(abierto));
    };

    const abrir = (): void => {
        abierto = true;
        pintarApertura();
        panel.focus({ preventScroll: true });
    };

    const cerrarPanel = (): void => {
        abierto = false;
        pintarApertura();
        silenciarEtiquetas();
        lanzador.focus({ preventScroll: true });
    };

    const marcar = (boton: HTMLButtonElement, activo: boolean): void => {
        boton.setAttribute('aria-checked', String(activo));
    };

    const actualizarVoz = (
        parcial: Partial<ReturnType<typeof leerPreferencias>>,
    ): void => {
        if (estadoVoz() !== 'inactivo') {
            detenerLectura();
        }

        guardarPreferencias({ ...leerPreferencias(), ...parcial });
    };

    const pintarVoz = (estado: EstadoVoz): void => {
        const activa = estado !== 'inactivo';
        const preferencias = leerPreferencias();

        controles.hidden = !activa;
        parrafos.hidden = !activa || preferencias.soloSeleccion;
        leer.disabled = !soportaVoz();
        soporte.textContent = soportaVoz() ? 'ES' : 'No disponible';
        leer.textContent = activa
            ? 'Detener lectura'
            : preferencias.soloSeleccion
              ? 'Leer selección'
              : 'Leer la página';
        pausar.textContent = estado === 'pausado' ? 'Reanudar' : 'Pausar';
        estadoTexto.textContent = !soportaVoz()
            ? 'Este navegador no puede leer en voz alta.'
            : aviso
              ? aviso
              : estado === 'leyendo'
                ? 'Leyendo la página…'
                : estado === 'pausado'
                  ? 'Lectura en pausa.'
                  : preferencias.soloSeleccion
                    ? 'Selecciona un texto y pulsa Leer selección.'
                    : 'Escucha el contenido de esta página.';
    };

    const pintar = (): void => {
        const preferencias = leerPreferencias();

        marcar(solo, preferencias.soloSeleccion);
        marcar(contraste, preferencias.contraste);
        marcar(enlaces, preferencias.subrayarEnlaces);
        marcar(movimiento, preferencias.reducirMovimiento);
        opcionesEscala.forEach((boton) => {
            const activo =
                Number(boton.dataset.a11yEscalaOpcion) ===
                preferencias.escalaTexto;

            boton.classList.toggle('is-active', activo);
            boton.setAttribute('aria-pressed', String(activo));
        });
        velocidad.value = String(preferencias.velocidadVoz);
        vozSelect.value = preferencias.vozURI;
        pintarVoz(estadoVoz());
    };

    const actualizarVoces = (): void => {
        const preferencias = leerPreferencias();
        const disponibles = vocesDisponibles();

        vozSelect.replaceChildren();

        const sistema = document.createElement('option');

        sistema.value = '';
        sistema.textContent = 'Voz del sistema';
        vozSelect.append(sistema);

        for (const voz of disponibles) {
            const opcion = document.createElement('option');

            opcion.value = voz.uri;
            opcion.textContent = `${voz.nombre} (${voz.idioma})`;
            vozSelect.append(opcion);
        }

        vozSelect.value = preferencias.vozURI;
    };

    lanzador.addEventListener('click', () => {
        if (abierto) {
            cerrarPanel();
        } else {
            abrir();
        }
    });

    cerrar.addEventListener('click', cerrarPanel);

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && abierto) {
            cerrarPanel();
        }
    });

    document.addEventListener('pointerdown', (evento) => {
        if (
            abierto &&
            evento.target instanceof Node &&
            !contenedor.contains(evento.target)
        ) {
            abierto = false;
            pintarApertura();
        }
    });

    solo.addEventListener('click', () => {
        const preferencias = leerPreferencias();

        aviso = null;
        actualizarVoz({
            soloSeleccion: !preferencias.soloSeleccion,
        });
    });

    contraste.addEventListener('click', () => {
        const preferencias = leerPreferencias();

        guardarPreferencias({
            ...preferencias,
            contraste: !preferencias.contraste,
        });
    });

    enlaces.addEventListener('click', () => {
        const preferencias = leerPreferencias();

        guardarPreferencias({
            ...preferencias,
            subrayarEnlaces: !preferencias.subrayarEnlaces,
        });
    });

    movimiento.addEventListener('click', () => {
        const preferencias = leerPreferencias();

        guardarPreferencias({
            ...preferencias,
            reducirMovimiento: !preferencias.reducirMovimiento,
        });
    });

    opcionesEscala.forEach((boton) => {
        boton.addEventListener('click', () => {
            const valor = Number(boton.dataset.a11yEscalaOpcion);

            if (
                !ESCALAS_TEXTO.includes(valor as (typeof ESCALAS_TEXTO)[number])
            ) {
                return;
            }

            guardarPreferencias({
                ...leerPreferencias(),
                escalaTexto: valor as (typeof ESCALAS_TEXTO)[number],
            });
        });
    });

    restablecer.addEventListener('click', () => {
        aviso = null;
        detenerLectura();
        guardarPreferencias(preferenciasPorDefecto());
        actualizarVoces();

        toast.hidden = false;

        if (temporizadorToast !== undefined) {
            window.clearTimeout(temporizadorToast);
        }

        temporizadorToast = window.setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    });

    velocidad.addEventListener('change', () => {
        actualizarVoz({
            velocidadVoz: Number(velocidad.value) as VelocidadVoz,
        });
    });

    vozSelect.addEventListener('change', () => {
        actualizarVoz({ vozURI: vozSelect.value });
    });

    leer.addEventListener('pointerdown', (evento) => evento.preventDefault());

    leer.addEventListener('click', () => {
        const preferencias = leerPreferencias();

        if (estadoVoz() !== 'inactivo') {
            detenerLectura();

            return;
        }

        aviso = null;

        const inicio = leerPagina({
            velocidad: preferencias.velocidadVoz,
            vozURI: preferencias.vozURI,
            soloSeleccion: preferencias.soloSeleccion,
        });

        if (!inicio && preferencias.soloSeleccion) {
            aviso = 'Selecciona un texto en la página y vuelve a intentarlo.';
            pintarVoz(estadoVoz());
        }
    });

    pausar.addEventListener('click', () => {
        if (estadoVoz() === 'pausado') {
            reanudarLectura();
        } else {
            pausarLectura();
        }
    });

    detener.addEventListener('click', () => {
        detenerLectura();
    });

    siguiente.addEventListener('click', () => {
        aviso = null;
        siguienteParrafo();
    });

    document.addEventListener(EVENTO_ACCESIBILIDAD, () => {
        pintar();

        if (leerPreferencias().reducirMovimiento) {
            document
                .querySelectorAll<HTMLVideoElement>('video')
                .forEach((video) => video.pause());
        }
    });

    document.addEventListener(EVENTO_VOZ, () => {
        aviso = null;
        pintarVoz(estadoVoz());
    });

    if (
        soportaVoz() &&
        typeof window.speechSynthesis.addEventListener === 'function'
    ) {
        window.speechSynthesis.addEventListener(
            'voiceschanged',
            actualizarVoces,
        );
    }

    instalarLecturaEtiquetas(contenedor);
    actualizarVoces();
    pintarApertura();
    pintar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarAccesibilidad, {
        once: true,
    });
} else {
    montarAccesibilidad();
}
