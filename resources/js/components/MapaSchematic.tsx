// Mapa esquemático SVG del Valle del Mantaro — SIN Leaflet/OSM/tiles
// (Decisión del usuario: offline blindado, sin CDN). Pines proyectados con
// `projectToMap(lat,lng)`, rutas dinámicas de despachos y sugerencias de
// redistribución por cercanía. Vista Mapa/Satélite simulada (sin tiles), tooltip
// de stock resumido al pasar el cursor y tarjeta ampliada al hacer clic en un pin.

import { useMemo, useState } from 'react';
import { cn } from '../utils/cn';
import {
    ESTADO_META,
    estadoDeAlmacen,
    estadoDeStock,
    type StockEstado,
} from '../utils/estados';
import { MAP_H, MAP_W, projectToMap } from '../utils/geo';
import { formatCantidad } from '../utils/format';
import type { StockState } from '../data/stock';
import type { Almacen, Material, Obra } from '../types';
import { IconMapPin, IconSearch } from './icons';
import { GeoDetalle } from './GeoDetalle';

export interface RutaMapa {
    id: string;
    codigo: string;
    origenId: string;
    destinoId: string;
    estado: 'en-transito' | 'pendiente' | 'entregado';
}

export interface SugerenciaMapa {
    origenId: string;
    destinoId: string;
}

const NOMBRE_CORTO: Record<string, string> = {
    'obra-central': 'Alm. Central San Jerónimo',
    'obra-eltambo': 'Frente El Tambo',
    'obra-puentecunas': 'Puente Cunas',
    'obra-chilca': 'Conexión Chilca',
    'obra-ielosandes': 'IE Los Andes (cierre)',
};

function proyecto(alm: Almacen) {
    return projectToMap(alm.coords.lat, alm.coords.lng);
}

interface ItemResumen {
    material: Material;
    cantidad: number;
    estado: StockEstado;
}

interface Tema {
    bg: string;
    hill: string;
    riverBand: string;
    riverCore: string;
    roadBand: string;
    roadLine: string;
    rail: string;
    grid: string;
    distrito: string;
    carreteraText: string;
    ffccText: string;
    rutaText: string;
    pinLabel: string;
    halo: string;
}

const TEMA: Record<'mapa' | 'satelite', Tema> = {
    mapa: {
        bg: '#f7f8fc',
        hill: '#e2e7f2',
        riverBand: '#dbeafe',
        riverCore: '#9cc5f7',
        roadBand: '#fdeccb',
        roadLine: '#f6c88c',
        rail: '#cbd2e6',
        grid: '#cdd6f2',
        distrito: '#6b7190',
        carreteraText: '#a16207',
        ffccText: '#6b7190',
        rutaText: '#6b7190',
        pinLabel: '#101233',
        halo: '#ffffff',
    },
    satelite: {
        bg: '#182420',
        hill: '#2d3a30',
        riverBand: '#1d2f3d',
        riverCore: '#4d7396',
        roadBand: '#3a3123',
        roadLine: '#a97c3f',
        rail: '#3a4a45',
        grid: '#405045',
        distrito: '#9fb0a4',
        carreteraText: '#e5c078',
        ffccText: '#b9c8c0',
        rutaText: '#c6d0ea',
        pinLabel: '#edf3ee',
        halo: '#14201b',
    },
};

/** Posición en % para el tooltip/popup del pin (el contenedor del mapa == caja del SVG). */
function pinPos(p: { x: number; y: number }): { left: string; top: string; move: string } {
    const sx = (p.x / MAP_W) * 100;
    const sy = (p.y / MAP_H) * 100;
    const below = sy < 32;
    let left = sx;
    let horizontal = '-translate-x-1/2';
    if (sx < 20) {
        left = 6;
        horizontal = '';
    } else if (sx > 80) {
        left = 94;
        horizontal = '-translate-x-full';
    }
    return {
        left: `${left}%`,
        top: `${below ? sy + 4.5 : sy - 4.5}%`,
        move: `${horizontal} ${below ? '' : '-translate-y-full'}`,
    };
}

function BadgeEstado({ estado, mini }: { estado: StockEstado; mini?: boolean }) {
    const meta = ESTADO_META[estado];
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center rounded-full font-semibold',
                mini ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[11px]',
                meta.chip,
            )}
        >
            {meta.label}
        </span>
    );
}

export function MapaSchematic({
    obras,
    almacenes,
    stock,
    materiales,
    rutas = [],
    sugerencias = [],
    seleccionadaId,
    onPinClick,
    className,
}: {
    obras: Obra[];
    almacenes: Almacen[];
    stock: StockState;
    materiales: Material[];
    rutas?: RutaMapa[];
    sugerencias?: SugerenciaMapa[];
    seleccionadaId?: string;
    onPinClick?: (obraId: string) => void;
    className?: string;
}) {
    const obrasPorId = useMemo(() => new Map(obras.map((o) => [o.id, o])), [obras]);
    const almPorId = useMemo(() => new Map(almacenes.map((a) => [a.id, a])), [almacenes]);

    const estadoPorAlmacen = useMemo(() => {
        const out: Record<string, StockEstado> = {};
        for (const alm of almacenes) {
            const obra = obrasPorId.get(alm.obraId);
            out[alm.id] = estadoDeAlmacen(alm, obra?.estado ?? 'cerrada', stock, materiales);
        }
        return out;
    }, [almacenes, obrasPorId, stock, materiales]);

    const [vista, setVista] = useState<'mapa' | 'satelite'>('mapa');
    const [hoverAlmId, setHoverAlmId] = useState<string | null>(null);
    const [openAlmId, setOpenAlmId] = useState<string | null>(null);
    const t = TEMA[vista];

    const itemsPorAlmacen = useMemo(() => {
        const prioridad: Record<StockEstado, number> = {
            sobrante: 4,
            critico: 3,
            bajo: 2,
            inactivo: 1,
            optimo: 0,
        };
        const out: Record<string, ItemResumen[]> = {};
        for (const alm of almacenes) {
            const obra = obrasPorId.get(alm.obraId);
            const items = materiales
                .map((material) => {
                    const cantidad = stock.stock[alm.id]?.[material.id] ?? 0;
                    return {
                        material,
                        cantidad,
                        estado: estadoDeStock(cantidad, material.stockMinimo, obra?.estado ?? 'cerrada'),
                    };
                })
                .sort((a, b) => prioridad[b.estado] - prioridad[a.estado] || b.cantidad - a.cantidad);
            out[alm.id] = items;
        }
        return out;
    }, [almacenes, obrasPorId, stock, materiales]);

    const hoverAlm = hoverAlmId ? almPorId.get(hoverAlmId) : undefined;
    const openAlm = openAlmId ? almPorId.get(openAlmId) : undefined;
    const hoverObra = hoverAlm ? obrasPorId.get(hoverAlm.obraId) : undefined;
    const hoverItems = hoverAlm ? (itemsPorAlmacen[hoverAlm.id] ?? []) : [];
    const hp = hoverAlm ? pinPos(proyecto(hoverAlm)) : null;
    const op = openAlm ? pinPos(proyecto(openAlm)) : null;

    return (
        <div className={cn('relative', className)}>
            <div className="relative" onClick={() => setOpenAlmId(null)}>
                {/* Controles Mapa/Satélite */}
                <div className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-line bg-surface/95 text-xs font-semibold shadow-card">
                    {(['mapa', 'satelite'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setVista(v);
                            }}
                            className={cn(
                                'px-3 py-1.5 transition-colors',
                                vista === v ? 'bg-brand-500 text-white' : 'cursor-pointer text-muted hover:text-ink',
                            )}
                        >
                            {v === 'mapa' ? 'Mapa' : 'Satélite'}
                        </button>
                    ))}
                </div>
                <div className="absolute right-3 top-3 z-10 flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs font-medium text-muted shadow-card">
                    <IconSearch size={13} />
                    Buscar distrito…
                </div>

                <svg
                    viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                    className="h-auto w-full select-none"
                    role="img"
                    aria-label="Mapa esquemático del Valle del Mantaro con almacenes y rutas"
                >
                    <defs>
                        <radialGradient id="sat-1" cx="38%" cy="42%" r="70%">
                            <stop offset="0%" stopColor="#2d4134" />
                            <stop offset="55%" stopColor="#22332a" />
                            <stop offset="100%" stopColor="#18241f" />
                        </radialGradient>
                        <radialGradient id="sat-2" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#3a4b3c" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="#3a4b3c" stopOpacity={0} />
                        </radialGradient>
                    </defs>

                    <rect x={0} y={0} width={MAP_W} height={MAP_H} fill={t.bg} />

                    {/* Textura "satélite" simulada (sin tiles externos) */}
                    {vista === 'satelite' && (
                        <g opacity={0.9} pointerEvents="none">
                            <ellipse cx={330} cy={250} rx={520} ry={240} fill="url(#sat-1)" />
                            <ellipse cx={700} cy={140} rx={380} ry={200} fill="url(#sat-2)" />
                        </g>
                    )}

                    {/* Terreno: relieve de montañas + río Mantaro */}
                    <g fill="none" stroke={t.hill} strokeWidth={2} strokeLinecap="round">
                        <path d="M 90 70 C 240 40 330 60 420 120 C 560 214 700 240 900 200" opacity={0.7} />
                        <path d="M 40 250 C 180 190 300 185 420 220 C 600 274 760 290 990 250" opacity={0.6} />
                        <path d="M -10 380 C 160 320 320 310 500 352 C 680 394 840 400 1020 368" opacity={0.6} />
                    </g>
                    <path
                        d="M 330 20 C 420 88 470 140 560 205 C 610 238 660 268 712 322 C 780 392 872 424 990 428"
                        fill="none"
                        stroke={t.riverBand}
                        strokeWidth={46}
                        strokeLinecap="round"
                        opacity={0.85}
                    />
                    <path
                        d="M 330 20 C 420 88 470 140 560 205 C 610 238 660 268 712 322 C 780 392 872 424 990 428"
                        fill="none"
                        stroke={t.riverCore}
                        strokeWidth={11}
                        strokeLinecap="round"
                    />

                    {/* Carretera Central Norte (decorativo) */}
                    <path
                        d="M 52 128 C 220 182 300 205 388 236 C 520 282 650 308 962 360"
                        fill="none"
                        stroke={t.roadBand}
                        strokeWidth={10}
                        strokeLinecap="round"
                    />
                    <path
                        d="M 52 128 C 220 182 300 205 388 236 C 520 282 650 308 962 360"
                        fill="none"
                        stroke={t.roadLine}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeDasharray="14 10"
                        opacity={0.8}
                    />
                    <text
                        x={170}
                        y={188}
                        fontSize={11}
                        fill={t.carreteraText}
                        fontWeight={600}
                        transform="rotate(-14 170 188)"
                        style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3 }}
                    >
                        CARRETERA CENTRAL
                    </text>

                    {/* Ferrocarril Huancayo–Huancavelica (decorativo) */}
                    <path
                        d="M 430 150 C 500 170 545 190 590 214 C 640 242 690 270 760 322"
                        fill="none"
                        stroke={t.rail}
                        strokeWidth={3}
                        strokeDasharray="10 5"
                    />
                    <text
                        x={610}
                        y={202}
                        fontSize={10}
                        fill={t.ffccText}
                        fontWeight={600}
                        transform="rotate(30 610 202)"
                        style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3 }}
                    >
                        FF.CC.
                    </text>

                    {/* Grid urbano Huancayo / El Tambo (decorativo) */}
                    <g fill="none" stroke={t.grid} strokeWidth={1} opacity={0.8}>
                        <rect x={540} y={196} width={84} height={60} rx={4} />
                        <rect x={550} y={206} width={28} height={18} />
                        <rect x={586} y={206} width={30} height={18} />
                        <rect x={550} y={230} width={28} height={18} />
                        <rect x={586} y={230} width={30} height={18} />
                    </g>

                    {/* Etiquetas de distritos */}
                    <g fill={t.distrito} fontSize={12} fontWeight={600}>
                        <text x={200} y={66} textAnchor="middle">La Oroya</text>
                        <text x={392} y={112} textAnchor="middle">Jauja</text>
                        <text x={596} y={184} textAnchor="middle">Huancayo</text>
                        <text x={236} y={204} textAnchor="middle">Chupaca</text>
                        <text x={762} y={322} textAnchor="middle">Chilca</text>
                    </g>

                    {/* Sugerencias de redistribución (sobrante → obras con déficit) */}
                    {sugerencias.map((s) => {
                        const a = almPorId.get(s.origenId);
                        const b = almPorId.get(s.destinoId);
                        if (!a || !b) {
                            return null;
                        }
                        const p = proyecto(a);
                        const q = proyecto(b);
                        const mx = (p.x + q.x) / 2;
                        const my = (p.y + q.y) / 2;
                        return (
                            <g key={`${s.origenId}-${s.destinoId}`}>
                                <line
                                    x1={p.x}
                                    y1={p.y}
                                    x2={q.x}
                                    y2={q.y}
                                    stroke="#7c3aed"
                                    strokeWidth={2.5}
                                    strokeDasharray="6 7"
                                    strokeLinecap="round"
                                    opacity={0.75}
                                />
                                <circle cx={mx} cy={my} r={5} fill="#7c3aed" className="cpm-pulse" />
                            </g>
                        );
                    })}

                    {/* Rutas de despachos */}
                    {rutas.map((r) => {
                        const a = almPorId.get(r.origenId);
                        const b = almPorId.get(r.destinoId);
                        if (!a || !b) {
                            return null;
                        }
                        const p = proyecto(a);
                        const q = proyecto(b);
                        const mx = (p.x + q.x) / 2;
                        const my = (p.y + q.y) / 2;
                        const enTransito = r.estado === 'en-transito';
                        return (
                            <g key={r.id}>
                                <line
                                    x1={p.x}
                                    y1={p.y}
                                    x2={q.x}
                                    y2={q.y}
                                    stroke={enTransito ? '#3f4df0' : '#9aa4ff'}
                                    strokeWidth={enTransito ? 3.5 : 3}
                                    strokeLinecap="round"
                                    className={enTransito ? 'cpm-route-anim' : undefined}
                                    strokeDasharray={enTransito ? undefined : '4 6'}
                                    opacity={enTransito ? 0.9 : 0.6}
                                />
                                {enTransito ? (
                                    <g className="cpm-pulse">
                                        <circle cx={mx} cy={my} r={9} fill="#fff" stroke="#3f4df0" strokeWidth={3} />
                                        <text
                                            x={mx}
                                            y={my + 3.5}
                                            textAnchor="middle"
                                            fontSize={9}
                                            fontWeight={700}
                                            fill="#3f4df0"
                                        >
                                            ▶
                                        </text>
                                    </g>
                                ) : null}
                                <text
                                    x={mx}
                                    y={my - 12}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fontWeight={600}
                                    fill={t.rutaText}
                                    style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 4 }}
                                >
                                    {r.codigo}
                                </text>
                            </g>
                        );
                    })}

                    {/* Pines de almacenes */}
                    {almacenes.map((alm) => {
                        const obra = obrasPorId.get(alm.obraId);
                        const hex = ESTADO_META[estadoPorAlmacen[alm.id] ?? 'inactivo'].hex;
                        const p = proyecto(alm);
                        const sel = seleccionadaId === obra?.id;
                        const esCentral = alm.tipo === 'central';
                        const estaCerrada = obra?.estado === 'cerrada';
                        const haciaIzq = alm.id === 'alm-ielosandes';
                        const label = NOMBRE_CORTO[alm.obraId] ?? alm.nombre;
                        return (
                            <g
                                key={alm.id}
                                transform={`translate(${p.x}, ${p.y})`}
                                className={cn(onPinClick && 'cursor-pointer')}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPinClick?.(alm.obraId);
                                    setHoverAlmId(null);
                                    setOpenAlmId((prev) => (prev === alm.id ? null : alm.id));
                                }}
                                onMouseEnter={() => setHoverAlmId(alm.id)}
                                onMouseLeave={() => setHoverAlmId(null)}
                            >
                                {sel && <circle r={16} fill="none" stroke={hex} strokeWidth={2.5} className="cpm-ring" />}
                                <circle r={16} fill="#ffffff" stroke={sel ? hex : '#cbd2e6'} strokeWidth={2} />
                                <circle r={8} fill={hex} />
                                {esCentral ? (
                                    <text textAnchor="middle" y={4.5} fontSize={10} fontWeight={800} fill="#ffffff">
                                        C
                                    </text>
                                ) : estaCerrada ? (
                                    <text textAnchor="middle" y={4.5} fontSize={10} fontWeight={800} fill="#ffffff">
                                        !
                                    </text>
                                ) : null}
                                {sel && <circle r={16} fill="none" stroke={hex} strokeWidth={6} opacity={0.12} />}
                                <title>{`${label} — ${ESTADO_META[estadoPorAlmacen[alm.id] ?? 'inactivo'].label}`}</title>
                                <text
                                    x={haciaIzq ? -24 : 24}
                                    y={-4}
                                    textAnchor={haciaIzq ? 'end' : 'start'}
                                    fontSize={13}
                                    fontWeight={600}
                                    fill={t.pinLabel}
                                    style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 4 }}
                                >
                                    {label}
                                </text>
                                <text
                                    x={haciaIzq ? -24 : 24}
                                    y={10}
                                    textAnchor={haciaIzq ? 'end' : 'start'}
                                    fontSize={11}
                                    fill={t.distrito}
                                    style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3 }}
                                >
                                    {estaCerrada ? `${obra?.distrito} · cierre` : obra?.distrito}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip resumido al pasar el cursor */}
                {hoverAlm && hp && hoverItems.length > 0 && (
                    <div
                        role="tooltip"
                        style={{ left: hp.left, top: hp.top }}
                        className={cn(
                            'pointer-events-none absolute z-30 w-64 overflow-hidden rounded-xl border border-line bg-surface/95 text-left shadow-pop',
                            hp.move,
                        )}
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                            <p className="truncate text-xs font-bold text-ink">
                                {NOMBRE_CORTO[hoverAlm.obraId] ?? hoverAlm.nombre}
                            </p>
                            <BadgeEstado estado={estadoPorAlmacen[hoverAlm.id] ?? 'inactivo'} mini />
                        </div>
                        <div className="space-y-1 px-3 py-2">
                            {hoverItems.slice(0, 3).map(({ material, cantidad, estado }) => (
                                <div key={material.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600">
                                        <span
                                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ESTADO_META[estado].dot)}
                                        />
                                        <span className="truncate">{material.nombre}</span>
                                    </span>
                                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink">
                                        {formatCantidad(cantidad)}{' '}
                                        <span className="font-normal text-muted">{material.unidad}</span>
                                    </span>
                                </div>
                            ))}
                            {hoverItems.length > 3 && (
                                <p className="pt-1 text-[10px] font-medium text-muted">
                                    +{hoverItems.length - 3} materiales más
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-between border-t border-line px-3 py-1.5 text-[10px] text-muted">
                            <span className="truncate">{hoverObra?.distrito}</span>
                            <span className="inline-flex shrink-0 items-center gap-1">
                                <IconMapPin size={11} />
                                Haz clic para el detalle
                            </span>
                        </div>
                    </div>
                )}

                {/* Popup ampliado al hacer clic */}
                {openAlm && op && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ left: op.left, top: op.top }}
                        className={cn(
                            'absolute z-40 max-h-[calc(100vh-3rem)] w-[26rem] max-w-[92%] overflow-y-auto rounded-2xl border border-line bg-surface text-left shadow-pop',
                            op.move,
                        )}
                    >
                        <GeoDetalle
                            alm={openAlm}
                            obras={obras}
                            almacenes={almacenes}
                            stock={stock}
                            materiales={materiales}
                            onClose={() => setOpenAlmId(null)}
                        />
                    </div>
                )}
            </div>

            {/* Leyenda */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <LegendItem color="#5468ff" label="Central" />
                <LegendItem color="#10b981" label="Frente óptimo" />
                <LegendItem color="#f59e0b" label="Stock bajo" />
                <LegendItem color="#ea580c" label="Crítico" />
                <LegendItem color="#7c3aed" label="Sobrante / cierre" />
                <LegendItem line color="#3f4df0" label="En tránsito" />
                <LegendItem line color="#7c3aed" dotted label="Redistribución sugerida" />
                <span className="ml-auto hidden font-medium sm:inline">
                    {vista === 'satelite' ? 'Vista satélite simulada · sin tiles externos' : 'Mapa esquemático · sin tiles externos'}
                </span>
            </div>
        </div>
    );
}

function LegendItem({
    color,
    line,
    dotted,
    label,
}: {
    color?: string;
    line?: boolean;
    dotted?: boolean;
    label: string;
}) {
    if (line) {
        return (
            <span className="flex items-center gap-1.5">
                <span
                    className={cn('h-0.5 w-4 rounded-full', dotted && 'opacity-80')}
                    style={{
                        backgroundColor: color,
                        backgroundImage: dotted ? 'repeating-linear-gradient(90deg, transparent 0 3px, #7c3aed 3px 7px)' : undefined,
                    }}
                />
                {label}
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}