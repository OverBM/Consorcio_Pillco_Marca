export interface ReglasPassword {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    symbol: boolean;
}

export const ETIQUETAS_PASSWORD: {
    clave: keyof ReglasPassword;
    label: string;
}[] = [
    { clave: 'length', label: 'Mínimo 8 caracteres' },
    { clave: 'upper', label: 'Al menos una letra mayúscula' },
    { clave: 'lower', label: 'Al menos una letra minúscula' },
    { clave: 'number', label: 'Al menos un número' },
    { clave: 'symbol', label: 'Al menos un símbolo' },
];

/** Evalúa las cinco reglas de la política de contraseña. */
export function evaluarPassword(valor: string): ReglasPassword {
    return {
        length: valor.length >= 8,
        upper: /[A-Z]/.test(valor),
        lower: /[a-z]/.test(valor),
        number: /\d/.test(valor),
        symbol: /[^A-Za-z0-9]/.test(valor),
    };
}

export function passwordValida(valor: string): boolean {
    return Object.values(evaluarPassword(valor)).every(Boolean);
}

/** Devuelve las etiquetas de las reglas incumplidas. */
export function erroresPassword(valor: string): string[] {
    const reglas = evaluarPassword(valor);

    return ETIQUETAS_PASSWORD.filter(({ clave }) => !reglas[clave]).map(
        ({ label }) => label,
    );
}
