import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import {
    IconBuilding,
    IconCheckCircle,
    IconFileText,
    IconPlus,
    IconSearch,
    IconShield,
    IconTrendingUp,
} from '../components/icons';

interface ProveedorItem {
    id: string;
    ruc: string;
    razonSocial: string;
    rubro: string;
    contacto: string;
    telefono: string;
    email: string;
    calificacion: number; // 1-5
    plazoCreditoDias: number;
    estado: 'homologado' | 'en_evaluacion' | 'observado';
    totalContratado: number;
}

export default function ProveedoresPage() {
    const [proveedores, setProveedores] = useState<ProveedorItem[]>([
        {
            id: 'prov-01',
            ruc: '20584938291',
            razonSocial: 'Ferretería Industrial del Centro SAC',
            rubro: 'Ferretería y Acero Estructural',
            contacto: 'Ing. Carlos Mendoza',
            telefono: '964-123456',
            email: 'ventas@industrialcentro.com.pe',
            calificacion: 4.8,
            plazoCreditoDias: 30,
            estado: 'homologado',
            totalContratado: 145800.00,
        },
        {
            id: 'prov-02',
            ruc: '20100128492',
            razonSocial: 'Unión de Concreteras Huancayo SA (UNICON)',
            rubro: 'Concreto Premezclado y Cemento',
            contacto: 'Lic. Patricia Ramos',
            telefono: '952-887711',
            email: 'comercial@unicon-centro.pe',
            calificacion: 4.9,
            plazoCreditoDias: 45,
            estado: 'homologado',
            totalContratado: 382400.00,
        },
        {
            id: 'prov-03',
            ruc: '20601928471',
            razonSocial: 'Cantera y Agregados Río Mantaro EIRL',
            rubro: 'Agregados y Arena Gruesa',
            contacto: 'Sr. Víctor Hilario',
            telefono: '998-334455',
            email: 'cantera.mantaro@gmail.com',
            calificacion: 4.5,
            plazoCreditoDias: 15,
            estado: 'homologado',
            totalContratado: 64200.00,
        },
        {
            id: 'prov-04',
            ruc: '20498273910',
            razonSocial: 'Seguridad Industrial & EPPs Andina SAC',
            rubro: 'Equipos de Protección Personal y SST',
            contacto: 'Dra. Elena Vargas',
            telefono: '944-112233',
            email: 'contacto@eppandina.com',
            calificacion: 4.7,
            plazoCreditoDias: 30,
            estado: 'homologado',
            totalContratado: 28900.00,
        },
        {
            id: 'prov-05',
            ruc: '20609384721',
            razonSocial: 'Transportes y Maquinarias del Valle SRL',
            rubro: 'Maquinaria Pesada y Fletes',
            contacto: 'Alonso Quinto',
            telefono: '978-554433',
            email: 'aquinto@transvalle.com.pe',
            calificacion: 4.2,
            plazoCreditoDias: 20,
            estado: 'en_evaluacion',
            totalContratado: 19500.00,
        },
    ]);

    const [filtroRubro, setFiltroRubro] = useState<string>('todos');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState<string>('');
    const [modalNuevoProv, setModalNuevoProv] = useState(false);

    // Formulario de Proveedor
    const [formRuc, setFormRuc] = useState('');
    const [formRazon, setFormRazon] = useState('');
    const [formRubro, setFormRubro] = useState('Ferretería y Acero Estructural');
    const [formContacto, setFormContacto] = useState('');
    const [formTelefono, setFormTelefono] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formCredito, setFormCredito] = useState(30);

    const handleGuardarProveedor = (e: React.FormEvent) => {
        e.preventDefault();
        const nuevo: ProveedorItem = {
            id: `prov-${Date.now().toString().slice(-4)}`,
            ruc: formRuc,
            razonSocial: formRazon,
            rubro: formRubro,
            contacto: formContacto,
            telefono: formTelefono,
            email: formEmail,
            calificacion: 4.5,
            plazoCreditoDias: Number(formCredito),
            estado: 'homologado',
            totalContratado: 0,
        };
        setProveedores((prev) => [nuevo, ...prev]);
        setModalNuevoProv(false);
        setFormRuc('');
        setFormRazon('');
        setFormContacto('');
        setFormTelefono('');
        setFormEmail('');
    };

    const proveedoresFiltrados = useMemo(() => {
        return proveedores.filter((p) => {
            if (filtroRubro !== 'todos' && p.rubro !== filtroRubro) return false;
            if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const matchRuc = p.ruc.includes(q);
                const matchRazon = p.razonSocial.toLowerCase().includes(q);
                const matchContacto = p.contacto.toLowerCase().includes(q);
                if (!matchRuc && !matchRazon && !matchContacto) return false;
            }
            return true;
        });
    }, [proveedores, filtroRubro, filtroEstado, busqueda]);

    // Métricas
    const totalProveedores = proveedores.length;
    const homologadosCount = proveedores.filter((p) => p.estado === 'homologado').length;
    const totalVolumen = proveedores.reduce((acc, p) => acc + p.totalContratado, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Directorio y Homologación de Proveedores (Macroproceso MP-19)"
                subtitle="Registro de postores calificados, cumplimiento técnico-normativo y evaluación periódica de desempeño"
                action={
                    <Button variant="mint" onClick={() => setModalNuevoProv(true)}>
                        <IconPlus size={16} />
                        Homologar Proveedor
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Proveedores Registrados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{totalProveedores}</p>
                    <span className="text-xs text-muted">Empresas en base de datos</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Homologados Vigentes</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{homologadosCount}</p>
                    <span className="text-xs text-muted">Aptos para cotización directa</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Calificación Promedio</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-primary-600">4.62 / 5.0</p>
                    <span className="text-xs text-muted">Cumplimiento de calidad y plazos</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Volumen Histórico Acumulado</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">
                        S/. {(totalVolumen / 1000).toFixed(1)}k
                    </p>
                    <span className="text-xs text-muted">Facturado en el consorcio</span>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="p-4 bg-surface border-line">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por RUC, razón social o contacto..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todos">Todos los Estados</option>
                            <option value="homologado">Homologado</option>
                            <option value="en_evaluacion">En Evaluación</option>
                            <option value="observado">Observado</option>
                        </select>
                    </div>
                    <span className="text-xs text-muted font-mono">
                        Mostrando {proveedoresFiltrados.length} de {proveedores.length} proveedores
                    </span>
                </div>
            </Card>

            {/* Tabla de Proveedores */}
            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="No hay proveedores que coincidan con la búsqueda."
                    columns={[
                        { key: 'ruc', header: 'RUC', mono: true },
                        { key: 'razonSocial', header: 'Razón Social / Rubro' },
                        { key: 'contacto', header: 'Contacto Comercial' },
                        { key: 'credito', header: 'Línea de Crédito', align: 'center', mono: true },
                        { key: 'calificacion', header: 'Score Calidad', align: 'center' },
                        { key: 'estado', header: 'Estado', align: 'center' },
                    ]}
                    rows={proveedoresFiltrados.map((prov) => {
                        return {
                            id: prov.id,
                            ruc: prov.ruc,
                            razonSocial: (
                                <div>
                                    <p className="font-semibold text-ink">{prov.razonSocial}</p>
                                    <p className="text-xs text-muted">{prov.rubro}</p>
                                </div>
                            ),
                            contacto: (
                                <div>
                                    <p className="text-xs font-medium text-ink">{prov.contacto}</p>
                                    <p className="text-xs text-muted font-mono">{prov.telefono} • {prov.email}</p>
                                </div>
                            ),
                            credito: `${prov.plazoCreditoDias} días`,
                            calificacion: (
                                <span className="inline-flex items-center gap-1 font-bold font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                                    ★ {prov.calificacion.toFixed(1)}
                                </span>
                            ),
                            estado: (
                                <Badge
                                    tone={
                                        prov.estado === 'homologado'
                                            ? 'ok'
                                            : prov.estado === 'en_evaluacion'
                                            ? 'warn'
                                            : 'danger'
                                    }
                                >
                                    {prov.estado === 'homologado'
                                        ? 'Homologado'
                                        : prov.estado === 'en_evaluacion'
                                        ? 'En Evaluación'
                                        : 'Observado'}
                                </Badge>
                            ),
                        };
                    })}
                />
            </Card>

            {/* Modal Nuevo Proveedor */}
            <Modal
                open={modalNuevoProv}
                onClose={() => setModalNuevoProv(false)}
                title="Homologar Nuevo Proveedor de Suministros"
                wide
            >
                <form onSubmit={handleGuardarProveedor} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="RUC (11 Dígitos)">
                            <Input
                                value={formRuc}
                                onChange={(e) => setFormRuc(e.target.value)}
                                placeholder="20XXXXXXXXX"
                                maxLength={11}
                                required
                            />
                        </Field>
                        <Field label="Razón Social Oficial">
                            <Input
                                value={formRazon}
                                onChange={(e) => setFormRazon(e.target.value)}
                                placeholder="Nombre de la empresa según SUNAT"
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Rubro Principal de Suministro">
                            <Select
                                value={formRubro}
                                onChange={(e) => setFormRubro(e.target.value)}
                            >
                                <option value="Ferretería y Acero Estructural">Ferretería y Acero Estructural</option>
                                <option value="Concreto Premezclado y Cemento">Concreto Premezclado y Cemento</option>
                                <option value="Agregados y Arena Gruesa">Agregados y Canteras</option>
                                <option value="Equipos de Protección Personal y SST">Equipos de Protección y SST</option>
                                <option value="Maquinaria Pesada y Fletes">Maquinaria Pesada y Fletes</option>
                            </Select>
                        </Field>
                        <Field label="Plazo de Crédito Comercial (Días)">
                            <Input
                                type="number"
                                value={formCredito}
                                onChange={(e) => setFormCredito(Number(e.target.value))}
                                min="0"
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Nombre del Contacto">
                            <Input
                                value={formContacto}
                                onChange={(e) => setFormContacto(e.target.value)}
                                placeholder="Ing. Contacto Comercial"
                                required
                            />
                        </Field>
                        <Field label="Teléfono Celular">
                            <Input
                                value={formTelefono}
                                onChange={(e) => setFormTelefono(e.target.value)}
                                placeholder="9XXXXXXXX"
                                required
                            />
                        </Field>
                        <Field label="Correo Electrónico">
                            <Input
                                type="email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                placeholder="ventas@proveedor.pe"
                                required
                            />
                        </Field>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalNuevoProv(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit">
                            Registrar y Homologar
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
