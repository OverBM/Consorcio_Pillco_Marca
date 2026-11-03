import { useCallback, useEffect, useState } from 'react';

export interface ResultadoBusqueda {
    id: string;
    titulo: string;
    subtitulo: string;
    href: string;
}

export interface GrupoBusqueda {
    tipo: string;
    etiqueta: string;
    items: ResultadoBusqueda[];
}

export type EstadoBusqueda = 'idle' | 'loading' | 'success' | 'error';

interface UseBusqueda {
    estado: EstadoBusqueda;
    grupos: GrupoBusqueda[];
    reintentar: () => void;
}

/**
 * Búsqueda con debounce de 250 ms y cancelación de la petición anterior.
 * Con menos de dos caracteres no consulta y deja el estado en `idle`.
 */
export function useBusqueda(termino: string): UseBusqueda {
    const [estado, setEstado] = useState<EstadoBusqueda>('idle');
    const [grupos, setGrupos] = useState<GrupoBusqueda[]>([]);
    const [intento, setIntento] = useState(0);

    const reintentar = useCallback(() => setIntento((n) => n + 1), []);

    useEffect(() => {
        const texto = termino.trim();

        if (texto.length < 2) {
            setGrupos([]);
            setEstado('idle');

            return;
        }

        const control = new AbortController();
        const temporizador = setTimeout(async () => {
            setEstado('loading');

            try {
                const respuesta = await fetch(
                    `/api/v1/buscar?q=${encodeURIComponent(texto)}`,
                    {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                        signal: control.signal,
                    },
                );

                if (!respuesta.ok) {
                    throw new Error('respuesta no válida');
                }

                const datos = (await respuesta.json()) as {
                    grupos?: GrupoBusqueda[];
                };

                setGrupos(datos.grupos ?? []);
                setEstado('success');
            } catch (error) {
                if ((error as Error).name === 'AbortError') {
                    return;
                }

                setEstado('error');
            }
        }, 250);

        return () => {
            clearTimeout(temporizador);
            control.abort();
        };
    }, [termino, intento]);

    return { estado, grupos, reintentar };
}
