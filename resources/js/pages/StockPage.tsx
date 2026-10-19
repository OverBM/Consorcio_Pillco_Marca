// Matriz de Stock — Consulta comparativa multi-almacén, saldos en tiempo real,
// búsqueda por nombre/código y kardex por almacén (Bizagi 24, 25).
// Datos desde props `stockDb`; kardex vía `GET /api/v1/stock/almacenes/{id}/kardex`.

import { useMemo, useState } from 'react';
import { useHttp } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Select } from '../components/form';
import { EmptyState } from '../components/EmptyState';
import { DataTable } from '../components/DataTable';
import { formatCantidad, formatNum, formatFs } from '../utils/format';
import { toCsv, downloadCsv } from '../utils/csv';
import { IconDownload, IconSearch, IconRepeat } from '../components/icons';

interface StockDbRow {
    id: string;
    almacenId: string;
    almacenNombre: string;
    materialId: string;
    materialCodigo: string;
    materialNombre: string;
    unidad: string;
    cantidad: number;
    cantidadReservada: number;
    disponible: number;
    stockMinimo: number;
    stockSeguridad: number;
    puntoReorden: number;
    estado: string;
}

interface KardexMov {
    id: number;
    tipo_movimiento: string;
    cantidad: number | string;
    saldo_resultante: number | string;
    documento_tipo: string | null;
    documento_id: number | null;
    observacion: string | null;
    created_at: string;
    usuario?: { nombre: string } | null;
}

interface StockPageProps {
    stockDb?: StockDbRow[];
    almacenesDb?: AlmacenResumen[];
}

type FiltroEstado = 'todos' | 'optimo' | 'bajo' | 'critico' | 'reservado';

const FILTROS_ESTADO: { value: FiltroEstado; label: string }[] = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'optimo', label: 'Óptimo' },
    { value: 'bajo', label: 'Stock bajo' },
    { value: 'critico', label: 'Crítico' },
    { value: 'reservado', label: 'Con reservas' },
];

const ESTADO_META: Record<
    string,
    { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' }
> = {
    optimo: { label: 'Óptimo', tone: 'ok' },
    bajo: { label: 'Stock bajo', tone: 'warn' },
    critico: { label: 'Crítico', tone: 'danger' },
};

interface MaterialResumen {
    id: string;
    codigo: string;
    nombre: string;
    unidad: string;
    stockMinimo: number;
}

interface AlmacenResumen {
    id: string;
    nombre: string;
}

export default function StockPage({
    stockDb = [],
    almacenesDb = [],
}: StockPageProps) {
    const [busqueda, setBusqueda] = useState('');
    const [almFiltro, setAlmFiltro] = useState('todos');
    const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('todos');
    const [detalleId, setDetalleId] = useState<string | null>(null);

    const kardexHttp = useHttp<Record<string, string>>({});
    const [kardex, setKardex] = useState<KardexMov[]>([]);
    const [kardexAlmacen, setKardexAlmacen] = useState<string | null>(null);

    const almacenes: AlmacenResumen[] = useMemo(() => {
        const mapa = new Map<string, AlmacenResumen>();
        for (const a of almacenesDb) {
            mapa.set(a.id, a);
        }
        for (const r of stockDb) {
            if (!mapa.has(r.almacenId)) {
                mapa.set(r.almacenId, {
                    id: r.almacenId,
                    nombre: r.almacenNombre,
                });
            }
        }
        return Array.from(mapa.values());
    }, [almacenesDb, stockDb]);

    const materiales: MaterialResumen[] = useMemo(() => {
        const mapa = new Map<string, MaterialResumen>();
        for (const r of stockDb) {
            if (!mapa.has(r.materialId)) {
                mapa.set(r.materialId, {
                    id: r.materialId,
                    codigo: r.materialCodigo,
                    nombre: r.materialNombre,
                    unidad: r.unidad,
                    stockMinimo: r.stockMinimo,
                });
            }
        }
        return Array.from(mapa.values());
    }, [stockDb]);

    const celda = (
        almacenId: string,
        materialId: string,
    ): StockDbRow | undefined =>
        stockDb.find(
            (r) => r.almacenId === almacenId && r.materialId === materialId,
        );

    const almacenesVisibles =
        almFiltro === 'todos'
            ? almacenes
            : almacenes.filter((a) => a.id === almFiltro);

    const materialesFiltrados = useMemo(
        () =>
            materiales.filter((m) => {
                if (busqueda.trim() !== '') {
                    const q = busqueda.toLowerCase();
                    const hay =
                        m.nombre.toLowerCase().includes(q) ||
                        m.codigo.toLowerCase().includes(q);
                    if (!hay) return false;
                }
                if (estadoFiltro === 'todos') return true;
                return almacenesVisibles.some((a) => {
                    const c = celda(a.id, m.id);
                    if (!c) return false;
                    if (estadoFiltro === 'reservado')
                        return c.cantidadReservada > 0;
                    if (estadoFiltro === 'critico')
                        return c.estado === 'critico' || c.estado === 'bajo';
                    return c.estado === estadoFiltro;
                });
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [materiales, busqueda, estadoFiltro, almacenesVisibles, stockDb],
    );

    const exportar = () => {
        const rows = materialesFiltrados.map((m) => {
            const obj: Record<string, unknown> = {
                Material: m.nombre,
                Código: m.codigo,
                Unidad: m.unidad,
                'Stock mín.': m.stockMinimo,
            };
            for (const a of almacenesVisibles) {
                obj[a.nombre] = celda(a.id, m.id)?.cantidad ?? 0;
            }
            return obj;
        });
        const fecha = new Date().toISOString().slice(0, 10);
        downloadCsv(`matriz-stock-${fecha}.csv`, toCsv(rows));
    };

    const materialDetalle = materiales.find((m) => m.id === detalleId) ?? null;
    const celdasDetalle = materialDetalle
        ? stockDb.filter((r) => r.materialId === materialDetalle.id)
        : [];

    const verKardex = (almacenId: string) => {
        if (!materialDetalle) return;
        setKardexAlmacen(almacenId);
        setKardex([]);
        void kardexHttp.get(
            `/api/v1/stock/almacenes/${almacenId}/kardex?material_id=${materialDetalle.id}`,
            {
                onSuccess: (res) =>
                    setKardex((res as { data?: KardexMov[] })?.data ?? []),
            },
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Matriz de Stock"
                subtitle="Consulta integral de inventarios multi-almacén y kardex por material"
                actions={
                    <button
                        className="btn-secondary"
                        onClick={exportar}
                        disabled={materialesFiltrados.length === 0}
                    >
                        <IconDownload size={15} />
                        Exportar Matriz CSV
                    </button>
                }
            />

            <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-field border-line bg-canvas text-muted flex items-center gap-2 border px-3 py-2">
                        <IconSearch size={16} />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar código o nombre…"
                            className="text-ink placeholder:text-muted/70 w-full bg-transparent text-xs outline-none"
                        />
                    </div>
                    <Select
                        value={almFiltro}
                        onChange={(e) => setAlmFiltro(e.target.value)}
                        aria-label="Filtrar por almacén"
                    >
                        <option value="todos">
                            Todos los almacenes ({almacenes.length})
                        </option>
                        {almacenes.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.nombre}
                            </option>
                        ))}
                    </Select>
                    <Select
                        value={estadoFiltro}
                        onChange={(e) =>
                            setEstadoFiltro(e.target.value as FiltroEstado)
                        }
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

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-line bg-soft/40 border-b">
                                <th className="text-muted px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap uppercase">
                                    Material
                                </th>
                                {almacenesVisibles.map((a) => (
                                    <th
                                        key={a.id}
                                        className="text-muted px-3 py-2.5 text-right text-[11px] font-bold tracking-wide whitespace-nowrap uppercase"
                                    >
                                        {a.nombre}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {materialesFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={almacenesVisibles.length + 1}>
                                        <EmptyState
                                            title="Sin resultados"
                                            hint="Ajusta los filtros o término de búsqueda."
                                        />
                                    </td>
                                </tr>
                            )}
                            {materialesFiltrados.map((m) => (
                                <tr
                                    key={m.id}
                                    onClick={() => {
                                        setDetalleId(m.id);
                                        setKardex([]);
                                        setKardexAlmacen(null);
                                    }}
                                    className="border-line/70 hover:bg-brand-50/40 cursor-pointer border-b transition-colors last:border-0"
                                >
                                    <td className="px-3 py-2.5">
                                        <p className="text-ink font-semibold">
                                            {m.nombre}
                                        </p>
                                        <p className="text-muted text-xs">
                                            {m.codigo} · {m.unidad} · Mínimo:{' '}
                                            {formatNum(m.stockMinimo)}
                                        </p>
                                    </td>
                                    {almacenesVisibles.map((a) => {
                                        const c = celda(a.id, m.id);
                                        const cantidad = c?.cantidad ?? 0;
                                        const meta =
                                            ESTADO_META[c?.estado ?? 'critico'];
                                        return (
                                            <td
                                                key={a.id}
                                                className="px-3 py-2.5 text-right align-top"
                                            >
                                                <p className="num text-ink text-sm font-bold">
                                                    {formatNum(cantidad)}
                                                </p>
                                                <p className="text-muted text-[11px]">
                                                    {m.unidad}
                                                </p>
                                                <div className="mt-1 flex flex-col items-end gap-0.5">
                                                    <Badge tone={meta.tone}>
                                                        {meta.label}
                                                    </Badge>
                                                    {(c?.cantidadReservada ??
                                                        0) > 0 && (
                                                        <Badge tone="neutral">
                                                            Reserv.:{' '}
                                                            {formatNum(
                                                                c?.cantidadReservada ??
                                                                    0,
                                                            )}
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

            <Modal
                open={!!materialDetalle}
                onClose={() => setDetalleId(null)}
                title={materialDetalle?.nombre ?? ''}
                wide
            >
                {materialDetalle && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge tone="neutral">
                                {materialDetalle.codigo}
                            </Badge>
                            <span className="text-muted">
                                Unidad:{' '}
                                <strong className="text-ink">
                                    {materialDetalle.unidad}
                                </strong>
                            </span>
                            <span className="text-muted">
                                Mínimo de reposición:{' '}
                                <strong className="text-ink">
                                    {formatNum(materialDetalle.stockMinimo)}{' '}
                                    {materialDetalle.unidad}
                                </strong>
                            </span>
                        </div>

                        <div>
                            <h4 className="text-ink mb-2 text-sm font-bold">
                                Disponibilidad por almacén
                            </h4>
                            {celdasDetalle.length === 0 ? (
                                <p className="text-muted text-sm">
                                    Sin existencias registradas para este
                                    material.
                                </p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {celdasDetalle.map((c) => {
                                        const meta = ESTADO_META[c.estado] ?? {
                                            label: c.estado,
                                            tone: 'neutral' as const,
                                        };
                                        return (
                                            <div
                                                key={c.id}
                                                className="border-line bg-surface flex flex-col justify-between rounded-xl border p-3 shadow-sm"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-ink text-xs font-bold">
                                                        {c.almacenNombre}
                                                    </p>
                                                    <Badge tone={meta.tone}>
                                                        {meta.label}
                                                    </Badge>
                                                </div>
                                                <p className="num text-ink mt-1 text-lg font-bold">
                                                    {formatNum(c.cantidad)}{' '}
                                                    <span className="text-muted text-xs font-normal">
                                                        {c.unidad}
                                                    </span>
                                                </p>
                                                <div className="text-muted mt-1 space-y-0.5 text-[11px]">
                                                    <p>
                                                        Disponible:{' '}
                                                        {formatCantidad(
                                                            c.disponible,
                                                        )}
                                                    </p>
                                                    <p>
                                                        Reservado:{' '}
                                                        {formatCantidad(
                                                            c.cantidadReservada,
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        verKardex(c.almacenId)
                                                    }
                                                    className="text-brand-600 mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold hover:underline"
                                                >
                                                    <IconRepeat size={12} />
                                                    Ver kardex
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-ink mb-2 text-sm font-bold">
                                Kardex{' '}
                                {kardexAlmacen
                                    ? `— ${almacenes.find((a) => a.id === kardexAlmacen)?.nombre ?? 'almacén'}`
                                    : ''}
                            </h4>
                            {!kardexAlmacen ? (
                                <p className="text-muted text-sm">
                                    Selecciona un almacén para consultar sus
                                    movimientos.
                                </p>
                            ) : kardexHttp.processing ? (
                                <p className="text-muted text-sm">
                                    Cargando movimientos…
                                </p>
                            ) : kardex.length === 0 ? (
                                <p className="text-muted text-sm">
                                    Sin movimientos registrados en este almacén.
                                </p>
                            ) : (
                                <DataTable
                                    emptyLabel="Sin movimientos."
                                    columns={[
                                        {
                                            key: 'fecha',
                                            header: 'Fecha',
                                            cell: (r) => formatFs(r.created_at),
                                        },
                                        {
                                            key: 'tipo',
                                            header: 'Tipo',
                                            cell: (r) => (
                                                <Badge
                                                    tone={
                                                        r.tipo_movimiento.startsWith(
                                                            'ingreso',
                                                        )
                                                            ? 'ok'
                                                            : 'warn'
                                                    }
                                                >
                                                    {r.tipo_movimiento}
                                                </Badge>
                                            ),
                                        },
                                        {
                                            key: 'cantidad',
                                            header: 'Cantidad',
                                            align: 'right',
                                            mono: true,
                                            cell: (r) =>
                                                formatNum(Number(r.cantidad)),
                                        },
                                        {
                                            key: 'saldo',
                                            header: 'Saldo',
                                            align: 'right',
                                            mono: true,
                                            cell: (r) =>
                                                formatNum(
                                                    Number(r.saldo_resultante),
                                                ),
                                        },
                                        {
                                            key: 'doc',
                                            header: 'Documento',
                                            cell: (r) =>
                                                r.documento_tipo
                                                    ? `${r.documento_tipo} #${r.documento_id ?? ''}`
                                                    : '—',
                                        },
                                        {
                                            key: 'usuario',
                                            header: 'Responsable',
                                            cell: (r) =>
                                                r.usuario?.nombre ?? '—',
                                        },
                                        {
                                            key: 'obs',
                                            header: 'Observación',
                                            cell: (r) => (
                                                <span className="text-muted block max-w-48 truncate text-xs">
                                                    {r.observacion ?? '—'}
                                                </span>
                                            ),
                                        },
                                    ]}
                                    rows={kardex.map((r) => ({
                                        ...r,
                                        id: String(r.id),
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
