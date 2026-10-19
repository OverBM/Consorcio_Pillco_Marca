// Administración de Usuarios y Control de Acceso (RBAC).
// Lista `usuariosDb` y crea/edita vía `useHttp` contra `/api/v1/usuarios`.

import { useMemo, useState, type FormEvent } from 'react';
import { Deferred, useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { useNotifications } from '../components/notifications/NotificationProvider';
import type { Catalogos } from '../types';
import { IconPlus, IconSave } from '../components/icons';

interface RolDb {
    codigo: string;
    nombre: string;
}

interface UsuarioDb {
    id: string;
    nombre: string;
    email: string;
    dni: string | null;
    telefono: string | null;
    rol: string;
    rol_codigo: string | null;
    obra: string;
    obra_id: number | null;
    activo: boolean;
    estado: string;
}

interface UsuariosPageProps {
    usuariosDb?: UsuarioDb[];
    rolesDb?: RolDb[];
}

const ESTADOS = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
];

const VACIO = {
    name: '',
    email: '',
    password: '',
    dni: '',
    telefono: '',
    rol_codigo: '',
    obra_id: '',
    estado: 'activo',
};

export default function UsuariosPage({ usuariosDb = [], rolesDb = [] }: UsuariosPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const filas = useMemo(() => usuariosDb.map((u) => ({ ...u, id: String(u.id) })), [usuariosDb]);

    const crear = useHttp<typeof VACIO>({
        ...VACIO,
        rol_codigo: rolesDb[0]?.codigo ?? '',
        obra_id: obras[0] ? String(obras[0].id) : '',
    });

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.name.trim()) {
            notify.error('Ingresa el nombre del usuario.');
            return;
        }
        if (!crear.data.email.trim()) {
            notify.error('Ingresa el correo corporativo.');
            return;
        }
        if (crear.data.password.length < 8) {
            notify.error('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (!crear.data.rol_codigo) {
            notify.error('Selecciona el rol asignado.');
            return;
        }

        crear.transform(() => ({
            name: crear.data.name.trim(),
            email: crear.data.email.trim(),
            password: crear.data.password,
            dni: crear.data.dni.trim() || null,
            telefono: crear.data.telefono.trim() || null,
            rol_codigo: crear.data.rol_codigo,
            obra_id: crear.data.obra_id ? Number(crear.data.obra_id) : null,
            activo: crear.data.estado === 'activo',
        }));

        void crear.post('/api/v1/usuarios', {
            onSuccess: () => {
                notify.success('Usuario registrado exitosamente.');
                crear.setData({
                    ...VACIO,
                    rol_codigo: rolesDb[0]?.codigo ?? '',
                    obra_id: obras[0] ? String(obras[0].id) : '',
                });
                refrescarProps('usuariosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar el usuario.');
            },
        });
    };

    const editar = useHttp<{ name: string; email: string; password: string; rol_codigo: string; obra_id: string; estado: string }>({
        name: '',
        email: '',
        password: '',
        rol_codigo: '',
        obra_id: '',
        estado: 'activo',
    });
    const [editando, setEditando] = useState<UsuarioDb | null>(null);

    const abrirEdicion = (u: UsuarioDb) => {
        editar.setData({
            name: u.nombre,
            email: u.email,
            password: '',
            rol_codigo: u.rol_codigo ?? rolesDb[0]?.codigo ?? '',
            obra_id: u.obra_id ? String(u.obra_id) : '',
            estado: u.activo ? 'activo' : 'inactivo',
        });
        setEditando(u);
    };

    const guardarEdicion = (event: FormEvent) => {
        event.preventDefault();
        if (!editando) {
            return;
        }

        editar.transform(() => ({
            name: editar.data.name.trim(),
            email: editar.data.email.trim(),
            password: editar.data.password ? editar.data.password : null,
            rol_codigo: editar.data.rol_codigo,
            obra_id: editar.data.obra_id ? Number(editar.data.obra_id) : null,
            activo: editar.data.estado === 'activo',
        }));

        void editar.put(`/api/v1/usuarios/${editando.id}`, {
            onSuccess: () => {
                notify.success('Usuario actualizado exitosamente.');
                setEditando(null);
                refrescarProps('usuariosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo actualizar el usuario.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Usuarios y Control de Acceso (RBAC)"
                subtitle="Gestión de credenciales, roles según carril Bizagi y asignación de alcance por obra o almacén"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card title={`Usuarios Registrados (${filas.length})`}>
                        <Deferred data="usuariosDb" fallback={<SkeletonTable />}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin usuarios registrados" hint="Registra el primer usuario con el panel lateral." />
                        ) : (
                            <DataTable
                                emptyLabel="Sin usuarios registrados."
                                columns={[
                                    { key: 'nombre', header: 'Nombre y Apellidos', cell: (r) => <span className="font-bold text-ink">{r.nombre}</span> },
                                    { key: 'email', header: 'Correo Corporativo', mono: true },
                                    { key: 'rol', header: 'Rol Asignado', cell: (r) => <Badge tone="violet">{r.rol}</Badge> },
                                    { key: 'obra', header: 'Alcance Asignado' },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (r) => <Badge tone={r.activo ? 'ok' : 'danger'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>,
                                    },
                                    {
                                        key: 'acciones',
                                        header: 'Acción',
                                        align: 'right',
                                        cell: (r) => (
                                            <Button variant="secondary" size="sm" onClick={() => abrirEdicion(r)}>
                                                Editar
                                            </Button>
                                        ),
                                    },
                                ]}
                                rows={filas}
                            />
                        )}
                        </Deferred>
                    </Card>
                </div>

                <FormPanel title="Registrar Usuario" subtitle="Credenciales y rol de acceso" onSubmit={enviar} className="text-xs">
                    <FormSection title="Identidad" columns={1}>
                        <Field label="Nombre y Apellidos" required>
                            <Input value={crear.data.name} onChange={(e) => crear.setData('name', e.target.value)} placeholder="Ing. Carlos Mendoza" />
                        </Field>
                        <Field label="Correo Corporativo" required>
                            <Input type="email" value={crear.data.email} onChange={(e) => crear.setData('email', e.target.value)} placeholder="usuario@pillcomarca.pe" />
                        </Field>
                        <Field label="Contraseña" required hint="Mínimo 8 caracteres.">
                            <Input type="password" value={crear.data.password} onChange={(e) => crear.setData('password', e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="DNI">
                                <Input value={crear.data.dni} onChange={(e) => crear.setData('dni', e.target.value)} maxLength={12} />
                            </Field>
                            <Field label="Teléfono">
                                <Input value={crear.data.telefono} onChange={(e) => crear.setData('telefono', e.target.value)} maxLength={30} />
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="Acceso y Alcance" columns={1}>
                        <Field label="Rol Asignado" required>
                            <Select value={crear.data.rol_codigo} onChange={(e) => crear.setData('rol_codigo', e.target.value)}>
                                <option value="">Selecciona rol…</option>
                                {rolesDb.map((r) => (
                                    <option key={r.codigo} value={r.codigo}>
                                        {r.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Obra / Alcance">
                            <Select value={crear.data.obra_id} onChange={(e) => crear.setData('obra_id', e.target.value)}>
                                <option value="">Todas las Obras</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Estado">
                            <Select value={crear.data.estado} onChange={(e) => crear.setData('estado', e.target.value)}>
                                {ESTADOS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Usuario
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal open={Boolean(editando)} onClose={() => setEditando(null)} title="Editar Usuario">
                {editando && (
                    <form onSubmit={guardarEdicion} className="space-y-4">
                        <div className="bg-canvas p-3 rounded-lg border border-line text-xs">
                            <span className="text-muted block">Usuario:</span>
                            <span className="font-bold text-ink">{editando.email}</span>
                        </div>

                        <Field label="Nombre y Apellidos" required>
                            <Input value={editar.data.name} onChange={(e) => editar.setData('name', e.target.value)} />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Rol Asignado" required>
                                <Select value={editar.data.rol_codigo} onChange={(e) => editar.setData('rol_codigo', e.target.value)}>
                                    {rolesDb.map((r) => (
                                        <option key={r.codigo} value={r.codigo}>
                                            {r.nombre}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Estado">
                                <Select value={editar.data.estado} onChange={(e) => editar.setData('estado', e.target.value)}>
                                    {ESTADOS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <Field label="Obra / Alcance">
                            <Select value={editar.data.obra_id} onChange={(e) => editar.setData('obra_id', e.target.value)}>
                                <option value="">Todas las Obras</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Nueva Contraseña" hint="Déjala vacía para conservar la actual.">
                            <Input type="password" value={editar.data.password} onChange={(e) => editar.setData('password', e.target.value)} />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" type="button" onClick={() => setEditando(null)}>
                                Cancelar
                            </Button>
                            <Button variant="mint" type="submit" disabled={editar.processing}>
                                <IconSave size={14} />
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
