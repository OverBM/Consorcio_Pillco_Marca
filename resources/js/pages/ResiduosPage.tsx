import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconBoxes, IconRepeat, IconTruck } from '../components/icons';

export default function ResiduosPage() {
    const residuosMock = [
        { id: '1', descripcion: 'Desmonte limpio de excavación masiva', clase: 'reutilizable', volumen: '120.00 M3', destino: 'Relleno de terraplén margen izquierda', eors: 'Uso Interno en Obra', estado: 'dispuesto' },
        { id: '2', descripcion: 'Retazos de madera de encofrado recuperables', clase: 'reutilizable', volumen: '15.00 M3', destino: 'Estacas de trazo topográfico', eors: 'Transferencia a Obra Sicaya', estado: 'en_acopio' },
        { id: '3', descripcion: 'Sacos de cemento vacíos y plásticos de embalaje', clase: 'no_peligroso', volumen: '4.50 M3', destino: 'Reciclaje y valorización', eors: 'ECO AMBIENTAL HUANCAYO SAC', estado: 'manifiesto_emitido' },
        { id: '4', descripcion: 'Trapos y envases con restos de hidrocarburos / aceite', clase: 'peligroso', volumen: '0.80 M3', destino: 'Relleno de seguridad autorizado', eors: 'BEFESA PERU S.A.', estado: 'manifiesto_emitido' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión Integral de Residuos y Desmonte"
                subtitle="Clasificación en fuente, economía circular (reutilización inter-obras) y manifiestos de disposición final vía EO-RS"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin residuos registrados."
                    columns={[
                        { key: 'descripcion', header: 'Descripción del Residuo / Material' },
                        {
                            key: 'clase',
                            header: 'Clasificación',
                            cell: (r) => {
                                const clase = (r as { clase?: string }).clase;
                                return (
                                    <Badge tone={clase === 'reutilizable' ? 'ok' : clase === 'no_peligroso' ? 'neutral' : 'danger'}>
                                        {clase === 'reutilizable' ? 'Reutilizable (Circular)' : clase === 'no_peligroso' ? 'No Peligroso' : 'Peligroso'}
                                    </Badge>
                                );
                            },
                        },
                        { key: 'volumen', header: 'Volumen', align: 'right', mono: true },
                        { key: 'destino', header: 'Destino / Aplicación' },
                        { key: 'eors', header: 'Empresa EO-RS / Destino Final' },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'dispuesto' ? 'ok' : 'warn'}>
                                        {estado === 'dispuesto' ? 'Dispuesto / Reutilizado' : 'En Acopio'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={residuosMock.map((res) => ({
                        id: res.id,
                        descripcion: res.descripcion,
                        clase: res.clase,
                        volumen: res.volumen,
                        destino: res.destino,
                        eors: res.eors,
                        estado: res.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
