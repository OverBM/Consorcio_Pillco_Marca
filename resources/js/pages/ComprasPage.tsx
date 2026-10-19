// Hub del módulo de Compras y Abastecimiento (Macroprocesos MP-16 a MP-19).
// Accesos directos a los subprocesos operativos del ciclo de abastecimiento.

import { Link } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui';
import {
    IconBoxes,
    IconFileText,
    IconRepeat,
    IconShoppingCart,
    IconTrendingUp,
    IconUserCheck,
} from '../components/icons';

interface Acceso {
    href: string;
    titulo: string;
    descripcion: string;
    icon: typeof IconShoppingCart;
}

const ACCESOS: Acceso[] = [
    {
        href: '/compras/requerimientos',
        titulo: 'Requerimientos de Compra',
        descripcion:
            'Solicitudes de materiales por obra con flujo de aprobación.',
        icon: IconShoppingCart,
    },
    {
        href: '/compras/cotizaciones',
        titulo: 'Cotizaciones y Cuadro Comparativo',
        descripcion:
            'Registro de ofertas de proveedores y selección de la ganadora.',
        icon: IconTrendingUp,
    },
    {
        href: '/compras/ordenes-compra',
        titulo: 'Órdenes de Compra',
        descripcion: 'Emisión formal de compromisos de adquisición y destino.',
        icon: IconBoxes,
    },
    {
        href: '/compras/proveedores',
        titulo: 'Proveedores',
        descripcion: 'Padrón de proveedores, RUC, contacto y calificación.',
        icon: IconUserCheck,
    },
    {
        href: '/compras/devoluciones',
        titulo: 'Devoluciones a Proveedor',
        descripcion: 'Actas de no conformidad y egreso de inventario.',
        icon: IconRepeat,
    },
    {
        href: '/recepcion',
        titulo: 'Recepciones',
        descripcion: 'Conformidad de ingreso de materiales al almacén.',
        icon: IconFileText,
    },
];

export default function ComprasPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Compras y Abastecimiento"
                subtitle="Ciclo completo de requerimientos, cotizaciones, órdenes de compra, proveedores y devoluciones"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ACCESOS.map((acceso) => {
                    const Icon = acceso.icon;
                    return (
                        <Link
                            key={acceso.href}
                            href={acceso.href}
                            className="group"
                        >
                            <Card className="group-hover:border-brand-300 group-hover:shadow-card h-full p-5 transition-all">
                                <div className="flex items-start gap-3">
                                    <span className="bg-brand-50 text-brand-600 rounded-lg p-2.5">
                                        <Icon size={20} />
                                    </span>
                                    <div>
                                        <p className="text-ink font-bold">
                                            {acceso.titulo}
                                        </p>
                                        <p className="text-muted mt-1 text-xs">
                                            {acceso.descripcion}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
