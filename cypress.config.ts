import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:8000',
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        fixturesFolder: 'cypress/fixtures',
        screenshotsFolder: 'cypress/screenshots',
        videosFolder: 'cypress/videos',
        video: false,
        screenshotOnRunFailure: true,
        viewportWidth: 1440,
        viewportHeight: 900,
        defaultCommandTimeout: 12000,
        pageLoadTimeout: 60000,
        requestTimeout: 20000,
        retries: {
            runMode: 0,
            openMode: 0,
        },
    },
});
