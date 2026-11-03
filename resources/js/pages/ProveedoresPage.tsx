// Directorio y Homologación de Proveedores (Macroproceso MP-19).
// Registro de proveedores homologados y evaluación de desempeño.
// Datos desde props `proveedoresDb`; escrituras vía `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconPlus, IconSearch } from '../components/icons';

interface ProveedorDb {
    id: number;
    ruc: string;
    razon_social: string;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    calificacion: number | string | null;
    activo: boolean;
}

interface MaterialDb {
    id: number;
    codigo: string;
    nombre: string;
}

interface ParametroAbastecimientoDb {
    id: number;
    material_id: number;
    proveedor_id: number;
    lead_time_dias: number | string;
    costo_pedido: number | string;
    precio_unitario: number | string;
    es_principal: boolean;
}

interface ProveedoresPageProps {
    proveedoresDb?: ProveedorDb[];
    materialesDb?: MaterialDb[];
    parametrosAbastecimientoDb?: ParametroAbastecimientoDb[];
}

type ProveedorFila = Omit<ProveedorDb, 'id'> & { id: string };

export default function ProveedoresPage({
    proveedoresDb = [],
    materialesDb = [],
    parametrosAbastecimientoDb = [],
}: ProveedoresPageProps) {
    const notify = useNotifications();

    const http = useHttp<{
        ruc: string;
        razon_social: string;
        contacto: string;
        telefono: string;
        email: string;
        direccion: string;
        calificacion: string;
    }>({
        ruc: '',
        razon_social: '',
        contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        calificacion: '',
    });

    const httpAbastecimiento = useHttp<{
        material_id: string;
        lead_time_dias: string;
        costo_pedido: string;
        precio_unitario: string;
        es_principal: boolean;
    }>({
        material_id: '',
        lead_time_dias: '',
        costo_pedido: '',
        precio_unitario: '',
        es_principal: false,
    });

    const [busqueda, setBusqueda] = useState('');
    const [modalNuevo, setModalNuevo] = useState(false);
    const [proveedorAbastecimiento, setProveedorAbastecimiento] =
        useState<ProveedorDb | null>(null);

    const parametrosDelProveedor = useMemo(
        () =>
            proveedorAbastecimiento
                ? parametrosAbastecimientoDb.filter(
                      (parametro) =>
                          parametro.proveedor_id === proveedorAbastecimiento.id,
                  )
                : [],
        [parametrosAbastecimientoDb, proveedorAbastecimiento],
    );

    const abrirAbastecimiento = (proveedor: ProveedorDb) => {
        httpAbastecimiento.setData('material_id', '');
        httpAbastecimiento.setData('lead_time_dias', '');
        httpAbastecimiento.setData('costo_pedido', '');
        httpAbastecimiento.setData('precio_unitario', '');
        httpAbastecimiento.setData('es_principal', true);
        setProveedorAbastecimiento(proveedor);
    };

    const enviarAbastecimiento = (event: FormEvent) => {
        event.preventDefault();

        if (!proveedorAbastecimiento) {
            return;
        }
        if (!httpAbastecimiento.data.material_id) {
            notify.error('Selecciona un material.');
            return;
        }
        if (Number(httpAbastecimiento.data.lead_time_dias) <= 0) {
            notify.error('El lead time debe ser mayor que cero.');
            return;
        }
        if (Number(httpAbastecimiento.data.costo_pedido) < 0) {
            notify.error('El costo de pedido no puede ser negativo.');
            return;
        }

        httpAbastecimiento.transform(() => ({
            proveedor_id: proveedorAbastecimiento.id,
            lead_time_dias: Number(httpAbastecimiento.data.lead_time_dias),
            costo_pedido: Number(httpAbastecimiento.data.costo_pedido),
            precio_unitario: httpAbastecimiento.data.precio_unitario
                ? Number(httpAbastecimiento.data.precio_unitario)
                : null,
            es_principal: httpAbastecimiento.data.es_principal,
        }));

        void httpAbastecimiento.post(
            `/api/v1/abastecimiento/materiales/${httpAbastecimiento.data.material_id}/proveedores`,
            {
                onSuccess: () => {
                    notify.success('Parámetros de abastecimiento guardados.');
                    httpAbastecimiento.setData('material_id', '');
                    httpAbastecimiento.setData('lead_time_dias', '');
                    httpAbastecimiento.setData('costo_pedido', '');
                    httpAbastecimiento.setData('precio_unitario', '');
                    refrescarProps('parametrosAbastecimientoDb');
                },
                onError: (errors: Record<string, string>) => {
                    notify.error(
                        Object.values(errors).flat().join(' ') ||
                            'No se pudieron guardar los parámetros.',
                    );
                },
            },
        );
    };

    const filas: ProveedorFila[] = useMemo(
        () => proveedoresDb.map((p) => ({ ...p, id: String(p.id) })),
        [proveedoresDb],
    );

    const filtrados = useMemo(
        () =>
            filas.filter((p) => {
                if (!busqueda.trim()) return true;
                const q = busqueda.toLowerCase();
                return (
                    p.ruc.toLowerCase().includes(q) ||
                    p.razon_social.toLowerCase().includes(q) ||
                    (p.contacto ?? '').toLowerCase().includes(q)
                );
            }),
        [filas, busqueda],
    );

    const calificacionPromedio = useMemo(() => {
        const conScore = filas.filter(
            (p) => p.calificacion !== null && p.calificacion !== undefined,
        );
        if (conScore.length === 0) return 0;
        return (
            conScore.reduce((acc, p) => acc + Number(p.calificacion), 0) /
            conScore.length
        );
    }, [filas]);

    const abrirNuevo = () => {
        http.setData('ruc', '');
        http.setData('razon_social', '');
        http.setData('contacto', '');
        http.setData('telefono', '');
        http.setData('email', '');
        http.setData('direccion', '');
        http.setData('calificacion', '');
        setModalNuevo(true);
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!/^\d{11}$/.test(http.data.ruc)) {
            notify.error('El RUC debe tener 11 dígitos.');
            return;
        }
        if (!http.data.razon_social.trim()) {
            notify.error('Ingresa la razón social del proveedor.');
            return;
        }

        http.transform(() => ({
            ruc: http.data.ruc,
            razon_social: http.data.razon_social,
            contacto: http.data.contacto || null,
            telefono: http.data.telefono || null,
            email: http.data.email || null,
            direccion: http.data.direccion || null,
            calificacion: http.data.calificacion
                ? Number(http.data.calificacion)
                : null,
        }));

        void http.post('/api/v1/proveedores', {
            onSuccess: () => {
                notify.success('Proveedor registrado.');
                setModalNuevo(false);
                refrescarProps('proveedoresDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo registrar el proveedor.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Directorio y Homologación de Proveedores"
                subtitle="Registro de proveedores, cumplimiento técnico-normativo y evaluación de desempeño"
                actions={
                    <Button variant="mint" onClick={abrirNuevo}>
                        <IconPlus size={16} />
                        Homologar Proveedor
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Proveedores Registrados
                    </span>
                    <p className="text-ink mt-1 font-mono text-2xl font-bold">
                        {filas.length}
                    </p>
                    <span className="text-muted text-xs">
                        Empresas en base de datos
                    </span>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Activos / Homologados
                    </span>
                    <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
                        {filas.filter((p) => p.activo).length}
                    </p>
                    <span className="text-muted text-xs">
                        Aptos para cotización directa
                    </span>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Calificación Promedio
                    </span>
                    <p className="text-brand-600 mt-1 font-mono text-2xl font-bold">
                        {calificacionPromedio.toFixed(2)} / 5.0
                    </p>
                    <span className="text-muted text-xs">
                        Cumplimiento de calidad y plazos
                    </span>
                </Card>
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="relative min-w-[240px] flex-1">
                        <IconSearch
                            size={16}
                            className="text-muted absolute top-1/2 left-3 -translate-y-1/2"
                        />
                        <input
                            type="text"
                            placeholder="Buscar por RUC, razón social o contacto…"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="border-line bg-canvas text-ink focus:ring-brand-500 w-full rounded-lg border py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none"
                        />
                    </div>
                    <span className="text-muted font-mono text-xs">
                        Mostrando {filtrados.length} de {filas.length}{' '}
                        proveedores
                    </span>
                </div>
            </Card>

            <Card className="p-5">
                {filas.length === 0 ? (
                    <EmptyState
                        title="Sin proveedores registrados"
                        hint="Registra el primer proveedor del consorcio."
                    />
                ) : (
                    <DataTable
                        emptyLabel="No hay proveedores que coincidan con la búsqueda."
                        columns={[
                            { key: 'ruc', header: 'RUC', mono: true },
                            {
                                key: 'razon',
                                header: 'Razón Social',
                                cell: (p) => (
                                    <span className="block max-w-64">
                                        <span className="text-ink block font-semibold">
                                            {p.razon_social}
                                        </span>
                                        <span className="text-muted block truncate text-xs">
                                            {p.direccion ?? '—'}
                                        </span>
                                    </span>
                                ),
                            },
                            {
                                key: 'contacto',
                                header: 'Contacto',
                                cell: (p) => (
                                    <span className="block">
                                        <span className="text-ink block text-xs font-medium">
                                            {p.contacto ?? '—'}
                                        </span>
                                        <span className="text-muted block font-mono text-xs">
                                            {p.telefono ?? ''}{' '}
                                            {p.email ? `• ${p.email}` : ''}
                                        </span>
                                    </span>
                                ),
                            },
                            {
                                key: 'calificacion',
                                header: 'Score Calidad',
                                align: 'center',
                                cell: (p) =>
                                    p.calificacion !== null &&
                                    p.calificacion !== undefined ? (
                                        <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-600">
                                            ★{' '}
                                            {Number(p.calificacion).toFixed(1)}
                                        </span>
                                    ) : (
                                        <span className="text-muted text-xs">
                                            —
                                        </span>
                                    ),
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                align: 'center',
                                cell: (p) => (
                                    <Badge tone={p.activo ? 'ok' : 'neutral'}>
                                        {p.activo ? 'Homologado' : 'Inactivo'}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'abastecimiento',
                                header: 'Abastecimiento',
                                align: 'center',
                                cell: (p) => {
                                    const original = proveedoresDb.find(
                                        (proveedor) =>
                                            String(proveedor.id) === p.id,
                                    );

                                    return original ? (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                abrirAbastecimiento(original)
                                            }
                                        >
                                            Parámetros
                                        </Button>
                                    ) : null;
                                },
                            },
                        ]}
                        rows={filtrados}
                    />
                )}
            </Card>

            <Modal
                open={modalNuevo}
                onClose={() => setModalNuevo(false)}
                title="Homologar Nuevo Proveedor"
                wide
            >
                <form onSubmit={enviar} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="RUC (11 dígitos)" required>
                            <Input
                                value={http.data.ruc}
                                onChange={(e) =>
                                    http.setData(
                                        'ruc',
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 11),
                                    )
                                }
                                placeholder="20XXXXXXXXX"
                                maxLength={11}
                                invalid={!!http.errors.ruc}
                            />
                        </Field>
                        <Field label="Razón Social" required>
                            <Input
                                value={http.data.razon_social}
                                onChange={(e) =>
                                    http.setData('razon_social', e.target.value)
                                }
                                placeholder="Nombre según SUNAT"
                                invalid={!!http.errors.razon_social}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Contacto comercial">
                            <Input
                                value={http.data.contacto}
                                onChange={(e) =>
                                    http.setData('contacto', e.target.value)
                                }
                                placeholder="Ing. Contacto"
                            />
                        </Field>
                        <Field label="Teléfono">
                            <Input
                                value={http.data.telefono}
                                onChange={(e) =>
                                    http.setData('telefono', e.target.value)
                                }
                                placeholder="9XXXXXXXX"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Correo electrónico">
                            <Input
                                type="email"
                                value={http.data.email}
                                onChange={(e) =>
                                    http.setData('email', e.target.value)
                                }
                                placeholder="ventas@proveedor.pe"
                            />
                        </Field>
                        <Field label="Calificación (0-5)">
                            <Input
                                type="number"
                                min={0}
                                max={5}
                                step="0.1"
                                value={http.data.calificacion}
                                onChange={(e) =>
                                    http.setData('calificacion', e.target.value)
                                }
                            />
                        </Field>
                    </div>

                    <Field label="Dirección">
                        <Input
                            value={http.data.direccion}
                            onChange={(e) =>
                                http.setData('direccion', e.target.value)
                            }
                            placeholder="Av. / Jr. / distrito"
                        />
                    </Field>

                    <div className="border-line flex justify-end gap-3 border-t pt-2">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => setModalNuevo(false)}
                        >
                            Cancelar
                        </Button>
                        <SubmitButton
                            status={http.processing ? 'submitting' : 'idle'}
                        >
                            <IconPlus size={15} />
                            Registrar
                        </SubmitButton>
                    </div>
                </form>
            </Modal>

            <Modal
                open={proveedorAbastecimiento !== null}
                onClose={() => setProveedorAbastecimiento(null)}
                title={`Parámetros de abastecimiento${
                    proveedorAbastecimiento
                        ? ` · ${proveedorAbastecimiento.razon_social}`
                        : ''
                }`}
                wide
            >
                <div className="space-y-4 text-xs">
                    <div className="border-line rounded-lg border p-3">
                        <p className="text-muted mb-2 font-mono text-[10px] uppercase">
                            Materiales configurados
                        </p>
                        {parametrosDelProveedor.length === 0 ? (
                            <p className="text-muted">
                                Este proveedor aún no tiene lead times
                                registrados.
                            </p>
                        ) : (
                            <ul className="divide-line divide-y">
                                {parametrosDelProveedor.map((parametro) => {
                                    const material = materialesDb.find(
                                        (item) =>
                                            item.id === parametro.material_id,
                                    );

                                    return (
                                        <li
                                            key={parametro.id}
                                            className="flex items-center justify-between gap-3 py-1.5"
                                        >
                                            <span className="text-ink">
                                                {material?.nombre ??
                                                    `Material #${parametro.material_id}`}
                                            </span>
                                            <span className="text-muted font-mono">
                                                {Number(
                                                    parametro.lead_time_dias,
                                                ).toFixed(1)}{' '}
                                                d · S/{' '}
                                                {Number(
                                                    parametro.costo_pedido,
                                                ).toFixed(2)}
                                                {parametro.es_principal
                                                    ? ' · principal'
                                                    : ''}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <form
                        onSubmit={enviarAbastecimiento}
                        className="space-y-4"
                    >
                        <Field label="Material" required>
                            <select
                                value={httpAbastecimiento.data.material_id}
                                onChange={(e) =>
                                    httpAbastecimiento.setData(
                                        'material_id',
                                        e.target.value,
                                    )
                                }
                                className="border-line bg-canvas text-ink w-full rounded-lg border px-3 py-1.5 text-xs"
                            >
                                <option value="">Selecciona un material…</option>
                                {materialesDb.map((material) => (
                                    <option
                                        key={material.id}
                                        value={material.id}
                                    >
                                        {material.codigo} — {material.nombre}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field label="Lead time (días)" required>
                                <Input
                                    type="number"
                                    min={0.1}
                                    step="0.1"
                                    value={
                                        httpAbastecimiento.data.lead_time_dias
                                    }
                                    onChange={(e) =>
                                        httpAbastecimiento.setData(
                                            'lead_time_dias',
                                            e.target.value,
                                        )
                                    }
                                    invalid={
                                        !!httpAbastecimiento.errors
                                            .lead_time_dias
                                    }
                                />
                            </Field>
                            <Field label="Costo de pedido (S/)" required>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={
                                        httpAbastecimiento.data.costo_pedido
                                    }
                                    onChange={(e) =>
                                        httpAbastecimiento.setData(
                                            'costo_pedido',
                                            e.target.value,
                                        )
                                    }
                                    invalid={
                                        !!httpAbastecimiento.errors
                                            .costo_pedido
                                    }
                                />
                            </Field>
                            <Field label="Precio unitario (S/)">
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={
                                        httpAbastecimiento.data.precio_unitario
                                    }
                                    onChange={(e) =>
                                        httpAbastecimiento.setData(
                                            'precio_unitario',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>

                        <label className="text-ink flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={
                                    httpAbastecimiento.data.es_principal
                                }
                                onChange={(e) =>
                                    httpAbastecimiento.setData(
                                        'es_principal',
                                        e.target.checked,
                                    )
                                }
                            />
                            Proveedor principal del material
                        </label>

                        <div className="border-line flex justify-end gap-3 border-t pt-2">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() =>
                                    setProveedorAbastecimiento(null)
                                }
                            >
                                Cerrar
                            </Button>
                            <SubmitButton
                                status={
                                    httpAbastecimiento.processing
                                        ? 'submitting'
                                        : 'idle'
                                }
                            >
                                <IconPlus size={15} />
                                Guardar parámetros
                            </SubmitButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
