// Costos y valorizaciones mensuales.
// Lista `valorizacionesDb`; registra vía `/api/v1/valorizaciones` y aprueba vía
// `/api/v1/valorizaciones/{id}/aprobar` usando `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { Field, Input, Select, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFecha, formatMoneda } from '../utils/format';
import type { Catalogos } from '../types';
import { IconCheck, IconPlus } from '../components/icons';

interface ValorizacionDb {
    id: number;
    obra_id: number;
    periodo: string;
    valor_planificado: number | string;
    valor_ganado: number | string;
    costo_real: number | string;
    estado: string;
    obra?: { id: number; nombre: string } | null;
}

interface ValorizacionesPageProps {
    valorizacionesDb?: ValorizacionDb[];
}

export default function ValorizacionesPage({ valorizacionesDb = [] }: ValorizacionesPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const [obraFiltro, setObraFiltro] = useState('todas');
    const [aprobandoId, setAprobandoId] = useState<string | null>(null);

    const crear = useHttp<{
        obra_id: string;
        periodo: string;
        valor_planificado: string;
        valor_ganado: string;
        costo_real: string;
    }>({ obra_id: '', periodo: '', valor_planificado: '', valor_ganado: '', costo_real: '' });

    const aprobar = useHttp<Record<string, never>>({});

    const filas = useMemo(() => {
        const base = obraFiltro === 'todas' ? valorizacionesDb : valorizacionesDb.filter((v) => String(v.obra_id) === obraFiltro);
        return base.map((v) => {
            const pv = Number(v.valor_planificado || 0);
            const ev = Number(v.valor_ganado || 0);
            const ac = Number(v.costo_real || 0);
            return {
                id: String(v.id),
                periodo: v.periodo,
                ev,
                cpi: ac > 0 ? ev / ac : 0,
                spi: pv > 0 ? ev / pv : 0,
                estado: v.estado,
            };
        });
    }, [valorizacionesDb, obraFiltro]);

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id || !crear.data.periodo) {
            notify.error('Selecciona la obra y el periodo.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            periodo: crear.data.periodo,
            valor_planificado: Number(crear.data.valor_planificado || 0),
            valor_ganado: Number(crear.data.valor_ganado || 0),
            costo_real: Number(crear.data.costo_real || 0),
        }));

        crear.post('/api/v1/valorizaciones', {
            onSuccess: () => {
                notify.success('Valorización mensual registrada.');
                crear.setData({ obra_id: '', periodo: '', valor_planificado: '', valor_ganado: '', costo_real: '' });
                router.reload({ only: ['valorizacionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la valorización.');
            },
        });
    };

    const aprobarValorizacion = (id: string) => {
        setAprobandoId(id);
        aprobar.post(`/api/v1/valorizaciones/${id}/aprobar`, {
            onSuccess: () => {
                notify.success('Valorización aprobada.');
                router.reload({ only: ['valorizacionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo aprobar la valorización.');
            },
            onFinish: () => setAprobandoId(null),
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Costos y Valorizaciones Mensuales"
                subtitle="Curva de avance financiero y cálculo de valor ganado por periodo contractual"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-xs font-mono uppercase text-muted">Obra en Consulta:</span>
                        <select
                            value={obraFiltro}
                            onChange={(e) => setObraFiltro(e.target.value)}
                            className="rounded-field border border-line bg-canvas px-3 py-1.5 text-xs text-ink outline-none"
                        >
                            <option value="todas">Todas las obras</option>
                            {obras.map((o) => (
                                <option key={o.id} value={String(o.id)}>{o.nombre}</option>
                            ))}
                        </select>
                    </Card>

                    <Card title={`Valorizaciones (${filas.length})`}>
                        {valorizacionesDb.length === 0 ? (
                            <EmptyState title="Sin valorizaciones" hint="Registra el primer periodo con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin valorizaciones registradas."
                                columns={[
                                    { key: 'periodo', header: 'Periodo', mono: true, cell: (v) => formatFecha(v.periodo) },
                                    { key: 'ev', header: 'Valor Ganado (EV)', align: 'right', mono: true, cell: (v) => formatMoneda(v.ev) },
                                    { key: 'spi', header: 'SPI', align: 'right', mono: true, cell: (v) => v.spi.toFixed(3) },
                                    { key: 'cpi', header: 'CPI', align: 'right', mono: true, cell: (v) => v.cpi.toFixed(3) },
                                    { key: 'estado', header: 'Estado', cell: (v) => <Badge tone={v.estado === 'aprobada' ? 'ok' : 'warn'}>{v.estado}</Badge> },
                                    {
                                        key: 'accion',
                                        header: 'Acción',
                                        align: 'right',
                                        cell: (v) =>
                                            v.estado === 'aprobada' ? (
                                                <span className="text-[11px] font-mono text-ok">Aprobada</span>
                                            ) : (
                                                <Button size="sm" variant="mint" disabled={aprobandoId === v.id} onClick={() => aprobarValorizacion(v.id)}>
                                                    <IconCheck size={13} /> Aprobar
                                                </Button>
                                            ),
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Registrar Valorización" subtitle="Periodo mensual (PV / EV / AC)" onSubmit={enviar} className="text-xs">
                    <FormSection title="Periodo" columns={1}>
                        <Field label="Obra" required>
                            <Select value={crear.data.obra_id} onChange={(e) => crear.setData('obra_id', e.target.value)}>
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>{o.nombre}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Periodo (fecha de corte)" required>
                            <Input type="date" value={crear.data.periodo} onChange={(e) => crear.setData('periodo', e.target.value)} />
                        </Field>
                    </FormSection>

                    <FormSection title="Valores del Periodo (S/)" columns={1}>
                        <Field label="Valor Planificado (PV)" required>
                            <Input type="number" min={0} step="0.01" value={crear.data.valor_planificado} onChange={(e) => crear.setData('valor_planificado', e.target.value)} />
                        </Field>
                        <Field label="Valor Ganado (EV)" required>
                            <Input type="number" min={0} step="0.01" value={crear.data.valor_ganado} onChange={(e) => crear.setData('valor_ganado', e.target.value)} />
                        </Field>
                        <Field label="Costo Real (AC)" required>
                            <Input type="number" min={0} step="0.01" value={crear.data.costo_real} onChange={(e) => crear.setData('costo_real', e.target.value)} />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Valorización
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
