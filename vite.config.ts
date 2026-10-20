import { fileURLToPath } from 'node:url';
import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import type { Plugin } from 'vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

// Leaflet toca `window` al evaluarse (leaflet-src.js:230): en SSR se sustituye
// por un módulo vacío, porque el mapa se inicializa solo dentro de useEffect.
const leafletSsrStub: Plugin = {
    name: 'leaflet-ssr-stub',
    enforce: 'pre',
    resolveId(source: string, _importer: string | undefined, options) {
        if (source === 'leaflet' && options?.ssr) {
            return '\0leaflet-ssr-stub';
        }

        return null;
    },
    load(id: string) {
        if (id === '\0leaflet-ssr-stub') {
            return 'export default {};';
        }

        return null;
    },
};

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['resources/js/**/*.test.{ts,tsx}'],
        setupFiles: ['resources/js/tests/setup.ts'],
        alias: {
            '@inertiajs/react': fileURLToPath(
                new URL('resources/js/tests/mocks/inertia.tsx', import.meta.url),
            ),
        },
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: 'coverage',
            include: ['resources/js/**/*.{ts,tsx}'],
            exclude: [
                'resources/js/actions/**',
                'resources/js/routes/**',
                'resources/js/wayfinder/**',
                'resources/js/types/**',
                'resources/js/tests/**',
                'resources/js/components/ui/**',
                'resources/js/components/icons/**',
                'resources/js/app.tsx',
                'resources/js/**/*.d.ts',
            ],
        },
    },
    plugins: lazyPlugins(() => [
        leafletSsrStub,
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        inertia(),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ]),
    ssr: {
        noExternal: ['leaflet'],
    },
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'tailwind.config.js',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            '.github/**',
            'composer.json',
            'resources/js/components/ui/*',
            'resources/views/mail/*',
        ],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            entryPoint: 'resources/css/app.css',
        },
    },
});
