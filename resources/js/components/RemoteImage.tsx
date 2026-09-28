import { useState } from 'react';
import { cn } from '../utils/cn';
import { IconTruck, IconWarehouse } from './icons';

/**
 * Imagen remota de Stitch (fotos de flota/obra en lh3.googleusercontent.com)
 * con fallback a placeholder SVG local si no hay red o la URL rompió.
 */
export function RemoteImage({
    src,
    alt,
    className,
    kind = 'truck',
}: {
    src?: string;
    alt: string;
    className?: string;
    kind?: 'truck' | 'store';
}) {
    const [error, setError] = useState(false);
    if (!src || error) {
        return (
            <div
                className={cn('flex items-center justify-center bg-gradient-to-br from-soft to-line text-muted', className)}
                aria-label={alt}
            >
                {kind === 'truck' ? <IconTruck size={20} /> : <IconWarehouse size={20} />}
            </div>
        );
    }
    return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setError(true)} />;
}