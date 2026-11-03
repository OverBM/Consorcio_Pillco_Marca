import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PasswordRules } from '../../components/PasswordRules';
import {
    erroresPassword,
    evaluarPassword,
    passwordValida,
} from '../../utils/password';

describe('utils/password', () => {
    it('exige las cinco reglas', () => {
        expect(passwordValida('Abcdef1!')).toBe(true);
        expect(passwordValida('abcdef1!')).toBe(false); // sin mayúscula
        expect(passwordValida('ABCDEF1!')).toBe(false); // sin minúscula
        expect(passwordValida('Abcdefg!')).toBe(false); // sin número
        expect(passwordValida('Abcdefg1')).toBe(false); // sin símbolo
        expect(passwordValida('Ab1!')).toBe(false); // corta
    });

    it('devuelve las etiquetas incumplidas', () => {
        expect(erroresPassword('Abcdef1!')).toEqual([]);
        expect(erroresPassword('abc')).toEqual([
            'Mínimo 8 caracteres',
            'Al menos una letra mayúscula',
            'Al menos un número',
            'Al menos un símbolo',
        ]);
    });

    it('evalúa cada regla por separado', () => {
        expect(evaluarPassword('Abcdef1!')).toEqual({
            length: true,
            upper: true,
            lower: true,
            number: true,
            symbol: true,
        });
    });
});

describe('components/PasswordRules', () => {
    it('no muestra nada con el campo vacío', () => {
        const { container } = render(<PasswordRules valor="" />);

        expect(container.firstChild).toBeNull();
    });

    it('marca visualmente las reglas cumplidas', () => {
        render(<PasswordRules valor="Abcdef1!" />);

        expect(screen.getAllByText('✓')).toHaveLength(5);
    });

    it('deja pendientes las reglas faltantes', () => {
        render(<PasswordRules valor="abc" />);

        expect(screen.getByText('Mínimo 8 caracteres')).toBeTruthy();
        expect(screen.getByText('Al menos un símbolo')).toBeTruthy();
        expect(screen.getAllByText('○').length).toBeGreaterThan(0);
    });
});
