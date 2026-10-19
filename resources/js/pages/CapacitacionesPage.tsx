// Capacitación y Habilitación de Personal (SST).
// Lista `capacitacionesDb` y programa nuevas capacitaciones vía `useHttp`
// contra `/api/v1/sst/capacitaciones`.

import { useMemo, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
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
import { formatFecha } from '../utils/format';
import type { Catalogos } from '../types';
import { IconPlus } from '../components/icons';

interface CapacitacionDb {
    id: number;
    tipo: string;
    titulo: string;
    fecha_programada: string;
    instructor: string | null;
    nota_minima: number | string | null;
    estado: string;
    obra?: { id: number; nombre: string } | null;
}

interface CapacitacionesPageProps {
    capacitacionesDb?: CapacitacionDb[];
}

type CapacitacionFila = Omit<CapacitacionDb, 'id'> & { id: string };

const TIPOS = [
    { value: 'sst', label: 'SST Operativa' },
    { value: 'calidad', label: 'Calidad' },
    { value: 'ambiente', label: 'Medio Ambiente' },
    { value: 'induccion', label: 'Inducción' },
];

export default function CapacitacionesPage({
    capacitacionesDb = [],
}: CapacitacionesPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as {
        catalogos?: Catalogos;
    };
    const obras = catalogos?.obras ?? [];

    const crear = useHttp<{
        tipo: string;
        titulo: string;
        obra_id: string;
        fecha_programada: string;
        instructor: string;
        nota_minima: string;
    }>({
        tipo: 'sst',
        titulo: '',
        obra_id: '',
        fecha_programada: '',
        instructor: '',
        nota_minima: '',
    });

    const filas: CapacitacionFila[] = useMemo(
        () => capacitacionesDb.map((c) => ({ ...c, id: String(c.id) })),
        [capacitacionesDb],
    );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.titulo.trim()) {
            notify.error('Ingresa el tema de capacitación.');
            return;
        }
        if (!crear.data.fecha_programada) {
            notify.error('Indica la fecha programada.');
            return;
        }

        crear.transform(() => ({
            tipo: crear.data.tipo,
            titulo: crear.data.titulo.trim(),
            obra_id: crear.data.obra_id ? Number(crear.data.obra_id) : null,
            fecha_programada: crear.data.fecha_programada,
            instructor: crear.data.instructor.trim() || null,
            nota_minima: crear.data.nota_minima
                ? Number(crear.data.nota_minima)
                : null,
        }));

        void crear.post('/api/v1/sst/capacitaciones', {
            onSuccess: () => {
                notify.success('Capacitación SST programada.');
                crear.setData({
                    tipo: 'sst',
                    titulo: '',
                    obra_id: '',
                    fecha_programada: '',
                    instructor: '',
                    nota_minima: '',
                });
                refrescarProps('capacitacionesDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo programar la capacitación.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Capacitación y Habilitación de Personal"
                subtitle="Registro de inducciones de seguridad, capacitaciones técnicas y habilitación para frentes de obra"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Capacitaciones (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState
                                title="Sin capacitaciones programadas"
                                hint="Programa la primera capacitación con el panel lateral."
                            />
                        ) : (
                            <DataTable
                                emptyLabel="Sin capacitaciones programadas."
                                columns={[
                                    {
                                        key: 'titulo',
                                        header: 'Tema de Capacitación',
                                        cell: (c) => (
                                            <span className="text-ink font-bold">
                                                {c.titulo}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'tipo',
                                        header: 'Tipo',
                                        mono: true,
                                        cell: (c) => c.tipo.toUpperCase(),
                                    },
                                    {
                                        key: 'obra',
                                        header: 'Obra',
                                        cell: (c) => c.obra?.nombre ?? 'Todas',
                                    },
                                    {
                                        key: 'fecha',
                                        header: 'Fecha Programada',
                                        mono: true,
                                        cell: (c) =>
                                            formatFecha(c.fecha_programada),
                                    },
                                    {
                                        key: 'instructor',
                                        header: 'Instructor / Especialista',
                                        cell: (c) => c.instructor ?? '—',
                                    },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (c) => (
                                            <Badge
                                                tone={
                                                    c.estado === 'ejecutada' ||
                                                    c.estado === 'completada'
                                                        ? 'ok'
                                                        : 'warn'
                                                }
                                            >
                                                {c.estado.toUpperCase()}
                                            </Badge>
                                        ),
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel
                    title="Programar Capacitación"
                    subtitle="Inducción o capacitación técnica SST"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Datos" columns={1}>
                        <Field label="Tema" required>
                            <Input
                                value={crear.data.titulo}
                                onChange={(e) =>
                                    crear.setData('titulo', e.target.value)
                                }
                                placeholder="Trabajos en Altura y Uso de Arnés"
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Tipo" required>
                                <Select
                                    value={crear.data.tipo}
                                    onChange={(e) =>
                                        crear.setData('tipo', e.target.value)
                                    }
                                >
                                    {TIPOS.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Obra">
                                <Select
                                    value={crear.data.obra_id}
                                    onChange={(e) =>
                                        crear.setData('obra_id', e.target.value)
                                    }
                                >
                                    <option value="">Todas las obras</option>
                                    {obras.map((o) => (
                                        <option key={o.id} value={String(o.id)}>
                                            {o.nombre}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Fecha Programada" required>
                            <Input
                                type="date"
                                value={crear.data.fecha_programada}
                                onChange={(e) =>
                                    crear.setData(
                                        'fecha_programada',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Instructor">
                                <Input
                                    value={crear.data.instructor}
                                    onChange={(e) =>
                                        crear.setData(
                                            'instructor',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ing. Prevencionista"
                                />
                            </Field>
                            <Field label="Nota Mínima" hint="Escala 0–20">
                                <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step="0.1"
                                    value={crear.data.nota_minima}
                                    onChange={(e) =>
                                        crear.setData(
                                            'nota_minima',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>
                    </FormSection>

                    <SubmitButton
                        status={crear.processing ? 'submitting' : 'idle'}
                        className="w-full"
                    >
                        <IconPlus size={15} />
                        Programar Capacitación
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
