import './commands';

// Silencia errores de hidratación de Leaflet en el runner headless.
Cypress.on('uncaught:exception', (error) => {
    if (
        error.message.includes('ResizeObserver') ||
        error.message.includes('Map container is already initialized')
    ) {
        return false;
    }

    return undefined;
});
