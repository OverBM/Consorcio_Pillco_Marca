/**
 * Resuelve cuál de los enlaces de navegación corresponde a la ruta actual.
 *
 * Regla: gana la coincidencia exacta; si no existe, gana el prefijo más
 * específico (más largo) respetando el límite de segmento, de modo que
 * `/programa/redistribucion` no marque `/programa` y viceversa.
 */
export function resolveActiveHref(
    pathname: string,
    hrefs: string[],
): string | null {
    const clean = normalizar(pathname);
    let mejor: string | null = null;
    let mejorLargo = -1;

    for (const href of hrefs) {
        const objetivo = normalizar(href);

        if (clean === objetivo) {
            return href;
        }

        const coincideSegmento =
            objetivo !== '/' && clean.startsWith(`${objetivo}/`);

        if (coincideSegmento && objetivo.length > mejorLargo) {
            mejor = href;
            mejorLargo = objetivo.length;
        }
    }

    return mejor;
}

function normalizar(ruta: string): string {
    let sinQuery = ruta.split('?')[0] ?? '/';

    while (sinQuery.endsWith('/')) {
        sinQuery = sinQuery.slice(0, -1);
    }

    return sinQuery === '' ? '/' : sinQuery;
}
