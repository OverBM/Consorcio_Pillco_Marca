// 10. Despacho y Rutas — lista de despachos, solicitud manual, optimizador
// geo-lógico, mapa con rutas animadas y simulación de tránsito + entrega.
// 11. Flujo end-to-end del sobrante (prefill desde alerta / aprobar traslado).

import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import { DataTable } from '../components/DataTable';
import { AlertaBanner } from '../components/AlertaBanner';
import { MapaLeaflet, type RutaMapa, type SugerenciaMapa } from '../components/MapaLeaflet';
import { useAppStore } from '../store/AppContext';
import { useSimulatedTransit } from '../hooks/useSimulatedTransit';
import { formatNum, formatKm } from '../utils/format';
import { IconCheck } from '../components/icons';
import type { Despacho, EstadoDespacho } from '../types';

const ESTADO_DESPACHO_META: Record<EstadoDespacho, { label: string; tone: 'warn' | 'ok' | 'violet' | 'neutral' }> = {
    pendiente: { label: 'Pendiente', tone: 'warn' },
    'en-transito': { label: 'En tránsito', tone: 'violet' },
    entregado: { label: 'Entregado', tone: 'ok' },
};

interface FormNuevo {
    materialId: string;
    cantidad: string;
    origenAlmacenId: string;
    destinoAlmacenId: string;
    alertaId?: string;
}

const NUEVO_VACIO: FormNuevo = { materialId: '', cantidad: '', origenAlmacenId: '', destinoAlmacenId: '' };

export default function DespachosPage() {
    const { despachos, vehiculos, usuarios, materiales, almacenes, obras, stock, alertas, createDespacho, startTransito, updateDespacho } =
        useAppStore();

    const { url } = usePage();
    const params = useMemo(() => new URLSearchParams((url.split('?')[1] ?? '')), [url]);

    const [estadoFiltro, setEstadoFiltro] = useState<EstadoDespacho | 'todos'>('todos');
    const [modalNuevo, setModalNuevo] = useState(() => params.get('crear') === 'sobrante');
    const [nuevo, setNuevo] = useState<FormNuevo>(() => formDesdeParams(params));
    const [nuevoErr, setNuevoErr] = useState<Partial<Record<'materialId' | 'cantidad' | 'origen' | 'destino', string>>>({});
    const [asignar, setAsignar] = useState<Despacho | null>(null);
    const [entrega, setEntrega] = useState<Despacho | null>(null);
    const [nuevoExito, setNuevoExito] = useState<Despacho | null>(null);
    const [resaltar, setResaltar] = useState<Despacho | null>(null);

    useEffect(() => {
        if (params.get('crear') === 'sobrante') {
            router.replace({ url: '/despachos' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Prefill de cantidad desde la alerta de sobrante (prellenado).
    useEffect(() => {
        if (nuevo.alertaId && !nuevo.cantidad) {
            const s = alertas.find((a) => a.id === nuevo.alertaId);
            if (s?.cantidad) {
                setNuevo((f) => ({ ...f, cantidad: String(s.cantidad) }));
            }
        }
    }, [nuevo.alertaId, nuevo.cantidad, alertas]);

    const sobrantes = alertas.filter((a) => a.tipo === 'sobrante');

    /* ---- 10.3 Optimizador Geo-Lógico ---- */
    const optimizador = useMemo(() => {
        const s = sobrantes[0];
        if (!s) {
            return null;
        }
        const r = s.receptoras?.[0];
        if (!r) {
            return null;
        }
        const material = materiales.find((m) => m.id === s.materialId);
        const ahorroSoles = Math.round(r.km * 48 + (s.cantidad ?? 0) * 0.9);
        return {
            alertaId: s.id,
            material,
            cantidad: s.cantidad ?? 0,
            origen: almacenes.find((a) => a.id === s.almacenId),
            destino: almacenes.find((a) => a.id === r.almacenId),
            receptora: r,
            ahorroSoles,
        };
    }, [sobrantes, materiales, almacenes]);

    /* ---- 10.4 Rutas para el mapa ---- */
    const rutas: RutaMapa[] = useMemo(
        () =>
            despachos
                .filter((d) => d.estado === 'en-transito' || d.estado === 'pendiente')
                .map((d) => ({
                    id: d.id,
                    codigo: d.codigo,
                    origenId: d.origenAlmacenId,
                    destinoId: d.destinoAlmacenId,
                    estado: d.estado,
                })),
        [despachos],
    );

    const sugerencias: SugerenciaMapa[] = useMemo(
        () => sobrantes.flatMap((s) => (s.receptoras ?? []).map((r) => ({ origenId: s.almacenId ?? '', destinoId: r.almacenId }))),
        [sobrantes],
    );

    const filas = useMemo(() => {
        const filtradas = estadoFiltro === 'todos' ? despachos : despachos.filter((d) => d.estado === estadoFiltro);
        const peso = (d: Despacho) => (d.estado === 'entregado' ? 2 : d.estado === 'en-transito' ? 1 : 0);
        return [...filtradas].sort((a, b) => peso(a) - peso(b) || b.fechaSolicitud.localeCompare(a.fechaSolicitud));
    }, [despachos, estadoFiltro]);

    const alias = {
        materialNombre: (id: string) => materiales.find((m) => m.id === id)?.nombre ?? id,
        almacenNombre: (id: string) => almacenes.find((a) => a.id === id)?.nombre ?? id,
        placaDe: (d: Despacho) => vehiculos.find((v) => v.id === d.vehiculoId)?.placa ?? '—',
    };

    const abrirNuevo = () => {
        setNuevo(NUEVO_VACIO);
        setNuevoErr({});
        setModalNuevo(true);
    };

    const enviarNuevo = () => {
        const cant = Number(nuevo.cantidad);
        const err: typeof nuevoErr = {};
        if (!nuevo.materialId) {
            err.materialId = 'Selecciona el material.';
        }
        if (!cant || cant <= 0) {
            err.cantidad = 'Cantidad inválida.';
        }
        if (!nuevo.origenAlmacenId) {
            err.origen = 'Selecciona el origen.';
        }
        if (!nuevo.destinoAlmacenId) {
            err.destino = 'Selecciona el destino.';
        }
        if (nuevo.origenAlmacenId === nuevo.destinoAlmacenId) {
            err.destino = 'Origen y destino deben diferir.';
        }
        const disponible = stock.stock[nuevo.origenAlmacenId]?.[nuevo.materialId] ?? 0;
        if (cant > disponible) {
            err.cantidad = `No hay stock suficiente (disponible: ${formatNum(disponible)}).`;
        }
        setNuevoErr(err);
        if (Object.keys(err).length > 0) {
            return;
        }
        const creado = createDespacho({
            materialId: nuevo.materialId,
            cantidad: cant,
            origenAlmacenId: nuevo.origenAlmacenId,
            destinoAlmacenId: nuevo.destinoAlmacenId,
            alertaId: nuevo.alertaId,
        });
        setNuevoExito(creado);
        setModalNuevo(false);
        setNuevo(NUEVO_VACIO);
    };

    const aprobarTraslado = () => {
        if (!optimizador || !optimizador.origen || !optimizador.destino || !optimizador.material || optimizador.cantidad <= 0) {
            return;
        }
        const yaExiste = despachos.some(
            (d) =>
                (d.alertaId === optimizador.alertaId ||
                    (d.origenAlmacenId === optimizador.origen?.id &&
                        d.destinoAlmacenId === optimizador.destino?.id &&
                        d.materialId === optimizador.material?.id)) &&
                d.estado !== 'entregado',
        );
        if (yaExiste) {
            return;
        }
        const creado = createDespacho({
            materialId: optimizador.material.id,
            cantidad: optimizador.cantidad,
            origenAlmacenId: optimizador.origen.id,
            destinoAlmacenId: optimizador.destino.id,
            alertaId: optimizador.alertaId,
        });
        setNuevoExito(creado);
    };

    const vehiculosDisponibles = vehiculos.filter((v) => v.estado === 'disponible' || v.estado === 'en-transito');
    const [responsableSel, setResponsableSel] = useState('');
    const [vehiculoSel, setVehiculoSel] = useState('');

    const abrirAsignacion = (d: Despacho) => {
        setAsignar(d);
        setVehiculoSel(d.vehiculoId ?? vehiculos.find((v) => v.estado === 'disponible')?.id ?? '');
        setResponsableSel(d.responsable ?? usuarios.find((u) => u.rol === 'coordinador-logistico')?.nombre ?? '');
    };

    const iniciarTransito = () => {
        if (!asignar || !vehiculoSel || !responsableSel) {
            return;
        }
        startTransito(asignar.id, vehiculoSel, responsableSel);
        setAsignar(null);
    };

    const destinoDe = (d: Despacho) => almacenes.find((a) => a.id === d.destinoAlmacenId);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Despacho y Rutas"
                subtitle="Logística inter-obras del consorcio"
                actions={
                    <button className="btn-primary" onClick={abrirNuevo}>
                        + Nuevo despacho
                    </button>
                }
            />

            {/* 10.3 Optimizador Geo-Lógico Inter-Obras */}
            {optimizador ? (() => {
                const despachoExistente = despachos.find(
                    (d) =>
                        (d.alertaId === optimizador.alertaId ||
                            (d.origenAlmacenId === optimizador.origen?.id &&
                                d.destinoAlmacenId === optimizador.destino?.id &&
                                d.materialId === optimizador.material?.id)) &&
                        d.estado !== 'entregado',
                );

                return (
                    <AlertaBanner
                        kind="sobrante"
                        title="Optimizador Geo-Lógico Inter-Obras"
                        mensaje={
                            <span>
                                Traslada <strong>{formatNum(optimizador.cantidad)}</strong> {optimizador.material?.unidad ?? ''} de{' '}
                                <strong>{optimizador.material?.nombre ?? 'material'}</strong> desde{' '}
                                <strong>{optimizador.origen?.nombre ?? '—'}</strong> hacia{' '}
                                <strong>{optimizador.receptora.nombreObra}</strong> ({formatKm(optimizador.receptora.km)}). Ahorro estimado:{' '}
                                <strong>S/ {formatNum(optimizador.ahorroSoles)}</strong> en fletes y compra evitada.
                            </span>
                        }
                        actions={
                            <>
                                {despachoExistente ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-900">
                                        <IconCheck size={14} className="text-violet-700" />
                                        <span>Traslado en curso ({despachoExistente.codigo} · {despachoExistente.estado})</span>
                                    </span>
                                ) : (
                                    <button className="btn-primary" onClick={aprobarTraslado}>
                                        Aprobar Traslado
                                    </button>
                                )}
                                <button
                                    className="btn-secondary"
                                    onClick={() => document.getElementById('mapa-rutas')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    Ver en mapa
                                </button>
                            </>
                        }
                    />
                );
            })() : (
                <p className="hint">Sin sobrantes por cierre activos — el optimizador geo-lógico no tiene recomendaciones.</p>
            )}


            {/* Lista */}
            <Card title={`Despachos (${filas.length})`}>
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {(['todos', 'pendiente', 'en-transito', 'entregado'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setEstadoFiltro(f)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                estadoFiltro === f ? 'bg-brand-500 text-white' : 'bg-soft text-muted hover:text-ink'
                            }`}
                        >
                            {f === 'todos' ? 'Todos' : ESTADO_DESPACHO_META[f].label}
                        </button>
                    ))}
                </div>
                <DataTable<Despacho>
                    onRowClick={(d) => setResaltar(d)}
                    columns={[
                        { key: 'codigo', header: 'Código', mono: true, cell: (d) => <span className="font-semibold text-ink">{d.codigo}</span> },
                        { key: 'material', header: 'Material', cell: (d) => alias.materialNombre(d.materialId) },
                        { key: 'cantidad', header: 'Cant.', align: 'right', mono: true, cell: (d) => formatNum(d.cantidad) },
                        {
                            key: 'ruta',
                            header: 'Origen → Destino',
                            cell: (d) => (
                                <span className="block max-w-56">
                                    <span className="block truncate text-[11px] text-muted">{alias.almacenNombre(d.origenAlmacenId)}</span>
                                    <span className="block text-sm font-medium text-ink">→ {alias.almacenNombre(d.destinoAlmacenId)}</span>
                                </span>
                            ),
                        },
                        {
                            key: 'vehiculo',
                            header: 'Vehículo / Resp.',
                            cell: (d) => (
                                <span className="block">
                                    <span className="block text-xs font-medium text-ink">{alias.placaDe(d)}</span>
                                    <span className="block text-[11px] text-muted">{d.responsable ?? 'Sin asignar'}</span>
                                </span>
                            ),
                        },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (d) => <Badge tone={ESTADO_DESPACHO_META[d.estado].tone}>{ESTADO_DESPACHO_META[d.estado].label}</Badge>,
                        },
                        {
                            key: 'progreso',
                            header: 'Progreso',
                            cell: (d) => <TransitPill despacho={d} />,
                        },
                        {
                            key: 'acciones',
                            header: '',
                            align: 'right',
                            cell: (d) => (
                                <span className="flex justify-end gap-1.5">
                                    {d.estado === 'pendiente' && (
                                        <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => abrirAsignacion(d)}>
                                            Iniciar tránsito
                                        </button>
                                    )}
                                    {d.estado === 'en-transito' && (
                                        <button className="btn-success !px-3 !py-1.5 text-xs" onClick={() => setEntrega(d)}>
                                            Entregar
                                        </button>
                                    )}
                                </span>
                            ),
                        },
                    ]}
                    rows={filas}
                />
            </Card>

            {/* 10.4 Mapa de rutas */}
            <Card title="Rutas inter-obras" subtitle="OpenStreetMap • Rutas de transporte y redistribución" className="scroll-mt-20" id="mapa-rutas">
                <MapaLeaflet
                    obras={obras}
                    almacenes={almacenes}
                    stock={stock}
                    materiales={materiales}
                    rutas={rutas}
                    sugerencias={sugerencias}
                    seleccionadaId={resaltar ? almacenes.find((a) => a.id === resaltar.destinoAlmacenId)?.obraId : undefined}
                />
            </Card>


            {/* Modal: nuevo despacho (manual o prefill sobrante) */}
            <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title={nuevo.alertaId ? 'Despacho desde sobrante (prellenado)' : 'Nuevo despacho'}>
                {nuevo.alertaId && (
                    <p className="mb-3 rounded-xl bg-sobrante-soft/70 p-3 text-xs text-violet-800">
                        Simulación prellenada desde la alerta de sobrante con la receptora más cercana. Revisa y confirma.
                    </p>
                )}
                <div className="space-y-4">
                    <Field label="Material" required error={nuevoErr.materialId}>
                        <Select value={nuevo.materialId} onChange={(e) => setNuevo((f) => ({ ...f, materialId: e.target.value }))} invalid={!!nuevoErr.materialId}>
                            <option value="">Elegir…</option>
                            {materiales.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Cantidad" required error={nuevoErr.cantidad}>
                            <Input type="number" min={1} value={nuevo.cantidad} onChange={(e) => setNuevo((f) => ({ ...f, cantidad: e.target.value }))} invalid={!!nuevoErr.cantidad} />
                        </Field>
                        <Field label="Origen" required error={nuevoErr.origen}>
                            <Select value={nuevo.origenAlmacenId} onChange={(e) => setNuevo((f) => ({ ...f, origenAlmacenId: e.target.value }))} invalid={!!nuevoErr.origen}>
                                <option value="">Elegir…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                    <Field label="Destino" required error={nuevoErr.destino}>
                        <Select value={nuevo.destinoAlmacenId} onChange={(e) => setNuevo((f) => ({ ...f, destinoAlmacenId: e.target.value }))} invalid={!!nuevoErr.destino}>
                            <option value="">Elegir…</option>
                            {almacenes.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="flex justify-end gap-2">
                        <button className="btn-secondary" onClick={() => setModalNuevo(false)}>
                            Cancelar
                        </button>
                        <button className="btn-primary" onClick={enviarNuevo}>
                            Crear despacho
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal: asignar vehículo/responsable (inicio de tránsito) */}
            <Modal open={!!asignar} onClose={() => setAsignar(null)} title={`Iniciar tránsito — ${asignar?.codigo ?? ''}`}>
                {asignar && (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-soft/60 p-3 text-sm">
                            {alias.materialNombre(asignar.materialId)} × {formatNum(asignar.cantidad)} — {alias.almacenNombre(asignar.origenAlmacenId)} →{' '}
                            {alias.almacenNombre(asignar.destinoAlmacenId)}
                        </div>
                        <Field label="Vehículo" required>
                            <Select value={vehiculoSel} onChange={(e) => setVehiculoSel(e.target.value)}>
                                {vehiculosDisponibles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.placa} · {v.marca} {v.modelo} ({formatNum(v.capacidadKg / 1000)} t)
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Responsable" required>
                            <Select value={responsableSel} onChange={(e) => setResponsableSel(e.target.value)}>
                                {usuarios.map((u) => (
                                    <option key={u.id} value={u.nombre}>
                                        {u.nombre} — {u.rol}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <div className="flex justify-end gap-2">
                            <button className="btn-secondary" onClick={() => setAsignar(null)}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={iniciarTransito}>
                                Salir en tránsito
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: confirmar entrega con geolocalización simulada */}
            <Modal open={!!entrega} onClose={() => setEntrega(null)} title={`Confirmar entrega — ${entrega?.codigo ?? ''}`}>
                {entrega && (() => {
                    const destino = destinoDe(entrega);
                    return (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-soft/60 p-3 text-sm">
                                <p>
                                    Llegada a <strong>{destino?.nombre ?? '—'}</strong> · {alias.materialNombre(entrega.materialId)} ×{' '}
                                    {formatNum(entrega.cantidad)}
                                </p>
                                <p className="mt-1 font-mono text-xs text-muted">
                                    GPS simulado: {`${destino?.coords.lat ?? 0}`.slice(0, 8)}, {`${destino?.coords.lng ?? 0}`.slice(0, 8)} (valle Mantaro)
                                </p>
                            </div>
                            <p className="hint">Al confirmar, se actualizará el stock: salida de origen e ingreso en destino (UPDATE_DISPATCH).</p>
                            <div className="flex justify-end gap-2">
                                <button className="btn-secondary" onClick={() => setEntrega(null)}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-success"
                                    onClick={() => {
                                        updateDespacho(entrega.id, { estado: 'entregado' });
                                        setEntrega(null);
                                    }}
                                >
                                    Confirmar entrega
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Feedback */}
            {nuevoExito && <ToastDespacho despacho={nuevoExito} onCerrar={() => setNuevoExito(null)} />}
        </div>
    );
}

/* Progreso animado del tránsito (usa `useSimulatedTransit`). */
function TransitPill({ despacho }: { despacho: Despacho }) {
    const { updateDespacho } = useAppStore();
    const activo = despacho.estado === 'en-transito';
    const pct = useSimulatedTransit({
        activo,
        pctInicial: despacho.pctRuta ?? 0,
        entregado: despacho.estado === 'entregado',
        speedFactor: 5,
        onLlegada: () => updateDespacho(despacho.id, { estado: 'entregado' }),
    });

    if (despacho.estado === 'entregado') {
        return <span className="num text-xs font-medium text-emerald-700">100%</span>;
    }
    if (!activo) {
        return <span className="text-xs text-muted">—</span>;
    }
    const pctPc = Math.round(pct * 100);
    return (
        <span className="flex w-28 items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                <span className="block h-full rounded-full bg-brand-500 transition-[width] duration-200" style={{ width: `${pctPc}%` }} />
            </span>
            <span className="num w-8 text-right text-[11px] text-muted">{pctPc}%</span>
        </span>
    );
}

function ToastDespacho({ despacho, onCerrar }: { despacho: Despacho; onCerrar: () => void }) {
    useEffect(() => {
        const t = setTimeout(onCerrar, 6000);
        return () => clearTimeout(t);
    }, [onCerrar]);
    return (
        <AlertaBanner
            kind="info"
            title={`Despacho ${despacho.codigo} creado`}
            mensaje={`Pendiente de tránsito. Usa "Iniciar tránsito" para asignar vehículo. La alerta de sobrante se resolverá al entregar.`}
            actions={
                <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={onCerrar}>
                    Cerrar
                </button>
            }
        />
    );
}

/* Prefill de formulario desde query params (alerta de sobrante). */
function formDesdeParams(params: URLSearchParams): FormNuevo {
    if (params.get('crear') !== 'sobrante') {
        return NUEVO_VACIO;
    }
    return {
        materialId: params.get('materialId') ?? '',
        cantidad: params.get('cantidad') ?? '',
        origenAlmacenId: params.get('origen') ?? '',
        destinoAlmacenId: params.get('destino') ?? '',
        alertaId: params.get('alertaId') ?? undefined,
    };
}