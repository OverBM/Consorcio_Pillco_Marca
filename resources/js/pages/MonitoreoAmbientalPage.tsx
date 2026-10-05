import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconCheckCircle, IconAlertTriangle } from '../components/icons';

export default function MonitoreoAmbientalPage() {
    const medicionesMock = [
        { id: '1', indicador: 'Nivel de Presión Sonora Diurno (Ruido)', unidad: 'dBA', limite: 85.0, valor: 78.4, fueraLimite: false, fecha: '2026-10-04 10:00', estacion: 'Estación E-1 (Frente Puente)' },
        { id: '2', indicador: 'Material Particulado PM10 (Polvo)', unidad: 'µg/m3', limite: 100.0, valor: 65.2, fueraLimite: false, fecha: '2026-10-04 11:30', estacion: 'Estación E-2 (Zona Acopio)' },
        { id: '3', indicador: 'Nivel de Presión Sonora Diurno (Ruido)', unidad: 'dBA', limite: 85.0, valor: 91.2, fueraLimite: true, fecha: '2026-10-03 16:00', estacion: 'Estación E-3 (Compresora)', medida: 'Silenciador instalado en compresora' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Monitoreo Ambiental y Cumplimiento de LMP"
                subtitle="Registro de parámetros de calidad de aire, ruido ambiental y agua con detección automática de superación de límites permisibles"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin mediciones ambientales registradas."
                    columns={[
                        { key: 'estacion', header: 'Punto / Estación de Monitoreo' },
                        { key: 'indicador', header: 'Parámetro Ambiental' },
                        { key: 'fecha', header: 'Fecha y Hora', mono: true },
                        { key: 'limite', header: 'LMP Normativo', align: 'right', mono: true },
                        { key: 'valor', header: 'Valor Medido', align: 'right', mono: true },
                        {
                            key: 'estado',
                            header: 'Cumplimiento',
                            align: 'center',
                            cell: (r) => {
                                const fuera = (r as { fuera?: boolean }).fuera;
                                return (
                                    <Badge tone={fuera ? 'danger' : 'ok'}>
                                        {fuera ? 'Supera LMP' : 'Dentro de Norma'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={medicionesMock.map((m) => ({
                        id: m.id,
                        estacion: m.estacion,
                        indicador: m.indicador,
                        fecha: m.fecha,
                        limite: `${m.limite} ${m.unidad}`,
                        valor: `${m.valor} ${m.unidad}`,
                        fuera: m.fueraLimite,
                    }))}
                />
            </Card>
        </div>
    );
}
