// Utilidad clsx/merge minimalista (sin dependencias extra).

export type ClassValue = string | number | false | null | undefined;
export type ClassInput = ClassValue | ClassInput[];

export function cn(...inputs: ClassInput[]): string {
    const out: string[] = [];
    const walk = (items: ClassInput[]) => {
        for (const item of items) {
            if (!item) {
                continue;
            }
            if (Array.isArray(item)) {
                walk(item);
            } else {
                out.push(String(item));
            }
        }
    };
    walk(inputs);
    return out.join(' ').trim();
}