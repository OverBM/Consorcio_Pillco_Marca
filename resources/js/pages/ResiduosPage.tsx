// Gestión Integral de Residuos y Desmonte.
// Lista `residuosDb` y registra residuos/excedentes vía `useHttp`
// contra `/api/v1/ambiente/residuos`.

import { useMemo, type FormEvent } from 'react';
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
import { formatCantidad } from '../utils/format';
import type { Catalogos } from '../types';
import { IconPlus } from '../components/icons';

interface EmpresaEorsDb {
    id: number;
    razon_social: string;
}

interface ResiduoDb {
    id: number;
    clase: string;
    descripcion: string;
    volumen: number | string;
    unidad: string;
    destino: string | null;
    estado: string;
    obra?: { id: number; nombre: string } | null;
    almacen?: { id: number; nombre: string } | null;
    material?: { id: number; nombre: string } | null;
    eors?: EmpresaEorsDb | null;
}

interface ResiduosPageProps {
    residuosDb?: ResiduoDb[];
    eorsDb?: EmpresaEorsDb[];
}

type ResiduoFila = Omit<ResiduoDb, 'id'> & { id: string };

const CLASES = [
    { value: 'reutilizable', label: 'Reutilizable (Economía Circular)' },
    { value: 'no_peligroso', label: 'No Peligroso' },
    { value: 'peligroso', label: 'Peligroso' },
];

const DESTINOS = [
    { value: 'reutilizacion', label: 'Reutilización en obra' },
    { value: 'reciclaje', label: 'Reciclaje / Valorización' },
    { value: 'relleno', label: 'Relleno de seguridad' },
    { value: 'acopio', label: 'Acopio temporal' },
    { value: 'transferencia', label: 'Transferencia inter-obras' },
];

const UNIDADES = ['M3', 'M2', 'TN', 'KG', 'UN', 'LT'];

export default function ResiduosPage({
    residuosDb = [],
    eorsDb = [],
}: ResiduosPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as {
        catalogos?: Catalogos;
    };
    const obras = catalogos?.obras ?? [];
    const almacenes = catalogos?.almacenes ?? [];
    const materiales = catalogos?.materiales ?? [];

    const crear = useHttp<{
        obra_id: string;
        almacen_id: string;
        clase: string;
        descripcion: string;
        material_id: string;
        volumen: string;
        unidad: string;
        destino: string;
        eors_id: string;
    }>({
        obra_id: obras[0] ? String(obras[0].id) : '',
        almacen_id: almacenes[0] ? String(almacenes[0].id) : '',
        clase: 'reutilizable',
        descripcion: '',
        material_id: '',
        volumen: '',
        unidad: 'M3',
        destino: 'reutilizacion',
        eors_id: '',
    });

    const filas: ResiduoFila[] = useMemo(
        () => residuosDb.map((r) => ({ ...r, id: String(r.id) })),
        [residuosDb],
    );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id) {
            notify.error('Selecciona la obra.');
            return;
        }
        if (!crear.data.almacen_id) {
            notify.error('Selecciona el almacén de acopio.');
            return;
        }
        if (!crear.data.descripcion.trim()) {
            notify.error('Describe el residuo o material.');
            return;
        }
        if (Number(crear.data.volumen) <= 0) {
            notify.error('El volumen debe ser mayor a cero.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            almacen_id: Number(crear.data.almacen_id),
            clase: crear.data.clase,
            descripcion: crear.data.descripcion.trim(),
            material_id: crear.data.material_id
                ? Number(crear.data.material_id)
                : null,
            volumen: Number(crear.data.volumen),
            unidad: crear.data.unidad,
            destino: crear.data.destino,
            eors_id: crear.data.eors_id ? Number(crear.data.eors_id) : null,
        }));

        void crear.post('/api/v1/ambiente/residuos', {
            onSuccess: () => {
                notify.success('Residuo o material reutilizable registrado.');
                crear.setData({
                    obra_id: obras[0] ? String(obras[0].id) : '',
                    almacen_id: almacenes[0] ? String(almacenes[0].id) : '',
                    clase: 'reutilizable',
                    descripcion: '',
                    material_id: '',
                    volumen: '',
                    unidad: 'M3',
                    destino: 'reutilizacion',
                    eors_id: '',
                });
                refrescarProps('residuosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo registrar el residuo.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión Integral de Residuos y Desmonte"
                subtitle="Clasificación en fuente, economía circular (reutilización inter-obras) y manifiestos de disposición final vía EO-RS"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Residuos y Excedentes (${filas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState
                                title="Sin residuos registrados"
                                hint="Registra el primer residuo con el panel lateral."
                            />
                        ) : (
                            <DataTable
                                emptyLabel="Sin residuos registrados."
                                columns={[
                                    {
                                        key: 'descripcion',
                                        header: 'Descripción del Residuo / Material',
                                        cell: (r) => (
                                            <span className="text-ink font-bold">
                                                {r.descripcion}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'clase',
                                        header: 'Clasificación',
                                        align: 'center',
                                        cell: (r) => (
                                            <Badge
                                                tone={
                                                    r.clase === 'reutilizable'
                                                        ? 'ok'
                                                        : r.clase ===
                                                            'no_peligroso'
                                                          ? 'neutral'
                                                          : 'danger'
                                                }
                                            >
                                                {r.clase
                                                    .replace('_', ' ')
                                                    .toUpperCase()}
                                            </Badge>
                                        ),
                                    },
                                    {
                                        key: 'volumen',
                                        header: 'Volumen',
                                        align: 'right',
                                        mono: true,
                                        cell: (r) =>
                                            `${formatCantidad(Number(r.volumen))} ${r.unidad}`,
                                    },
                                    {
                                        key: 'destino',
                                        header: 'Destino / Aplicación',
                                        cell: (r) => r.destino ?? '—',
                                    },
                                    {
                                        key: 'eors',
                                        header: 'Empresa EO-RS',
                                        cell: (r) =>
                                            r.eors?.razon_social ??
                                            'Uso interno',
                                    },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (r) => (
                                            <Badge
                                                tone={
                                                    r.estado === 'dispuesto'
                                                        ? 'ok'
                                                        : 'warn'
                                                }
                                            >
                                                {r.estado
                                                    .replace('_', ' ')
                                                    .toUpperCase()}
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
                    title="Registrar Residuo"
                    subtitle="Clasificación en fuente y acopio"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Ubicación" columns={1}>
                        <Field label="Obra" required>
                            <Select
                                value={crear.data.obra_id}
                                onChange={(e) =>
                                    crear.setData('obra_id', e.target.value)
                                }
                            >
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Almacén de Acopio" required>
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
                    </FormSection>

                    <FormSection title="Residuo" columns={1}>
                        <Field label="Clasificación" required>
                            <Select
                                value={crear.data.clase}
                                onChange={(e) =>
                                    crear.setData('clase', e.target.value)
                                }
                            >
                                {CLASES.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Descripción" required>
                            <Textarea
                                value={crear.data.descripcion}
                                onChange={(e) =>
                                    crear.setData('descripcion', e.target.value)
                                }
                                rows={2}
                                placeholder="Desmonte, retazos, envases…"
                            />
                        </Field>
                        <Field label="Material Asociado">
                            <Select
                                value={crear.data.material_id}
                                onChange={(e) =>
                                    crear.setData('material_id', e.target.value)
                                }
                            >
                                <option value="">
                                    Sin material específico
                                </option>
                                {materiales.map((m) => (
                                    <option key={m.id} value={String(m.id)}>
                                        {m.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Volumen" required>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.001"
                                    value={crear.data.volumen}
                                    onChange={(e) =>
                                        crear.setData('volumen', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Unidad" required>
                                <Select
                                    value={crear.data.unidad}
                                    onChange={(e) =>
                                        crear.setData('unidad', e.target.value)
                                    }
                                >
                                    {UNIDADES.map((u) => (
                                        <option key={u} value={u}>
                                            {u}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Destino" required>
                            <Select
                                value={crear.data.destino}
                                onChange={(e) =>
                                    crear.setData('destino', e.target.value)
                                }
                            >
                                {DESTINOS.map((d) => (
                                    <option key={d.value} value={d.value}>
                                        {d.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Empresa EO-RS">
                            <Select
                                value={crear.data.eors_id}
                                onChange={(e) =>
                                    crear.setData('eors_id', e.target.value)
                                }
                            >
                                <option value="">
                                    Uso interno / sin EO-RS
                                </option>
                                {eorsDb.map((e) => (
                                    <option key={e.id} value={String(e.id)}>
                                        {e.razon_social}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </FormSection>

                    <SubmitButton
                        status={crear.processing ? 'submitting' : 'idle'}
                        className="w-full"
                    >
                        <IconPlus size={15} />
                        Registrar Residuo
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
