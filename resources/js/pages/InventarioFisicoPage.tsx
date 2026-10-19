// Inventario Físico a Ciegas — programación de tomas, conteo ciego y
// conciliación automática de faltantes/sobrantes (ajuste en Kardex).
// Datos desde props `inventariosDb`; escrituras vía `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import {
    Button,
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
import { formatFs } from '../utils/format';
import type { CatalogoAlmacen } from '../types';
import { IconCheckCircle, IconBoxes } from '../components/icons';

interface InventarioDetalleDb {
    id: number;
    material_id: number;
    cantidad_sistema: number | string;
    cantidad_contada: number | string | null;
    justificacion: string | null;
    material?: {
        id: number;
        nombre: string;
        unidad_medida?: { codigo: string } | null;
    } | null;
}

interface InventarioFisicoDb {
    id: number;
    almacen_id: number;
    periodo: string;
    estado: string;
    ciego: boolean;
    tolerancia_pct: number | string;
    cerrado_en: string | null;
    almacen?: { id: number; nombre: string } | null;
    detalles?: InventarioDetalleDb[];
}

interface InventarioFisicoPageProps {
    inventariosDb?: InventarioFisicoDb[];
}

type InventarioFila = Omit<InventarioFisicoDb, 'id'> & { id: string };

const ESTADO_META: Record<
    string,
    { tone: 'ok' | 'warn' | 'violet' | 'neutral'; label: string }
> = {
    en_conteo: { tone: 'warn', label: 'En conteo' },
    cerrado: { tone: 'ok', label: 'Cerrado' },
};

function unidadDe(det: InventarioDetalleDb): string {
    return det.material?.unidad_medida?.codigo ?? 'und';
}

function contadosDe(inv: { detalles?: InventarioDetalleDb[] }): number {
    return (inv.detalles ?? []).filter(
        (d) => d.cantidad_contada !== null && d.cantidad_contada !== undefined,
    ).length;
}

function diferenciaTotal(inv: { detalles?: InventarioDetalleDb[] }): number {
    return (inv.detalles ?? []).reduce((acc, d) => {
        if (d.cantidad_contada === null || d.cantidad_contada === undefined)
            return acc;
        return acc + (Number(d.cantidad_contada) - Number(d.cantidad_sistema));
    }, 0);
}

export default function InventarioFisicoPage({
    inventariosDb = [],
}: InventarioFisicoPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props;
    const almacenes: CatalogoAlmacen[] = catalogos.almacenes;

    const crear = useHttp<{
        almacen_id: string;
        periodo: string;
        tolerancia_pct: string;
    }>({
        almacen_id: '',
        periodo: '',
        tolerancia_pct: '1',
    });

    const conteo = useHttp<Record<string, string>>({});

    const [contando, setContando] = useState<InventarioFila | null>(null);
    const [valores, setValores] = useState<Record<number, string>>({});
    const [justificaciones, setJustificaciones] = useState<
        Record<number, string>
    >({});

    const filas: InventarioFila[] = useMemo(
        () => inventariosDb.map((i) => ({ ...i, id: String(i.id) })),
        [inventariosDb],
    );

    const abrirConteo = (inv: InventarioFila) => {
        setContando(inv);
        setValores({});
        setJustificaciones({});
    };

    const enviarCrear = (event: FormEvent) => {
        event.preventDefault();
        if (!crear.data.almacen_id) {
            notify.error('Selecciona el almacén a auditar.');
            return;
        }
        if (!crear.data.periodo.trim()) {
            notify.error('Indica el periodo (p. ej. 2026-10).');
            return;
        }

        crear.transform(() => ({
            almacen_id: Number(crear.data.almacen_id),
            periodo: crear.data.periodo,
            tolerancia_pct: Number(crear.data.tolerancia_pct) || 1,
        }));

        void crear.post('/api/v1/inventario-fisico', {
            onSuccess: () => {
                notify.success('Inventario físico programado.');
                crear.setData('almacen_id', '');
                crear.setData('periodo', '');
                crear.setData('tolerancia_pct', '1');
                refrescarProps('inventariosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo programar el inventario.',
                );
            },
        });
    };

    const enviarConteo = (event: FormEvent) => {
        event.preventDefault();
        if (!contando) return;

        const conteos = (contando.detalles ?? [])
            .filter(
                (det) =>
                    valores[det.id] !== undefined && valores[det.id] !== '',
            )
            .map((det) => ({
                id: det.id,
                cantidad_contada: Number(valores[det.id]),
                justificacion: justificaciones[det.id] || null,
            }));

        if (conteos.length === 0) {
            notify.error('Registra al menos un conteo físico.');
            return;
        }

        conteo.transform(() => ({ conteos }));

        void conteo.post(`/api/v1/inventario-fisico/${contando.id}/conteos`, {
            onSuccess: () => {
                notify.success('Conteos registrados y stock ajustado.');
                setContando(null);
                refrescarProps('inventariosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudieron registrar los conteos.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Inventario Físico a Ciegas"
                subtitle="Programación de tomas, conteos ciegos y conciliación automática de faltantes / sobrantes"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card
                    title={`Inventarios (${inventariosDb.length})`}
                    className="lg:col-span-2"
                >
                    {inventariosDb.length === 0 ? (
                        <EmptyState
                            title="Sin inventarios físicos"
                            hint="Programa una toma física para un almacén."
                        />
                    ) : (
                        <DataTable
                            emptyLabel="Sin registros de inventario físico."
                            columns={[
                                {
                                    key: 'periodo',
                                    header: 'Periodo',
                                    mono: true,
                                    cell: (i) => (
                                        <span className="text-ink font-semibold">
                                            {i.periodo}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'almacen',
                                    header: 'Almacén',
                                    cell: (i) =>
                                        i.almacen?.nombre ??
                                        `Almacén #${i.almacen_id}`,
                                },
                                {
                                    key: 'avance',
                                    header: 'Avance',
                                    cell: (i) => (
                                        <span className="text-xs">
                                            {contadosDe(i)} /{' '}
                                            {(i.detalles ?? []).length} contados
                                        </span>
                                    ),
                                },
                                {
                                    key: 'diferencia',
                                    header: 'Diferencia',
                                    align: 'right',
                                    cell: (i) => {
                                        const dif = diferenciaTotal(i);
                                        return (
                                            <span
                                                className={`font-mono text-xs font-bold ${dif < 0 ? 'text-danger' : dif > 0 ? 'text-ok' : 'text-muted'}`}
                                            >
                                                {dif > 0 ? `+${dif}` : dif}
                                            </span>
                                        );
                                    },
                                },
                                {
                                    key: 'estado',
                                    header: 'Estado',
                                    cell: (i) => {
                                        const meta = ESTADO_META[i.estado] ?? {
                                            tone: 'neutral' as const,
                                            label: i.estado,
                                        };
                                        return (
                                            <Badge tone={meta.tone}>
                                                {meta.label}
                                            </Badge>
                                        );
                                    },
                                },
                                {
                                    key: 'acciones',
                                    header: 'Acciones',
                                    align: 'right',
                                    cell: (i) =>
                                        i.estado === 'en_conteo' ? (
                                            <button
                                                className="btn-primary !px-2.5 !py-1 text-xs"
                                                onClick={() => abrirConteo(i)}
                                                disabled={conteo.processing}
                                            >
                                                <IconBoxes size={13} />
                                                Registrar conteo
                                            </button>
                                        ) : (
                                            <span className="text-muted text-[11px]">
                                                {i.cerrado_en
                                                    ? formatFs(i.cerrado_en)
                                                    : '—'}
                                            </span>
                                        ),
                                },
                            ]}
                            rows={filas}
                        />
                    )}
                </Card>

                <FormPanel
                    title="Programar Toma Física"
                    subtitle="Conteo ciego por almacén"
                    onSubmit={enviarCrear}
                    className="text-xs"
                >
                    <FormSection title="Parámetros" columns={1}>
                        <Field label="Almacén a auditar" required>
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
                        <Field label="Periodo" required hint="Ej. 2026-10">
                            <Input
                                value={crear.data.periodo}
                                onChange={(e) =>
                                    crear.setData('periodo', e.target.value)
                                }
                                maxLength={20}
                                placeholder="2026-10"
                            />
                        </Field>
                        <Field
                            label="Tolerancia (%)"
                            hint="Diferencia aceptable antes de justificar."
                        >
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                value={crear.data.tolerancia_pct}
                                onChange={(e) =>
                                    crear.setData(
                                        'tolerancia_pct',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </FormSection>
                    <SubmitButton
                        status={crear.processing ? 'submitting' : 'idle'}
                        className="w-full"
                    >
                        <IconBoxes size={15} />
                        Programar Inventario
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal
                open={!!contando}
                onClose={() => setContando(null)}
                title={`Conteo físico — ${contando?.periodo ?? ''}`}
                wide
            >
                {contando && (
                    <form onSubmit={enviarConteo} className="space-y-4 text-xs">
                        <p className="bg-soft/60 text-muted rounded-lg px-3 py-2">
                            Conteo{' '}
                            <strong className="text-ink">a ciegas</strong>:
                            registra solo la cantidad física observada. El
                            ajuste contra el sistema se aplica automáticamente.
                        </p>

                        <div className="space-y-2">
                            {(contando.detalles ?? []).map((det) => (
                                <div
                                    key={det.id}
                                    className="border-line flex items-center gap-2 rounded-lg border p-2.5"
                                >
                                    <div className="flex-1">
                                        <p className="text-ink text-xs font-semibold">
                                            {det.material?.nombre ??
                                                `Material #${det.material_id}`}
                                        </p>
                                        <p className="text-muted text-[11px]">
                                            {unidadDe(det)}
                                        </p>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={valores[det.id] ?? ''}
                                        onChange={(e) =>
                                            setValores((v) => ({
                                                ...v,
                                                [det.id]: e.target.value,
                                            }))
                                        }
                                        placeholder="Contado"
                                        className="field !w-24 !py-1.5"
                                        aria-label={`Cantidad contada de ${det.material?.nombre ?? det.material_id}`}
                                    />
                                    <input
                                        value={justificaciones[det.id] ?? ''}
                                        onChange={(e) =>
                                            setJustificaciones((j) => ({
                                                ...j,
                                                [det.id]: e.target.value,
                                            }))
                                        }
                                        placeholder="Justificación (opcional)"
                                        className="field !w-48 !py-1.5"
                                        aria-label="Justificación"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="border-line flex justify-end gap-2 border-t pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setContando(null)}
                            >
                                Cancelar
                            </Button>
                            <SubmitButton
                                status={
                                    conteo.processing ? 'submitting' : 'idle'
                                }
                            >
                                <IconCheckCircle size={15} />
                                Registrar y ajustar
                            </SubmitButton>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
