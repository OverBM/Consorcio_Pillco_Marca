// Matriz de riesgos y planes de respuesta.
// Lista `riesgosDb`; registra vía `/api/v1/riesgos` y actualiza estado/respuesta
// vía `PUT /api/v1/riesgos/{id}` usando `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import type { Catalogos } from '../types';
import { IconAlert, IconPlus, IconSave } from '../components/icons';

interface RiesgoDb {
    id: number;
    obra_id: number;
    descripcion: string;
    categoria: string;
    probabilidad: number;
    impacto: number;
    severidad: number;
    respuesta: string | null;
    estado: string;
    obra?: { id: number; nombre: string } | null;
}

interface RiesgosPageProps {
    riesgosDb?: RiesgoDb[];
}

type RiesgoFila = Omit<RiesgoDb, 'id'> & { id: string };

const CATEGORIAS = ['tecnico', 'logistico', 'ambiental', 'financiero', 'social', 'seguridad', 'legal'];
const ESTADOS = ['abierto', 'mitigado', 'cerrado', 'materializado'];

function tonoSeveridad(sev: number): 'danger' | 'warn' | 'neutral' {
    if (sev >= 15) return 'danger';
    if (sev >= 10) return 'warn';
    return 'neutral';
}

export default function RiesgosPage({ riesgosDb = [] }: RiesgosPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as { catalogos?: Catalogos };
    const obras = catalogos?.obras ?? [];

    const crear = useHttp<{
        obra_id: string;
        descripcion: string;
        categoria: string;
        probabilidad: string;
        impacto: string;
        respuesta: string;
    }>({ obra_id: '', descripcion: '', categoria: 'tecnico', probabilidad: '3', impacto: '3', respuesta: '' });

    const actualizar = useHttp<{ respuesta: string; estado: string }>({ respuesta: '', estado: 'abierto' });

    const [editando, setEditando] = useState<{ id: string; descripcion: string } | null>(null);

    const filas: RiesgoFila[] = useMemo(() => riesgosDb.map((r) => ({ ...r, id: String(r.id) })), [riesgosDb]);

    const criticos = filas.filter((r) => r.severidad >= 15).length;
    const mitigados = filas.filter((r) => r.estado === 'mitigado').length;

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id || !crear.data.descripcion.trim()) {
            notify.error('Selecciona la obra y describe el riesgo.');
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            descripcion: crear.data.descripcion,
            categoria: crear.data.categoria,
            probabilidad: Number(crear.data.probabilidad),
            impacto: Number(crear.data.impacto),
            respuesta: crear.data.respuesta || null,
        }));

        crear.post('/api/v1/riesgos', {
            onSuccess: () => {
                notify.success('Riesgo registrado en la matriz.');
                crear.setData({ obra_id: '', descripcion: '', categoria: 'tecnico', probabilidad: '3', impacto: '3', respuesta: '' });
                refrescarProps('riesgosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar el riesgo.');
            },
        });
    };

    const abrirEdicion = (riesgo: RiesgoFila) => {
        actualizar.setData({ respuesta: riesgo.respuesta ?? '', estado: riesgo.estado });
        setEditando({ id: String(riesgo.id), descripcion: riesgo.descripcion });
    };

    const guardarEdicion = (event: FormEvent) => {
        event.preventDefault();
        if (!editando) return;

        actualizar.put(`/api/v1/riesgos/${editando.id}`, {
            onSuccess: () => {
                notify.success('Riesgo actualizado.');
                setEditando(null);
                refrescarProps('riesgosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo actualizar el riesgo.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Matriz de Riesgos y Alertas Tempranas"
                subtitle="Evaluación cualitativa (Probabilidad × Impacto = Severidad) y planes de respuesta"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Riesgos Críticos (≥ 15)</span>
                        <IconAlert size={16} className="text-danger" />
                    </div>
                    <p className="mt-1 text-2xl font-bold font-mono text-danger">{criticos}</p>
                    <span className="text-xs text-muted">Requieren plan de contingencia inmediato</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Riesgos Mitigados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ok">{mitigados}</p>
                    <span className="text-xs text-muted">Medidas preventivas operando</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Total en Matriz</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{filas.length}</p>
                    <span className="text-xs text-muted">Riesgos identificados y monitoreados</span>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card title={`Matriz de Riesgos (${filas.length})`} className="lg:col-span-2">
                    {filas.length === 0 ? (
                        <EmptyState title="Sin riesgos registrados" hint="Registra el primer riesgo con el panel lateral." />
                    ) : (
                        <DataTable
                            emptyLabel="Sin riesgos registrados."
                            columns={[
                                { key: 'descripcion', header: 'Descripción del Riesgo' },
                                { key: 'categoria', header: 'Categoría', mono: true },
                                { key: 'probabilidad', header: 'Prob.', align: 'center', mono: true },
                                { key: 'impacto', header: 'Imp.', align: 'center', mono: true },
                                {
                                    key: 'severidad',
                                    header: 'Severidad',
                                    align: 'center',
                                    cell: (r) => <Badge tone={tonoSeveridad(r.severidad)}>{r.severidad}</Badge>,
                                },
                                { key: 'estado', header: 'Estado', cell: (r) => <Badge tone={r.estado === 'mitigado' || r.estado === 'cerrado' ? 'ok' : 'warn'}>{r.estado}</Badge> },
                                {
                                    key: 'accion',
                                    header: 'Acción',
                                    align: 'right',
                                    cell: (r) => (
                                        <Button size="sm" variant="secondary" onClick={() => abrirEdicion(r)}>
                                            <IconSave size={13} /> Actualizar
                                        </Button>
                                    ),
                                },
                            ]}
                            rows={filas}
                        />
                    )}
                </Card>

                <FormPanel title="Registrar Riesgo" subtitle="Nuevo riesgo en la matriz PMI" onSubmit={enviar} className="text-xs">
                    <FormSection title="Identificación" columns={1}>
                        <Field label="Obra" required>
                            <Select value={crear.data.obra_id} onChange={(e) => crear.setData('obra_id', e.target.value)}>
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>{o.nombre}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Descripción" required>
                            <Textarea value={crear.data.descripcion} onChange={(e) => crear.setData('descripcion', e.target.value)} rows={3} />
                        </Field>
                        <Field label="Categoría" required>
                            <Select value={crear.data.categoria} onChange={(e) => crear.setData('categoria', e.target.value)}>
                                {CATEGORIAS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </Field>
                    </FormSection>

                    <FormSection title="Evaluación" columns={1}>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Probabilidad (1-5)" required>
                                <Input type="number" min={1} max={5} value={crear.data.probabilidad} onChange={(e) => crear.setData('probabilidad', e.target.value)} />
                            </Field>
                            <Field label="Impacto (1-5)" required>
                                <Input type="number" min={1} max={5} value={crear.data.impacto} onChange={(e) => crear.setData('impacto', e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Plan de respuesta">
                            <Textarea value={crear.data.respuesta} onChange={(e) => crear.setData('respuesta', e.target.value)} rows={2} />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Riesgo
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal open={editando !== null} onClose={() => setEditando(null)} title="Actualizar Riesgo">
                {editando && (
                    <form onSubmit={guardarEdicion} noValidate className="space-y-4 text-xs">
                        <p className="rounded-lg bg-soft/60 p-3 text-xs text-muted">{editando.descripcion}</p>
                        <Field label="Estado">
                            <Select value={actualizar.data.estado} onChange={(e) => actualizar.setData('estado', e.target.value)}>
                                {ESTADOS.map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Plan de respuesta">
                            <Textarea value={actualizar.data.respuesta} onChange={(e) => actualizar.setData('respuesta', e.target.value)} rows={3} />
                        </Field>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
                            <SubmitButton status={actualizar.processing ? 'submitting' : 'idle'}>Guardar</SubmitButton>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
