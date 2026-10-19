// Módulo de Despacho de transferencias inter-obras.
// Un despacho egresa existencias del almacén de origen de una transferencia
// aprobada y la pone en tránsito. Datos desde props `despachosDb` y
// `transferenciasDb` (transferencias aprobadas sin despacho).

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFs } from '../utils/format';
import { IconTruck } from '../components/icons';

interface MaterialDb {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface TransferenciaDetalleDb {
    id: number;
    material_id: number;
    cantidad_solicitada: number | string;
    cantidad_despachada: number | string | null;
    material?: MaterialDb | null;
}

interface AlmacenDb {
    id: number;
    nombre: string;
}

interface TransferenciaDb {
    id: number;
    codigo: string;
    motivo: string;
    estado: string;
    almacen_origen_id: number;
    almacen_destino_id: number;
    almacen_origen?: AlmacenDb | null;
    almacen_destino?: AlmacenDb | null;
    detalles?: TransferenciaDetalleDb[];
}

interface DespachoDb {
    id: number;
    transferencia_id: number;
    despachado_en: string | null;
    observaciones: string | null;
    transferencia?: TransferenciaDb | null;
    despachador?: { id: number; nombre: string } | null;
}

interface DespachosPageProps {
    despachosDb?: DespachoDb[];
    transferenciasDb?: TransferenciaDb[];
}

type DespachoFila = Omit<DespachoDb, 'id'> & { id: string };

interface LineaDespacho {
    id: number;
    material: string;
    unidad: string;
    solicitada: number;
    despachada: string;
}

function origenNombre(despacho: { transferencia?: TransferenciaDb | null }): string {
    return despacho.transferencia?.almacen_origen?.nombre ?? `Almacén #${despacho.transferencia?.almacen_origen_id ?? '—'}`;
}

function destinoNombre(despacho: { transferencia?: TransferenciaDb | null }): string {
    return despacho.transferencia?.almacen_destino?.nombre ?? `Almacén #${despacho.transferencia?.almacen_destino_id ?? '—'}`;
}

function materialesDe(despacho: { transferencia?: TransferenciaDb | null }): string {
    const detalles = despacho.transferencia?.detalles ?? [];
    if (detalles.length === 0) return '—';
    const primero = detalles[0].material?.nombre ?? `Material #${detalles[0].material_id}`;
    return detalles.length > 1 ? `${primero} (+${detalles.length - 1})` : primero;
}

export default function DespachosPage({ despachosDb = [], transferenciasDb = [] }: DespachosPageProps) {
    const notify = useNotifications();

    const http = useHttp<{ transferencia_id: string; observaciones: string }>({
        transferencia_id: '',
        observaciones: '',
    });

    const [lineas, setLineas] = useState<LineaDespacho[]>([]);

    const filas: DespachoFila[] = useMemo(
        () => despachosDb.map((d) => ({ ...d, id: String(d.id) })),
        [despachosDb],
    );

    const seleccionarTransferencia = (valor: string) => {
        http.setData('transferencia_id', valor);
        const transferencia = transferenciasDb.find((t) => String(t.id) === valor);
        setLineas(
            (transferencia?.detalles ?? []).map((det) => ({
                id: det.id,
                material: det.material?.nombre ?? `Material #${det.material_id}`,
                unidad: det.material?.unidad_medida?.codigo ?? 'und',
                solicitada: Number(det.cantidad_solicitada),
                despachada: String(det.cantidad_solicitada),
            })),
        );
    };

    const setCantidad = (id: number, valor: string) =>
        setLineas((actual) => actual.map((l) => (l.id === id ? { ...l, despachada: valor } : l)));

    const reiniciar = () => {
        http.setData('transferencia_id', '');
        http.setData('observaciones', '');
        setLineas([]);
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!http.data.transferencia_id) {
            notify.error('Selecciona la transferencia aprobada a despachar.');
            return;
        }

        const detalles = lineas
            .filter((l) => Number(l.despachada) > 0)
            .map((l) => ({ id: l.id, cantidad_despachada: Number(l.despachada) }));

        if (detalles.length === 0) {
            notify.error('Indica una cantidad a despachar mayor a cero en al menos un material.');
            return;
        }

        http.transform(() => ({
            transferencia_id: Number(http.data.transferencia_id),
            observaciones: http.data.observaciones || null,
            detalles,
        }));

        http.post('/api/v1/despachos', {
            onSuccess: () => {
                notify.success('Despacho registrado; la transferencia está en tránsito.');
                reiniciar();
                refrescarProps('despachosDb', 'transferenciasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar el despacho.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Despacho y Tránsito"
                subtitle="Egreso de existencias de transferencias aprobadas entre obras"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card title={`Despachos (${despachosDb.length})`} className="lg:col-span-2">
                    {despachosDb.length === 0 ? (
                        <EmptyState title="Sin despachos registrados" hint="Despacha una transferencia aprobada para iniciar tránsito." />
                    ) : (
                        <DataTable
                            emptyLabel="Sin despachos."
                            columns={[
                                { key: 'codigo', header: 'Transferencia', mono: true, cell: (d) => <span className="font-semibold text-ink">{d.transferencia?.codigo ?? `#${d.transferencia_id}`}</span> },
                                {
                                    key: 'ruta',
                                    header: 'Origen → Destino',
                                    cell: (d) => (
                                        <span className="block max-w-56">
                                            <span className="block truncate text-[11px] text-muted">{origenNombre(d)}</span>
                                            <span className="block text-sm font-medium text-ink">→ {destinoNombre(d)}</span>
                                        </span>
                                    ),
                                },
                                { key: 'materiales', header: 'Materiales', cell: (d) => <span className="text-xs">{materialesDe(d)}</span> },
                                {
                                    key: 'despacho',
                                    header: 'Despachado',
                                    cell: (d) => (
                                        <span className="block">
                                            <span className="block text-xs font-medium text-ink">{d.despachador?.nombre ?? 'Sin asignar'}</span>
                                            <span className="block text-[11px] text-muted">{d.despachado_en ? formatFs(d.despachado_en) : '—'}</span>
                                        </span>
                                    ),
                                },
                                { key: 'estado', header: 'Estado', cell: () => <Badge tone="violet">En tránsito</Badge> },
                                {
                                    key: 'observaciones',
                                    header: 'Observaciones',
                                    cell: (d) => <span className="block max-w-48 truncate text-xs text-muted">{d.observaciones ?? '—'}</span>,
                                },
                            ]}
                            rows={filas}
                        />
                    )}
                </Card>

                <FormPanel
                    title="Registrar Despacho"
                    subtitle="Transferencia aprobada pendiente de salida"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    {transferenciasDb.length === 0 ? (
                        <p className="hint">No hay transferencias aprobadas pendientes de despacho.</p>
                    ) : (
                        <>
                            <FormSection title="Transferencia" columns={1}>
                                <Field label="Transferencia aprobada" required>
                                    <Select value={http.data.transferencia_id} onChange={(e) => seleccionarTransferencia(e.target.value)}>
                                        <option value="">Selecciona transferencia…</option>
                                        {transferenciasDb.map((t) => (
                                            <option key={t.id} value={String(t.id)}>
                                                {t.codigo} — {t.almacen_origen?.nombre ?? `#${t.almacen_origen_id}`} →{' '}
                                                {t.almacen_destino?.nombre ?? `#${t.almacen_destino_id}`}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </FormSection>

                            {lineas.length > 0 && (
                                <FormSection title="Cantidades a despachar" columns={1}>
                                    <div className="space-y-2">
                                        {lineas.map((l) => (
                                            <div key={l.id} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-ink">{l.material}</p>
                                                    <p className="text-[11px] text-muted">Solicitado: {formatCantidad(l.solicitada, l.unidad)}</p>
                                                </div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.001"
                                                    value={l.despachada}
                                                    onChange={(e) => setCantidad(l.id, e.target.value)}
                                                    className="field !w-24 !py-1.5"
                                                    aria-label={`Cantidad a despachar de ${l.material}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </FormSection>
                            )}

                            <FormSection title="Observaciones" columns={1}>
                                <Field label="Notas de despacho">
                                    <Textarea
                                        value={http.data.observaciones}
                                        onChange={(e) => http.setData('observaciones', e.target.value)}
                                        rows={2}
                                        placeholder="Guía, transportista, incidencias…"
                                    />
                                </Field>
                            </FormSection>

                            <SubmitButton status={http.processing ? 'submitting' : 'idle'} className="w-full">
                                <IconTruck size={15} />
                                Registrar Despacho
                            </SubmitButton>
                        </>
                    )}
                </FormPanel>
            </div>
        </div>
    );
}
