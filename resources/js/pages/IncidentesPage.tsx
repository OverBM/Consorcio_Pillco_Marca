// Registro de Incidentes y Accidentes SST.
// Lista `incidentesDb` y reporta nuevos eventos vía `useHttp`
// contra `/api/v1/sst/incidentes`.

import { useMemo, useState, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFs } from '../utils/format';
import type { Catalogos } from '../types';
import { IconAlertTriangle } from '../components/icons';

interface IncidenteDb {
    id: number;
    codigo: string;
    tipo: string;
    gravedad: string;
    ocurrido_en: string;
    descripcion: string;
    estado: string;
    requiere_traslado: boolean;
    trabajador?: { id: number; nombres: string } | null;
    obra?: { id: number; nombre: string } | null;
}

interface TrabajadorDb {
    id: number;
    nombres: string;
    cargo: string | null;
    obra_id: number | null;
}

interface IncidentesPageProps {
    incidentesDb?: IncidenteDb[];
    trabajadoresDb?: TrabajadorDb[];
}

type IncidenteFila = Omit<IncidenteDb, 'id'> & { id: string };

const TIPOS = [
    { value: 'accidente', label: 'Accidente de Trabajo' },
    { value: 'incidente', label: 'Incidente' },
    { value: 'cuasi', label: 'Cuasi-accidente' },
];

export default function IncidentesPage({ incidentesDb = [], trabajadoresDb = [] }: IncidentesPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const crear = useHttp<{
        obra_id: string;
        trabajador_id: string;
        tipo: string;
        gravedad: string;
        ocurrido_en: string;
        descripcion: string;
        requiere_traslado: boolean;
        causas: string;
    }>({
        obra_id: obras[0] ? String(obras[0].id) : '',
        trabajador_id: '',
        tipo: 'incidente',
        gravedad: 'leve',
        ocurrido_en: '',
        descripcion: '',
        requiere_traslado: false,
        causas: '',
    });

    const filas: IncidenteFila[] = useMemo(() => incidentesDb.map((i) => ({ ...i, id: String(i.id) })), [incidentesDb]);

    const graves = useMemo(() => filas.filter((i) => i.gravedad !== 'leve').length, [filas]);
    const abiertos = useMemo(() => filas.filter((i) => i.estado !== 'cerrado').length, [filas]);

    const trabajadoresFiltrados = useMemo(() => {
        if (!crear.data.obra_id) return trabajadoresDb;
        return trabajadoresDb.filter((t) => !t.obra_id || String(t.obra_id) === crear.data.obra_id);
    }, [trabajadoresDb, crear.data.obra_id]);

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id) {
            notify.error('Selecciona la obra del evento.');
            return;
        }
        if (!crear.data.descripcion.trim()) {
            notify.error('Describe el evento ocurrido.');
            return;
        }
        if (!crear.data.ocurrido_en) {
            notify.error('Indica la fecha y hora del evento.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            trabajador_id: crear.data.trabajador_id ? Number(crear.data.trabajador_id) : null,
            tipo: crear.data.tipo,
            gravedad: crear.data.gravedad,
            ocurrido_en: crear.data.ocurrido_en,
            descripcion: crear.data.descripcion.trim(),
            requiere_traslado: crear.data.requiere_traslado,
            causas: crear.data.causas.trim() || null,
        }));

        crear.post('/api/v1/sst/incidentes', {
            onSuccess: () => {
                notify.success('Incidente de seguridad registrado.');
                crear.setData({
                    obra_id: obras[0] ? String(obras[0].id) : '',
                    trabajador_id: '',
                    tipo: 'incidente',
                    gravedad: 'leve',
                    ocurrido_en: '',
                    descripcion: '',
                    requiere_traslado: false,
                    causas: '',
                });
                router.reload({ only: ['incidentesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar el incidente.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Registro de Incidentes y Accidentes SST"
                subtitle="Notificación inmediata, investigación de causas básicas e inmediatas y reporte SSOMA"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Eventos Registrados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{filas.length}</p>
                    <span className="text-xs text-muted">Total histórico notificado</span>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Eventos Graves / Fatales</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-danger">{graves}</p>
                    <span className="text-xs text-muted">Requieren investigación SSOMA</span>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Investigaciones Abiertas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-amber-600">{abiertos}</p>
                    <span className="text-xs text-muted">Pendientes de cierre</span>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Incidentes (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin incidentes registrados" hint="Reporta el primer evento con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin incidentes registrados."
                                columns={[
                                    { key: 'codigo', header: 'Código', mono: true },
                                    { key: 'fecha', header: 'Fecha y Hora', mono: true, cell: (i) => formatFs(i.ocurrido_en) },
                                    { key: 'tipo', header: 'Tipo', cell: (i) => i.tipo.toUpperCase() },
                                    { key: 'trabajador', header: 'Personal Involucrado', cell: (i) => i.trabajador?.nombres ?? '—' },
                                    { key: 'descripcion', header: 'Descripción', cell: (i) => <span className="block max-w-64 truncate text-xs text-muted" title={i.descripcion}>{i.descripcion}</span> },
                                    {
                                        key: 'gravedad',
                                        header: 'Gravedad',
                                        align: 'center',
                                        cell: (i) => <Badge tone={i.gravedad === 'leve' ? 'warn' : 'danger'}>{i.gravedad.toUpperCase()}</Badge>,
                                    },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (i) => <Badge tone={i.estado === 'cerrado' ? 'ok' : 'warn'}>{i.estado.toUpperCase()}</Badge>,
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Reportar Incidente" subtitle="Notificación inmediata SSOMA" onSubmit={enviar} className="text-xs">
                    <FormSection title="Evento" columns={1}>
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
                            <Field label="Tipo" required>
                                <Select value={crear.data.tipo} onChange={(e) => crear.setData('tipo', e.target.value)}>
                                    {TIPOS.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Gravedad" required>
                                <Select value={crear.data.gravedad} onChange={(e) => crear.setData('gravedad', e.target.value)}>
                                    <option value="leve">Leve</option>
                                    <option value="grave">Grave</option>
                                    <option value="fatal">Fatal</option>
                                </Select>
                            </Field>
                        </div>
                        <Field label="Personal Involucrado">
                            <Select value={crear.data.trabajador_id} onChange={(e) => crear.setData('trabajador_id', e.target.value)}>
                                <option value="">Sin personal específico</option>
                                {trabajadoresFiltrados.map((t) => (
                                    <option key={t.id} value={String(t.id)}>
                                        {t.nombres}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Fecha y Hora" required>
                            <Input type="datetime-local" value={crear.data.ocurrido_en} onChange={(e) => crear.setData('ocurrido_en', e.target.value)} />
                        </Field>
                    </FormSection>

                    <FormSection title="Detalle" columns={1}>
                        <Field label="Descripción del Evento" required>
                            <Textarea value={crear.data.descripcion} onChange={(e) => crear.setData('descripcion', e.target.value)} rows={3} placeholder="Relato de lo ocurrido…" />
                        </Field>
                        <Field label="Causas básicas / inmediatas">
                            <Textarea value={crear.data.causas} onChange={(e) => crear.setData('causas', e.target.value)} rows={2} placeholder="Factores contribuyentes…" />
                        </Field>
                        <label className="flex items-center gap-2 text-xs text-ink">
                            <input
                                type="checkbox"
                                checked={crear.data.requiere_traslado}
                                onChange={(e) => crear.setData('requiere_traslado', e.target.checked)}
                                className="h-4 w-4 rounded border-line"
                            />
                            Requiere traslado a centro médico
                        </label>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconAlertTriangle size={15} />
                        Registrar Incidente
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
