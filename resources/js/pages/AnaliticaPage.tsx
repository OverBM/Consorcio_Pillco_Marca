// Módulo de Analítica Predictiva: parámetros, pronóstico, alertas y ejecuciones.
// Datos desde props Inertia; escrituras vía useHttp contra /api/v1.

import { useEffect, useMemo, useState } from 'react';
import { useHttp } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { KpiTile } from '../design-system/KpiTile';
import {
    AnaliticaChart,
    type PuntoSerieAnalitica,
} from '../design-system/AnaliticaChart';
import { AnaliticaResumen } from '../design-system/AnaliticaResumen';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { refrescarProps } from '../utils/refrescar';
import { formatCantidad, formatFecha } from '../utils/format';

type Pestana =
    | 'resumen'
    | 'parametros'
    | 'pronosticos'
    | 'alertas'
    | 'ejecuciones';

interface ParametroDb {
    id: number;
    almacen_id: number;
    material_id: number;
    eoq: number | string | null;
    stock_seguridad: number | string | null;
    punto_reorden: number | string | null;
    demanda_media_diaria: number | string;
    clase_abc: string;
    clase_xyz: string;
    clase_combinada: string;
    estado: string;
    lead_time_dias: number | string | null;
    modelo_version: string;
    calculado_en: string | null;
    almacen?: { nombre: string };
    material?: { codigo: string; nombre: string };
}

interface PronosticoDb {
    id: number;
    fecha: string;
    cantidad: number | string;
    limite_inferior: number | string;
    limite_superior: number | string;
    mape: number | string | null;
    rmse: number | string;
    metodo_usado: string;
    baja_confianza: boolean;
    almacen?: { nombre: string };
    material?: { codigo: string; nombre: string };
}

interface AlertaDb {
    id: number;
    tipo: string;
    severidad: string;
    fecha_estimada: string | null;
    cantidad_sugerida: number | string | null;
    detalle: string;
    estado: string;
    almacen?: { nombre: string };
    material?: { codigo: string; nombre: string };
}

interface EjecucionDb {
    id: number;
    origen: string;
    estado: string;
    inicio: string;
    fin: string | null;
    duracion_ms: number | null;
    series: number;
    calculadas: number;
    alertas: number;
    errores: number;
    mensaje: string | null;
}

interface ResumenDb {
    parametros_vigentes: number;
    alertas_vigentes: number;
    alertas_criticas: number;
    quiebres_7d: number;
    eoq_promedio_a: number | string | null;
    demanda_media_total: number;
    ultima_ejecucion: EjecucionDb | null;
}

interface CuotaRuteo {
    fecha: string;
    limite: number;
    usadas: number;
    restantes: number;
    porcentaje: number;
    geocodificaciones: number;
    fallos: number;
    actualizado_en: string;
}

interface ConsumoDia {
    fecha: string;
    llamadas: number;
    exitos: number;
    fallos: number;
    geocodificaciones: number;
}

interface AnaliticaPageProps {
    resumen: ResumenDb;
    parametrosDb?: ParametroDb[];
    pronosticosDb?: PronosticoDb[];
    alertasDb?: AlertaDb[];
    ejecucionesDb?: EjecucionDb[];
    cuotaRuteo: CuotaRuteo;
    cuotaRuteoSemana?: ConsumoDia[];
    serieAnalitica: {
        serie: PuntoSerieAnalitica[];
        cobertura_dias: number | null;
        mape: number | null;
        quiebres_7d: number;
        alertas: number;
        demanda_media: number;
    };
}

const formatearNumero = (valor: number | string | null | undefined): string => {
    if (valor === null || valor === undefined) {
        return '—';
    }

    return formatCantidad(Number(valor));
};

const tonoSeveridad = (severidad: string) => {
    if (severidad === 'critica') return 'danger' as const;
    if (severidad === 'alta') return 'warn' as const;

    return 'neutral' as const;
};

export default function AnaliticaPage({
    resumen,
    parametrosDb = [],
    pronosticosDb = [],
    alertasDb = [],
    ejecucionesDb = [],
    cuotaRuteo,
    cuotaRuteoSemana = [],
    serieAnalitica,
}: AnaliticaPageProps) {
    const notify = useNotifications();
    const [pestana, setPestana] = useState<Pestana>('resumen');
    const [busqueda, setBusqueda] = useState('');
    const [reconociendo, setReconociendo] = useState<number | null>(null);
    const [generando, setGenerando] = useState(false);
    const [cuota, setCuota] = useState<CuotaRuteo>(cuotaRuteo);

    const http = useHttp({});
    const motor = useHttp({});

    useEffect(() => {
        const intervalo = window.setInterval(() => {
            void fetch('/api/v1/analitica/resumen', {
                headers: { Accept: 'application/json' },
            })
                .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
                .then((cuerpo) => {
                    const actualizada = (
                        cuerpo as { data?: { cuota_ruteo?: CuotaRuteo } }
                    )?.data?.cuota_ruteo;

                    if (actualizada) {
                        setCuota(actualizada);
                    }
                })
                .catch(() => {
                    // Si falla el refresco, se conserva el último valor.
                });
        }, 60000);

        return () => window.clearInterval(intervalo);
    }, []);

    const tonoCuota =
        cuota.porcentaje >= 80
            ? ('danger' as const)
            : cuota.porcentaje >= 50
              ? ('warn' as const)
              : ('ok' as const);

    const barraCuota =
        cuota.porcentaje >= 80
            ? 'bg-critico'
            : cuota.porcentaje >= 50
              ? 'bg-atencion'
              : 'bg-brand-500';

    const maximoSemana = Math.max(
        ...cuotaRuteoSemana.map((dia) => dia.llamadas),
        cuota.limite,
        1,
    );

    const parametros = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        return parametrosDb
            .filter((parametro) =>
                termino === ''
                    ? true
                    : `${parametro.material?.nombre ?? ''} ${parametro.material?.codigo ?? ''} ${parametro.almacen?.nombre ?? ''}`
                          .toLowerCase()
                          .includes(termino),
            )
            .map((parametro) => ({ ...parametro, id: String(parametro.id) }));
    }, [parametrosDb, busqueda]);

    const alertas = useMemo(
        () => alertasDb.map((alerta) => ({ ...alerta, id: String(alerta.id) })),
        [alertasDb],
    );

    const pronosticos = useMemo(
        () =>
            pronosticosDb.map((pronostico) => ({
                ...pronostico,
                id: String(pronostico.id),
            })),
        [pronosticosDb],
    );

    const ejecuciones = useMemo(
        () =>
            ejecucionesDb.map((ejecucion) => ({
                ...ejecucion,
                id: String(ejecucion.id),
            })),
        [ejecucionesDb],
    );

    const reconocerAlerta = (id: string) => {
        setReconociendo(Number(id));

        void http.post(`/api/v1/analitica/alertas/${id}/reconocer`, {
            onSuccess: () => {
                notify.success('Alerta reconocida.');
                refrescarProps('alertasDb', 'resumen');
            },
            onError: () => {
                notify.error('No se pudo reconocer la alerta.');
            },
            onFinish: () => setReconociendo(null),
        });
    };

    const exportarCsv = () => {
        const encabezados = [
            'almacen',
            'material',
            'unidad',
            'clase',
            'eoq',
            'stock_seguridad',
            'punto_reorden',
            'lead_time_dias',
            'estado',
            'modelo_version',
            'calculado_en',
        ];

        const filas = parametrosDb.map((parametro) => [
            parametro.almacen?.nombre ?? '',
            `${parametro.material?.codigo ?? ''} ${parametro.material?.nombre ?? ''}`.trim(),
            '',
            parametro.clase_combinada,
            parametro.eoq ?? '',
            parametro.stock_seguridad ?? '',
            parametro.punto_reorden ?? '',
            parametro.lead_time_dias ?? '',
            parametro.estado,
            parametro.modelo_version,
            parametro.calculado_en ?? '',
        ]);

        const contenido = [encabezados, ...filas]
            .map((fila) =>
                fila
                    .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
                    .join(','),
            )
            .join('\n');

        const blob = new Blob([`\uFEFF${contenido}`], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `analitica-parametros-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        enlace.click();
        URL.revokeObjectURL(url);
        notify.success('Reporte exportado.');
    };

    const regenerarAnalitica = () => {
        if (generando) {
            return;
        }

        setGenerando(true);

        void motor.post('/api/v1/analitica/ejecutar', {
            onSuccess: (respuesta) => {
                const data = (
                    respuesta as {
                        data?: {
                            parametros?: number;
                            pronosticos?: number;
                            alertas?: number;
                        };
                    }
                )?.data;

                notify.success(
                    data
                        ? `Analítica regenerada: ${data.parametros ?? 0} parámetros, ${data.pronosticos ?? 0} pronósticos y ${data.alertas ?? 0} alertas.`
                        : 'Analítica regenerada correctamente.',
                );

                refrescarProps(
                    'parametrosDb',
                    'pronosticosDb',
                    'alertasDb',
                    'ejecucionesDb',
                    'resumen',
                    'serieAnalitica',
                    'cuotaRuteo',
                );
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo regenerar la analítica.',
                );
            },
            onFinish: () => setGenerando(false),
        });
    };

    const columnasParametros: Column<(typeof parametros)[number]>[] = [
        {
            key: 'material',
            header: 'Material',
            cell: (fila) => (
                <span className="block max-w-56">
                    <span className="text-ink block font-semibold">
                        {fila.material?.nombre ?? `#${fila.material_id}`}
                    </span>
                    <span className="text-muted block font-mono text-xs">
                        {fila.material?.codigo} · {fila.almacen?.nombre}
                    </span>
                </span>
            ),
        },
        {
            key: 'clase',
            header: 'Clase',
            align: 'center',
            cell: (fila) => (
                <Badge tone={fila.clase_abc === 'A' ? 'ok' : 'neutral'}>
                    {fila.clase_combinada}
                </Badge>
            ),
        },
        {
            key: 'eoq',
            header: 'EOQ',
            align: 'right',
            mono: true,
            cell: (fila) => formatearNumero(fila.eoq),
        },
        {
            key: 'rop',
            header: 'ROP',
            align: 'right',
            mono: true,
            cell: (fila) => formatearNumero(fila.punto_reorden),
        },
        {
            key: 'ss',
            header: 'Stock seguridad',
            align: 'right',
            mono: true,
            cell: (fila) => formatearNumero(fila.stock_seguridad),
        },
        {
            key: 'lead',
            header: 'Lead time',
            align: 'right',
            mono: true,
            cell: (fila) =>
                fila.lead_time_dias !== null
                    ? `${Number(fila.lead_time_dias).toFixed(1)} d`
                    : '—',
        },
        {
            key: 'estado',
            header: 'Estado',
            align: 'center',
            cell: (fila) => (
                <Badge
                    tone={
                        fila.estado === 'calculado'
                            ? 'ok'
                            : fila.estado === 'sin_demanda'
                              ? 'neutral'
                              : 'warn'
                    }
                >
                    {fila.estado.replaceAll('_', ' ')}
                </Badge>
            ),
        },
    ];

    const columnasPronosticos: Column<(typeof pronosticos)[number]>[] = [
        {
            key: 'fecha',
            header: 'Fecha',
            cell: (fila) => formatFecha(fila.fecha),
        },
        {
            key: 'material',
            header: 'Material',
            cell: (fila) => (
                <span className="block max-w-56">
                    <span className="text-ink block font-semibold">
                        {fila.material?.nombre ?? '—'}
                    </span>
                    <span className="text-muted block font-mono text-xs">
                        {fila.almacen?.nombre}
                    </span>
                </span>
            ),
        },
        {
            key: 'cantidad',
            header: 'Pronóstico',
            align: 'right',
            mono: true,
            cell: (fila) => formatearNumero(fila.cantidad),
        },
        {
            key: 'banda',
            header: 'Banda',
            align: 'right',
            mono: true,
            cell: (fila) =>
                `${formatearNumero(fila.limite_inferior)} – ${formatearNumero(
                    fila.limite_superior,
                )}`,
        },
        {
            key: 'mape',
            header: 'MAPE',
            align: 'right',
            mono: true,
            cell: (fila) =>
                fila.mape !== null ? `${Number(fila.mape).toFixed(1)}%` : '—',
        },
        {
            key: 'metodo',
            header: 'Método',
            cell: (fila) => (
                <Badge tone={fila.baja_confianza ? 'warn' : 'neutral'}>
                    {fila.metodo_usado.replaceAll('_', ' ')}
                </Badge>
            ),
        },
    ];

    const columnasAlertas: Column<(typeof alertas)[number]>[] = [
        {
            key: 'severidad',
            header: 'Severidad',
            align: 'center',
            cell: (fila) => (
                <Badge tone={tonoSeveridad(fila.severidad)}>
                    {fila.severidad}
                </Badge>
            ),
        },
        {
            key: 'tipo',
            header: 'Tipo',
            cell: (fila) => fila.tipo.replaceAll('_', ' '),
        },
        {
            key: 'material',
            header: 'Material / almacén',
            cell: (fila) => (
                <span className="block max-w-64">
                    <span className="text-ink block font-semibold">
                        {fila.material?.nombre ?? '—'}
                    </span>
                    <span className="text-muted block text-xs">
                        {fila.almacen?.nombre}
                    </span>
                </span>
            ),
        },
        {
            key: 'fecha',
            header: 'Fecha estimada',
            cell: (fila) =>
                fila.fecha_estimada ? formatFecha(fila.fecha_estimada) : '—',
        },
        {
            key: 'accion',
            header: 'Acción',
            align: 'center',
            cell: (fila) => (
                <Button
                    variant="outline"
                    onClick={() => reconocerAlerta(fila.id)}
                    disabled={reconociendo === Number(fila.id)}
                >
                    {reconociendo === Number(fila.id)
                        ? 'Reconociendo…'
                        : 'Reconocer'}
                </Button>
            ),
        },
    ];

    const columnasEjecuciones: Column<(typeof ejecuciones)[number]>[] = [
        {
            key: 'inicio',
            header: 'Inicio',
            cell: (fila) => formatFecha(fila.inicio),
        },
        {
            key: 'estado',
            header: 'Estado',
            align: 'center',
            cell: (fila) => (
                <Badge tone={fila.estado === 'completada' ? 'ok' : 'danger'}>
                    {fila.estado}
                </Badge>
            ),
        },
        {
            key: 'series',
            header: 'Series',
            align: 'right',
            mono: true,
        },
        {
            key: 'calculadas',
            header: 'Parámetros',
            align: 'right',
            mono: true,
        },
        {
            key: 'alertas',
            header: 'Alertas',
            align: 'right',
            mono: true,
        },
        {
            key: 'duracion',
            header: 'Duración',
            align: 'right',
            mono: true,
            cell: (fila) =>
                fila.duracion_ms !== null
                    ? `${(fila.duracion_ms / 1000).toFixed(1)} s`
                    : '—',
        },
    ];

    const sinEjecuciones = resumen.ultima_ejecucion === null;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analítica Predictiva"
                subtitle="EOQ, punto de reorden, stock de seguridad, pronóstico y alertas tempranas"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="primary"
                            onClick={regenerarAnalitica}
                            disabled={generando}
                        >
                            {generando
                                ? 'Generando analítica…'
                                : 'Regenerar analítica'}
                        </Button>
                        <Button variant="mint" onClick={exportarCsv}>
                            Exportar parámetros
                        </Button>
                    </div>
                }
            />

            <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-muted font-mono text-[10px] uppercase">
                            Cuota de ruteo ORS · hoy
                        </p>
                        <p className="text-ink mt-1 font-mono text-2xl font-bold">
                            {cuota.usadas}
                            <span className="text-muted ml-1 text-sm font-normal">
                                / {cuota.limite} llamadas
                            </span>
                        </p>
                        <p className="text-muted text-xs">
                            Restantes: {cuota.restantes} · Geocodificaciones:{' '}
                            {cuota.geocodificaciones} · Fallos: {cuota.fallos}
                        </p>
                    </div>
                    <div className="text-right">
                        <Badge tone={tonoCuota}>{cuota.porcentaje}% usado</Badge>
                        <p className="text-muted mt-1 text-[10px]">
                            Actualizado{' '}
                            {new Date(cuota.actualizado_en).toLocaleTimeString(
                                'es-PE',
                            )}
                        </p>
                    </div>
                </div>

                <div className="bg-soft mt-3 h-2 w-full overflow-hidden rounded-full">
                    <div
                        className={`h-full rounded-full transition-all ${barraCuota}`}
                        style={{
                            width: `${Math.min(cuota.porcentaje, 100)}%`,
                        }}
                    />
                </div>

                {cuotaRuteoSemana.length > 0 && (
                    <div className="mt-3">
                        <p className="text-muted font-mono text-[10px] uppercase">
                            Últimos 7 días
                        </p>
                        <div className="mt-1 flex items-end gap-1">
                            {cuotaRuteoSemana.map((dia) => (
                                <div
                                    key={dia.fecha}
                                    className="flex-1"
                                    title={`${dia.fecha}: ${dia.llamadas} llamadas`}
                                >
                                    <div
                                        className="bg-brand-200 rounded-t"
                                        style={{
                                            height: `${Math.max(
                                                (dia.llamadas / maximoSemana) *
                                                    32,
                                                2,
                                            )}px`,
                                        }}
                                    />
                                    <p className="text-muted mt-0.5 text-center text-[9px]">
                                        {dia.fecha.slice(8)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {sinEjecuciones ? (
                <Card className="p-5">
                    <EmptyState
                        title="Aún no hay ejecuciones del motor"
                        hint="Ejecuta `php artisan analitica:ejecutar` o espera la corrida nocturna para ver resultados."
                    />
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiTile
                            label="Parámetros vigentes"
                            value={resumen.parametros_vigentes}
                            detalle="Pares almacén-material calculados"
                        />
                        <KpiTile
                            label="Quiebres a 7 días"
                            value={resumen.quiebres_7d}
                            variante="dark"
                            detalle="Proyección del motor"
                        />
                        <KpiTile
                            label="Alertas críticas"
                            value={resumen.alertas_criticas}
                            detalle={`${resumen.alertas_vigentes} alertas vigentes`}
                        />
                        <KpiTile
                            label="EOQ promedio clase A"
                            value={
                                resumen.eoq_promedio_a !== null
                                    ? Number(resumen.eoq_promedio_a)
                                    : null
                            }
                            variante="brand"
                            detalle="Cantidad económica de pedido"
                        />
                    </div>

                    <Card className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                {(
                                    [
                                        ['resumen', 'Resumen'],
                                        ['parametros', 'Parámetros'],
                                        ['pronosticos', 'Pronóstico'],
                                        ['alertas', 'Alertas'],
                                        ['ejecuciones', 'Ejecuciones'],
                                    ] as [Pestana, string][]
                                ).map(([clave, etiqueta]) => (
                                    <Button
                                        key={clave}
                                        variant={
                                            pestana === clave
                                                ? 'primary'
                                                : 'outline'
                                        }
                                        onClick={() => setPestana(clave)}
                                    >
                                        {etiqueta}
                                    </Button>
                                ))}
                            </div>
                            {pestana === 'parametros' && (
                                <input
                                    value={busqueda}
                                    onChange={(event) =>
                                        setBusqueda(event.target.value)
                                    }
                                    placeholder="Buscar material o almacén…"
                                    className="border-line bg-canvas text-ink focus:ring-brand-500 w-full rounded-lg border px-3 py-1.5 text-xs focus:ring-2 focus:outline-none sm:w-64"
                                />
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        {pestana === 'resumen' && (
                            <AnaliticaResumen
                                serieAnalitica={serieAnalitica}
                                parametrosDb={parametrosDb}
                                alertasDb={alertasDb}
                                ejecucionesDb={ejecucionesDb}
                                resumen={resumen}
                            />
                        )}
                        {pestana === 'parametros' && (
                            <DataTable
                                columns={columnasParametros}
                                rows={parametros}
                                emptyLabel="Sin parámetros calculados."
                            />
                        )}
                        {pestana === 'pronosticos' && (
                            <div className="space-y-5">
                                <div className="border-line rounded-xl border p-4">
                                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                        <div>
                                            <h3 className="text-ink text-sm font-bold">
                                                Demanda y pronóstico
                                            </h3>
                                            <p className="text-muted text-xs">
                                                30 días de demanda real y 30
                                                días proyectados
                                            </p>
                                        </div>
                                        <div className="text-muted flex gap-4 font-mono text-[11px]">
                                            <span>
                                                MAPE:{' '}
                                                {serieAnalitica.mape ?? '—'}%
                                            </span>
                                            <span>
                                                Cobertura:{' '}
                                                {serieAnalitica.cobertura_dias ??
                                                    '—'}{' '}
                                                días
                                            </span>
                                        </div>
                                    </div>

                                    <AnaliticaChart
                                        serie={serieAnalitica.serie}
                                    />
                                </div>

                                <DataTable
                                    columns={columnasPronosticos}
                                    rows={pronosticos}
                                    emptyLabel="Sin pronósticos en los próximos días."
                                />
                            </div>
                        )}
                        {pestana === 'alertas' && (
                            <DataTable
                                columns={columnasAlertas}
                                rows={alertas}
                                emptyLabel="No hay alertas vigentes."
                            />
                        )}
                        {pestana === 'ejecuciones' && (
                            <DataTable
                                columns={columnasEjecuciones}
                                rows={ejecuciones}
                                emptyLabel="Sin ejecuciones registradas."
                            />
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
