import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Badge, Button, Card, EstadoDot, Modal } from '../../components/ui';

describe('components/ui', () => {
    it('renderiza el botón con cada variante y tamaño', () => {
        const variantes = [
            'primary',
            'secondary',
            'mint',
            'danger',
            'outline',
        ] as const;
        const tamanos = ['sm', 'md', 'lg'] as const;

        for (const variant of variantes) {
            for (const size of tamanos) {
                const { unmount } = render(
                    <Button variant={variant} size={size}>
                        {`${variant}-${size}`}
                    </Button>,
                );

                expect(screen.getByText(`${variant}-${size}`)).toBeTruthy();
                unmount();
            }
        }
    });

    it('invoca onClick y respeta disabled y className', () => {
        const alClic = vi.fn();

        const { rerender } = render(
            <Button onClick={alClic} className="extra">
                Enviar
            </Button>,
        );

        const boton = screen.getByText('Enviar');

        fireEvent.click(boton);

        expect(alClic).toHaveBeenCalledOnce();
        expect(boton.className).toContain('extra');

        rerender(
            <Button onClick={alClic} disabled>
                Enviar
            </Button>,
        );

        fireEvent.click(screen.getByText('Enviar'));

        expect(alClic).toHaveBeenCalledOnce();
    });

    it('renderiza la tarjeta con encabezado, acción e id', () => {
        const { container } = render(
            <Card
                id="tarjeta"
                title="Resumen"
                subtitle="Detalle"
                action={<button>Ver</button>}
            >
                <p>Cuerpo</p>
            </Card>,
        );

        expect(screen.getByText('Resumen')).toBeTruthy();
        expect(screen.getByText('Detalle')).toBeTruthy();
        expect(screen.getByText('Ver')).toBeTruthy();
        expect(screen.getByText('Cuerpo')).toBeTruthy();
        expect(container.querySelector('#tarjeta')).toBeTruthy();
    });

    it('omite el encabezado de la tarjeta sin título ni acción', () => {
        const { container } = render(
            <Card>
                <p>Solo cuerpo</p>
            </Card>,
        );

        expect(container.querySelector('header')).toBeNull();
    });

    it('renderiza el punto de estado con el tamaño indicado', () => {
        const { container } = render(
            <EstadoDot className="bg-ok-soft" size={10} />,
        );

        const punto = container.firstElementChild as HTMLElement;

        expect(punto.style.width).toBe('10px');
        expect(punto.style.height).toBe('10px');
    });

    it('renderiza cada tono del badge', () => {
        const tonos = ['ok', 'warn', 'danger', 'violet', 'neutral'] as const;

        for (const tone of tonos) {
            const { unmount } = render(<Badge tone={tone}>{tone}</Badge>);

            expect(screen.getByText(tone)).toBeTruthy();
            unmount();
        }
    });

    it('abre y cierra el modal por overlay y por botón', () => {
        const alCerrar = vi.fn();

        const { rerender } = render(
            <Modal open onClose={alCerrar} title="Título">
                <p>Contenido</p>
            </Modal>,
        );

        expect(screen.getByText('Título')).toBeTruthy();
        expect(screen.getByText('Contenido')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar modal'));
        fireEvent.click(screen.getByLabelText('Cerrar'));

        expect(alCerrar).toHaveBeenCalledTimes(2);

        rerender(
            <Modal open={false} onClose={alCerrar} title="Título" wide>
                <p>Contenido</p>
            </Modal>,
        );

        expect(screen.queryByText('Título')).toBeNull();
    });

    it('aplica el ancho extendido al modal', () => {
        const { container } = render(
            <Modal open onClose={vi.fn()} title="Ancho" wide>
                <p>Cuerpo</p>
            </Modal>,
        );

        expect(container.querySelector('.max-w-3xl')).toBeTruthy();
    });
});
