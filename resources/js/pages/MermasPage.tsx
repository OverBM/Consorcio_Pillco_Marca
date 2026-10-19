// Control de Mermas y Materiales Dañados (Macroproceso MP-30).
// Registro de pérdidas por deterioro, robo u obsolescencia con egreso automático de stock.
// Datos desde props `mermasDb`; alta vía `useHttp` contra `/api/v1/mermas`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import {
    Field,
    Input,
    Select,
    Textarea,
    FormPanel,
    FormSection,
    SubmitButton,
} from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFs } from '../utils/format';
import type { Catalogos } from '../types';
import { IconSearch, IconTrash } from '../components/icons';

interface MermaDb {
    id: number;
    almacen_id: number;
    material_id: number;
    cantidad: number | string;
    causa: string;
    justificacion: string;
    estado: string;
    created_at: string;
    almacen?: { id: number; nombre: string } | null;
    material?: {
        id: number;
        nombre: string;
        unidad_medida?: { codigo: string } | null;
    } | null;
}

interface MermasPageProps {
    mermasDb?: MermaDb[];
}

type MermaFila = Omit<MermaDb, 'id'> & { id: string };

const CAUSAS = [
    { value: 'deterioro', label: 'Deterioro / Daño físico' },
    { value: 'robo', label: 'Hurto / Pérdida no identificada' },
    { value: 'obsolescencia', label: 'Obsolescencia / Fraguado' },
    { value: 'derrame', label: 'Derrame / Manipulación' },
    { value: 'otro', label: 'Otro' },
];

export default function MermasPage({ mermasDb = [] }: MermasPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as {
        catalogos?: Catalogos;
    };
    const almacenes = catalogos?.almacenes ?? [];
    const materiales = catalogos?.materiales ?? [];

    const crear = useHttp<{
        almacen_id: string;
        material_id: string;
        cantidad: string;
        causa: string;
        justificacion: string;
    }>({
        almacen_id: '',
        material_id: '',
        cantidad: '',
        causa: 'deterioro',
        justificacion: '',
    });

    const [busqueda, setBusqueda] = useState('');

    const filas: MermaFila[] = useMemo(
        () => mermasDb.map((m) => ({ ...m, id: String(m.id) })),
        [mermasDb],
    );

    const filtradas = useMemo(
        () =>
            filas.filter((m) => {
                if (!busqueda.trim()) return true;
                const q = busqueda.toLowerCase();
                return (
                    (m.material?.nombre ?? '').toLowerCase().includes(q) ||
                    (m.almacen?.nombre ?? '').toLowerCase().includes(q) ||
                    m.causa.toLowerCase().includes(q)
                );
            }),
        [filas, busqueda],
    );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.almacen_id || !crear.data.material_id) {
            notify.error('Selecciona almacén y material.');
            return;
        }
        if (Number(crear.data.cantidad) <= 0) {
            notify.error('La cantidad a dar de baja debe ser mayor a cero.');
            return;
        }
        if (!crear.data.justificacion.trim()) {
            notify.error('Describe la causa o incidente.');
            return;
        }

        crear.transform(() => ({
            almacen_id: Number(crear.data.almacen_id),
            material_id: Number(crear.data.material_id),
            cantidad: Number(crear.data.cantidad),
            causa: crear.data.causa,
            justificacion: crear.data.justificacion,
        }));

        void crear.post('/api/v1/mermas', {
            onSuccess: () => {
                notify.success('Merma registrada y stock ajustado.');
                crear.setData({
                    almacen_id: '',
                    material_id: '',
                    cantidad: '',
                    causa: 'deterioro',
                    justificacion: '',
                });
                refrescarProps('mermasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo registrar la merma.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mermas y Materiales Dañados"
                subtitle="Baja de inventario por deterioro, robo u obsolescencia con asiento automático en kardex"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card className="p-4">
                        <div className="relative">
                            <IconSearch
                                size={16}
                                className="text-muted absolute top-1/2 left-3 -translate-y-1/2"
                            />
                            <input
                                type="text"
                                placeholder="Buscar por material, almacén o causa…"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="border-line bg-canvas text-ink focus:ring-brand-500 w-full rounded-lg border py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none"
                            />
                        </div>
                    </Card>

                    <Card
                        className="mt-4"
                        title={`Registro de Mermas (${filtradas.length})`}
                    >
                        {filas.length === 0 ? (
                            <EmptyState
                                title="Sin mermas registradas"
                                hint="Registra la primera baja con el panel lateral."
                            />
                        ) : (
                            <DataTable
                                emptyLabel="No hay mermas que coincidan con la búsqueda."
                                columns={[
                                    {
                                        key: 'material',
                                        header: 'Material y Cantidad',
                                        cell: (m) => (
                                            <div>
                                                <p className="text-ink text-xs font-bold">
                                                    {m.material?.nombre ??
                                                        `Material #${m.material_id}`}
                                                </p>
                                                <p className="text-danger font-mono text-[11px] font-bold">
                                                    -
                                                    {formatCantidad(
                                                        Number(m.cantidad),
                                                    )}{' '}
                                                    {m.material?.unidad_medida
                                                        ?.codigo ?? ''}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'almacen',
                                        header: 'Almacén',
                                        cell: (m) =>
                                            m.almacen?.nombre ??
                                            `Almacén #${m.almacen_id}`,
                                    },
                                    {
                                        key: 'causa',
                                        header: 'Clasificación',
                                        cell: (m) => (
                                            <Badge
                                                tone={
                                                    m.causa === 'robo'
                                                        ? 'danger'
                                                        : 'warn'
                                                }
                                            >
                                                {m.causa.toUpperCase()}
                                            </Badge>
                                        ),
                                    },
                                    {
                                        key: 'justificacion',
                                        header: 'Justificación',
                                        cell: (m) => (
                                            <span
                                                className="text-muted block max-w-64 truncate text-xs"
                                                title={m.justificacion}
                                            >
                                                {m.justificacion}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'fecha',
                                        header: 'Fecha',
                                        mono: true,
                                        cell: (m) => formatFs(m.created_at),
                                    },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (m) => (
                                            <Badge tone="ok">{m.estado}</Badge>
                                        ),
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel
                    title="Registrar Merma"
                    subtitle="Baja directa sobre el stock del almacén"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Ubicación" columns={1}>
                        <Field label="Almacén" required>
                            <Select
                                value={crear.data.almacen_id}
                                onChange={(e) =>
                                    crear.setData('almacen_id', e.target.value)
                                }
                            >
                                <option value="">Selecciona almacén…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Material" required>
                            <Select
                                value={crear.data.material_id}
                                onChange={(e) =>
                                    crear.setData('material_id', e.target.value)
                                }
                            >
                                <option value="">Selecciona material…</option>
                                {materiales.map((m) => (
                                    <option key={m.id} value={String(m.id)}>
                                        {m.nombre} ({m.unidad?.codigo ?? ''})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Cantidad" required>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.001"
                                    value={crear.data.cantidad}
                                    onChange={(e) =>
                                        crear.setData(
                                            'cantidad',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field label="Clasificación" required>
                                <Select
                                    value={crear.data.causa}
                                    onChange={(e) =>
                                        crear.setData('causa', e.target.value)
                                    }
                                >
                                    {CAUSAS.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="Justificación" columns={1}>
                        <Field label="Causa o incidente" required>
                            <Textarea
                                value={crear.data.justificacion}
                                onChange={(e) =>
                                    crear.setData(
                                        'justificacion',
                                        e.target.value,
                                    )
                                }
                                rows={3}
                                placeholder="Detallar condiciones ambientales, manipulación o motivo del deterioro…"
                            />
                        </Field>
                    </FormSection>

                    <SubmitButton
                        status={crear.processing ? 'submitting' : 'idle'}
                        className="w-full"
                    >
                        <IconTrash size={15} />
                        Registrar y Procesar Baja
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
