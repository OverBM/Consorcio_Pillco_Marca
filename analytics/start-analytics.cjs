#!/usr/bin/env node
/**
 * Arranca el motor predictivo y ejecuta una corrida inicial.
 * Se usa desde `composer run dev`; no depende de rutas absolutas del equipo:
 * busca Python en OBRAFLOW_PYTHON, PATH o D:\Python312 como último recurso.
 */

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const analytics = __dirname;
const root = path.resolve(analytics, '..');
const esWindows = process.platform === 'win32';

function buscarPython() {
    const candidatos = [
        process.env.OBRAFLOW_PYTHON,
        esWindows ? 'python.exe' : 'python3',
        esWindows ? 'python' : 'python',
        'python3',
        esWindows ? 'D:\\Python312\\python.exe' : null,
    ].filter(Boolean);

    for (const candidato of candidatos) {
        const prueba = spawnSync(candidato, ['--version'], {
            stdio: 'ignore',
        });

        if (prueba.status === 0) {
            return candidato;
        }
    }

    return null;
}

function tokenDesdeEnv() {
    const archivo = path.join(root, '.env');

    if (!fs.existsSync(archivo)) {
        return 'dev-token';
    }

    const contenido = fs.readFileSync(archivo, 'utf8');
    const coincidencia = contenido.match(/^ANALYTICS_API_TOKEN=(.*)$/m);

    return coincidencia ? coincidencia[1].trim() : 'dev-token';
}

const python = buscarPython();

if (!python) {
    console.error(
        'No se encontró Python. Instala Python 3.12 o define OBRAFLOW_PYTHON con la ruta al ejecutable.',
    );
    process.exit(1);
}

if (process.argv.includes('--check')) {
    console.log(`Python: ${python}`);
    process.exit(0);
}

const entorno = {
    ...process.env,
    PYTHONPATH: analytics,
    ANALYTICS_API_TOKEN: process.env.ANALYTICS_API_TOKEN ?? tokenDesdeEnv(),
};

console.log(`Motor predictivo: ${python} (${analytics})`);

const servidor = spawn(
    python,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001'],
    { cwd: analytics, env: entorno, stdio: 'inherit' },
);

servidor.on('exit', (codigo) => process.exit(codigo ?? 0));

let intentos = 0;
const espera = setInterval(async () => {
    intentos += 1;

    try {
        const respuesta = await fetch('http://127.0.0.1:8001/health');

        if (!respuesta.ok) {
            throw new Error(`health ${respuesta.status}`);
        }

        clearInterval(espera);
        console.log('Motor arriba. Ejecutando analítica inicial...');

        const php = esWindows ? 'php.exe' : 'php';
        const pipeline = spawn(php, ['artisan', 'analitica:ejecutar'], {
            cwd: root,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let salida = '';

        pipeline.stdout.on('data', (datos) => {
            salida += datos.toString();
            process.stdout.write(datos);
        });

        pipeline.stderr.on('data', (datos) => {
            salida += datos.toString();
            process.stderr.write(datos);
        });

        pipeline.on('exit', (codigo) => {
            if (codigo === 0) {
                return;
            }

            if (/Ya hay una ejecución de analítica en curso/i.test(salida)) {
                console.warn(
                    'Ya hay una analítica en curso; se omite la corrida inicial. El scheduler continuará con las corridas programadas.',
                );

                return;
            }

            console.warn(
                'La corrida inicial de analítica no terminó correctamente.',
            );
        });
    } catch {
        if (intentos >= 40) {
            clearInterval(espera);
            console.warn(
                'El motor no respondió en 20 s. La app sigue funcionando con los últimos resultados.',
            );
        }
    }
}, 500);
