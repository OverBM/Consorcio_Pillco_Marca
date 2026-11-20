/// <reference types="cypress" />

describe('E2E-01 Autenticación de usuarios', () => {
    it('rechaza credenciales inválidas y permanece en el login', () => {
        cy.fixture('usuarios').then((usuarios) => {
            cy.visit('/login');
            cy.get('#login-email').clear().type(usuarios.invalido.email);
            cy.get('#login-password').clear().type(usuarios.invalido.password);
            cy.contains('button', 'Ingresar al Panel').click();

            cy.contains('Las credenciales ingresadas son incorrectas').should(
                'be.visible',
            );
            cy.url().should('include', '/login');
            cy.screenshot('E2E-01.1-credenciales-invalidas');
        });
    });

    it('inicia sesión con el usuario administrador y cierra sesión', () => {
        cy.fixture('usuarios').then((usuarios) => {
            cy.login(usuarios.admin.email, usuarios.admin.password);
            cy.visit('/panel');
            cy.contains('Panel General').should('exist');
            cy.screenshot('E2E-01.2-sesion-iniciada');
            cy.get('[aria-label="Cerrar sesión"]').first().click();
            cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
        });
    });
});
