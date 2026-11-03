import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

import { useBusqueda, type ResultadoBusqueda } from './useBusqueda';

export interface GlobalSearchProps {
    abierto: boolean;
    onCerrar: () => void;
}

/**
 * Command palette: diálogo con foco atrapado, navegación por flechas y
 * resultados agrupados. Se abre con el botón del riel o con Ctrl/Cmd + K.
 */
export function GlobalSearch({ abierto, onCerrar }: GlobalSearchProps) {
    const [termino, setTermino] = useState('');
    const [activo, setActivo] = useState(0);
    const entrada = useRef<HTMLInputElement | null>(null);

    const { estado, grupos, reintentar } = useBusqueda(termino);

    const planos = useMemo<ResultadoBusqueda[]>(
        () => grupos.flatMap((grupo) => grupo.items),
        [grupos],
    );

    useEffect(() => {
        if (!abierto) {
            setTermino('');
            setActivo(0);

            return;
        }

        const foco = setTimeout(() => entrada.current?.focus(), 0);

        return () => clearTimeout(foco);
    }, [abierto]);

    useEffect(() => {
        setActivo(0);
    }, [termino]);

    useEffect(() => {
        if (!abierto) {
            return;
        }

        const alPresionar = (evento: KeyboardEvent): void => {
            if (evento.key === 'Escape') {
                evento.preventDefault();
                onCerrar();

                return;
            }

            if (evento.key === 'ArrowDown') {
                evento.preventDefault();
                setActivo((indice) =>
                    planos.length === 0 ? 0 : (indice + 1) % planos.length,
                );

                return;
            }

            if (evento.key === 'ArrowUp') {
                evento.preventDefault();
                setActivo((indice) =>
                    planos.length === 0
                        ? 0
                        : (indice - 1 + planos.length) % planos.length,
                );

                return;
            }

            if (evento.key === 'Enter') {
                const destino = planos[activo];

                if (destino) {
                    evento.preventDefault();
                    onCerrar();
                    router.visit(destino.href);
                }
            }
        };

        window.addEventListener('keydown', alPresionar);

        return () => window.removeEventListener('keydown', alPresionar);
    }, [abierto, activo, planos, onCerrar]);

    if (!abierto) {
        return null;
    }

    let indicePlano = -1;

    return (
        <div
            className="bg-ink/40 fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) {
                    onCerrar();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Búsqueda global"
                className="rounded-card border-line bg-surface shadow-pop w-full max-w-2xl overflow-hidden border"
            >
                <div className="border-line border-b p-3">
                    <input
                        ref={entrada}
                        type="search"
                        value={termino}
                        onChange={(evento) => setTermino(evento.target.value)}
                        placeholder="Buscar obra, almacén, material, OC o proveedor…"
                        aria-label="Término de búsqueda"
                        className="rounded-tile bg-soft text-ink focus-ring w-full px-4 py-3 text-sm outline-none"
                    />
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {estado === 'idle' && (
                        <p className="text-muted px-3 py-6 text-center text-xs">
                            Escribe al menos 2 caracteres
                        </p>
                    )}

                    {estado === 'loading' && (
                        <div className="space-y-2 p-2" aria-live="polite">
                            {[0, 1, 2].map((fila) => (
                                <div
                                    key={fila}
                                    className="bg-soft h-10 animate-pulse rounded-lg"
                                />
                            ))}
                        </div>
                    )}

                    {estado === 'error' && (
                        <div className="px-3 py-6 text-center text-xs">
                            <p className="text-critico">
                                No se pudo completar la búsqueda.
                            </p>
                            <button
                                type="button"
                                onClick={reintentar}
                                className="rounded-pill border-line text-ink hover:bg-soft mt-2 border px-3 py-1.5 font-semibold"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {estado === 'success' && planos.length === 0 && (
                        <p className="text-muted px-3 py-6 text-center text-xs">
                            Sin resultados para “{termino.trim()}”
                        </p>
                    )}

                    {estado === 'success' &&
                        grupos.map((grupo) => (
                            <section key={grupo.tipo} className="mb-2">
                                <h3 className="text-muted px-3 py-1 font-mono text-[10px] tracking-wider uppercase">
                                    {grupo.etiqueta}
                                </h3>
                                {grupo.items.map((item) => {
                                    indicePlano++;
                                    const seleccionado = indicePlano === activo;
                                    const indice = indicePlano;

                                    return (
                                        <button
                                            key={`${grupo.tipo}-${item.id}`}
                                            type="button"
                                            onMouseEnter={() =>
                                                setActivo(indice)
                                            }
                                            onClick={() => {
                                                onCerrar();
                                                router.visit(item.href);
                                            }}
                                            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                                                seleccionado
                                                    ? 'bg-soft text-ink'
                                                    : 'text-ink hover:bg-soft'
                                            }`}
                                        >
                                            <span className="truncate">
                                                {item.titulo}
                                            </span>
                                            <span className="text-micro text-muted shrink-0">
                                                {item.subtitulo}
                                            </span>
                                        </button>
                                    );
                                })}
                            </section>
                        ))}
                </div>

                <div className="border-line text-micro text-muted flex items-center justify-between border-t px-4 py-2">
                    <span>↑ ↓ navegar · Enter abrir</span>
                    <span>Esc cerrar</span>
                </div>
            </div>
        </div>
    );
}
