import { describe, expect, it } from 'vitest';

import { ApiError } from '../../services/http/client';
import {
    clearFieldError,
    combineErrors,
    fromApiError,
    hasErrors,
    runRules,
    validate,
    validators,
} from '../../utils/validation';

describe('utils/validation', () => {
    it('valida campos obligatorios en todas sus formas', () => {
        const requerido = validators.required();

        expect(requerido(null)).toBe('Este campo es obligatorio');
        expect(requerido(undefined)).toBe('Este campo es obligatorio');
        expect(requerido('   ')).toBe('Este campo es obligatorio');
        expect(requerido([])).toBe('Este campo es obligatorio');
        expect(requerido(0)).toBeUndefined();
        expect(requerido('texto')).toBeUndefined();
    });

    it('valida longitudes y números', () => {
        expect(validators.minLength(3)('ab')).toBe('Mínimo 3 caracteres');
        expect(validators.minLength(3)('abc')).toBeUndefined();
        expect(validators.minLength(3, 'corto')('ab')).toBe('corto');
        expect(validators.maxLength(2)('abc')).toBe('Máximo 2 caracteres');
        expect(validators.maxLength(2)('ab')).toBeUndefined();
        expect(validators.maxLength(2, 'largo')('abc')).toBe('largo');

        expect(validators.positiveNumber()('0')).toBe(
            'Debe ser un número mayor a cero',
        );
        expect(validators.positiveNumber()('2')).toBeUndefined();
        expect(validators.nonNegativeNumber()('-1')).toBe(
            'Debe ser un número igual o mayor a cero',
        );
        expect(validators.nonNegativeNumber()('0')).toBeUndefined();
    });

    it('valida correos y patrones dejando pasar los vacíos', () => {
        expect(validators.email()('')).toBeUndefined();
        expect(validators.email()(null)).toBeUndefined();
        expect(validators.email()('malo@')).toBe('Correo electrónico inválido');
        expect(validators.email()('a@b.pe')).toBeUndefined();
        expect(validators.email('otro')('malo')).toBe('otro');

        expect(validators.pattern(/^\d+$/)('abc')).toBe('Formato inválido');
        expect(validators.pattern(/^\d+$/)('123')).toBeUndefined();
        expect(validators.pattern(/^\d+$/)('')).toBeUndefined();
        expect(validators.pattern(/^\d+$/, 'solo dígitos')('abc')).toBe(
            'solo dígitos',
        );
    });

    it('convierte objetos a texto al validar patrones', () => {
        expect(validators.pattern(/"a"/)({ a: 1 })).toBeUndefined();
    });

    it('ejecuta reglas en orden devolviendo el primer error', () => {
        expect(runRules('', [validators.required(), validators.email()])).toBe(
            'Este campo es obligatorio',
        );
        expect(runRules('a@b.pe', [validators.email()])).toBeUndefined();
        expect(runRules('x')).toBeUndefined();
    });

    it('valida un objeto completo contra un esquema', () => {
        const errores = validate(
            { nombre: '', correo: 'malo', cantidad: '5' },
            {
                nombre: [validators.required()],
                correo: [validators.email()],
                cantidad: [validators.positiveNumber()],
            },
        );

        expect(errores).toEqual({
            nombre: 'Este campo es obligatorio',
            correo: 'Correo electrónico inválido',
        });
        expect(hasErrors(errores)).toBe(true);
        expect(hasErrors({})).toBe(false);
    });

    it('ignora campos sin reglas en el esquema', () => {
        expect(validate({ nombre: '' }, { nombre: undefined })).toEqual({});
    });

    it('traduce errores de API a errores por campo', () => {
        const apiError = new ApiError('Datos inválidos', 422, {
            nombre: ['El nombre es obligatorio', 'otro'],
            vacio: [],
        });

        expect(fromApiError(apiError)).toEqual({
            nombre: 'El nombre es obligatorio',
        });
        expect(fromApiError(new ApiError('Sin detalle', 500))).toEqual({
            _form: 'Sin detalle',
        });
        expect(fromApiError(new Error('explosión'))).toEqual({
            _form: 'explosión',
        });
        expect(fromApiError('texto')).toEqual({
            _form: 'Ocurrió un error inesperado.',
        });
    });

    it('combina y limpia errores', () => {
        expect(combineErrors({ a: '1' }, undefined, null, { b: '2' })).toEqual({
            a: '1',
            b: '2',
        });

        const original = { a: '1' };
        expect(clearFieldError(original, 'a')).toEqual({});
        expect(clearFieldError(original, 'inexistente')).toBe(original);
    });
});
