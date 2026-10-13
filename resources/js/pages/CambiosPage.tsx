// Control integrado de cambios.
// Lista `cambiosDb`; registra vía `/api/v1/solicitudes-cambio` y evalúa
// (aprueba/rechaza) vía `/api/v1/solicitudes-cambio/{id}/evaluar` con `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFecha, formatMoneda } from '../utils/format';
import type { Catalogos } from '../types';
import { IconPlus, IconX, IconCheck } from '../components/icons';

interface CambioDb {
    id: number;
    obra_id: number;
    tipo: string;
    descripcion: string;
    impacto_plazo_dias: number;
    impacto_costo: number | string;
    estado: string;
    decidida_en?: string | null;
    created_at?: string | null;
    obra?: { id: number; nombre: string } | null;
}

interface CambiosPageProps {
    cambiosDb?: CambioDb[];
}

const TIPOS = [
    { value: 'alcance', label: 'Alcance' },
    { value: 'plazo', label: 'Plazo' },
    { value: 'costo', label: 'Costo' },
];

function tonoEstado(estado: string): 'ok' | 'danger' | 'warn' {
    if (estado === 'aprobada') return 'ok';
    if (estado === 'rechazada') return 'danger';
    return 'warn';
}

export default function CambiosPage({ cambiosDb = [] }: CambiosPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const [decidiendoId, setDecidiendoId] = useState<string | null>(null);

    const crear = useHttp<{
        obra_id: string;
        tipo: string;
        descripcion: string;
        impacto_plazo_dias: string;
        impacto_costo: string;
    }>({ obra_id: '', tipo: 'alcance', descripcion: '', impacto_plazo_dias: '0', impacto_costo: '0' });

    const evaluar = useHttp<{ estado: string }>({ estado: '' });

    const filas = useMemo(() => cambiosDb.map((c) => ({ ...c, id: String(c.id) })), [cambiosDb]);

    const pendientes = filas.filter((c) => c.estado === 'solicitada').length;
    const aprobadas = filas.filter((c) => c.estado === 'aprobada').length;
    const costoAprobado = filas
        .filter((c) => c.estado === 'aprobada')
        .reduce((acc, c) => acc + Number(c.impacto_costo || 0), 0);

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id || !crear.data.descripcion.trim()) {
            notify.error('Selecciona la obra y describe el cambio.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            tipo: crear.data.tipo,
            descripcion: crear.data.descripcion,
            impacto_plazo_dias: Number(crear.data.impacto_plazo_dias || 0),
            impacto_costo: Number(crear.data.impacto_costo || 0),
        }));

        crear.post('/api/v1/solicitudes-cambio', {
            onSuccess: () => {
                notify.success('Solicitud de cambio registrada.');
                crear.setData({ obra_id: '', tipo: 'alcance', descripcion: '', impacto_plazo_dias: '0', impacto_costo: '0' });
                router.reload({ only: ['cambiosDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la solicitud.');
            },
        });
    };

    const decidir = (id: string, estado: 'aprobada' | 'rechazada') => {
        setDecidiendoId(id);
        evaluar.transform(() => ({ estado }));
        evaluar.post(`/api/v1/solicitudes-cambio/${id}/evaluar`, {
            onSuccess: () => {
                notify.success(estado === 'aprobada' ? 'Cambio aprobado.' : 'Cambio rechazado.');
                router.reload({ only: ['cambiosDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo evaluar la solicitud.');
            },
            onFinish: () => setDecidiendoId(null),
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Control Integrado de Cambios"
                subtitle="Gestión de adicionales, deductivos, ampliaciones de plazo e impacto en la línea base"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Solicitudes Pendientes</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-warn">{pendientes}</p>
                    <span className="text-xs text-muted">En evaluación por el comité</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Cambios Aprobados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ok">{aprobadas}</p>
                    <span className="text-xs text-muted">Impacto incorporado a la línea base</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Impacto Costo Aprobado</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{formatMoneda(costoAprobado)}</p>
                    <span className="text-xs text-muted">Adicionales netos aprobados</span>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card title={`Solicitudes de Cambio (${filas.length})`} className="lg:col-span-2">
                    {filas.length === 0 ? (
                        <EmptyState title="Sin solicitudes de cambio" hint="Registra la primera solicitud con el panel lateral." />
                    ) : (
                        <DataTable
                            emptyLabel="Sin solicitudes de cambio."
                            columns={[
                                { key: 'fecha', header: 'Fecha', mono: true, cell: (c) => formatFecha(c.created_at ?? '') },
                                { key: 'tipo', header: 'Tipo', mono: true, cell: (c) => <Badge tone="neutral">{c.tipo}</Badge> },
                                { key: 'descripcion', header: 'Descripción del Cambio' },
                                { key: 'plazo', header: 'Impacto Plazo', align: 'right', mono: true, cell: (c) => (c.impacto_plazo_dias > 0 ? `+${c.impacto_plazo_dias} días` : '0 días') },
                                { key: 'costo', header: 'Impacto Costo', align: 'right', mono: true, cell: (c) => formatMoneda(Number(c.impacto_costo || 0)) },
                                { key: 'estado', header: 'Estado', cell: (c) => <Badge tone={tonoEstado(c.estado)}>{c.estado}</Badge> },
                                {
                                    key: 'accion',
                                    header: 'Evaluar',
                                    align: 'right',
                                    cell: (c) =>
                                        c.estado !== 'solicitada' ? (
                                            <span className="text-[11px] text-muted">—</span>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="mint" disabled={decidiendoId === c.id} onClick={() => decidir(c.id, 'aprobada')}>
                                                    <IconCheck size={13} /> Aprobar
                                                </Button>
                                                <Button size="sm" variant="danger" disabled={decidiendoId === c.id} onClick={() => decidir(c.id, 'rechazada')}>
                                                    <IconX size={13} /> Rechazar
                                                </Button>
                                            </div>
                                        ),
                                },
                            ]}
                            rows={filas}
                        />
                    )}
                </Card>

                <FormPanel title="Registrar Solicitud" subtitle="Nueva solicitud de cambio contractual" onSubmit={enviar} className="text-xs">
                    <FormSection title="Identificación" columns={1}>
                        <Field label="Obra" required>
                            <Select value={crear.data.obra_id} onChange={(e) => crear.setData('obra_id', e.target.value)}>
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>{o.nombre}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Tipo de Cambio" required>
                            <Select value={crear.data.tipo} onChange={(e) => crear.setData('tipo', e.target.value)}>
                                {TIPOS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Descripción" required>
                            <Textarea value={crear.data.descripcion} onChange={(e) => crear.setData('descripcion', e.target.value)} rows={3} />
                        </Field>
                    </FormSection>

                    <FormSection title="Impacto" columns={1}>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Plazo (días)">
                                <Input type="number" min={0} value={crear.data.impacto_plazo_dias} onChange={(e) => crear.setData('impacto_plazo_dias', e.target.value)} />
                            </Field>
                            <Field label="Costo (S/)">
                                <Input type="number" step="0.01" value={crear.data.impacto_costo} onChange={(e) => crear.setData('impacto_costo', e.target.value)} />
                            </Field>
                        </div>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Solicitud
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
