import { FIGURE_META } from './meta';

export type FigureId = keyof typeof FIGURE_META;

export { FIGURE_META };

const markup: Record<FigureId, () => Promise<{ default: string }>> = {
    pmu: () => import('./markup/pmu.svg?raw'),
    pmi: () => import('./markup/pmi.svg?raw'),
    obra: () => import('./markup/obra.svg?raw'),
    materiales: () => import('./markup/materiales.svg?raw'),
    geo: () => import('./markup/geo.svg?raw'),
    cierre: () => import('./markup/cierre.svg?raw'),
};

let styles: Promise<unknown> | null = null;

/**
 * Carga el CSS compartido una sola vez y devuelve el markup de la figura.
 * Cada figura viaja en su propio chunk: no se descarga hasta que se pide.
 */
export async function loadFigure(id: FigureId): Promise<string> {
    styles ??= import('./figures.css');
    await styles;
    const module = await markup[id]();

    return module.default;
}
