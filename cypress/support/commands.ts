Cypress.Commands.add(
    'login',
    (
        email = 'admin@pillcomarca.pe',
        password = '12345678',
    ): Cypress.Chainable<void> => {
        cy.session(
            [email, password],
            () => {
                cy.visit('/login');
                cy.get('#login-email').clear().type(email);
                cy.get('#login-password').clear().type(password, {
                    log: false,
                });
                cy.contains('button', 'Ingresar al Panel').click();
                cy.url().should('include', '/panel');
                cy.contains('Panel General').should('exist');
            },
            {
                cacheAcrossSpecs: true,
                validate: () => {
                    cy.visit('/panel');
                    cy.url().should('include', '/panel');
                    cy.contains('Panel General').should('exist');
                },
            },
        );

        return cy.wrap(undefined) as unknown as Cypress.Chainable<void>;
    },
);
