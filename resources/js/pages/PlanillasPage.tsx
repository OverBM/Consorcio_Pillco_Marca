// Planillas de Pago y Jornales (Macroproceso MP-20).
// Lista `planillasDb` y genera/recalcula el periodo vía `useHttp`
// contra `/api/v1/personal/planillas/generar`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, Select, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatMoneda, formatNum } from '../utils/format';
import type { Catalogos } from '../types';
import { IconFileText } from '../components/icons';

interface PlanillaDetalleDb {
    id: number;
    dias_laborados: number;
    horas_totales: number | string;
    monto: number | string;
}

interface PlanillaDb {
    id: number;
    periodo: string;
    estado: string;
    total: number | string;
    created_at: string;
    obra?: { id: number; nombre: string } | null;
    detalles?: PlanillaDetalleDb[];
}

interface PlanillasPageProps {
    planillasDb?: PlanillaDb[];
}

type PlanillaFila = Omit<PlanillaDb, 'id'> & { id: string; obreros: number; diasTotal: number };

export default function PlanillasPage({ planillasDb = [] }: PlanillasPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const generar = useHttp<{ obra_id: string; periodo: string }>({
        obra_id: obras[0] ? String(obras[0].id) : '',
        periodo: '',
    });

    const filas: PlanillaFila[] = useMemo(
        () =>
            planillasDb.map((p) => {
                const detalles = p.detalles ?? [];
                return {
                    ...p,
                    id: String(p.id),
                    obreros: detalles.length,
                    diasTotal: detalles.reduce((acc, d) => acc + Number(d.dias_laborados ?? 0), 0),
                };
            }),
        [planillasDb],
    );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!generar.data.obra_id) {
            notify.error('Selecciona la obra.');
            return;
        }
        if (!generar.data.periodo.trim()) {
            notify.error('Indica el periodo (p. ej. 2026-10-Q1).');
            return;
        }

        generar.transform(() => ({
            obra_id: Number(generar.data.obra_id),
            periodo: generar.data.periodo.trim(),
        }));

        void generar.post('/api/v1/personal/planillas/generar', {
            onSuccess: () => {
                notify.success('Planilla generada y procesada.');
                generar.setData({ obra_id: obras[0] ? String(obras[0].id) : '', periodo: '' });
                refrescarProps('planillasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo generar la planilla.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Planillas de Pago y Jornales"
                subtitle="Consolidación de horas efectivas laboradas, régimen de construcción civil y emisión de boletas"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Planillas Generadas (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin planillas generadas" hint="Genera la primera planilla con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin planillas generadas."
                                columns={[
                                    { key: 'obra', header: 'Obra', cell: (p) => p.obra?.nombre ?? '—' },
                                    { key: 'periodo', header: 'Periodo de Pago', mono: true },
                                    { key: 'obreros', header: 'N° Obreros', align: 'center', mono: true },
                                    { key: 'diasTotal', header: 'Días-Hombre', align: 'right', mono: true, cell: (p) => formatNum(p.diasTotal) },
                                    { key: 'total', header: 'Monto Total', align: 'right', mono: true, cell: (p) => formatMoneda(Number(p.total ?? 0)) },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (p) => (
                                            <Badge tone={p.estado === 'pagada' ? 'ok' : 'violet'}>
                                                {p.estado === 'pagada' ? 'Pagada / Bancarizada' : 'Procesada'}
                                            </Badge>
                                        ),
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Generar Planilla" subtitle="Recalcula jornales de la obra en el periodo" onSubmit={enviar} className="text-xs">
                    <FormSection title="Parámetros" columns={1}>
                        <Field label="Obra" required>
                            <Select value={generar.data.obra_id} onChange={(e) => generar.setData('obra_id', e.target.value)}>
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Periodo" required hint="Formato sugerido: 2026-10-Q1">
                            <Input value={generar.data.periodo} onChange={(e) => generar.setData('periodo', e.target.value)} placeholder="2026-10-Q1" />
                        </Field>
                    </FormSection>

                    <SubmitButton status={generar.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconFileText size={15} />
                        Generar y Procesar
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
