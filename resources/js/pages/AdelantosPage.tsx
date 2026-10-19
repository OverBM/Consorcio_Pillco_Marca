import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { formatMoneda } from '../utils/format';

export default function AdelantosPage() {
    const adelantosMock = [
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Adelantos y Cuenta Fideicomitente"
                subtitle="Control de desembolsos, cuentas fideicomiso bancarias y amortización en valorizaciones"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin adelantos registrados."
                    columns={[
                        { key: 'tipo', header: 'Tipo de Adelanto', mono: true },
                        {
                            key: 'monto',
                            header: 'Monto Otorgado',
                            align: 'right',
                            mono: true,
                        },
                        { key: 'banco', header: 'Banco Fideicomitente' },
                        { key: 'garantia', header: 'Garantía / Fianza' },
                        {
                            key: 'amortizado',
                            header: 'Monto Amortizado',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'saldo',
                            header: 'Saldo por Amortizar',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string })
                                    .estado;
                                return (
                                    <Badge
                                        tone={
                                            estado === 'en_amortizacion'
                                                ? 'ok'
                                                : 'neutral'
                                        }
                                    >
                                        {estado === 'en_amortizacion'
                                            ? 'En Amortización'
                                            : 'Cancelado'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={adelantosMock.map((a) => ({
                        id: a.id,
                        tipo: a.tipo.toUpperCase(),
                        monto: formatMoneda(a.monto),
                        banco: a.banco,
                        garantia: a.garantia,
                        amortizado: formatMoneda(a.amortizado),
                        saldo: formatMoneda(a.saldo),
                        estado: a.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
