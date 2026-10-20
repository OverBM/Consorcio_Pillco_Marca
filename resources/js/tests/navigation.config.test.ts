import { describe, expect, it } from 'vitest';

import {
    APP_ROLES,
    filtrarNavegacion,
    NAVIGATION_CONFIG,
} from '../navigation.config';

describe('navigation.config', () => {
    it('expone los 18 roles alineados al RolesSeeder', () => {
        expect(APP_ROLES).toHaveLength(18);
        expect(APP_ROLES[0]).toEqual({
            id: 'gerente_general',
            nombre: 'Gerente General',
            badge: 'GG',
            descripcion: 'Visión consolidada y programa PMU',
        });
        expect(APP_ROLES.map((rol) => rol.id)).toContain('auditor');
    });

    it('expone los 8 grupos del menú con sus 36 módulos', () => {
        expect(NAVIGATION_CONFIG).toHaveLength(8);
        expect(NAVIGATION_CONFIG[0].title).toBe('Panel Principal');
        expect(NAVIGATION_CONFIG.flatMap((grupo) => grupo.items)).toHaveLength(
            36,
        );
    });

    it('conserva los campos opcionales de badge, tone y permiso', () => {
        const items = NAVIGATION_CONFIG.flatMap((grupo) => grupo.items);
        const redistribucion = items.find(
            (item) => item.id === 'programa-redistribucion',
        );
        const perfil = items.find((item) => item.id === 'mi-perfil');

        expect(redistribucion).toMatchObject({
            badge: 'ACTIVO',
            tone: 'mint',
            permiso: 'programa.ver',
        });
        expect(perfil?.permiso).toBeUndefined();
    });

    it('filtra la navegación por permisos y descarta grupos vacíos', () => {
        const grupos = filtrarNavegacion([]);

        expect(grupos.map((grupo) => grupo.title)).toEqual(['Panel Principal']);
        expect(grupos[0].items.map((item) => item.id)).toEqual(['mi-perfil']);
    });

    it('mantiene visibles los módulos permitidos', () => {
        const ids = filtrarNavegacion(['logistica.ver'])
            .flatMap((grupo) => grupo.items)
            .map((item) => item.id);

        expect(ids).toContain('matriz-stock');
        expect(ids).toContain('mi-perfil');
        expect(ids).not.toContain('usuarios-roles');
    });
});
