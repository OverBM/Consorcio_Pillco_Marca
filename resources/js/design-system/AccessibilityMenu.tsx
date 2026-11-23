import { useCallback, useEffect, useRef, useState } from 'react';

import { useNotificationsOpcional } from '../components/notifications/NotificationProvider';
import {
    ESCALAS_TEXTO,
    EVENTO_ACCESIBILIDAD,
    EVENTO_VOZ,
    VELOCIDADES_VOZ,
    aplicarPreferenciasGuardadas,
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
    type PreferenciasAccesibilidad,
    type VozDisponible,
} from '../features/accesibilidad/preferencias';

interface AccessibilityMenuProps {
    buttonClassName: string;
}

function FilaInterruptor({
    etiqueta,
    activo,
    onCambio,
}: {
    etiqueta: string;
    activo: boolean;
    onCambio: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={activo}
            onClick={onCambio}
            className="text-ink hover:bg-soft flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-xs font-medium"
        >
            <span>{etiqueta}</span>
            <span
                aria-hidden="true"
                className={`border-line relative h-4 w-7 shrink-0 rounded-full border transition-colors ${
                    activo ? 'bg-ink border-ink' : 'bg-soft'
                }`}
            >
                <span
                    className={`absolute top-[1px] left-[1px] h-3 w-3 rounded-full transition-transform ${
                        activo
                            ? 'bg-mint translate-x-3'
                            : 'bg-muted translate-x-0'
                    }`}
                />
            </span>
        </button>
    );
}

/**
 * Botón y panel de accesibilidad del panel interno. Reemplaza al antiguo
 * botón de ayuda del riel: lectura por voz navegable, contraste, tamaño de
 * texto, enlaces subrayados y movimiento reducido.
 */
export function AccessibilityMenu({ buttonClassName }: AccessibilityMenuProps) {
    const [abierto, setAbierto] = useState(false);
    const [preferencias, setPreferencias] = useState<PreferenciasAccesibilidad>(
        () => leerPreferencias(),
    );
    const [voz, setVoz] = useState<EstadoVoz>(() => estadoVoz());
    const [voces, setVoces] = useState<VozDisponible[]>(() =>
        vocesDisponibles(),
    );
    const [aviso, setAviso] = useState<string | null>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const disparador = useRef<HTMLButtonElement>(null);
    const notificar = useNotificationsOpcional();

    useEffect(() => {
        aplicarPreferenciasGuardadas();
    }, []);

    useEffect(() => {
        const sincronizarPreferencias = (): void => {
            setPreferencias(leerPreferencias());
        };
        const sincronizarVoz = (): void => {
            setVoz(estadoVoz());
            setAviso(null);
        };

        document.addEventListener(
            EVENTO_ACCESIBILIDAD,
            sincronizarPreferencias,
        );
        document.addEventListener(EVENTO_VOZ, sincronizarVoz);

        return () => {
            document.removeEventListener(
                EVENTO_ACCESIBILIDAD,
                sincronizarPreferencias,
            );
            document.removeEventListener(EVENTO_VOZ, sincronizarVoz);
        };
    }, []);

    useEffect(() => {
        if (!soportaVoz()) {
            return;
        }

        const actualizarVoces = (): void => {
            setVoces(vocesDisponibles());
        };

        actualizarVoces();

        if (typeof window.speechSynthesis.addEventListener !== 'function') {
            return;
        }

        window.speechSynthesis.addEventListener(
            'voiceschanged',
            actualizarVoces,
        );

        return () => {
            window.speechSynthesis.removeEventListener(
                'voiceschanged',
                actualizarVoces,
            );
        };
    }, []);

    const cerrar = useCallback((): void => {
        setAbierto(false);
        silenciarEtiquetas();
        disparador.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        if (!abierto) {
            return;
        }

        const alTeclear = (evento: KeyboardEvent): void => {
            if (evento.key === 'Escape') {
                cerrar();
            }
        };

        window.addEventListener('keydown', alTeclear);

        return () => window.removeEventListener('keydown', alTeclear);
    }, [abierto, cerrar]);

    useEffect(() => {
        if (!abierto) {
            return;
        }

        const alPulsarFuera = (evento: PointerEvent): void => {
            if (
                evento.target instanceof Node &&
                !contenedor.current?.contains(evento.target)
            ) {
                cerrar();
            }
        };

        document.addEventListener('pointerdown', alPulsarFuera, true);

        return () =>
            document.removeEventListener('pointerdown', alPulsarFuera, true);
    }, [abierto, cerrar]);

    useEffect(() => {
        if (!abierto) {
            return;
        }

        panelRef.current?.focus({ preventScroll: true });
    }, [abierto]);

    useEffect(() => {
        if (!abierto || !contenedor.current) {
            return;
        }

        return instalarLecturaEtiquetas(contenedor.current);
    }, [abierto]);

    const actualizar = (parcial: Partial<PreferenciasAccesibilidad>): void => {
        const siguientes = { ...preferencias, ...parcial };

        setPreferencias(siguientes);
        guardarPreferencias(siguientes);
    };

    const actualizarVoz = (
        parcial: Partial<PreferenciasAccesibilidad>,
    ): void => {
        if (voz !== 'inactivo') {
            detenerLectura();
        }

        actualizar(parcial);
    };

    const alternarLectura = (): void => {
        if (voz !== 'inactivo') {
            detenerLectura();

            return;
        }

        const inicio = leerPagina({
            velocidad: preferencias.velocidadVoz,
            vozURI: preferencias.vozURI,
            soloSeleccion: preferencias.soloSeleccion,
        });

        if (!inicio && preferencias.soloSeleccion) {
            setAviso('Selecciona un texto en la página y vuelve a intentarlo.');
        }
    };

    const alternarPausa = (): void => {
        if (voz === 'pausado') {
            reanudarLectura();
        } else {
            pausarLectura();
        }
    };

    const restablecer = (): void => {
        detenerLectura();

        const base = preferenciasPorDefecto();

        setPreferencias(base);
        setAviso(null);
        guardarPreferencias(base);
        notificar?.success('Ajustes restablecidos.');
    };

    const mensajeVoz = !soportaVoz()
        ? 'Este navegador no puede leer en voz alta.'
        : aviso
          ? aviso
          : voz === 'leyendo'
            ? 'Leyendo la página…'
            : voz === 'pausado'
              ? 'Lectura en pausa.'
              : preferencias.soloSeleccion
                ? 'Selecciona un texto y pulsa Leer selección.'
                : 'Escucha el contenido de esta página.';

    const etiquetaLectura =
        voz !== 'inactivo'
            ? 'Detener lectura'
            : preferencias.soloSeleccion
              ? 'Leer selección'
              : 'Leer la página';

    return (
        <div ref={contenedor} className="relative" data-a11y-ignorar>
            <button
                ref={disparador}
                type="button"
                onClick={() => (abierto ? cerrar() : setAbierto(true))}
                aria-label="Accesibilidad"
                aria-haspopup="dialog"
                aria-expanded={abierto}
                title="Accesibilidad"
                className={buttonClassName}
            >
                <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="4.5" r="2" />
                    <path d="M4.5 9h15M12 6.5V13M8.5 21 12 13l3.5 8" />
                </svg>
            </button>

            {abierto && (
                <>
                    <div
                        ref={panelRef}
                        role="dialog"
                        aria-label="Accesibilidad"
                        tabIndex={-1}
                        className="rounded-tile border-line bg-surface text-ink shadow-pop absolute bottom-full left-1/2 z-50 mb-3 max-h-[min(72vh,36rem)] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto border p-3 outline-none"
                    >
                        <div className="border-line flex items-start justify-between gap-2 border-b pb-2">
                            <div>
                                <p className="text-muted font-mono text-sm tracking-wider uppercase">
                                    Accesibilidad
                                </p>
                                <p className="text-ink text-label font-semibold">
                                    Ajusta la página a tu medida
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={cerrar}
                                aria-label="Cerrar accesibilidad"
                                className="border-line text-ink hover:bg-soft grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm"
                            >
                                ×
                            </button>
                        </div>

                        <div className="rounded-tile bg-soft border-line mt-3 border p-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-label font-semibold">
                                    Lectura por voz
                                </span>
                                <span className="text-muted text-micro font-mono">
                                    {soportaVoz() ? 'ES' : 'No disponible'}
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    data-a11y-primero
                                    onClick={alternarLectura}
                                    onPointerDown={(evento) =>
                                        evento.preventDefault()
                                    }
                                    disabled={!soportaVoz()}
                                    className="rounded-pill bg-ink text-label focus-ring flex-1 px-3 py-2 font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {etiquetaLectura}
                                </button>
                                {voz !== 'inactivo' && (
                                    <button
                                        type="button"
                                        onClick={alternarPausa}
                                        className="rounded-pill border-line bg-soft text-label text-ink hover:bg-mint border px-3 py-2 font-semibold hover:text-black"
                                    >
                                        {voz === 'pausado'
                                            ? 'Reanudar'
                                            : 'Pausar'}
                                    </button>
                                )}
                            </div>

                            {voz !== 'inactivo' && (
                                <div
                                    className={`mt-1.5 grid gap-1.5 ${
                                        preferencias.soloSeleccion
                                            ? 'grid-cols-1'
                                            : 'grid-cols-2'
                                    }`}
                                >
                                    {!preferencias.soloSeleccion && (
                                        <button
                                            type="button"
                                            onClick={siguienteParrafo}
                                            className="border-line bg-soft text-ink hover:bg-mint rounded-lg border px-2 py-1.5 text-[11px] font-semibold hover:text-black"
                                        >
                                            Párrafo siguiente
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={detenerLectura}
                                        className="border-line bg-soft text-ink hover:bg-soft rounded-lg border px-2 py-1.5 text-[11px] font-semibold"
                                    >
                                        Detener
                                    </button>
                                </div>
                            )}

                            <p
                                aria-live="polite"
                                className="text-muted mt-1.5 text-[11px] leading-snug"
                            >
                                {mensajeVoz}
                            </p>

                            <div className="mt-2 grid gap-1.5">
                                <label className="text-label flex items-center justify-between gap-2">
                                    <span>Velocidad</span>
                                    <select
                                        value={preferencias.velocidadVoz}
                                        onChange={(evento) =>
                                            actualizarVoz({
                                                velocidadVoz: Number(
                                                    evento.target.value,
                                                ) as PreferenciasAccesibilidad['velocidadVoz'],
                                            })
                                        }
                                        aria-label="Velocidad de lectura"
                                        className="border-line bg-canvas text-ink rounded-lg border px-2 py-1 text-xs"
                                    >
                                        {VELOCIDADES_VOZ.map((velocidad) => (
                                            <option
                                                key={velocidad}
                                                value={velocidad}
                                            >
                                                {velocidad === 0.85
                                                    ? 'Lenta'
                                                    : velocidad === 1
                                                      ? 'Normal'
                                                      : 'Rápida'}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-label flex items-center justify-between gap-2">
                                    <span>Voz</span>
                                    <select
                                        value={preferencias.vozURI}
                                        onChange={(evento) =>
                                            actualizarVoz({
                                                vozURI: evento.target.value,
                                            })
                                        }
                                        aria-label="Voz de lectura"
                                        className="border-line bg-canvas text-ink max-w-[9.5rem] rounded-lg border px-2 py-1 text-xs"
                                    >
                                        <option value="">
                                            Voz del sistema
                                        </option>
                                        {voces.map((opcion) => (
                                            <option
                                                key={opcion.uri}
                                                value={opcion.uri}
                                            >
                                                {opcion.nombre} ({opcion.idioma}
                                                )
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="mt-2 grid gap-0.5">
                            <FilaInterruptor
                                etiqueta="Leer solo lo seleccionado"
                                activo={preferencias.soloSeleccion}
                                onCambio={() =>
                                    actualizarVoz({
                                        soloSeleccion:
                                            !preferencias.soloSeleccion,
                                    })
                                }
                            />
                            <FilaInterruptor
                                etiqueta="Alto contraste"
                                activo={preferencias.contraste}
                                onCambio={() =>
                                    actualizar({
                                        contraste: !preferencias.contraste,
                                    })
                                }
                            />
                            <FilaInterruptor
                                etiqueta="Subrayar enlaces"
                                activo={preferencias.subrayarEnlaces}
                                onCambio={() =>
                                    actualizar({
                                        subrayarEnlaces:
                                            !preferencias.subrayarEnlaces,
                                    })
                                }
                            />
                            <FilaInterruptor
                                etiqueta="Reducir movimiento"
                                activo={preferencias.reducirMovimiento}
                                onCambio={() =>
                                    actualizar({
                                        reducirMovimiento:
                                            !preferencias.reducirMovimiento,
                                    })
                                }
                            />
                        </div>

                        <div className="border-line mt-2 border-t pt-2">
                            <span className="text-label font-semibold">
                                Tamaño del texto
                            </span>
                            <div className="mt-1.5 grid grid-cols-4 gap-1">
                                {ESCALAS_TEXTO.map((escala) => {
                                    const activo =
                                        preferencias.escalaTexto === escala;

                                    return (
                                        <button
                                            key={escala}
                                            type="button"
                                            onClick={() =>
                                                actualizar({
                                                    escalaTexto: escala,
                                                })
                                            }
                                            aria-pressed={activo}
                                            aria-label={`Tamaño de texto ${escala} por ciento`}
                                            className={`rounded-lg border px-1 py-1.5 text-xs font-semibold transition-colors ${
                                                activo
                                                    ? 'border-ink bg-ink text-mint'
                                                    : 'border-line bg-soft text-ink hover:bg-mint hover:text-black'
                                            }`}
                                        >
                                            {escala}%
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={restablecer}
                            className="border-line bg-soft text-ink hover:bg-mint focus-ring mt-2 w-full rounded-full border px-3 py-2 text-sm font-semibold hover:text-black"
                        >
                            Restablecer ajustes
                        </button>

                        <p className="border-line text-muted mt-2 border-t pt-2 text-sm leading-relaxed">
                            Con “Leer solo lo seleccionado”, al seleccionar
                            texto se lee automáticamente. Los ajustes se guardan
                            en este navegador. Atajos: Ctrl/Cmd + K buscar · Esc
                            cerrar.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
