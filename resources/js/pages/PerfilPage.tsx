// Perfil del usuario autenticado: identidad (solo lectura), edición de
// nombre/teléfono y cambio de contraseña.

import { type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, FormPanel, FormSection, SubmitButton } from '../components/form';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconSave, IconShield } from '../components/icons';

interface RolItem {
    codigo: string;
    nombre: string;
}

interface AlcanceItem {
    id: number;
    codigo: string;
    nombre: string;
}

interface Perfil {
    id: number;
    name: string;
    email: string;
    dni: string | null;
    telefono: string | null;
    roles: RolItem[];
    obras: AlcanceItem[];
    almacenes: AlcanceItem[];
}

interface PerfilPageProps {
    perfil: Perfil;
}

export default function PerfilPage({ perfil }: PerfilPageProps) {
    const notify = useNotifications();

    const datos = useHttp<{ name: string; telefono: string }>({
        name: perfil.name,
        telefono: perfil.telefono ?? '',
    });

    const clave = useHttp<{ current_password: string; password: string; password_confirmation: string }>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const guardarDatos = (event: FormEvent) => {
        event.preventDefault();

        if (!datos.data.name.trim()) {
            notify.error('Ingresa tu nombre.');
            return;
        }

        datos.transform(() => ({
            name: datos.data.name.trim(),
            telefono: datos.data.telefono.trim() || null,
        }));

        datos.patch('/perfil', {
            onSuccess: () => {
                notify.success('Tus datos fueron actualizados.');
                refrescarProps('perfil');
            },
            onError: (errors: Record<string, string>) =>
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudieron actualizar tus datos.'),
        });
    };

    const cambiarClave = (event: FormEvent) => {
        event.preventDefault();

        if (!clave.data.current_password) {
            notify.error('Ingresa tu contraseña actual.');
            return;
        }
        if (clave.data.password !== clave.data.password_confirmation) {
            notify.error('La confirmación no coincide con la nueva contraseña.');
            return;
        }

        clave.patch('/perfil/password', {
            onSuccess: () => {
                notify.success('Tu contraseña fue actualizada.');
                clave.setData({ current_password: '', password: '', password_confirmation: '' });
            },
            onError: (errors: Record<string, string>) =>
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo actualizar la contraseña.'),
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Mi Perfil" subtitle="Datos personales, contacto y seguridad de tu cuenta" />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <Card title="Identidad (solo lectura)">
                        <dl className="space-y-3 text-xs">
                            <div>
                                <dt className="text-muted font-mono uppercase text-[10px]">Correo corporativo</dt>
                                <dd className="font-mono text-ink break-all">{perfil.email}</dd>
                            </div>
                            <div>
                                <dt className="text-muted font-mono uppercase text-[10px]">DNI</dt>
                                <dd className="text-ink">{perfil.dni ?? '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted font-mono uppercase text-[10px]">Rol</dt>
                                <dd className="flex flex-wrap gap-1.5 pt-0.5">
                                    {perfil.roles.length ? (
                                        perfil.roles.map((rol) => (
                                            <Badge key={rol.codigo} tone="violet">
                                                {rol.nombre}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-ink">Sin rol asignado</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </Card>

                    <Card title="Obras y almacenes asignados">
                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-muted font-mono uppercase text-[10px] block mb-1.5">Obras</span>
                                {perfil.obras.length ? (
                                    <ul className="space-y-1">
                                        {perfil.obras.map((obra) => (
                                            <li key={obra.id} className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-muted">{obra.codigo}</span>
                                                <span className="text-ink">{obra.nombre}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="text-muted">Sin obras asignadas.</span>
                                )}
                            </div>
                            <div>
                                <span className="text-muted font-mono uppercase text-[10px] block mb-1.5">Almacenes</span>
                                {perfil.almacenes.length ? (
                                    <ul className="space-y-1">
                                        {perfil.almacenes.map((almacen) => (
                                            <li key={almacen.id} className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-muted">{almacen.codigo}</span>
                                                <span className="text-ink">{almacen.nombre}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="text-muted">Sin almacenes asignados.</span>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <FormPanel title="Datos de contacto" subtitle="Puedes editar tu nombre y teléfono" onSubmit={guardarDatos} className="text-xs">
                        <FormSection title="Contacto" columns={1}>
                            <Field label="Nombre y Apellidos" required>
                                <Input value={datos.data.name} onChange={(e) => datos.setData('name', e.target.value)} />
                            </Field>
                            <Field label="Teléfono" hint="Número de contacto (opcional).">
                                <Input value={datos.data.telefono} onChange={(e) => datos.setData('telefono', e.target.value)} maxLength={30} />
                            </Field>
                        </FormSection>
                        <SubmitButton status={datos.processing ? 'submitting' : 'idle'} className="w-full">
                            <IconSave size={15} />
                            Guardar cambios
                        </SubmitButton>
                    </FormPanel>

                    <FormPanel title="Cambiar contraseña" subtitle="Verifica tu contraseña actual" onSubmit={cambiarClave} className="text-xs">
                        <FormSection title="Seguridad" columns={1}>
                            <Field label="Contraseña actual" required>
                                <Input type="password" value={clave.data.current_password} onChange={(e) => clave.setData('current_password', e.target.value)} />
                            </Field>
                            <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.">
                                <Input type="password" value={clave.data.password} onChange={(e) => clave.setData('password', e.target.value)} />
                            </Field>
                            <Field label="Confirmar nueva contraseña" required>
                                <Input type="password" value={clave.data.password_confirmation} onChange={(e) => clave.setData('password_confirmation', e.target.value)} />
                            </Field>
                        </FormSection>
                        <SubmitButton status={clave.processing ? 'submitting' : 'idle'} className="w-full">
                            <IconShield size={15} />
                            Actualizar contraseña
                        </SubmitButton>
                    </FormPanel>
                </div>
            </div>
        </div>
    );
}
