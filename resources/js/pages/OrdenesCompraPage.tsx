// Órdenes de Compra (Macroproceso MP-18).
// Emisión formal de compromisos de adquisición a partir de una cotización adjudicada.
// Datos desde props; alta vía `useHttp` contra `/api/v1/ordenes-compra`.

import { useMemo, useState, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Field, Input, Select, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatMoneda } from '../utils/format';
import type { Catalogos } from '../types';
import { IconPlus, IconSearch } from '../components/icons';

interface CotizacionLineaDb {
    material_id: number;
    cantidad: number | string;
    precio_unitario: number | string;
    material?: { id: number; nombre: string } | null;
}

interface CotizacionSelDb {
    id: number;
    proveedor_id: number;
    requerimiento_id: number;
    total: number | string;
    proveedor?: { id: number; ruc: string; razon_social: string } | null;
    requerimiento?: { id: number; codigo: string; obra_id: number; obra?: { id: number; nombre: string } | null } | null;
    detalles?: CotizacionLineaDb[];
}

interface OrdenCompraDb {
    id: number;
    codigo: string;
    proveedor_id: number;
    requerimiento_id: number | null;
    obra_id: number;
    almacen_destino_id: number;
    urgente: boolean;
    estado: string;
    total: number | string;
    fecha_entrega_prometida: string | null;
    created_at: string;
    proveedor?: { id: number; ruc: string; razon_social: string } | null;
    almacen_destino?: { id: number; nombre: string } | null;
    detalles?: CotizacionLineaDb[];
}

interface OrdenesCompraPageProps {
    ordenesDb?: OrdenCompraDb[];
    cotizacionesDb?: CotizacionSelDb[];
}

type OrdenFila = Omit<OrdenCompraDb, 'id'> & { id: string };

const ESTADO_META: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = {
    emitida: { tone: 'warn', label: 'Emitida' },
    confirmada_proveedor: { tone: 'neutral', label: 'Confirmada proveedor' },
    en_transporte: { tone: 'warn', label: 'En tránsito' },
    recepcionada_total: { tone: 'ok', label: 'Recepcionada' },
    recepcionada_parcial: { tone: 'warn', label: 'Recepción parcial' },
    anulada: { tone: 'danger', label: 'Anulada' },
};

export default function OrdenesCompraPage({ ordenesDb = [], cotizacionesDb = [] }: OrdenesCompraPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const almacenes = catalogos?.almacenes ?? [];

    const crear = useHttp<{
        cotizacion_id: string;
        almacen_destino_id: string;
        fecha_entrega_prometida: string;
        urgente: boolean;
    }>({ cotizacion_id: '', almacen_destino_id: '', fecha_entrega_prometida: '', urgente: false });

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [detalle, setDetalle] = useState<OrdenFila | null>(null);

    const filas: OrdenFila[] = useMemo(() => ordenesDb.map((o) => ({ ...o, id: String(o.id) })), [ordenesDb]);

    const filtradas = useMemo(
        () =>
            filas.filter((o) => {
                if (filtroEstado !== 'todos' && o.estado !== filtroEstado) return false;
                if (!busqueda.trim()) return true;
                const q = busqueda.toLowerCase();
                return (
                    o.codigo.toLowerCase().includes(q) ||
                    (o.proveedor?.razon_social ?? '').toLowerCase().includes(q) ||
                    (o.proveedor?.ruc ?? '').includes(q)
                );
            }),
        [filas, filtroEstado, busqueda],
    );

    const total = filas.length;
    const montoComprometido = filas.reduce((acc, o) => acc + Number(o.total), 0);
    const emitidas = filas.filter((o) => o.estado === 'emitida').length;
    const enTransito = filas.filter((o) => o.estado === 'en_transporte').length;

    const cotSel = cotizacionesDb.find((c) => String(c.id) === crear.data.cotizacion_id) ?? null;

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!cotSel) {
            notify.error('Selecciona la cotización adjudicada.');
            return;
        }
        if (!crear.data.almacen_destino_id) {
            notify.error('Selecciona el almacén de destino.');
            return;
        }

        const detalles = (cotSel.detalles ?? []).map((d) => ({
            material_id: d.material_id,
            cantidad: Number(d.cantidad),
            precio_unitario: Number(d.precio_unitario),
        }));

        if (detalles.length === 0) {
            notify.error('La cotización seleccionada no tiene detalle de materiales.');
            return;
        }

        crear.transform(() => ({
            cotizacion_id: cotSel.id,
            requerimiento_id: cotSel.requerimiento_id,
            proveedor_id: cotSel.proveedor_id,
            obra_id: cotSel.requerimiento?.obra_id ?? null,
            almacen_destino_id: Number(crear.data.almacen_destino_id),
            urgente: crear.data.urgente,
            fecha_entrega_prometida: crear.data.fecha_entrega_prometida || null,
            detalles,
        }));

        crear.post('/api/v1/ordenes-compra', {
            onSuccess: () => {
                notify.success('Orden de compra emitida.');
                crear.setData({ cotizacion_id: '', almacen_destino_id: '', fecha_entrega_prometida: '', urgente: false });
                router.reload({ only: ['ordenesDb', 'cotizacionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo emitir la orden de compra.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Órdenes de Compra"
                subtitle="Emisión formal de compromisos de adquisición y asignación de almacén de destino"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Órdenes generadas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{total}</p>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Monto comprometido</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{formatMoneda(montoComprometido)}</p>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Emitidas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-warn">{emitidas}</p>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">En tránsito</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-brand-600">{enTransito}</p>
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
                                    placeholder="Buscar por OC, RUC o proveedor…"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full rounded-lg border border-line bg-canvas py-1.5 pl-9 pr-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar estado">
                                <option value="todos">Todos los estados</option>
                                <option value="emitida">Emitida</option>
                                <option value="confirmada_proveedor">Confirmada proveedor</option>
                                <option value="en_transporte">En tránsito</option>
                                <option value="recepcionada_total">Recepcionada</option>
                            </Select>
                        </div>
                    </Card>

                    <Card title={`Órdenes de compra (${filtradas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin órdenes de compra" hint="Emite una OC desde una cotización adjudicada." />
                        ) : (
                            <DataTable
                                emptyLabel="No hay órdenes que coincidan con los filtros."
                                columns={[
                                    { key: 'codigo', header: 'N° Orden', mono: true, cell: (o) => <span className="font-semibold text-ink">{o.codigo}</span> },
                                    {
                                        key: 'proveedor',
                                        header: 'Proveedor / RUC',
                                        cell: (o) => (
                                            <div>
                                                <p className="text-xs font-semibold text-ink">{o.proveedor?.razon_social ?? `Proveedor #${o.proveedor_id}`}</p>
                                                <p className="font-mono text-[11px] text-muted">RUC: {o.proveedor?.ruc ?? '—'}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'almacen', header: 'Almacén destino', cell: (o) => o.almacen_destino?.nombre ?? `Almacén #${o.almacen_destino_id}` },
                                    { key: 'monto', header: 'Monto total', align: 'right', cell: (o) => <span className="font-mono font-bold text-ink">{formatMoneda(Number(o.total))}</span> },
                                    { key: 'entrega', header: 'Entrega prometida', mono: true, cell: (o) => o.fecha_entrega_prometida ?? '—' },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (o) => {
                                            const meta = ESTADO_META[o.estado] ?? { tone: 'neutral' as const, label: o.estado };
                                            return <Badge tone={meta.tone}>{meta.label}</Badge>;
                                        },
                                    },
                                    {
                                        key: 'acciones',
                                        header: 'Acciones',
                                        align: 'right',
                                        cell: (o) => (
                                            <button onClick={() => setDetalle(o)} className="btn-secondary !px-2 !py-1 text-xs">
                                                Ver detalle
                                            </button>
                                        ),
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Emitir Orden de Compra" subtitle="Desde una cotización adjudicada" onSubmit={enviar} className="text-xs">
                    <FormSection title="Cotización" columns={1}>
                        <Field label="Oferta adjudicada" required>
                            <Select value={crear.data.cotizacion_id} onChange={(e) => crear.setData('cotizacion_id', e.target.value)}>
                                <option value="">Selecciona cotización…</option>
                                {cotizacionesDb.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                        {c.proveedor?.razon_social ?? `Proveedor #${c.proveedor_id}`} — {formatMoneda(Number(c.total))}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        {cotSel && (
                            <div className="rounded-lg border border-line bg-canvas p-2 text-[11px] text-muted">
                                <p>Requerimiento: <span className="font-semibold text-ink">{cotSel.requerimiento?.codigo ?? `#${cotSel.requerimiento_id}`}</span></p>
                                <p>Obra: {cotSel.requerimiento?.obra?.nombre ?? '—'}</p>
                                <p>{cotSel.detalles?.length ?? 0} material(es) en el detalle</p>
                            </div>
                        )}
                    </FormSection>

                    <FormSection title="Destino" columns={1}>
                        <Field label="Almacén de destino" required>
                            <Select value={crear.data.almacen_destino_id} onChange={(e) => crear.setData('almacen_destino_id', e.target.value)}>
                                <option value="">Selecciona almacén…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={String(a.id)}>{a.nombre}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Fecha de entrega prometida">
                            <Input type="date" value={crear.data.fecha_entrega_prometida} onChange={(e) => crear.setData('fecha_entrega_prometida', e.target.value)} />
                        </Field>
                        <label className="flex items-center gap-2 text-ink">
                            <input type="checkbox" checked={crear.data.urgente} onChange={(e) => crear.setData('urgente', e.target.checked)} className="accent-brand-600" />
                            Marcar como urgente
                        </label>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Emitir Orden de Compra
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal open={Boolean(detalle)} onClose={() => setDetalle(null)} title={`Orden de Compra ${detalle?.codigo ?? ''}`} wide>
                {detalle && (
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-canvas p-3">
                            <div>
                                <span className="block text-muted">Proveedor:</span>
                                <span className="font-bold text-ink">{detalle.proveedor?.razon_social ?? `#${detalle.proveedor_id}`}</span>
                                <p className="font-mono text-[11px] text-muted">RUC: {detalle.proveedor?.ruc ?? '—'}</p>
                            </div>
                            <div>
                                <span className="block text-muted">Almacén destino:</span>
                                <span className="font-bold text-ink">{detalle.almacen_destino?.nombre ?? `Almacén #${detalle.almacen_destino_id}`}</span>
                                <p className="text-[11px] text-muted">Entrega: {detalle.fecha_entrega_prometida ?? '—'}</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-line">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-line bg-soft text-muted">
                                    <tr>
                                        <th className="p-2.5">Material</th>
                                        <th className="p-2.5 text-right">Cantidad</th>
                                        <th className="p-2.5 text-right">P. Unitario</th>
                                        <th className="p-2.5 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {(detalle.detalles ?? []).map((d, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2.5 font-medium text-ink">{d.material?.nombre ?? `Material #${d.material_id}`}</td>
                                            <td className="p-2.5 text-right font-mono">{Number(d.cantidad)}</td>
                                            <td className="p-2.5 text-right font-mono">{formatMoneda(Number(d.precio_unitario))}</td>
                                            <td className="p-2.5 text-right font-mono font-bold text-ink">{formatMoneda(Number(d.cantidad) * Number(d.precio_unitario))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-bold">
                            <span>TOTAL</span>
                            <span className="font-mono text-brand-700">{formatMoneda(Number(detalle.total))}</span>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
