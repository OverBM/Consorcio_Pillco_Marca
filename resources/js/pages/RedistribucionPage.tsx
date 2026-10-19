// Redistribución de excedentes inter-obras (AHP & GIS).
// CRUD de excedentes vía `useHttp` contra `/api/v1/excedentes`, acciones de
// redistribución reutilizando el flujo de transferencias y refresco de props.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { opcionesHttp } from '../utils/crud';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import {
    IconBoxes,
    IconMapPin,
    IconPlus,
    IconSave,
    IconTrash,
    IconTruck,
} from '../components/icons';
import { formatCantidad, formatKm, formatMoneda } from '../utils/format';

interface ExcedenteDb {
    id: number;
    obra_origen_id: number;
    almacen_id: number;
    material_id: number;
    cantidad: number | string;
    origen: string;
    estado: string;
    detectado_en?: string | null;
    obra?: { id: number; nombre: string } | null;
    almacen?: { id: number; nombre: string } | null;
    material?: {
        id: number;
        nombre: string;
        unidad_medida?: { codigo: string } | null;
    } | null;
}

interface TransferenciaAhp {
    almacenOrigenId: string;
    almacenOrigenNombre: string;
    obraOrigenNombre: string;
    materialId: string;
    materialNombre: string;
    stockDisponible: number;
    cantidadSugerida: number;
    unidad: string;
    distanciaKm: number;
    tiempoEstimadoMin: number;
    puntajeAhp: number;
    ahorroEstimadoSoles: number;
    prioridad: 'alta' | 'media' | 'baja';
}

interface SugerenciaAhp {
    almacenDestinoId?: string | number;
    almacenDestinoNombre?: string;
    obraDestinoNombre?: string;
    cantidadSugerida?: number;
    unidad?: string;
    distanciaKm?: number;
    puntajeAhp?: number;
}

interface ParametroDb {
    id: number;
    clave: string;
    valor: string;
    descripcion?: string | null;
}

interface ObraDb {
    id: number;
    nombre: string;
}

interface AlmacenDb {
    id: number;
    nombre: string;
    obra_id: number | null;
    obra?: { id: number; nombre: string } | null;
}

interface MaterialDb {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface RedistribucionPageProps {
    excedentesDb?: ExcedenteDb[];
    transferenciasAhpDb?: TransferenciaAhp[];
    parametrosDb?: ParametroDb[];
    obrasDb?: ObraDb[];
    almacenesDb?: AlmacenDb[];
    materialesDb?: MaterialDb[];
}

type ExcedenteFila = Omit<ExcedenteDb, 'id'> & { id: string; dbId: number };

interface FormularioExcedente {
    obra_origen_id: string;
    almacen_id: string;
    material_id: string;
    cantidad: string;
    origen: string;
    estado: string;
}

const ORIGENES = [
    { value: 'manual', label: 'Registro manual' },
    { value: 'cierre_obra', label: 'Cierre de obra' },
    { value: 'liquidacion', label: 'Liquidación' },
    { value: 'devolucion', label: 'Devolución' },
    { value: 'inventario', label: 'Inventario físico' },
];

const ESTADOS = [
    { value: 'detectado', label: 'Detectado' },
    { value: 'sugerido', label: 'Sugerido' },
    { value: 'redistribuido', label: 'Redistribuido' },
    { value: 'descartado', label: 'Descartado' },
];

const VACIO: FormularioExcedente = {
    obra_origen_id: '',
    almacen_id: '',
    material_id: '',
    cantidad: '',
    origen: 'manual',
    estado: 'detectado',
};

function tonoPrioridad(p: string): 'danger' | 'warn' | 'neutral' {
    if (p === 'alta') return 'danger';
    if (p === 'media') return 'warn';
    return 'neutral';
}

function tonoEstado(estado: string): 'ok' | 'warn' | 'violet' | 'neutral' {
    if (estado === 'redistribuido') return 'ok';
    if (estado === 'sugerido') return 'violet';
    if (estado === 'descartado') return 'neutral';
    return 'warn';
}

export default function RedistribucionPage({
    excedentesDb = [],
    transferenciasAhpDb = [],
    parametrosDb = [],
    obrasDb = [],
    almacenesDb = [],
    materialesDb = [],
}: RedistribucionPageProps) {
    const notify = useNotifications();

    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState<ExcedenteFila | null>(null);
    const [porEliminar, setPorEliminar] = useState<ExcedenteFila | null>(null);
    const [porRedistribuir, setPorRedistribuir] =
        useState<ExcedenteFila | null>(null);
    const [destinoId, setDestinoId] = useState('');
    const [cantidadDestino, setCantidadDestino] = useState('');
    const [sugerencias, setSugerencias] = useState<SugerenciaAhp[]>([]);

    const form = useHttp<FormularioExcedente>({ ...VACIO });
    const eliminar = useHttp<Record<string, never>>({});
    const sugerir = useHttp<
        Record<string, never>,
        { data?: { sugerencias?: SugerenciaAhp[] } }
    >({});
    const transferir = useHttp<{
        almacen_destino_id: string;
        cantidad: string;
    }>({ almacen_destino_id: '', cantidad: '' });

    const excedentes: ExcedenteFila[] = useMemo(
        () => excedentesDb.map((e) => ({ ...e, id: String(e.id), dbId: e.id })),
        [excedentesDb],
    );

    const totalSobrante = excedentes.reduce(
        (acc, e) => acc + Number(e.cantidad || 0),
        0,
    );
    const ahorroPotencial = transferenciasAhpDb.reduce(
        (acc, t) => acc + Number(t.ahorroEstimadoSoles || 0),
        0,
    );

    const transferencias = useMemo(
        () =>
            transferenciasAhpDb.map((t, idx) => ({
                ...t,
                id: `AHP-${idx + 1}`,
            })),
        [transferenciasAhpDb],
    );

    const almacenesDestino = useMemo(
        () =>
            almacenesDb.filter(
                (a) => !porRedistribuir || a.id !== porRedistribuir.almacen_id,
            ),
        [almacenesDb, porRedistribuir],
    );

    const refrescar = () =>
        refrescarProps('excedentesDb', 'transferenciasAhpDb');

    const abrirCreacion = () => {
        form.setData({
            ...VACIO,
            obra_origen_id: obrasDb[0] ? String(obrasDb[0].id) : '',
        });
        form.clearErrors();
        setEditando(null);
        setCreando(true);
    };

    const abrirEdicion = (excedente: ExcedenteFila) => {
        form.setData({
            obra_origen_id: String(excedente.obra_origen_id),
            almacen_id: String(excedente.almacen_id),
            material_id: String(excedente.material_id),
            cantidad: String(excedente.cantidad),
            origen: excedente.origen,
            estado: excedente.estado,
        });
        form.clearErrors();
        setCreando(false);
        setEditando(excedente);
    };

    const cerrarFormulario = () => {
        setCreando(false);
        setEditando(null);
    };

    const guardar = (event: FormEvent) => {
        event.preventDefault();

        const cantidad = Number(form.data.cantidad);
        if (
            !form.data.obra_origen_id ||
            !form.data.almacen_id ||
            !form.data.material_id ||
            !(cantidad > 0)
        ) {
            notify.error(
                'Selecciona obra, almacén, material e ingresa una cantidad mayor a cero.',
            );
            return;
        }

        form.transform(() => ({
            obra_origen_id: Number(form.data.obra_origen_id),
            almacen_id: Number(form.data.almacen_id),
            material_id: Number(form.data.material_id),
            cantidad,
            origen: form.data.origen,
            estado: form.data.estado,
        }));

        const opciones = opcionesHttp(
            notify,
            editando ? 'Excedente actualizado.' : 'Excedente registrado.',
            'No se pudo guardar el excedente.',
            cerrarFormulario,
            refrescar,
        );

        if (editando) {
            void form.put(`/api/v1/excedentes/${editando.dbId}`, opciones);

            return;
        }

        void form.post('/api/v1/excedentes', opciones);
    };

    const confirmarEliminar = () => {
        if (!porEliminar) {
            return;
        }

        void eliminar.delete(
            `/api/v1/excedentes/${porEliminar.dbId}`,
            opcionesHttp(
                notify,
                'Excedente eliminado.',
                'No se pudo eliminar el excedente.',
                () => setPorEliminar(null),
                refrescar,
            ),
        );
    };

    const abrirRedistribucion = (excedente: ExcedenteFila) => {
        setPorRedistribuir(excedente);
        setDestinoId('');
        setCantidadDestino(String(excedente.cantidad));
        setSugerencias([]);

        void sugerir.get(`/api/v1/excedentes/${excedente.dbId}/sugerencias`, {
            onSuccess: (respuesta) => {
                setSugerencias(respuesta?.data?.sugerencias ?? []);
            },
        });
    };

    const aplicarSugerencia = (s: SugerenciaAhp) => {
        if (s.almacenDestinoId !== undefined) {
            setDestinoId(String(s.almacenDestinoId));
        }
        if (s.cantidadSugerida !== undefined) {
            setCantidadDestino(String(s.cantidadSugerida));
        }
    };

    const confirmarRedistribucion = () => {
        if (!porRedistribuir) {
            return;
        }

        const cantidad = Number(cantidadDestino);
        if (!destinoId || !(cantidad > 0)) {
            notify.error(
                'Selecciona el almacén destino e ingresa una cantidad válida.',
            );
            return;
        }

        transferir.transform(() => ({
            almacen_destino_id: Number(destinoId),
            cantidad,
        }));

        void transferir.post(
            `/api/v1/excedentes/${porRedistribuir.dbId}/transferencia`,
            {
                onSuccess: () => {
                    notify.success(
                        'Transferencia sugerida generada desde el excedente.',
                    );
                    setPorRedistribuir(null);
                    refrescar();
                },
                onError: (errors: Record<string, string>) => {
                    notify.error(
                        Object.values(errors).flat().join(' ') ||
                            'No se pudo generar la transferencia.',
                    );
                },
            },
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Redistribución de Excedentes Inter-Obras (AHP & GIS)"
                subtitle="Optimización de materiales sobrantes por liquidación y rebalanceo geodésico"
                actions={
                    <Button variant="mint" onClick={abrirCreacion}>
                        <IconPlus size={16} />
                        Nuevo excedente
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-surface border-line p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted font-mono text-xs uppercase">
                            Excedentes Detectados
                        </span>
                        <div className="bg-soft text-ink rounded-lg p-2">
                            <IconBoxes size={16} />
                        </div>
                    </div>
                    <p className="text-brand-600 mt-2 font-mono text-2xl font-bold">
                        {excedentes.length} lotes
                    </p>
                    <span className="text-muted text-xs">
                        Saldos disponibles para redistribución
                    </span>
                </Card>

                <Card className="bg-surface border-line p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted font-mono text-xs uppercase">
                            Volumen Sobrante
                        </span>
                        <div className="bg-soft text-ink rounded-lg p-2">
                            <IconMapPin size={16} />
                        </div>
                    </div>
                    <p className="text-ink mt-2 font-mono text-2xl font-bold">
                        {formatCantidad(totalSobrante)}
                    </p>
                    <span className="text-muted text-xs">
                        Unidades acumuladas en obras de origen
                    </span>
                </Card>

                <Card className="bg-surface border-line p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted font-mono text-xs uppercase">
                            Ahorro Estimado (AHP)
                        </span>
                        <div className="bg-soft text-ink rounded-lg p-2">
                            <IconTruck size={16} />
                        </div>
                    </div>
                    <p className="text-ok mt-2 font-mono text-2xl font-bold">
                        {formatMoneda(ahorroPotencial)}
                    </p>
                    <span className="text-muted text-xs">
                        Evita nuevas órdenes de compra
                    </span>
                </Card>
            </div>

            <Card
                title="Transferencias Sugeridas por el Motor AHP"
                className="p-5"
            >
                {transferencias.length === 0 ? (
                    <EmptyState
                        title="Sin transferencias sugeridas"
                        hint="No hay candidatos que cumplan el radio geográfico configurado."
                    />
                ) : (
                    <DataTable
                        emptyLabel="Sin transferencias sugeridas."
                        columns={[
                            {
                                key: 'material',
                                header: 'Material',
                                cell: (t) => (
                                    <span className="text-ink font-bold">
                                        {t.materialNombre}
                                    </span>
                                ),
                            },
                            {
                                key: 'origen',
                                header: 'Almacén Origen',
                                cell: (t) => (
                                    <div>
                                        <p className="text-ink text-xs font-semibold">
                                            {t.almacenOrigenNombre}
                                        </p>
                                        <p className="text-muted text-[11px]">
                                            {t.obraOrigenNombre}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: 'cantidad',
                                header: 'Cantidad',
                                align: 'right',
                                mono: true,
                                cell: (t) =>
                                    `${formatCantidad(Number(t.cantidadSugerida))} ${t.unidad}`,
                            },
                            {
                                key: 'ruta',
                                header: 'Ruta GIS',
                                align: 'right',
                                mono: true,
                                cell: (t) => (
                                    <div>
                                        <span className="text-ink font-bold">
                                            {formatKm(t.distanciaKm)}
                                        </span>
                                        <span className="text-muted block text-[11px]">
                                            ~{t.tiempoEstimadoMin} min
                                        </span>
                                    </div>
                                ),
                            },
                            {
                                key: 'puntaje',
                                header: 'Puntaje AHP',
                                align: 'right',
                                mono: true,
                                cell: (t) => t.puntajeAhp.toFixed(1),
                            },
                            {
                                key: 'prioridad',
                                header: 'Prioridad',
                                align: 'center',
                                cell: (t) => (
                                    <Badge tone={tonoPrioridad(t.prioridad)}>
                                        {t.prioridad}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'ahorro',
                                header: 'Ahorro Est.',
                                align: 'right',
                                mono: true,
                                cell: (t) =>
                                    formatMoneda(Number(t.ahorroEstimadoSoles)),
                            },
                        ]}
                        rows={transferencias}
                    />
                )}
            </Card>

            <Card title="Inventario de Excedentes Detectados" className="p-5">
                {excedentes.length === 0 ? (
                    <EmptyState
                        title="Sin excedentes registrados"
                        hint="Se detectan automáticamente al iniciar el cierre de una obra."
                    />
                ) : (
                    <DataTable
                        emptyLabel="Sin excedentes registrados."
                        columns={[
                            {
                                key: 'material',
                                header: 'Material',
                                cell: (e) =>
                                    e.material?.nombre ??
                                    `Material #${e.material_id}`,
                            },
                            {
                                key: 'cantidad',
                                header: 'Cantidad',
                                align: 'right',
                                mono: true,
                                cell: (e) =>
                                    `${formatCantidad(Number(e.cantidad))} ${e.material?.unidad_medida?.codigo ?? ''}`,
                            },
                            {
                                key: 'almacen',
                                header: 'Almacén',
                                cell: (e) =>
                                    e.almacen?.nombre ??
                                    `Almacén #${e.almacen_id}`,
                            },
                            {
                                key: 'obra',
                                header: 'Obra Origen',
                                cell: (e) =>
                                    e.obra?.nombre ??
                                    `Obra #${e.obra_origen_id}`,
                            },
                            {
                                key: 'origen',
                                header: 'Procedencia',
                                cell: (e) => (
                                    <Badge tone="violet">{e.origen}</Badge>
                                ),
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                align: 'center',
                                cell: (e) => (
                                    <Badge tone={tonoEstado(e.estado)}>
                                        {e.estado}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (e) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="mint"
                                            size="sm"
                                            onClick={() =>
                                                abrirRedistribucion(e)
                                            }
                                        >
                                            <IconTruck size={13} />
                                            Redistribuir
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => abrirEdicion(e)}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setPorEliminar(e)}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        rows={excedentes}
                    />
                )}
            </Card>

            <Card title="Parámetros del Motor de Optimización" className="p-5">
                {parametrosDb.length === 0 ? (
                    <EmptyState
                        title="Sin parámetros configurados"
                        hint="Configure los pesos AHP y el radio geográfico en Parámetros del Sistema."
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {parametrosDb.map((p) => (
                            <div
                                key={p.id}
                                className="border-line bg-soft/40 rounded-lg border p-3"
                            >
                                <p className="text-muted font-mono text-[11px] uppercase">
                                    {p.clave}
                                </p>
                                <p className="text-ink mt-1 text-sm font-bold">
                                    {p.valor}
                                </p>
                                {p.descripcion && (
                                    <p className="text-muted mt-0.5 text-[11px]">
                                        {p.descripcion}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal
                open={creando || Boolean(editando)}
                onClose={cerrarFormulario}
                title={
                    editando
                        ? 'Modificar Excedente Detectado'
                        : 'Nuevo Excedente Detectado'
                }
            >
                <form onSubmit={guardar} className="space-y-4">
                    <Field label="Obra de Origen" required>
                        <Select
                            value={form.data.obra_origen_id}
                            onChange={(e) =>
                                form.setData('obra_origen_id', e.target.value)
                            }
                            required
                        >
                            <option value="">Selecciona obra…</option>
                            {obrasDb.map((o) => (
                                <option key={o.id} value={String(o.id)}>
                                    {o.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Almacén" required>
                        <Select
                            value={form.data.almacen_id}
                            onChange={(e) =>
                                form.setData('almacen_id', e.target.value)
                            }
                            required
                        >
                            <option value="">Selecciona almacén…</option>
                            {almacenesDb.map((a) => (
                                <option key={a.id} value={String(a.id)}>
                                    {a.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Material" required>
                        <Select
                            value={form.data.material_id}
                            onChange={(e) =>
                                form.setData('material_id', e.target.value)
                            }
                            required
                        >
                            <option value="">Selecciona material…</option>
                            {materialesDb.map((m) => (
                                <option key={m.id} value={String(m.id)}>
                                    {m.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Cantidad" required>
                            <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={form.data.cantidad}
                                onChange={(e) =>
                                    form.setData('cantidad', e.target.value)
                                }
                                required
                            />
                        </Field>
                        <Field label="Procedencia" required>
                            <Select
                                value={form.data.origen}
                                onChange={(e) =>
                                    form.setData('origen', e.target.value)
                                }
                            >
                                {ORIGENES.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <Field label="Estado" required>
                        <Select
                            value={form.data.estado}
                            onChange={(e) =>
                                form.setData('estado', e.target.value)
                            }
                        >
                            {ESTADOS.map((e) => (
                                <option key={e.value} value={e.value}>
                                    {e.label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={cerrarFormulario}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="mint"
                            type="submit"
                            disabled={form.processing}
                        >
                            <IconSave size={14} />
                            {editando
                                ? 'Guardar Cambios'
                                : 'Registrar Excedente'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={Boolean(porRedistribuir)}
                onClose={() => setPorRedistribuir(null)}
                title="Redistribuir Excedente"
            >
                {porRedistribuir && (
                    <div className="space-y-4">
                        <div className="border-line bg-soft/40 rounded-lg border p-3 text-xs">
                            <p className="text-ink font-bold">
                                {porRedistribuir.material?.nombre ??
                                    `Material #${porRedistribuir.material_id}`}
                            </p>
                            <p className="text-muted mt-0.5">
                                Origen:{' '}
                                {porRedistribuir.almacen?.nombre ??
                                    `Almacén #${porRedistribuir.almacen_id}`}{' '}
                                ·{' '}
                                {formatCantidad(
                                    Number(porRedistribuir.cantidad),
                                )}{' '}
                                {porRedistribuir.material?.unidad_medida
                                    ?.codigo ?? ''}
                            </p>
                        </div>

                        {sugerencias.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-ink text-xs font-bold">
                                    Receptores sugeridos (AHP)
                                </p>
                                <div className="space-y-2">
                                    {sugerencias.slice(0, 3).map((s, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => aplicarSugerencia(s)}
                                            className="border-line bg-surface hover:bg-soft w-full cursor-pointer rounded-lg border p-2.5 text-left text-xs transition-colors"
                                        >
                                            <span className="text-ink block font-semibold">
                                                {s.almacenDestinoNombre ??
                                                    `Almacén #${s.almacenDestinoId}`}
                                            </span>
                                            <span className="text-muted block text-[11px]">
                                                {s.obraDestinoNombre ?? ''}
                                                {s.distanciaKm !== undefined
                                                    ? ` · ${formatKm(Number(s.distanciaKm))}`
                                                    : ''}
                                                {s.cantidadSugerida !==
                                                undefined
                                                    ? ` · ${formatCantidad(Number(s.cantidadSugerida))} ${s.unidad ?? ''}`
                                                    : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Field label="Almacén Destino" required>
                            <Select
                                value={destinoId}
                                onChange={(e) => setDestinoId(e.target.value)}
                            >
                                <option value="">Selecciona almacén…</option>
                                {almacenesDestino.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                        {a.nombre}
                                        {a.obra?.nombre
                                            ? ` — ${a.obra.nombre}`
                                            : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Cantidad a Transferir" required>
                            <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={cantidadDestino}
                                onChange={(e) =>
                                    setCantidadDestino(e.target.value)
                                }
                            />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => setPorRedistribuir(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="mint"
                                type="button"
                                onClick={confirmarRedistribucion}
                                disabled={transferir.processing}
                            >
                                <IconTruck size={14} />
                                Generar Transferencia
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                open={Boolean(porEliminar)}
                onClose={() => setPorEliminar(null)}
                title="Eliminar Excedente"
            >
                {porEliminar && (
                    <div className="space-y-4">
                        <p className="text-ink text-sm">
                            ¿Confirmas la eliminación del excedente de{' '}
                            <span className="font-bold">
                                {porEliminar.material?.nombre ??
                                    `material #${porEliminar.material_id}`}
                            </span>
                            ? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => setPorEliminar(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                type="button"
                                onClick={confirmarEliminar}
                                disabled={eliminar.processing}
                            >
                                <IconTrash size={14} />
                                Eliminar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
