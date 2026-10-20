import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, HttpClient } from '../../services/http/client';

function respuestaJson(cuerpo: unknown, status = 200): Response {
    return new Response(JSON.stringify(cuerpo), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function respuestaTexto(cuerpo: string, status = 200): Response {
    return new Response(cuerpo, { status });
}

function stubFetch(
    impl: (url: string, init?: RequestInit) => Promise<Response>,
) {
    const fn = vi.fn(impl);
    vi.stubGlobal('fetch', fn);
    return fn;
}

function cabecerasDe(init: RequestInit | undefined): Record<string, string> {
    return (init?.headers as Record<string, string> | undefined) ?? {};
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('services/http/client', () => {
    it('construye un GET y desenvuelve el sobre de datos', async () => {
        const fetchFalso = stubFetch(async () =>
            respuestaJson({
                data: { id: 7 },
                message: 'ok',
                meta: { total: 1 },
            }),
        );

        const respuesta = await HttpClient.get<{ id: number }>('/obras');

        expect(respuesta.data).toEqual({ id: 7 });
        expect(respuesta.message).toBe('ok');
        expect(respuesta.meta).toEqual({ total: 1 });

        const [url, init] = fetchFalso.mock.calls[0];
        expect(url).toBe('/api/v1/obras');
        expect(init?.method).toBe('GET');
        expect(init?.credentials).toBe('same-origin');

        const cabeceras = cabecerasDe(init);
        expect(cabeceras.Accept).toBe('application/json');
        expect(cabeceras['X-Requested-With']).toBe('XMLHttpRequest');
    });

    it('envía POST con cuerpo JSON y cabecera Content-Type', async () => {
        const fetchFalso = stubFetch(async () =>
            respuestaJson({ data: { ok: true } }),
        );

        await HttpClient.post('/obras', { nombre: 'Obra' });

        const [, init] = fetchFalso.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).toBe(JSON.stringify({ nombre: 'Obra' }));
        expect(cabecerasDe(init)['Content-Type']).toBe('application/json');
    });

    it('omite Content-Type cuando no hay cuerpo', async () => {
        const fetchFalso = stubFetch(async () => respuestaJson({ data: null }));

        await HttpClient.post('/obras');

        const [, init] = fetchFalso.mock.calls[0];
        expect(init?.body).toBeUndefined();
        expect(cabecerasDe(init)['Content-Type']).toBeUndefined();
    });

    it('usa los verbos PUT, PATCH y DELETE', async () => {
        const fetchFalso = stubFetch(async () => respuestaJson({ data: null }));

        await HttpClient.put('/obras/1', { a: 1 });
        await HttpClient.patch('/obras/1', { a: 2 });
        await HttpClient.delete('/obras/1');

        expect(fetchFalso.mock.calls.map(([, init]) => init?.method)).toEqual([
            'PUT',
            'PATCH',
            'DELETE',
        ]);
    });

    it('respeta una URL absoluta y añade la barra inicial', async () => {
        const fetchFalso = stubFetch(async () => respuestaJson({ data: 1 }));

        await HttpClient.get('https://api.externa.test/recurso');
        await HttpClient.get('obras');

        expect(fetchFalso.mock.calls[0][0]).toBe(
            'https://api.externa.test/recurso',
        );
        expect(fetchFalso.mock.calls[1][0]).toBe('/api/v1/obras');
    });

    it('tolera respuestas sin el sobre data', async () => {
        stubFetch(async () => respuestaJson([1, 2, 3]));

        const respuesta = await HttpClient.get<number[]>('/lista');

        expect(respuesta.data).toEqual([1, 2, 3]);
        expect(respuesta.message).toBeUndefined();
    });

    it('acepta el alias mensaje en el sobre', async () => {
        stubFetch(async () => respuestaJson({ data: 5, mensaje: 'hola' }));

        const respuesta = await HttpClient.get<number>('/valor');

        expect(respuesta.data).toBe(5);
        expect(respuesta.message).toBe('hola');
    });

    it('devuelve data nula cuando el cuerpo no es JSON válido', async () => {
        stubFetch(async () => respuestaTexto('texto plano'));

        const respuesta = await HttpClient.get('/raro');

        expect(respuesta.data).toBeNull();
    });

    it('devuelve data nula cuando la respuesta no tiene cuerpo', async () => {
        stubFetch(async () => new Response(null));

        const respuesta = await HttpClient.get('/vacio');

        expect(respuesta.data).toBeNull();
    });

    it('convierte un error de red en ApiError con status 0', async () => {
        stubFetch(() => Promise.reject(new Error('sin conexión')));

        const error = await HttpClient.get('/x').catch(
            (capturado: unknown) => capturado,
        );

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(0);
        expect((error as ApiError).message).toBe('sin conexión');
    });

    it('usa un mensaje genérico ante un fallo no Error', async () => {
        stubFetch(() => Promise.reject({ caido: true }));

        const error = await HttpClient.get('/x').catch(
            (capturado: unknown) => capturado,
        );

        expect((error as ApiError).message).toBe(
            'Error de conexión con el servidor',
        );
    });

    it('propaga los errores de validación de la API', async () => {
        stubFetch(async () =>
            respuestaJson(
                {
                    message: 'Validación fallida',
                    errors: { email: ['Requerido'] },
                    codigo: 'E422',
                },
                422,
            ),
        );

        const error = await HttpClient.post('/obras', { nombre: '' }).catch(
            (capturado: unknown) => capturado,
        );

        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(422);
        expect(apiError.code).toBe('E422');
        expect(apiError.message).toBe('Validación fallida');
        expect(apiError.hasFieldErrors()).toBe(true);
        expect(apiError.errors.email).toEqual(['Requerido']);
    });

    it('acepta el alias mensaje en los errores', async () => {
        stubFetch(async () => respuestaJson({ mensaje: 'No autorizado' }, 401));

        const error = await HttpClient.get('/privado').catch(
            (capturado: unknown) => capturado,
        );

        expect((error as ApiError).message).toBe('No autorizado');
        expect((error as ApiError).hasFieldErrors()).toBe(false);
    });

    it('genera un mensaje por defecto si el error no trae cuerpo', async () => {
        stubFetch(async () => respuestaTexto('', 500));

        const error = await HttpClient.get('/x').catch(
            (capturado: unknown) => capturado,
        );

        expect((error as ApiError).status).toBe(500);
        expect((error as ApiError).message).toBe('Error HTTP 500');
    });

    it('genera un mensaje por defecto si el error trae texto plano', async () => {
        stubFetch(async () => respuestaTexto('Servicio caído', 503));

        const error = await HttpClient.get('/x').catch(
            (capturado: unknown) => capturado,
        );

        expect((error as ApiError).message).toBe('Error HTTP 503');
    });

    it('adjunta el token CSRF desde la cookie', async () => {
        document.cookie = 'XSRF-TOKEN=abc%20def';
        const fetchFalso = stubFetch(async () => respuestaJson({ data: 1 }));

        await HttpClient.get('/x');

        const [, init] = fetchFalso.mock.calls[0];
        expect(cabecerasDe(init)['X-XSRF-TOKEN']).toBe('abc def');

        document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });

    it('respeta una cabecera Content-Type propia', async () => {
        const fetchFalso = stubFetch(async () => respuestaJson({ data: 1 }));

        await HttpClient.request('/x', {
            method: 'POST',
            body: '{}',
            headers: { 'Content-Type': 'text/plain' },
        });

        const [, init] = fetchFalso.mock.calls[0];
        expect(cabecerasDe(init)['Content-Type']).toBe('text/plain');
    });

    it('expone los valores por defecto de ApiError', () => {
        const error = new ApiError('fallo');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ApiError');
        expect(error.status).toBe(0);
        expect(error.code).toBeUndefined();
        expect(error.hasFieldErrors()).toBe(false);
    });
});
