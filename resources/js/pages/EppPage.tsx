// Uso y Control de EPP Serializado (SST).
// Lista `asignacionesDb` y entrega EPP a trabajadores vía `useHttp`
// contra `/api/v1/sst/epp-asignaciones` (descarga automática de almacén).

import { useMemo, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, Select, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFs } from '../utils/format';
import type { Catalogos } from '../types';
import { IconBoxes } from '../components/icons';

interface EppAsignacionDb {
    id: number;
    numero_serie: string | null;
    entregado_en: string;
    estado: string;
    trabajador?: { id: number; nombres: string; cargo: string | null } | null;
    material?: { id: number; nombre: string; unidad?: { codigo: string } | null } | null;
    almacen?: { id: number; nombre: string } | null;
}

interface TrabajadorDb {
    id: number;
    nombres: string;
    cargo: string | null;
    obra_id: number | null;
}

interface EppPageProps {
    asignacionesDb?: EppAsignacionDb[];
    trabajadoresDb?: TrabajadorDb[];
}

type EppFila = Omit<EppAsignacionDb, 'id'> & { id: string };

export default function EppPage({ asignacionesDb = [], trabajadoresDb = [] }: EppPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const almacenes = catalogos?.almacenes ?? [];
    const materiales = catalogos?.materiales ?? [];

    const crear = useHttp<{ trabajador_id: string; almacen_id: string; material_id: string; numero_serie: string }>({
        trabajador_id: '',
        almacen_id: almacenes[0] ? String(almacenes[0].id) : '',
        material_id: '',
        numero_serie: '',
    });

    const filas: EppFila[] = useMemo(() => asignacionesDb.map((a) => ({ ...a, id: String(a.id) })), [asignacionesDb]);

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.trabajador_id) {
            notify.error('Selecciona al trabajador.');
            return;
        }
        if (!crear.data.almacen_id) {
            notify.error('Selecciona el almacén de despacho.');
            return;
        }
        if (!crear.data.material_id) {
            notify.error('Selecciona el equipo de protección.');
            return;
        }

        crear.transform(() => ({
            trabajador_id: Number(crear.data.trabajador_id),
            almacen_id: Number(crear.data.almacen_id),
            material_id: Number(crear.data.material_id),
            numero_serie: crear.data.numero_serie.trim() || null,
        }));

        crear.post('/api/v1/sst/epp-asignaciones', {
            onSuccess: () => {
                notify.success('EPP asignado y descargado del inventario.');
                crear.setData({
                    trabajador_id: '',
                    almacen_id: almacenes[0] ? String(almacenes[0].id) : '',
                    material_id: '',
                    numero_serie: '',
                });
                router.reload({ only: ['asignacionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo asignar el EPP.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Uso y Control de EPP Serializado"
                subtitle="Trazabilidad por trabajador, número de serie de equipos de protección y descarga automática de almacén"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Asignaciones de EPP (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin asignaciones de EPP" hint="Entrega el primer equipo con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin asignaciones de EPP registradas."
                                columns={[
                                    { key: 'trabajador', header: 'Trabajador Asignado', cell: (e) => <span className="font-bold text-ink">{e.trabajador?.nombres ?? '—'}</span> },
                                    { key: 'cargo', header: 'Cargo', cell: (e) => e.trabajador?.cargo ?? '—' },
                                    {
                                        key: 'epp',
                                        header: 'EPP',
                                        cell: (e) => (
                                            <span>
                                                {e.material?.nombre ?? '—'}
                                                {e.material?.unidad?.codigo ? <span className="ml-1 text-muted">({e.material.unidad.codigo})</span> : null}
                                            </span>
                                        ),
                                    },
                                    { key: 'serie', header: 'N° Serie / Código Único', mono: true, cell: (e) => e.numero_serie ?? 'S/N' },
                                    { key: 'fecha', header: 'Fecha de Entrega', mono: true, cell: (e) => formatFs(e.entregado_en) },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (e) => <Badge tone={e.estado === 'vigente' ? 'ok' : 'neutral'}>{e.estado === 'vigente' ? 'Vigente' : e.estado.toUpperCase()}</Badge>,
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Asignar EPP" subtitle="Entrega serializada con egreso de stock" onSubmit={enviar} className="text-xs">
                    <FormSection title="Entrega" columns={1}>
                        <Field label="Trabajador" required>
                            <Select value={crear.data.trabajador_id} onChange={(e) => crear.setData('trabajador_id', e.target.value)}>
                                <option value="">Selecciona trabajador…</option>
                                {trabajadoresDb.map((t) => (
                                    <option key={t.id} value={String(t.id)}>
                                        {t.nombres}
                                        {t.cargo ? ` — ${t.cargo}` : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Almacén" required>
                            <Select value={crear.data.almacen_id} onChange={(e) => crear.setData('almacen_id', e.target.value)}>
                                <option value="">Selecciona almacén…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Equipo de Protección" required>
                            <Select value={crear.data.material_id} onChange={(e) => crear.setData('material_id', e.target.value)}>
                                <option value="">Selecciona EPP…</option>
                                {materiales.map((m) => (
                                    <option key={m.id} value={String(m.id)}>
                                        {m.nombre}
                                        {m.unidad?.codigo ? ` (${m.unidad.codigo})` : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="N° de Serie" hint="Opcional, para equipos serializados">
                            <Input value={crear.data.numero_serie} onChange={(e) => crear.setData('numero_serie', e.target.value)} placeholder="3M-CSC-2026-0098" />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconBoxes size={15} />
                        Asignar y Descontar
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
