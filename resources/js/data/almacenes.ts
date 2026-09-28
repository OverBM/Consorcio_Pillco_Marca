import type { Almacen } from '../types';

// Almacenes por obra (1 por obra salvo el central, que es el hub).
// El almacén de la obra cerrada queda "en desmovilización (cierre)" según
// la semántica registrada (Decisión 13).

export const almacenes: Almacen[] = [
    {
        id: 'alm-central',
        obraId: 'obra-central',
        nombre: 'Almacén Central San Jerónimo',
        tipo: 'central',
        coords: { lat: -11.955, lng: -75.276 },
        capacidadM3: 2500,
    },
    {
        id: 'alm-eltambo',
        obraId: 'obra-eltambo',
        nombre: 'Almacén Frente Vía Expresa',
        tipo: 'frente',
        coords: { lat: -12.0609, lng: -75.2106 },
        capacidadM3: 600,
    },
    {
        id: 'alm-cunas',
        obraId: 'obra-puentecunas',
        nombre: 'Almacén Puente Cunas',
        tipo: 'frente',
        coords: { lat: -12.0598, lng: -75.2845 },
        capacidadM3: 800,
    },
    {
        id: 'alm-chilca',
        obraId: 'obra-chilca',
        nombre: 'Almacén Conexión Chilca',
        tipo: 'frente',
        coords: { lat: -12.0826, lng: -75.1844 },
        capacidadM3: 500,
    },
    {
        id: 'alm-ielosandes',
        obraId: 'obra-ielosandes',
        nombre: 'Almacén IE Los Andes (desmovilización)',
        tipo: 'frente',
        coords: { lat: -12.1182, lng: -75.1776 },
        capacidadM3: 400,
    },
];