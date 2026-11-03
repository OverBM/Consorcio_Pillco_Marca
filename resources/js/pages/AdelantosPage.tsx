import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { KpiTile } from '../design-system/KpiTile';
import { formatMoneda } from '../utils/format';

interface AdelantoFila {
    id: string;
    tipo: string;
    monto: number;
    banco: string;
    garantia: string;
    amortizado: number | null;
    saldo: number | null;
    estado: string;
    obra?: string;
}

interface AdelantosPageProps {
    obrasDb?: { id: number | string; nombre: string }[];
    adelantosDb?: AdelantoFila[];
    totalOtorgado?: number;
}

const ADELANTOS_DEMO: AdelantoFila[] = [
    {
        id: '1',
        tipo: 'Directo',
        monto: 350000.0,
        banco: 'Banco de Crédito del Perú (Fideicomiso)',
        garantia: 'Carta Fianza N° CF-8812-BCP',
        amortizado: 175000.0,
        saldo: 175000.0,
        estado: 'en_amortizacion',
    },
    {
        id: '2',
        tipo: 'Materiales',
        monto: 450000.0,
        banco: 'BBVA Perú (Cuenta Fideicomitente)',
        garantia: 'Póliza de Caución N° PC-9921',
        amortizado: 300000.0,
        saldo: 150000.0,
        estado: 'en_amortizacion',
    },
];

const etiquetaEstado = (estado: string): string => {
    if (estado === 'en_amortizacion') {
        return 'En Amortización';
    }
    if (estado === 'cancelado') {
        return 'Cancelado';
    }

    return estado.charAt(0).toUpperCase() + estado.slice(1).replace('_', ' ');
};

export default function AdelantosPage({
    obrasDb = [],
    adelantosDb = [],
    totalOtorgado = 0,
}: AdelantosPageProps) {
    const usaDatosReales = adelantosDb.length > 0;
    const filas = usaDatosReales ? adelantosDb : ADELANTOS_DEMO;

    const totales = useMemo(() => {
        const otorgado = filas.reduce(
            (acc, fila) => acc + Number(fila.monto ?? 0),
            0,
        );
        const amortizado = filas.reduce(
            (acc, fila) => acc + Number(fila.amortizado ?? 0),
            0,
        );

        return {
            otorgado: totalOtorgado > 0 ? totalOtorgado : otorgado,
            amortizado,
            saldo: otorgado - amortizado,
            enAmortizacion: filas.filter(
                (fila) => fila.estado === 'en_amortizacion',
            ).length,
        };
    }, [filas, totalOtorgado]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Adelantos y Cuenta Fideicomitente"
                subtitle="Control de desembolsos, cuentas fideicomiso bancarias y amortización en valorizaciones"
            />

            {!usaDatosReales && (
                <div className="border-atencion/30 bg-atencion-soft text-atencion rounded-xl border px-3 py-2 text-xs">
                    <Badge tone="warn">Vista demostrativa</Badge>{' '}
                    Aún no hay adelantos registrados en la base de datos. Se
                    muestra la estructura de ejemplo.
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiTile
                    label="Total otorgado"
                    value={totales.otorgado}
                    formato="moneda"
                    variante="dark"
                    detalle={`${filas.length} adelantos registrados`}
                />
                <KpiTile
                    label="Total amortizado"
                    value={totales.amortizado}
                    formato="moneda"
                    detalle={
                        usaDatosReales
                            ? 'Según eventos de amortización'
                            : 'Vista demostrativa'
                    }
                />
                <KpiTile
                    label="Saldo por amortizar"
                    value={totales.saldo}
                    formato="moneda"
                    variante="brand"
                    detalle="Monto pendiente de descuento"
                />
                <KpiTile
                    label="En amortización"
                    value={totales.enAmortizacion}
                    detalle={`${obrasDb.length} obras en cartera`}
                    progreso={
                        filas.length > 0
                            ? (totales.enAmortizacion / filas.length) * 100
                            : null
                    }
                    progresoTono="warn"
                />
            </div>

            <Card className="p-5">
                <DataTable<AdelantoFila>
                    emptyLabel="Sin adelantos registrados."
                    columns={[
                        {
                            key: 'tipo',
                            header: 'Tipo de Adelanto',
                            mono: true,
                            cell: (fila) => fila.tipo.toUpperCase(),
                        },
                        {
                            key: 'monto',
                            header: 'Monto Otorgado',
                            align: 'right',
                            mono: true,
                            cell: (fila) => formatMoneda(Number(fila.monto)),
                        },
                        { key: 'banco', header: 'Banco Fideicomitente' },
                        { key: 'garantia', header: 'Garantía / Fianza' },
                        {
                            key: 'amortizado',
                            header: 'Monto Amortizado',
                            align: 'right',
                            mono: true,
                            cell: (fila) =>
                                fila.amortizado === null
                                    ? '—'
                                    : formatMoneda(Number(fila.amortizado)),
                        },
                        {
                            key: 'saldo',
                            header: 'Saldo por Amortizar',
                            align: 'right',
                            mono: true,
                            cell: (fila) =>
                                fila.saldo === null
                                    ? '—'
                                    : formatMoneda(Number(fila.saldo)),
                        },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (fila) => (
                                <Badge
                                    tone={
                                        fila.estado === 'en_amortizacion'
                                            ? 'ok'
                                            : 'neutral'
                                    }
                                >
                                    {etiquetaEstado(fila.estado)}
                                </Badge>
                            ),
                        },
                    ]}
                    rows={filas}
                />
            </Card>
        </div>
    );
}
