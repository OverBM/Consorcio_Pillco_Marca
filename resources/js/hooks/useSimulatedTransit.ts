import { useEffect, useRef, useState } from 'react';

/**
 * Simulation hook (offline demo): el prototipo "avanza" el porcentaje de ruta de
 * los despachos en tránsito, y cuando un despacho llega a 100% se entrega
 * (dispara la actualización real de stock vía `deliverDespacho`).
 *
 * Devuelve el pctRuta del despacho consultado (0..1). Con `speedFactor` se
 * acelera la simulación para la demo.
 */
export function useSimulatedTransit({
    activo,
    pctInicial = 0,
    entregado,
    speedFactor = 1,
    onLlegada,
}: {
    activo: boolean;
    pctInicial?: number;
    entregado: boolean;
    speedFactor?: number;
    onLlegada: () => void;
}): number {
    const [pct, setPct] = useState(activo ? pctInicial : 0);
    const onLlegadaRef = useRef(onLlegada);
    onLlegadaRef.current = onLlegada;

    useEffect(() => {
        if (!activo || entregado) {
            return;
        }
        const desde = pctInicial;
        const objetivo = 1;
        const t0 = performance.now();
        const duracion = (objetivo - desde) * 12000 * speedFactor;

        let raf: number;
        const tick = (now: number) => {
            const avance = Math.min(1, desde + ((now - t0) / duracion) * (objetivo - desde));
            setPct(avance);
            if (avance < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                onLlegadaRef.current();
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [activo, entregado, pctInicial, speedFactor]);

    return entregado ? 1 : pct;
}

/** Breakpoint 'md' (768px) para menú responsive sin librerías extra. */
export function useMediaQuery(query: string): boolean {
    const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));

    useEffect(() => {
        const mq = window.matchMedia(query);
        const handler = () => setMatch(mq.matches);
        handler();
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [query]);

    return match;
}