// Mapa Operativo: una sola vista de obras, almacenes, rutas, geocercas,
// posiciones de despachos y alertas geoespaciales. Datos reales desde Inertia.

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, SubmitButton } from '../components/form';
import { KpiTile } from '../design-system/KpiTile';
import {
    MapaLeaflet,
    type RutaMapa,
    type SugerenciaMapa,
} from '../components/MapaLeaflet';
import {
    IconAlertTriangle,
    IconArrowRight,
    IconMapPin,
    IconRadar,
    IconRefresh,
    IconTruck,
} from '../components/icons';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { refrescarProps } from '../utils/refrescar';
import { cabecerasJson, encolarEvento } from '../utils/offlineQueue';
import { formatCantidad, formatFechaHora } from '../utils/format';
import { cn } from '../utils/cn';
import type { Almacen, Material, Obra } from '../types';
import type { StockState } from '../types/stock';

interface DespachoDb {
    id: number;
    codigo: string | null;
    transferenciaId: number;
    etaMin: number | string | null;
    etaRestanteMin?: number | string | null;
    distanciaM: number | string | null;
    ultimaPosicion: {
        latitud: number | string;
        longitud: number | string;
        velocidad_kmh: number | string | null;
        capturada_en: string;
    } | null;
}

interface AlertaGeoDb {
    id: number;
    tipo: string;
    severidad: string;
    distancia_m: number | string | null;
    tiempo_min: number | string | null;
    detalle: string;
    despacho?: { transferencia?: { codigo: string } };
}

interface CalorDb {
    lat: number;
    lng: number;
    peso: number;
}

interface SugerenciaDireccion {
    etiqueta: string;
    lat: number;
    lng: number;
    precision: number | null;
}

interface CuotaRuteoDb {
    usadas: number;
    limite: number;
    porcentaje: number;
    restantes: number;
}

type AlmacenMapa = Almacen & {
    radioGeocercaM: number;
    codigo?: string;
    activo?: boolean;
};

interface SugerenciaRedistribucion {
    material_id: number;
    material: string | null;
    codigo: string | null;
    unidad: string;
    categoria: string | null;
    origen_id: number;
    origen: string;
    origen_stock: number;
    origen_rop: number;
    destino_id: number;
    destino: string;
    destino_stock: number;
    destino_rop: number;
    cantidad: number;
    prioridad: 'alta' | 'media' | string;
    distancia_km: number | null;
    eta_min: number | null;
    geometria: Array<{ lat: number; lng: number }>;
    url: string;
}

interface MapaOperativoProps {
    obrasDb: Obra[];
    almacenesDb: AlmacenMapa[];
    materialesDb: Material[];
    stock: StockState;
    rutasDb: RutaMapa[];
    sugerenciasDb?: SugerenciaRedistribucion[];
    despachosDb: DespachoDb[];
    alertasGeoDb: AlertaGeoDb[];
    calorDb: CalorDb[];
    cuotaRuteo: CuotaRuteoDb;
}

interface PosicionDetalle {
    id: number;
    latitud: number | string;
    longitud: number | string;
    velocidad_kmh: number | string | null;
    capturada_en: string;
}

const tonoSeveridad = (severidad: string) => {
    if (severidad === 'critica') return 'danger' as const;
    if (severidad === 'alta') return 'warn' as const;

    return 'neutral' as const;
};

const formatearDetalleAlerta = (detalle: string): string =>
    detalle.replace(/(\d+)\.\d+\s+minutos/g, '$1 minutos');

const formatoEta = (minutos: number | null): string => {
    if (minutos === null) {
        return 's/ETA';
    }

    if (minutos >= 120) {
        const horas = Math.floor(minutos / 60);
        const resto = Math.round(minutos % 60);

        return `${horas}h ${resto}m`;
    }

    return `${Math.round(minutos)} min`;
};

export default function MapaOperativoPage({
    obrasDb,
    almacenesDb,
    materialesDb,
    stock,
    rutasDb,
    sugerenciasDb = [],
    despachosDb,
    alertasGeoDb,
    calorDb,
    cuotaRuteo,
}: MapaOperativoProps) {
    const notify = useNotifications();
    const page = usePage().props as unknown as {
        auth?: { user?: { permisos?: string[] } };
    };
    const puedeEditar = (page.auth?.user?.permisos ?? []).includes(
        'mapa.editar',
    );

    const [obraFiltro, setObraFiltro] = useState('');
    const [capas, setCapas] = useState({
        geocercas: true,
        calor: false,
        posiciones: true,
    });
    const [despachoDetalle, setDespachoDetalle] = useState<DespachoDb | null>(
        null,
    );
    const [posiciones, setPosiciones] = useState<PosicionDetalle[]>([]);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [almacenGeocerca, setAlmacenGeocerca] =
        useState<AlmacenMapa | null>(null);
    const [radio, setRadio] = useState('150');
    const [direccion, setDireccion] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        null,
    );
    const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([]);
    const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
    const omitirSugerencias = useRef(false);
    const [centrarEn, setCentrarEn] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const [sugerenciasRedistribucion, setSugerenciasRedistribucion] =
        useState<SugerenciaRedistribucion[]>(sugerenciasDb);
    const [redistribucionAbierta, setRedistribucionAbierta] = useState(false);
    const [redistribucionTitulo, setRedistribucionTitulo] = useState(
        'Redistribución sugerida',
    );
    const [cargandoRedistribucion, setCargandoRedistribucion] =
        useState(false);
    const [sugerenciaSeleccionada, setSugerenciaSeleccionada] =
        useState<SugerenciaRedistribucion | null>(null);

    const http = useHttp({ direccion: '', radio: '' });

    const cargarRedistribucion = useCallback(
        async (detalle?: { obraId?: string; almacenId?: string }) => {
            setRedistribucionAbierta(true);
            setCargandoRedistribucion(true);
            setSugerenciaSeleccionada(null);

            const params = new URLSearchParams({ limite: '12' });

            if (detalle?.almacenId) {
                params.set('almacen_id', detalle.almacenId);
            } else if (detalle?.obraId) {
                params.set('obra_id', detalle.obraId);
            }

            setRedistribucionTitulo(
                detalle?.almacenId
                    ? 'Redistribución desde este almacén'
                    : detalle?.obraId
                      ? 'Redistribución del frente activo'
                      : 'Redistribución sugerida · red completa',
            );

            try {
                const respuesta = await fetch(
                    `/api/v1/analitica/redistribucion?${params.toString()}`,
                    { headers: { Accept: 'application/json' } },
                );

                if (!respuesta.ok) {
                    throw new Error('No se pudo cargar la redistribución.');
                }

                const cuerpo = (await respuesta.json()) as {
                    data?: SugerenciaRedistribucion[];
                };
                setSugerenciasRedistribucion(cuerpo.data ?? []);
            } catch {
                notify.error(
                    'No se pudo calcular la redistribución analítica.',
                );
            } finally {
                setCargandoRedistribucion(false);
            }
        },
        [notify],
    );

    useEffect(() => {
        const alCalcular = (evento: Event) => {
            const detalle = (
                evento as CustomEvent<{
                    obraId?: string;
                    almacenId?: string;
                }>
            ).detail;

            void cargarRedistribucion(detalle);
        };

        const alFijarFrente = (evento: Event) => {
            const detalle = (
                evento as CustomEvent<{ obraId?: string }>
            ).detail;

            if (!detalle?.obraId) {
                return;
            }

            setObraFiltro(detalle.obraId);
            const obra = obrasDb.find(
                (item) => String(item.id) === detalle.obraId,
            );
            notify.success(
                `Frente activo: ${obra?.nombre ?? detalle.obraId}`,
            );
        };

        window.addEventListener('cpm:calcular-redistribucion', alCalcular);
        window.addEventListener('cpm:set-obra-activa', alFijarFrente);

        return () => {
            window.removeEventListener(
                'cpm:calcular-redistribucion',
                alCalcular,
            );
            window.removeEventListener('cpm:set-obra-activa', alFijarFrente);
        };
    }, [cargarRedistribucion, notify, obrasDb]);

    const sugerenciasMapa: SugerenciaMapa[] = useMemo(
        () =>
            sugerenciasRedistribucion.map((sugerencia) => ({
                origenId: String(sugerencia.origen_id),
                destinoId: String(sugerencia.destino_id),
                material: sugerencia.material,
                cantidad: sugerencia.cantidad,
                unidad: sugerencia.unidad,
                prioridad: sugerencia.prioridad,
                distanciaKm: sugerencia.distancia_km,
                etaMin: sugerencia.eta_min,
                geometria: sugerencia.geometria,
            })),
        [sugerenciasRedistribucion],
    );

    const abrirSugerencia = (sugerencia: SugerenciaMapa) => {
        const completa = sugerenciasRedistribucion.find(
            (item) =>
                String(item.origen_id) === sugerencia.origenId &&
                String(item.destino_id) === sugerencia.destinoId &&
                item.material === sugerencia.material,
        );

        setSugerenciaSeleccionada(completa ?? null);
        setRedistribucionAbierta(true);

        if (!completa) {
            void cargarRedistribucion();
        }
    };

    useEffect(() => {
        if (omitirSugerencias.current) {
            omitirSugerencias.current = false;
            setSugerencias([]);
            setCargandoSugerencias(false);

            return;
        }

        const texto = direccion.trim();

        if (texto.length < 2) {
            setSugerencias([]);
            setCargandoSugerencias(false);

            return;
        }

        setCargandoSugerencias(true);
        const temporizador = window.setTimeout(() => {
            void fetch(
                `/api/v1/geo/sugerencias?q=${encodeURIComponent(texto)}`,
                { headers: { Accept: 'application/json' } },
            )
                .then((respuesta) =>
                    respuesta.ok ? respuesta.json() : null,
                )
                .then((cuerpo) => {
                    const datos = (
                        cuerpo as { data?: SugerenciaDireccion[] }
                    )?.data;
                    setSugerencias(datos ?? []);
                })
                .catch(() => setSugerencias([]))
                .finally(() => setCargandoSugerencias(false));
        }, 350);

        return () => window.clearTimeout(temporizador);
    }, [direccion]);

    const almacenes = useMemo(
        () =>
            obraFiltro === ''
                ? almacenesDb
                : almacenesDb.filter(
                      (almacen) => almacen.obraId === obraFiltro,
                  ),
        [almacenesDb, obraFiltro],
    );

    const obras = useMemo(
        () =>
            obraFiltro === ''
                ? obrasDb
                : obrasDb.filter((obra) => obra.id === obraFiltro),
        [obrasDb, obraFiltro],
    );

    const geocercas = useMemo(
        () =>
            almacenes.map((almacen) => ({
                lat: almacen.coords.lat,
                lng: almacen.coords.lng,
                radioM: almacen.radioGeocercaM,
                nombre: almacen.nombre,
            })),
        [almacenes],
    );

    const posicionesMapa = useMemo(
        () =>
            despachosDb
                .filter((despacho) => despacho.ultimaPosicion !== null)
                .map((despacho) => ({
                    lat: Number(despacho.ultimaPosicion?.latitud),
                    lng: Number(despacho.ultimaPosicion?.longitud),
                    codigo: despacho.codigo ?? `Despacho #${despacho.id}`,
                    despachoId: despacho.id,
                })),
        [despachosDb],
    );

    const abrirDetalle = async (despachoId: number) => {
        const despacho = despachosDb.find((item) => item.id === despachoId);

        if (!despacho) {
            return;
        }

        setDespachoDetalle(despacho);
        setCargandoDetalle(true);

        try {
            const respuesta = await fetch(
                `/api/v1/despachos/${despachoId}/posiciones`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!respuesta.ok) {
                throw new Error('No se pudo cargar el recorrido.');
            }

            const cuerpo = (await respuesta.json()) as {
                data?: { posiciones?: PosicionDetalle[] };
            };
            setPosiciones(cuerpo.data?.posiciones ?? []);
        } catch {
            notify.error('No se pudo cargar el recorrido del despacho.');
            setPosiciones([]);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const enviarUbicacion = () => {
        if (!despachoDetalle) {
            return;
        }

        if (!('geolocation' in navigator)) {
            notify.error('Este dispositivo no tiene GPS disponible.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                const url = `/api/v1/despachos/${despachoDetalle.id}/posiciones`;
                const payload = {
                    lat: posicion.coords.latitude,
                    lng: posicion.coords.longitude,
                    precision_m: posicion.coords.accuracy,
                    velocidad_kmh: posicion.coords.speed ?? null,
                    capturada_en: new Date().toISOString(),
                    uuid: crypto.randomUUID(),
                };

                if (!navigator.onLine) {
                    void encolarEvento({ tipo: 'posicion', url, payload }).then(
                        () =>
                            notify.success(
                                'Sin conexión: la posición se enviará al recuperar señal.',
                            ),
                    );

                    return;
                }

                void fetch(url, {
                    method: 'POST',
                    headers: cabecerasJson(),
                    body: JSON.stringify(payload),
                })
                    .then(async (respuesta) => {
                        if (!respuesta.ok) {
                            throw new Error('No se pudo enviar.');
                        }

                        notify.success('Ubicación enviada.');
                        await abrirDetalle(despachoDetalle.id);
                    })
                    .catch(() => {
                        void encolarEvento({
                            tipo: 'posicion',
                            url,
                            payload,
                        }).then(() =>
                            notify.error(
                                'No se pudo enviar; la posición quedó en cola.',
                            ),
                        );
                    });
            },
            () => notify.error('No se pudo obtener la ubicación.'),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const abrirGeocerca = (almacen: AlmacenMapa) => {
        setAlmacenGeocerca(almacen);
        setRadio(String(almacen.radioGeocercaM));
        setDireccion('');
        setCoords(null);
        setSugerencias([]);
        setCentrarEn({
            lat: almacen.coords.lat,
            lng: almacen.coords.lng,
        });
    };

    const seleccionarSugerencia = (sugerencia: SugerenciaDireccion) => {
        omitirSugerencias.current = true;
        setDireccion(sugerencia.etiqueta);
        setCoords({ lat: sugerencia.lat, lng: sugerencia.lng });
        setSugerencias([]);
        setCentrarEn({ lat: sugerencia.lat, lng: sugerencia.lng });
    };

    const buscarDireccion = (event: FormEvent) => {
        event.preventDefault();

        if (!direccion.trim()) {
            notify.error('Ingresa una dirección.');
            return;
        }

        if (sugerencias.length > 0) {
            seleccionarSugerencia(sugerencias[0]);

            return;
        }

        http.transform(() => ({ direccion }));
        void http.post('/api/v1/geo/geocodificar', {
            onSuccess: (respuesta) => {
                const data = (
                    respuesta as { data?: { lat: number; lng: number } }
                )?.data;

                if (data) {
                    setCoords({ lat: data.lat, lng: data.lng });
                    setCentrarEn({ lat: data.lat, lng: data.lng });
                    notify.success('Dirección geocodificada.');
                }
            },
            onError: () =>
                notify.error('No se pudo geocodificar la dirección.'),
        });
    };

    const guardarGeocerca = () => {
        if (!almacenGeocerca) {
            return;
        }

        http.transform(() => ({
            radio_geocerca_m: Number(radio),
            ...(coords ?? {}),
        }));

        void http.patch(`/api/v1/geo/almacenes/${almacenGeocerca.id}`, {
            onSuccess: () => {
                notify.success('Geocerca actualizada.');
                setAlmacenGeocerca(null);
                refrescarProps('almacenesDb');
            },
            onError: () =>
                notify.error('No se pudo actualizar la geocerca.'),
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mapa Operativo"
                subtitle="Obras, almacenes, rutas, geocercas y tracking de despachos en tiempo real"
                actions={
                    puedeEditar ? (
                        <Button
                            variant="mint"
                            onClick={() =>
                                almacenes[0] && abrirGeocerca(almacenes[0])
                            }
                        >
                            Editar geocerca
                        </Button>
                    ) : undefined
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiTile
                    label="Despachos activos"
                    value={despachosDb.length}
                    icon={<IconTruck size={16} />}
                    detalle="En tránsito con tracking GPS"
                />
                <KpiTile
                    label="Alertas geoespaciales"
                    value={alertasGeoDb.length}
                    variante="dark"
                    icon={<IconAlertTriangle size={16} />}
                    detalle="Vigentes en el mapa"
                />
                <KpiTile
                    label="Geocercas activas"
                    value={almacenes.length}
                    icon={<IconMapPin size={16} />}
                    detalle="Almacenes monitoreados"
                />
                <KpiTile
                    label="Redistribuciones"
                    value={sugerenciasRedistribucion.length}
                    variante="brand"
                    icon={<IconRefresh size={16} />}
                    detalle="Sugeridas por analítica"
                    progreso={
                        sugerenciasRedistribucion.length > 0
                            ? Math.min(
                                  100,
                                  (sugerenciasRedistribucion.filter(
                                      (item) => item.prioridad === 'alta',
                                  ).length /
                                      sugerenciasRedistribucion.length) *
                                      100,
                              )
                            : null
                    }
                    progresoTono="warn"
                />
                <KpiTile
                    label="Puntos de calor"
                    value={calorDb.length}
                    icon={<IconRadar size={16} />}
                    detalle="Almacenes con stock crítico"
                />
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={obraFiltro}
                        onChange={(event) => setObraFiltro(event.target.value)}
                        className="border-line bg-canvas text-ink rounded-lg border px-3 py-1.5 text-xs"
                    >
                        <option value="">Todas las obras</option>
                        {obrasDb.map((obra) => (
                            <option key={obra.id} value={obra.id}>
                                {obra.nombre}
                            </option>
                        ))}
                    </select>

                    {(
                        [
                            ['geocercas', 'Geocercas'],
                            ['posiciones', 'Tracking'],
                            ['calor', 'Calor'],
                        ] as const
                    ).map(([clave, etiqueta]) => (
                        <label
                            key={clave}
                            className="text-ink flex items-center gap-1.5 text-xs"
                        >
                            <input
                                type="checkbox"
                                checked={capas[clave]}
                                onChange={(event) =>
                                    setCapas((actual) => ({
                                        ...actual,
                                        [clave]: event.target.checked,
                                    }))
                                }
                            />
                            {etiqueta}
                        </label>
                    ))}

                    <a
                        href="/analitica"
                        className="text-muted hover:text-brand-600 ml-auto font-mono text-[11px] font-semibold"
                        title="Ver detalle de cuota en Analítica"
                    >
                        Cuota ORS: {cuotaRuteo.usadas}/{cuotaRuteo.limite} (
                        {cuotaRuteo.porcentaje}%)
                    </a>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <MapaLeaflet
                        obras={obras}
                        almacenes={almacenes}
                        stock={stock}
                        materiales={materialesDb}
                        rutas={rutasDb}
                        sugerencias={sugerenciasMapa}
                        geocercas={capas.geocercas ? geocercas : []}
                        posiciones={capas.posiciones ? posicionesMapa : []}
                        calor={capas.calor ? calorDb : []}
                        centrarEn={centrarEn}
                        seleccionadaId={obraFiltro || undefined}
                        resaltarAlertaOrigenId={
                            sugerenciaSeleccionada
                                ? String(sugerenciaSeleccionada.origen_id)
                                : null
                        }
                        resaltarAlertaDestinoId={
                            sugerenciaSeleccionada
                                ? String(sugerenciaSeleccionada.destino_id)
                                : null
                        }
                        onPinClick={(obraId) =>
                            setObraFiltro((actual) =>
                                actual === obraId ? '' : obraId,
                            )
                        }
                        onDespachoClick={abrirDetalle}
                        onSugerenciaClick={abrirSugerencia}
                    />
                </div>

                <Card className="space-y-4 p-4">
                    {obraFiltro !== '' && (
                        <div className="border-brand-200 bg-brand-50 flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
                            <div>
                                <p className="text-brand-700 text-[10px] font-mono uppercase">
                                    Frente activo
                                </p>
                                <p className="text-ink text-xs font-bold">
                                    {obrasDb.find(
                                        (obra) =>
                                            String(obra.id) === obraFiltro,
                                    )?.nombre ?? obraFiltro}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setObraFiltro('')}
                                className="text-brand-600 hover:bg-brand-100 rounded-md px-2 py-1 text-xs font-semibold"
                            >
                                Quitar
                            </button>
                        </div>
                    )}

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-ink text-sm font-bold">
                                Redistribución analítica
                            </h3>
                            <button
                                type="button"
                                onClick={() => void cargarRedistribucion()}
                                className="text-brand-600 hover:text-brand-700 font-mono text-[10px] font-bold"
                            >
                                Ver todas
                            </button>
                        </div>
                        <p className="text-muted text-[10px]">
                            Excedentes de un almacén que abastecen déficits de
                            otro, según el punto de reorden calculado.
                        </p>
                        {sugerenciasRedistribucion.length === 0 ? (
                            <p className="text-muted mt-2 text-xs">
                                Sin desbalances detectados.
                            </p>
                        ) : (
                            <ul className="divide-line mt-2 divide-y">
                                {sugerenciasRedistribucion
                                    .slice(0, 3)
                                    .map((sugerencia, indice) => (
                                        <li
                                            key={`${sugerencia.material_id}-${sugerencia.origen_id}-${sugerencia.destino_id}-${indice}`}
                                            className="py-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge
                                                    tone={
                                                        sugerencia.prioridad ===
                                                        'alta'
                                                            ? 'warn'
                                                            : 'neutral'
                                                    }
                                                >
                                                    {sugerencia.prioridad}
                                                </Badge>
                                                <span className="text-muted font-mono text-[10px]">
                                                    {sugerencia.eta_min !== null
                                                        ? `ETA ${formatoEta(sugerencia.eta_min)}`
                                                        : 's/ETA'}
                                                </span>
                                            </div>
                                            <p className="text-ink mt-1 truncate text-xs font-semibold">
                                                {sugerencia.material}
                                            </p>
                                            <p className="text-muted mt-0.5 flex items-center gap-1 text-[10px]">
                                                <span className="truncate">
                                                    {sugerencia.origen}
                                                </span>
                                                <IconArrowRight size={10} />
                                                <span className="truncate">
                                                    {sugerencia.destino}
                                                </span>
                                            </p>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h3 className="text-ink text-sm font-bold">
                            Despachos en tránsito
                        </h3>
                        {despachosDb.length === 0 ? (
                            <p className="text-muted mt-2 text-xs">
                                No hay despachos activos.
                            </p>
                        ) : (
                            <ul className="divide-line mt-2 divide-y">
                                {despachosDb.map((despacho) => (
                                    <li
                                        key={despacho.id}
                                        className="flex items-center justify-between gap-2 py-2"
                                    >
                                        <span>
                                            <span className="text-ink block text-xs font-semibold">
                                                {despacho.codigo ??
                                                    `Despacho #${despacho.id}`}
                                            </span>
                                            <span className="text-muted block font-mono text-[10px]">
                                                ETA{' '}
                                                {despacho.etaRestanteMin !==
                                                    null &&
                                                despacho.etaRestanteMin !==
                                                    undefined
                                                    ? `${Math.round(
                                                          Number(
                                                              despacho.etaRestanteMin,
                                                          ),
                                                      )} min`
                                                    : despacho.etaMin !== null
                                                      ? `${Math.round(
                                                            Number(
                                                                despacho.etaMin,
                                                            ),
                                                        )} min`
                                                      : 's/E'}{' '}
                                                ·{' '}
                                                {despacho.ultimaPosicion
                                                    ?.capturada_en
                                                    ? formatFechaHora(
                                                          despacho
                                                              .ultimaPosicion
                                                              .capturada_en,
                                                      )
                                                    : 'sin señal'}
                                            </span>
                                        </span>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                abrirDetalle(despacho.id)
                                            }
                                        >
                                            Ver
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h3 className="text-ink text-sm font-bold">
                            Alertas geoespaciales
                        </h3>
                        {alertasGeoDb.length === 0 ? (
                            <p className="text-muted mt-2 text-xs">
                                Sin alertas vigentes.
                            </p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {alertasGeoDb.map((alerta) => (
                                    <li
                                        key={alerta.id}
                                        className="border-line rounded-lg border p-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge
                                                tone={tonoSeveridad(
                                                    alerta.severidad,
                                                )}
                                            >
                                                {alerta.severidad}
                                            </Badge>
                                            <span className="text-muted font-mono text-[10px]">
                                                {alerta.despacho?.transferencia
                                                    ?.codigo ?? ''}
                                            </span>
                                        </div>
                                        <p className="text-ink mt-1 text-xs">
                                            {formatearDetalleAlerta(
                                                alerta.detalle,
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Card>
            </div>

            <Modal
                open={despachoDetalle !== null}
                onClose={() => setDespachoDetalle(null)}
                title={`Recorrido · ${
                    despachoDetalle?.codigo ??
                    `Despacho #${despachoDetalle?.id ?? ''}`
                }`}
                wide
            >
                {cargandoDetalle ? (
                    <p className="text-muted text-xs">Cargando recorrido…</p>
                ) : posiciones.length === 0 ? (
                    <EmptyState
                        title="Sin tracking"
                        hint="Este despacho no tiene posiciones registradas."
                    />
                ) : (
                    <div className="max-h-96 space-y-2 overflow-auto text-xs">
                        {posiciones.map((posicion) => (
                            <div
                                key={posicion.id}
                                className="border-line flex items-center justify-between rounded border px-2 py-1.5"
                            >
                                <span className="text-muted font-mono">
                                    {formatFechaHora(posicion.capturada_en)}
                                </span>
                                <span className="text-ink font-mono">
                                    {Number(posicion.latitud).toFixed(5)},{' '}
                                    {Number(posicion.longitud).toFixed(5)}
                                </span>
                                <span className="text-muted font-mono">
                                    {posicion.velocidad_kmh !== null
                                        ? `${Number(posicion.velocidad_kmh).toFixed(0)} km/h`
                                        : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="border-line mt-4 flex justify-end border-t pt-3">
                    <Button variant="mint" onClick={enviarUbicacion}>
                        Enviar mi ubicación
                    </Button>
                </div>
            </Modal>

            <Modal
                open={redistribucionAbierta}
                onClose={() => setRedistribucionAbierta(false)}
                title={redistribucionTitulo}
                wide
            >
                <div className="space-y-3 text-xs">
                    <div className="border-line bg-soft rounded-xl border p-3">
                        <p className="text-muted text-[10px]">
                            El motor predictivo compara el stock actual con el
                            punto de reorden de cada almacén. Los excedentes se
                            proponen como origen y los déficits como destino.
                        </p>
                    </div>

                    {cargandoRedistribucion ? (
                        <p className="text-muted py-6 text-center">
                            Calculando excedentes y déficits…
                        </p>
                    ) : sugerenciasRedistribucion.length === 0 ? (
                        <EmptyState
                            title="Sin redistribuciones pendientes"
                            hint="Todos los almacenes están por encima de su punto de reorden para los materiales analizados."
                        />
                    ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                            {sugerenciasRedistribucion.map(
                                (sugerencia, indice) => (
                                    <article
                                        key={`${sugerencia.material_id}-${sugerencia.origen_id}-${sugerencia.destino_id}-${indice}`}
                                        className={cn(
                                            'border-line rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md',
                                            sugerencia.prioridad === 'alta'
                                                ? 'border-l-4 border-l-atencion'
                                                : 'border-l-4 border-l-brand-300',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-ink text-xs font-bold">
                                                    {sugerencia.material}
                                                </p>
                                                <p className="text-muted font-mono text-[10px]">
                                                    {sugerencia.codigo} ·{' '}
                                                    {sugerencia.categoria}
                                                </p>
                                            </div>
                                            <Badge
                                                tone={
                                                    sugerencia.prioridad ===
                                                    'alta'
                                                        ? 'warn'
                                                        : 'neutral'
                                                }
                                            >
                                                {sugerencia.prioridad}
                                            </Badge>
                                        </div>

                                        <div className="text-muted mt-2 flex items-center gap-1.5 text-[10px]">
                                            <span className="text-ink truncate font-semibold">
                                                {sugerencia.origen}
                                            </span>
                                            <IconArrowRight
                                                size={11}
                                                className="shrink-0"
                                            />
                                            <span className="text-ink truncate font-semibold">
                                                {sugerencia.destino}
                                            </span>
                                        </div>

                                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                                            <div className="bg-soft rounded-lg p-1.5">
                                                <p className="text-muted text-[9px] uppercase">
                                                    Enviar
                                                </p>
                                                <p className="text-ink font-mono font-bold">
                                                    {formatCantidad(
                                                        sugerencia.cantidad,
                                                        sugerencia.unidad,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="bg-soft rounded-lg p-1.5">
                                                <p className="text-muted text-[9px] uppercase">
                                                    Distancia
                                                </p>
                                                <p className="text-ink font-mono font-bold">
                                                    {sugerencia.distancia_km !==
                                                    null
                                                        ? `${sugerencia.distancia_km} km`
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div className="bg-soft rounded-lg p-1.5">
                                                <p className="text-muted text-[9px] uppercase">
                                                    ETA
                                                </p>
                                                <p className="text-ink font-mono font-bold">
                                                    {sugerencia.eta_min !== null
                                                        ? formatoEta(
                                                              sugerencia.eta_min,
                                                          )
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-muted mt-1.5 text-[10px]">
                                            Origen{' '}
                                            {formatCantidad(
                                                sugerencia.origen_stock,
                                                sugerencia.unidad,
                                            )}{' '}
                                            (ROP{' '}
                                            {formatCantidad(
                                                sugerencia.origen_rop,
                                            )}
                                            ) · Destino{' '}
                                            {formatCantidad(
                                                sugerencia.destino_stock,
                                                sugerencia.unidad,
                                            )}{' '}
                                            (ROP{' '}
                                            {formatCantidad(
                                                sugerencia.destino_rop,
                                            )}
                                            )
                                        </p>

                                        <div className="mt-2 flex gap-2">
                                            <a
                                                href={sugerencia.url}
                                                className="bg-brand-500 hover:bg-brand-600 flex-1 rounded-lg px-2 py-1.5 text-center text-[10px] font-bold text-white"
                                            >
                                                Crear transferencia
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const origen =
                                                        almacenesDb.find(
                                                            (almacen) =>
                                                                String(
                                                                    almacen.id,
                                                                ) ===
                                                                String(
                                                                    sugerencia.origen_id,
                                                                ),
                                                        );
                                                    setSugerenciaSeleccionada(
                                                        sugerencia,
                                                    );
                                                    setRedistribucionAbierta(
                                                        false,
                                                    );

                                                    if (origen) {
                                                        setCentrarEn({
                                                            lat: origen.coords
                                                                .lat,
                                                            lng: origen.coords
                                                                .lng,
                                                        });
                                                    }
                                                }}
                                                className="border-line text-ink hover:bg-soft rounded-lg border px-2 py-1.5 text-[10px] font-bold"
                                            >
                                                Ver en mapa
                                            </button>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                open={almacenGeocerca !== null}
                onClose={() => setAlmacenGeocerca(null)}
                title={`Geocerca · ${almacenGeocerca?.nombre ?? ''}`}
            >
                <div className="space-y-4 text-xs">
                    <Field label="Radio de la geocerca (m)" required>
                        <Input
                            type="number"
                            min={10}
                            max={5000}
                            value={radio}
                            onChange={(event) => setRadio(event.target.value)}
                        />
                    </Field>

                    <form onSubmit={buscarDireccion} className="space-y-2">
                        <Field label="Buscar dirección">
                            <Input
                                value={direccion}
                                onChange={(event) =>
                                    setDireccion(event.target.value)
                                }
                                placeholder="San Carlos, Huancayo"
                            />
                        </Field>

                        {(cargandoSugerencias || sugerencias.length > 0) && (
                            <div className="border-line bg-surface overflow-hidden rounded-lg border">
                                {cargandoSugerencias ? (
                                    <p className="text-muted px-3 py-2 text-xs">
                                        Buscando direcciones…
                                    </p>
                                ) : (
                                    sugerencias.map((sugerencia) => (
                                        <button
                                            key={`${sugerencia.lat}-${sugerencia.lng}-${sugerencia.etiqueta}`}
                                            type="button"
                                            onClick={() =>
                                                seleccionarSugerencia(
                                                    sugerencia,
                                                )
                                            }
                                            className="border-line text-ink hover:bg-soft block w-full border-b px-3 py-2 text-left text-xs last:border-b-0"
                                        >
                                            {sugerencia.etiqueta}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        <Button variant="outline" type="submit">
                            Geocodificar
                        </Button>
                    </form>

                    {coords && (
                        <p className="text-muted font-mono">
                            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                        </p>
                    )}

                    <div className="border-line flex justify-end gap-3 border-t pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setAlmacenGeocerca(null)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton
                            status={http.processing ? 'submitting' : 'idle'}
                            onClick={guardarGeocerca}
                        >
                            Guardar geocerca
                        </SubmitButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
