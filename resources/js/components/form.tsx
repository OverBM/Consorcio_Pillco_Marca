import {
    useRef,
    useState,
    type FormEvent,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../utils/cn';
import { IconAlert, IconCheck, IconX } from './icons';

export function Field({
    label,
    hint,
    error,
    required,
    htmlFor,
    children,
}: {
    label: string;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    htmlFor?: string;
    children: ReactNode;
}) {
    return (
        <label className="block" htmlFor={htmlFor}>
            <span className="label">
                {label}
                {required && <span className="text-danger"> *</span>}
            </span>
            {children}
            {error ? (
                <p
                    role="alert"
                    className="text-danger mt-1 text-xs font-medium"
                >
                    {error}
                </p>
            ) : hint ? (
                <p className="hint mt-1">{hint}</p>
            ) : null}
        </label>
    );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
}
export function Input({ className, invalid, ...props }: InputProps) {
    return (
        <input
            aria-invalid={invalid || undefined}
            className={cn(
                'field',
                invalid &&
                    'border-danger focus:border-danger focus:ring-danger-soft',
                className,
            )}
            {...props}
        />
    );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
}
export function Select({
    className,
    invalid,
    children,
    ...props
}: SelectProps) {
    return (
        <select
            aria-invalid={invalid || undefined}
            className={cn(
                'field cursor-pointer',
                invalid &&
                    'border-danger focus:border-danger focus:ring-danger-soft',
                className,
            )}
            {...props}
        >
            {children}
        </select>
    );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}
export function TextArea({ className, invalid, ...props }: TextAreaProps) {
    return (
        <textarea
            aria-invalid={invalid || undefined}
            className={cn(
                'field min-h-24 resize-y',
                invalid &&
                    'border-danger focus:border-danger focus:ring-danger-soft',
                className,
            )}
            {...props}
        />
    );
}
export { TextArea as Textarea };

export function Button({
    children,
    variant = 'primary',
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
}) {
    const base =
        variant === 'primary'
            ? 'btn-primary'
            : variant === 'danger'
              ? 'btn-danger'
              : 'btn-secondary';
    return (
        <button className={cn(base, className)} {...props}>
            {children}
        </button>
    );
}

/**
 * Carga de evidencia simulada (offline): no sube archivos, solo muestra el
 * nombre del adjunto y lo expone vía FileList por compatibilidad futura.
 */
export function FileUpload({
    label,
    accept,
    value,
    onChange,
    hint,
    error,
    invalid,
}: {
    label: string;
    accept?: string;
    value?: string;
    onChange?: (fileName: string | undefined) => void;
    hint?: ReactNode;
    error?: string;
    invalid?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [nombre, setNombre] = useState<string | undefined>(value);
    const marcado = invalid || !!error;

    return (
        <div className="block">
            <span className="label">{label}</span>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    setNombre(file ? file.name : undefined);
                    onChange?.(file ? file.name : undefined);
                }}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-invalid={marcado || undefined}
                className={cn(
                    'rounded-field bg-soft/60 hover:text-ink flex w-full cursor-pointer items-center justify-between gap-2 border border-dashed px-3 py-2.5 text-sm transition-colors',
                    marcado
                        ? 'border-danger text-danger'
                        : 'border-line text-muted hover:border-brand-400',
                )}
            >
                {nombre ? (
                    <span className="text-ink truncate font-medium">
                        {nombre}
                    </span>
                ) : (
                    <span>Subir foto / PDF de evidencia</span>
                )}
                {nombre ? (
                    <span
                        role="button"
                        tabIndex={0}
                        className="text-muted hover:bg-danger-soft hover:text-danger rounded p-1"
                        aria-label="Quitar adjunto"
                        onClick={(e) => {
                            e.stopPropagation();
                            setNombre(undefined);
                            onChange?.(undefined);
                            if (inputRef.current) {
                                inputRef.current.value = '';
                            }
                        }}
                    >
                        <IconX size={14} />
                    </span>
                ) : null}
            </button>
            {error ? (
                <p
                    role="alert"
                    className="text-danger mt-1 text-xs font-medium"
                >
                    {error}
                </p>
            ) : hint ? (
                <p className="hint mt-1">{hint}</p>
            ) : null}
        </div>
    );
}

/**
 * Envío de formularios — patrón estándar del proyecto
 * ------------------------------------------------------------------
 * Cada panel de inserción se compone con:
 *   <FormPanel onSubmit>  contenedor + título + acción de guardado
 *     <FormSection>       agrupación de campos con grid responsivo
 *       <Field><Input/></Field>
 *     </FormSection>
 *     <SubmitButton status>  estado idle/submitting/success/error
 *   </FormPanel>
 *
 * Los errores por campo se calculan con los helpers de `utils/validation`
 * (validación cliente) y se combinan con los 422 de la API vía
 * `fieldErrors`/`fromApiError`, de modo que el mismo estado alimenta
 * `Field error` e `Input invalid`.
 */

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

function Spinner({ className }: { className?: string }) {
    return (
        <svg
            className={cn('h-4 w-4 animate-spin', className)}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}

export function SubmitButton({
    status = 'idle',
    children,
    loadingLabel = 'Guardando…',
    successLabel = 'Guardado',
    errorLabel = 'Reintentar',
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    status?: SubmitStatus;
    children: ReactNode;
    loadingLabel?: string;
    successLabel?: string;
    errorLabel?: string;
}) {
    const busy = status === 'submitting' || status === 'success';

    return (
        <Button
            type="submit"
            disabled={busy || props.disabled}
            aria-busy={status === 'submitting' || undefined}
            className={className}
            {...props}
        >
            {status === 'submitting' && <Spinner />}
            {status === 'success' && <IconCheck size={16} />}
            {status === 'error' && <IconAlert size={16} />}
            <span>
                {status === 'submitting'
                    ? loadingLabel
                    : status === 'success'
                      ? successLabel
                      : status === 'error'
                        ? errorLabel
                        : children}
            </span>
        </Button>
    );
}

export function FormPanel({
    title,
    subtitle,
    onSubmit,
    children,
    actions,
    className,
    as = 'form',
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
    as?: 'form' | 'div';
}) {
    const Tag = as as 'form';

    return (
        <Tag
            onSubmit={onSubmit}
            noValidate
            className={cn('card p-5', className)}
        >
            {(title || subtitle) && (
                <header className="mb-4">
                    {title && (
                        <h3 className="font-display text-ink text-base font-semibold">
                            {title}
                        </h3>
                    )}
                    {subtitle && (
                        <p className="text-muted mt-0.5 text-xs">{subtitle}</p>
                    )}
                </header>
            )}
            <div className="space-y-5">{children}</div>
            {actions && (
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    {actions}
                </div>
            )}
        </Tag>
    );
}

export function FormSection({
    title,
    description,
    columns = 2,
    children,
}: {
    title?: ReactNode;
    description?: ReactNode;
    columns?: 1 | 2 | 3;
    children: ReactNode;
}) {
    const grid =
        columns === 1
            ? 'grid-cols-1'
            : columns === 3
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2';

    return (
        <fieldset className="min-w-0 space-y-3">
            {(title || description) && (
                <legend className="mb-1 w-full">
                    {title && (
                        <span className="text-ink text-xs font-bold tracking-wide uppercase">
                            {title}
                        </span>
                    )}
                    {description && (
                        <span className="text-muted mt-0.5 block text-xs">
                            {description}
                        </span>
                    )}
                </legend>
            )}
            <div className={cn('grid gap-4', grid)}>{children}</div>
        </fieldset>
    );
}
