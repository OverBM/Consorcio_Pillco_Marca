/// <reference types="cypress" />

describe('E2E-02 Navegación y búsqueda global', () => {
    beforeEach(() => {
        cy.login();
    });

    it('encuentra un módulo por su nombre exacto desde la búsqueda global', () => {
        cy.visit('/panel');
        cy.get('button[aria-label="Buscar"]').click();
        cy.get('input[aria-label="Término de búsqueda"]')
            .clear()
            .type('mermas');

        cy.contains('Control de Mermas').should('be.visible');
        cy.screenshot('E2E-02.1-busqueda-mermas');
        cy.get('input[aria-label="Término de búsqueda"]').type('{enter}');
        cy.url().should('include', '/mermas');
        cy.contains('Mermas').should('exist');
    });

    it('superpone el buscador global al encabezado fijo de la aplicación', () => {
        cy.visit('/panel');
        cy.get('button[aria-label="Buscar"]').click();
        cy.get('[data-testid="buscador-global-overlay"]').should('be.visible');

        cy.get('[data-testid="buscador-global-overlay"]').then((overlay) => {
            const capaBuscador = Number.parseInt(
                window.getComputedStyle(overlay[0]).zIndex,
                10,
            );

            cy.get('header')
                .first()
                .then((header) => {
                    const capaEncabezado = Number.parseInt(
                        window.getComputedStyle(header[0]).zIndex,
                        10,
                    );

                    expect(capaBuscador).to.be.greaterThan(capaEncabezado);
                });
        });

        cy.get('input[aria-label="Término de búsqueda"]')
            .clear()
            .type('reportes');
        cy.contains('Reportes e Indicadores').should('be.visible');
        cy.screenshot('E2E-02.4-buscador-superposicion');
        cy.screenshot('buscador-superposicion');
    });

    it('navega al módulo de reportes desde el menú superior', () => {
        cy.visit('/reportes');
        cy.contains('Reportes e Indicadores').should('be.visible');
        cy.contains('Valor del inventario').should('be.visible');
        cy.screenshot('E2E-02.2-reportes');
        cy.screenshot('reportes-escritorio', { capture: 'fullPage' });
    });

    it('alterna el modo oscuro y conserva la preferencia al recargar', () => {
        cy.visit('/panel');
        cy.get('button[aria-label="Cambiar a modo oscuro"]').click();
        cy.get('html').should('have.attr', 'data-theme', 'oscuro');
        cy.get('body').should('have.css', 'background-color', 'rgb(11, 15, 23)');
        cy.screenshot('E2E-02.3-modo-oscuro');
        cy.screenshot('panel-modo-oscuro', { capture: 'fullPage' });
        cy.reload();
        cy.get('html').should('have.attr', 'data-theme', 'oscuro');
    });
});
