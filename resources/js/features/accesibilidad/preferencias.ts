/**
 * Preferencias de accesibilidad compartidas por la landing (vanilla) y el
 * panel (React). Se guardan en `localStorage` y se aplican como atributos en
 * `<html>`, igual que el tema. Sin dependencias de React para poder usarlas
 * también desde un entry suelto.
 */

export const CLAVE_ACCESIBILIDAD = 'cpm_accesibilidad';
export const EVENTO_ACCESIBILIDAD = 'cpm:accesibilidad';
export const EVENTO_VOZ = 'cpm:accesibilidad:voz';

export const ESCALAS_TEXTO = [100, 112, 125, 140] as const;
export const VELOCIDADES_VOZ = [0.85, 1, 1.2] as const;

export type EscalaTexto = (typeof ESCALAS_TEXTO)[number];
export type VelocidadVoz = (typeof VELOCIDADES_VOZ)[number];
export type EstadoVoz = 'inactivo' | 'leyendo' | 'pausado';

export interface PreferenciasAccesibilidad {
    contraste: boolean;
    escalaTexto: EscalaTexto;
    reducirMovimiento: boolean;
    subrayarEnlaces: boolean;
    velocidadVoz: VelocidadVoz;
    vozURI: string;
    soloSeleccion: boolean;
}

export interface VozDisponible {
    uri: string;
    nombre: string;
    idioma: string;
}

export interface OpcionesLectura {
    velocidad?: number;
    vozURI?: string;
    soloSeleccion?: boolean;
}

interface NodoTexto {
    nodo: Text;
    inicio: number;
    fin: number;
    bloque: Element | null;
}

interface SegmentoLectura {
    texto: string;
    inicio: number;
    fin: number;
    bloque: Element | null;
    rango: Range | null;
}

type PreferenciasParciales = Partial<PreferenciasAccesibilidad>;

interface RegistroHighlights {
    set: (nombre: string, resaltado: Highlight) => void;
    delete: (nombre: string) => void;
}

const SELECTOR_BLOQUE =
    'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dt, dd, label, legend';
const SELECTOR_IGNORAR =
    'script, style, noscript, template, svg, [hidden], [aria-hidden="true"], [data-a11y-ignorar]';

let estadoActualVoz: EstadoVoz = 'inactivo';
let segmentos: SegmentoLectura[] = [];
let indiceSegmento = -1;
let generacion = 0;
let velocidadActual = 1;
let vozActual = '';

function prefiereMenosMovimiento(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function preferenciasPorDefecto(): PreferenciasAccesibilidad {
    return {
        contraste: false,
        escalaTexto: 100,
        reducirMovimiento: prefiereMenosMovimiento(),
        subrayarEnlaces: false,
        velocidadVoz: 1,
        vozURI: '',
        soloSeleccion: false,
    };
}

function esEscalaValida(valor: unknown): valor is EscalaTexto {
    return ESCALAS_TEXTO.includes(valor as EscalaTexto);
}

function esVelocidadValida(valor: unknown): valor is VelocidadVoz {
    return VELOCIDADES_VOZ.includes(valor as VelocidadVoz);
}

function normalizar(datos: PreferenciasParciales): PreferenciasAccesibilidad {
    const base = preferenciasPorDefecto();

    return {
        contraste: datos.contraste === true,
        escalaTexto: esEscalaValida(datos.escalaTexto)
            ? datos.escalaTexto
            : base.escalaTexto,
        reducirMovimiento:
            typeof datos.reducirMovimiento === 'boolean'
                ? datos.reducirMovimiento
                : base.reducirMovimiento,
        subrayarEnlaces: datos.subrayarEnlaces === true,
        velocidadVoz: esVelocidadValida(datos.velocidadVoz)
            ? datos.velocidadVoz
            : base.velocidadVoz,
        vozURI: typeof datos.vozURI === 'string' ? datos.vozURI : '',
        soloSeleccion:
            typeof datos.soloSeleccion === 'boolean'
                ? datos.soloSeleccion
                : base.soloSeleccion,
    };
}

export function leerPreferencias(): PreferenciasAccesibilidad {
    if (typeof window === 'undefined') {
        return preferenciasPorDefecto();
    }

    try {
        const crudo = window.localStorage.getItem(CLAVE_ACCESIBILIDAD);

        if (!crudo) {
            return preferenciasPorDefecto();
        }

        return normalizar(JSON.parse(crudo) as PreferenciasParciales);
    } catch {
        return preferenciasPorDefecto();
    }
}

function alternarAtributo(
    raiz: HTMLElement,
    nombre: string,
    valor: string,
    activo: boolean,
): void {
    if (activo) {
        raiz.setAttribute(nombre, valor);
    } else {
        raiz.removeAttribute(nombre);
    }
}

export function aplicarPreferencias(
    preferencias: PreferenciasAccesibilidad,
): void {
    if (typeof document === 'undefined') {
        return;
    }

    const raiz = document.documentElement;

    alternarAtributo(
        raiz,
        'data-a11y-contraste',
        'alto',
        preferencias.contraste,
    );
    alternarAtributo(
        raiz,
        'data-a11y-enlaces',
        'subrayados',
        preferencias.subrayarEnlaces,
    );
    alternarAtributo(
        raiz,
        'data-a11y-movimiento',
        'reducido',
        preferencias.reducirMovimiento,
    );
    raiz.setAttribute('data-a11y-escala', String(preferencias.escalaTexto));
}

export function aplicarPreferenciasGuardadas(): PreferenciasAccesibilidad {
    const preferencias = leerPreferencias();
    aplicarPreferencias(preferencias);

    return preferencias;
}

export function guardarPreferencias(
    preferencias: PreferenciasAccesibilidad,
): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(
                CLAVE_ACCESIBILIDAD,
                JSON.stringify(preferencias),
            );
        } catch {
            // El navegador puede bloquear el almacenamiento; los ajustes
            // siguen aplicados durante esta sesión.
        }
    }

    aplicarPreferencias(preferencias);

    if (typeof document !== 'undefined') {
        document.dispatchEvent(
            new CustomEvent<PreferenciasAccesibilidad>(EVENTO_ACCESIBILIDAD, {
                detail: preferencias,
            }),
        );
    }
}

export function soportaVoz(): boolean {
    return (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance === 'function'
    );
}

export function estadoVoz(): EstadoVoz {
    return estadoActualVoz;
}

function emitirEstadoVoz(): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.dispatchEvent(
        new CustomEvent<EstadoVoz>(EVENTO_VOZ, { detail: estadoActualVoz }),
    );
}

function cambiarEstadoVoz(estado: EstadoVoz): void {
    estadoActualVoz = estado;
    emitirEstadoVoz();
}

function contenedorDeLectura(): HTMLElement {
    return (
        document.querySelector<HTMLElement>('[data-a11y-lectura]') ??
        document.querySelector<HTMLElement>('main') ??
        document.body
    );
}

function bloqueDe(nodo: Node, contenedor: HTMLElement): Element | null {
    const padre = nodo instanceof Element ? nodo : (nodo.parentElement ?? null);

    return padre?.closest(SELECTOR_BLOQUE) ?? padre ?? contenedor;
}

function nodoVisible(nodo: Text): boolean {
    const padre = nodo.parentElement;

    if (!padre || !nodo.nodeValue?.trim()) {
        return false;
    }

    if (padre.closest(SELECTOR_IGNORAR)) {
        return false;
    }

    const estilo = window.getComputedStyle(padre);

    return estilo.display !== 'none' && estilo.visibility !== 'hidden';
}

function ubicar(
    indice: number,
    nodos: NodoTexto[],
): { nodo: Text; offset: number } | null {
    for (const item of nodos) {
        if (indice >= item.inicio && indice <= item.fin) {
            return {
                nodo: item.nodo,
                offset: Math.max(
                    0,
                    Math.min(item.fin - item.inicio, indice - item.inicio),
                ),
            };
        }
    }

    const siguiente = nodos.find((item) => item.inicio >= indice);

    if (siguiente) {
        return { nodo: siguiente.nodo, offset: 0 };
    }

    const ultimo = nodos[nodos.length - 1];

    return ultimo
        ? { nodo: ultimo.nodo, offset: ultimo.fin - ultimo.inicio }
        : null;
}

function bloqueEn(indice: number, nodos: NodoTexto[]): Element | null {
    const ubicado = nodos.find(
        (item) => indice >= item.inicio && indice <= item.fin,
    );

    return ubicado?.bloque ?? null;
}

function crearRango(
    inicio: number,
    fin: number,
    nodos: NodoTexto[],
): Range | null {
    const desde = ubicar(inicio, nodos);
    const hasta = ubicar(fin, nodos);

    if (!desde || !hasta) {
        return null;
    }

    try {
        const rango = document.createRange();

        rango.setStart(desde.nodo, desde.offset);
        rango.setEnd(hasta.nodo, hasta.offset);

        return rango;
    } catch {
        return null;
    }
}

function dividirEnFrases(
    texto: string,
): { texto: string; inicio: number; fin: number }[] {
    const frases: { texto: string; inicio: number; fin: number }[] = [];
    const divisor = /[^.!?…\n]+[.!?…]+|[^.!?…\n]+/g;
    let coincidencia: RegExpExecArray | null;

    while ((coincidencia = divisor.exec(texto)) !== null) {
        const bruto = coincidencia[0];
        const recorte = bruto.length - bruto.trimStart().length;
        const inicio = coincidencia.index + recorte;
        const fin = coincidencia.index + bruto.trimEnd().length;
        const contenido = texto.slice(inicio, fin).replace(/\s+/g, ' ').trim();

        if (contenido) {
            frases.push({ texto: contenido, inicio, fin });
        }
    }

    return frases;
}

function segmentosDePagina(): SegmentoLectura[] {
    if (typeof document === 'undefined') {
        return [];
    }

    const contenedor = contenedorDeLectura();
    const nodos: NodoTexto[] = [];
    const segmentosPagina: SegmentoLectura[] = [];
    let texto = '';
    let bloqueAnterior: Element | null = null;

    const recorrido = document.createTreeWalker(
        contenedor,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(nodo) {
                return nodoVisible(nodo as Text)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            },
        },
    );

    let nodo = recorrido.nextNode();

    while (nodo) {
        const valor = nodo.nodeValue ?? '';
        const bloque = bloqueDe(nodo, contenedor);

        if (texto && bloque !== bloqueAnterior) {
            texto += '\n';
        }

        const inicio = texto.length;

        texto += valor;
        nodos.push({
            nodo: nodo as Text,
            inicio,
            fin: inicio + valor.length,
            bloque,
        });
        bloqueAnterior = bloque;
        nodo = recorrido.nextNode();
    }

    for (const frase of dividirEnFrases(texto)) {
        segmentosPagina.push({
            texto: frase.texto,
            inicio: frase.inicio,
            fin: frase.fin,
            bloque: bloqueEn(frase.inicio, nodos),
            rango: crearRango(frase.inicio, frase.fin, nodos),
        });
    }

    return segmentosPagina;
}

function segmentosDeTexto(texto: string): SegmentoLectura[] {
    return dividirEnFrases(texto).map((frase) => ({
        texto: frase.texto,
        inicio: frase.inicio,
        fin: frase.fin,
        bloque: null,
        rango: null,
    }));
}

export function textoSeleccionado(): string {
    if (typeof window === 'undefined' || !window.getSelection) {
        return '';
    }

    return window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';
}

export function vocesDisponibles(): VozDisponible[] {
    if (!soportaVoz()) {
        return [];
    }

    return window.speechSynthesis
        .getVoices()
        .filter((voz) => voz.lang.toLowerCase().startsWith('es'))
        .map((voz) => ({
            uri: voz.voiceURI,
            nombre: voz.name,
            idioma: voz.lang,
        }));
}

function buscarVoz(uri: string): SpeechSynthesisVoice | null {
    const voces = window.speechSynthesis.getVoices();
    const normalizada = (voz: SpeechSynthesisVoice): string =>
        voz.lang.toLowerCase().replace('_', '-');

    if (uri) {
        const guardada = voces.find((voz) => voz.voiceURI === uri);

        if (guardada) {
            return guardada;
        }
    }

    const enEspanol = voces.filter((voz) =>
        voz.lang.toLowerCase().startsWith('es'),
    );

    return (
        enEspanol.find((voz) => normalizada(voz) === 'es-pe') ??
        enEspanol[0] ??
        null
    );
}

function registrarResaltado(segmento: SegmentoLectura): void {
    if (
        !segmento.rango ||
        typeof CSS === 'undefined' ||
        typeof Highlight === 'undefined'
    ) {
        return;
    }

    const registro = (CSS as unknown as { highlights?: RegistroHighlights })
        .highlights;

    if (!registro) {
        return;
    }

    registro.set('cpm-lectura', new Highlight(segmento.rango));

    const rect = segmento.rango.getBoundingClientRect();

    if (
        rect.height > 0 &&
        (rect.top < 72 || rect.bottom > window.innerHeight - 88)
    ) {
        segmento.rango.startContainer.parentElement?.scrollIntoView({
            block: 'center',
            behavior: 'auto',
        });
    }
}

function limpiarResaltado(): void {
    if (typeof CSS === 'undefined') {
        return;
    }

    (CSS as unknown as { highlights?: RegistroHighlights }).highlights?.delete(
        'cpm-lectura',
    );
}

function finalizarLectura(): void {
    limpiarResaltado();
    segmentos = [];
    indiceSegmento = -1;
    cambiarEstadoVoz('inactivo');
}

function hablarSegmento(token: number): void {
    if (token !== generacion || !soportaVoz()) {
        return;
    }

    if (indiceSegmento < 0 || indiceSegmento >= segmentos.length) {
        finalizarLectura();

        return;
    }

    const segmento = segmentos[indiceSegmento];

    registrarResaltado(segmento);

    const locucion = new SpeechSynthesisUtterance(segmento.texto);
    const voz = buscarVoz(vozActual);

    locucion.lang = 'es-PE';
    locucion.rate = velocidadActual;
    locucion.pitch = 1;

    if (voz) {
        locucion.voice = voz;
    }

    locucion.onend = (): void => {
        if (token !== generacion) {
            return;
        }

        indiceSegmento += 1;
        window.setTimeout(() => hablarSegmento(token), 40);
    };

    locucion.onerror = (): void => {
        if (token !== generacion) {
            return;
        }

        finalizarLectura();
    };

    window.speechSynthesis.speak(locucion);
}

function cancelarLocucion(): void {
    generacion += 1;

    if (soportaVoz()) {
        window.speechSynthesis.cancel();
    }

    limpiarResaltado();
}

export function leerPagina(opciones: OpcionesLectura = {}): boolean {
    if (!soportaVoz()) {
        return false;
    }

    const seleccion = textoSeleccionado();
    const usaSeleccion = opciones.soloSeleccion === true;

    if (usaSeleccion && !seleccion) {
        return false;
    }

    const lista = usaSeleccion
        ? segmentosDeTexto(seleccion)
        : segmentosDePagina();

    if (lista.length === 0) {
        return false;
    }

    cancelarLocucion();
    segmentos = lista;
    indiceSegmento = 0;
    velocidadActual = opciones.velocidad ?? 1;
    vozActual = opciones.vozURI ?? '';
    cambiarEstadoVoz('leyendo');
    hablarSegmento(generacion);

    return true;
}

export function pausarLectura(): void {
    if (!soportaVoz() || estadoActualVoz !== 'leyendo') {
        return;
    }

    window.speechSynthesis.pause();
    cambiarEstadoVoz('pausado');
}

export function reanudarLectura(): void {
    if (!soportaVoz() || estadoActualVoz !== 'pausado') {
        return;
    }

    window.speechSynthesis.resume();
    cambiarEstadoVoz('leyendo');
}

export function detenerLectura(): void {
    cancelarLocucion();
    segmentos = [];
    indiceSegmento = -1;

    if (estadoActualVoz !== 'inactivo') {
        cambiarEstadoVoz('inactivo');
    }
}

export function siguienteParrafo(): void {
    if (!soportaVoz() || estadoActualVoz === 'inactivo') {
        return;
    }

    const actual = segmentos[indiceSegmento];

    if (!actual) {
        return;
    }

    let siguiente = indiceSegmento + 1;

    while (
        siguiente < segmentos.length &&
        segmentos[siguiente]?.bloque === actual.bloque
    ) {
        siguiente += 1;
    }

    if (siguiente >= segmentos.length) {
        detenerLectura();

        return;
    }

    cancelarLocucion();
    indiceSegmento = siguiente;
    cambiarEstadoVoz('leyendo');
    hablarSegmento(generacion);
}

function etiquetaDeControl(elemento: HTMLElement): string {
    const explicita = elemento.getAttribute('aria-label');

    if (explicita) {
        return explicita;
    }

    if (elemento instanceof HTMLSelectElement) {
        const etiqueta =
            elemento.closest('label')?.textContent?.trim() ??
            elemento.getAttribute('title') ??
            'Seleccionar';
        const opcion = elemento.options[elemento.selectedIndex]?.text ?? '';

        return `${etiqueta.replace(/\s+/g, ' ')}: ${opcion}`;
    }

    const texto = elemento.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    return texto || elemento.getAttribute('title') || '';
}

function describirControl(elemento: HTMLElement): string {
    const base = etiquetaDeControl(elemento);

    if (elemento.getAttribute('role') === 'switch') {
        const activo = elemento.getAttribute('aria-checked') === 'true';

        return `${base}, ${activo ? 'activado' : 'desactivado'}`;
    }

    return base;
}

let silencioEtiquetasHasta = 0;

/**
 * Evita que un foco programático (al abrir o cerrar el panel) dispare la
 * lectura de la etiqueta del control.
 */
export function silenciarEtiquetas(ms: number = 600): void {
    silencioEtiquetasHasta = performance.now() + ms;
}

/**
 * Lee la etiqueta de cada control del widget al navegar con `Tab`. Se ignora
 * cualquier foco que no venga de una pulsación de teclado (clicks, foco
 * restaurado al volver a la pestaña, apertura/cierre del panel).
 */
export function instalarLecturaEtiquetas(contenedor: HTMLElement): () => void {
    let temporizador: number | undefined;
    let navegandoTeclado = false;
    let ultimaTecla = 0;

    const cancelar = (): void => {
        if (temporizador !== undefined) {
            window.clearTimeout(temporizador);
            temporizador = undefined;
        }
    };

    const alTeclear = (evento: KeyboardEvent): void => {
        if (evento.key !== 'Tab') {
            return;
        }

        navegandoTeclado = true;
        ultimaTecla = performance.now();
    };

    const alEnfocar = (evento: FocusEvent): void => {
        if (
            !navegandoTeclado ||
            performance.now() - ultimaTecla > 1500 ||
            performance.now() < silencioEtiquetasHasta
        ) {
            return;
        }

        const objetivo =
            evento.target instanceof Element
                ? evento.target.closest<HTMLElement>(
                      'button, a, select, input, textarea, [role="switch"]',
                  )
                : null;

        if (!objetivo || !contenedor.contains(objetivo)) {
            return;
        }

        navegandoTeclado = false;
        cancelar();

        temporizador = window.setTimeout(() => {
            const texto = describirControl(objetivo);

            if (texto) {
                hablarEtiqueta(texto);
            }
        }, 180);
    };

    const alPulsar = (): void => {
        navegandoTeclado = false;
        silencioEtiquetasHasta = performance.now() + 600;
        cancelar();
    };

    const alSalir = (): void => {
        navegandoTeclado = false;
        cancelar();
    };

    const alCambiarVisibilidad = (): void => {
        if (document.visibilityState === 'hidden') {
            alSalir();
        }
    };

    contenedor.addEventListener('keydown', alTeclear, true);
    contenedor.addEventListener('focusin', alEnfocar);
    contenedor.addEventListener('pointerdown', alPulsar, true);
    window.addEventListener('blur', alSalir);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
        cancelar();
        contenedor.removeEventListener('keydown', alTeclear, true);
        contenedor.removeEventListener('focusin', alEnfocar);
        contenedor.removeEventListener('pointerdown', alPulsar, true);
        window.removeEventListener('blur', alSalir);
        document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
}

export function hablarEtiqueta(texto: string): void {
    if (!soportaVoz() || !texto.trim()) {
        return;
    }

    detenerLectura();

    const locucion = new SpeechSynthesisUtterance(texto.trim());
    const voz = buscarVoz('');

    locucion.lang = 'es-PE';
    locucion.rate = 1.05;
    locucion.pitch = 1;

    if (voz) {
        locucion.voice = voz;
    }

    window.speechSynthesis.speak(locucion);
}

let pausadoPorVisibilidad = false;

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!soportaVoz()) {
            return;
        }

        if (document.visibilityState === 'hidden') {
            if (estadoActualVoz === 'leyendo') {
                pausadoPorVisibilidad = true;
                window.speechSynthesis.pause();
            }

            return;
        }

        if (pausadoPorVisibilidad) {
            pausadoPorVisibilidad = false;

            if (estadoActualVoz === 'leyendo') {
                window.speechSynthesis.resume();
            }
        }
    });
}

let temporizadorSeleccion: number | undefined;
let ultimaSeleccionLeida = '';

function seleccionDentroDelWidget(seleccion: Selection): boolean {
    const nodo = seleccion.anchorNode;
    const elemento =
        nodo instanceof Element ? nodo : (nodo?.parentElement ?? null);

    return Boolean(
        elemento?.closest('[data-a11y-ignorar], .a11y, [role="dialog"]'),
    );
}

function programarLecturaSeleccion(): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (temporizadorSeleccion !== undefined) {
        window.clearTimeout(temporizadorSeleccion);
    }

    temporizadorSeleccion = window.setTimeout(() => {
        temporizadorSeleccion = undefined;

        const preferencias = leerPreferencias();

        if (
            !preferencias.soloSeleccion ||
            document.visibilityState === 'hidden'
        ) {
            return;
        }

        const seleccion = window.getSelection();

        if (!seleccion || seleccion.isCollapsed) {
            ultimaSeleccionLeida = '';

            return;
        }

        if (seleccionDentroDelWidget(seleccion)) {
            return;
        }

        const texto = seleccion.toString().replace(/\s+/g, ' ').trim();

        if (texto.length < 2 || texto === ultimaSeleccionLeida) {
            return;
        }

        ultimaSeleccionLeida = texto;
        leerPagina({
            velocidad: preferencias.velocidadVoz,
            vozURI: preferencias.vozURI,
            soloSeleccion: true,
        });
    }, 650);
}

if (typeof document !== 'undefined') {
    document.addEventListener('selectionchange', programarLecturaSeleccion);
}
