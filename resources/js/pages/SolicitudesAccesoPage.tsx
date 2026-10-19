// Bandeja de solicitudes de acceso para su revisión.
// Lectura desde prop `solicitudesDb`; aprobar/rechazar vía `useHttp` contra
// `/api/v1/solicitudes-acceso/{id}`. La aprobación crea la cuenta y devuelve
// una contraseña temporal que se muestra una sola vez.

import { useMemo, useState } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, TextArea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';

interface SolicitudDb {
    id: string;
    nombre_completo: string;
    email: string;
    dni: string | null;
    telefono: string | null;
    empresa: string | null;
    ruc: string | null;
    cargo: string | null;
    rol_solicitado: string;
    motivo: string;
    estado: string;
    notas_revision: string | null;
    revisado_por: string | null;
    revisado_en: string | null;
    creada_en: string | null;
}

interface SolicitudesAccesoPageProps {
    solicitudesDb?: SolicitudDb[];
}

interface CredencialTemporal {
    email: string;
    password: string;
    rol: string;
}

type SolicitudFila = SolicitudDb & { dbId: number };

const TONO_ESTADO: Record<string, 'ok' | 'warn' | 'danger'> = {
    pendiente: 'warn',
    aprobada: 'ok',
    rechazada: 'danger',
};

export default function SolicitudesAccesoPage({
    solicitudesDb = [],
}: SolicitudesAccesoPageProps) {
    const notify = useNotifications();
    const revision = useHttp<{ notas_revision?: string }>({});

    const [seleccion, setSeleccion] = useState<SolicitudFila | null>(null);
    const [notas, setNotas] = useState('');
    const [credencial, setCredencial] = useState<CredencialTemporal | null>(
        null,
    );

    const filas: SolicitudFila[] = useMemo(
        () => solicitudesDb.map((s) => ({ ...s, dbId: Number(s.id) })),
        [solicitudesDb],
    );
    const pendientes = filas.filter((s) => s.estado === 'pendiente').length;

    const abrirRevision = (s: SolicitudFila) => {
        setSeleccion(s);
        setNotas('');
    };

    const cerrarRevision = () => {
        if (revision.processing) return;
        setSeleccion(null);
    };

    const aprobar = (s: SolicitudFila) => {
        revision.transform(() => ({ notas_revision: notas || undefined }));
        void revision.post(`/api/v1/solicitudes-acceso/${s.dbId}/aprobar`, {
            onSuccess: (respuesta) => {
                const datos = (
                    respuesta as {
                        data?: {
                            password_temporal?: string;
                            usuario?: { email?: string; rol?: string };
                        };
                    }
                ).data;
                notify.success('Solicitud aprobada y cuenta creada.');
                setSeleccion(null);
                setNotas('');
                if (datos?.password_temporal) {
                    setCredencial({
                        email: datos.usuario?.email ?? s.email,
                        password: datos.password_temporal,
                        rol: datos.usuario?.rol ?? s.rol_solicitado,
                    });
                }
                refrescarProps('solicitudesDb');
            },
            onError: (errors: Record<string, string | string[]>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo aprobar la solicitud.',
                );
            },
        });
    };

    const rechazar = (s: SolicitudFila) => {
        revision.transform(() => ({ notas_revision: notas || undefined }));
        void revision.post(`/api/v1/solicitudes-acceso/${s.dbId}/rechazar`, {
            onSuccess: () => {
                notify.success('Solicitud rechazada.');
                setSeleccion(null);
                setNotas('');
                refrescarProps('solicitudesDb');
            },
            onError: (errors: Record<string, string | string[]>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo rechazar la solicitud.',
                );
            },
        });
    };

    const copiarClave = async () => {
        if (!credencial) return;

        try {
            await navigator.clipboard.writeText(credencial.password);
            notify.success('Contraseña temporal copiada.');
        } catch {
            notify.error(
                'No se pudo copiar automáticamente. Selecciona y copia la contraseña.',
            );
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Solicitudes de Acceso"
                subtitle="Aprueba (crea la cuenta con el rol solicitado) o rechaza las solicitudes recibidas desde la portada"
            />

            <Card
                title={`Solicitudes Recibidas (${filas.length}) · ${pendientes} pendientes`}
            >
                {filas.length === 0 ? (
                    <EmptyState
                        title="Sin solicitudes registradas"
                        hint="Las solicitudes enviadas desde /registro aparecerán aquí."
                    />
                ) : (
                    <DataTable
                        emptyLabel="Sin solicitudes registradas."
                        columns={[
                            {
                                key: 'nombre_completo',
                                header: 'Solicitante',
                                cell: (r) => (
                                    <div>
                                        <span className="text-ink block font-bold">
                                            {r.nombre_completo}
                                        </span>
                                        <span className="text-muted font-mono text-xs">
                                            {r.email}
                                        </span>
                                    </div>
                                ),
                            },
                            {
                                key: 'rol_solicitado',
                                header: 'Rol solicitado',
                                cell: (r) => (
                                    <Badge tone="violet">
                                        {r.rol_solicitado}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'contacto',
                                header: 'Contacto',
                                cell: (r) => (
                                    <div className="text-xs">
                                        <span className="block">
                                            {r.telefono ?? '—'}
                                        </span>
                                        <span className="text-muted">
                                            {r.dni ? `DNI ${r.dni}` : 'Sin DNI'}
                                        </span>
                                    </div>
                                ),
                            },
                            {
                                key: 'empresa',
                                header: 'Empresa / RUC',
                                cell: (r) => (
                                    <div className="text-xs">
                                        <span className="block">
                                            {r.empresa ?? '—'}
                                        </span>
                                        <span className="text-muted font-mono">
                                            {r.ruc ? `RUC ${r.ruc}` : 'Sin RUC'}
                                        </span>
                                    </div>
                                ),
                            },
                            { key: 'creada_en', header: 'Fecha', mono: true },
                            {
                                key: 'estado',
                                header: 'Estado',
                                align: 'center',
                                cell: (r) => (
                                    <div className="space-y-1">
                                        <Badge
                                            tone={
                                                TONO_ESTADO[r.estado] ??
                                                'neutral'
                                            }
                                        >
                                            {r.estado}
                                        </Badge>
                                        {r.revisado_por && (
                                            <span className="text-muted block text-[10px]">
                                                por {r.revisado_por}
                                            </span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acción',
                                align: 'right',
                                cell: (r) =>
                                    r.estado === 'pendiente' ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => abrirRevision(r)}
                                        >
                                            Revisar
                                        </Button>
                                    ) : (
                                        <span className="text-muted text-xs">
                                            Revisada
                                        </span>
                                    ),
                            },
                        ]}
                        rows={filas}
                    />
                )}
            </Card>

            <Modal
                open={seleccion !== null}
                onClose={cerrarRevision}
                title="Revisar solicitud de acceso"
                wide
            >
                {seleccion && (
                    <div className="space-y-5">
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <dt className="label">Solicitante</dt>
                                <dd className="text-ink text-sm font-semibold">
                                    {seleccion.nombre_completo}
                                </dd>
                                <dd className="text-muted font-mono text-xs">
                                    {seleccion.email}
                                </dd>
                            </div>
                            <div>
                                <dt className="label">Rol solicitado</dt>
                                <dd>
                                    <Badge tone="violet">
                                        {seleccion.rol_solicitado}
                                    </Badge>
                                </dd>
                            </div>
                            <div>
                                <dt className="label">Documento / Contacto</dt>
                                <dd className="text-ink text-sm">
                                    {seleccion.dni
                                        ? `DNI ${seleccion.dni}`
                                        : 'Sin DNI'}{' '}
                                    · {seleccion.telefono ?? 'Sin teléfono'}
                                </dd>
                            </div>
                            <div>
                                <dt className="label">Empresa / RUC</dt>
                                <dd className="text-ink text-sm">
                                    {seleccion.empresa ?? '—'} ·{' '}
                                    {seleccion.ruc ?? 'Sin RUC'}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="label">Motivo</dt>
                                <dd className="text-ink text-sm">
                                    {seleccion.motivo}
                                </dd>
                            </div>
                        </dl>

                        <Field
                            label="Notas de revisión"
                            htmlFor="revision-notas"
                            hint="Opcional. Se guardará en la bitácora de la solicitud."
                        >
                            <TextArea
                                id="revision-notas"
                                rows={3}
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Observaciones para el expediente de la solicitud."
                            />
                        </Field>

                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={cerrarRevision}
                                disabled={revision.processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => rechazar(seleccion)}
                                disabled={revision.processing}
                            >
                                Rechazar
                            </Button>
                            <Button
                                onClick={() => aprobar(seleccion)}
                                disabled={revision.processing}
                            >
                                Aprobar y crear cuenta
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                open={credencial !== null}
                onClose={() => setCredencial(null)}
                title="Cuenta creada — contraseña temporal"
            >
                {credencial && (
                    <div className="space-y-4">
                        <p className="text-muted text-sm">
                            Comparte esta contraseña con{' '}
                            <strong className="text-ink">
                                {credencial.email}
                            </strong>{' '}
                            (rol {credencial.rol}). Por seguridad no volverá a
                            mostrarse.
                        </p>
                        <div className="border-line bg-soft rounded-lg border p-3">
                            <p className="text-ink font-mono text-lg font-semibold tracking-wide select-all">
                                {credencial.password}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCredencial(null)}
                            >
                                Cerrar
                            </Button>
                            <Button onClick={copiarClave}>
                                Copiar contraseña
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
