// Estado global centralizado (Context + Reducer) con persistencia en LocalStorage
// y control de versión de esquema (SCHEMA_VERSION).
// Preparado como interfaz limpia para sustitución directa por API REST / Backend.

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { buildAlertas } from '../data/alertas';
import { almacenes } from '../data/almacenes';
import { materiales } from '../data/materiales';
import { obras as obrasCatalogo } from '../data/obras';
import { usuarios as usuariosCatalogo, vehiculos as vehiculosCatalogo } from '../data/usuarios';
import type {
    Alerta,
    Almacen,
    AppRoleId,
    CoordinacionTransporte,
    CotizacionProveedor,
    Despacho,
    DevolucionProveedor,
    EstadoDespacho,
    IncidenciaTransferencia,
    InconsistenciaInventario,
    Material,
    Obra,
    OrdenCompra,
    OrdenTransferencia,
    Recepcion,
    RegistroMerma,
    RequerimientoCompra,
    SolicitudMaterial,
    Usuario,
    Vehiculo,
} from '../types';
import {
    appReducer,
    initialState,
    proximaCodigoDespacho,
    SCHEMA_VERSION,
    type AppState,
} from './reducer';

const LS_STATE_KEY = 'cpm_inventario_state_v3';

function leerPersistido(): AppState {
    try {
        const raw = localStorage.getItem(LS_STATE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as AppState;
            if (parsed.schemaVersion === SCHEMA_VERSION) {
                return parsed;
            }
        }
    } catch {
        // Fallback al estado inicial
    }
    return initialState();
}

export interface AppContextValue extends AppState {
    obras: Obra[];
    almacenes: Almacen[];
    materiales: Material[];
    vehiculos: Vehiculo[];
    usuarios: Usuario[];
    alertas: Alerta[];
    obraActiva: Obra;
    alcances: { almacenesActivos: number; porObra: Record<string, number> };

    // Acciones de configuración y roles
    selectObra: (obraId: string) => void;
    setRolActivo: (rol: AppRoleId) => void;
    ackAlert: (alertId: string) => void;
    resetAllData: () => void;

    // Procesos 16-19: Requerimientos y Compras
    createRequerimiento: (req: Omit<RequerimientoCompra, 'id' | 'codigo'>) => void;
    approveRequerimiento: (reqId: string) => void;
    createCotizacion: (cot: Omit<CotizacionProveedor, 'id'>) => void;
    selectCotizacion: (cotId: string) => void;
    createOrdenCompra: (oc: Omit<OrdenCompra, 'id' | 'codigo'>) => void;

    // Procesos 22-25: Solicitudes de Material
    createSolicitud: (sol: Omit<SolicitudMaterial, 'id' | 'codigo'>) => void;

    // Proceso 20: Recepción
    createRecepcion: (rec: any) => void;
    confirmReceipt: (recepcionId: string) => void;

    // Proceso 26: Despacho y Rutas
    createDespacho: (despacho: any) => Despacho;
    startTransito: (despachoId: string, vehiculoId: string, responsable: string) => void;
    updateDespacho: (
        despachoId: string,
        patch: { estado?: EstadoDespacho; pctRuta?: number },
    ) => void;

    // Procesos 27-28: Transferencias
    createTransferencia: (trf: Omit<OrdenTransferencia, 'id' | 'codigo'>) => void;
    authorizeTransferencia: (trfId: string) => void;
    receiveTransferencia: (
        trfId: string,
        cantidadRecibida: number,
        incidencia?: IncidenciaTransferencia,
        recibidoPor?: string,
    ) => void;

    // Procesos 21 & 30: Mermas y Devoluciones
    createMerma: (merma: Omit<RegistroMerma, 'id' | 'codigo'>) => void;
    createDevolucion: (dev: Omit<DevolucionProveedor, 'id' | 'codigo'>) => void;

    // Inconsistencias
    resolveInconsistencia: (incId: string, motivo: string) => void;

    // Helpers de búsqueda
    almacenPorId: (id: string) => Almacen | undefined;
    obraPorId: (id: string) => Obra | undefined;
    materialPorId: (id: string) => Material | undefined;
    vehiculoPorId: (id: string) => Vehiculo | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, undefined, leerPersistido);

    useEffect(() => {
        try {
            localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
        } catch {
            // Storage quota o no disponible
        }
    }, [state]);

    const obras = obrasCatalogo;
    const alm = almacenes;
    const mats = materiales;
    const vehs = vehiculosCatalogo;
    const usrs = usuariosCatalogo;

    const alertas = useMemo(
        () =>
            buildAlertas({
                obras,
                almacenes: alm,
                materiales: mats,
                stock: state.stock,
                acked: new Set(state.ackedAlertIds),
            }),
        [obras, alm, mats, state.stock, state.ackedAlertIds],
    );

    const obraActiva = obras.find((o) => o.id === state.obraActivaId) ?? obras[0];

    const lookups = useMemo(() => {
        const porObra = new Map(obras.map((o) => [o.id, o]));
        const porAlm = new Map(alm.map((a) => [a.id, a]));
        const porMat = new Map(mats.map((m) => [m.id, m]));
        const porVeh = new Map(vehs.map((v) => [v.id, v]));
        return {
            obraPorId: (id: string) => porObra.get(id),
            almacenPorId: (id: string) => porAlm.get(id),
            materialPorId: (id: string) => porMat.get(id),
            vehiculoPorId: (id: string) => porVeh.get(id),
        };
    }, [obras, alm, mats, vehs]);

    const alcances = useMemo(() => {
        const porObra: Record<string, number> = {};
        for (const a of alm) {
            const o = lookups.obraPorId(a.obraId);
            if (o && (o.estado === 'activa' || o.estado === 'en-cierre')) {
                porObra[a.obraId] = (porObra[a.obraId] ?? 0) + 1;
            }
        }
        return {
            almacenesActivos: Object.values(porObra).reduce((acc, n) => acc + n, 0),
            porObra,
        };
    }, [alm, lookups]);

    const value = useMemo<AppContextValue>(
        () => ({
            ...state,
            obras,
            almacenes: alm,
            materiales: mats,
            vehiculos: vehs,
            usuarios: usrs,
            alertas,
            obraActiva,
            alcances,
            selectObra: (obraId) => dispatch({ type: 'SELECT_OBRA', obraId }),
            setRolActivo: (rol) => dispatch({ type: 'SET_ROL', rol }),
            ackAlert: (alertId) => dispatch({ type: 'ACK_ALERT', alertId }),
            resetAllData: () => dispatch({ type: 'RESET_ALL_DATA' }),

            createRequerimiento: (requerimiento) => dispatch({ type: 'CREATE_REQUERIMIENTO', requerimiento }),
            approveRequerimiento: (requerimientoId) => dispatch({ type: 'APPROVE_REQUERIMIENTO', requerimientoId }),
            createCotizacion: (cotizacion) => dispatch({ type: 'CREATE_COTIZACION', cotizacion }),
            selectCotizacion: (cotizacionId) => dispatch({ type: 'SELECT_COTIZACION', cotizacionId }),
            createOrdenCompra: (ordenCompra) => dispatch({ type: 'CREATE_ORDEN_COMPRA', ordenCompra }),

            createSolicitud: (solicitud) => dispatch({ type: 'CREATE_SOLICITUD', solicitud }),

            createRecepcion: (recepcion) => dispatch({ type: 'CREATE_RECEPCION', recepcion }),
            confirmReceipt: (recepcionId) => dispatch({ type: 'CONFIRM_RECEIPT', recepcionId }),

            createDespacho: (despacho) => {
                const codigo = proximaCodigoDespacho();
                const creado: Despacho = {
                    id: `desp-${Date.now()}`,
                    codigo,
                    materialId: despacho.materialId,
                    cantidad: despacho.cantidad,
                    origenAlmacenId: despacho.origenAlmacenId,
                    destinoAlmacenId: despacho.destinoAlmacenId,
                    estado: 'pendiente',
                    fechaSolicitud: new Date().toISOString().slice(0, 16).replace('T', ' '),
                    alertaId: despacho.alertaId,
                };
                dispatch({ type: 'CREATE_DESPACHO', despacho: { ...despacho, codigo } });
                return creado;
            },
            startTransito: (despachoId, vehiculoId, responsable) =>
                dispatch({ type: 'START_TRANSITO', despachoId, vehiculoId, responsable }),
            updateDespacho: (despachoId, patch) =>
                dispatch({ type: 'UPDATE_DESPACHO', despachoId, patch }),

            createTransferencia: (transferencia) => dispatch({ type: 'CREATE_TRANSFERENCIA', transferencia }),
            authorizeTransferencia: (transferenciaId) => dispatch({ type: 'AUTHORIZE_TRANSFERENCIA', transferenciaId }),
            receiveTransferencia: (transferenciaId, cantidadRecibida, incidencia, recibidoPor = 'Almacenero Destino') =>
                dispatch({ type: 'RECEIVE_TRANSFERENCIA', transferenciaId, cantidadRecibida, incidencia, recibidoPor }),

            createMerma: (merma) => dispatch({ type: 'CREATE_MERMA', merma }),
            createDevolucion: (devolucion) => dispatch({ type: 'CREATE_DEVOLUCION', devolucion }),
            resolveInconsistencia: (inconsistenciaId, motivo) =>
                dispatch({ type: 'RESOLVE_INCONSISTENCIA', inconsistenciaId, motivo }),

            ...lookups,
        }),
        [state, obras, alm, mats, vehs, usrs, alertas, obraActiva, alcances, lookups],
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) {
        throw new Error('useAppStore debe usarse dentro de <AppProvider>');
    }
    return ctx;
}