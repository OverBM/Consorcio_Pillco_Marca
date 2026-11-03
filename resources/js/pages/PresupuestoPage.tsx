import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { KpiTile } from '../design-system/KpiTile';
import { formatMoneda } from '../utils/format';

interface PartidaPresupuesto {
    id: string;
    obra_id?: string;
    obra?: string;
    rubro: string;
    presupuestado: number;
    ejecutado: number;
    saldo: number;
    pct: number;
    bac?: number;
}

interface PresupuestoPageProps {
    obrasDb?: { id: number | string; nombre: string }[];
    partidasDb?: PartidaPresupuesto[];
    bacTotal?: number;
}

const PARTIDAS_DEMO: PartidaPresupuesto[] = [
    {
        id: '1',
        rubro: 'Mano de Obra Directa (Régimen Construcción Civil)',
        presupuestado: 450000.0,
        ejecutado: 382000.0,
        saldo: 68000.0,
        pct: 84.8,
    },
    {
        id: '2',
        rubro: 'Materiales e Insumos Principales',
        presupuestado: 850000.0,
        ejecutado: 714000.0,
        saldo: 136000.0,
        pct: 84.0,
    },
    {
        id: '3',
        rubro: 'Equipos y Maquinaria Pesada',
        presupuestado: 320000.0,
        ejecutado: 256000.0,
        saldo: 64000.0,
        pct: 80.0,
    },
    {
        id: '4',
        rubro: 'Subcontratos y Servicios de Terceros',
        presupuestado: 180000.0,
        ejecutado: 144000.0,
        saldo: 36000.0,
        pct: 80.0,
    },
    {
        id: '5',
        rubro: 'Gastos Generales y Supervisión',
        presupuestado: 120000.0,
        ejecutado: 96000.0,
        saldo: 24000.0,
        pct: 80.0,
    },
];

export default function PresupuestoPage({
    obrasDb = [],
    partidasDb = [],
    bacTotal = 0,
}: PresupuestoPageProps) {
    const [obraId, setObraId] = useState('todas');
    const usaDatosReales = partidasDb.length > 0;
    const fuente = usaDatosReales ? partidasDb : PARTIDAS_DEMO;

    const filtradas = useMemo(
        () =>
            obraId === 'todas'
                ? fuente
                : fuente.filter(
                      (partida) => String(partida.obra_id) === obraId,
                  ),
        [fuente, obraId],
    );

    const totales = useMemo(() => {
        const presupuestado = filtradas.reduce(
            (acc, partida) => acc + Number(partida.presupuestado ?? 0),
            0,
        );
        const ejecutado = filtradas.reduce(
            (acc, partida) => acc + Number(partida.ejecutado ?? 0),
            0,
        );

        return {
            presupuestado,
            ejecutado,
            saldo: presupuestado - ejecutado,
            pct:
                presupuestado > 0
                    ? Math.round((ejecutado / presupuestado) * 1000) / 10
                    : null,
        };
    }, [filtradas]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Control Presupuestal y Costos por Rubro"
                subtitle="Monitoreo de costos reales incurridos vs. presupuesto meta contractual"
                actions={
                    usaDatosReales && obrasDb.length > 0 ? (
                        <select
                            value={obraId}
                            onChange={(event) =>
                                setObraId(event.target.value)
                            }
                            className="border-line bg-surface text-ink rounded-lg border px-3 py-1.5 text-xs"
                        >
                            <option value="todas">Todas las obras</option>
                            {obrasDb.map((obra) => (
                                <option key={obra.id} value={String(obra.id)}>
                                    {obra.nombre}
                                </option>
                            ))}
                        </select>
                    ) : undefined
                }
            />

            {!usaDatosReales && (
                <div className="border-atencion/30 bg-atencion-soft text-atencion rounded-xl border px-3 py-2 text-xs">
                    <Badge tone="warn">Vista demostrativa</Badge>{' '}
                    Aún no hay partidas presupuestales registradas en la base
                    de datos. Se muestra la estructura de ejemplo.
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiTile
                    label="Línea base (BAC)"
                    value={bacTotal > 0 ? bacTotal : totales.presupuestado}
                    formato="moneda"
                    variante="dark"
                    detalle={
                        usaDatosReales
                            ? 'BAC vigente de las obras'
                            : 'Presupuesto meta de la vista demo'
                    }
                />
                <KpiTile
                    label="Presupuesto por partidas"
                    value={totales.presupuestado}
                    formato="moneda"
                    detalle={`${filtradas.length} partidas consideradas`}
                />
                <KpiTile
                    label="Costo ejecutado"
                    value={totales.ejecutado}
                    formato="moneda"
                    variante="brand"
                    detalle="Valorizado según avance físico"
                />
                <KpiTile
                    label="Ejecución presupuestal"
                    value={totales.pct}
                    formato="porcentaje"
                    detalle={`Saldo disponible ${formatMoneda(totales.saldo)}`}
                    progreso={totales.pct}
                    progresoTono={
                        (totales.pct ?? 0) > 100
                            ? 'danger'
                            : (totales.pct ?? 0) >= 80
                              ? 'warn'
                              : 'ok'
                    }
                />
            </div>

            <Card className="p-5">
                <DataTable<{
                    id: string;
                    rubro: string;
                    presupuestado: string;
                    ejecutado: string;
                    saldo: string;
                    pct: number;
                }>
                    emptyLabel="Sin rubros presupuestales."
                    columns={[
                        { key: 'rubro', header: 'Rubro de Costo' },
                        {
                            key: 'presupuestado',
                            header: 'Presupuesto Meta',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'ejecutado',
                            header: 'Costo Real Incurrido',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'saldo',
                            header: 'Saldo Disponible',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'pct',
                            header: 'Ejecución %',
                            align: 'right',
                            cell: (r) => (
                                <div className="flex items-center justify-end gap-2">
                                    <div className="bg-soft h-1.5 w-16 overflow-hidden rounded-full">
                                        <div
                                            className={`h-full rounded-full ${
                                                r.pct > 100
                                                    ? 'bg-critico'
                                                    : r.pct >= 80
                                                      ? 'bg-atencion'
                                                      : 'bg-exito'
                                            }`}
                                            style={{
                                                width: `${Math.min(100, r.pct)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-ink font-mono text-xs font-bold">
                                        {r.pct}%
                                    </span>
                                </div>
                            ),
                        },
                    ]}
                    rows={filtradas.map((partida) => ({
                        id: partida.id,
                        rubro: partida.obra
                            ? `${partida.rubro} · ${partida.obra}`
                            : partida.rubro,
                        presupuestado: formatMoneda(
                            Number(partida.presupuestado),
                        ),
                        ejecutado: formatMoneda(Number(partida.ejecutado)),
                        saldo: formatMoneda(Number(partida.saldo)),
                        pct: Number(partida.pct),
                    }))}
                />
            </Card>
        </div>
    );
}
