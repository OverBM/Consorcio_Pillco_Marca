// Ciclo de vida de obra por fases PMI/PMU.
// Lista obras y fases (`obrasDb`/`fasesDb`); gestiona el avance de fase vía
// `useHttp` contra `/api/v1/proyectos/{obraId}/fases`.

import { useEffect, useMemo, useState } from 'react';
import { router, useHttp } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconCheckCircle, IconClock } from '../components/icons';

interface ObraDb {
    id: number;
    nombre: string;
    distrito?: string | null;
    estado?: string | null;
}

interface ObraFaseDb {
    id: number;
    obra_id: number;
    fase: string;
    estado: string;
    observaciones?: string | null;
    aprobada_en?: string | null;
}

interface CicloVidaPageProps {
    obrasDb?: ObraDb[];
    fasesDb?: ObraFaseDb[];
}

const FASES = [
    { codigo: 'inicio', nombre: 'Inicio', responsable: 'Gerente General / PMU' },
    { codigo: 'planificacion', nombre: 'Planificación', responsable: 'Oficina Técnica / Residente' },
    { codigo: 'ejecucion', nombre: 'Ejecución', responsable: 'Residente / Maestro de Obra' },
    { codigo: 'monitoreo_control', nombre: 'Monitoreo y Control', responsable: 'Área Técnica / Supervisión' },
    { codigo: 'cierre', nombre: 'Cierre de Obra', responsable: 'Consorcio / Entidad Contratante' },
];

function tonoEstado(estado: string): 'ok' | 'warn' | 'danger' | 'neutral' {
    if (estado === 'aprobada') return 'ok';
    if (estado === 'en_proceso') return 'warn';
    if (estado === 'rechazada') return 'danger';
    return 'neutral';
}

export default function CicloVidaPage({ obrasDb = [], fasesDb = [] }: CicloVidaPageProps) {
    const notify = useNotifications();
    const [obraId, setObraId] = useState<string>('');
    const [faseActiva, setFaseActiva] = useState<string | null>(null);

    useEffect(() => {
        if (!obraId && obrasDb.length > 0) {
            setObraId(String(obrasDb[0].id));
        }
    }, [obrasDb, obraId]);

    const faseHttp = useHttp<{ fase: string; estado: string; observaciones: string }>({
        fase: '',
        estado: '',
        observaciones: '',
    });

    const fasesPorCodigo = useMemo(() => {
        const map = new Map<string, ObraFaseDb>();
        fasesDb
            .filter((f) => String(f.obra_id) === obraId)
            .forEach((f) => map.set(f.fase, f));
        return map;
    }, [fasesDb, obraId]);

    const cambiarFase = (fase: string, estado: 'en_proceso' | 'aprobada') => {
        setFaseActiva(fase);
        faseHttp.transform(() => ({ fase, estado, observaciones: '' }));
        faseHttp.post(`/api/v1/proyectos/${obraId}/fases`, {
            onSuccess: () => {
                notify.success('Fase del proyecto actualizada.');
                router.reload({ only: ['fasesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo actualizar la fase.');
            },
            onFinish: () => setFaseActiva(null),
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ciclo de Vida de Obra (PMI / PMU)"
                subtitle="Seguimiento secuencial por fases estandarizadas de gestión de proyectos"
            />

            <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-muted">Obra de Análisis:</span>
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
            </Card>

            {obrasDb.length === 0 ? (
                <EmptyState title="Sin obras registradas" hint="Registra una obra para gestionar su ciclo de vida." />
            ) : (
                <div className="grid gap-4 lg:grid-cols-5">
                    {FASES.map((fase, index) => {
                        const registro = fasesPorCodigo.get(fase.codigo);
                        const estado = registro?.estado ?? 'pendiente';
                        const busy = faseActiva === fase.codigo;

                        return (
                            <Card key={fase.codigo} className="p-4 flex flex-col justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-muted">Fase 0{index + 1}</span>
                                        <Badge tone={tonoEstado(estado)}>{estado.replace('_', ' ')}</Badge>
                                    </div>
                                    <h4 className="text-sm font-bold text-ink">{fase.nombre}</h4>
                                    <p className="text-[11px] text-muted">{fase.responsable}</p>
                                    {registro?.aprobada_en && (
                                        <p className="text-[10px] font-mono text-brand-600">
                                            Aprobada: {new Date(registro.aprobada_en).toLocaleDateString('es-PE')}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="flex-1"
                                        disabled={busy}
                                        onClick={() => cambiarFase(fase.codigo, 'en_proceso')}
                                    >
                                        <IconClock size={13} /> Iniciar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="mint"
                                        className="flex-1"
                                        disabled={busy}
                                        onClick={() => cambiarFase(fase.codigo, 'aprobada')}
                                    >
                                        <IconCheckCircle size={13} /> Aprobar
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
