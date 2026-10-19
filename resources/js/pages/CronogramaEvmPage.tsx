// Cronograma y gestión de valor ganado (EVM).
// Métricas desde `evmData`; hitos desde `hitosDb`; alta de hitos vía `useHttp`
// contra `/api/v1/proyectos/{obraId}/hitos`.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import {
    Field,
    Input,
    Select,
    FormPanel,
    FormSection,
    SubmitButton,
} from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFecha, formatMoneda } from '../utils/format';
import { IconPlus } from '../components/icons';

interface ObraDb {
    id: number;
    nombre: string;
    distrito?: string | null;
}

interface EvmData {
    obraId: string;
    nombre: string;
    bac: number;
    pv: number;
    ev: number;
    ac: number;
    cv: number;
    sv: number;
    cpi: number;
    spi: number;
    eac: number;
    vac: number;
    saludCosto: string;
    saludTiempo: string;
}

interface HitoDb {
    id: number;
    obra_id: number;
    nombre: string;
    fecha_planificada: string;
    fecha_real: string | null;
    estado: string;
    obra?: { id: number; nombre: string } | null;
}

interface CronogramaEvmPageProps {
    obrasDb?: ObraDb[];
    evmData?: EvmData | null;
    hitosDb?: HitoDb[];
}

function tonoEstado(estado: string): 'ok' | 'warn' | 'neutral' {
    if (estado === 'cumplido') return 'ok';
    if (estado === 'en_proceso' || estado === 'retrasado') return 'warn';
    return 'neutral';
}

export default function CronogramaEvmPage({
    obrasDb = [],
    evmData,
    hitosDb = [],
}: CronogramaEvmPageProps) {
    const notify = useNotifications();
    const [obraId, setObraId] = useState('');

    const crear = useHttp<{
        nombre: string;
        fecha_planificada: string;
        estado: string;
    }>({
        nombre: '',
        fecha_planificada: '',
        estado: 'pendiente',
    });

    useEffect(() => {
        if (!obraId && obrasDb.length > 0) {
            setObraId(String(obrasDb[0].id));
        }
    }, [obrasDb, obraId]);

    const hitos = useMemo(
        () =>
            hitosDb
                .filter((h) => String(h.obra_id) === obraId)
                .map((h) => ({ ...h, id: String(h.id) })),
        [hitosDb, obraId],
    );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!obraId) {
            notify.error('Selecciona una obra.');
            return;
        }
        if (!crear.data.nombre.trim() || !crear.data.fecha_planificada) {
            notify.error('Indica el nombre y la fecha planificada del hito.');
            return;
        }

        crear.transform(() => ({
            nombre: crear.data.nombre,
            fecha_planificada: crear.data.fecha_planificada,
            estado: crear.data.estado,
        }));

        void crear.post(`/api/v1/proyectos/${obraId}/hitos`, {
            onSuccess: () => {
                notify.success('Hito registrado en el cronograma.');
                crear.setData({
                    nombre: '',
                    fecha_planificada: '',
                    estado: 'pendiente',
                });
                refrescarProps('hitosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo registrar el hito.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cronograma y Gestión de Valor Ganado (EVM)"
                subtitle="Indicadores de desempeño de costo y plazo bajo metodología PMI (SPI, CPI, EAC, VAC)"
            />

            <Card className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <span className="text-muted font-mono text-xs uppercase">
                    Obra Evaluada:
                </span>
                <select
                    value={obraId}
                    onChange={(e) => setObraId(e.target.value)}
                    className="rounded-field border-line bg-canvas text-ink border px-3 py-1.5 text-xs outline-none"
                >
                    {obrasDb.map((o) => (
                        <option key={o.id} value={String(o.id)}>
                            {o.nombre} {o.distrito ? `(${o.distrito})` : ''}
                        </option>
                    ))}
                </select>
            </Card>

            {evmData ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-surface border-line p-4">
                        <span className="text-muted font-mono text-xs uppercase">
                            SPI (Desempeño Cronograma)
                        </span>
                        <p className="text-ink mt-2 font-mono text-2xl font-bold">
                            {evmData.spi.toFixed(4)}
                        </p>
                        <span className="text-muted text-xs">
                            SV: {formatMoneda(evmData.sv)}
                        </span>
                    </Card>

                    <Card className="bg-surface border-line p-4">
                        <span className="text-muted font-mono text-xs uppercase">
                            CPI (Desempeño Costo)
                        </span>
                        <p className="text-ink mt-2 font-mono text-2xl font-bold">
                            {evmData.cpi.toFixed(4)}
                        </p>
                        <span className="text-muted text-xs">
                            CV: {formatMoneda(evmData.cv)}
                        </span>
                    </Card>

                    <Card className="bg-surface border-line p-4">
                        <span className="text-muted font-mono text-xs uppercase">
                            EAC (Estimado a Conclusión)
                        </span>
                        <p className="text-ink mt-2 font-mono text-2xl font-bold">
                            {formatMoneda(evmData.eac)}
                        </p>
                        <span className="text-muted text-xs">
                            BAC: {formatMoneda(evmData.bac)}
                        </span>
                    </Card>

                    <Card className="bg-surface border-line p-4">
                        <span className="text-muted font-mono text-xs uppercase">
                            VAC (Variación Final)
                        </span>
                        <p className="text-ink mt-2 font-mono text-2xl font-bold">
                            {formatMoneda(evmData.vac)}
                        </p>
                        <span className="text-muted text-xs">
                            Obra: {evmData.nombre}
                        </span>
                    </Card>
                </div>
            ) : (
                <EmptyState
                    title="Sin datos EVM"
                    hint="Aún no hay valorizaciones registradas para calcular indicadores."
                />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <Card
                    title="Hitos Contractuales de Cronograma"
                    className="lg:col-span-2"
                >
                    {hitos.length === 0 ? (
                        <EmptyState
                            title="Sin hitos registrados"
                            hint="Registra el primer hito con el panel lateral."
                        />
                    ) : (
                        <DataTable
                            emptyLabel="Sin hitos registrados."
                            columns={[
                                { key: 'nombre', header: 'Hito Contractual' },
                                {
                                    key: 'fecha_planificada',
                                    header: 'Fecha Planificada',
                                    mono: true,
                                    cell: (h) =>
                                        formatFecha(h.fecha_planificada),
                                },
                                {
                                    key: 'fecha_real',
                                    header: 'Fecha Real',
                                    mono: true,
                                    cell: (h) =>
                                        h.fecha_real
                                            ? formatFecha(h.fecha_real)
                                            : '—',
                                },
                                {
                                    key: 'estado',
                                    header: 'Estado',
                                    cell: (h) => (
                                        <Badge tone={tonoEstado(h.estado)}>
                                            {h.estado.replace('_', ' ')}
                                        </Badge>
                                    ),
                                },
                            ]}
                            rows={hitos}
                        />
                    )}
                </Card>

                <FormPanel
                    title="Registrar Hito"
                    subtitle="Nuevo hito del cronograma contractual"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Detalle del Hito" columns={1}>
                        <Field label="Obra" required>
                            <Select
                                value={obraId}
                                onChange={(e) => setObraId(e.target.value)}
                            >
                                {obrasDb.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Nombre del Hito" required>
                            <Input
                                value={crear.data.nombre}
                                onChange={(e) =>
                                    crear.setData('nombre', e.target.value)
                                }
                                placeholder="Culminación de movimiento de tierras"
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Fecha Planificada" required>
                                <Input
                                    type="date"
                                    value={crear.data.fecha_planificada}
                                    onChange={(e) =>
                                        crear.setData(
                                            'fecha_planificada',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field label="Estado">
                                <Select
                                    value={crear.data.estado}
                                    onChange={(e) =>
                                        crear.setData('estado', e.target.value)
                                    }
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en_proceso">
                                        En Proceso
                                    </option>
                                    <option value="cumplido">Cumplido</option>
                                    <option value="retrasado">Retrasado</option>
                                </Select>
                            </Field>
                        </div>
                    </FormSection>

                    <SubmitButton
                        status={crear.processing ? 'submitting' : 'idle'}
                        className="w-full"
                    >
                        <IconPlus size={15} />
                        Registrar Hito
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
