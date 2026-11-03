import { ETIQUETAS_PASSWORD, evaluarPassword } from '../utils/password';

/**
 * Lista de requisitos de contraseña con estado en vivo.
 * No renderiza nada mientras el campo está vacío.
 */
export function PasswordRules({ valor }: { valor: string }) {
    if (!valor) {
        return null;
    }

    const reglas = evaluarPassword(valor);

    return (
        <ul
            aria-live="polite"
            className="text-label mt-1.5 grid gap-1 sm:grid-cols-2"
        >
            {ETIQUETAS_PASSWORD.map(({ clave, label }) => (
                <li
                    key={clave}
                    className={reglas[clave] ? 'text-exito' : 'text-muted'}
                >
                    <span aria-hidden="true" className="mr-1">
                        {reglas[clave] ? '✓' : '○'}
                    </span>
                    {label}
                </li>
            ))}
        </ul>
    );
}
