/// <reference types="cypress" />

describe('E2E-04 Registro, edición y eliminación de excedentes', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/programa/redistribucion');
    });

    it('crea, edita y elimina un excedente detectado', () => {
        cy.contains('button', 'Nuevo excedente').click();

        cy.contains('label', 'Obra de Origen').find('select').select(1);
        cy.contains('label', 'Almacén').find('select').select(1);
        cy.contains('label', 'Material').find('select').select(1);
        cy.contains('label', 'Cantidad').find('input').clear().type('12.5');
        cy.contains('button', 'Registrar Excedente').click();

        cy.contains('Excedente registrado').should('be.visible');
        cy.screenshot('E2E-04-excedente-creado');
        cy.get('tbody tr').last().within(() => {
            cy.contains('Editar').click();
        });

        cy.contains('Modificar Excedente Detectado').should('be.visible');
        cy.contains('label', 'Cantidad').find('input').clear().type('13.5');
        cy.contains('button', 'Guardar Cambios').click();
        cy.contains('Excedente actualizado').should('be.visible');
        cy.screenshot('E2E-04-excedente-editado');

        cy.get('tbody tr').last().within(() => {
            cy.contains('Eliminar').click({ force: true });
        });
        cy.contains('Eliminar Excedente').should('be.visible');
        cy.get('.panel').contains('button', 'Eliminar').click();
        cy.contains('Excedente eliminado').should('be.visible');
        cy.screenshot('E2E-04-excedente-eliminado');
    });
});
