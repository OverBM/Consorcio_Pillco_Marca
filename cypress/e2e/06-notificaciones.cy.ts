/// <reference types="cypress" />

describe('E2E-06 Notificaciones por rol', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/panel');
    });

    it('abre el centro de notificaciones y permite filtrar por rol', () => {
        cy.get('button[aria-label^="Notificaciones"]').click();
        cy.get('[role="dialog"][aria-label="Notificaciones y alertas"]').should(
            'be.visible',
        );
        cy.contains('button', 'Todas').should('be.visible');
        cy.contains('button', 'Sin leer').should('be.visible');
        cy.contains('button', 'Mi rol').click();
        cy.contains('button', 'Mi rol').should(
            'have.attr',
            'aria-pressed',
            'true',
        );
        cy.get('button[aria-label="Actualizar notificaciones"]').should('exist');
        cy.screenshot('E2E-06-notificaciones-rol');
    });
});
