import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RemoteImage } from '../../components/RemoteImage';

describe('components/RemoteImage', () => {
    it('renderiza la imagen cuando hay src', () => {
        render(<RemoteImage src="https://cdn.test/foto.jpg" alt="Camión" />);

        const imagen = screen.getByAltText('Camión');

        expect(imagen.tagName).toBe('IMG');
    });

    it('usa el placeholder de camión cuando falla la carga', () => {
        render(<RemoteImage src="https://cdn.test/roto.jpg" alt="Camión" />);

        fireEvent.error(screen.getByAltText('Camión'));

        expect(screen.getByLabelText('Camión')).toBeTruthy();
        expect(screen.queryByAltText('Camión')).toBeNull();
    });

    it('usa el placeholder de tienda sin src', () => {
        const { container } = render(
            <RemoteImage alt="Local" kind="store" className="foto" />,
        );

        expect(screen.getByLabelText('Local')).toBeTruthy();
        expect(container.querySelector('.foto')).toBeTruthy();
    });

    it('usa el placeholder de camión cuando no se indica tipo', () => {
        render(<RemoteImage alt="Vehículo" />);

        expect(screen.getByLabelText('Vehículo')).toBeTruthy();
    });
});
