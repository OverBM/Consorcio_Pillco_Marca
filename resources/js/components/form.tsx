import { useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import { IconX } from './icons';

export function Field({
    label,
    hint,
    error,
    required,
    children,
}: {
    label: string;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="label">
                {label}
                {required && <span className="text-danger"> *</span>}
            </span>
            {children}
            {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : hint ? <p className="hint mt-1">{hint}</p> : null}
        </label>
    );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
}
export function Input({ className, invalid, ...props }: InputProps) {
    return (
        <input
            className={cn(
                'field',
                invalid && 'border-danger focus:border-danger focus:ring-danger-soft',
                className,
            )}
            {...props}
        />
    );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
}
export function Select({ className, invalid, children, ...props }: SelectProps) {
    return (
        <select
            className={cn(
                'field cursor-pointer',
                invalid && 'border-danger focus:border-danger focus:ring-danger-soft',
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
            className={cn(
                'field min-h-24 resize-y',
                invalid && 'border-danger focus:border-danger focus:ring-danger-soft',
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
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
    const base = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary';
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
}: {
    label: string;
    accept?: string;
    value?: string;
    onChange?: (fileName: string | undefined) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [nombre, setNombre] = useState<string | undefined>(value);

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
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-field border border-dashed border-line bg-soft/60 px-3 py-2.5 text-sm text-muted transition-colors hover:border-brand-400 hover:text-ink"
            >
                {nombre ? (
                    <span className="truncate font-medium text-ink">{nombre}</span>
                ) : (
                    <span>Subir foto / PDF de evidencia</span>
                )}
                {nombre ? (
                    <span
                        role="button"
                        tabIndex={0}
                        className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger"
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
        </div>
    );
}