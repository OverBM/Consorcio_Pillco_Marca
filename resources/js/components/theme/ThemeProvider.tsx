import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

export type Tema = 'claro' | 'oscuro';

const CLAVE_ALMACENAMIENTO = 'cpm_tema';

interface ThemeContextValue {
    tema: Tema;
    alternarTema: () => void;
    definirTema: (tema: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function leerTemaGuardado(): Tema {
    if (typeof window === 'undefined') {
        return 'claro';
    }

    const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);

    if (guardado === 'claro' || guardado === 'oscuro') {
        return guardado;
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'oscuro'
        : 'claro';
}

function aplicarTema(tema: Tema): void {
    if (typeof document === 'undefined') {
        return;
    }

    const raiz = document.documentElement;

    raiz.dataset.theme = tema;
    raiz.classList.toggle('dark', tema === 'oscuro');
    raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';

    const meta = document.querySelector('meta[name="theme-color"]');

    if (meta) {
        meta.setAttribute('content', tema === 'oscuro' ? '#0b0f17' : '#5468ff');
    }
}

function marcarTransicion(): void {
    if (typeof document === 'undefined') {
        return;
    }

    const raiz = document.documentElement;

    raiz.classList.add('theme-changing');
    window.setTimeout(() => raiz.classList.remove('theme-changing'), 420);
}

function prefiereMenosMovimiento(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
}

/**
 * Aplica el cambio de tema con una transición de vista (crossfade + escala)
 * cuando el navegador la soporta. Si no, usa la transición CSS de colores.
 */
function cambiarConAnimacion(aplicar: () => void): void {
    if (typeof document === 'undefined' || prefiereMenosMovimiento()) {
        aplicar();

        return;
    }

    const documento = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
    };

    if (typeof documento.startViewTransition === 'function') {
        documento.startViewTransition(() => {
            flushSync(aplicar);
        });

        return;
    }

    marcarTransicion();
    aplicar();
}

/**
 * Tema claro/oscuro persistido en localStorage. El atributo `data-theme`
 * del documento activa los tokens oscuros definidos en `app.css` y la clase
 * `theme-changing` anima la transición de colores.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [tema, setTema] = useState<Tema>('claro');
    const primeraAplicacion = useRef(true);

    // El primer render debe coincidir con el HTML del servidor. El tema real
    // se recupera después de hidratar para evitar el error de hidratación.
    useEffect(() => {
        const inicial = leerTemaGuardado();

        setTema(inicial);
        aplicarTema(inicial);
    }, []);

    useEffect(() => {
        if (primeraAplicacion.current) {
            primeraAplicacion.current = false;

            return;
        }

        aplicarTema(tema);
        window.localStorage.setItem(CLAVE_ALMACENAMIENTO, tema);
    }, [tema]);

    useEffect(() => {
        const consulta = window.matchMedia?.('(prefers-color-scheme: dark)');

        if (!consulta || window.localStorage.getItem(CLAVE_ALMACENAMIENTO)) {
            return;
        }

        const alCambiar = (evento: MediaQueryListEvent): void => {
            setTema(evento.matches ? 'oscuro' : 'claro');
        };

        consulta.addEventListener('change', alCambiar);

        return () => consulta.removeEventListener('change', alCambiar);
    }, []);

    const definirTema = useCallback((nuevo: Tema) => {
        cambiarConAnimacion(() => setTema(nuevo));
    }, []);

    const alternarTema = useCallback(() => {
        cambiarConAnimacion(() =>
            setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro')),
        );
    }, []);

    const valor = useMemo<ThemeContextValue>(
        () => ({ tema, alternarTema, definirTema }),
        [tema, alternarTema, definirTema],
    );

    return (
        <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const contexto = useContext(ThemeContext);

    if (!contexto) {
        throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
    }

    return contexto;
}

/** Variante tolerante para componentes que también se montan aislados en pruebas. */
export function useThemeOpcional(): ThemeContextValue | null {
    return useContext(ThemeContext);
}
