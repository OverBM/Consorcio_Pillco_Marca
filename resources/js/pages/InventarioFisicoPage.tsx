import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconBoxes, IconCheckCircle, IconSearch, IconAlertTriangle } from '../components/icons';
import { useAppStore } from '../store/AppContext';
import { formatNum } from '../utils/format';

export default function InventarioFisicoPage() {
    const { almacenes, materiales } = useAppStore();
    const [almacenId, setAlmacenId] = useState(almacenes[0]?.id ?? '');

    const conteosMock = [
        { id: '1', material: 'Cemento Andino Tipo I', unidad: 'Bolsas', cantSistema: 350, cantContada: 348, dif: -2, estado: 'ajustado' },
        { id: '2', material: 'Acero Corrugado 1/2"', unidad: 'Varillas', cantSistema: 500, cantContada: 500, dif: 0, estado: 'conforme' },
        { id: '3', material: 'Arena Gruesa Río Mantaro', unidad: 'M3', cantSistema: 45, cantContada: 47, dif: +2, estado: 'ajustado' },
        { id: '4', material: 'Pintura Tráfico Amarilla', unidad: 'Galones', cantSistema: 20, cantContada: 20, dif: 0, estado: 'conforme' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Inventario Físico a Ciegas"
                subtitle="Programación de tomas físicas de inventario, conteos ciegos y conciliación automática de faltantes / sobrantes"
            />

            <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-muted">Almacén en Auditoría:</span>
                <select
                    value={almacenId}
                    onChange={(e) => setAlmacenId(e.target.value)}
                    className="rounded-field border border-line bg-canvas px-3 py-1.5 text-xs text-ink outline-none"
                >
                    {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.nombre}
                        </option>
                    ))}
                </select>
            </Card>

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin registros de inventario físico."
                    columns={[
                        { key: 'material', header: 'Material' },
                        { key: 'unidad', header: 'Unidad', align: 'center', mono: true },
                        { key: 'cantSistema', header: 'Stock en Sistema', align: 'right', mono: true },
                        { key: 'cantContada', header: 'Conteo Físico Real', align: 'right', mono: true },
                        {
                            key: 'dif',
                            header: 'Diferencia',
                            align: 'right',
                            cell: (r) => {
                                const dif = (r as { dif?: number }).dif ?? 0;
                                return (
                                    <span className={`font-mono font-bold text-xs ${dif < 0 ? 'text-red-600' : dif > 0 ? 'text-emerald-600' : 'text-muted'}`}>
                                        {dif > 0 ? `+${dif}` : dif}
                                    </span>
                                );
                            },
                        },
                        {
                            key: 'estado',
                            header: 'Estado Conciliación',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'conforme' ? 'ok' : 'violet'}>
                                        {estado === 'conforme' ? 'Exacto' : 'Ajustado en Kardex'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={conteosMock.map((c) => ({
                        id: c.id,
                        material: c.material,
                        unidad: c.unidad,
                        cantSistema: formatNum(c.cantSistema),
                        cantContada: formatNum(c.cantContada),
                        dif: c.dif,
                        estado: c.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
