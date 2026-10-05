import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatMoneda } from '../utils/format';
import {
    IconAlert,
    IconBoxes,
    IconCheckCircle,
    IconDollar,
    IconFileText,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconTruck,
} from '../components/icons';

interface DevolucionItem {
    id: string;
    ordenCompraId: string;
    proveedor: string;
    material: string;
    cantidadRechazada: number;
    unidad: string;
    montoRechazado: number;
    motivo: string;
    fechaRegistro: string;
    tipoSolucion: 'reposicion_fisica' | 'nota_credito' | 'en_evaluacion';
    estado: 'pendiente' | 'en_camino' | 'resuelta';
}

export default function DevolucionesPage() {
    const { materiales, almacenes } = useAppStore();

    const [devoluciones, setDevoluciones] = useState<DevolucionItem[]>([
        {
            id: 'DEV-2026-001',
            ordenCompraId: 'OC-2026-0042',
            proveedor: 'Ferretería Industrial del Centro SAC',
            material: 'Acero Corrugado 1/2" Grado 60',
            cantidadRechazada: 45,
            unidad: 'Varillas',
            montoRechazado: 2025.00,
            motivo: 'Oxidación superficial severa y deformación en extremos por mal estibado en transporte.',
            fechaRegistro: '2026-10-02',
            tipoSolucion: 'reposicion_fisica',
            estado: 'en_camino',
        },
        {
            id: 'DEV-2026-002',
            ordenCompraId: 'OC-2026-0038',
            proveedor: 'Unión de Concreteras Huancayo SA (UNICON)',
            material: 'Cemento Andino Tipo I',
            cantidadRechazada: 30,
            unidad: 'Bolsas',
            montoRechazado: 870.00,
            motivo: 'Bolsas rotas con humedad detectada durante la descarga en plataforma Almacén Comuneros.',
            fechaRegistro: '2026-09-28',
            tipoSolucion: 'nota_credito',
            estado: 'resuelta',
        },
        {
            id: 'DEV-2026-003',
            ordenCompraId: 'OC-2026-0049',
            proveedor: 'Seguridad Industrial & EPPs Andina SAC',
            material: 'Casco de Seguridad Tipo Jockey con Barbiquejo',
            cantidadRechazada: 20,
            unidad: 'Unidades',
            montoRechazado: 560.00,
            motivo: 'Lote no cuenta con certificación ANSI Z89.1 impresa en carcasa según TDR.',
            fechaRegistro: '2026-10-04',
            tipoSolucion: 'reposicion_fisica',
            estado: 'pendiente',
        },
    ]);

    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState<string>('');
    const [modalNuevaDev, setModalNuevaDev] = useState(false);
    const [devSeleccionada, setDevSeleccionada] = useState<DevolucionItem | null>(null);

    // Formulario
    const [formOC, setFormOC] = useState('OC-2026-0050');
    const [formProv, setFormProv] = useState('Ferretería Industrial del Centro SAC');
    const [formMaterial, setFormMaterial] = useState('Acero Corrugado 1/2"');
    const [formCantidad, setFormCantidad] = useState(10);
    const [formUnidad, setFormUnidad] = useState('Varillas');
    const [formMonto, setFormMonto] = useState(450);
    const [formMotivo, setFormMotivo] = useState('');
    const [formSolucion, setFormSolucion] = useState<'reposicion_fisica' | 'nota_credito' | 'en_evaluacion'>('reposicion_fisica');

    const handleGuardarDevolucion = (e: React.FormEvent) => {
        e.preventDefault();
        const nueva: DevolucionItem = {
            id: `DEV-2026-00${devoluciones.length + 1}`,
            ordenCompraId: formOC,
            proveedor: formProv,
            material: formMaterial,
            cantidadRechazada: Number(formCantidad),
            unidad: formUnidad,
            montoRechazado: Number(formMonto),
            motivo: formMotivo || 'Rechazo por control de calidad en almacén de recepción.',
            fechaRegistro: new Date().toISOString().slice(0, 10),
            tipoSolucion: formSolucion,
            estado: 'pendiente',
        };
        setDevoluciones((prev) => [nueva, ...prev]);
        setModalNuevaDev(false);
        setFormMotivo('');
    };

    const devolucionesFiltradas = useMemo(() => {
        return devoluciones.filter((d) => {
            if (filtroEstado !== 'todos' && d.estado !== filtroEstado) return false;
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const matchId = d.id.toLowerCase().includes(q);
                const matchProv = d.proveedor.toLowerCase().includes(q);
                const matchMat = d.material.toLowerCase().includes(q);
                if (!matchId && !matchProv && !matchMat) return false;
            }
            return true;
        });
    }, [devoluciones, filtroEstado, busqueda]);

    // Métricas
    const totalDevoluciones = devoluciones.length;
    const montoTotalRechazado = devoluciones.reduce((acc, d) => acc + d.montoRechazado, 0);
    const pendientesCount = devoluciones.filter((d) => d.estado === 'pendiente' || d.estado === 'en_camino').length;
    const resueltasCount = devoluciones.filter((d) => d.estado === 'resuelta').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Devoluciones y Rechazos a Proveedor"
                subtitle="Registro de actas de no conformidad, reposición física de materiales y compensación por nota de crédito"
                action={
                    <Button variant="mint" onClick={() => setModalNuevaDev(true)}>
                        <IconPlus size={16} />
                        Registrar Acta de Rechazo
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Devoluciones Totales</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{totalDevoluciones}</p>
                    <span className="text-xs text-muted">Actas de rechazo emitidas</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Monto Observado / Rechazado</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-red-600">{formatMoneda(montoTotalRechazado)}</p>
                    <span className="text-xs text-muted">En proceso de recupero económico</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Pendientes de Reposición</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-amber-600">{pendientesCount}</p>
                    <span className="text-xs text-muted">A la espera de nuevo lote</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Casos Resueltos</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{resueltasCount}</p>
                    <span className="text-xs text-emerald-700">Reposición o N/C completada</span>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="p-4 bg-surface border-line">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por acta, proveedor o material..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todos">Todos los Estados</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="en_camino">En Tránsito / Reposición</option>
                            <option value="resuelta">Resuelta</option>
                        </select>
                    </div>
                    <span className="text-xs text-muted font-mono">
                        Mostrando {devolucionesFiltradas.length} de {devoluciones.length} devoluciones
                    </span>
                </div>
            </Card>

            {/* Tabla de Devoluciones */}
            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="No hay actas de devolución que coincidan con la búsqueda."
                    columns={[
                        { key: 'id', header: 'Acta Devolución', mono: true },
                        { key: 'oc', header: 'OC Origen', mono: true },
                        { key: 'proveedor', header: 'Proveedor Afectado' },
                        { key: 'material', header: 'Material y Rechazo' },
                        { key: 'monto', header: 'Valor Rechazado', align: 'right', mono: true },
                        { key: 'solucion', header: 'Tipo Solución', align: 'center' },
                        { key: 'estado', header: 'Estado', align: 'center' },
                        { key: 'acciones', header: 'Acciones', align: 'right' },
                    ]}
                    rows={devolucionesFiltradas.map((dev) => {
                        return {
                            id: dev.id,
                            oc: dev.ordenCompraId,
                            proveedor: dev.proveedor,
                            material: (
                                <div>
                                    <p className="font-semibold text-ink">{dev.material}</p>
                                    <p className="text-xs font-mono text-muted">
                                        Rechazo: {dev.cantidadRechazada} {dev.unidad}
                                    </p>
                                </div>
                            ),
                            monto: (
                                <span className="font-bold font-mono text-red-600 text-sm">
                                    {formatMoneda(dev.montoRechazado)}
                                </span>
                            ),
                            solucion: (
                                <Badge tone={dev.tipoSolucion === 'reposicion_fisica' ? 'neutral' : 'ok'}>
                                    {dev.tipoSolucion === 'reposicion_fisica'
                                        ? 'Reposición Física'
                                        : dev.tipoSolucion === 'nota_credito'
                                        ? 'Nota de Crédito'
                                        : 'En Evaluación'}
                                </Badge>
                            ),
                            estado: (
                                <Badge
                                    tone={
                                        dev.estado === 'resuelta'
                                            ? 'ok'
                                            : dev.estado === 'en_camino'
                                            ? 'warn'
                                            : 'danger'
                                    }
                                >
                                    {dev.estado === 'resuelta'
                                        ? 'Resuelta'
                                        : dev.estado === 'en_camino'
                                        ? 'En Reposición'
                                        : 'Pendiente'}
                                </Badge>
                            ),
                            acciones: (
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setDevSeleccionada(dev)}
                                    >
                                        <IconFileText size={13} />
                                        Ver Acta
                                    </Button>
                                </div>
                            ),
                        };
                    })}
                />
            </Card>

            {/* Modal Detalle Acta de Devolución */}
            <Modal
                open={Boolean(devSeleccionada)}
                onClose={() => setDevSeleccionada(null)}
                title={`Acta de No Conformidad: ${devSeleccionada?.id ?? ''}`}
                wide
            >
                {devSeleccionada && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs bg-canvas p-3 rounded-lg border border-line">
                            <div>
                                <span className="text-muted block">Orden de Compra Asociada:</span>
                                <span className="font-bold font-mono text-ink">{devSeleccionada.ordenCompraId}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Fecha de Registro:</span>
                                <span className="font-mono text-ink">{devSeleccionada.fechaRegistro}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Proveedor Notificado:</span>
                                <span className="font-bold text-ink">{devSeleccionada.proveedor}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Valoración Económica del Lote:</span>
                                <span className="font-mono font-bold text-red-600">
                                    {formatMoneda(devSeleccionada.montoRechazado)}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-red-900 block">Sustento Técnico del Rechazo:</span>
                            <p className="text-red-800">{devSeleccionada.motivo}</p>
                        </div>

                        <div className="p-3 bg-canvas rounded-lg border border-line text-xs">
                            <span className="font-bold text-muted block mb-1">Solución Acordada:</span>
                            <p className="text-ink">
                                {devSeleccionada.tipoSolucion === 'reposicion_fisica'
                                    ? 'El proveedor realizará el retiro del lote observado y el despacho de nuevo material certificado en un plazo máximo de 48 horas.'
                                    : 'Se emitirá Nota de Crédito por el monto total observado y se anulará la cuenta por pagar en módulo de finanzas.'}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setDevSeleccionada(null)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Nueva Acta de Devolución */}
            <Modal
                open={modalNuevaDev}
                onClose={() => setModalNuevaDev(false)}
                title="Emitir Acta de Rechazo / Devolución a Proveedor"
                wide
            >
                <form onSubmit={handleGuardarDevolucion} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="N° Orden de Compra">
                            <Input
                                value={formOC}
                                onChange={(e) => setFormOC(e.target.value)}
                                placeholder="OC-2026-XXXX"
                                required
                            />
                        </Field>
                        <Field label="Proveedor">
                            <Input
                                value={formProv}
                                onChange={(e) => setFormProv(e.target.value)}
                                placeholder="Razón social del proveedor"
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Material Observado">
                            <Input
                                value={formMaterial}
                                onChange={(e) => setFormMaterial(e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="Cantidad Rechazada">
                            <Input
                                type="number"
                                value={formCantidad}
                                onChange={(e) => setFormCantidad(Number(e.target.value))}
                                min="1"
                                required
                            />
                        </Field>
                        <Field label="Monto Estimado (S/.)">
                            <Input
                                type="number"
                                step="0.01"
                                value={formMonto}
                                onChange={(e) => setFormMonto(Number(e.target.value))}
                                required
                            />
                        </Field>
                    </div>

                    <Field label="Tipo de Compensación Solicitada">
                        <Select
                            value={formSolucion}
                            onChange={(e) => setFormSolucion(e.target.value as any)}
                        >
                            <option value="reposicion_fisica">Reposición Física de Material Conforme</option>
                            <option value="nota_credito">Emisión de Nota de Crédito</option>
                            <option value="en_evaluacion">En Evaluación por Residencia</option>
                        </Select>
                    </Field>

                    <Field label="Motivo y Detalle de No Conformidad">
                        <Textarea
                            rows={3}
                            value={formMotivo}
                            onChange={(e) => setFormMotivo(e.target.value)}
                            placeholder="Describa la falla: daño físico, humedad, falta de certificado de calidad de fábrica, etc."
                            required
                        />
                    </Field>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalNuevaDev(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit">
                            Emitir Acta de Rechazo
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
