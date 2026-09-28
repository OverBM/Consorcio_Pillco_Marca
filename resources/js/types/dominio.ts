// Tipos de dominio del prototipo (datos simulados).
// Nomenclatura coherente con las pantallas Stitch
// "Geolocated Construction Inventory System".

export type EstadoObra = 'activa' | 'en-cierre' | 'cerrada';

export type TipoAlmacen = 'central' | 'frente' | 'cantera';

export type EstadoStock = 'optimo' | 'bajo' | 'critico' | 'sobrante' | 'reservado' | 'inactivo';

export type TipoAlerta = 'critico' | 'sobrante' | 'vencimiento' | 'discrepancia';

export type EstadoDespacho = 'pendiente' | 'en-transito' | 'entregado';

export type EstadoRecepcion = 'pendiente' | 'confirmada';

export type CategoriaMaterial = 'Cemento' | 'Acero' | 'Agregados' | 'Tuberías' | 'Ladrillos' | 'Otros';

export type Rol =
    | 'jefe-almacen-central'
    | 'almacenero'
    | 'residente'
    | 'coordinador-logistico';

export interface Coord {
    lat: number;
    lng: number;
}

export interface Obra {
    id: string;
    nombre: string;
    estado: EstadoObra;
    distrito: string;
    responsable: string;
    descripcion: string;
    coords: Coord;
    fechaInicio: string;
    pctAvance: number;
}

export interface Almacen {
    id: string;
    obraId: string;
    nombre: string;
    tipo: TipoAlmacen;
    coords: Coord;
    capacidadM3: number;
}

export interface Material {
    id: string;
    nombre: string;
    categoria: CategoriaMaterial;
    unidad: string;
    stockMinimo: number;
}

/** Reserva de material "apartado para una partida del plan de obra" (Decisión 13). */
export interface PartidaReserva {
    partida: string;
    cantidad: number;
}

export interface Movimiento {
    id: string;
    fecha: string;
    almacenId: string;
    materialId: string;
    tipo: 'ingreso' | 'salida';
    cantidad: number;
    referencia: string;
    usuario: string;
}

export interface Despacho {
    id: string;
    codigo: string;
    materialId: string;
    cantidad: number;
    origenAlmacenId: string;
    destinoAlmacenId: string;
    estado: EstadoDespacho;
    vehiculoId?: string;
    responsable?: string;
    fechaSolicitud: string;
    fechaEntrega?: string;
    alertaId?: string;
    pctRuta?: number;
}

export interface Recepcion {
    id: string;
    codigo: string;
    origenTipo: 'proveedor' | 'otra-obra';
    origenTexto: string;
    referencia: string;
    materialId: string;
    cantidad: number;
    destinoAlmacenId: string;
    responsable: string;
    fecha: string;
    estado: EstadoRecepcion;
    conformidad: boolean;
    evidencia?: string;
}

export interface ObraReceptoraSugerida {
    almacenId: string;
    obraId: string;
    nombreObra: string;
    distrito: string;
    km: number;
}

export interface Alerta {
    id: string;
    tipo: TipoAlerta;
    materialId?: string;
    almacenId?: string;
    obraId?: string;
    mensaje: string;
    cantidad?: number;
    receptoras?: ObraReceptoraSugerida[];
    createdAt: string;
    resuelta: boolean;
}

export interface Vehiculo {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    capacidadKg: number;
    estado: 'disponible' | 'en-transito' | 'mantenimiento';
}

export interface Usuario {
    id: string;
    nombre: string;
    rol: Rol;
    obraId?: string;
}