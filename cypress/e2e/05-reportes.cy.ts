/// <reference types="cypress" />

describe('E2E-05 Reportes funcionales e impacto', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/reportes');
    });

    it('muestra indicadores reales y aplica filtros de consulta', () => {
        cy.contains('Reportes e Indicadores').should('be.visible');
        cy.contains('Valor del inventario').should('be.visible');
        cy.contains('Stock crítico').should('be.visible');
        cy.contains('Mermas del período').should('be.visible');
        cy.contains('Cumplimiento de transferencias').should('be.visible');

        cy.contains('label', 'Obra').find('select').select(1);
        cy.contains('button', 'Aplicar').click();

        cy.url().should('include', 'obra_id=');
        cy.contains('Impacto funcional').should('be.visible');
        cy.screenshot('E2E-05.1-reportes-filtrados');
    });

    it('exporta la tabla filtrada a CSV', () => {
        cy.contains('button', 'Exportar CSV').click();
        cy.contains('Reporte exportado en CSV.').should('be.visible');
        cy.screenshot('E2E-05.2-exportacion-csv');
    });
});
