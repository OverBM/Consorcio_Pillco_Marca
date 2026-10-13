// Cierre y liquidación de obra.
// Estado y excedentes desde `GET /api/v1/cierres-obra/{obraId}`; inicio y
// finalización vía `/iniciar` y `/finalizar` con `useHttp`.

import { useEffect, useState } from 'react';
import { router, useHttp } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFecha } from '../utils/format';
import { IconBoxes, IconCheckCircle, IconRepeat } from '../components/icons';

interface ObraDb {
    id: number;
    nombre: string;
    distrito?: string | null;
    estado?: string | null;
}

interface CierreObra {
    id: number;
    obra_id: number;
    fecha_ejecucion_100?: string | null;
    fecha_recepcion_obra?: string | null;
    estado: string;
    excedentes_evaluados?: boolean;
}

interface ExcedenteDb {
    id: number;
    cantidad: number | string;
    material?: { id: number; nombre: string; unidad_medida?: { codigo: string } | null } | null;
}

interface CierreObraPageProps {
    obrasDb?: ObraDb[];
}

interface DetalleCierre {
    obra: ObraDb;
    cierre: CierreObra | null;
    excedentes: ExcedenteDb[];
}

export default function CierreObraPage({ obrasDb = [] }: CierreObraPageProps) {
    const notify = useNotifications();
    const [obraId, setObraId] = useState('');
    const [detalle, setDetalle] = useState<DetalleCierre | null>(null);
    const [cargando, setCargando] = useState(false);

    const consulta = useHttp<Record<string, never>>({});
    const accion = useHttp<Record<string, never>>({});

    useEffect(() => {
        if (!obraId && obrasDb.length > 0) {
            setObraId(String(obrasDb[0].id));
        }
    }, [obrasDb, obraId]);

    useEffect(() => {
        if (!obraId) return;
        setCargando(true);
        consulta.get(`/api/v1/cierres-obra/${obraId}`, {
            onSuccess: (res) => setDetalle((res as { data: DetalleCierre }).data),
            onError: () => notify.error('No se pudo cargar el estado de cierre.'),
            onFinish: () => setCargando(false),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [obraId]);

    const ejecutar = (etapa: 'iniciar' | 'finalizar') => {
        if (!obraId) {
            notify.error('Selecciona una obra.');
            return;
        }
        accion.post(`/api/v1/cierres-obra/${obraId}/${etapa}`, {
            onSuccess: () => {
                notify.success(etapa === 'iniciar' ? 'Proceso de cierre iniciado.' : 'Obra liquidada y cerrada.');
                consulta.get(`/api/v1/cierres-obra/${obraId}`, {
                    onSuccess: (res) => setDetalle((res as { data: DetalleCierre }).data),
                });
                router.reload({ only: ['obrasDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo ejecutar la acción.');
            },
        });
    };

    const excedentes = (detalle?.excedentes ?? []).map((e) => ({ ...e, id: String(e.id) }));
    const estadoCierre = detalle?.cierre?.estado ?? 'sin_iniciar';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cierre y Liquidación de Obra"
                subtitle="Procedimiento formal de culminación, desmovilización y transferencia de saldos a otras obras"
            />

            <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono uppercase text-muted">Obra:</span>
                    <select
                        value={obraId}
                        onChange={(e) => setObraId(e.target.value)}
                        className="rounded-field border border-line bg-canvas px-3 py-1.5 text-xs text-ink outline-none"
                    >
                        {obrasDb.map((o) => (
                            <option key={o.id} value={String(o.id)}>
                                {o.nombre} {o.distrito ? `(${o.distrito})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <Badge tone={estadoCierre === 'cerrado' ? 'ok' : estadoCierre === 'en_cierre' ? 'warn' : 'neutral'}>
                    {estadoCierre.replace('_', ' ')}
                </Badge>
            </Card>

            {obrasDb.length === 0 ? (
                <EmptyState title="Sin obras registradas" hint="Registra una obra para gestionar su cierre." />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card title="Estado del Cierre" className="flex flex-col justify-between">
                        {cargando ? (
                            <p className="text-xs text-muted">Cargando estado…</p>
                        ) : (
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between rounded-lg border border-line bg-soft/40 p-3">
                                    <span className="text-muted">Ejecución física 100%</span>
                                    <span className="font-mono font-bold text-ink">
                                        {detalle?.cierre?.fecha_ejecucion_100 ? formatFecha(detalle.cierre.fecha_ejecucion_100) : 'Pendiente'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-line bg-soft/40 p-3">
                                    <span className="text-muted">Recepción de obra</span>
                                    <span className="font-mono font-bold text-ink">
                                        {detalle?.cierre?.fecha_recepcion_obra ? formatFecha(detalle.cierre.fecha_recepcion_obra) : 'Pendiente'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-line bg-soft/40 p-3">
                                    <IconBoxes size={16} className="text-brand-600" />
                                    <span className="text-muted">Excedentes detectados:</span>
                                    <span className="font-mono font-bold text-ink">{excedentes.length}</span>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button variant="mint" disabled={accion.processing || estadoCierre === 'cerrado'} onClick={() => ejecutar('iniciar')}>
                                        <IconRepeat size={15} /> Iniciar Cierre
                                    </Button>
                                    <Button variant="primary" disabled={accion.processing || estadoCierre === 'cerrado'} onClick={() => ejecutar('finalizar')}>
                                        <IconCheckCircle size={15} /> Finalizar y Liquidar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card title={`Excedentes para Redistribución (${excedentes.length})`}>
                        {excedentes.length === 0 ? (
                            <EmptyState title="Sin excedentes" hint="Se detectan automáticamente al iniciar el cierre." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin excedentes registrados."
                                columns={[
                                    { key: 'material', header: 'Material', cell: (e) => e.material?.nombre ?? '—' },
                                    {
                                        key: 'cantidad',
                                        header: 'Cantidad',
                                        align: 'right',
                                        mono: true,
                                        cell: (e) => `${formatCantidad(Number(e.cantidad))} ${e.material?.unidad_medida?.codigo ?? ''}`,
                                    },
                                ]}
                                rows={excedentes}
                            />
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
