/// <reference types="cypress" />

describe('E2E-03 Registro y validación de proveedores', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/compras/proveedores');
    });

    it('valida el RUC y registra un proveedor con datos válidos', () => {
        const sufijo = String(Date.now()).slice(-5);
        const ruc = `20${sufijo}0011`.slice(0, 11);
        const razon = `Proveedor Cypress ${sufijo}`;

        cy.contains('button', 'Homologar Proveedor').click();
        cy.contains('button', 'Registrar').click();
        cy.contains('El RUC debe tener 11 dígitos.').should('be.visible');

        cy.contains('label', 'RUC (11 dígitos)')
            .find('input')
            .clear()
            .type(ruc);
        cy.contains('label', 'Razón Social')
            .find('input')
            .clear()
            .type(razon);
        cy.contains('label', 'Contacto comercial')
            .find('input')
            .clear()
            .type('Contacto Cypress');
        cy.contains('button', 'Registrar').click();

        cy.contains('Proveedor registrado.').should('be.visible');
        cy.contains(razon).should('be.visible');
        cy.screenshot('E2E-03-proveedor-registrado');
    });
});
