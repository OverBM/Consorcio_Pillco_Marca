// Alcance y partidas contractuales (EDT).
// Lista `partidasDb` y registra nuevas partidas vía `useHttp` contra `/api/v1/partidas`.

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
import { IconPlus } from '../components/icons';

interface PartidaDb {
    id: number;
    obra_id: number;
    codigo: string;
    descripcion: string;
    unidad: string;
    metrado: number | string;
    costo_unitario: number | string;
    avance_pct: number | string;
    obra?: { id: number; nombre: string } | null;
}

interface PartidasPageProps {
    partidasDb?: PartidaDb[];
}

export default function PartidasPage({ partidasDb = [] }: PartidasPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const [obraFiltro, setObraFiltro] = useState('todas');

    const crear = useHttp<{
        obra_id: string;
        codigo: string;
        descripcion: string;
        unidad: string;
        metrado: string;
        costo_unitario: string;
        avance_pct: string;
    }>({ obra_id: '', codigo: '', descripcion: '', unidad: '', metrado: '', costo_unitario: '', avance_pct: '' });

    const filtradas = useMemo(() => {
        const base = obraFiltro === 'todas' ? partidasDb : partidasDb.filter((p) => String(p.obra_id) === obraFiltro);
        return base.map((p) => ({ ...p, id: String(p.id) }));
    }, [partidasDb, obraFiltro]);

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id || !crear.data.codigo.trim() || !crear.data.descripcion.trim() || !crear.data.unidad.trim()) {
            notify.error('Completa obra, código, descripción y unidad.');
            return;
        }
        if (Number(crear.data.metrado) <= 0 || Number(crear.data.costo_unitario) < 0) {
            notify.error('Verifica el metrado y el costo unitario.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            codigo: crear.data.codigo,
            descripcion: crear.data.descripcion,
            unidad: crear.data.unidad,
            metrado: Number(crear.data.metrado),
            costo_unitario: Number(crear.data.costo_unitario),
            avance_pct: Number(crear.data.avance_pct || 0),
        }));

        crear.post('/api/v1/partidas', {
            onSuccess: () => {
                notify.success('Partida registrada en la EDT.');
                crear.setData({ obra_id: '', codigo: '', descripcion: '', unidad: '', metrado: '', costo_unitario: '', avance_pct: '' });
                refrescarProps('partidasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la partida.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Alcance y Partidas Contractuales"
                subtitle="Estructura de Desglose del Trabajo (EDT), metrados contractuales y avance ejecutado"
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
                                <option key={o.id} value={String(o.id)}>
                                    {o.nombre}
                                </option>
                            ))}
                        </select>
                    </Card>

                    <Card title={`Partidas (${filtradas.length})`}>
                        {partidasDb.length === 0 ? (
                            <EmptyState title="Sin partidas registradas" hint="Registra la primera partida con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="No hay partidas para la obra seleccionada."
                                columns={[
                                    { key: 'codigo', header: 'Ítem / Código', mono: true },
                                    { key: 'descripcion', header: 'Descripción de la Partida' },
                                    { key: 'unidad', header: 'Unidad', align: 'center', mono: true },
                                    { key: 'metrado', header: 'Metrado', align: 'right', mono: true, cell: (p) => formatNum(Number(p.metrado)) },
                                    {
                                        key: 'parcial',
                                        header: 'Costo Total (S/)',
                                        align: 'right',
                                        mono: true,
                                        cell: (p) => formatMoneda(Number(p.metrado) * Number(p.costo_unitario)),
                                    },
                                    {
                                        key: 'avance',
                                        header: 'Avance %',
                                        align: 'right',
                                        cell: (p) => {
                                            const avance = Number(p.avance_pct || 0);
                                            return (
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-1.5 bg-soft rounded-full overflow-hidden">
                                                        <div className="h-full bg-ok rounded-full" style={{ width: `${Math.min(100, avance)}%` }} />
                                                    </div>
                                                    <span className="font-mono font-bold text-xs text-ink">{avance}%</span>
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        key: 'obra',
                                        header: 'Obra',
                                        cell: (p) => <Badge tone="neutral">{p.obra?.nombre ?? `#${p.obra_id}`}</Badge>,
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Registrar Partida" subtitle="Nueva partida de la EDT contractual" onSubmit={enviar} className="text-xs">
                    <FormSection title="Clasificación" columns={1}>
                        <Field label="Obra" required>
                            <Select value={crear.data.obra_id} onChange={(e) => crear.setData('obra_id', e.target.value)}>
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>{o.nombre}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Código (Ítem)" required>
                            <Input value={crear.data.codigo} onChange={(e) => crear.setData('codigo', e.target.value)} placeholder="01.02.01" />
                        </Field>
                        <Field label="Descripción" required>
                            <Input value={crear.data.descripcion} onChange={(e) => crear.setData('descripcion', e.target.value)} />
                        </Field>
                        <Field label="Unidad" required>
                            <Input value={crear.data.unidad} onChange={(e) => crear.setData('unidad', e.target.value)} placeholder="M3, M2, KG" />
                        </Field>
                    </FormSection>

                    <FormSection title="Metrado y Costo" columns={1}>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Metrado" required>
                                <Input type="number" min={0} step="0.001" value={crear.data.metrado} onChange={(e) => crear.setData('metrado', e.target.value)} />
                            </Field>
                            <Field label="Costo Unit. (S/)" required>
                                <Input type="number" min={0} step="0.0001" value={crear.data.costo_unitario} onChange={(e) => crear.setData('costo_unitario', e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Avance %" hint="Opcional, por defecto 0%.">
                            <Input type="number" min={0} max={100} value={crear.data.avance_pct} onChange={(e) => crear.setData('avance_pct', e.target.value)} />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Partida
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
