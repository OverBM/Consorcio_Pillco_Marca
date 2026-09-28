import type { Usuario, Vehiculo } from '../types';

// Usuarios simulados (roles del sistema) y flota de transporte.
// Placas como en la pantalla Stitch "Logística y Rutas" (W4T-892, AYV-710).

export const usuarios: Usuario[] = [
    { id: 'usr-1', nombre: 'Joel Rojas', rol: 'jefe-almacen-central', obraId: 'obra-central' },
    { id: 'usr-2', nombre: 'María Llanos', rol: 'almacenero', obraId: 'obra-eltambo' },
    { id: 'usr-3', nombre: 'Ing. Marco Paucar', rol: 'residente', obraId: 'obra-eltambo' },
    { id: 'usr-4', nombre: 'Ing. Sara Velarde', rol: 'residente', obraId: 'obra-puentecunas' },
    { id: 'usr-5', nombre: 'César Huamán', rol: 'coordinador-logistico' },
    { id: 'usr-6', nombre: 'Ing. Diego Salazar', rol: 'residente', obraId: 'obra-chilca' },
];

export const vehiculos: Vehiculo[] = [
    { id: 'veh-1', placa: 'W4T-892', marca: 'Volvo', modelo: 'FMX 12x4R', capacidadKg: 20000, estado: 'en-transito' },
    { id: 'veh-2', placa: 'AYV-710', marca: 'Mitsubishi', modelo: 'Fuso 8x4', capacidadKg: 15000, estado: 'disponible' },
    { id: 'veh-3', placa: 'W4T-931', marca: 'Mercedes-Benz', modelo: 'Actros 3348', capacidadKg: 18000, estado: 'disponible' },
    { id: 'veh-4', placa: 'W4T-078', marca: 'Scania', modelo: 'P360 8x4', capacidadKg: 16000, estado: 'mantenimiento' },
];