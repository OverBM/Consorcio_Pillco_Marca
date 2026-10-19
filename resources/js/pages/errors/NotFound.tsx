import { Head } from '@inertiajs/react';

import { IconArrowRight, IconHardHat, IconMapPin } from '@/components/icons';

interface NotFoundProps {
    path?: string;
}

export default function NotFound({ path }: NotFoundProps) {
    return (
        <>
            <Head title="Página no encontrada" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-[#000000] px-6 py-16 text-white">
                <div className="w-full max-w-xl">
                    <div className="mb-8 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d1ffca] text-[#000000]">
                            <IconHardHat size={22} />
                        </span>
                        <div className="flex flex-col">
                            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#888888]">
                                Consorcio Pillco Marca
                            </span>
                            <span className="font-display text-sm font-bold uppercase tracking-wide">
                                Valle del Mantaro
                            </span>
                        </div>
                    </div>

                    <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#d1ffca]">
                        Error 404
                    </p>

                    <h1 className="font-display mt-3 text-[clamp(3.5rem,16vw,7rem)] leading-[0.85] font-black uppercase tracking-tight">
                        Ruta no
                        <br />
                        encontrada
                    </h1>

                    <p className="mt-6 max-w-md text-sm leading-relaxed text-[#bbbbbb]">
                        La dirección que intentas abrir no existe o fue movida. Verifica el enlace desde el
                        menú lateral, o regresa al panel de supervisión.
                    </p>

                    {path && (
                        <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 font-mono text-[11px] text-[#888888]">
                            <IconMapPin size={14} className="flex-shrink-0 text-[#d1ffca]" />
                            <span className="truncate">{path}</span>
                        </p>
                    )}

                    <div className="mt-9 flex flex-wrap gap-3">
                        <a
                            href="/panel"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d1ffca] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#000000] transition-colors hover:bg-[#b8f5b0] focus:outline-none focus:ring-2 focus:ring-[#d1ffca] focus:ring-offset-2 focus:ring-offset-[#000000]"
                        >
                            Ir al panel
                            <IconArrowRight size={16} />
                        </a>
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 rounded-lg border border-[#333333] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#dddddd] transition-colors hover:border-[#d1ffca] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#333333] focus:ring-offset-2 focus:ring-offset-[#000000]"
                        >
                            Volver al inicio
                        </a>
                    </div>

                    <p className="mt-10 font-mono text-[10px] uppercase tracking-widest text-[#555555]">
                        SICAAO · V3.0 — PMI / PMU
                    </p>
                </div>
            </div>
        </>
    );
}
