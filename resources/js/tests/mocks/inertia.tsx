// Mock de `@inertiajs/react` para las pruebas: reemplaza el cliente real
// (router, visitas y peticiones) por dobles controlables desde cada test.
// Se conecta vía `test.alias` en `vite.config.ts`.

import {
    useCallback,
    useRef,
    useState,
    type AnchorHTMLAttributes,
    type ReactNode,
} from 'react';
import { vi } from 'vitest';

export type PropsInercia = Record<string, unknown>;

interface PaginaInercia {
    props: PropsInercia;
    url: string;
    component: string;
    version: string | null;
}

const PAGINA_VACIA: PaginaInercia = {
    props: {},
    url: '/',
    component: 'PaginaDePrueba',
    version: '1',
};

let paginaActual: PaginaInercia = PAGINA_VACIA;

export function setPageProps(props: PropsInercia, url = '/'): void {
    paginaActual = { props, url, component: 'PaginaDePrueba', version: '1' };
}

export function resetPage(): void {
    paginaActual = PAGINA_VACIA;
}

export function usePage(): PaginaInercia {
    return paginaActual;
}

export const router = {
    visit: vi.fn(),
    reload: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    prefetch: vi.fn(),
    cancelAll: vi.fn(),
};

export interface LlamadaHttp {
    metodo: string;
    url: string;
    datos: unknown;
}

/** Peticiones registradas por `useHttp` durante el test en curso. */
export const llamadasHttp: LlamadaHttp[] = [];

/** Respuesta que devolverá `useHttp` a los callbacks `onSuccess`. */
export const respuestaHttp: { data: unknown } = { data: {} };

export function resetHttpMocks(): void {
    llamadasHttp.length = 0;
    respuestaHttp.data = {};
    Object.values(router).forEach((fn) => {
        fn.mockClear();
    });
}

type MetodoHttp = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface OpcionesHttp {
    onSuccess?: (respuesta: unknown) => void;
    onError?: (errores: Record<string, string[]>) => void;
    onFinish?: () => void;
    onBefore?: () => void;
}

export interface EstadoHttp<T extends PropsInercia> {
    data: T;
    errors: Record<string, string>;
    processing: boolean;
    progress: null;
    setData: (datos: Partial<T> | string, valor?: unknown) => void;
    transform: (fn: (data: T) => unknown) => void;
    reset: (...campos: string[]) => void;
    clearErrors: (...campos: string[]) => void;
    setError: (campo: string, error: string) => void;
    get: (url: string, opciones?: OpcionesHttp) => void;
    post: (url: string, opciones?: OpcionesHttp) => void;
    put: (url: string, opciones?: OpcionesHttp) => void;
    patch: (url: string, opciones?: OpcionesHttp) => void;
    delete: (url: string, opciones?: OpcionesHttp) => void;
    submit: (metodo: MetodoHttp, url: string, opciones?: OpcionesHttp) => void;
}

export function useHttp<T extends PropsInercia>(inicial: T): EstadoHttp<T> {
    const [data, setDataState] = useState<T>(inicial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const transformador = useRef<((datos: T) => unknown) | null>(null);

    const setData = useCallback(
        (datos: Partial<T> | string, valor?: unknown) => {
            setDataState((actual) => {
                if (typeof datos === 'string') {
                    return { ...actual, [datos]: valor };
                }

                return { ...actual, ...datos };
            });
        },
        [],
    );

    const transform = useCallback((fn: (datos: T) => unknown) => {
        transformador.current = fn;
    }, []);

    const reset = useCallback(
        (...campos: string[]) => {
            setDataState((actual) => {
                if (campos.length === 0) {
                    return inicial;
                }

                const copia: Record<string, unknown> = { ...actual };

                for (const campo of campos) {
                    copia[campo] = (inicial as Record<string, unknown>)[campo];
                }

                return copia as T;
            });
        },
        [inicial],
    );

    const clearErrors = useCallback((...campos: string[]) => {
        setErrors((actual) => {
            if (campos.length === 0) {
                return {};
            }

            const copia = { ...actual };

            for (const campo of campos) {
                delete copia[campo];
            }

            return copia;
        });
    }, []);

    const setError = useCallback((campo: string, error: string) => {
        setErrors((actual) => ({ ...actual, [campo]: error }));
    }, []);

    const submit = useCallback(
        (metodo: MetodoHttp, url: string, opciones: OpcionesHttp = {}) => {
            opciones.onBefore?.();
            llamadasHttp.push({
                metodo,
                url,
                datos: transformador.current
                    ? transformador.current(data)
                    : data,
            });
            opciones.onSuccess?.(respuestaHttp);
            opciones.onFinish?.();
        },
        [data],
    );

    return {
        data,
        errors,
        processing: false,
        progress: null,
        setData,
        transform,
        reset,
        clearErrors,
        setError,
        get: (url, opciones) => submit('get', url, opciones),
        post: (url, opciones) => submit('post', url, opciones),
        put: (url, opciones) => submit('put', url, opciones),
        patch: (url, opciones) => submit('patch', url, opciones),
        delete: (url, opciones) => submit('delete', url, opciones),
        submit,
    };
}

interface PropsEnlace extends Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
> {
    href: string | { url: string };
    children?: ReactNode;
    method?: string;
    data?: unknown;
    only?: string[];
    preserveState?: boolean;
    preserveScroll?: boolean;
    replace?: boolean;
    as?: string;
}

export function Link(props: PropsEnlace) {
    const destino =
        typeof props.href === 'string' ? props.href : props.href.url;

    return (
        <a
            href={destino}
            className={props.className}
            title={props.title}
            aria-label={props['aria-label']}
            onClick={props.onClick}
            id={props.id}
        >
            {props.children}
        </a>
    );
}

export const Head = (): null => null;

export function Deferred(props: {
    data: string | string[];
    fallback?: ReactNode;
    children: ReactNode;
}) {
    return <>{props.children}</>;
}
