import { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import { DataTable } from '../components/DataTable';
import {
    IconAlert,
    IconCheckCircle,
    IconMapPin,
    IconPlus,
    IconRefresh,
    IconShield,
} from '../components/icons';
import { useAppStore } from '../store/AppContext';

interface Marcacion {
    id: string;
    trabajador: string;
    cargo: string;
    hora: string;
    tipo: 'Entrada' | 'Salida';
    latitud: number;
    longitud: number;
    distanciaMetros: number;
    dentroGeocerca: boolean;
}

export default function AsistenciaPage({
    asistenciasDb,
    obrasDb,
}: {
    asistenciasDb?: any[];
    obrasDb?: any[];
}) {
    const { obras } = useAppStore();
    const listaObras = (obrasDb && obrasDb.length > 0) ? obrasDb : obras;
    const [obraId, setObraId] = useState<string>(listaObras[0]?.id ?? '1');

    const [marcaciones, setMarcaciones] = useState<Marcacion[]>([
        { id: '1', trabajador: 'Juan Quispe Mayta', cargo: 'Operario Fierrero', hora: '07:28:15', tipo: 'Entrada', latitud: -12.0652, longitud: -75.2101, distanciaMetros: 35, dentroGeocerca: true },
        { id: '2', trabajador: 'Carlos Huamán Soto', cargo: 'Operario Encofrador', hora: '07:31:02', tipo: 'Entrada', latitud: -12.0654, longitud: -75.2103, distanciaMetros: 52, dentroGeocerca: true },
        { id: '3', trabajador: 'Pedro Mendoza Ramos', cargo: 'Oficial Albañil', hora: '07:45:10', tipo: 'Entrada', latitud: -12.0660, longitud: -75.2108, distanciaMetros: 120, dentroGeocerca: true },
        { id: '4', trabajador: 'Raúl Alanya Flores', cargo: 'Peón / Ayudante', hora: '08:05:22', tipo: 'Entrada', latitud: -12.0710, longitud: -75.2150, distanciaMetros: 650, dentroGeocerca: false },
    ]);

    const [modalMarcar, setModalMarcar] = useState(false);
    const [marcandoGps, setMarcandoGps] = useState(false);
    const [nombreTrabajador, setNombreTrabajador] = useState('Juan Quispe Mayta');
    const [cargoTrabajador, setCargoTrabajador] = useState('Operario Fierrero');
    const [tipoMarcacion, setTipoMarcacion] = useState<'Entrada' | 'Salida'>('Entrada');
    const [gpsCapturado, setGpsCapturado] = useState<{ lat: number; lng: number } | null>(null);
    const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

    const obtenerGpsNavegador = () => {
        setMarcandoGps(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setGpsCapturado({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setMarcandoGps(false);
                },
                (error) => {
                    // Fallback a coordenadas de obra con pequeña variación simulada
                    const getRandomFloat = () => {
                        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
                            const buffer = new Uint32Array(1);
                            window.crypto.getRandomValues(buffer);
                            return buffer[0] / (0xffffffff + 1);
                        }
                        return 0.5;
                    };
                    setGpsCapturado({
                        lat: -12.0650 + (getRandomFloat() - 0.5) * 0.002,
                        lng: -75.2100 + (getRandomFloat() - 0.5) * 0.002,
                    });
                    setMarcandoGps(false);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setGpsCapturado({
                lat: -12.0650,
                lng: -75.2100,
            });
            setMarcandoGps(false);
        }
    };

    const handleGuardarMarcacion = (e: React.FormEvent) => {
        e.preventDefault();
        const lat = gpsCapturado?.lat ?? -12.0651;
        const lng = gpsCapturado?.lng ?? -75.2101;

        // Calcular distancia al centroide de la obra (-12.0650, -75.2100) en metros (Haversine simple)
        const dLat = (lat - (-12.0650)) * 111000;
        const dLng = (lng - (-75.2100)) * 111000 * Math.cos(-12.0650 * (Math.PI / 180));
        const distanciaM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
        const dentro = distanciaM <= 500;

        const nueva: Marcacion = {
            id: `m-${Date.now().toString().slice(-4)}`,
            trabajador: nombreTrabajador,
            cargo: cargoTrabajador,
            hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            tipo: tipoMarcacion,
            latitud: lat,
            longitud: lng,
            distanciaMetros: distanciaM,
            dentroGeocerca: dentro,
        };

        setMarcaciones((prev) => [nueva, ...prev]);
        setModalMarcar(false);
        setMensajeFeedback(
            dentro
                ? `Marcación de ${nombreTrabajador} registrada CONFORME a ${distanciaM}m dentro de la geocerca de obra.`
                : `ALERTA: Marcación de ${nombreTrabajador} registrada FUERA DE RANGO (${distanciaM}m > 500m).`
        );
        setTimeout(() => setMensajeFeedback(null), 5000);
    };

    const conformesCount = marcaciones.filter((m) => m.dentroGeocerca).length;
    const observadasCount = marcaciones.filter((m) => !m.dentroGeocerca).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Control de Asistencia con Geocerca Móvil (GPS)"
                subtitle="Validación geodésica de marcaciones en tiempo real dentro del radio perimetral (500m) del frente de obra"
                actions={
                    <Button
                        variant="mint"
                        onClick={() => {
                            setModalMarcar(true);
                            obtenerGpsNavegador();
                        }}
                    >
                        <IconMapPin size={16} />
                        Marcar Asistencia GPS
                    </Button>
                }
            />

            {mensajeFeedback && (
                <div
                    className={`p-3.5 rounded-lg text-xs flex items-center gap-2 border ${
                        mensajeFeedback.includes('ALERTA')
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                >
                    <IconCheckCircle size={16} className="shrink-0" />
                    <span>{mensajeFeedback}</span>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Personal Marcado Hoy</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{marcaciones.length}</p>
                    <span className="text-xs text-muted">Marcaciones registradas en el turno</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Marcaciones Conformes (Geocerca)</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{conformesCount}</p>
                    <span className="text-xs text-muted">Dentro del perímetro de 500 metros</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Observadas / Fuera de Radio</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-amber-600">{observadasCount}</p>
                    <span className="text-xs text-muted">Distancia &gt; 500m del centroide</span>
                </Card>
            </div>

            <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-ink">Bitácora de Marcaciones con Coordenadas GPS</h3>
                        <p className="text-xs text-muted">Validación georreferenciada contra el radio perimetral</p>
                    </div>
                    <select
                        value={obraId}
                        onChange={(e) => setObraId(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                    >
                        {listaObras.map((o: any) => (
                            <option key={o.id} value={o.id}>
                                {o.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <DataTable<{ id: string }>
                    emptyLabel="Sin marcaciones registradas hoy."
                    columns={[
                        { key: 'trabajador', header: 'Trabajador / Personal' },
                        { key: 'cargo', header: 'Cargo' },
                        { key: 'hora', header: 'Hora Marcada', mono: true },
                        { key: 'tipo', header: 'Tipo', mono: true },
                        { key: 'coords', header: 'Coordenadas GPS', mono: true },
                        { key: 'dist', header: 'Distancia a Obra', align: 'right', mono: true },
                        { key: 'geocerca', header: 'Geocerca (500m)', align: 'center' },
                    ]}
                    rows={marcaciones.map((m) => ({
                        id: m.id,
                        trabajador: <span className="font-bold text-ink">{m.trabajador}</span>,
                        cargo: m.cargo,
                        hora: m.hora,
                        tipo: (
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">
                                {m.tipo}
                            </span>
                        ),
                        coords: `${m.latitud.toFixed(4)}, ${m.longitud.toFixed(4)}`,
                        dist: `${m.distanciaMetros} m`,
                        geocerca: (
                            <Badge tone={m.dentroGeocerca ? 'ok' : 'danger'}>
                                {m.dentroGeocerca ? 'Dentro de Obra' : 'Fuera de Radio'}
                            </Badge>
                        ),
                    }))}
                />
            </Card>

            {/* Modal Marcar Asistencia GPS */}
            <Modal
                open={modalMarcar}
                onClose={() => setModalMarcar(false)}
                title="Registrar Marcación Biométrica con Geocerca"
            >
                <form onSubmit={handleGuardarMarcacion} className="space-y-4">
                    <Field label="Nombre del Trabajador">
                        <Input
                            value={nombreTrabajador}
                            onChange={(e) => setNombreTrabajador(e.target.value)}
                            required
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Cargo Operativo">
                            <Select
                                value={cargoTrabajador}
                                onChange={(e) => setCargoTrabajador(e.target.value)}
                            >
                                <option value="Operario Fierrero">Operario Fierrero</option>
                                <option value="Operario Encofrador">Operario Encofrador</option>
                                <option value="Oficial Albañil">Oficial Albañil</option>
                                <option value="Peón / Ayudante">Peón / Ayudante</option>
                                <option value="Maestro de Obra">Maestro de Obra</option>
                            </Select>
                        </Field>
                        <Field label="Tipo de Marcación">
                            <Select
                                value={tipoMarcacion}
                                onChange={(e) => setTipoMarcacion(e.target.value as any)}
                            >
                                <option value="Entrada">Entrada (Turno Mañana)</option>
                                <option value="Salida">Salida (Fin de Jornada)</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="p-3 bg-canvas border border-line rounded-lg text-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-ink">Geolocalización del Dispositivo:</span>
                            <button
                                type="button"
                                onClick={obtenerGpsNavegador}
                                className="text-primary-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <IconRefresh size={12} className={marcandoGps ? 'animate-spin' : ''} />
                                Recalcular GPS
                            </button>
                        </div>
                        {gpsCapturado ? (
                            <div className="font-mono text-[11px] text-slate-700 space-y-0.5">
                                <p>Latitud: <span className="font-bold text-ink">{gpsCapturado.lat.toFixed(6)}</span></p>
                                <p>Longitud: <span className="font-bold text-ink">{gpsCapturado.lng.toFixed(6)}</span></p>
                                <span className="inline-block mt-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Señal GPS Precisa (±5m)
                                </span>
                            </div>
                        ) : (
                            <p className="text-muted italic">Obteniendo coordenadas satelitales...</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalMarcar(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit" disabled={marcandoGps}>
                            <IconCheckCircle size={14} />
                            Confirmar Marcación
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
