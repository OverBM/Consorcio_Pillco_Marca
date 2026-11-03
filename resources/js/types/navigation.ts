/** Contrato de navegación compartido por el shell y la configuración. */
export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon?: string;
    badge?: string;
    tone?: 'mint' | 'yellow' | 'default';
    /** Permiso requerido para mostrar/abrir el módulo (p. ej. `pmi.ver`). */
    permiso?: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}
