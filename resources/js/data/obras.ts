import type { Obra } from '../types';

// Obras simuladas con nomenclatura de las pantallas Stitch
// ("Stock Multi-Almacén", "Logística y Rutas", "Dashboard").

export const obras: Obra[] = [
    {
        id: 'obra-central',
        nombre: 'Almacén Central San Jerónimo',
        estado: 'activa',
        distrito: 'San Jerónimo de Tunán',
        responsable: 'Joel Rojas',
        descripcion: 'Centro logístico principal (Km 12 Carretera Central Norte). Abastece a todos los frentes.',
        coords: { lat: -11.955, lng: -75.276 },
        fechaInicio: '2024-01-10',
        pctAvance: 100,
    },
    {
        id: 'obra-eltambo',
        nombre: 'Frente Vía Expresa El Tambo',
        estado: 'activa',
        distrito: 'El Tambo',
        responsable: 'Ing. Marco Paucar',
        descripcion: 'Construcción de viaductos y vías de la Vía Expresa El Tambo.',
        coords: { lat: -12.0612, lng: -75.2097 },
        fechaInicio: '2025-03-02',
        pctAvance: 62,
    },
    {
        id: 'obra-puentecunas',
        nombre: 'Puente Cunas – Chupaca',
        estado: 'activa',
        distrito: 'Chupaca',
        responsable: 'Ing. Sara Velarde',
        descripcion: 'Puente vehicular y accesos sobre el río Cunas.',
        coords: { lat: -12.0601, lng: -75.2837 },
        fechaInicio: '2025-05-18',
        pctAvance: 48,
    },
    {
        id: 'obra-chilca',
        nombre: 'Conexión Mantaro – Chilca',
        estado: 'activa',
        distrito: 'Chilca',
        responsable: 'Ing. Diego Salazar',
        descripcion: 'Defensa ribereña y canalización de la margen del río Mantaro en Chilca.',
        coords: { lat: -12.082, lng: -75.185 },
        fechaInicio: '2025-07-01',
        pctAvance: 35,
    },
    {
        id: 'obra-ielosandes',
        nombre: 'IE Los Andes (Huancayo)',
        estado: 'cerrada',
        distrito: 'Huancayo',
        responsable: 'Ing. Marco Paucar',
        descripcion: 'Construcción de módulos educativos. OBRA CERRADA: almacén en desmovilización con sobrantes.',
        coords: { lat: -12.118, lng: -75.178 },
        fechaInicio: '2024-04-01',
        pctAvance: 100,
    },
];