// Tarjeta "geolocalizador" de detalle de un almacén: coordenadas (con copiar),
// distancias haversine a los demás puntos de la red y stock resumido por
// material. Se usa en el popup del mapa y como referencia al seleccionar un pin.

import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { cn } from '../utils/cn';
import { ESTADO_META, estadoDeAlmacen, estadoDeStock, type StockEstado } from '../utils/estados';
import { formatCoordenadas, haversineDistanceKm } from '../utils/geo';
import { formatCantidad, formatKm } from '../utils/format';
import type { StockState } from '../data/stock';
import type { Almacen, Material, Obra } from '../types';
import { IconCheck, IconMapPin, IconRadar, IconX } from './icons';

const PRIORIDAD: Record<StockEstado, number> = {
    sobrante: 4,
    critico: 3,
    bajo: 2,
    inactivo: 1,
    optimo: 0,
};

function BadgeEstado({ estado }: { estado: StockEstado }) {
    const meta = ESTADO_META[estado];
    return (
        <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.chip)}>
            {meta.label}
        </span>
    );
}

function GeoStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-lg bg-soft/60 px-2.5 py-1.5">
            <p className="text-[10px] text-muted">{label}</p>
            <p className="mt-0.5 truncate text-xs font-bold tabular-nums text-ink">{value}</p>
            {sub && <p className="truncate text-[10px] text-muted">{sub}</p>}
        </div>
    );
}

export function GeoDetalle({
    alm,
    obras,
    almacenes,
    stock,
    materiales,
    onClose,
}: {
    alm: Almacen;
    obras: Obra[];
    almacenes: Almacen[];
    stock: StockState;
    materiales: Material[];
    onClose?: () => void;
}) {
    const [copiado, setCopiado] = useState(false);

    const obra = obras.find((o) => o.id === alm.obraId);
    const estado = estadoDeAlmacen(alm, obra?.estado ?? 'cerrada', stock, materiales);

    const items = useMemo(() => {
        const obraEstado = obra?.estado ?? 'cerrada';
        return materiales
            .map((material) => {
                const cantidad = stock.stock[alm.id]?.[material.id] ?? 0;
                return { material, cantidad, estado: estadoDeStock(cantidad, material.stockMinimo, obraEstado) };
            })
            .sort((a, b) => PRIORIDAD[b.estado] - PRIORIDAD[a.estado] || b.cantidad - a.cantidad);
    }, [alm.id, materiales, stock, obra?.estado]);

    const central = almacenes.find((a) => a.tipo === 'central');
    const kmCentral = central && central.id !== alm.id ? haversineDistanceKm(central.coords, alm.coords) : null;

    const cercanos = useMemo(
        () =>
            almacenes
                .filter((a) => a.id !== alm.id)
                .map((a) => {
                    const o = obras.find((ob) => ob.id === a.obraId);
                    return {
                        almacen: a,
                        obra: o,
                        km: haversineDistanceKm(alm.coords, a.coords),
                        estado: estadoDeAlmacen(a, o?.estado ?? 'cerrada', stock, materiales),
                    };
                })
                .sort((x, y) => x.km - y.km),
        [alm, almacenes, obras, stock, materiales],
    );

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(
                `${formatCoordenadas(alm.coords.lat, alm.coords.lng)} · ${alm.nombre}`,
            );
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch {
            setCopiado(false);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Ficha del punto */}
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{alm.nombre}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                        {obra?.distrito} · {alm.tipo} · {obra?.estado.replace('-', ' ')}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <BadgeEstado estado={estado} />
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-ghost-soft hover:text-ink"
                        >
                            <IconX size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Coordenadas */}
            <div className="border-b border-line px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold tabular-nums text-ink">
                        <IconMapPin size={14} className="shrink-0 text-brand-500" />
                        <span className="truncate">{formatCoordenadas(alm.coords.lat, alm.coords.lng)}</span>
                    </span>
                    <button
                        type="button"
                        onClick={copiar}
                        className={cn(
                            'shrink-0 cursor-pointer rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
                            copiado
                                ? 'border-ok-soft bg-ok-soft text-emerald-800'
                                : 'border-line bg-soft/60 text-muted hover:text-ink',
                        )}
                    >
                        {copiado ? (
                            <span className="inline-flex items-center gap-1">
                                <IconCheck size={11} />
                                Copiado
                            </span>
                        ) : (
                            'Copiar coords.'
                        )}
                    </button>
                </div>
            </div>

            {/* Distancias geográficas */}
            <div className="border-b border-line px-4 py-2.5">
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                    <IconRadar size={11} />
                    Distancias en la red
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <GeoStat
                        label="Almacén central"
                        value={alm.tipo === 'central' ? 'Punto central' : kmCentral ? formatKm(kmCentral) : '—'}
                    />
                    <GeoStat
                        label="Punto más cercano"
                        value={cercanos[0] ? formatKm(cercanos[0].km) : '—'}
                        sub={cercanos[0] ? (cercanos[0].obra?.nombre ?? cercanos[0].almacen.nombre) : undefined}
                    />
                </div>
                <ul className="mt-2 space-y-1">
                    {cercanos.map(({ almacen, obra: o, km, estado: e }) => (
                        <li key={almacen.id} className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600">
                                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ESTADO_META[e].dot)} />
                                <span className="truncate">{o?.nombre ?? almacen.nombre}</span>
                            </span>
                            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink">
                                {formatKm(km)}
                            </span>
                        </li>
                    ))}
                    {cercanos.length === 0 && <li className="text-[11px] text-muted">Sin otros puntos en la red.</li>}
                </ul>
            </div>

            {/* Stock por material */}
            <div className="max-h-52 overflow-y-auto px-4 py-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Stock por material</p>
                {items.map(({ material, cantidad, estado: e }) => (
                    <div
                        key={material.id}
                        className="flex items-center justify-between gap-3 border-b border-line/60 py-1.5 last:border-0"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{material.nombre}</p>
                            <p className="text-[10px] text-muted">{material.categoria}</p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-xs font-bold tabular-nums text-ink">
                                {formatCantidad(cantidad)}{' '}
                                <span className="font-normal text-muted">{material.unidad}</span>
                            </p>
                            <p className={cn('text-[10px] font-semibold', ESTADO_META[e].chip)}>{ESTADO_META[e].label}</p>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="py-3 text-center text-xs text-muted">Sin materiales registrados</p>}
            </div>

            {/* Pie */}
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                <p className="text-[10px] text-muted">Coordenadas aproximadas · simulación</p>
                <Link
                    href="/stock"
                    className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
                >
                    Ver en Matriz de Stock
                </Link>
            </div>
        </div>
    );
}