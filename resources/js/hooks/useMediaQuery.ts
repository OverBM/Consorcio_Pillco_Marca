import { useEffect, useState } from 'react';

/** Devuelve true mientras la media query se cumple. */
export function useMediaQuery(consulta: string): boolean {
    const [coincide, setCoincide] = useState(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return false;
        }

        return window.matchMedia(consulta).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }

        const media = window.matchMedia(consulta);
        const alCambiar = (evento: MediaQueryListEvent): void =>
            setCoincide(evento.matches);

        setCoincide(media.matches);
        media.addEventListener('change', alCambiar);

        return () => media.removeEventListener('change', alCambiar);
    }, [consulta]);

    return coincide;
}
