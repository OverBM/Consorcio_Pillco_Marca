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

interface ProveedoresPageProps {
    proveedoresDb?: ProveedorDb[];
}

type ProveedorFila = Omit<ProveedorDb, 'id'> & { id: string };

export default function ProveedoresPage({ proveedoresDb = [] }: ProveedoresPageProps) {
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

    const [busqueda, setBusqueda] = useState('');
    const [modalNuevo, setModalNuevo] = useState(false);

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
        const conScore = filas.filter((p) => p.calificacion !== null && p.calificacion !== undefined);
        if (conScore.length === 0) return 0;
        return conScore.reduce((acc, p) => acc + Number(p.calificacion), 0) / conScore.length;
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
            calificacion: http.data.calificacion ? Number(http.data.calificacion) : null,
        }));

        void http.post('/api/v1/proveedores', {
            onSuccess: () => {
                notify.success('Proveedor registrado.');
                setModalNuevo(false);
                refrescarProps('proveedoresDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar el proveedor.');
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
                    <span className="text-xs font-mono uppercase text-muted">Proveedores Registrados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{filas.length}</p>
                    <span className="text-xs text-muted">Empresas en base de datos</span>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Activos / Homologados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{filas.filter((p) => p.activo).length}</p>
                    <span className="text-xs text-muted">Aptos para cotización directa</span>
                </Card>
                <Card className="p-4">
                    <span className="text-xs font-mono uppercase text-muted">Calificación Promedio</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-brand-600">{calificacionPromedio.toFixed(2)} / 5.0</p>
                    <span className="text-xs text-muted">Cumplimiento de calidad y plazos</span>
                </Card>
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="relative min-w-[240px] flex-1">
                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Buscar por RUC, razón social o contacto…"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full rounded-lg border border-line bg-canvas py-1.5 pl-9 pr-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <span className="text-xs font-mono text-muted">
                        Mostrando {filtrados.length} de {filas.length} proveedores
                    </span>
                </div>
            </Card>

            <Card className="p-5">
                {filas.length === 0 ? (
                    <EmptyState title="Sin proveedores registrados" hint="Registra el primer proveedor del consorcio." />
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
                                        <span className="block font-semibold text-ink">{p.razon_social}</span>
                                        <span className="block truncate text-xs text-muted">{p.direccion ?? '—'}</span>
                                    </span>
                                ),
                            },
                            {
                                key: 'contacto',
                                header: 'Contacto',
                                cell: (p) => (
                                    <span className="block">
                                        <span className="block text-xs font-medium text-ink">{p.contacto ?? '—'}</span>
                                        <span className="block text-xs font-mono text-muted">
                                            {p.telefono ?? ''} {p.email ? `• ${p.email}` : ''}
                                        </span>
                                    </span>
                                ),
                            },
                            {
                                key: 'calificacion',
                                header: 'Score Calidad',
                                align: 'center',
                                cell: (p) =>
                                    p.calificacion !== null && p.calificacion !== undefined ? (
                                        <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-600">
                                            ★ {Number(p.calificacion).toFixed(1)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted">—</span>
                                    ),
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                align: 'center',
                                cell: (p) => <Badge tone={p.activo ? 'ok' : 'neutral'}>{p.activo ? 'Homologado' : 'Inactivo'}</Badge>,
                            },
                        ]}
                        rows={filtrados}
                    />
                )}
            </Card>

            <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Homologar Nuevo Proveedor" wide>
                <form onSubmit={enviar} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="RUC (11 dígitos)" required>
                            <Input
                                value={http.data.ruc}
                                onChange={(e) => http.setData('ruc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                placeholder="20XXXXXXXXX"
                                maxLength={11}
                                invalid={!!http.errors.ruc}
                            />
                        </Field>
                        <Field label="Razón Social" required>
                            <Input
                                value={http.data.razon_social}
                                onChange={(e) => http.setData('razon_social', e.target.value)}
                                placeholder="Nombre según SUNAT"
                                invalid={!!http.errors.razon_social}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Contacto comercial">
                            <Input value={http.data.contacto} onChange={(e) => http.setData('contacto', e.target.value)} placeholder="Ing. Contacto" />
                        </Field>
                        <Field label="Teléfono">
                            <Input value={http.data.telefono} onChange={(e) => http.setData('telefono', e.target.value)} placeholder="9XXXXXXXX" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Correo electrónico">
                            <Input type="email" value={http.data.email} onChange={(e) => http.setData('email', e.target.value)} placeholder="ventas@proveedor.pe" />
                        </Field>
                        <Field label="Calificación (0-5)">
                            <Input
                                type="number"
                                min={0}
                                max={5}
                                step="0.1"
                                value={http.data.calificacion}
                                onChange={(e) => http.setData('calificacion', e.target.value)}
                            />
                        </Field>
                    </div>

                    <Field label="Dirección">
                        <Input value={http.data.direccion} onChange={(e) => http.setData('direccion', e.target.value)} placeholder="Av. / Jr. / distrito" />
                    </Field>

                    <div className="flex justify-end gap-3 border-t border-line pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalNuevo(false)}>
                            Cancelar
                        </Button>
                        <SubmitButton status={http.processing ? 'submitting' : 'idle'}>
                            <IconPlus size={15} />
                            Registrar
                        </SubmitButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
