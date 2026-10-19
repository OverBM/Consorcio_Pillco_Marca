// Ciclo de vida de obra por fases PMI/PMU.
// Fases canónicas y estados en `utils/cicloVida.ts`. Muestra requisitos,
// criterios de aprobación y su cumplimiento; gestiona el avance vía `useHttp`
// contra `/api/v1/proyectos/{obraId}/fases`.

import { useEffect, useMemo, useState } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { TextArea } from '../components/form';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconAlert, IconCheck, IconCheckCircle, IconClock, IconX } from '../components/icons';
import { FASES_CICLO_VIDA, faseAnterior, nombreFase, tonoEstadoFase } from '../utils/cicloVida';

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

interface RequisitoDb {
    id: number;
    fase: string;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
}

interface CriterioDb {
    id: number;
    fase: string;
    codigo: string;
    nombre: string;
    tipo: string;
    umbral?: number | string | null;
    obligatorio: boolean;
    activo: boolean;
}

interface EvaluacionCriterioDb {
    criterio_id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    obligatorio: boolean;
    cumple: boolean;
    detalle: string;
}

interface CicloVidaPageProps {
    obrasDb?: ObraDb[];
    fasesDb?: ObraFaseDb[];
    requisitosDb?: RequisitoDb[];
    criteriosDb?: CriterioDb[];
    evaluacionesDb?: Record<string, Record<string, EvaluacionCriterioDb[]>>;
}

const FORM_VACIO = {
    fase: '',
    estado: '',
    observaciones: '',
    justificaciones: {} as Record<string, string>,
};

export default function CicloVidaPage({
    obrasDb = [],
    fasesDb = [],
    requisitosDb = [],
    criteriosDb = [],
    evaluacionesDb = {},
}: CicloVidaPageProps) {
    const notify = useNotifications();
    const [obraId, setObraId] = useState<string>('');
    const [faseActiva, setFaseActiva] = useState<string | null>(null);
    const [justificando, setJustificando] = useState<string | null>(null);

    useEffect(() => {
        if (!obraId && obrasDb.length > 0) {
            setObraId(String(obrasDb[0].id));
        }
    }, [obrasDb, obraId]);

    const faseHttp = useHttp<typeof FORM_VACIO>({ ...FORM_VACIO, justificaciones: {} });

    const fasesPorCodigo = useMemo(() => {
        const map = new Map<string, ObraFaseDb>();
        fasesDb
            .filter((f) => String(f.obra_id) === obraId)
            .forEach((f) => map.set(f.fase, f));
        return map;
    }, [fasesDb, obraId]);

    const evaluacionesObra = useMemo(() => evaluacionesDb[obraId] ?? {}, [evaluacionesDb, obraId]);

    const criteriosDeFase = (fase: string) => criteriosDb.filter((c) => c.fase === fase && c.activo);
    const requisitosDeFase = (fase: string) => requisitosDb.filter((r) => r.fase === fase && r.activo);

    const obligatoriosIncumplidos = (fase: string) =>
        (evaluacionesObra[fase] ?? []).filter((e) => e.obligatorio && !e.cumple);

    const fasePreviaAprobada = (fase: string) => {
        const previa = faseAnterior(fase);
        if (!previa) return true;
        return fasesPorCodigo.get(previa)?.estado === 'aprobada';
    };

    const puedeAprobar = (fase: string) => fasePreviaAprobada(fase) && obligatoriosIncumplidos(fase).length === 0;

    const enviarFase = (fase: string, estado: 'en_proceso' | 'aprobada', justificaciones: Record<string, string> = {}) => {
        setFaseActiva(fase);
        faseHttp.transform(() => ({ fase, estado, observaciones: '', justificaciones }));
        void faseHttp.post(`/api/v1/proyectos/${obraId}/fases`, {
            onSuccess: () => {
                notify.success('Fase del proyecto actualizada.');
                setJustificando(null);
                refrescarProps('fasesDb', 'evaluacionesDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo actualizar la fase.');
            },
            onFinish: () => setFaseActiva(null),
        });
    };

    const solicitarAprobacion = (fase: string) => {
        const manuales = obligatoriosIncumplidos(fase).filter((e) => e.tipo === 'manual_justificado');
        if (manuales.length > 0) {
            faseHttp.setData('justificaciones', {});
            setJustificando(fase);
            return;
        }
        enviarFase(fase, 'aprobada');
    };

    const confirmarJustificacion = () => {
        if (!justificando) {
            return;
        }
        enviarFase(justificando, 'aprobada', faseHttp.data.justificaciones);
    };

    const faseJustificando = justificando ? obligatoriosIncumplidos(justificando).filter((e) => e.tipo === 'manual_justificado') : [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ciclo de Vida de Obra (PMI / PMU)"
                subtitle="Seguimiento secuencial por fases estandarizadas con requisitos y criterios de aprobación verificables"
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
                    {FASES_CICLO_VIDA.map((fase) => {
                        const registro = fasesPorCodigo.get(fase.codigo);
                        const estado = registro?.estado ?? 'pendiente';
                        const busy = faseActiva === fase.codigo;
                        const criterios = criteriosDeFase(fase.codigo);
                        const requisitos = requisitosDeFase(fase.codigo);
                        const evaluaciones = evaluacionesObra[fase.codigo] ?? [];
                        const previaOk = fasePreviaAprobada(fase.codigo);
                        const aprobable = puedeAprobar(fase.codigo);
                        const aprobada = estado === 'aprobada';

                        return (
                            <Card key={fase.codigo} className="p-4 flex flex-col justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-muted">Fase 0{fase.orden}</span>
                                        <Badge tone={tonoEstadoFase(estado)}>{estado.replace('_', ' ')}</Badge>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-ink">{fase.nombre}</h4>
                                        <p className="text-[11px] text-muted">{fase.responsable}</p>
                                        {registro?.aprobada_en && (
                                            <p className="text-[10px] font-mono text-brand-600">
                                                Aprobada: {new Date(registro.aprobada_en).toLocaleDateString('es-PE')}
                                            </p>
                                        )}
                                    </div>

                                    {requisitos.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-mono uppercase text-muted">Requisitos</p>
                                            <ul className="space-y-1">
                                                {requisitos.map((r) => (
                                                    <li key={r.id} className="flex items-start gap-1.5 text-[11px] text-ink">
                                                        <IconCheck size={12} className="mt-0.5 shrink-0 text-brand-600" />
                                                        <span>{r.nombre}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {criterios.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-mono uppercase text-muted">Criterios de aprobación</p>
                                            <ul className="space-y-1.5">
                                                {criterios.map((c) => {
                                                    const ev = evaluaciones.find((e) => e.criterio_id === c.id);
                                                    const cumple = ev?.cumple ?? false;
                                                    return (
                                                        <li key={c.id} className="rounded-md border border-line bg-soft/40 p-2">
                                                            <div className="flex items-start gap-1.5">
                                                                {cumple ? (
                                                                    <IconCheck size={12} className="mt-0.5 shrink-0 text-ok" />
                                                                ) : (
                                                                    <IconX size={12} className="mt-0.5 shrink-0 text-danger" />
                                                                )}
                                                                <div>
                                                                    <p className="text-[11px] font-semibold text-ink">
                                                                        {c.nombre}
                                                                        {c.obligatorio && <span className="ml-1 text-danger">*</span>}
                                                                    </p>
                                                                    {ev && <p className="text-[10px] text-muted">{ev.detalle}</p>}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    {!aprobada && !previaOk && (
                                        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-warn">
                                            <IconAlert size={12} /> Requiere aprobar {nombreFase(faseAnterior(fase.codigo) ?? '')} primero.
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="flex-1"
                                        disabled={busy || aprobada}
                                        onClick={() => enviarFase(fase.codigo, 'en_proceso')}
                                    >
                                        <IconClock size={13} /> Iniciar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="mint"
                                        className="flex-1"
                                        disabled={busy || aprobada || !aprobable}
                                        title={!aprobable ? 'Cumple los requisitos y criterios para aprobar.' : undefined}
                                        onClick={() => solicitarAprobacion(fase.codigo)}
                                    >
                                        <IconCheckCircle size={13} /> Aprobar
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal open={justificando !== null} onClose={() => setJustificando(null)} title="Justificación de aprobación">
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        Los siguientes criterios requieren una justificación manual antes de aprobar la fase{' '}
                        <strong className="text-ink">{nombreFase(justificando ?? '')}</strong>.
                    </p>
                    {faseJustificando.map((c) => (
                        <div key={c.criterio_id} className="space-y-1">
                            <label className="text-xs font-semibold text-ink">{c.nombre}</label>
                            <TextArea
                                rows={3}
                                value={faseHttp.data.justificaciones[c.codigo] ?? ''}
                                onChange={(e) =>
                                    faseHttp.setData('justificaciones', {
                                        ...faseHttp.data.justificaciones,
                                        [c.codigo]: e.target.value,
                                    })
                                }
                                placeholder="Describe la justificación..."
                            />
                        </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setJustificando(null)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="button" onClick={confirmarJustificacion} disabled={faseHttp.processing}>
                            <IconCheckCircle size={14} /> Aprobar fase
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
