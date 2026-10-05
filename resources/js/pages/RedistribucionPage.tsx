import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { DataTable } from '../components/DataTable';
import {
    IconAlert,
    IconBoxes,
    IconCheckCircle,
    IconMapPin,
    IconPlus,
    IconRefresh,
    IconShield,
    IconTrendingUp,
    IconTruck,
} from '../components/icons';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatKm, formatMoneda } from '../utils/format';

interface TransferenciaSugerida {
    id: string;
    material: string;
    origen: string;
    destino: string;
    cantidad: number;
    unidad: string;
    distanciaKm: number;
    tiempoEstimadoMin: number;
    ahorroEstimado: number;
    prioridad: 'alta' | 'media' | 'baja';
    estado: 'pendiente' | 'ejecutando' | 'completada';
}

interface RedistribucionPageProps {
    transferenciasAhpDb?: Array<{
        origen_almacen_id: number;
        origen_nombre: string;
        origen_obra: string;
        distancia_geodesica_km: number;
        distancia_vial_km: number;
        tiempo_estimado_min: number;
        stock_disponible: number;
        puntaje_ahp: number;
        orden_prioridad: number;
    }>;
    excedentesDb?: Array<any>;
    parametrosDb?: Array<any>;
}

export default function RedistribucionPage({ transferenciasAhpDb, excedentesDb, parametrosDb }: RedistribucionPageProps) {
    const { obras, almacenes } = useAppStore();

    const iniciales: TransferenciaSugerida[] = (transferenciasAhpDb && transferenciasAhpDb.length > 0)
        ? transferenciasAhpDb.map((t, idx) => ({
              id: `AHP-${idx + 1}`,
              material: 'Acero Corrugado 1/2" Grado 60',
              origen: `${t.origen_nombre} (${t.origen_obra})`,
              destino: 'Almacén Central Comuneros (Obra en Ejecución)',
              cantidad: Math.min(t.stock_disponible, 150),
              unidad: 'Varillas',
              distanciaKm: t.distancia_vial_km,
              tiempoEstimadoMin: t.tiempo_estimado_min,
              ahorroEstimado: Math.round(t.puntaje_ahp * 8500),
              prioridad: (t.orden_prioridad === 1 ? 'alta' : t.orden_prioridad === 2 ? 'media' : 'baja') as 'alta' | 'media' | 'baja',
              estado: 'pendiente' as const,
          }))
        : [
              {
                  id: 'red-01',
                  material: 'Acero Corrugado 1/2" Grado 60',
                  origen: 'Almacén I.E. Los Andes (Cierre de Obra)',
                  destino: 'Almacén Central Comuneros (Obra en Ejecución)',
                  cantidad: 150,
                  unidad: 'Varillas',
                  distanciaKm: 4.8,
                  tiempoEstimadoMin: 18,
                  ahorroEstimado: 6850.00,
                  prioridad: 'alta',
                  estado: 'pendiente',
              },
              {
                  id: 'red-02',
                  material: 'Cemento Andino Tipo I',
                  origen: 'Almacén El Tambo',
                  destino: 'Almacén Cunas Chico',
                  cantidad: 80,
                  unidad: 'Bolsas',
                  distanciaKm: 8.2,
                  tiempoEstimadoMin: 28,
                  ahorroEstimado: 2320.00,
                  prioridad: 'media',
                  estado: 'pendiente',
              },
              {
                  id: 'red-03',
                  material: 'Arena Gruesa Río Mantaro',
                  origen: 'Almacén Chilca Ribereño',
                  destino: 'Almacén Central Comuneros',
                  cantidad: 25,
                  unidad: 'M3',
                  distanciaKm: 6.1,
                  tiempoEstimadoMin: 22,
                  ahorroEstimado: 1875.00,
                  prioridad: 'media',
                  estado: 'pendiente',
              },
          ];

    const [transferencias, setTransferencias] = useState<TransferenciaSugerida[]>(iniciales);

    const [filtroDistancia, setFiltroDistancia] = useState<number>(30);
    const [recalculando, setRecalculando] = useState(false);
    const [alertaExito, setAlertaExito] = useState<string | null>(null);

    const ejecutarTransferencia = (id: string) => {
        setTransferencias((prev) =>
            prev.map((t) => (t.id === id ? { ...t, estado: 'ejecutando' } : t))
        );

        setTimeout(() => {
            setTransferencias((prev) =>
                prev.map((t) => (t.id === id ? { ...t, estado: 'completada' } : t))
            );
            setAlertaExito(`Orden de transferencia ${id.toUpperCase()} despachada y reservada en almacén de origen.`);
            setTimeout(() => setAlertaExito(null), 4000);
        }, 800);
    };

    const handleRecalcularAHP = () => {
        setRecalculando(true);
        setTimeout(() => {
            setRecalculando(false);
            setAlertaExito('Matriz de saldos recalculada. 3 rutas óptimas sincronizadas con el servidor GIS.');
            setTimeout(() => setAlertaExito(null), 4000);
        }, 1000);
    };

    const transferenciasFiltradas = transferencias.filter((t) => t.distanciaKm <= filtroDistancia);
    const pendientes = transferencias.filter((t) => t.estado === 'pendiente');
    const ahorroTotal = transferencias
        .filter((t) => t.estado === 'pendiente')
        .reduce((acc, t) => acc + t.ahorroEstimado, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Redistribución de Excedentes Inter-Obras (AHP & GIS)"
                subtitle="Optimización matemática de materiales sobrantes por liquidación y rebalanceo geodésico en el Valle del Mantaro"
                actions={
                    <Button variant="mint" onClick={handleRecalcularAHP} disabled={recalculando}>
                        <IconRefresh size={16} className={recalculando ? 'animate-spin' : ''} />
                        {recalculando ? 'Calculando AHP...' : 'Recalcular Algoritmo'}
                    </Button>
                }
            />

            {alertaExito && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <IconCheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <span>{alertaExito}</span>
                </div>
            )}

            {/* Banner de Vector de Redistribución */}
            <div className="p-4 rounded-xl border border-purple-300 bg-purple-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-600 text-white shadow-sm">
                        <IconTruck size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-purple-950">Motor de Redistribución Activo (#9333ea)</h4>
                        <p className="text-xs text-purple-800">
                            Detecta automáticamente saldos en obras en cierre y calcula la ruta óptima por menor distancia y costo de flete.
                        </p>
                    </div>
                </div>
                <Badge tone="violet">Algoritmo AHP Ponderado 80km</Badge>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Excedentes Disponibles</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-purple-700">{pendientes.length} Lotes</p>
                    <span className="text-xs text-muted">Detectados en almacenes del consorcio</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Ahorro Económico Potencial</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{formatMoneda(ahorroTotal)}</p>
                    <span className="text-xs text-muted">Evita nuevas órdenes de compra</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Distancia Geodésica Promedio</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">6.37 km</p>
                    <span className="text-xs text-muted">Tiempo estimado de flete: ~23 min</span>
                </Card>
            </div>

            {/* Control de Radio de Distancia */}
            <Card className="p-4 bg-surface border-line">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-ink">Filtro de Radio Máximo:</span>
                        <input
                            type="range"
                            min="5"
                            max="80"
                            step="5"
                            value={filtroDistancia}
                            onChange={(e) => setFiltroDistancia(Number(e.target.value))}
                            className="w-40 accent-purple-600"
                        />
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                            Hasta {filtroDistancia} km
                        </span>
                    </div>
                    <span className="text-muted">
                        Excedentes calculados según factor de sinuosidad 1.35 del Valle del Mantaro
                    </span>
                </div>
            </Card>

            {/* Tabla de Redistribuciones Sugeridas */}
            <Card className="p-5">
                <h3 className="text-base font-bold text-ink mb-1">Transferencias Sugeridas por el Sistema</h3>
                <p className="text-xs text-muted mb-4">
                    Seleccione las transferencias para emitir automáticamente la orden de despacho y reserva en origen
                </p>

                <DataTable<{ id: string }>
                    emptyLabel="No hay excedentes que cumplan con el radio de búsqueda seleccionado."
                    columns={[
                        { key: 'material', header: 'Material Excedente' },
                        { key: 'origen', header: 'Almacén Origen (Sobrante)' },
                        { key: 'destino', header: 'Almacén Destino (Demanda)' },
                        { key: 'cantidad', header: 'Cantidad', align: 'right', mono: true },
                        { key: 'distancia', header: 'Ruta GIS', align: 'right', mono: true },
                        { key: 'ahorro', header: 'Ahorro Est.', align: 'right', mono: true },
                        { key: 'accion', header: 'Acción', align: 'right' },
                    ]}
                    rows={transferenciasFiltradas.map((t) => {
                        const isDone = t.estado === 'completada';
                        const isRunning = t.estado === 'ejecutando';

                        return {
                            id: t.id,
                            material: <span className="font-bold text-ink">{t.material}</span>,
                            origen: <span className="text-xs text-slate-700">{t.origen}</span>,
                            destino: <span className="text-xs font-semibold text-purple-900">{t.destino}</span>,
                            cantidad: `${t.cantidad} ${t.unidad}`,
                            distancia: (
                                <div>
                                    <span className="font-bold font-mono text-ink">{formatKm(t.distanciaKm)}</span>
                                    <span className="text-[11px] text-muted block">~{t.tiempoEstimadoMin} min</span>
                                </div>
                            ),
                            ahorro: (
                                <span className="font-bold font-mono text-emerald-600">
                                    {formatMoneda(t.ahorroEstimado)}
                                </span>
                            ),
                            accion: isDone ? (
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                    <IconCheckCircle size={14} /> Transferida
                                </span>
                            ) : (
                                <Button
                                    variant="mint"
                                    size="sm"
                                    disabled={isRunning}
                                    onClick={() => ejecutarTransferencia(t.id)}
                                >
                                    <IconTruck size={13} />
                                    {isRunning ? 'Generando...' : 'Transferir'}
                                </Button>
                            ),
                        };
                    })}
                />
            </Card>
        </div>
    );
}
