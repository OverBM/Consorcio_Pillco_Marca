// Cuadro Comparativo y Cotizaciones (Macroproceso MP-17).
// Registro de ofertas de proveedores y selección de la ganadora por requerimiento.
// Datos desde props; alta y adjudicación vía `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatMoneda } from '../utils/format';
import type { Catalogos } from '../types';
import { IconCheck, IconPlus, IconSearch, IconX } from '../components/icons';

interface RequerimientoRef {
    id: number;
    codigo: string;
    detalles?: { id: number; material_id: number; cantidad: number | string }[];
}

interface ProveedorRef {
    id: number;
    ruc: string;
    razon_social: string;
}

interface CotizacionDetalleDb {
    id: number;
    material_id: number;
    cantidad: number | string;
    precio_unitario: number | string;
    material?: { id: number; nombre: string } | null;
}

interface CotizacionDb {
    id: number;
    requerimiento_id: number;
    proveedor_id: number;
    total: number | string;
    plazo_entrega_dias: number | null;
    condiciones: string | null;
    estado: string;
    motivo_seleccion?: string | null;
    requerimiento?: RequerimientoRef | null;
    proveedor?: ProveedorRef | null;
    detalles?: CotizacionDetalleDb[];
}

interface CotizacionesPageProps {
    cotizacionesDb?: CotizacionDb[];
    requerimientosDb?: RequerimientoRef[];
    proveedoresDb?: ProveedorRef[];
}

type CotizacionFila = Omit<CotizacionDb, 'id'> & { id: string };

interface LineaCot {
    material_id: string;
    cantidad: string;
    precio_unitario: string;
}

const ESTADO_META: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = {
    recibida: { tone: 'warn', label: 'En evaluación' },
    seleccionada: { tone: 'ok', label: 'Adjudicada' },
    rechazada: { tone: 'neutral', label: 'No seleccionada' },
};

export default function CotizacionesPage({
    cotizacionesDb = [],
    requerimientosDb = [],
    proveedoresDb = [],
}: CotizacionesPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const materiales = catalogos?.materiales ?? [];

    const crear = useHttp<{
        requerimiento_id: string;
        proveedor_id: string;
        plazo_entrega_dias: string;
        condiciones: string;
        detalles: LineaCot[];
    }>({
        requerimiento_id: '',
        proveedor_id: '',
        plazo_entrega_dias: '7',
        condiciones: '',
        detalles: [{ material_id: '', cantidad: '', precio_unitario: '' }] as LineaCot[],
    });

    const adjudicar = useHttp<{ motivo_seleccion: string }>({ motivo_seleccion: '' });

    const [busqueda, setBusqueda] = useState('');
    const [filtroReq, setFiltroReq] = useState('todos');
    const [seleccionando, setSeleccionando] = useState<CotizacionFila | null>(null);

    const nombreMaterial = (id: number) => materiales.find((m) => m.id === id)?.nombre ?? `Material #${id}`;

    const filas: CotizacionFila[] = useMemo(
        () => cotizacionesDb.map((c) => ({ ...c, id: String(c.id) })),
        [cotizacionesDb],
    );

    const filtradas = useMemo(
        () =>
            filas.filter((c) => {
                if (filtroReq !== 'todos' && String(c.requerimiento_id) !== filtroReq) return false;
                if (!busqueda.trim()) return true;
                const q = busqueda.toLowerCase();
                return (
                    (c.proveedor?.razon_social ?? '').toLowerCase().includes(q) ||
                    (c.proveedor?.ruc ?? '').includes(q) ||
                    (c.requerimiento?.codigo ?? '').toLowerCase().includes(q)
                );
            }),
        [filas, filtroReq, busqueda],
    );

    const total = filas.length;
    const adjudicadas = filas.filter((c) => c.estado === 'seleccionada').length;
    const reqsEnProceso = new Set(filas.map((c) => c.requerimiento_id)).size;
    const montoOfertado = filas.reduce((acc, c) => acc + Number(c.total), 0);

    const reqSel = requerimientosDb.find((r) => String(r.id) === crear.data.requerimiento_id) ?? null;

    const setLinea = (indice: number, campo: keyof LineaCot, valor: string) =>
        crear.setData('detalles', crear.data.detalles.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));

    const seleccionarRequerimiento = (valor: string) => {
        crear.setData('requerimiento_id', valor);
        const req = requerimientosDb.find((r) => String(r.id) === valor);
        if (req?.detalles?.length) {
            crear.setData(
                'detalles',
                req.detalles.map((d) => ({ material_id: String(d.material_id), cantidad: String(d.cantidad), precio_unitario: '' })),
            );
        }
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.requerimiento_id || !crear.data.proveedor_id) {
            notify.error('Selecciona el requerimiento y el proveedor.');
            return;
        }

        const detalles = crear.data.detalles
            .filter((l) => l.material_id && Number(l.cantidad) > 0 && Number(l.precio_unitario) >= 0)
            .map((l) => ({
                material_id: Number(l.material_id),
                cantidad: Number(l.cantidad),
                precio_unitario: Number(l.precio_unitario),
            }));

        if (detalles.length === 0) {
            notify.error('Agrega al menos un material con cantidad y precio.');
            return;
        }

        crear.transform(() => ({
            requerimiento_id: Number(crear.data.requerimiento_id),
            proveedor_id: Number(crear.data.proveedor_id),
            plazo_entrega_dias: Number(crear.data.plazo_entrega_dias) || null,
            condiciones: crear.data.condiciones || null,
            detalles,
        }));

        crear.post('/api/v1/cotizaciones', {
            onSuccess: () => {
                notify.success('Cotización registrada.');
                crear.setData({
                    requerimiento_id: '',
                    proveedor_id: '',
                    plazo_entrega_dias: '7',
                    condiciones: '',
                    detalles: [{ material_id: '', cantidad: '', precio_unitario: '' }],
                });
                router.reload({ only: ['cotizacionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la cotización.');
            },
        });
    };

    const confirmarAdjudicacion = (event: FormEvent) => {
        event.preventDefault();
        if (!seleccionando) return;
        if (!adjudicar.data.motivo_seleccion.trim()) {
            notify.error('Indica el motivo de la selección.');
            return;
        }

        adjudicar.transform(() => ({ motivo_seleccion: adjudicar.data.motivo_seleccion }));
        adjudicar.post(`/api/v1/cotizaciones/${seleccionando.id}/seleccionar`, {
            onSuccess: () => {
                notify.success('Cotización adjudicada como ganadora.');
                setSeleccionando(null);
                adjudicar.setData('motivo_seleccion', '');
                router.reload({ only: ['cotizacionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo adjudicar.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cuadro Comparativo y Cotizaciones"
                subtitle="Registro de ofertas de proveedores y selección de la ganadora por requerimiento"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Ofertas recibidas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{total}</p>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Requerimientos</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{reqsEnProceso}</p>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Adjudicadas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ok">{adjudicadas}</p>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Monto ofertado</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{formatMoneda(montoOfertado)}</p>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[220px] flex-1">
                                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar por proveedor, RUC o requerimiento…"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full rounded-lg border border-line bg-canvas py-1.5 pl-9 pr-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <Select value={filtroReq} onChange={(e) => setFiltroReq(e.target.value)} aria-label="Filtrar requerimiento">
                                <option value="todos">Todos los requerimientos</option>
                                {requerimientosDb.map((r) => (
                                    <option key={r.id} value={String(r.id)}>{r.codigo}</option>
                                ))}
                            </Select>
                        </div>
                    </Card>

                    <Card title={`Cotizaciones (${filtradas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin cotizaciones registradas" hint="Registra la primera oferta desde el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="No hay cotizaciones que coincidan con los filtros."
                                columns={[
                                    { key: 'req', header: 'Requerimiento', mono: true, cell: (c) => c.requerimiento?.codigo ?? `#${c.requerimiento_id}` },
                                    {
                                        key: 'proveedor',
                                        header: 'Proveedor / RUC',
                                        cell: (c) => (
                                            <div>
                                                <p className="text-xs font-semibold text-ink">{c.proveedor?.razon_social ?? `Proveedor #${c.proveedor_id}`}</p>
                                                <p className="font-mono text-[11px] text-muted">RUC: {c.proveedor?.ruc ?? '—'}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'total', header: 'Precio ofertado', align: 'right', cell: (c) => <span className="font-mono font-bold text-ink">{formatMoneda(Number(c.total))}</span> },
                                    { key: 'plazo', header: 'Plazo', align: 'center', cell: (c) => `${c.plazo_entrega_dias ?? '—'} días` },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (c) => {
                                            const meta = ESTADO_META[c.estado] ?? { tone: 'neutral' as const, label: c.estado };
                                            return <Badge tone={meta.tone}>{meta.label}</Badge>;
                                        },
                                    },
                                    {
                                        key: 'acciones',
                                        header: 'Acciones',
                                        align: 'right',
                                        cell: (c) =>
                                            c.estado === 'recibida' ? (
                                                <button onClick={() => setSeleccionando(c)} className="btn-secondary !px-2 !py-1 text-xs" title="Adjudicar cotización">
                                                    <IconCheck size={13} /> Adjudicar
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-muted">—</span>
                                            ),
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Registrar Oferta" subtitle="Cotización de un proveedor" onSubmit={enviar} className="text-xs">
                    <FormSection title="Requerimiento y proveedor" columns={1}>
                        <Field label="Requerimiento" required>
                            <Select value={crear.data.requerimiento_id} onChange={(e) => seleccionarRequerimiento(e.target.value)}>
                                <option value="">Selecciona requerimiento…</option>
                                {requerimientosDb.map((r) => (
                                    <option key={r.id} value={String(r.id)}>{r.codigo}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Proveedor" required>
                            <Select value={crear.data.proveedor_id} onChange={(e) => crear.setData('proveedor_id', e.target.value)}>
                                <option value="">Selecciona proveedor…</option>
                                {proveedoresDb.map((p) => (
                                    <option key={p.id} value={String(p.id)}>{p.razon_social}</option>
                                ))}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Plazo (días)">
                                <Input type="number" min={1} value={crear.data.plazo_entrega_dias} onChange={(e) => crear.setData('plazo_entrega_dias', e.target.value)} />
                            </Field>
                            <Field label="Condiciones">
                                <Input value={crear.data.condiciones} onChange={(e) => crear.setData('condiciones', e.target.value)} placeholder="Crédito 30 días…" />
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="Detalle de la oferta" columns={1}>
                        <div className="space-y-2">
                            {crear.data.detalles.map((linea, i) => (
                                <div key={i} className="rounded-lg border border-line p-2">
                                    <div className="flex items-center gap-2">
                                        <Select value={linea.material_id} onChange={(e) => setLinea(i, 'material_id', e.target.value)} className="!py-1.5 flex-1" aria-label="Material">
                                            <option value="">Material…</option>
                                            {materiales.map((m) => (
                                                <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                                            ))}
                                        </Select>
                                        {crear.data.detalles.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => crear.setData('detalles', crear.data.detalles.filter((_, idx) => idx !== i))}
                                                aria-label="Quitar material"
                                                className="rounded p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                                            >
                                                <IconX size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {reqSel && linea.material_id && (
                                        <p className="mt-1 text-[10px] text-muted">Solicitado: {nombreMaterial(Number(linea.material_id))}</p>
                                    )}
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.001"
                                            value={linea.cantidad}
                                            onChange={(e) => setLinea(i, 'cantidad', e.target.value)}
                                            placeholder="Cantidad"
                                            className="field !py-1.5"
                                            aria-label="Cantidad"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={linea.precio_unitario}
                                            onChange={(e) => setLinea(i, 'precio_unitario', e.target.value)}
                                            placeholder="P. unitario"
                                            className="field !py-1.5"
                                            aria-label="Precio unitario"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => crear.setData('detalles', [...crear.data.detalles, { material_id: '', cantidad: '', precio_unitario: '' }])}
                                className="text-[11px] font-bold text-brand-600 hover:underline"
                            >
                                + Añadir material
                            </button>
                        </div>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Oferta
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal open={Boolean(seleccionando)} onClose={() => setSeleccionando(null)} title="Adjudicar cotización">
                <form onSubmit={confirmarAdjudicacion} className="space-y-4 text-xs">
                    {seleccionando && (
                        <div className="rounded-lg border border-line bg-canvas p-3">
                            <p className="font-semibold text-ink">{seleccionando.proveedor?.razon_social ?? `Proveedor #${seleccionando.proveedor_id}`}</p>
                            <p className="text-muted">Oferta: {formatMoneda(Number(seleccionando.total))}</p>
                        </div>
                    )}
                    <Field label="Motivo de la selección" required>
                        <Textarea
                            value={adjudicar.data.motivo_seleccion}
                            onChange={(e) => adjudicar.setData('motivo_seleccion', e.target.value)}
                            rows={3}
                            placeholder="Mejor relación costo-plazo y cumplimiento técnico…"
                        />
                    </Field>
                    <div className="flex justify-end gap-2 border-t border-line pt-2">
                        <button type="button" onClick={() => setSeleccionando(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-soft">
                            Cancelar
                        </button>
                        <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                            Adjudicar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
