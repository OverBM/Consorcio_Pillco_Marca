// Interfaces y Tipos TypeScript exhaustivos para el Sistema de Inventarios Multi-Almacén
// Basado en los Macroprocesos Bizagi 16 al 30 y roles operativos (PMI / PMU).

import type { Coord } from './index';

export type UrgenciaSolicitud = 'normal' | 'urgente' | 'critica';
export type EstadoSolicitud = 'pendiente' | 'asignado' | 'desabastecido' | 'despachado' | 'atendido';

export interface SolicitudMaterial {
    id: string;
    codigo: string; // ej: SOL-2026-001
    obraSolicitanteId: string;
    frenteNombre: string;
    frenteCoords: Coord;
    solicitanteNombre: string;
    rolSolicitante: string;
    fechaSolicitud: string;
    fechaRequerida: string;
    urgencia: UrgenciaSolicitud;
    materialId: string;
    cantidad: number;
    observaciones?: string;
    almacenAsignadoId?: string;
    distanciaAsignadaKm?: number;
    estado: EstadoSolicitud;
    despachoId?: string;
}

export type EstadoRequerimiento = 'borrador' | 'dentro_presupuesto' | 'requiere_aprobacion' | 'aprobado' | 'en_cotizacion' | 'atendido';

export interface RequerimientoItem {
    materialId: string;
    cantidad: number;
    costoEstimadoUnitario: number;
    subtotal: number;
}

export interface RequerimientoCompra {
    id: string;
    codigo: string; // ej: REQ-2026-004
    obraId: string;
    partidaPresupuestal: string;
    presupuestoAsignado: number;
    costoTotalEstimado: number;
    excedePresupuesto: boolean;
    montoExcedente: number;
    fechaEmision: string;
    fechaLimiteEntrega: string;
    solicitadoPor: string;
    justificacion: string;
    estado: EstadoRequerimiento;
    items: RequerimientoItem[];
    aprobacionAdicional?: {
        solicitada: boolean;
        autorizada?: boolean;
        fecha?: string;
        motivo?: string;
    };
}

export interface CotizacionProveedor {
    id: string;
    requerimientoId: string;
    proveedorRuc: string;
    proveedorNombre: string;
    precioTotalSoles: number;
    plazoEntregaDias: number;
    garantiaMeses: number;
    puntajeCalculado: number; // 0 a 100
    cumpleTecnico: boolean;
    esRecomendado: boolean;
    seleccionada?: boolean;
    observaciones?: string;
}

export type EstadoOrdenCompra = 'emitida' | 'confirmada_proveedor' | 'en_transporte' | 'recepcionada_parcial' | 'recepcionada_total' | 'cancelada';

export interface OrdenCompra {
    id: string;
    codigo: string; // ej: OC-2026-089
    requerimientoId: string;
    proveedorRuc: string;
    proveedorNombre: string;
    fechaEmision: string;
    fechaCompromisoEntrega: string;
    montoTotal: number;
    condicionesPago: string;
    lugarEntrega: string;
    almacenDestinoId: string;
    estado: EstadoOrdenCompra;
    items: {
        materialId: string;
        cantidad: number;
        precioUnitario: number;
        total: number;
    }[];
    transporteId?: string;
}

export type TipoTransporte = 'propio' | 'tercerizado';
export type EstadoTransporte = 'coordinado' | 'en_ruta' | 'entregado';

export interface CoordinacionTransporte {
    id: string;
    codigo: string; // ej: TR-2026-012
    ordenCompraId?: string;
    ordenTransferenciaId?: string;
    tipoTransporte: TipoTransporte;
    empresaTransporte?: string;
    placaVehiculo: string;
    conductorNombre: string;
    conductorLicencia: string;
    origenNombre: string;
    destinoNombre: string;
    fechaSalida: string;
    fechaEstimadaLlegada: string;
    costoFlete: number;
    estado: EstadoTransporte;
}

export type EstadoRecepcionCompra = 'conforme' | 'con_disconformidad';

export interface DisconformidadRecepcion {
    materialId: string;
    cantidadEsperada: number;
    cantidadRecibidaConforme: number;
    cantidadDisconforme: number;
    motivo: string;
    fotoSimuladaUrl?: string;
}

export interface RecepcionCompra {
    id: string;
    codigo: string; // ej: REC-2026-045
    ordenCompraId: string;
    guiaRemisionProveedor: string;
    almacenId: string;
    fechaRecepcion: string;
    almaceneroNombre: string;
    coordenadasGps: Coord;
    estado: EstadoRecepcionCompra;
    itemsConformes: {
        materialId: string;
        cantidad: number;
    }[];
    disconformidades?: DisconformidadRecepcion[];
    firmadoDigital: boolean;
    observaciones?: string;
}

export type EstadoTransferencia = 'borrador' | 'solicitada' | 'autorizada_logistica' | 'rechazada' | 'en_transito' | 'recibida_conforme' | 'recibida_con_incidencia';

export interface IncidenciaTransferencia {
    materialId: string;
    cantidadEnviada: number;
    cantidadRecibida: number;
    diferencia: number;
    descripcion: string;
    tipo: 'daño_transporte' | 'faltante' | 'error_despacho';
}

export interface OrdenTransferencia {
    id: string;
    codigo: string; // ej: TRF-2026-034
    origenAlmacenId: string;
    destinoAlmacenId: string;
    materialId: string;
    cantidad: number;
    esRedistribucionCierreObra?: boolean;
    obraCerradaId?: string;
    fechaSolicitud: string;
    solicitadoPor: string;
    motivo: string;
    estado: EstadoTransferencia;
    autorizadoPorLogistica?: boolean;
    fechaAutorizacion?: string;
    transporteId?: string;
    incidencia?: IncidenciaTransferencia;
    fechaRecepcion?: string;
    recibidoPor?: string;
}

export type TipoMerma = 'deterioro' | 'robo' | 'obsolescencia';

export interface RegistroMerma {
    id: string;
    codigo: string; // ej: MER-2026-015
    almacenId: string;
    materialId: string;
    cantidad: number;
    porcentajeDelStock: number;
    umbralTolerablePorcentaje: number; // ej: 3%
    superaUmbral: boolean;
    tipo: TipoMerma;
    fechaRegistro: string;
    registradoPor: string;
    descripcionCausa: string;
    bajaEfectuada: boolean;
    investigacionLogisticaRequerida: boolean;
    estadoInvestigacion?: 'pendiente' | 'en_proceso' | 'cerrada';
}

export type EstadoDevolucion = 'registrada' | 'en_reclamo_proveedor' | 'nota_credito_emitida' | 'reposicion_en_camino' | 'cerrada';

export interface DevolucionProveedor {
    id: string;
    codigo: string; // ej: DEV-2026-008
    recepcionId?: string;
    ordenCompraId: string;
    proveedorNombre: string;
    materialId: string;
    cantidadDevuelta: number;
    motivoDevolucion: string;
    fechaRegistro: string;
    fechaLimiteRespuesta: string;
    estado: EstadoDevolucion;
    numeroGuiaDevolucion: string;
    accionCompensatoria: 'reposicion_fisica' | 'nota_credito';
}

export interface InconsistenciaInventario {
    id: string;
    codigo: string; // ej: INC-2026-003
    tipoOperacion: 'transferencia' | 'despacho';
    operacionCodigo: string;
    origenAlmacenId: string;
    destinoAlmacenId: string;
    materialId: string;
    cantidadOrigen: number;
    cantidadDestinoConforme: number;
    mermaJustificada: number;
    saldoDiferencia: number;
    fechaDeteccion: string;
    estado: 'pendiente_revision' | 'auditado_logistica' | 'conciliado';
    responsableRevision: string;
}
