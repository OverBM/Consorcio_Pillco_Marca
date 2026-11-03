import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * Anima un número desde su valor anterior hasta el nuevo.
 * Con `prefers-reduced-motion` devuelve el valor final sin animación.
 */
export function useAnimatedNumber(valor: number, duracion = 0.6): number {
    const reducirMovimiento = useReducedMotion();
    const anterior = useRef(valor);
    const [mostrado, setMostrado] = useState(valor);

    useEffect(() => {
        if (reducirMovimiento) {
            anterior.current = valor;
            setMostrado(valor);

            return;
        }

        const controles = animate(anterior.current, valor, {
            duration: duracion,
            ease: 'easeOut',
            onUpdate: (actual) => setMostrado(actual),
            onComplete: () => {
                anterior.current = valor;
            },
        });

        return () => controles.stop();
    }, [valor, duracion, reducirMovimiento]);

    return reducirMovimiento ? valor : mostrado;
}
