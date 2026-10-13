// Monitoreo Ambiental y Cumplimiento de LMP.
// Lista `medicionesDb` y registra mediciones (con verificación de LMP en el backend)
// vía `useHttp` contra `/api/v1/ambiente/mediciones`.

import { useMemo, type FormEvent } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFs, formatNum } from '../utils/format';
import type { Catalogos } from '../types';
import { IconPlus } from '../components/icons';

interface IndicadorDb {
    id: number;
    codigo: string;
    nombre: string;
    unidad: string;
    limite_maximo: number | string;
}

interface MedicionDb {
    id: number;
    valor: number | string;
    fuera_de_limite: boolean;
    medido_en: string;
    medida_correctiva: string | null;
    obra?: { id: number; nombre: string } | null;
    indicador?: IndicadorDb | null;
}

interface MonitoreoPageProps {
    medicionesDb?: MedicionDb[];
    indicadoresDb?: IndicadorDb[];
}

type MedicionFila = Omit<MedicionDb, 'id'> & { id: string };

export default function MonitoreoAmbientalPage({ medicionesDb = [], indicadoresDb = [] }: MonitoreoPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const crear = useHttp<{ obra_id: string; indicador_id: string; valor: string; medida_correctiva: string }>({
        obra_id: obras[0] ? String(obras[0].id) : '',
        indicador_id: indicadoresDb[0] ? String(indicadoresDb[0].id) : '',
        valor: '',
        medida_correctiva: '',
    });

    const filas: MedicionFila[] = useMemo(() => medicionesDb.map((m) => ({ ...m, id: String(m.id) })), [medicionesDb]);

    const excedidas = useMemo(() => filas.filter((m) => m.fuera_de_limite).length, [filas]);

    const indicadorSeleccionado = useMemo(
        () => indicadoresDb.find((i) => String(i.id) === crear.data.indicador_id),
        [indicadoresDb, crear.data.indicador_id],
    );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id) {
            notify.error('Selecciona la obra.');
            return;
        }
        if (!crear.data.indicador_id) {
            notify.error('Selecciona el parámetro ambiental.');
            return;
        }
        if (crear.data.valor === '' || Number(crear.data.valor) < 0) {
            notify.error('Ingresa un valor medido válido.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            indicador_id: Number(crear.data.indicador_id),
            valor: Number(crear.data.valor),
            medida_correctiva: crear.data.medida_correctiva.trim() || null,
        }));

        crear.post('/api/v1/ambiente/mediciones', {
            onSuccess: () => {
                notify.success('Medición ambiental registrada.');
                crear.setData({ obra_id: obras[0] ? String(obras[0].id) : '', indicador_id: indicadoresDb[0] ? String(indicadoresDb[0].id) : '', valor: '', medida_correctiva: '' });
                router.reload({ only: ['medicionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la medición.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Monitoreo Ambiental y Cumplimiento de LMP"
                subtitle="Registro de parámetros de calidad de aire, ruido ambiental y agua con detección automática de superación de límites permisibles"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Mediciones Registradas (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin mediciones ambientales" hint="Registra la primera medición con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin mediciones ambientales registradas."
                                columns={[
                                    { key: 'indicador', header: 'Parámetro Ambiental', cell: (m) => <span className="font-bold text-ink">{m.indicador?.nombre ?? '—'}</span> },
                                    { key: 'obra', header: 'Obra', cell: (m) => m.obra?.nombre ?? '—' },
                                    { key: 'fecha', header: 'Fecha y Hora', mono: true, cell: (m) => formatFs(m.medido_en) },
                                    { key: 'limite', header: 'LMP Normativo', align: 'right', mono: true, cell: (m) => `${formatNum(Number(m.indicador?.limite_maximo ?? 0))} ${m.indicador?.unidad ?? ''}` },
                                    { key: 'valor', header: 'Valor Medido', align: 'right', mono: true, cell: (m) => `${formatNum(Number(m.valor))} ${m.indicador?.unidad ?? ''}` },
                                    {
                                        key: 'estado',
                                        header: 'Cumplimiento',
                                        align: 'center',
                                        cell: (m) => <Badge tone={m.fuera_de_limite ? 'danger' : 'ok'}>{m.fuera_de_limite ? 'Supera LMP' : 'Dentro de Norma'}</Badge>,
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Registrar Medición" subtitle={`${excedidas} mediciones exceden el LMP`} onSubmit={enviar} className="text-xs">
                    <FormSection title="Parámetro" columns={1}>
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
                        <Field label="Indicador Ambiental" required>
                            <Select value={crear.data.indicador_id} onChange={(e) => crear.setData('indicador_id', e.target.value)}>
                                <option value="">Selecciona indicador…</option>
                                {indicadoresDb.map((i) => (
                                    <option key={i.id} value={String(i.id)}>
                                        {i.nombre} ({i.unidad})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Valor Medido" required hint={indicadorSeleccionado ? `LMP: ${formatNum(Number(indicadorSeleccionado.limite_maximo))} ${indicadorSeleccionado.unidad}` : 'Unidad según el indicador'}>
                            <Input type="number" min={0} step="0.001" value={crear.data.valor} onChange={(e) => crear.setData('valor', e.target.value)} />
                        </Field>
                    </FormSection>

                    <FormSection title="Acción" columns={1}>
                        <Field label="Medida Correctiva">
                            <Textarea value={crear.data.medida_correctiva} onChange={(e) => crear.setData('medida_correctiva', e.target.value)} rows={2} placeholder="Aplica solo si se supera el LMP…" />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Medición
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
