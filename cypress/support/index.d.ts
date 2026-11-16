/// <reference types="cypress" />

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Inicia sesión por UI y conserva la cookie de sesión entre specs.
             */
            login(email?: string, password?: string): Chainable<void>;
        }
    }
}

export {};
