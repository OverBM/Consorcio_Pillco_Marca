// Matriz de Stock — Consulta comparativa multi-almacén, saldos en tiempo real,
// búsqueda por nombre/código, ubicación física exacta dentro del almacén,
// derivación a almacenes cercanos en caso de falta de stock (Bizagi 24, 25) y exportación.

import { useMemo, useState } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Select } from '../components/form';
import { EmptyState } from '../components/EmptyState';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { estadoDeStock, ESTADO_META, type StockEstado } from '../utils/estados';
import { formatCantidad, formatKm, formatNum } from '../utils/format';
import { haversineDistanceKm } from '../utils/geo';
import { toCsv, downloadCsv } from '../utils/csv';
import {
    IconBoxes,
    IconDownload,
    IconMapPin,
    IconRepeat,
    IconSearch,
    IconTruck,
} from '../components/icons';

type FiltroEstado = 'todos' | 'optimo' | 'reservado' | 'critico' | 'sobrante';

const FILTROS_ESTADO: { value: FiltroEstado; label: string }[] = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'optimo', label: 'Disponible (óptimo)' },
    { value: 'reservado', label: 'Reservado (partida)' },
    { value: 'critico', label: 'Crítico / bajo' },
    { value: 'sobrante', label: 'Sobrante por cierre' },
];

const UBICACION_MOCK: Record<string, string> = {
    'alm-central': 'Rack A-1, nave techada principal',
    'alm-eltambo': 'Zona Este, bahía techada P-2',
    'alm-cunas': 'Plataforma Sur, caseta de materiales',
    'alm-chilca': 'Caseta ribereña B-1, tramo Mantaro',
    'alm-ielosandes': 'Módulo de cierre, almacén de desmovilización',
};

export default function StockPage() {
    const { obras, almacenes, materiales, stock, movimientos } = useAppStore();
    const { url } = usePage();
    const params = useMemo(() => new URLSearchParams(url.split('?')[1] ?? ''), [url]);
    const obraParam = params.get('obra');
    const almacenParam = params.get('almacen');

    const [busqueda, setBusqueda] = useState('');
    const [catFiltro, setCatFiltro] = useState('todas');
    const [almFiltro, setAlmFiltro] = useState(() => {
        if (almacenParam && almacenes.some((a) => a.id === almacenParam)) {
            return almacenParam;
        }
        if (obraParam) {
            const encontrado = almacenes.find((a) => a.obraId === obraParam);
            if (encontrado) return encontrado.id;
        }
        return 'todos';
    });
    const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('todos');
    const [detalle, setDetalle] = useState<string | null>(null);

    const categorias = useMemo(() => Array.from(new Set(materiales.map((m) => m.categoria))), [materiales]);
    const obrasActivas = obras.filter((o) => o.estado === 'activa');

    const materialesFiltrados = useMemo(
        () =>
            materiales.filter((m) => {
                if (busqueda.trim() !== '') {
                    const q = busqueda.toLowerCase();
                    const matchNombre = m.nombre.toLowerCase().includes(q);
                    const matchId = m.id.toLowerCase().includes(q);
                    const matchCat = m.categoria.toLowerCase().includes(q);
                    if (!matchNombre && !matchId && !matchCat) return false;
                }
                if (catFiltro !== 'todas' && m.categoria !== catFiltro) {
                    return false;
                }
                if (estadoFiltro === 'todos') {
                    return true;
                }
                return almacenes.some((a) => {
                    if (almFiltro !== 'todos' && a.id !== almFiltro) {
                        return false;
                    }
                    const obra = obras.find((o) => o.id === a.obraId);
                    const cantidad = stock.stock[a.id]?.[m.id] ?? 0;
                    const st = estadoDeStock(cantidad, m.stockMinimo, obra?.estado ?? 'cerrada');
                    if (estadoFiltro === 'reservado') {
                        return (stock.reservas[a.id]?.[m.id]?.length ?? 0) > 0;
                    }
                    if (estadoFiltro === 'critico') {
                        return st === 'critico' || st === 'bajo';
                    }
                    if (estadoFiltro === 'sobrante') {
                        return st === 'sobrante';
                    }
                    return st === estadoFiltro;
                });
            }),
        [materiales, busqueda, catFiltro, almFiltro, estadoFiltro, almacenes, stock, obras],
    );

    const almacenesVisibles = almFiltro === 'todos' ? almacenes : almacenes.filter((a) => a.id === almFiltro);

    const matriz = useMemo(() => {
        const header: string[] = ['Material', 'Categoría', 'Unidad', 'Stock mín.'];
        for (const a of almacenesVisibles) {
            header.push(a.nombre);
        }
        const rows: (string | number)[][] = materialesFiltrados.map((m) => {
            const row: (string | number)[] = [m.nombre, m.categoria, m.unidad, m.stockMinimo];
            for (const a of almacenesVisibles) {
                const cantidad = stock.stock[a.id]?.[m.id] ?? 0;
                row.push(cantidad);
            }
            return row;
        });
        return { header, rows };
    }, [materialesFiltrados, almacenesVisibles, stock.stock]);

    const exportar = () => {
        const csv = toCsv(
            matriz.rows.map((r) => {
                const obj: Record<string, unknown> = {};
                matriz.header.forEach((h, i) => {
                    obj[h] = r[i];
                });
                return obj;
            }),
        );
        const fecha = new Date().toISOString().slice(0, 10);
        downloadCsv(`matriz-stock-${fecha}.csv`, csv);
    };

    const materialDetalle = materiales.find((m) => m.id === detalle) ?? null;
    const movsDetalle = materialDetalle
        ? movimientos.filter((mv) => mv.materialId === materialDetalle.id)
        : [];

    // Almacenes con stock del material para derivación por cercanía
    const derivacionesCercanas = useMemo(() => {
        if (!materialDetalle) return [];
        const almReferencia = almacenes.find((a) => a.id === almFiltro) ?? almacenes[0];

        return almacenes
            .map((alm) => {
                const cant = stock.stock[alm.id]?.[materialDetalle.id] ?? 0;
                const km = haversineDistanceKm(almReferencia.coords, alm.coords);
                const obra = obras.find((o) => o.id === alm.obraId);
                return {
                    almacen: alm,
                    obra,
                    cantidad: cant,
                    km,
                    disponible: cant > 0,
                };
            })
            .sort((a, b) => b.cantidad - a.cantidad || a.km - b.km);
    }, [materialDetalle, almFiltro, almacenes, stock.stock, obras]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Matriz de Stock"
                subtitle="Consulta integral de inventarios multi-almacén, ubicaciones físicas y saldos — Valle del Mantaro"
                actions={
                    <button className="btn-secondary" onClick={exportar} disabled={matriz.rows.length === 0}>
                        <IconDownload size={15} />
                        Exportar Matriz CSV
                    </button>
                }
            />

            {/* Buscador y Filtros */}
            <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-2 rounded-field border border-line bg-canvas px-3 py-2 text-sm text-muted">
                        <IconSearch size={16} />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar código o nombre…"
                            className="w-full bg-transparent text-ink outline-none placeholder:text-muted/70 text-xs"
                        />
                    </div>
                    <Select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} aria-label="Filtrar por categoría">
                        <option value="todas">Todas las categorías</option>
                        {categorias.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </Select>
                    <Select value={almFiltro} onChange={(e) => setAlmFiltro(e.target.value)} aria-label="Filtrar por almacén">
                        <option value="todos">Todos los almacenes ({almacenes.length})</option>
                        {almacenes.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.nombre}
                            </option>
                        ))}
                    </Select>
                    <Select
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value as FiltroEstado)}
                        aria-label="Filtrar por estado"
                    >
                        {FILTROS_ESTADO.map((f) => (
                            <option key={f.value} value={f.value}>
                                {f.label}
                            </option>
                        ))}
                    </Select>
                </div>
            </Card>

            {/* Tabla Comparativa de Matriz */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-line bg-soft/40">
                                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                                    Material y Categoría
                                </th>
                                {almacenesVisibles.map((a) => (
                                    <th
                                        key={a.id}
                                        className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-muted"
                                    >
                                        <span className="block text-ink">{a.nombre.split(' ').slice(0, 2).join(' ')}</span>
                                        <span className="font-normal normal-case text-muted/80 text-[10px]">
                                            {obras.find((o) => o.id === a.obraId)?.nombre.split(' ').slice(0, 2).join(' ') ?? ''}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {materialesFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={almacenesVisibles.length + 1}>
                                        <EmptyState title="Sin resultados" hint="Ajusta los filtros o término de búsqueda." />
                                    </td>
                                </tr>
                            )}
                            {materialesFiltrados.map((m) => (
                                <tr
                                    key={m.id}
                                    onClick={() => setDetalle(m.id)}
                                    className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-brand-50/40"
                                >
                                    <td className="px-3 py-2.5">
                                        <p className="font-semibold text-ink">{m.nombre}</p>
                                        <p className="text-xs text-muted">
                                            {m.categoria} · {m.unidad} · Mínimo: {formatNum(m.stockMinimo)}
                                        </p>
                                    </td>
                                    {almacenesVisibles.map((a) => {
                                        const obra = obras.find((o) => o.id === a.obraId);
                                        const cantidad = stock.stock[a.id]?.[m.id] ?? 0;
                                        const st = estadoDeStock(cantidad, m.stockMinimo, obra?.estado ?? 'cerrada');
                                        const reservas = stock.reservas[a.id]?.[m.id];
                                        const reservado = (reservas ?? []).reduce((acc, r) => acc + r.cantidad, 0);
                                        return (
                                            <td key={a.id} className="px-3 py-2.5 text-right align-top">
                                                <p className="num text-sm font-bold text-ink">{formatNum(cantidad)}</p>
                                                <p className="text-[11px] text-muted">{m.unidad}</p>
                                                <div className="mt-1 flex flex-col items-end gap-0.5">
                                                    <Badge
                                                        tone={
                                                            st === 'optimo'
                                                                ? 'ok'
                                                                : st === 'bajo'
                                                                ? 'warn'
                                                                : st === 'critico'
                                                                ? 'danger'
                                                                : st === 'sobrante'
                                                                ? 'violet'
                                                                : 'neutral'
                                                        }
                                                    >
                                                        {ESTADO_META[st].label}
                                                    </Badge>
                                                    {reservado > 0 && (
                                                        <Badge tone="neutral" className="bg-brand-50 text-brand-700 text-[9px]">
                                                            Reserv.: {formatNum(reservado)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Detalle de Material, Ubicación Física y Derivación Cercana */}
            <Modal open={!!materialDetalle} onClose={() => setDetalle(null)} title={materialDetalle?.nombre ?? ''} wide>
                {materialDetalle && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge tone="neutral">{materialDetalle.categoria}</Badge>
                            <span className="text-sm text-muted">
                                Unidad: <strong className="text-ink">{materialDetalle.unidad}</strong>
                            </span>
                            <span className="text-sm text-muted">
                                Umbral mínimo de reposición: <strong className="text-ink">{formatNum(materialDetalle.stockMinimo)} {materialDetalle.unidad}</strong>
                            </span>
                        </div>

                        {/* Saldos y Ubicación Física Exacta */}
                        <div>
                            <h4 className="mb-2 text-sm font-bold text-ink">Disponibilidad y Ubicación Física en Almacén</h4>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {almacenes.map((a) => {
                                    const obra = obras.find((o) => o.id === a.obraId);
                                    const cantidad = stock.stock[a.id]?.[materialDetalle.id] ?? 0;
                                    const st = estadoDeStock(cantidad, materialDetalle.stockMinimo, obra?.estado ?? 'cerrada');
                                    const reservas = stock.reservas[a.id]?.[materialDetalle.id] ?? [];
                                    const ubicacion = UBICACION_MOCK[a.id] ?? 'Zona de acopio general';

                                    return (
                                        <div key={a.id} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 shadow-sm">
                                            <div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-ink">{a.nombre}</p>
                                                    <Badge
                                                        tone={
                                                            st === 'optimo'
                                                                ? 'ok'
                                                                : st === 'bajo'
                                                                ? 'warn'
                                                                : st === 'critico'
                                                                ? 'danger'
                                                                : st === 'sobrante'
                                                                ? 'violet'
                                                                : 'neutral'
                                                        }
                                                    >
                                                        {ESTADO_META[st].label}
                                                    </Badge>
                                                </div>
                                                <p className="num mt-1 text-lg font-bold text-ink">
                                                    {formatNum(cantidad)}{' '}
                                                    <span className="text-xs font-normal text-muted">{materialDetalle.unidad}</span>
                                                </p>
                                                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                                                    <IconMapPin size={12} className="text-brand-500 shrink-0" />
                                                    <span className="truncate">{ubicacion}</span>
                                                </div>

                                                {reservas.length > 0 && (
                                                    <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-xs text-muted">
                                                        {reservas.map((r) => (
                                                            <li key={r.partida}>
                                                                <span className="font-medium text-brand-700">{r.partida}</span> — {formatNum(r.cantidad)}{' '}
                                                                {materialDetalle.unidad}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Derivación y Búsqueda en Almacenes Cercanos (Bizagi 25) */}
                        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-brand-900">
                                <IconRepeat size={16} />
                                Búsqueda y Disponibilidad en Red Multi-Almacén
                            </h4>
                            <p className="text-xs text-brand-700 mt-0.5">
                                Almacenes registrados ordenados por stock disponible y distancia en kilómetros
                            </p>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {derivacionesCercanas.map(({ almacen, obra, cantidad, km, disponible }) => (
                                    <div
                                        key={almacen.id}
                                        className={`flex items-center justify-between rounded-lg border p-2.5 text-xs ${
                                            disponible
                                                ? 'border-emerald-200 bg-surface'
                                                : 'border-line bg-soft/50 text-muted'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-ink truncate">{almacen.nombre}</p>
                                            <p className="text-[11px] text-muted">
                                                {obra?.distrito} · {formatKm(km)}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`font-mono font-bold ${disponible ? 'text-emerald-700' : 'text-muted'}`}>
                                                {formatCantidad(cantidad)} {materialDetalle.unidad}
                                            </span>
                                            {disponible && (
                                                <Link
                                                    href={`/transferencias?crear=solicitud&materialId=${materialDetalle.id}&origen=${almacen.id}`}
                                                    className="mt-1 block text-[10px] font-bold text-brand-600 hover:underline"
                                                >
                                                    Transferir ➔
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Movimientos Recientes */}
                        <div>
                            <h4 className="mb-2 text-sm font-bold text-ink">Kardex de Movimientos Recientes</h4>
                            {movsDetalle.length === 0 ? (
                                <p className="text-sm text-muted">Sin movimientos registrados para este material.</p>
                            ) : (
                                <DataTable<{ id: string }>
                                    emptyLabel="Sin movimientos."
                                    columns={[
                                        { key: 'fecha', header: 'Fecha' },
                                        {
                                            key: 'tipo',
                                            header: 'Tipo',
                                            cell: (r) => {
                                                const tipo = (r as { tipo?: string }).tipo;
                                                return (
                                                    <Badge tone={tipo === 'ingreso' ? 'ok' : tipo === 'salida' ? 'warn' : 'danger'}>
                                                        {tipo}
                                                    </Badge>
                                                );
                                            },
                                        },
                                        { key: 'almacen', header: 'Almacén' },
                                        { key: 'cant', header: 'Cantidad', align: 'right', mono: true },
                                        { key: 'ref', header: 'Referencia / Guía' },
                                        { key: 'usr', header: 'Responsable' },
                                    ]}
                                    rows={movsDetalle.map((mv) => ({
                                        id: mv.id,
                                        fecha: mv.fecha,
                                        tipo: mv.tipo,
                                        almacen: almacenes.find((a) => a.id === mv.almacenId)?.nombre ?? mv.almacenId,
                                        cant: `${formatNum(mv.cantidad)} ${materialDetalle.unidad}`,
                                        ref: mv.referencia,
                                        usr: mv.usuario,
                                    }))}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}