// Módulo de Transferencias entre Almacenes (Macroprocesos Bizagi 27 y 28).
// Generación de orden de transferencia por almacenero de origen, autorización formal por Logística,
// transporte inter-obra, confirmación de recepción en destino y registro de incidencias de transferencia.
// Integra el flujo de redistribución de sobrantes de Cemento Andino Tipo V de obra cerrada.

import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Button, Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { AlertaBanner } from '../components/AlertaBanner';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatNum } from '../utils/format';
import type { IncidenciaTransferencia, OrdenTransferencia } from '../types';
import {
    IconAlert,
    IconBoxes,
    IconCheck,
    IconPlus,
    IconRepeat,
    IconSearch,
    IconSparkles,
    IconTruck,
    IconX,
} from '../components/icons';

export default function TransferenciasPage() {
    const {
        transferencias,
        almacenes,
        obras,
        materiales,
        stock,
        rolActivo,
        createTransferencia,
        authorizeTransferencia,
        receiveTransferencia,
    } = useAppStore();

    const [modalCrear, setModalCrear] = useState(false);
    const [modalRecibir, setModalRecibir] = useState<OrdenTransferencia | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    // Formulario de nueva transferencia
    const [formOrigen, setFormOrigen] = useState(almacenes[0]?.id ?? '');
    const [formDestino, setFormDestino] = useState(almacenes[1]?.id ?? '');
    const [formMaterialId, setFormMaterialId] = useState('mat-cemento-1');
    const [formCantidad, setFormCantidad] = useState(300);
    const [formMotivo, setFormMotivo] = useState('Rebalance de stock por necesidad en frente de trabajo.');
    const [esSobrante, setEsSobrante] = useState(false);

    // Formulario de Recepción en Destino (Bizagi 28)
    const [cantRecibida, setCantRecibida] = useState(0);
    const [tieneIncidencia, setTieneIncidencia] = useState(false);
    const [incTipo, setIncTipo] = useState<'daño_transporte' | 'faltante' | 'error_despacho'>('faltante');
    const [incDescripcion, setIncDescripcion] = useState('');
    const [recibidoPor, setRecibidoPor] = useState('Almacenero Destino');

    const stockOrigenDisponible = stock.stock[formOrigen]?.[formMaterialId] ?? 0;

    const handleGuardarTransferencia = (e: React.FormEvent) => {
        e.preventDefault();
        if (formOrigen === formDestino || Number(formCantidad) <= 0) return;

        createTransferencia({
            origenAlmacenId: formOrigen,
            destinoAlmacenId: formDestino,
            materialId: formMaterialId,
            cantidad: Number(formCantidad),
            esRedistribucionCierreObra: esSobrante,
            fechaSolicitud: new Date().toISOString().slice(0, 16).replace('T', ' '),
            solicitadoPor: 'Almacenero de Origen',
            motivo: formMotivo,
            estado: 'solicitada',
        });

        setModalCrear(false);
    };

    const handleAbrirRecepcion = (trf: OrdenTransferencia) => {
        setModalRecibir(trf);
        setCantRecibida(trf.cantidad);
        setTieneIncidencia(false);
        setIncDescripcion('');
    };

    const handleConfirmarRecepcion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalRecibir) return;

        let incObj: IncidenciaTransferencia | undefined = undefined;
        const diff = modalRecibir.cantidad - Number(cantRecibida);

        if (tieneIncidencia || diff > 0) {
            incObj = {
                materialId: modalRecibir.materialId,
                cantidadEnviada: modalRecibir.cantidad,
                cantidadRecibida: Number(cantRecibida),
                diferencia: Math.max(0, diff),
                descripcion: incDescripcion || 'Diferencia cuantitativa detectada en destino.',
                tipo: incTipo,
            };
        }

        receiveTransferencia(modalRecibir.id, Number(cantRecibida), incObj, recibidoPor);
        setModalRecibir(null);
    };

    const transferenciasFiltradas = useMemo(() => {
        return transferencias.filter((t) => {
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const mat = materiales.find((m) => m.id === t.materialId);
                const matchCod = t.codigo.toLowerCase().includes(q);
                const matchMot = t.motivo.toLowerCase().includes(q);
                const matchMat = mat?.nombre.toLowerCase().includes(q) ?? false;
                if (!matchCod && !matchMot && !matchMat) return false;
            }
            if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false;
            return true;
        });
    }, [transferencias, busqueda, filtroEstado, materiales]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Transferencias entre Almacenes"
                subtitle="Generación de órdenes, autorización de Logística, transporte y confirmación de recepción con incidencias"
                actions={
                    <button className="btn-primary" onClick={() => setModalCrear(true)}>
                        <IconPlus size={16} />
                        Nueva Orden de Transferencia
                    </button>
                }
            />

            {/* Filtros */}
            <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 rounded-field border border-line bg-canvas px-3 py-2 text-sm text-muted">
                        <IconSearch size={16} />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar código, motivo o material…"
                            className="w-full bg-transparent text-ink outline-none placeholder:text-muted/70 text-xs"
                        />
                    </div>
                    <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar estado">
                        <option value="todos">Todos los estados</option>
                        <option value="solicitada">Solicitada (Pendiente Autorización)</option>
                        <option value="autorizada_logistica">Autorizada por Logística</option>
                        <option value="en_transito">En tránsito</option>
                        <option value="recibida_conforme">Recibida Conforme</option>
                        <option value="recibida_con_incidencia">Recibida con Incidencia</option>
                    </Select>
                </div>
            </Card>

            {/* Tabla de Transferencias */}
            <Card title={`Órdenes de Transferencia (${transferenciasFiltradas.length})`}>
                {transferenciasFiltradas.length === 0 ? (
                    <EmptyState
                        title="Sin órdenes de transferencia"
                        hint="Registra una nueva transferencia para mover materiales entre frentes de obra."
                    />
                ) : (
                    <DataTable<OrdenTransferencia>
                        emptyLabel="Sin transferencias."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'N° Orden',
                                mono: true,
                                cell: (t) => (
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-ink">{t.codigo}</span>
                                        {t.esRedistribucionCierreObra && (
                                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-800">
                                                Cierre de Obra
                                            </span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'ruta',
                                header: 'Origen ➔ Destino',
                                cell: (t) => {
                                    const almO = almacenes.find((a) => a.id === t.origenAlmacenId);
                                    const almD = almacenes.find((a) => a.id === t.destinoAlmacenId);
                                    return (
                                        <div>
                                            <p className="font-semibold text-ink text-xs">{almO?.nombre ?? t.origenAlmacenId}</p>
                                            <p className="text-[11px] text-muted">➔ {almD?.nombre ?? t.destinoAlmacenId}</p>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'material',
                                header: 'Material y Cantidad',
                                cell: (t) => {
                                    const mat = materiales.find((m) => m.id === t.materialId);
                                    return (
                                        <div>
                                            <p className="font-bold text-ink text-xs">{mat?.nombre ?? t.materialId}</p>
                                            <p className="font-mono text-[11px] font-semibold text-brand-700">
                                                {formatCantidad(t.cantidad)} {mat?.unidad ?? 'und'}
                                            </p>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'motivo',
                                header: 'Motivo / Justificación',
                                cell: (t) => <span className="text-xs text-muted block max-w-56 truncate">{t.motivo}</span>,
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (t) => (
                                    <Badge
                                        tone={
                                            t.estado === 'recibida_conforme'
                                                ? 'ok'
                                                : t.estado === 'recibida_con_incidencia'
                                                ? 'danger'
                                                : t.estado === 'autorizada_logistica'
                                                ? 'indigo'
                                                : 'warn'
                                        }
                                    >
                                        {t.estado === 'autorizada_logistica'
                                            ? 'Autorizada por Logística'
                                            : t.estado === 'recibida_con_incidencia'
                                            ? 'Recibida con Incidencia'
                                            : t.estado.replace('_', ' ')}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (t) => (
                                    <div className="flex items-center justify-end gap-1.5">
                                        {t.estado === 'solicitada' && (
                                            <button
                                                onClick={() => authorizeTransferencia(t.id)}
                                                className="btn-primary !px-2.5 !py-1 text-xs"
                                                title="Autorizar orden de transferencia (Logística)"
                                            >
                                                <IconCheck size={13} />
                                                Autorizar
                                            </button>
                                        )}
                                        {(t.estado === 'autorizada_logistica' || t.estado === 'en_transito') && (
                                            <button
                                                onClick={() => handleAbrirRecepcion(t)}
                                                className="btn-primary !px-2.5 !py-1 text-xs !bg-emerald-600 hover:!bg-emerald-700"
                                                title="Confirmar recepción física en destino"
                                            >
                                                <IconBoxes size={13} />
                                                Recibir en Destino
                                            </button>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        rows={transferenciasFiltradas}
                    />
                )}
            </Card>

            {/* Modal de Nueva Transferencia */}
            <Modal open={modalCrear} onClose={() => setModalCrear(false)} title="Generar Orden de Transferencia" wide>
                <form onSubmit={handleGuardarTransferencia} className="space-y-4 text-xs">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Almacén de Origen (Emisor)">
                            <Select value={formOrigen} onChange={(e) => setFormOrigen(e.target.value)}>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Almacén de Destino (Receptor)">
                            <Select value={formDestino} onChange={(e) => setFormDestino(e.target.value)}>
                                {almacenes
                                    .filter((a) => a.id !== formOrigen)
                                    .map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.nombre}
                                        </option>
                                    ))}
                            </Select>
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Material a Trasladar">
                            <Select value={formMaterialId} onChange={(e) => setFormMaterialId(e.target.value)}>
                                {materiales.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} ({m.unidad})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Cantidad a Trasladar">
                            <Input
                                type="number"
                                min={1}
                                max={stockOrigenDisponible}
                                value={formCantidad}
                                onChange={(e) => setFormCantidad(Number(e.target.value))}
                                required
                            />
                        </Field>
                    </div>

                    <div className="rounded-lg bg-soft/60 p-2.5 flex justify-between items-center text-xs">
                        <span className="text-muted">Stock disponible en almacén origen:</span>
                        <span className="font-mono font-bold text-ink">
                            {formatCantidad(stockOrigenDisponible)} {materiales.find((m) => m.id === formMaterialId)?.unidad}
                        </span>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3">
                        <input
                            type="checkbox"
                            checked={esSobrante}
                            onChange={(e) => setEsSobrante(e.target.checked)}
                            className="h-4 w-4 rounded border-line text-brand-500"
                        />
                        <span className="text-xs text-ink font-semibold">
                            Redistribución formal de sobrantes por cierre de obra
                        </span>
                    </label>

                    <Field label="Motivo del Traslado">
                        <Textarea
                            value={formMotivo}
                            onChange={(e) => setFormMotivo(e.target.value)}
                            placeholder="Describir necesidad operativa o requerimiento en destino…"
                            rows={2}
                            required
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" onClick={() => setModalCrear(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            <IconCheck size={15} />
                            Generar Orden de Transferencia
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Recepción en Destino con Registro de Incidencias (Bizagi 28) */}
            <Modal
                open={!!modalRecibir}
                onClose={() => setModalRecibir(null)}
                title={`Confirmación de Recepción en Destino — ${modalRecibir?.codigo ?? ''}`}
                wide
            >
                {modalRecibir && (
                    <form onSubmit={handleConfirmarRecepcion} className="space-y-4 text-xs">
                        <div className="rounded-xl bg-soft/60 p-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted block">MATERIAL ENVIADO</span>
                                    <span className="font-bold text-ink text-sm">
                                        {materiales.find((m) => m.id === modalRecibir.materialId)?.nombre}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted block">CANTIDAD EN GUÍA DE TRASLADO</span>
                                    <span className="font-bold text-brand-700 text-sm font-mono">
                                        {formatCantidad(modalRecibir.cantidad)}{' '}
                                        {materiales.find((m) => m.id === modalRecibir.materialId)?.unidad}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Cantidad Física Recibida Conforme" required>
                                <Input
                                    type="number"
                                    min={0}
                                    max={modalRecibir.cantidad}
                                    value={cantRecibida}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setCantRecibida(v);
                                        if (v < modalRecibir.cantidad) setTieneIncidencia(true);
                                    }}
                                    required
                                />
                            </Field>
                            <Field label="Almacenero que Recepciona">
                                <Input
                                    value={recibidoPor}
                                    onChange={(e) => setRecibidoPor(e.target.value)}
                                    required
                                />
                            </Field>
                        </div>

                        {/* Incidencia de Transferencia (Bizagi 28: registrar incidencia no bloquea el ingreso) */}
                        <div className="rounded-xl border border-line p-3 space-y-3">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={tieneIncidencia}
                                    onChange={(e) => setTieneIncidencia(e.target.checked)}
                                    className="h-4 w-4 rounded border-line text-rose-500"
                                />
                                <span className="font-bold text-ink">
                                    Registrar Incidencia de Transferencia (Dañado, Faltante o Mermado)
                                </span>
                            </label>

                            {tieneIncidencia && (
                                <div className="space-y-2 border-t border-line pt-2">
                                    <Field label="Tipo de Incidencia">
                                        <Select
                                            value={incTipo}
                                            onChange={(e) => setIncTipo(e.target.value as typeof incTipo)}
                                        >
                                            <option value="faltante">Faltante cuantitativo</option>
                                            <option value="daño_transporte">Daño o rotura durante transporte</option>
                                            <option value="error_despacho">Error de despacho desde origen</option>
                                        </Select>
                                    </Field>
                                    <Field label="Descripción de la Incidencia">
                                        <Textarea
                                            value={incDescripcion}
                                            onChange={(e) => setIncDescripcion(e.target.value)}
                                            placeholder="Detalle de bultos dañados o derrames…"
                                            rows={2}
                                            required={tieneIncidencia}
                                        />
                                    </Field>
                                    <p className="text-[11px] text-muted">
                                        * Conforme a la regla del Proceso 28, registrar la incidencia no bloquea el
                                        ingreso al almacén destino: se confirma la cantidad conforme y se genera la
                                        alerta de inconsistencia.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-line">
                            <Button type="button" variant="secondary" onClick={() => setModalRecibir(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary">
                                <IconCheck size={15} />
                                Confirmar Recepción e Ingresar a Inventario
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
