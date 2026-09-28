// Reducer central del sistema de inventarios multi-almacén (Zustand-like puro con useReducer).
// Maneja todo el ciclo de vida de los procesos Bizagi 16 al 30:
// Solicitudes, Requerimientos, Cotizaciones, OC, Recepción, Despacho, Transferencias, Mermas, Devoluciones e Inconsistencias.

import type {
    Alerta,
    AppRoleId,
    CoordinacionTransporte,
    CotizacionProveedor,
    Despacho,
    DevolucionProveedor,
    EstadoDespacho,
    IncidenciaTransferencia,
    InconsistenciaInventario,
    Movimiento,
    OrdenCompra,
    OrdenTransferencia,
    Recepcion,
    RegistroMerma,
    RequerimientoCompra,
    SolicitudMaterial,
} from '../types';

import { stockInicial, type StockState } from '../data/stock';
import { recepciones as recepcionesIniciales } from '../data/recepciones';
import { despachosIniciales } from '../data/despachos';
import { movimientosRecientes } from '../data/movimientos';
import { solicitudesIniciales } from '../data/solicitudes';
import {
    cotizacionesIniciales,
    ordenesCompraIniciales,
    requerimientosIniciales,
    transportesIniciales,
} from '../data/requerimientos';
import { transferenciasIniciales } from '../data/transferencias';
import { devolucionesIniciales, inconsistenciasIniciales, mermasIniciales } from '../data/mermas';

export const SCHEMA_VERSION = 'cpm_v3_multialmacen_2026';

export interface AppState {
    schemaVersion: string;
    rolActivo: AppRoleId;
    obraActivaId: string;
    ackedAlertIds: string[];
    stock: StockState;
    solicitudes: SolicitudMaterial[];
    requerimientos: RequerimientoCompra[];
    cotizaciones: CotizacionProveedor[];
    ordenesCompra: OrdenCompra[];
    transportes: CoordinacionTransporte[];
    recepciones: Recepcion[];
    despachos: Despacho[];
    transferencias: OrdenTransferencia[];
    mermas: RegistroMerma[];
    devoluciones: DevolucionProveedor[];
    inconsistencias: InconsistenciaInventario[];
    movimientos: Movimiento[];
}

export type Action =
    | { type: 'SELECT_OBRA'; obraId: string }
    | { type: 'SET_ROL'; rol: AppRoleId }
    | { type: 'ACK_ALERT'; alertId: string }
    | { type: 'CREATE_SOLICITUD'; solicitud: Omit<SolicitudMaterial, 'id' | 'codigo'> }
    | { type: 'CREATE_REQUERIMIENTO'; requerimiento: Omit<RequerimientoCompra, 'id' | 'codigo'> }
    | { type: 'APPROVE_REQUERIMIENTO'; requerimientoId: string }
    | { type: 'CREATE_COTIZACION'; cotizacion: Omit<CotizacionProveedor, 'id'> }
    | { type: 'SELECT_COTIZACION'; cotizacionId: string }
    | { type: 'CREATE_ORDEN_COMPRA'; ordenCompra: Omit<OrdenCompra, 'id' | 'codigo'> }
    | { type: 'CREATE_RECEPCION'; recepcion: any }
    | { type: 'CONFIRM_RECEIPT'; recepcionId: string }
    | { type: 'CREATE_DESPACHO'; despacho: any }
    | { type: 'START_TRANSITO'; despachoId: string; vehiculoId: string; responsable: string }
    | { type: 'UPDATE_DESPACHO'; despachoId: string; patch: { estado?: EstadoDespacho; pctRuta?: number } }
    | { type: 'CREATE_TRANSFERENCIA'; transferencia: Omit<OrdenTransferencia, 'id' | 'codigo'> }
    | { type: 'AUTHORIZE_TRANSFERENCIA'; transferenciaId: string }
    | {
          type: 'RECEIVE_TRANSFERENCIA';
          transferenciaId: string;
          cantidadRecibida: number;
          incidencia?: IncidenciaTransferencia;
          recibidoPor: string;
      }
    | { type: 'CREATE_MERMA'; merma: Omit<RegistroMerma, 'id' | 'codigo'> }
    | { type: 'CREATE_DEVOLUCION'; devolucion: Omit<DevolucionProveedor, 'id' | 'codigo'> }
    | { type: 'RESOLVE_INCONSISTENCIA'; inconsistenciaId: string; motivo: string }
    | { type: 'RESET_ALL_DATA' };

export function initialState(): AppState {
    return {
        schemaVersion: SCHEMA_VERSION,
        rolActivo: 'jefe_logistica',
        obraActivaId: 'obra-eltambo',
        ackedAlertIds: [],
        stock: structuredClone(stockInicial),
        solicitudes: structuredClone(solicitudesIniciales),
        requerimientos: structuredClone(requerimientosIniciales),
        cotizaciones: structuredClone(cotizacionesIniciales),
        ordenesCompra: structuredClone(ordenesCompraIniciales),
        transportes: structuredClone(transportesIniciales),
        recepciones: structuredClone(recepcionesIniciales),
        despachos: structuredClone(despachosIniciales),
        transferencias: structuredClone(transferenciasIniciales),
        mermas: structuredClone(mermasIniciales),
        devoluciones: structuredClone(devolucionesIniciales),
        inconsistencias: structuredClone(inconsistenciasIniciales),
        movimientos: structuredClone(movimientosRecientes),
    };
}

let seqSol = 4;
let seqReq = 4;
let seqOC = 90;
let seqTrf = 4;
let seqMer = 4;
let seqDev = 2;
let seqInc = 2;
let seqRec = 46;
let seqDesp = 104;

function sumarStock(al: string, mat: string, delta: number, stock: StockState): StockState {
    const next = structuredClone(stock);
    next.stock[al] = { ...(next.stock[al] ?? {}) };
    const actual = next.stock[al][mat] ?? 0;
    next.stock[al][mat] = Math.max(0, actual + delta);
    return next;
}

export function proximaCodigoDespacho(): string {
    return `D-2026-${String(seqDesp++).padStart(3, '0')}`;
}

export function appReducer(state: AppState, action: Action): AppState {
    const ahora = new Date().toISOString().slice(0, 16).replace('T', ' ');

    switch (action.type) {
        case 'SELECT_OBRA':
            return { ...state, obraActivaId: action.obraId };

        case 'SET_ROL':
            return { ...state, rolActivo: action.rol };

        case 'ACK_ALERT':
            return {
                ...state,
                ackedAlertIds: state.ackedAlertIds.includes(action.alertId)
                    ? state.ackedAlertIds
                    : [...state.ackedAlertIds, action.alertId],
            };

        case 'CREATE_SOLICITUD': {
            const nueva: SolicitudMaterial = {
                ...action.solicitud,
                id: `sol-${Date.now()}`,
                codigo: `SOL-2026-${String(seqSol++).padStart(3, '0')}`,
            };
            return { ...state, solicitudes: [nueva, ...state.solicitudes] };
        }

        case 'CREATE_REQUERIMIENTO': {
            const nuevo: RequerimientoCompra = {
                ...action.requerimiento,
                id: `req-${Date.now()}`,
                codigo: `REQ-2026-${String(seqReq++).padStart(3, '0')}`,
            };
            return { ...state, requerimientos: [nuevo, ...state.requerimientos] };
        }

        case 'APPROVE_REQUERIMIENTO': {
            return {
                ...state,
                requerimientos: state.requerimientos.map((r) =>
                    r.id === action.requerimientoId
                        ? {
                              ...r,
                              estado: 'aprobado',
                              aprobacionAdicional: r.aprobacionAdicional
                                  ? { ...r.aprobacionAdicional, autorizada: true, fecha: ahora }
                                  : undefined,
                          }
                        : r,
                ),
            };
        }

        case 'CREATE_COTIZACION': {
            const nueva: CotizacionProveedor = {
                ...action.cotizacion,
                id: `cot-${Date.now()}`,
            };
            return { ...state, cotizaciones: [nueva, ...state.cotizaciones] };
        }

        case 'SELECT_COTIZACION': {
            return {
                ...state,
                cotizaciones: state.cotizaciones.map((c) =>
                    c.id === action.cotizacionId
                        ? { ...c, seleccionada: true }
                        : c.requerimientoId ===
                          state.cotizaciones.find((x) => x.id === action.cotizacionId)?.requerimientoId
                        ? { ...c, seleccionada: false }
                        : c,
                ),
            };
        }

        case 'CREATE_ORDEN_COMPRA': {
            const nueva: OrdenCompra = {
                ...action.ordenCompra,
                id: `oc-${Date.now()}`,
                codigo: `OC-2026-${String(seqOC++).padStart(3, '0')}`,
            };
            // Actualizar estado del requerimiento asociado
            const requerimientos = state.requerimientos.map((r) =>
                r.id === nueva.requerimientoId ? { ...r, estado: 'atendido' as const } : r,
            );
            return { ...state, ordenesCompra: [nueva, ...state.ordenesCompra], requerimientos };
        }

        case 'CREATE_RECEPCION': {
            const { recepcion } = action;
            const nueva: Recepcion = {
                id: `rec-${Date.now()}`,
                codigo: `REC-2026-${String(seqRec++).padStart(3, '0')}`,
                origenTipo: recepcion.origenTipo ?? 'proveedor',
                origenTexto: recepcion.origenTexto ?? 'Proveedor',
                referencia: recepcion.referencia ?? 'Guía de Remisión',
                materialId: recepcion.materialId,
                cantidad: recepcion.cantidad,
                destinoAlmacenId: recepcion.destinoAlmacenId,
                responsable: recepcion.responsable ?? 'Almacenero',
                fecha: ahora,
                estado: 'pendiente',
                conformidad: false,
                evidencia: recepcion.evidencia,
            };
            return { ...state, recepciones: [nueva, ...state.recepciones] };
        }

        case 'CONFIRM_RECEIPT': {
            const rec = state.recepciones.find((r) => r.id === action.recepcionId);
            if (!rec || rec.estado === 'confirmada') return state;

            const stock = sumarStock(rec.destinoAlmacenId, rec.materialId, rec.cantidad, state.stock);
            const mov: Movimiento = {
                id: `mov-${Date.now()}`,
                fecha: ahora,
                almacenId: rec.destinoAlmacenId,
                materialId: rec.materialId,
                tipo: 'ingreso',
                cantidad: rec.cantidad,
                referencia: rec.referencia,
                usuario: rec.responsable,
            };
            return {
                ...state,
                stock,
                movimientos: [mov, ...state.movimientos],
                recepciones: state.recepciones.map((r) =>
                    r.id === rec.id ? { ...r, estado: 'confirmada', conformidad: true } : r,
                ),
            };
        }

        case 'CREATE_DESPACHO': {
            const { despacho } = action;
            const disponible = state.stock.stock[despacho.origenAlmacenId]?.[despacho.materialId] ?? 0;
            if (despacho.cantidad > disponible || despacho.cantidad <= 0) return state;

            const nuevo: Despacho = {
                id: `desp-${Date.now()}`,
                codigo: despacho.codigo ?? proximaCodigoDespacho(),
                materialId: despacho.materialId,
                cantidad: despacho.cantidad,
                origenAlmacenId: despacho.origenAlmacenId,
                destinoAlmacenId: despacho.destinoAlmacenId,
                estado: 'pendiente',
                fechaSolicitud: ahora,
                alertaId: despacho.alertaId,
            };

            // Descuento inmediato de stock al emitir Guía de Salida Digital (Bizagi 26)
            const stock = sumarStock(despacho.origenAlmacenId, despacho.materialId, -despacho.cantidad, state.stock);
            const movSalida: Movimiento = {
                id: `mov-${Date.now()}-sal`,
                fecha: ahora,
                almacenId: despacho.origenAlmacenId,
                materialId: despacho.materialId,
                tipo: 'salida',
                cantidad: despacho.cantidad,
                referencia: nuevo.codigo,
                usuario: 'Almacenero Origen',
            };

            return {
                ...state,
                stock,
                movimientos: [movSalida, ...state.movimientos],
                despachos: [nuevo, ...state.despachos],
            };
        }

        case 'START_TRANSITO': {
            return {
                ...state,
                despachos: state.despachos.map((d) =>
                    d.id === action.despachoId
                        ? {
                              ...d,
                              estado: 'en-transito',
                              vehiculoId: action.vehiculoId,
                              responsable: action.responsable,
                              pctRuta: 0.5, // camión estático en punto medio
                          }
                        : d,
                ),
            };
        }

        case 'UPDATE_DESPACHO': {
            const despacho = state.despachos.find((d) => d.id === action.despachoId);
            if (!despacho) return state;
            const patch = action.patch;

            if (patch.estado === 'entregado' && despacho.estado !== 'entregado') {
                const stock = sumarStock(despacho.destinoAlmacenId, despacho.materialId, despacho.cantidad, state.stock);
                const movIngreso: Movimiento = {
                    id: `mov-${Date.now()}-ing`,
                    fecha: ahora,
                    almacenId: despacho.destinoAlmacenId,
                    materialId: despacho.materialId,
                    tipo: 'ingreso',
                    cantidad: despacho.cantidad,
                    referencia: despacho.codigo,
                    usuario: despacho.responsable ?? 'Conductor',
                };
                const ack = despacho.alertaId ? [despacho.alertaId, ...state.ackedAlertIds] : state.ackedAlertIds;

                return {
                    ...state,
                    stock,
                    ackedAlertIds: ack,
                    movimientos: [movIngreso, ...state.movimientos],
                    despachos: state.despachos.map((d) =>
                        d.id === action.despachoId
                            ? { ...d, estado: 'entregado', pctRuta: 1, fechaEntrega: ahora }
                            : d,
                    ),
                };
            }

            return {
                ...state,
                despachos: state.despachos.map((d) =>
                    d.id === action.despachoId ? { ...d, ...patch } : d,
                ),
            };
        }

        case 'CREATE_TRANSFERENCIA': {
            const nueva: OrdenTransferencia = {
                ...action.transferencia,
                id: `trf-${Date.now()}`,
                codigo: `TRF-2026-${String(seqTrf++).padStart(3, '0')}`,
            };
            return { ...state, transferencias: [nueva, ...state.transferencias] };
        }

        case 'AUTHORIZE_TRANSFERENCIA': {
            return {
                ...state,
                transferencias: state.transferencias.map((t) =>
                    t.id === action.transferenciaId
                        ? {
                              ...t,
                              estado: 'autorizada_logistica',
                              autorizadoPorLogistica: true,
                              fechaAutorizacion: ahora,
                          }
                        : t,
                ),
            };
        }

        case 'RECEIVE_TRANSFERENCIA': {
            const trf = state.transferencias.find((t) => t.id === action.transferenciaId);
            if (!trf) return state;

            // Descuenta origen, suma conforme a destino
            const s1 = sumarStock(trf.origenAlmacenId, trf.materialId, -trf.cantidad, state.stock);
            const stockFinal = sumarStock(trf.destinoAlmacenId, trf.materialId, action.cantidadRecibida, s1);

            const movS: Movimiento = {
                id: `mov-${Date.now()}-trf-s`,
                fecha: ahora,
                almacenId: trf.origenAlmacenId,
                materialId: trf.materialId,
                tipo: 'salida',
                cantidad: trf.cantidad,
                referencia: trf.codigo,
                usuario: 'Logística',
            };
            const movI: Movimiento = {
                id: `mov-${Date.now()}-trf-i`,
                fecha: ahora,
                almacenId: trf.destinoAlmacenId,
                materialId: trf.materialId,
                tipo: 'ingreso',
                cantidad: action.cantidadRecibida,
                referencia: trf.codigo,
                usuario: action.recibidoPor,
            };

            const nuevosMovimientos = [movS, movI, ...state.movimientos];
            let nuevasInconsistencias = state.inconsistencias;

            // Detección automática de inconsistencia si recibido < enviado y no hay merma
            const diff = trf.cantidad - action.cantidadRecibida;
            if (diff > 0) {
                const nuevaInc: InconsistenciaInventario = {
                    id: `inc-${Date.now()}`,
                    codigo: `INC-2026-${String(seqInc++).padStart(3, '0')}`,
                    tipoOperacion: 'transferencia',
                    operacionCodigo: trf.codigo,
                    origenAlmacenId: trf.origenAlmacenId,
                    destinoAlmacenId: trf.destinoAlmacenId,
                    materialId: trf.materialId,
                    cantidadOrigen: trf.cantidad,
                    cantidadDestinoConforme: action.cantidadRecibida,
                    mermaJustificada: 0,
                    saldoDiferencia: diff,
                    fechaDeteccion: ahora,
                    estado: 'pendiente_revision',
                    responsableRevision: action.recibidoPor,
                };
                nuevasInconsistencias = [nuevaInc, ...nuevasInconsistencias];
            }

            return {
                ...state,
                stock: stockFinal,
                movimientos: nuevosMovimientos,
                inconsistencias: nuevasInconsistencias,
                transferencias: state.transferencias.map((t) =>
                    t.id === action.transferenciaId
                        ? {
                              ...t,
                              estado: action.incidencia ? 'recibida_con_incidencia' : 'recibida_conforme',
                              incidencia: action.incidencia,
                              fechaRecepcion: ahora,
                              recibidoPor: action.recibidoPor,
                          }
                        : t,
                ),
            };
        }

        case 'CREATE_MERMA': {
            const nueva: RegistroMerma = {
                ...action.merma,
                id: `mer-${Date.now()}`,
                codigo: `MER-2026-${String(seqMer++).padStart(3, '0')}`,
                bajaEfectuada: true,
            };

            // La baja se ejecuta inmediatamente en stock (Bizagi 30)
            const stock = sumarStock(action.merma.almacenId, action.merma.materialId, -action.merma.cantidad, state.stock);
            const mov: Movimiento = {
                id: `mov-${Date.now()}-mer`,
                fecha: ahora,
                almacenId: action.merma.almacenId,
                materialId: action.merma.materialId,
                tipo: 'merma',
                cantidad: action.merma.cantidad,
                referencia: nueva.codigo,
                usuario: action.merma.registradoPor,
            };

            return {
                ...state,
                stock,
                movimientos: [mov, ...state.movimientos],
                mermas: [nueva, ...state.mermas],
            };
        }

        case 'CREATE_DEVOLUCION': {
            const nueva: DevolucionProveedor = {
                ...action.devolucion,
                id: `dev-${Date.now()}`,
                codigo: `DEV-2026-${String(seqDev++).padStart(3, '0')}`,
            };
            return { ...state, devoluciones: [nueva, ...state.devoluciones] };
        }

        case 'RESOLVE_INCONSISTENCIA': {
            return {
                ...state,
                inconsistencias: state.inconsistencias.map((i) =>
                    i.id === action.inconsistenciaId
                        ? { ...i, estado: 'conciliado', responsableRevision: `${i.responsableRevision} (Auditado)` }
                        : i,
                ),
            };
        }

        case 'RESET_ALL_DATA':
            return initialState();

        default:
            return state;
    }
}

export type { Alerta };