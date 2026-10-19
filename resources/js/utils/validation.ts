import { ApiError } from '../services/http/client';

export type FieldErrors = Record<string, string>;

export type Validator = (value: unknown) => string | undefined;

export type ValidationSchema<T extends Record<string, unknown>> = {
    [K in keyof T]?: Validator[];
};

export const validators = {
    required:
        (message = 'Este campo es obligatorio'): Validator =>
        (value) => {
            if (value === null || value === undefined) {
                return message;
            }
            if (typeof value === 'string' && value.trim() === '') {
                return message;
            }
            if (Array.isArray(value) && value.length === 0) {
                return message;
            }
            return undefined;
        },

    minLength:
        (min: number, message?: string): Validator =>
        (value) => {
            if (typeof value === 'string' && value.length < min) {
                return message ?? `Mínimo ${min} caracteres`;
            }
            return undefined;
        },

    maxLength:
        (max: number, message?: string): Validator =>
        (value) => {
            if (typeof value === 'string' && value.length > max) {
                return message ?? `Máximo ${max} caracteres`;
            }
            return undefined;
        },

    positiveNumber:
        (message = 'Debe ser un número mayor a cero'): Validator =>
        (value) => {
            const number = Number(value);
            return Number.isFinite(number) && number > 0 ? undefined : message;
        },

    nonNegativeNumber:
        (message = 'Debe ser un número igual o mayor a cero'): Validator =>
        (value) => {
            const number = Number(value);
            return Number.isFinite(number) && number >= 0 ? undefined : message;
        },

    email:
        (message = 'Correo electrónico inválido'): Validator =>
        (value) => {
            if (value === null || value === undefined || value === '') {
                return undefined;
            }
            return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(String(value)) ? undefined : message;
        },

    pattern:
        (regex: RegExp, message = 'Formato inválido'): Validator =>
        (value) => {
            if (value === null || value === undefined || value === '') {
                return undefined;
            }
            return regex.test(String(value)) ? undefined : message;
        },
};

export function runRules(value: unknown, rules: Validator[] = []): string | undefined {
    for (const rule of rules) {
        const error = rule(value);

        if (error) {
            return error;
        }
    }

    return undefined;
}

export function validate<T extends Record<string, unknown>>(
    values: T,
    schema: ValidationSchema<T>,
): FieldErrors {
    const errors: FieldErrors = {};

    for (const key of Object.keys(schema) as Array<keyof T>) {
        const rules = schema[key];

        if (!rules) {
            continue;
        }

        const error = runRules(values[key], rules);

        if (error) {
            errors[key as string] = error;
        }
    }

    return errors;
}

export function fromApiError(error: unknown): FieldErrors {
    if (error instanceof ApiError) {
        const errors: FieldErrors = {};

        for (const [field, messages] of Object.entries(error.errors)) {
            if (messages && messages.length > 0) {
                errors[field] = messages[0];
            }
        }

        if (Object.keys(errors).length === 0) {
            errors._form = error.message || 'Ocurrió un error inesperado.';
        }

        return errors;
    }

    return { _form: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' };
}

export function combineErrors(...sources: Array<FieldErrors | undefined | null>): FieldErrors {
    return Object.assign({}, ...sources.filter(Boolean));
}

export function hasErrors(errors: FieldErrors): boolean {
    return Object.keys(errors).length > 0;
}

export function clearFieldError(errors: FieldErrors, field: string): FieldErrors {
    if (!(field in errors)) {
        return errors;
    }

    const next = { ...errors };
    delete next[field];

    return next;
}
