import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';

import { IconoPorNombre } from '../components/icons/PorNombre';

export interface PillItem {
    id: string;
    label: string;
    href: string;
    icon?: string;
    badge?: string;
}

export interface PillGroup {
    title: string;
    items: PillItem[];
}

const ETIQUETAS_CORTAS: Record<string, string> = {
    'Panel Principal': 'Panel',
    'Programa (PMU)': 'Programa',
    'Gestión de Obra (PMI)': 'Obra',
    'Almacén y Logística': 'Almacén',
    'Compras y Proveedores': 'Compras',
    'Personal y SST': 'Personal',
    'Calidad y Ambiente': 'Calidad',
};

const GRUPO_ADMINISTRACION = 'Administración';

function Corto(titulo: string): string {
    return ETIQUETAS_CORTAS[titulo] ?? titulo.replace(/\s*\(.*\)\s*$/, '');
}

/**
 * Grupo activo entre los módulos visibles. Si la ruta pertenece a
 * Administración (que vive en la rueda), devuelve `undefined`: ningún módulo
 * queda marcado.
 */
export function grupoActivoDe(
    grupos: PillGroup[],
    pathname: string,
): PillGroup | undefined {
    return grupos
        .filter((g) => g.title !== GRUPO_ADMINISTRACION)
        .find((g) => g.items.some((i) => i.href === pathname));
}

function Flecha({
    direccion,
    onClick,
    visible,
}: {
    direccion: 'izq' | 'der';
    onClick: () => void;
    visible: boolean;
}) {
    if (!visible) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={
                direccion === 'izq'
                    ? 'Ver módulos anteriores'
                    : 'Ver más módulos'
            }
            className={`focus-ring border-line bg-surface text-ink shadow-card hover:bg-soft absolute top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border transition-opacity sm:grid ${
                direccion === 'izq' ? 'left-0' : 'right-0'
            }`}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path
                    d={
                        direccion === 'izq'
                            ? 'M15 18l-6-6 6-6'
                            : 'M9 18l6-6-6-6'
                    }
                />
            </svg>
        </button>
    );
}

/**
 * Nivel 1: todos los módulos en una barra. Si no caben aparecen flechas para
 * desplazarse y el módulo activo se centra automáticamente.
 */
export function ModulePills({
    grupos,
    pathname,
}: {
    grupos: PillGroup[];
    pathname: string;
}) {
    const visibles = grupos.filter((g) => g.title !== GRUPO_ADMINISTRACION);
    const activoGrupo = grupoActivoDe(grupos, pathname);

    const contenedor = useRef<HTMLDivElement | null>(null);
    const activoRef = useRef<HTMLAnchorElement | null>(null);
    const [puedeIzquierda, setPuedeIzquierda] = useState(false);
    const [puedeDerecha, setPuedeDerecha] = useState(false);

    const actualizarFlechas = useCallback(() => {
        const el = contenedor.current;

        if (!el) {
            return;
        }

        setPuedeIzquierda(el.scrollLeft > 4);
        setPuedeDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        actualizarFlechas();
        window.addEventListener('resize', actualizarFlechas);

        return () => window.removeEventListener('resize', actualizarFlechas);
    }, [actualizarFlechas, visibles.length]);

    // Centra el módulo activo para no tener que desplazarse pill por pill.
    useEffect(() => {
        const caja = contenedor.current;
        const activo = activoRef.current;

        if (!caja || !activo) {
            return;
        }

        const destino =
            activo.offsetLeft - caja.clientWidth / 2 + activo.clientWidth / 2;

        if (typeof caja.scrollTo === 'function') {
            caja.scrollTo({
                left: Math.max(0, destino),
                behavior: 'smooth',
            });
        }

        window.setTimeout(actualizarFlechas, 350);
    }, [pathname, actualizarFlechas]);

    const mover = (direccion: 'izq' | 'der'): void => {
        const caja = contenedor.current;

        if (!caja || typeof caja.scrollBy !== 'function') {
            return;
        }

        caja.scrollBy({
            left:
                (direccion === 'izq' ? -1 : 1) *
                Math.max(180, caja.clientWidth * 0.6),
            behavior: 'smooth',
        });

        window.setTimeout(actualizarFlechas, 350);
    };

    return (
        <div className="relative flex min-w-0 items-center">
            <Flecha
                direccion="izq"
                visible={puedeIzquierda}
                onClick={() => mover('izq')}
            />

            <nav
                ref={contenedor}
                aria-label="Módulos"
                onScroll={actualizarFlechas}
                className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto scroll-smooth px-1"
            >
                {visibles.map((grupo) => {
                    const activo = grupo.title === activoGrupo?.title;

                    return (
                        <Link
                            key={grupo.title}
                            href={grupo.items[0]?.href ?? '/panel'}
                            ref={activo ? activoRef : undefined}
                            aria-current={activo ? 'page' : undefined}
                            className={`rounded-pill text-body focus-ring relative flex shrink-0 items-center gap-1.5 px-2.5 py-2 font-semibold transition-colors ${
                                activo ? 'text-white' : 'text-ink hover:bg-soft'
                            }`}
                        >
                            {activo && (
                                <motion.span
                                    layoutId="modulo-activo"
                                    className="rounded-pill bg-ink absolute inset-0"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 380,
                                        damping: 32,
                                    }}
                                />
                            )}
                            <span className="relative z-10">
                                <IconoPorNombre
                                    nombre={grupo.items[0]?.icon}
                                    size={15}
                                />
                            </span>
                            <span className="relative z-10">
                                {Corto(grupo.title)}
                            </span>
                            <span
                                className={`text-micro relative z-10 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono font-bold ${
                                    activo
                                        ? 'bg-white/25 text-white'
                                        : 'bg-brand-100 text-brand-700'
                                }`}
                            >
                                {grupo.items.length}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <Flecha
                direccion="der"
                visible={puedeDerecha}
                onClick={() => mover('der')}
            />
        </div>
    );
}

/** Nivel 2: submódulos del módulo activo, centrados y con icono. */
export function SubmodulePills({
    grupos,
    pathname,
}: {
    grupos: PillGroup[];
    pathname: string;
}) {
    const grupo = grupoActivoDe(grupos, pathname);

    if (!grupo || grupo.items.length <= 1) {
        return null;
    }

    return (
        <nav aria-label="Submódulos" className="flex justify-center">
            <div className="no-scrollbar border-line bg-surface rounded-pill shadow-card inline-flex max-w-full items-center gap-0.5 overflow-x-auto border px-1.5 py-1">
                {grupo.items.map((item) => {
                    const activo = item.href === pathname;

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            aria-current={activo ? 'page' : undefined}
                            className={`rounded-pill text-label focus-ring flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 font-semibold transition-colors ${
                                activo
                                    ? 'bg-ink text-white'
                                    : 'text-muted hover:text-ink hover:bg-soft'
                            }`}
                        >
                            <IconoPorNombre nombre={item.icon} size={14} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
