// Observaciones Técnicas y Control de Calidad.
// Lista `observacionesDb`, registra no conformidades y las levanta vía `useHttp`
// contra `/api/v1/calidad/observaciones`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFecha } from '../utils/format';
import type { Catalogos } from '../types';
import { IconCheckCircle, IconPlus } from '../components/icons';

interface ObservacionDb {
    id: number;
    numero_acta: string | null;
    descripcion: string;
    origen: string;
    plazo_subsanacion: string | null;
    estado: string;
    planos_asbuilt_actualizados: boolean;
    obra?: { id: number; nombre: string } | null;
    responsable?: { id: number; name: string } | null;
}

interface CalidadPageProps {
    observacionesDb?: ObservacionDb[];
}

type ObservacionFila = Omit<ObservacionDb, 'id'> & { id: string };

const ORIGENES = [
    { value: 'supervision', label: 'Supervisión' },
    { value: 'control_interno', label: 'Control Interno' },
    { value: 'auditoria', label: 'Auditoría' },
];

export default function CalidadPage({ observacionesDb = [] }: CalidadPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];
    const [procesando, setProcesando] = useState<string | null>(null);

    const crear = useHttp<{
        obra_id: string;
        numero_acta: string;
        descripcion: string;
        origen: string;
        plazo_subsanacion: string;
    }>({ obra_id: obras[0] ? String(obras[0].id) : '', numero_acta: '', descripcion: '', origen: 'supervision', plazo_subsanacion: '' });

    const levantar = useHttp<{ planos_asbuilt_actualizados: boolean }>({ planos_asbuilt_actualizados: true });

    const filas: ObservacionFila[] = useMemo(() => observacionesDb.map((o) => ({ ...o, id: String(o.id) })), [observacionesDb]);

    const notificadas = useMemo(() => filas.filter((o) => o.estado !== 'levantada').length, [filas]);

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id) {
            notify.error('Selecciona la obra.');
            return;
        }
        if (!crear.data.descripcion.trim()) {
            notify.error('Describe la observación técnica.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            numero_acta: crear.data.numero_acta.trim() || null,
            descripcion: crear.data.descripcion.trim(),
            origen: crear.data.origen,
            plazo_subsanacion: crear.data.plazo_subsanacion || null,
        }));

        crear.post('/api/v1/calidad/observaciones', {
            onSuccess: () => {
                notify.success('Observación técnica registrada.');
                crear.setData({ obra_id: obras[0] ? String(obras[0].id) : '', numero_acta: '', descripcion: '', origen: 'supervision', plazo_subsanacion: '' });
                refrescarProps('observacionesDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la observación.');
            },
        });
    };

    const levantarObservacion = (id: string) => {
        setProcesando(id);
        levantar.transform(() => ({ planos_asbuilt_actualizados: true }));
        levantar.post(`/api/v1/calidad/observaciones/${id}/levantar`, {
            onSuccess: () => {
                notify.success('Observación levantada y subsanada.');
                refrescarProps('observacionesDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo levantar la observación.');
            },
            onFinish: () => setProcesando(null),
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Observaciones Técnicas y Control de Calidad"
                subtitle="Gestión de no conformidades emitidas por supervisión de obra y actas de levantamiento con planos As-Built"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Observaciones (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin observaciones registradas" hint="Registra la primera no conformidad con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin observaciones registradas."
                                columns={[
                                    { key: 'acta', header: 'N° Acta', mono: true, cell: (o) => o.numero_acta ?? '—' },
                                    { key: 'origen', header: 'Origen', mono: true, cell: (o) => o.origen.toUpperCase() },
                                    { key: 'descripcion', header: 'Descripción', cell: (o) => <span className="block max-w-64 truncate text-xs text-muted" title={o.descripcion}>{o.descripcion}</span> },
                                    { key: 'responsable', header: 'Responsable', cell: (o) => o.responsable?.name ?? '—' },
                                    { key: 'plazo', header: 'Plazo Límite', mono: true, cell: (o) => (o.plazo_subsanacion ? formatFecha(o.plazo_subsanacion) : '—') },
                                    {
                                        key: 'planos',
                                        header: 'As-Built',
                                        align: 'center',
                                        cell: (o) => <Badge tone={o.planos_asbuilt_actualizados ? 'ok' : 'neutral'}>{o.planos_asbuilt_actualizados ? 'Actualizado' : 'Pendiente'}</Badge>,
                                    },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (o) => <Badge tone={o.estado === 'levantada' ? 'ok' : 'danger'}>{o.estado === 'levantada' ? 'Levantada' : o.estado.toUpperCase()}</Badge>,
                                    },
                                    {
                                        key: 'acciones',
                                        header: 'Acciones',
                                        align: 'center',
                                        cell: (o) =>
                                            o.estado === 'levantada' ? (
                                                <span className="text-xs text-muted">—</span>
                                            ) : (
                                                <Button variant="secondary" onClick={() => levantarObservacion(o.id)} disabled={procesando === o.id}>
                                                    <IconCheckCircle size={14} />
                                                    Levantar
                                                </Button>
                                            ),
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Registrar Observación" subtitle={`${notificadas} pendientes de levantar`} onSubmit={enviar} className="text-xs">
                    <FormSection title="Datos de la No Conformidad" columns={1}>
                        <Field label="Obra" required>
                            <Select value={crear.data.obra_id} onChange={(e) => crear.setData('obra_id', e.target.value)}>
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="N° Acta">
                                <Input value={crear.data.numero_acta} onChange={(e) => crear.setData('numero_acta', e.target.value)} placeholder="ACTA-SUP-015" />
                            </Field>
                            <Field label="Origen" required>
                                <Select value={crear.data.origen} onChange={(e) => crear.setData('origen', e.target.value)}>
                                    {ORIGENES.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Plazo de Subsanación">
                            <Input type="date" value={crear.data.plazo_subsanacion} onChange={(e) => crear.setData('plazo_subsanacion', e.target.value)} />
                        </Field>
                    </FormSection>

                    <FormSection title="Detalle" columns={1}>
                        <Field label="Descripción" required>
                            <Textarea value={crear.data.descripcion} onChange={(e) => crear.setData('descripcion', e.target.value)} rows={3} placeholder="Detalla la no conformidad detectada…" />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Observación
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
