import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    Button,
    Field,
    FileUpload,
    FormPanel,
    FormSection,
    Input,
    Select,
    SubmitButton,
    TextArea,
    Textarea,
} from '../../components/form';

describe('components/form', () => {
    it('Field combina label, requerido, error y hint', () => {
        const { rerender } = render(
            <Field label="Nombre" required error="Campo requerido" htmlFor="n">
                <Input id="n" />
            </Field>,
        );

        expect(screen.getByText(/Nombre/)).toBeTruthy();
        expect(screen.getByText('*')).toBeTruthy();
        expect(screen.getByRole('alert').textContent).toBe('Campo requerido');

        rerender(
            <Field label="Nombre" hint="Solo letras">
                <Input />
            </Field>,
        );

        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByText('Solo letras')).toBeTruthy();

        rerender(
            <Field label="Nombre">
                <Input />
            </Field>,
        );

        expect(screen.queryByText('Solo letras')).toBeNull();
    });

    it('Input marca el estado inválido y propaga cambios', () => {
        const alCambiar = vi.fn();

        render(
            <Input
                placeholder="Buscar"
                value="x"
                invalid
                onChange={alCambiar}
            />,
        );

        const entrada = screen.getByPlaceholderText('Buscar');
        expect(entrada.getAttribute('aria-invalid')).toBe('true');

        fireEvent.change(entrada, { target: { value: 'hola' } });
        expect(alCambiar).toHaveBeenCalledTimes(1);

        const valido = render(<Input placeholder="Válido" />);
        expect(
            valido.getByPlaceholderText('Válido').getAttribute('aria-invalid'),
        ).toBeNull();
    });

    it('Select y TextArea exponen opciones y estado inválido', () => {
        render(
            <>
                <Select invalid defaultValue="b" aria-label="Opción">
                    <option value="a">A</option>
                    <option value="b">B</option>
                </Select>
                <TextArea placeholder="Notas" invalid defaultValue="t" />
                <Textarea placeholder="Alias" />
            </>,
        );

        const select = screen.getByLabelText('Opción');
        expect(select.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getAllByRole('option')).toHaveLength(2);

        fireEvent.change(select, { target: { value: 'a' } });
        expect((select as HTMLSelectElement).value).toBe('a');

        expect(
            screen.getByPlaceholderText('Notas').getAttribute('aria-invalid'),
        ).toBe('true');
        expect(
            screen.getByPlaceholderText('Alias').getAttribute('aria-invalid'),
        ).toBeNull();
    });

    it('Button aplica cada variante y responde al clic', () => {
        const alHacerClic = vi.fn();

        render(
            <>
                <Button onClick={alHacerClic}>Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="danger" className="extra">
                    Peligro
                </Button>
            </>,
        );

        const primario = screen.getByText('Primario');
        expect(primario.className).toContain('btn-primary');
        expect(screen.getByText('Secundario').className).toContain(
            'btn-secondary',
        );
        expect(screen.getByText('Peligro').className).toContain('btn-danger');
        expect(screen.getByText('Peligro').className).toContain('extra');

        fireEvent.click(primario);
        expect(alHacerClic).toHaveBeenCalledTimes(1);
    });

    it('SubmitButton refleja todos los estados de envío', () => {
        const { rerender } = render(
            <SubmitButton status="idle">Guardar</SubmitButton>,
        );

        expect(screen.getByText('Guardar')).toBeTruthy();
        expect(screen.getByRole('button').getAttribute('aria-busy')).toBeNull();

        rerender(<SubmitButton status="submitting">Guardar</SubmitButton>);
        expect(screen.getByText('Guardando…')).toBeTruthy();
        expect(screen.getByRole('button').getAttribute('disabled')).toBe('');
        expect(screen.getByRole('button').getAttribute('aria-busy')).toBe(
            'true',
        );

        rerender(<SubmitButton status="success">Guardar</SubmitButton>);
        expect(screen.getByText('Guardado')).toBeTruthy();

        rerender(
            <SubmitButton status="error" errorLabel="Reintentar">
                Guardar
            </SubmitButton>,
        );
        expect(screen.getByText('Reintentar')).toBeTruthy();

        rerender(
            <SubmitButton status="idle" disabled>
                Guardar
            </SubmitButton>,
        );
        expect(screen.getByRole('button').getAttribute('disabled')).toBe('');
    });

    it('FormPanel muestra encabezado, acciones y envía', () => {
        const alEnviar = vi.fn((evento: { preventDefault: () => void }) => {
            evento.preventDefault();
        });

        const { container, rerender } = render(
            <FormPanel
                title="Título"
                subtitle="Subtítulo"
                actions={<Button>Acción</Button>}
                onSubmit={alEnviar}
            >
                <Input placeholder="Campo" />
            </FormPanel>,
        );

        expect(screen.getByText('Título')).toBeTruthy();
        expect(screen.getByText('Subtítulo')).toBeTruthy();
        expect(screen.getByText('Acción')).toBeTruthy();

        fireEvent.submit(container.querySelector('form') as HTMLFormElement);
        expect(alEnviar).toHaveBeenCalledTimes(1);

        rerender(
            <FormPanel as="div">
                <span>Contenido</span>
            </FormPanel>,
        );

        expect(container.querySelector('form')).toBeNull();
        expect(container.querySelector('div.card')).toBeTruthy();
        expect(screen.getByText('Contenido')).toBeTruthy();
    });

    it('FormSection ajusta el grid según las columnas', () => {
        const { container } = render(
            <>
                <FormSection title="Uno" columns={1}>
                    <Input />
                </FormSection>
                <FormSection title="Dos" description="Ayuda" columns={2}>
                    <Input />
                </FormSection>
                <FormSection title="Tres" columns={3}>
                    <Input />
                </FormSection>
            </>,
        );

        expect(screen.getByText('Uno')).toBeTruthy();
        expect(screen.getByText('Ayuda')).toBeTruthy();

        const grids = container.querySelectorAll('.grid');
        expect(grids[0].className).toContain('grid-cols-1');
        expect(grids[0].className).not.toContain('sm:grid-cols-2');
        expect(grids[1].className).toContain('sm:grid-cols-2');
        expect(grids[2].className).toContain('lg:grid-cols-3');
    });

    it('FileUpload selecciona, muestra y quita el adjunto', () => {
        const alCambiar = vi.fn();
        const { container } = render(
            <FileUpload
                label="Evidencia"
                accept="image/*"
                hint="Adjunta una foto"
                onChange={alCambiar}
            />,
        );

        expect(screen.getByText('Subir foto / PDF de evidencia')).toBeTruthy();
        expect(screen.getByText('Adjunta una foto')).toBeTruthy();

        const entrada = container.querySelector(
            'input[type="file"]',
        ) as HTMLInputElement;
        expect(entrada.accept).toBe('image/*');

        fireEvent.click(screen.getByText('Subir foto / PDF de evidencia'));

        const archivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
        fireEvent.change(entrada, { target: { files: [archivo] } });

        expect(alCambiar).toHaveBeenCalledWith('foto.jpg');
        expect(screen.getByText('foto.jpg')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Quitar adjunto'));
        expect(alCambiar).toHaveBeenLastCalledWith(undefined);
        expect(screen.getByText('Subir foto / PDF de evidencia')).toBeTruthy();
    });

    it('FileUpload muestra error e invalidez', () => {
        const { container, rerender } = render(
            <FileUpload label="Evidencia" error="Adjunto obligatorio" />,
        );

        expect(screen.getByRole('alert').textContent).toBe(
            'Adjunto obligatorio',
        );

        rerender(<FileUpload label="Evidencia" invalid />);

        expect(screen.queryByRole('alert')).toBeNull();
        const boton = container.querySelector('button') as HTMLButtonElement;
        expect(boton.getAttribute('aria-invalid')).toBe('true');
    });
});
