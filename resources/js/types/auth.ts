export type { AppRoleId, AppRoleItem } from '../navigation.config';

export type UserRole = {
    codigo: string;
    nombre: string;
};

export type UserOption = {
    id: number;
    codigo: string;
    nombre: string;
};

export type User = {
    id: number;
    name: string;
    email: string;
    dni: string | null;
    roles: UserRole[];
    permisos: string[];
    obras: UserOption[];
    almacenes: UserOption[];
    avatar?: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User | null;
};

export type NotificacionFeedItem = {
    id: string;
    origen: 'notificacion' | 'alerta';
    tipo: string;
    titulo: string;
    cuerpo: string | null;
    severidad: string | null;
    referencia_tipo: string | null;
    referencia_id: number | null;
    leida: boolean;
    fecha: string | null;
};

export type NotificacionesFeed = {
    items: NotificacionFeedItem[];
    sin_leer: number;
};

export type CatalogoObra = {
    id: number;
    codigo: string;
    nombre: string;
    distrito: string | null;
    estado: string;
    avance_fisico_pct: string | number | null;
};

export type CatalogoAlmacen = {
    id: number;
    codigo: string;
    nombre: string;
    obra_id: number;
};

export type CatalogoMaterial = {
    id: number;
    codigo: string;
    nombre: string;
    unidad: { id: number; codigo: string; nombre: string } | null;
};

export type Catalogos = {
    obras: CatalogoObra[];
    almacenes: CatalogoAlmacen[];
    materiales: CatalogoMaterial[];
};

export type Contexto = {
    obra_activa_id: number | null;
    almacen_activo_id: number | null;
};
