import type { Material } from '../types';

// Materiales con nomenclatura de las pantallas Stitch
// (Cemento Andino Tipo V, Acero Grado 60, agregados del Mantaro…).

export const materiales: Material[] = [
    {
        id: 'mat-cemento-1',
        nombre: 'Cemento Andino Tipo V',
        categoria: 'Cemento',
        unidad: 'bolsas',
        stockMinimo: 600,
    },
    {
        id: 'mat-cemento-2',
        nombre: 'Cemento Sol Tipo I',
        categoria: 'Cemento',
        unidad: 'bolsas',
        stockMinimo: 500,
    },
    {
        id: 'mat-acero',
        nombre: 'Acero Corrugado 5/8" Grado 60',
        categoria: 'Acero',
        unidad: 'kg',
        stockMinimo: 4000,
    },
    {
        id: 'mat-arena',
        nombre: 'Arena Gruesa',
        categoria: 'Agregados',
        unidad: 'm³',
        stockMinimo: 120,
    },
    {
        id: 'mat-grava',
        nombre: 'Grava Chancada 3/4"',
        categoria: 'Agregados',
        unidad: 'm³',
        stockMinimo: 150,
    },
    {
        id: 'mat-pvc',
        nombre: 'Tubería PVC SAP 4"',
        categoria: 'Tuberías',
        unidad: 'und',
        stockMinimo: 300,
    },
    {
        id: 'mat-ladrillo',
        nombre: 'Ladrillo King Kong 18 Huecos',
        categoria: 'Ladrillos',
        unidad: 'und',
        stockMinimo: 8000,
    },
];