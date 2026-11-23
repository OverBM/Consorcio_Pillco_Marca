/**
 * Figuras de Anatomy para la vitrina de procesos.
 *
 * Requiere la skill instalada en el repo (no es dependencia de runtime):
 *   npx skills add wheresryan22/anatomy -a opencode
 *   node resources/js/features/vitrina/figures/build.mjs [pmu|pmi|cierre] [--preview]
 *
 * Escribe el markup nativo en figures/markup/, el CSS compartido en
 * figures/figures.css y los metadatos en figures/meta.ts. Con --preview deja
 * además SVG autocontenidos en D:/_obraflow_tmp/opencode/figures para revisión.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const SKILL = join(ROOT, '.agents', 'skills', 'anatomy');

let k;
try {
    k = await import(pathToFileURL(join(SKILL, 'kit', 'iso-kit.mjs')).href);
} catch {
    console.error('Falta la skill Anatomy. Instálala con:');
    console.error('  npx skills add wheresryan22/anatomy -a opencode');
    process.exit(1);
}

const W = 760;
const H = 470;

/** Recorta los decimales de los trazos y los pasa a coordenadas relativas. */
const compact = (svg) =>
    svg.replace(/ d="([^"]*)"/g, (_match, data) => {
        const tokens = data.match(/[MLZ]|-?\d+(?:\.\d+)?/g) ?? [];
        const out = [];
        let cursor = 0;
        let x = 0;
        let y = 0;
        let startX = 0;
        let startY = 0;
        while (cursor < tokens.length) {
            const command = tokens[cursor] ?? '';
            cursor += 1;
            if (command === 'Z') {
                out.push('Z');
                x = startX;
                y = startY;
                continue;
            }
            if (command !== 'M' && command !== 'L') {
                continue;
            }
            const nx = Math.round(Number(tokens[cursor]));
            const ny = Math.round(Number(tokens[cursor + 1]));
            cursor += 2;
            if (command === 'M') {
                out.push(`M${nx} ${ny}`);
                x = nx;
                y = ny;
                startX = nx;
                startY = ny;
            } else {
                out.push(`l${nx - x} ${ny - y}`);
                x = nx;
                y = ny;
            }
        }
        return ` d="${out.join('')}"`;
    });

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const bob = (markup, delay = 0) =>
    `<g class="fig-bob" style="animation-delay:${delay}s">${markup}</g>`;
const blink = (markup, delay = 0) =>
    `<g class="fig-blink" style="animation-delay:${delay}s">${markup}</g>`;
const sway = (markup, delay = 0) =>
    `<g class="fig-sway" style="animation-delay:${delay}s">${markup}</g>`;

/** Desplazamiento en px de pantalla entre dos puntos del mundo. */
const shift = (P, from, to) => {
    const a = k.iso(from, P);
    const b = k.iso(to, P);
    return `${(b[0] - a[0]).toFixed(1)}px, ${(b[1] - a[1]).toFixed(1)}px`;
};

/**
 * CSS compartido de las figuras. Se importa una sola vez (con la primera
 * figura que se abre) y usa los tokens de la landing, no una copia del tema.
 */
const BASE_CSS = `.figura-iso{
  --fig-paper:var(--color-mist,#f2f2ef);--fig-face:var(--color-white,#ffffff);--fig-top:var(--color-white,#ffffff);
  --fig-shade-0:#c3c3bf;--fig-shade-1:#d3d3cf;--fig-shade-2:#e3e3df;--fig-shade-3:#f3f3ef;
  --fig-hi:var(--color-black,#26262a);--fig-mid:var(--color-smoke,#6a6a70);--fig-lo:#8a8a90;--fig-faint:var(--color-ash,#bcbcc1);
  --fig-lit:var(--color-black,#1b1b1b);--fig-lit-top:var(--color-mint,#d1ffca);--fig-lit-shade:#b6efa9;
  --fig-halo:#7c7c74;--fig-halo-opacity:.34;--fig-dot:var(--color-slate,#3a3a3e);
  --fig-weight:1.3px;--fig-ease:cubic-bezier(.4,0,.2,1);
}
.figura-iso .iso-svg{display:block;width:100%;height:auto;overflow:visible}

.figura-iso .iso-fill{fill:var(--fig-paper);stroke:none}
.figura-iso .iso-solid[data-lit]>.iso-fill{fill:var(--fig-face)}
.figura-iso .iso-shade,.figura-iso .iso-top{stroke:none}
.figura-iso .iso-shade[data-shade="0"]{fill:var(--fig-shade-0)}
.figura-iso .iso-shade[data-shade="1"]{fill:var(--fig-shade-1)}
.figura-iso .iso-shade[data-shade="2"]{fill:var(--fig-shade-2)}
.figura-iso .iso-shade[data-shade="3"]{fill:var(--fig-shade-3)}
.figura-iso .iso-top{fill:var(--fig-top)}
.figura-iso .iso-solid[data-lit]>.iso-top{fill:var(--fig-lit-top)}
.figura-iso .iso-solid[data-lit]>.iso-shade{fill:var(--fig-lit-shade)}
.figura-iso .iso-line{fill:none;stroke:var(--fig-lo);stroke-width:var(--fig-weight);stroke-linecap:round;stroke-linejoin:round}
.figura-iso .iso-line[data-tone="hi"]{stroke:var(--fig-hi)}
.figura-iso .iso-line[data-tone="mid"]{stroke:var(--fig-mid)}
.figura-iso .iso-line[data-tone="lo"]{stroke:var(--fig-lo)}
.figura-iso .iso-line[data-tone="faint"]{stroke:var(--fig-faint)}
.figura-iso .iso-line[data-tone="lit"]{stroke:var(--fig-lit)}
.figura-iso .iso-solid[data-lit]>.iso-edge{stroke:var(--fig-lit)}
.figura-iso .iso-halo{fill:var(--fig-halo);stroke:none;filter:blur(9px);opacity:var(--fig-halo-opacity);transform:translateY(3px)}
.figura-iso .iso-dots circle{fill:var(--fig-dot);stroke:none;opacity:.32}
.figura-iso .iso-dots[data-tone="hi"] circle{opacity:.85}
.figura-iso .iso-dots[data-tone="mid"] circle{opacity:.45}
.figura-iso .iso-dots[data-tone="lo"] circle{opacity:.22}
.figura-iso .iso-dots[data-tone="faint"] circle{opacity:.12}
.figura-iso .iso-face-text{fill:var(--fig-mid);font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;letter-spacing:.04em}
.figura-iso .iso-face-text[data-tone="hi"]{fill:var(--fig-hi)}
.figura-iso .iso-face-text[data-tone="lo"]{fill:var(--fig-lo)}
.figura-iso .iso-face-text[data-tone="faint"]{fill:var(--fig-faint)}
.figura-iso .fig-layer{animation:fig-assemble .62s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(var(--fig-layer) * 90ms)}
.figura-iso .fig-needle{animation:fig-needle 5.2s var(--fig-ease) infinite}
.figura-iso .fig-lamp{animation:fig-lamp 4.4s var(--fig-ease) infinite}
@keyframes fig-assemble{from{transform:translateY(26px) scale(.99)}to{transform:none}}
@keyframes fig-needle{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes fig-lamp{0%,100%{opacity:.45}50%{opacity:1}}
.figura-iso .fig-bob{animation:fig-bob 3.8s var(--fig-ease) infinite}
.figura-iso .fig-blink{animation:fig-blink 3.2s var(--fig-ease) infinite}
.figura-iso .fig-sway{animation:fig-sway 4.6s var(--fig-ease) infinite;transform-box:fill-box;transform-origin:center}
@keyframes fig-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes fig-blink{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes fig-sway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}
@media (prefers-reduced-motion:reduce){.figura-iso *{animation:none!important}}`;

/** Divide el dibujo en capas de profundidad para el armado de entrada. */
const assembled = (body) => {
    const parts = Array.isArray(body) ? body : [body];
    const size = Math.max(1, Math.ceil(parts.length / 4));
    const groups = [];

    for (let index = 0; index < parts.length; index += size) {
        groups.push(
            `<g class="fig-layer" style="--fig-layer:${groups.length}">${parts
                .slice(index, index + size)
                .join('')}</g>`,
        );
    }

    return groups.join('');
};

/** SVG nativo: solo la máquina; el CSS y la tarjeta los pone la página. */
const renderNative = (spec) =>
    k.figureSvg({
        width: W,
        height: spec.height ?? H,
        label: spec.label,
        body: assembled(spec.body),
    });

/** SVG autocontenido para revisión e impresión. */
const renderPreview = (spec) =>
    k.figureSvg({
        width: W,
        height: spec.height ?? H,
        label: spec.label,
        className: 'figura-iso',
        body: `<style>${BASE_CSS}${spec.motion}.figura-iso .fig-layer{animation:none!important}</style><rect width="${W}" height="${spec.height ?? H}" fill="var(--color-mist,#f2f2ef)"/>${assembled(spec.body)}`,
    });

/** Base con patas, tornillos, regla y cordón de soldadura. */
const bench = (P, plan, plateH = 10, footH = 6) => {
    const out = [
        `<path class="iso-halo" d="${k.haloOf(plan, -plateH - footH, plateH, P)}"/>`,
    ];
    for (const [x, y] of k.corners(plan, 20)) {
        out.push(
            S(k.cylinder(x, y, 7, -plateH - footH, 1.6, P, 12), { tone: 'lo' }),
        );
        out.push(
            S(
                k.cylinder(
                    x,
                    y,
                    5.4,
                    -plateH - footH + 1.6,
                    footH - 1.6,
                    P,
                    12,
                ),
                { tone: 'mid' },
            ),
        );
    }
    out.push(S(k.slabOf(plan, -plateH, plateH, P, 4, 1.4), { tone: 'mid' }));
    out.push(
        L(k.planOutline(k.insetPlan(plan, 6), 0, P, 4), { tone: 'faint' }),
    );
    out.push(L(k.sideSeam(plan, -4, P, 6), { tone: 'faint' }));
    const screws = k.corners(plan, 11);
    out.push(
        L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 12)).join(''), {
            tone: 'lo',
        }),
    );
    out.push(
        D(
            screws.map(([x, y]) => k.iso([x, y, 0], P)),
            { size: 0.5 },
        ),
    );

    const strip = {
        x: plan.x + 10,
        y: plan.y + plan.d - 13,
        w: plan.w - 20,
        d: 6,
        r: 1,
    };
    out.push(S(k.slabOf(strip, 0, 0.7, P, 2), { tone: 'lo', crease: 'none' }));
    const ticks = k.topTicks(
        strip.x + 5,
        strip.x + strip.w - 5,
        8,
        5,
        strip.y + 0.9,
        0.7,
        [2, 3.6],
        P,
    );
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
    out.push(
        D(
            [
                k.iso([strip.x + 3, strip.y + 3, 0.7], P),
                k.iso([strip.x + strip.w - 3, strip.y + 3, 0.7], P),
            ],
            { size: 0.45 },
        ),
    );
    return out;
};

/** Dial circular sobre la base, con aguja. */
const dial = (P, cx, cy, z, r, turns, { engraved = '' } = {}) => {
    const out = [];
    out.push(S(k.cylinder(cx, cy, r + 4.5, z, 3, P, 24), { tone: 'mid' }));
    out.push(
        S(k.cylinder(cx, cy, r, z + 3, 7, P, 32, 0.7), {
            tone: 'hi',
            crease: 'lo',
        }),
    );
    out.push(L(k.ring(cx, cy, r - 2, z + 10, P, 32), { tone: 'lo' }));
    const ticks = k.radialTicks(cx, cy, r - 3, 14, 4, z + 10, [1.2, 2.6], P);
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
    out.push(L(k.ring(cx, cy, 1.7, z + 10, P, 12), { tone: 'mid' }));
    for (let led = 0; led < 4; led += 1) {
        const ledAngle = (led / 4) * Math.PI * 2 + Math.PI / 4;
        out.push(
            blink(
                D(
                    [
                        k.iso(
                            [
                                cx + Math.cos(ledAngle) * (r - 1.4),
                                cy + Math.sin(ledAngle) * (r - 1.4),
                                z + 10.5,
                            ],
                            P,
                        ),
                    ],
                    { size: 0.5, tone: 'hi' },
                ),
                led * 0.45,
            ),
        );
    }
    const angle = turns * Math.PI * 2;
    const needleCenter = k.iso([cx, cy, z + 10], P);
    out.push(
        `<g class="fig-needle" style="transform-origin:${needleCenter[0].toFixed(1)}px ${needleCenter[1].toFixed(1)}px">${L(
            k.lineOnTop(
                [cx - Math.sin(angle) * 3, cy + Math.cos(angle) * 3],
                [
                    cx + Math.sin(angle) * (r - 4),
                    cy - Math.cos(angle) * (r - 4),
                ],
                z + 10.2,
                P,
            ),
            { tone: 'hi' },
        )}</g>`,
    );
    if (engraved) {
        out.push(
            k.faceTextSvg(
                k.topMatrix([cx, cy + r - 5], z + 10, P, 'x'),
                engraved,
                {
                    size: 2.6,
                    tone: 'lo',
                    anchor: 'middle',
                },
            ),
        );
    }
    return out;
};

const knob = (P, cx, cy, z, r, h) => {
    const out = [];
    out.push(S(k.cylinder(cx, cy, r, z, h, P, 14), { tone: 'mid' }));
    out.push(
        L(k.knurl(cx, cy, r, z + 0.6, z + h - 0.6, 14, P), { tone: 'lo' }),
    );
    out.push(
        L(k.lineOnTop([cx - r, cy], [cx + r, cy], z + h, P), { tone: 'hi' }),
    );
    out.push(D([k.iso([cx, cy, z + h], P)], { size: 0.55, tone: 'hi' }));
    return out;
};

// ─────────────────────────────────────────────────────────────
// #pmu — Banco de portafolio
// ─────────────────────────────────────────────────────────────
function buildPmu() {
    const BASE = { x: -148, y: -66, w: 296, d: 132, r: 12 };
    const BASE_H = 10;
    const BIN_Y = -30;
    const BINS = [
        { x: -90, fill: 74 },
        { x: 0, fill: 68 },
        { x: 90, fill: 62 },
    ];
    const PORTAL_X = [-134, 134];
    const RAIL_Y = -12;
    const GANTRY_Z = 60;

    const points = [
        ...k.boxCorners(BASE, -BASE_H - 6, 0),
        [-134, -46, GANTRY_Z + 34],
        [134, 26, GANTRY_Z + 22],
    ];
    const P = k.fitProjection(points, W, H, {
        pad: 40,
        azimuth: 40,
        elevation: 32,
        headroom: 4,
    });

    const out = bench(P, BASE, BASE_H, 6);

    // Barandilla del fondo.
    for (const x of [-128, -44, 44, 128]) {
        out.push(
            S(k.cylinder(x, -58, 2.2, BASE_H, 26, P, 10), { tone: 'mid' }),
        );
        out.push(D([k.iso([x, -58, BASE_H + 26], P)], { size: 0.4 }));
    }
    for (const z of [24, 29]) {
        out.push(
            S(
                k.slabOf(
                    { x: -132, y: -59.2, w: 264, d: 2.4, r: 1 },
                    BASE_H + z,
                    2,
                    P,
                    2,
                ),
                { tone: 'mid' },
            ),
        );
    }

    // Portales del pórtico.
    for (const x of PORTAL_X) {
        for (const y of [-46, 26]) {
            out.push(
                S(k.cylinder(x, y, 3.6, BASE_H, GANTRY_Z - BASE_H, P, 16), {
                    tone: 'mid',
                }),
            );
            out.push(
                S(k.cylinder(x, y, 5, GANTRY_Z, 4, P, 16), { tone: 'mid' }),
            );
            out.push(
                L(k.sideArc(x, y, 3.6, BASE_H + 10, P, 10), { tone: 'faint' }),
            );
            out.push(D([k.iso([x, y, BASE_H], P)], { size: 0.5 }));
        }
        out.push(
            S(
                k.slabOf(
                    { x: x - 6, y: -52, w: 12, d: 84, r: 2 },
                    GANTRY_Z + 4,
                    6,
                    P,
                    3,
                    0.5,
                ),
                { tone: 'mid' },
            ),
        );
        out.push(
            D(
                [
                    k.iso([x, -34, GANTRY_Z + 10], P),
                    k.iso([x, 14, GANTRY_Z + 10], P),
                ],
                { size: 0.45 },
            ),
        );
    }

    // Riel del carro.
    out.push(
        S(
            k.slabOf(
                { x: -146, y: RAIL_Y - 3.5, w: 292, d: 7, r: 1.5 },
                GANTRY_Z + 2,
                4,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    for (const x of [-146, 146]) {
        out.push(
            S(
                k.slabOf(
                    { x: x - 2, y: RAIL_Y - 7, w: 5, d: 14, r: 1.2 },
                    GANTRY_Z + 2,
                    8,
                    P,
                    2,
                ),
                { tone: 'lo' },
            ),
        );
        out.push(D([k.iso([x, RAIL_Y, GANTRY_Z + 10], P)], { size: 0.45 }));
    }
    for (let lamp = 0; lamp < 4; lamp += 1) {
        const x = -90 + lamp * 60;
        out.push(
            blink(
                D([k.iso([x, RAIL_Y, GANTRY_Z + 7], P)], {
                    size: 0.55,
                    tone: 'hi',
                }),
                lamp * 0.45,
            ),
        );
    }

    // Tolvas: fondo, paredes, contenido.
    const bins = [];
    for (const [binIndex, bin] of BINS.entries()) {
        const plan = { x: bin.x - 30, y: BIN_Y, w: 60, d: 54, r: 2.5 };
        const parts = [];
        parts.push(S(k.slabOf(plan, BASE_H, 2, P, 4), { tone: 'mid' }));
        parts.push(
            S(
                k.slabOf(
                    { x: plan.x, y: plan.y, w: plan.w, d: 2.6, r: 1 },
                    BASE_H + 2,
                    22,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'mid' },
            ),
        );
        for (const wx of [plan.x, plan.x + plan.w - 2.6]) {
            parts.push(
                S(
                    k.slabOf(
                        {
                            x: wx,
                            y: plan.y + 2.6,
                            w: 2.6,
                            d: plan.d - 5.2,
                            r: 1,
                        },
                        BASE_H + 2,
                        20,
                        P,
                        2,
                        0.4,
                    ),
                    { tone: 'mid' },
                ),
            );
        }
        parts.push(
            S(
                k.slabOf(
                    {
                        x: plan.x,
                        y: plan.y + plan.d - 2.6,
                        w: plan.w,
                        d: 2.6,
                        r: 1,
                    },
                    BASE_H + 2,
                    15,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'mid' },
            ),
        );
        parts.push(
            `<g style="animation:pmu-flap-${binIndex + 1} 24s var(--fig-ease) infinite">${S(
                k.slabOf(
                    {
                        x: bin.x - 8,
                        y: plan.y + plan.d - 2.8,
                        w: 16,
                        d: 1.8,
                        r: 0.5,
                    },
                    BASE_H + 14,
                    3,
                    P,
                    2,
                    0.3,
                ),
                { tone: 'hi', crease: 'lo' },
            )}</g>`,
        );
        parts.push(
            blink(
                S(
                    k.cylinder(
                        bin.x,
                        plan.y + plan.d - 1.4,
                        1.5,
                        BASE_H + 17,
                        1.2,
                        P,
                        10,
                    ),
                    { tone: 'hi', crease: 'lo' },
                ),
                binIndex * 0.7,
            ),
        );
        const fillH = 2 + bin.fill * 0.15;
        const content = k.insetPlan(plan, 4.5);
        const fill = [];
        fill.push(
            S(k.slabOf(content, BASE_H + 2, fillH, P, 3, 0.5), {
                tone: 'hi',
                crease: 'lo',
            }),
        );
        for (let row = 0; row < 3; row += 1) {
            const y = content.y + 7 + row * 12;
            fill.push(
                L(
                    k.lineOnTop(
                        [content.x + 5, y],
                        [content.x + content.w - 5, y],
                        BASE_H + 2 + fillH,
                        P,
                    ),
                    { tone: 'faint' },
                ),
            );
        }
        fill.push(
            L(k.planOutline(content, BASE_H + 2 + fillH, P, 3), {
                tone: 'faint',
            }),
        );
        parts.push(`<g class="pmu-fill-${binIndex + 1}">${fill.join('')}</g>`);
        bins.push({ ...bin, plan, parts });
    }
    bins.slice()
        .sort((a, b) => k.depthOf([a.x, 0, 0], P) - k.depthOf([b.x, 0, 0], P))
        .forEach((bin) => out.push(...bin.parts));

    // Carro del pórtico con tolva de reparto.
    const carriage = (cx) => {
        const parts = [];
        const CY = RAIL_Y;
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 17, y: CY - 14, w: 34, d: 28, r: 3 },
                    GANTRY_Z + 6,
                    8,
                    P,
                    3,
                    0.6,
                ),
                { tone: 'mid' },
            ),
        );
        for (const bx of [cx - 10, cx + 10]) {
            parts.push(
                S(k.cylinder(bx, CY, 3.6, GANTRY_Z + 6, 5, P, 12), {
                    tone: 'lo',
                }),
            );
        }
        parts.push(
            S(k.cylinder(cx, CY, 4.4, GANTRY_Z + 14, 4, P, 16), {
                tone: 'mid',
            }),
        );
        parts.push(
            S(k.cylinder(cx, CY, 4.4, GANTRY_Z - 18, 32, P, 16), {
                tone: 'mid',
                crease: 'lo',
            }),
        );
        parts.push(
            L(
                [GANTRY_Z - 14, GANTRY_Z - 6]
                    .map((z) => k.sideArc(cx, CY, 4.4, z, P, 10))
                    .join(''),
                { tone: 'faint' },
            ),
        );
        // Compuerta: la pieza activa, en mint.
        parts.push(
            `<g data-part="pmu-gate" style="animation:pmu-gate 24s var(--fig-ease) infinite">${S(
                k.slabOf(
                    { x: cx - 5, y: CY - 1.2, w: 10, d: 2.4, r: 0.6 },
                    GANTRY_Z - 21,
                    7,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'hi', lit: true },
            )}</g>`,
        );
        parts.push(knob(P, cx, CY, GANTRY_Z + 18, 5, 4));
        return parts;
    };

    const start = BINS[0].x;
    out.push(
        `<g data-part="pmu-carriage" style="animation:pmu-carriage 24s var(--fig-ease) infinite">${carriage(start).join('')}</g>`,
    );

    // Varilla de mando de la compuerta.
    out.push(
        S(
            k.slabOf(
                { x: 102, y: 30, w: 18, d: 14, r: 2 },
                BASE_H,
                12,
                P,
                3,
                0.5,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        `<g data-part="pmu-rod" style="animation:pmu-rod 24s var(--fig-ease) infinite">${S(
            k.cylinder(121, 37, 2.6, BASE_H + 6, 8, P, 12),
            { tone: 'mid', crease: 'none' },
        )}${L(k.ring(121, 37, 2.6, BASE_H + 14, P, 12), { tone: 'lo' })}</g>`,
    );
    out.push(
        S(
            k.slabOf(
                { x: 78, y: 33, w: 26, d: 8, r: 1.6 },
                BASE_H + 4,
                4,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(S(k.cylinder(76, 37, 2.6, BASE_H + 6, 8, P, 12), { tone: 'mid' }));

    // Dial de avance consolidado.
    out.push(...dial(P, -124, 38, BASE_H, 15, 0.68, { engraved: '68' }));

    // Legajos del portafolio.
    const binders = [];
    for (let index = 0; index < 3; index += 1) {
        const plan = { x: -96, y: 42, w: 34, d: 20, r: 1.5 };
        binders.push(
            S(k.slabOf(plan, BASE_H + index * 3.2, 3, P, 2, 0.4), {
                tone: 'mid',
            }),
        );
        binders.push(
            L(
                k.planOutline(
                    k.insetPlan(plan, 2),
                    BASE_H + index * 3.2 + 3,
                    P,
                    2,
                ),
                { tone: 'faint' },
            ),
        );
        binders.push(
            D([k.iso([plan.x + 3, plan.y + 3, BASE_H + index * 3.2 + 3], P)], {
                size: 0.4,
            }),
        );
    }
    out.push(bob(binders.join(''), 0.5));

    // Caja de herramientas.
    const box = { x: 30, y: 36, w: 44, d: 22, r: 1.5 };
    out.push(S(k.slabOf(box, BASE_H, 10, P, 3, 0.5), { tone: 'mid' }));
    out.push(
        S(k.slabOf(k.insetPlan(box, 0.6), BASE_H + 10, 4, P, 3, 0.4), {
            tone: 'mid',
        }),
    );
    out.push(L(k.sideSeam(box, BASE_H + 5, P, 3), { tone: 'faint' }));
    out.push(
        bob(
            `${S(
                k.slabOf(
                    { x: box.x + 16, y: box.y + 8, w: 12, d: 6, r: 2 },
                    BASE_H + 14,
                    3,
                    P,
                    3,
                ),
                { tone: 'mid' },
            )}${L(
                k.lineOnTop(
                    [box.x + 16, box.y + 11],
                    [box.x + 28, box.y + 11],
                    BASE_H + 17,
                    P,
                ),
                { tone: 'hi' },
            )}`,
            0.2,
        ),
    );
    out.push(
        D(
            [
                k.iso([box.x + 6, box.y + 18, BASE_H + 5], P),
                k.iso([box.x + 38, box.y + 18, BASE_H + 5], P),
            ],
            { size: 0.45 },
        ),
    );

    // Placa de rótulo del banco.
    const plate = { x: -44, y: 40, w: 46, d: 15, r: 1.5 };
    out.push(S(k.slabOf(plate, 0, 0.8, P, 2), { tone: 'lo', crease: 'none' }));
    for (let row = 0; row < 3; row += 1) {
        out.push(
            L(
                k.lineOnTop(
                    [plate.x + 5, plate.y + 4 + row * 3.6],
                    [
                        plate.x + plate.w - (row === 2 ? 15 : 5),
                        plate.y + 4 + row * 3.6,
                    ],
                    0.8,
                    P,
                ),
                { tone: 'faint' },
            ),
        );
    }

    const baseY = k.iso([start, RAIL_Y, GANTRY_Z - 14], P);
    const moves = BINS.map((bin) => {
        const at = k.iso([bin.x, RAIL_Y, GANTRY_Z - 14], P);
        return `${(at[0] - baseY[0]).toFixed(1)}px, ${(at[1] - baseY[1]).toFixed(1)}px`;
    });
    const gateDown = shift(P, [0, 0, 0], [0, 0, -7]).split(', ')[1];

    const motion = `
@keyframes pmu-carriage{
  0%,7%{transform:translate(0,0)}
  13%,20%{transform:translate(${moves[0]})}
  26%,33%{transform:translate(${moves[1]})}
  39%,46%{transform:translate(${moves[2]})}
  54%,61%{transform:translate(${moves[1]})}
  69%,76%{transform:translate(${moves[0]})}
  84%,100%{transform:translate(0,0)}
}
@keyframes pmu-gate{
  0%,15%{transform:translate(0,0)}
  17%,21%{transform:translate(0,${gateDown})}
  23%,28%{transform:translate(0,0)}
  30%,34%{transform:translate(0,${gateDown})}
  36%,41%{transform:translate(0,0)}
  43%,47%{transform:translate(0,${gateDown})}
  49%,56%{transform:translate(0,0)}
  58%,62%{transform:translate(0,${gateDown})}
  64%,71%{transform:translate(0,0)}
  73%,77%{transform:translate(0,${gateDown})}
  79%,100%{transform:translate(0,0)}
}
@keyframes pmu-rod{
  0%,12%{transform:translate(0,0)}
  15%,21%{transform:translate(${shift(P, [0, 0, 0], [-9, 0, 0]).split(', ')[0]},0)}
  25%,41%{transform:translate(0,0)}
  44%,50%{transform:translate(${shift(P, [0, 0, 0], [-9, 0, 0]).split(', ')[0]},0)}
  54%,71%{transform:translate(0,0)}
  74%,80%{transform:translate(${shift(P, [0, 0, 0], [-9, 0, 0]).split(', ')[0]},0)}
  84%,100%{transform:translate(0,0)}
}
@keyframes pmu-fill-1{
  0%,22%{transform:translateY(0)}
  26%,78%{transform:translateY(-2px)}
  82%,94%{transform:translateY(-4px)}
  98%,100%{transform:translateY(0)}
}
@keyframes pmu-fill-2{
  0%,34%{transform:translateY(0)}
  38%,62%{transform:translateY(-2px)}
  66%,94%{transform:translateY(-4px)}
  98%,100%{transform:translateY(0)}
}
@keyframes pmu-fill-3{
  0%,46%{transform:translateY(0)}
  50%,94%{transform:translateY(-2px)}
  98%,100%{transform:translateY(0)}
}
.figura-iso .pmu-fill-1{animation:pmu-fill-1 24s var(--fig-ease) infinite}
.figura-iso .pmu-fill-2{animation:pmu-fill-2 24s var(--fig-ease) infinite}
.figura-iso .pmu-fill-3{animation:pmu-fill-3 24s var(--fig-ease) infinite}
@keyframes pmu-flap-1{0%,16%{transform:translateY(0)}18%,22%{transform:translateY(4px)}26%,100%{transform:translateY(0)}}
@keyframes pmu-flap-2{0%,29%{transform:translateY(0)}31%,35%{transform:translateY(4px)}39%,100%{transform:translateY(0)}}
@keyframes pmu-flap-3{0%,42%{transform:translateY(0)}44%,48%{transform:translateY(4px)}52%,100%{transform:translateY(0)}}
`;

    return {
        fig: 'Fig 1',
        title: 'Banco de portafolio',
        hint: 'El carro recorre las tres obras',
        readout: 'obras 3 · avance 68% · excedente → obra 3',
        label: 'Banco de portafolio: un pórtico con tolva de reparto recorre tres tolvas que acumulan el avance de tres obras; la compuerta en mint deja caer el excedente en la tolva seleccionada y el dial marca el avance consolidado de 68 por ciento.',
        body: out,
        motion,
    };
}

// ─────────────────────────────────────────────────────────────
// #pmi — Línea de cinco estaciones
// ─────────────────────────────────────────────────────────────
function buildPmi() {
    const BASE = { x: -158, y: -62, w: 316, d: 124, r: 12 };
    const BASE_H = 10;
    const BELT_Z = BASE_H + 7;
    const STATIONS = [-120, -60, 0, 60, 120];
    const GATES = [-90, -30, 30, 90];

    const points = [
        ...k.boxCorners(BASE, -BASE_H - 6, 0),
        [-158, -30, 64],
        [158, 26, 64],
    ];
    const P = k.fitProjection(points, W, H, {
        pad: 40,
        azimuth: 40,
        elevation: 32,
        headroom: 4,
    });

    const out = bench(P, BASE, BASE_H, 6);

    // Cinta: superficie, guías y travesaños.
    out.push(
        S(
            k.slabOf(
                { x: -136, y: -18, w: 272, d: 36, r: 2 },
                BASE_H,
                BELT_Z - BASE_H,
                P,
                3,
                0.5,
            ),
            { tone: 'mid' },
        ),
    );
    for (const y of [-20, 16]) {
        out.push(
            S(k.slabOf({ x: -138, y, w: 276, d: 3, r: 1 }, BASE_H, 9, P, 2), {
                tone: 'lo',
            }),
        );
    }
    for (let x = -128; x <= 128; x += 16) {
        out.push(
            L(k.lineOnTop([x, -16], [x, 14], BELT_Z, P), { tone: 'faint' }),
        );
    }
    out.push(
        L(k.lineOnTop([-134, -16], [134, -16], BELT_Z, P), { tone: 'faint' }),
    );
    out.push(
        L(k.lineOnTop([-134, 14], [134, 14], BELT_Z, P), { tone: 'faint' }),
    );

    // Estaciones: poste con lámpara detrás de la cinta y marcas en el borde.
    for (const [index, x] of STATIONS.entries()) {
        out.push(
            S(k.cylinder(x, -30, 2.6, BASE_H, 44, P, 12), { tone: 'mid' }),
        );
        out.push(
            S(
                k.slabOf(
                    { x: x - 4, y: -33, w: 8, d: 6, r: 1 },
                    BASE_H + 44,
                    3,
                    P,
                    2,
                ),
                { tone: 'lo' },
            ),
        );
        out.push(
            `<g style="animation:pmi-lamp-${index + 1} 30s var(--fig-ease) infinite">${S(
                k.cylinder(x, -30, 3.4, BASE_H + 47, 3, P, 14),
                { tone: 'hi', crease: 'lo' },
            )}${L(k.ring(x, -30, 3.4, BASE_H + 50, P, 14), { tone: 'lo' })}${D(
                [k.iso([x, -30, BASE_H + 50], P)],
                { size: 0.45 },
            )}</g>`,
        );
        out.push(
            `<g style="animation:pmi-head-${index + 1} 30s var(--fig-ease) infinite">${S(
                k.cylinder(x, -38, 3, BASE_H + 30, 6, P, 14),
                { tone: 'hi', crease: 'lo' },
            )}${L(k.ring(x, -38, 3, BASE_H + 36, P, 14), { tone: 'lo' })}</g>`,
        );
        const marks = [];
        for (let dot = 0; dot <= index; dot += 1) {
            marks.push(
                k.iso([x - index * 1.6 + dot * 3.2, 14.5, BELT_Z + 0.2], P),
            );
        }
        out.push(D(marks, { size: 0.55, tone: 'mid' }));
    }

    // Compuertas sobre la cinta.
    for (const [index, x] of GATES.entries()) {
        const parts = [];
        parts.push(
            S(k.cylinder(x, 26, 2.6, BASE_H, 34, P, 12), { tone: 'mid' }),
        );
        parts.push(
            blink(
                `${S(k.cylinder(x, 26, 4.2, BASE_H + 34, 3, P, 12), {
                    tone: 'mid',
                })}${D([k.iso([x, 26, BASE_H + 37], P)], { size: 0.45 })}`,
                index * 0.4,
            ),
        );
        parts.push(
            S(
                k.slabOf(
                    { x: x - 2, y: -22, w: 4, d: 46, r: 1 },
                    BASE_H + 9,
                    3,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'mid' },
            ),
        );
        parts.push(
            S(
                k.slabOf(
                    { x: x - 3.5, y: -26, w: 7, d: 6, r: 1 },
                    BASE_H + 8,
                    5,
                    P,
                    2,
                ),
                { tone: 'lo' },
            ),
        );
        out.push(
            `<g data-part="pmi-gate-${index + 1}" style="animation:pmi-gate-${index + 1} 30s var(--fig-ease) infinite">${parts.join('')}</g>`,
        );
    }

    // Pallet con la pieza activa.
    const carriage = (cx) => {
        const parts = [];
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 15, y: -17, w: 30, d: 34, r: 1.5 },
                    BELT_Z,
                    6,
                    P,
                    3,
                    0.5,
                ),
                { tone: 'mid' },
            ),
        );
        for (const fx of [cx - 11, cx + 11]) {
            for (const fy of [-13, 13]) {
                parts.push(
                    S(k.cylinder(fx, fy, 2, BELT_Z - 1, 2, P, 10), {
                        tone: 'lo',
                    }),
                );
            }
        }
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 9, y: -14, w: 18, d: 22, r: 1 },
                    BELT_Z + 6,
                    14,
                    P,
                    2,
                    0.4,
                ),
                {
                    tone: 'hi',
                    lit: true,
                    crease: 'lo',
                },
            ),
        );
        parts.push(
            L(
                k.planOutline(
                    { x: cx - 7, y: -12, w: 14, d: 18, r: 0.8 },
                    BELT_Z + 20,
                    P,
                    2,
                ),
                { tone: 'faint' },
            ),
        );
        for (let rib = 0; rib < 3; rib += 1) {
            const y = -10 + rib * 7;
            parts.push(
                L(k.lineOnTop([cx - 5, y], [cx + 5, y], BELT_Z + 20, P), {
                    tone: 'faint',
                }),
            );
        }
        return parts;
    };
    out.push(
        `<g data-part="pmi-carrier" style="animation:pmi-carrier 30s var(--fig-ease) infinite">${carriage(STATIONS[0]).join('')}</g>`,
    );

    // Cabrestante de avance al final de la cinta.
    out.push(
        S(
            k.slabOf(
                { x: 138, y: -18, w: 20, d: 36, r: 3 },
                BASE_H,
                14,
                P,
                3,
                0.5,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: 130, y: -4, w: 10, d: 8, r: 1.5 },
                BASE_H + 8,
                4,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(k.cylinder(150, 8, 12, BASE_H + 14, 4, P, 24, 0.6), {
            tone: 'hi',
            crease: 'lo',
        }),
    );
    out.push(L(k.ring(150, 8, 9.6, BASE_H + 18, P, 24), { tone: 'lo' }));
    out.push(
        L(k.knurl(150, 8, 12, BASE_H + 14.5, BASE_H + 17.5, 24, P), {
            tone: 'lo',
        }),
    );
    out.push(
        L(
            [
                k.lineOnTop([150, 8], [150, -1], BASE_H + 18, P),
                k.lineOnTop([150, 8], [159, 8], BASE_H + 18, P),
                k.lineOnTop([150, 8], [150, 17], BASE_H + 18, P),
            ].join(''),
            { tone: 'mid' },
        ),
    );
    out.push(D([k.iso([150, 8, BASE_H + 18], P)], { size: 0.55, tone: 'hi' }));

    // Dial de fase.
    out.push(...dial(P, -140, 42, BASE_H, 13, 0.6, { engraved: '3/5' }));

    // Puesto de mando con tres pulsadores.
    const panel = { x: -82, y: 30, w: 40, d: 24, r: 2 };
    out.push(S(k.slabOf(panel, BASE_H, 5, P, 3, 0.5), { tone: 'mid' }));
    out.push(
        S(k.slabOf(k.insetPlan(panel, 2.5), BASE_H + 5, 3, P, 2), {
            tone: 'lo',
        }),
    );
    for (let index = 0; index < 3; index += 1) {
        out.push(
            blink(
                `${S(
                    k.cylinder(
                        panel.x + 9 + index * 11,
                        panel.y + 12,
                        2.4,
                        BASE_H + 8,
                        2,
                        P,
                        12,
                    ),
                    { tone: 'mid' },
                )}${D(
                    [
                        k.iso(
                            [
                                panel.x + 9 + index * 11,
                                panel.y + 12,
                                BASE_H + 10,
                            ],
                            P,
                        ),
                    ],
                    { size: 0.5, tone: 'hi' },
                )}`,
                index * 0.6,
            ),
        );
    }
    out.push(
        L(k.planOutline(k.insetPlan(panel, 4), BASE_H + 8, P, 2), {
            tone: 'faint',
        }),
    );

    // Bandeja de piezas a la entrada.
    const tray = { x: 24, y: 28, w: 48, d: 24, r: 2 };
    out.push(S(k.slabOf(tray, BASE_H, 2, P, 3), { tone: 'mid' }));
    out.push(
        S(
            k.slabOf(
                { x: tray.x, y: tray.y, w: 3, d: tray.d, r: 1 },
                BASE_H + 2,
                5,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: tray.x + tray.w - 3, y: tray.y, w: 3, d: tray.d, r: 1 },
                BASE_H + 2,
                5,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: tray.x + 3, y: tray.y, w: tray.w - 6, d: 3, r: 1 },
                BASE_H + 2,
                5,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    for (let index = 0; index < 3; index += 1) {
        out.push(
            S(
                k.slabOf(
                    {
                        x: tray.x + 8 + index * 12,
                        y: tray.y + 7,
                        w: 9,
                        d: 12,
                        r: 1,
                    },
                    BASE_H + 2,
                    4 + index * 1.4,
                    P,
                    2,
                    0.3,
                ),
                {
                    tone: 'hi',
                    crease: 'lo',
                },
            ),
        );
    }

    const baseAt = k.iso([STATIONS[0], 0, BELT_Z], P);
    const moves = STATIONS.map((x) => {
        const at = k.iso([x, 0, BELT_Z], P);
        return `${(at[0] - baseAt[0]).toFixed(1)}px, ${(at[1] - baseAt[1]).toFixed(1)}px`;
    });
    const lift = shift(P, [0, 0, 0], [0, 0, 26]).split(', ')[1];
    const headDrop = shift(P, [0, 0, 0], [0, 0, -6]).split(', ')[1];

    const gateKey = (index) => {
        const windows = [
            [
                [16, 32],
                [68, 84],
            ],
            [
                [24, 40],
                [60, 76],
            ],
            [
                [32, 48],
                [52, 68],
            ],
            [[42, 62]],
        ][index];
        const steps = ['0%,' + windows[0][0] + '%{transform:translate(0,0)}'];
        for (const [from, to] of windows) {
            steps.push(`${from + 2}%,${to}%{transform:translate(0,${lift})}`);
        }
        for (let cursor = 0; cursor < windows.length; cursor += 1) {
            const to = windows[cursor][1];
            const next = windows[cursor + 1]?.[0] ?? 100;
            steps.push(`${to + 3}%,${next}%{transform:translate(0,0)}`);
        }
        return `@keyframes pmi-gate-${index + 1}{
${steps.join('\n')}
}`;
    };

    const motion = `
@keyframes pmi-carrier{
  0%,8%{transform:translate(0,0)}
  14%,22%{transform:translate(${moves[1]})}
  28%,36%{transform:translate(${moves[2]})}
  42%,50%{transform:translate(${moves[3]})}
  56%,64%{transform:translate(${moves[4]})}
  70%,78%{transform:translate(${moves[3]})}
  84%,92%{transform:translate(${moves[2]})}
  96%,100%{transform:translate(0,0)}
}
${[0, 1, 2, 3].map(gateKey).join('\n')}
@keyframes pmi-lamp-1{
  0%,4%{opacity:1}
  9%,92%{opacity:.35}
  97%,100%{opacity:1}
}
@keyframes pmi-lamp-2{
  0%,12%{opacity:.35}
  16%,25%{opacity:1}
  30%,100%{opacity:.35}
}
@keyframes pmi-lamp-3{
  0%,26%{opacity:.35}
  30%,39%{opacity:1}
  44%,82%{opacity:.35}
  87%,94%{opacity:1}
  98%,100%{opacity:.35}
}
@keyframes pmi-lamp-4{
  0%,40%{opacity:.35}
  44%,53%{opacity:1}
  58%,68%{opacity:.35}
  72%,80%{opacity:1}
  84%,100%{opacity:.35}
}
@keyframes pmi-lamp-5{
  0%,54%{opacity:.35}
  58%,67%{opacity:1}
  72%,100%{opacity:.35}
}
@keyframes pmi-head-1{
  0%,4%{transform:translate(0,${headDrop})}
  8%,94%{transform:translate(0,0)}
  98%,100%{transform:translate(0,${headDrop})}
}
@keyframes pmi-head-2{
  0%,12%{transform:translate(0,0)}
  16%,24%{transform:translate(0,${headDrop})}
  28%,100%{transform:translate(0,0)}
}
@keyframes pmi-head-3{
  0%,26%{transform:translate(0,0)}
  30%,38%{transform:translate(0,${headDrop})}
  42%,82%{transform:translate(0,0)}
  86%,94%{transform:translate(0,${headDrop})}
  98%,100%{transform:translate(0,0)}
}
@keyframes pmi-head-4{
  0%,40%{transform:translate(0,0)}
  44%,52%{transform:translate(0,${headDrop})}
  56%,68%{transform:translate(0,0)}
  72%,80%{transform:translate(0,${headDrop})}
  84%,100%{transform:translate(0,0)}
}
@keyframes pmi-head-5{
  0%,54%{transform:translate(0,0)}
  58%,66%{transform:translate(0,${headDrop})}
  70%,100%{transform:translate(0,0)}
}
`;

    return {
        fig: 'Fig 2',
        title: 'Línea de cinco estaciones',
        hint: 'El pallet avanza y las compuertas se abren',
        readout: 'fase 3 · gate 3 · estación 3 de 5',
        label: 'Línea de cinco estaciones: una cinta con cinco puestos marcados, cuatro compuertas que se levantan al paso y un pallet con la pieza en mint que recorre la línea; el dial marca la fase tres de cinco.',
        body: out,
        motion,
    };
}

// ─────────────────────────────────────────────────────────────
// #cierre — Prensa de cierre y archivador
// ─────────────────────────────────────────────────────────────
function buildCierre() {
    const BASE = { x: -152, y: -64, w: 304, d: 128, r: 12 };
    const BASE_H = 10;
    const PRESS_X = -46;
    const CABINET = { x: 44, y: -30, w: 96, d: 60, r: 3 };

    const points = [
        ...k.boxCorners(BASE, -BASE_H - 6, 0),
        [-150, -20, 132],
        [140, 30, 74],
    ];
    const P = k.fitProjection(points, W, H, {
        pad: 40,
        azimuth: 40,
        elevation: 32,
        headroom: 4,
    });

    const out = bench(P, BASE, BASE_H, 6);

    // Bastidor de la prensa.
    out.push(
        S(
            k.slabOf(
                { x: PRESS_X - 36, y: -30, w: 72, d: 60, r: 3 },
                BASE_H,
                12,
                P,
                3,
                0.6,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        L(
            k.planOutline(
                { x: PRESS_X - 31, y: -25, w: 62, d: 50, r: 2 },
                BASE_H + 12,
                P,
                3,
            ),
            { tone: 'faint' },
        ),
    );
    for (const y of [-24, 24]) {
        out.push(
            S(k.cylinder(PRESS_X - 22, y, 4, BASE_H + 12, 88, P, 16), {
                tone: 'mid',
            }),
        );
        out.push(
            S(k.cylinder(PRESS_X - 22, y, 6, BASE_H + 88, 4, P, 16), {
                tone: 'mid',
            }),
        );
        out.push(
            L(k.sideArc(PRESS_X - 22, y, 4, BASE_H + 24, P, 10), {
                tone: 'faint',
            }),
        );
    }
    out.push(
        S(
            k.slabOf(
                { x: PRESS_X - 36, y: -34, w: 30, d: 68, r: 2 },
                BASE_H + 100,
                14,
                P,
                3,
                0.6,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        D(
            [
                k.iso([PRESS_X - 30, -27, BASE_H + 114], P),
                k.iso([PRESS_X - 30, 27, BASE_H + 114], P),
            ],
            { size: 0.5 },
        ),
    );

    // Mazo de valorizaciones.
    const stack = [];
    for (let index = 0; index < 5; index += 1) {
        const sheet = { x: PRESS_X - 32, y: -20, w: 40, d: 40, r: 1 };
        stack.push(
            S(k.slabOf(sheet, BASE_H + 14 + index * 2, 2, P, 2, 0.4), {
                tone: 'hi',
                crease: 'lo',
            }),
        );
    }
    stack.push(
        L(
            k.planOutline(
                { x: PRESS_X - 30, y: -18, w: 36, d: 36, r: 1 },
                BASE_H + 24,
                P,
                2,
            ),
            { tone: 'faint' },
        ),
    );
    out.push(`<g class="fig-stack">${stack.join('')}</g>`);

    // Pistón y placa: la pieza activa.
    out.push(
        `<g data-part="cierre-platen" style="animation:cierre-platen 26s var(--fig-ease) infinite">${S(
            k.cylinder(PRESS_X - 2, 0, 6, BASE_H + 42, 48, P, 16),
            { tone: 'mid', crease: 'none' },
        )}${S(
            k.slabOf(
                { x: PRESS_X - 34, y: -26, w: 44, d: 52, r: 2 },
                BASE_H + 32,
                8,
                P,
                3,
                0.5,
            ),
            {
                tone: 'hi',
                lit: true,
                crease: 'lo',
            },
        )}${L(k.planOutline({ x: PRESS_X - 31, y: -23, w: 38, d: 46, r: 2 }, BASE_H + 40, P, 3), { tone: 'lo' })}</g>`,
    );

    // Palanca con contrapeso.
    const armZ = BASE_H + 118;
    out.push(
        S(k.cylinder(PRESS_X - 22, 0, 7, armZ, 8, P, 16), { tone: 'mid' }),
    );
    out.push(
        `<g data-part="cierre-lever" style="animation:cierre-lever 26s var(--fig-ease) infinite">${S(
            k.slabOf(
                { x: PRESS_X - 96, y: -3, w: 96, d: 6, r: 2 },
                armZ + 6,
                5,
                P,
                3,
                0.4,
            ),
            { tone: 'mid' },
        )}${S(k.cylinder(PRESS_X - 92, 0, 4.6, armZ + 2, 12, P, 12), { tone: 'lo' })}${S(
            k.cylinder(PRESS_X + 2, 0, 6, armZ + 6, 6, P, 16),
            { tone: 'mid' },
        )}${L(k.knurl(PRESS_X + 2, 0, 6, armZ + 6.5, armZ + 11.5, 16, P), { tone: 'lo' })}</g>`,
    );

    // Rampa de salida del documento.
    out.push(
        S(
            k.slabOf(
                { x: PRESS_X + 34, y: -10, w: 44, d: 20, r: 1 },
                BASE_H + 10,
                2,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: PRESS_X + 72, y: -12, w: 4, d: 24, r: 1 },
                BASE_H + 12,
                4,
                P,
                2,
            ),
            { tone: 'lo' },
        ),
    );
    out.push(
        `<g data-part="cierre-card" style="animation:cierre-card 26s var(--fig-ease) infinite">${S(
            k.slabOf(
                { x: PRESS_X + 40, y: -6, w: 18, d: 14, r: 0.8 },
                BASE_H + 12,
                1.6,
                P,
                2,
                0.3,
            ),
            { tone: 'hi', crease: 'faint' },
        )}</g>`,
    );

    // Archivador con tres gavetas y ocho lecciones.
    out.push(S(k.slabOf(CABINET, BASE_H, 46, P, 4, 0.7), { tone: 'mid' }));
    out.push(L(k.sideSeam(CABINET, BASE_H + 4, P, 4), { tone: 'faint' }));
    out.push(
        S(k.slabOf(k.insetPlan(CABINET, 1.2), BASE_H + 46, 3, P, 4, 0.4), {
            tone: 'mid',
        }),
    );
    for (let index = 0; index < 3; index += 1) {
        const y = CABINET.y + CABINET.d - 4;
        const z = BASE_H + 6 + index * 13;
        const front = { x: CABINET.x + 4, y, w: CABINET.w - 8, d: 3, r: 1 };
        const handle = blink(
            S(
                k.slabOf(
                    { x: front.x + 30, y: y + 3, w: 30, d: 3, r: 1 },
                    z + 4,
                    3,
                    P,
                    2,
                ),
                { tone: 'lo' },
            ),
            index * 0.45,
        );
        if (index === 1) {
            out.push(
                `<g data-part="cierre-drawer" style="animation:cierre-drawer 26s var(--fig-ease) infinite">${S(
                    k.slabOf(front, z, 11, P, 3, 0.4),
                    { tone: 'mid' },
                )}${handle}</g>`,
            );
        } else {
            out.push(S(k.slabOf(front, z, 11, P, 3, 0.4), { tone: 'mid' }));
            out.push(handle);
        }
        out.push(
            L(
                k.lineOnTop(
                    [front.x + 6, y + 1.5],
                    [front.x + 24, y + 1.5],
                    z + 7,
                    P,
                ),
                { tone: 'faint' },
            ),
        );
    }

    // Separadores de lecciones.
    const tabs = [];
    for (let index = 0; index < 8; index += 1) {
        const x = CABINET.x + 10 + index * 10.4;
        const tall = index % 2 === 0 ? 12 : 10;
        tabs.push(
            sway(
                `${S(
                    k.slabOf(
                        { x, y: -14, w: 1.6, d: 24, r: 0.5 },
                        BASE_H + 49,
                        tall,
                        P,
                        2,
                        0.2,
                    ),
                    { tone: 'lo' },
                )}${D([k.iso([x + 0.8, -14, BASE_H + 49 + tall], P)], {
                    size: 0.35,
                })}`,
                index * 0.25,
            ),
        );
    }
    out.push(`<g class="cierre-tabs">${tabs.join('')}</g>`);
    for (const [lamp, lx] of [64, 118].entries()) {
        out.push(
            blink(
                D([k.iso([lx, -20, BASE_H + 49], P)], {
                    size: 0.55,
                    tone: 'hi',
                }),
                lamp * 0.6,
            ),
        );
    }

    // Dial de conformidad.
    out.push(...dial(P, -136, 42, BASE_H, 13, 0.92, { engraved: '92' }));

    // Placa de rótulo.
    const plate = { x: -70, y: 40, w: 44, d: 14, r: 1.5 };
    out.push(S(k.slabOf(plate, 0, 0.8, P, 2), { tone: 'lo', crease: 'none' }));
    for (let row = 0; row < 3; row += 1) {
        out.push(
            L(
                k.lineOnTop(
                    [plate.x + 5, plate.y + 4 + row * 3.4],
                    [
                        plate.x + plate.w - (row === 2 ? 14 : 5),
                        plate.y + 4 + row * 3.4,
                    ],
                    0.8,
                    P,
                ),
                { tone: 'faint' },
            ),
        );
    }

    const platenDown = shift(P, [0, 0, 0], [0, 0, -10]).split(', ')[1];
    const leverDown = shift(P, [0, 0, 0], [0, 0, -14]).split(', ')[1];
    const cardMove = shift(P, [0, 0, 0], [52, 0, 0]);
    const drawerOut = shift(P, [0, 0, 0], [0, 14, 0]);

    const motion = `
@keyframes cierre-platen{
  0%,10%{transform:translate(0,0)}
  16%,28%{transform:translate(0,${platenDown})}
  34%,48%{transform:translate(0,0)}
  54%,66%{transform:translate(0,${platenDown})}
  72%,100%{transform:translate(0,0)}
}
@keyframes cierre-lever{
  0%,10%{transform:translate(0,0)}
  16%,28%{transform:translate(0,${leverDown})}
  34%,48%{transform:translate(0,0)}
  54%,66%{transform:translate(0,${leverDown})}
  72%,100%{transform:translate(0,0)}
}
@keyframes cierre-card{
  0%,36%{transform:translate(0,0);opacity:1}
  44%,90%{transform:translate(${cardMove});opacity:1}
  94%,96%{transform:translate(${cardMove});opacity:0}
  97%,100%{transform:translate(0,0);opacity:0}
}
@keyframes cierre-drawer{
  0%,40%{transform:translate(0,0)}
  48%,76%{transform:translate(${drawerOut.split(', ')[0]},0)}
  84%,100%{transform:translate(0,0)}
}
@keyframes cierre-stack{
  0%,10%{transform:translateY(0)}
  16%,28%{transform:translateY(2px)}
  34%,48%{transform:translateY(0)}
  54%,66%{transform:translateY(2px)}
  72%,100%{transform:translateY(0)}
}
.figura-iso .fig-stack{animation:cierre-stack 26s var(--fig-ease) infinite}
@keyframes cierre-tabs{
  0%,40%{transform:translateY(0)}
  48%,76%{transform:translateY(-2px)}
  84%,100%{transform:translateY(0)}
}
.figura-iso .cierre-tabs{animation:cierre-tabs 26s var(--fig-ease) infinite}
`;

    return {
        fig: 'Fig 3',
        title: 'Prensa de cierre',
        hint: 'La palanca baja y el archivo se abre',
        readout: 'valorizaciones 92% · conformidad 100% · lecciones 8',
        label: 'Prensa de cierre: una palanca acciona un plato que comprime el mazo de valorizaciones; el documento sellado pasa por la rampa al archivador, que abre su gaveta y guarda ocho lecciones aprendidas.',
        body: out,
        motion,
    };
}

// ─────────────────────────────────────────────────────────────
// #obra — Mesa de frentes
// ─────────────────────────────────────────────────────────────
function buildObra() {
    const BASE = { x: -150, y: -64, w: 300, d: 128, r: 12 };
    const BASE_H = 10;
    const FRONTS = [
        { x: -58, levels: 3 },
        { x: 12, levels: 2 },
    ];

    const points = [
        ...k.boxCorners(BASE, -BASE_H - 6, 0),
        [-80, 8, 74],
        [34, 8, 74],
    ];
    const P = k.fitProjection(points, W, H, {
        pad: 40,
        azimuth: 40,
        elevation: 32,
        headroom: 4,
    });

    const out = bench(P, BASE, BASE_H, 6);

    // Dos frentes en distinto avance.
    for (const [frontIndex, front] of FRONTS.entries()) {
        for (let level = 0; level < front.levels; level += 1) {
            const z = BASE_H + 2 + level * 12;
            out.push(
                S(
                    k.slabOf(
                        { x: front.x - 18, y: -34, w: 36, d: 32, r: 1 },
                        z,
                        3,
                        P,
                        3,
                        0.4,
                    ),
                    { tone: 'mid' },
                ),
            );
            out.push(
                S(
                    k.slabOf(
                        { x: front.x - 18, y: -34, w: 36, d: 2.5, r: 1 },
                        z + 3,
                        8,
                        P,
                        2,
                        0.3,
                    ),
                    { tone: 'lo' },
                ),
            );
        }
        const topZ = BASE_H + 2 + (front.levels - 1) * 12 + 3;
        for (const [lampIndex, lx] of [front.x - 10, front.x + 10].entries()) {
            out.push(
                blink(
                    S(k.cylinder(lx, -20, 1.4, topZ, 1.2, P, 10), {
                        tone: 'hi',
                        crease: 'lo',
                    }),
                    frontIndex * 0.4 + lampIndex * 0.5,
                ),
            );
        }
        for (const cx of [front.x - 15, front.x + 15]) {
            for (const cy of [-31, -5]) {
                out.push(
                    S(
                        k.cylinder(
                            cx,
                            cy,
                            1.8,
                            BASE_H,
                            front.levels * 12 + 5,
                            P,
                            10,
                        ),
                        { tone: 'mid' },
                    ),
                );
            }
        }
        out.push(
            L(
                k.planOutline(
                    { x: front.x - 16, y: -32, w: 32, d: 28, r: 1 },
                    BASE_H + 2 + front.levels * 12,
                    P,
                    2,
                ),
                { tone: 'faint' },
            ),
        );
    }

    // Pórtico de control sobre los dos frentes.
    for (const gx of [-80, 34]) {
        out.push(S(k.cylinder(gx, 8, 2.6, BASE_H, 50, P, 12), { tone: 'mid' }));
        out.push(
            S(k.cylinder(gx, 8, 4, BASE_H + 50, 3, P, 12), { tone: 'mid' }),
        );
        out.push(
            blink(
                D([k.iso([gx, 8, BASE_H + 53], P)], {
                    size: 0.55,
                    tone: 'hi',
                }),
                gx > 0 ? 0.6 : 0,
            ),
        );
    }
    out.push(
        S(
            k.slabOf(
                { x: -86, y: 5, w: 126, d: 6, r: 1 },
                BASE_H + 50,
                4,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        L(k.lineOnTop([-82, 8], [36, 8], BASE_H + 54, P), { tone: 'faint' }),
    );

    const carriage = (cx) => {
        const parts = [];
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 8, y: 1, w: 16, d: 14, r: 2 },
                    BASE_H + 54,
                    6,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'mid' },
            ),
        );
        parts.push(
            S(k.cylinder(cx, 8, 3.2, BASE_H + 54, 4, P, 10), { tone: 'lo' }),
        );
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 3, y: -20, w: 6, d: 26, r: 1 },
                    BASE_H + 54,
                    3,
                    P,
                    2,
                ),
                { tone: 'mid' },
            ),
        );
        parts.push(
            `<g data-part="obra-piece" style="animation:obra-piece 22s var(--fig-ease) infinite">${S(
                k.slabOf(
                    { x: cx - 14, y: -33, w: 28, d: 26, r: 1 },
                    BASE_H + 46,
                    4,
                    P,
                    3,
                    0.5,
                ),
                { tone: 'hi', lit: true, crease: 'lo' },
            )}${L(
                [
                    k.rise([cx - 9, -18], BASE_H + 50, BASE_H + 54, P),
                    k.rise([cx + 9, -18], BASE_H + 50, BASE_H + 54, P),
                ].join(''),
                { tone: 'mid' },
            )}</g>`,
        );
        return parts;
    };
    out.push(
        `<g data-part="obra-carriage" style="animation:obra-carriage 22s var(--fig-ease) infinite">${carriage(-58).join('')}</g>`,
    );

    // Panel de EPP.
    out.push(
        S(
            k.slabOf(
                { x: -136, y: 24, w: 46, d: 2.5, r: 1 },
                BASE_H,
                34,
                P,
                2,
                0.4,
            ),
            { tone: 'mid' },
        ),
    );
    for (const lx of [-132, -92]) {
        out.push(S(k.cylinder(lx, 31, 1.8, BASE_H, 8, P, 8), { tone: 'lo' }));
    }
    for (const [lamp, lx] of [-128, -104].entries()) {
        out.push(
            blink(
                D([k.iso([lx, 24.5, BASE_H + 34], P)], {
                    size: 0.5,
                    tone: 'hi',
                }),
                lamp * 0.55,
            ),
        );
    }
    out.push(
        L(
            [
                k.lineOnTop([-130, 24], [-100, 24], BASE_H + 34, P),
                k.lineOnTop([-128, 24], [-128, 21], BASE_H + 30, P),
                k.lineOnTop([-116, 24], [-116, 21], BASE_H + 30, P),
                k.lineOnTop([-104, 24], [-104, 21], BASE_H + 30, P),
            ].join(''),
            { tone: 'lo' },
        ),
    );
    out.push(
        sway(
            `${S(k.cylinder(-126, 26, 4, BASE_H + 24, 3, P, 16), {
                tone: 'hi',
                crease: 'lo',
            })}${L(k.ring(-126, 26, 4, BASE_H + 27, P, 16), {
                tone: 'lo',
            })}`,
            0,
        ),
    );
    out.push(
        sway(
            S(
                k.slabOf(
                    { x: -117, y: 25.6, w: 7, d: 1.6, r: 1 },
                    BASE_H + 22,
                    8,
                    P,
                    2,
                ),
                { tone: 'hi', crease: 'lo' },
            ),
            0.4,
        ),
    );
    out.push(
        sway(
            S(
                k.slabOf(
                    { x: -106, y: 25.5, w: 5, d: 2.4, r: 1 },
                    BASE_H + 22,
                    6,
                    P,
                    2,
                ),
                { tone: 'hi', crease: 'lo' },
            ),
            0.8,
        ),
    );

    // Carro de segregación con tres bocas.
    const cart = { x: 64, y: 34, w: 66, d: 26, r: 3 };
    out.push(S(k.slabOf(cart, BASE_H, 2, P, 3), { tone: 'mid' }));
    out.push(
        S(
            k.slabOf(
                { x: cart.x, y: cart.y, w: cart.w, d: 2.5, r: 1 },
                BASE_H + 2,
                12,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(
            k.slabOf(
                {
                    x: cart.x,
                    y: cart.y + cart.d - 2.5,
                    w: cart.w,
                    d: 2.5,
                    r: 1,
                },
                BASE_H + 2,
                9,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    for (const dx of [cart.x, cart.x + 31, cart.x + cart.w - 2.5]) {
        out.push(
            S(
                k.slabOf(
                    { x: dx, y: cart.y, w: 2.5, d: cart.d, r: 1 },
                    BASE_H + 2,
                    12,
                    P,
                    2,
                ),
                { tone: 'mid' },
            ),
        );
    }
    for (let bin = 0; bin < 3; bin += 1) {
        const lid = {
            x: cart.x + 3 + bin * 20.5,
            y: cart.y,
            w: 18,
            d: cart.d,
            r: 1,
        };
        const markup = `${S(k.slabOf(lid, BASE_H + 14, 2, P, 2), {
            tone: 'lo',
        })}${D([k.iso([lid.x + 9, lid.y + 6, BASE_H + 16], P)], {
            size: 0.5,
        })}`;
        out.push(
            `<g style="animation:obra-lid-${bin + 1} 22s var(--fig-ease) infinite">${markup}</g>`,
        );
    }

    out.push(...dial(P, -130, 50, BASE_H, 13, 0.62, { engraved: '62' }));

    const plate = { x: -46, y: 44, w: 40, d: 14, r: 1.5 };
    out.push(S(k.slabOf(plate, 0, 0.8, P, 2), { tone: 'lo', crease: 'none' }));
    for (let row = 0; row < 3; row += 1) {
        out.push(
            L(
                k.lineOnTop(
                    [plate.x + 5, plate.y + 4 + row * 3.2],
                    [
                        plate.x + plate.w - (row === 2 ? 12 : 5),
                        plate.y + 4 + row * 3.2,
                    ],
                    0.8,
                    P,
                ),
                { tone: 'faint' },
            ),
        );
    }

    const origin = k.iso([-58, 8, BASE_H + 54], P);
    const moves = FRONTS.map((front) => {
        const at = k.iso([front.x, 8, BASE_H + 54], P);
        return `${(at[0] - origin[0]).toFixed(1)}px, ${(at[1] - origin[1]).toFixed(1)}px`;
    });
    const drop = shift(P, [0, 0, 0], [0, 0, -5]).split(', ')[1];
    const dropB = shift(P, [0, 0, 0], [0, 0, -17]).split(', ')[1];

    const motion = `@keyframes obra-carriage{
  0%,42%{transform:translate(0,0)}
  50%,88%{transform:translate(${moves[1]})}
  96%,100%{transform:translate(0,0)}
}
@keyframes obra-piece{
  0%,20%{transform:translate(0,0)}
  28%,36%{transform:translate(0,${drop})}
  44%,54%{transform:translate(0,0)}
  58%,66%{transform:translate(0,${dropB})}
  72%,100%{transform:translate(0,0)}
}
@keyframes obra-lid-1{
  0%,18%{transform:translate(0,0)}
  22%,38%{transform:translate(0,-4px)}
  44%,100%{transform:translate(0,0)}
}
@keyframes obra-lid-2{
  0%,38%{transform:translate(0,0)}
  42%,58%{transform:translate(0,-4px)}
  64%,100%{transform:translate(0,0)}
}
@keyframes obra-lid-3{
  0%,58%{transform:translate(0,0)}
  62%,78%{transform:translate(0,-4px)}
  84%,100%{transform:translate(0,0)}
}`;

    return {
        fig: 'Fig 4',
        title: 'Mesa de frentes',
        hint: 'El pórtico recorre los dos frentes',
        readout: 'frentes 2 · stock 62% · EPP y residuos al día',
        label: 'Mesa de frentes: dos frentes de obra en distinto avance, un pórtico de control que los recorre, un panel de EPP y un carro de segregación de residuos con tres bocas.',
        body: out,
        motion,
    };
}

// ─────────────────────────────────────────────────────────────
// #materiales — Línea de suministro
// ─────────────────────────────────────────────────────────────
function buildMateriales() {
    const BASE = { x: -150, y: -64, w: 300, d: 128, r: 12 };
    const BASE_H = 10;

    const points = [
        ...k.boxCorners(BASE, -BASE_H - 6, 0),
        [-128, -38, 54],
        [104, 8, 48],
    ];
    const P = k.fitProjection(points, W, H, {
        pad: 40,
        azimuth: 40,
        elevation: 32,
        headroom: 4,
    });

    const out = bench(P, BASE, BASE_H, 6);

    // Estantería de almacén.
    for (const y of [-36, -4]) {
        for (const x of [-126, -68]) {
            out.push(
                S(k.cylinder(x, y, 1.8, BASE_H, 40, P, 8), { tone: 'mid' }),
            );
        }
    }
    for (const level of [0, 1, 2]) {
        const z = BASE_H + 2 + level * 12;
        out.push(
            S(
                k.slabOf(
                    { x: -128, y: -38, w: 62, d: 36, r: 1 },
                    z,
                    3,
                    P,
                    3,
                    0.4,
                ),
                { tone: 'mid' },
            ),
        );
        for (const [boxIndex, bx] of [-120, -94].entries()) {
            out.push(
                bob(
                    `${S(
                        k.slabOf(
                            { x: bx, y: -32, w: 20, d: 22, r: 1 },
                            z + 3,
                            8,
                            P,
                            2,
                            0.4,
                        ),
                        { tone: 'hi', crease: 'lo' },
                    )}${L(
                        k.lineOnTop([bx + 3, -28], [bx + 17, -28], z + 11, P),
                        { tone: 'faint' },
                    )}`,
                    level * 0.5 + boxIndex * 0.25,
                ),
            );
        }
    }

    // Cinta de transferencia hacia la obra.
    out.push(
        S(
            k.slabOf(
                { x: -64, y: -18, w: 108, d: 30, r: 2 },
                BASE_H + 4,
                3,
                P,
                3,
                0.5,
            ),
            { tone: 'mid' },
        ),
    );
    for (const y of [-20, 15]) {
        out.push(
            S(
                k.slabOf(
                    { x: -64, y, w: 108, d: 2.5, r: 1 },
                    BASE_H + 7,
                    3,
                    P,
                    2,
                ),
                { tone: 'lo' },
            ),
        );
    }
    const beltLines = [];
    for (let x = -58; x <= 38; x += 9) {
        beltLines.push(
            L(k.lineOnTop([x, -16], [x, 13], BASE_H + 7, P), { tone: 'faint' }),
        );
    }
    out.push(`<g class="fig-belt">${beltLines.join('')}</g>`);
    out.push(
        S(
            k.slabOf(
                { x: 44, y: -14, w: 14, d: 22, r: 1 },
                BASE_H + 4,
                3,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );

    // Compuerta de transferencia.
    out.push(S(k.cylinder(-4, 16, 2.4, BASE_H, 26, P, 10), { tone: 'mid' }));
    out.push(
        `<g data-part="materiales-gate" style="animation:materiales-gate 26s var(--fig-ease) infinite">${S(
            k.slabOf(
                { x: -6, y: -18, w: 4, d: 32, r: 1 },
                BASE_H + 9,
                3,
                P,
                2,
                0.4,
            ),
            { tone: 'mid' },
        )}${bob(
            S(
                k.slabOf(
                    { x: -7.5, y: -22, w: 7, d: 6, r: 1 },
                    BASE_H + 8,
                    5,
                    P,
                    2,
                ),
                {
                    tone: 'lo',
                },
            ),
            0.3,
        )}</g>`,
    );

    // Pallet sobre la cinta (pieza activa en mint).
    const pallet = (cx, cz) => {
        const parts = [];
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 12, y: -12, w: 24, d: 18, r: 1 },
                    cz,
                    4,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'mid' },
            ),
        );
        parts.push(
            S(
                k.slabOf(
                    { x: cx - 8, y: -9, w: 16, d: 12, r: 1 },
                    cz + 4,
                    10,
                    P,
                    2,
                    0.4,
                ),
                { tone: 'hi', lit: true, crease: 'lo' },
            ),
        );
        parts.push(
            L(
                k.planOutline(
                    { x: cx - 6, y: -7, w: 12, d: 8, r: 0.8 },
                    cz + 14,
                    P,
                    2,
                ),
                { tone: 'faint' },
            ),
        );
        return parts;
    };
    const startX = -52;
    const stopX = [-52, -32, -12, 8, 28, 46];
    const stopZ = [17, 17, 17, 17, 17, 17];
    out.push(
        `<g data-part="materiales-pallet" style="animation:materiales-pallet 26s var(--fig-ease) infinite">${pallet(startX, stopZ[0]).join('')}</g>`,
    );

    // Retorno de pallets vacíos por la vía baja.
    out.push(
        S(
            k.slabOf(
                { x: -56, y: 14, w: 100, d: 14, r: 1 },
                BASE_H + 2,
                2,
                P,
                2,
            ),
            { tone: 'lo' },
        ),
    );
    out.push(
        L(k.lineOnTop([-52, 18], [40, 18], BASE_H + 4, P), { tone: 'faint' }),
    );
    const emptyPallet = (cx) => [
        S(
            k.slabOf(
                { x: cx - 10, y: 15, w: 20, d: 12, r: 1 },
                BASE_H + 4,
                3,
                P,
                2,
                0.4,
            ),
            { tone: 'mid' },
        ),
        L(
            k.planOutline(
                { x: cx - 8, y: 17, w: 16, d: 8, r: 0.8 },
                BASE_H + 7,
                P,
                2,
            ),
            {
                tone: 'faint',
            },
        ),
    ];
    out.push(
        `<g style="animation:materiales-return 26s var(--fig-ease) infinite">${emptyPallet(44).join('')}</g>`,
    );

    // Tolva de obra.
    const hop = { x: 56, y: -22, w: 44, d: 30, r: 2 };
    out.push(S(k.slabOf(hop, BASE_H, 2, P, 3), { tone: 'mid' }));
    out.push(
        S(
            k.slabOf(
                { x: hop.x, y: hop.y, w: hop.w, d: 2.5, r: 1 },
                BASE_H + 2,
                16,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: hop.x + hop.w - 2.5, y: hop.y, w: 2.5, d: hop.d, r: 1 },
                BASE_H + 2,
                14,
                P,
                2,
            ),
            { tone: 'mid' },
        ),
    );
    const hopperFill = [];
    hopperFill.push(
        S(k.slabOf(k.insetPlan(hop, 4), BASE_H + 2, 7, P, 3, 0.4), {
            tone: 'hi',
            crease: 'lo',
        }),
    );
    hopperFill.push(
        L(k.planOutline(k.insetPlan(hop, 6), BASE_H + 9, P, 3), {
            tone: 'faint',
        }),
    );
    out.push(`<g class="materiales-fill">${hopperFill.join('')}</g>`);

    // Puesto Kardex.
    out.push(
        S(
            k.slabOf(
                { x: 60, y: -54, w: 44, d: 24, r: 2 },
                BASE_H,
                14,
                P,
                3,
                0.5,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        S(k.cylinder(82, -42, 10, BASE_H + 14, 8, P, 24, 0.6), {
            tone: 'hi',
            crease: 'lo',
        }),
    );
    out.push(L(k.ring(82, -42, 7.4, BASE_H + 22, P, 24), { tone: 'lo' }));
    out.push(
        L(k.knurl(82, -42, 10, BASE_H + 14.5, BASE_H + 21.5, 24, P), {
            tone: 'lo',
        }),
    );
    out.push(S(k.cylinder(82, -42, 2, BASE_H + 22, 4, P, 10), { tone: 'mid' }));
    for (let lamp = 0; lamp < 3; lamp += 1) {
        const angle = (lamp / 3) * Math.PI * 2;
        out.push(
            blink(
                D(
                    [
                        k.iso(
                            [
                                82 + Math.cos(angle) * 8,
                                -42 + Math.sin(angle) * 8,
                                BASE_H + 23,
                            ],
                            P,
                        ),
                    ],
                    { size: 0.5, tone: 'hi' },
                ),
                lamp * 0.5,
            ),
        );
    }
    out.push(
        S(
            k.slabOf(
                { x: 64, y: -50, w: 8, d: 16, r: 1 },
                BASE_H + 14,
                1,
                P,
                2,
            ),
            {
                tone: 'lo',
                crease: 'none',
            },
        ),
    );
    out.push(
        `<g data-part="materiales-stamp" style="animation:materiales-stamp 26s var(--fig-ease) infinite">${S(
            k.cylinder(66, -42, 2.2, BASE_H + 15, 9, P, 10),
            { tone: 'mid', crease: 'none' },
        )}${S(k.cylinder(66, -42, 3.4, BASE_H + 24, 3, P, 10), { tone: 'hi' })}</g>`,
    );

    out.push(...dial(P, -128, 44, BASE_H, 13, 0.62, { engraved: '62' }));

    const plate = { x: -30, y: 38, w: 40, d: 14, r: 1.5 };
    out.push(S(k.slabOf(plate, 0, 0.8, P, 2), { tone: 'lo', crease: 'none' }));
    for (let row = 0; row < 3; row += 1) {
        out.push(
            L(
                k.lineOnTop(
                    [plate.x + 5, plate.y + 4 + row * 3.2],
                    [
                        plate.x + plate.w - (row === 2 ? 12 : 5),
                        plate.y + 4 + row * 3.2,
                    ],
                    0.8,
                    P,
                ),
                { tone: 'faint' },
            ),
        );
    }

    const origin = k.iso([stopX[0], 0, stopZ[0]], P);
    const moves = stopX.map((x, index) => {
        const at = k.iso([x, 0, stopZ[index]], P);
        return `${(at[0] - origin[0]).toFixed(1)}px, ${(at[1] - origin[1]).toFixed(1)}px`;
    });
    const gateLift = shift(P, [0, 0, 0], [0, 0, 14]).split(', ')[1];
    const stampTap = shift(P, [0, 0, 0], [0, 0, -4]).split(', ')[1];

    const motion = `@keyframes materiales-pallet{
  0%,8%{transform:translate(0,0);opacity:1}
  16%,20%{transform:translate(${moves[1]});opacity:1}
  28%,32%{transform:translate(${moves[2]});opacity:1}
  40%,44%{transform:translate(${moves[3]});opacity:1}
  52%,56%{transform:translate(${moves[4]});opacity:1}
  64%,86%{transform:translate(${moves[5]});opacity:1}
  90%,92%{transform:translate(${moves[5]});opacity:0}
  94%,96%{transform:translate(0,0);opacity:0}
  98%,100%{transform:translate(0,0);opacity:1}
}
@keyframes materiales-gate{
  0%,10%{transform:translate(0,0)}
  16%,86%{transform:translate(0,${gateLift})}
  92%,100%{transform:translate(0,0)}
}
@keyframes materiales-stamp{
  0%,16%{transform:translate(0,0)}
  20%,23%{transform:translate(0,${stampTap})}
  27%,30%{transform:translate(0,0)}
  34%,37%{transform:translate(0,${stampTap})}
  41%,44%{transform:translate(0,0)}
  48%,51%{transform:translate(0,${stampTap})}
  55%,58%{transform:translate(0,0)}
  62%,65%{transform:translate(0,${stampTap})}
  69%,72%{transform:translate(0,0)}
  76%,79%{transform:translate(0,${stampTap})}
  83%,100%{transform:translate(0,0)}
}
@keyframes materiales-fill{
  0%,68%{transform:translateY(0)}
  72%,90%{transform:translateY(-2px)}
  94%,100%{transform:translateY(0)}
}
.figura-iso .materiales-fill{animation:materiales-fill 26s var(--fig-ease) infinite}
@keyframes materiales-return{
  0%,6%{transform:translate(0,0);opacity:1}
  12%,86%{transform:translate(${shift(P, [44, 0, BASE_H + 4], [-52, 0, BASE_H + 4])});opacity:1}
  90%,94%{transform:translate(${shift(P, [44, 0, BASE_H + 4], [-52, 0, BASE_H + 4])});opacity:0}
  96%,98%{transform:translate(0,0);opacity:0}
  100%{transform:translate(0,0);opacity:1}
}
@keyframes materiales-belt{to{transform:translate(${shift(P, [0, 0, BASE_H + 7], [9, 0, BASE_H + 7])})}}
.figura-iso .fig-belt{animation:materiales-belt 1.1s linear infinite}`;

    return {
        fig: 'Fig 5',
        title: 'Línea de suministro',
        hint: 'El pallet baja del almacén a la obra',
        readout: 'movimientos 12 · almacenes 2 · Kardex al día',
        label: 'Línea de suministro: una estantería de almacén, una cinta de transferencia con compuerta, un pallet en mint que baja hasta la tolva de obra y un puesto Kardex que registra cada movimiento.',
        body: out,
        motion,
    };
}

// ─────────────────────────────────────────────────────────────
// #geo — Mesa de rutas
// ─────────────────────────────────────────────────────────────
function buildGeo() {
    const BASE = { x: -150, y: -64, w: 300, d: 128, r: 12 };
    const BASE_H = 10;

    const points = [
        ...k.boxCorners(BASE, -BASE_H - 6, 0),
        [-122, -38, 46],
        [56, 40, 46],
    ];
    const P = k.fitProjection(points, W, H, {
        pad: 40,
        azimuth: 40,
        elevation: 32,
        headroom: 4,
    });

    const out = bench(P, BASE, BASE_H, 6);

    // Relieve: tres curvas de nivel.
    out.push(
        S(
            k.slabOf(
                { x: -122, y: -38, w: 162, d: 78, r: 14 },
                BASE_H,
                3,
                P,
                6,
                0.5,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        L(
            k.planOutline(
                { x: -114, y: -32, w: 146, d: 66, r: 12 },
                BASE_H + 3,
                P,
                6,
            ),
            {
                tone: 'faint',
            },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: -110, y: -32, w: 138, d: 66, r: 12 },
                BASE_H + 3,
                3,
                P,
                6,
                0.4,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        L(
            k.planOutline(
                { x: -104, y: -28, w: 126, d: 58, r: 10 },
                BASE_H + 6,
                P,
                6,
            ),
            {
                tone: 'faint',
            },
        ),
    );
    out.push(
        S(
            k.slabOf(
                { x: -100, y: -26, w: 118, d: 54, r: 10 },
                BASE_H + 6,
                3,
                P,
                6,
                0.4,
            ),
            { tone: 'mid' },
        ),
    );
    out.push(
        L(
            k.planOutline(
                { x: -94, y: -22, w: 106, d: 46, r: 8 },
                BASE_H + 9,
                P,
                6,
            ),
            {
                tone: 'faint',
            },
        ),
    );

    const TOP = BASE_H + 9;

    // Almacén y obra, ambos dentro del relieve.
    out.push(
        S(k.slabOf({ x: -93, y: -16, w: 18, d: 16, r: 1 }, TOP, 9, P, 2, 0.4), {
            tone: 'hi',
            crease: 'lo',
        }),
    );
    out.push(
        L(
            k.planOutline(
                { x: -91, y: -14, w: 14, d: 12, r: 1 },
                TOP + 9,
                P,
                2,
            ),
            {
                tone: 'faint',
            },
        ),
    );
    out.push(
        S(k.slabOf({ x: -14, y: -13, w: 16, d: 14, r: 1 }, TOP, 8, P, 2, 0.4), {
            tone: 'hi',
            crease: 'lo',
        }),
    );
    out.push(
        S(k.slabOf({ x: -16, y: -15, w: 20, d: 18, r: 1 }, TOP + 8, 2, P, 2), {
            tone: 'mid',
        }),
    );
    out.push(
        blink(
            S(k.cylinder(-84, -8, 1.4, TOP + 9, 1.4, P, 10), {
                tone: 'hi',
                crease: 'lo',
            }),
            0,
        ),
    );
    out.push(
        blink(
            S(k.cylinder(-6, -6, 1.4, TOP + 10, 1.4, P, 10), {
                tone: 'hi',
                crease: 'lo',
            }),
            0.6,
        ),
    );

    // Ruta almacén → obra.
    const route = [
        [-80, -4],
        [-64, -12],
        [-48, -2],
        [-30, -14],
        [-16, 0],
        [-6, -6],
    ];
    out.push(
        L(k.lineOnTop([-84, -8], [-6, -6], TOP + 0.35, P), {
            tone: 'faint',
            dotted: true,
        }),
    );
    out.push(L(k.onTop(route, TOP + 0.3, P), { tone: 'hi', flow: true }));
    out.push(
        L(k.onTop(route, TOP + 0.45, P), {
            tone: 'mid',
            className: 'geo-trace',
        }),
    );
    for (const [x, y] of route) {
        out.push(D([k.iso([x, y, TOP + 0.3], P)], { size: 0.5, tone: 'mid' }));
    }

    // Pulsos de salida y llegada.
    out.push(
        `<g class="fig-geo-start">${L(k.ring(-80, -4, 4, TOP + 0.35, P, 24), {
            tone: 'mid',
            className: 'geo-pulse-ring',
        })}</g>`,
    );
    out.push(
        `<g class="fig-geo-end">${L(k.ring(-6, -6, 5, TOP + 0.35, P, 24), {
            tone: 'mid',
            className: 'geo-pulse-ring',
        })}</g>`,
    );

    // Bandera de destino.
    out.push(S(k.cylinder(-2, -2, 1, TOP, 12, P, 8), { tone: 'lo' }));
    const flagOrigin = k.iso([-2, -2, TOP + 9], P);
    out.push(
        `<g class="fig-flag" style="transform-origin:${flagOrigin[0].toFixed(1)}px ${flagOrigin[1].toFixed(1)}px">${S(
            k.slabOf({ x: -2, y: -2, w: 7, d: 1.4, r: 0.5 }, TOP + 9, 4, P, 2),
            { tone: 'hi', crease: 'lo' },
        )}</g>`,
    );

    // Geocerca alrededor de la obra.
    for (let post = 0; post < 8; post += 1) {
        const angle = (post / 8) * Math.PI * 2;
        const x = -6 + Math.cos(angle) * 17;
        const y = -6 + Math.sin(angle) * 17;
        out.push(
            blink(
                `${S(k.cylinder(x, y, 1, TOP, 5, P, 6), {
                    tone: 'lo',
                })}${D([k.iso([x, y, TOP + 5], P)], { size: 0.4 })}`,
                post * 0.3,
            ),
        );
    }
    out.push(
        L(k.ring(-6, -6, 17, TOP + 0.2, P, 40), {
            tone: 'green',
            dashed: true,
            className: 'geo-fence',
        }),
    );

    // Pin de tracking (mint) sobre la ruta.
    const pinAt = [-80, -4];
    const pin = () => {
        const parts = [];
        parts.push(
            S(k.cylinder(pinAt[0], pinAt[1], 1.6, TOP, 8, P, 8), {
                tone: 'mid',
                crease: 'none',
            }),
        );
        parts.push(
            S(k.cylinder(pinAt[0], pinAt[1], 3.6, TOP + 8, 3, P, 16), {
                tone: 'hi',
                lit: true,
                crease: 'lo',
            }),
        );
        parts.push(
            L(k.ring(pinAt[0], pinAt[1], 3.6, TOP + 11, P, 16), { tone: 'lo' }),
        );
        return parts;
    };
    out.push(
        `<g data-part="geo-pin" style="animation:geo-pin 27s var(--fig-ease) infinite">${pin().join('')}</g>`,
    );

    // Trípode con prisma, en la base.
    const tripod = { x: 52, y: 34 };
    for (const [dx, dy] of [
        [-6, -5],
        [6, -5],
        [0, 6],
    ]) {
        out.push(
            S(k.cylinder(tripod.x + dx, tripod.y + dy, 1.2, BASE_H, 20, P, 8), {
                tone: 'mid',
            }),
        );
    }
    out.push(
        S(k.cylinder(tripod.x, tripod.y, 3.2, BASE_H + 20, 2, P, 12), {
            tone: 'mid',
        }),
    );
    out.push(
        `<g data-part="geo-prism" style="animation:geo-prism 27s var(--fig-ease) infinite">${S(
            k.cylinder(tripod.x, tripod.y, 2.2, BASE_H + 22, 6, P, 12),
            { tone: 'hi', crease: 'lo' },
        )}${L(k.ring(tripod.x, tripod.y, 2.2, BASE_H + 28, P, 12), { tone: 'lo' })}</g>`,
    );
    out.push(
        blink(
            D([k.iso([tripod.x, tripod.y, BASE_H + 29], P)], {
                size: 0.5,
                tone: 'hi',
            }),
            0.4,
        ),
    );

    // Tubos de plano al otro lado de la mesa.
    for (const [tx, ty] of [
        [92, 18],
        [101, 20],
        [96, 27],
    ]) {
        out.push(S(k.cylinder(tx, ty, 4, BASE_H, 22, P, 14), { tone: 'mid' }));
        out.push(
            S(k.cylinder(tx, ty, 4.6, BASE_H + 22, 2, P, 14), { tone: 'lo' }),
        );
    }

    out.push(...dial(P, -130, 50, BASE_H, 13, 0.55, { engraved: '12' }));

    const plate = { x: -46, y: 44, w: 42, d: 14, r: 1.5 };
    out.push(S(k.slabOf(plate, 0, 0.8, P, 2), { tone: 'lo', crease: 'none' }));
    for (let row = 0; row < 3; row += 1) {
        out.push(
            L(
                k.lineOnTop(
                    [plate.x + 5, plate.y + 4 + row * 3.2],
                    [
                        plate.x + plate.w - (row === 2 ? 13 : 5),
                        plate.y + 4 + row * 3.2,
                    ],
                    0.8,
                    P,
                ),
                { tone: 'faint' },
            ),
        );
    }

    const start = k.iso([pinAt[0], pinAt[1], TOP], P);
    const moves = route.map(([x, y]) => {
        const at = k.iso([x, y, TOP], P);
        return `${(at[0] - start[0]).toFixed(1)}px, ${(at[1] - start[1]).toFixed(1)}px`;
    });
    const bob = Math.abs(
        Number(shift(P, [0, 0, 0], [0, 0, 2]).split(', ')[1]),
    ).toFixed(1);

    const motion = `@keyframes geo-pin{
  0%,6%{transform:translate(0,0)}
  18%,24%{transform:translate(${moves[1]})}
  34%,40%{transform:translate(${moves[2]})}
  50%,56%{transform:translate(${moves[3]})}
  66%,72%{transform:translate(${moves[4]})}
  82%,88%{transform:translate(${moves[5]})}
  96%,100%{transform:translate(${moves[5]})}
}
@keyframes geo-prism{
  0%,100%{transform:translate(0,0)}
  50%{transform:translate(0,-${bob}px)}
}
@keyframes geo-fence-dash{to{stroke-dashoffset:-22}}
.figura-iso .iso-line.geo-fence{stroke-dasharray:3 5;animation:geo-fence-dash 1.8s linear infinite}
@keyframes geo-flag{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.figura-iso .fig-flag{animation:geo-flag 3.4s var(--fig-ease) infinite}
.figura-iso .geo-pulse-ring{stroke:var(--fig-lit-top);stroke-width:1.4;stroke-opacity:.9}
.figura-iso .fig-geo-start,.figura-iso .fig-geo-end{transform-box:fill-box;transform-origin:center}
@keyframes geo-start{0%{transform:scale(.55);opacity:0}5%{opacity:1}16%{transform:scale(1.7);opacity:0}17%,100%{opacity:0}}
@keyframes geo-end{0%,88%{transform:scale(.55);opacity:0}92%{opacity:1}100%{transform:scale(1.7);opacity:0}}
.figura-iso .fig-geo-start{animation:geo-start 27s var(--fig-ease) infinite}
.figura-iso .fig-geo-end{animation:geo-end 27s var(--fig-ease) infinite}
@keyframes fig-flow{to{stroke-dashoffset:-32}}
.figura-iso .iso-line[data-flow]{stroke-dasharray:2 6;animation:fig-flow 1.4s linear infinite}
@keyframes geo-trace{0%{stroke-dashoffset:420;opacity:0}2%{opacity:1}88%{stroke-dashoffset:0;opacity:1}94%,100%{stroke-dashoffset:0;opacity:0}}
.figura-iso .geo-trace{stroke:var(--fig-lit-top);stroke-width:1.6;stroke-dasharray:420;animation:geo-trace 27s linear infinite}`;

    return {
        fig: 'Fig 6',
        title: 'Mesa de rutas',
        hint: 'El pin recorre la ruta y la geocerca',
        readout: 'distancia 12.4 km · ETA 28 min · geocerca activa',
        label: 'Mesa de rutas: un relieve con almacén y obra, la ruta entre ambos, un pin en mint que la recorre y una geocerca de ocho postes con anillo discontinuo alrededor de la obra.',
        body: out,
        motion,
    };
}

// ─────────────────────────────────────────────────────────────
// Salida: markup nativo, CSS compartido y metadatos
// ─────────────────────────────────────────────────────────────
const OUT = join(HERE, 'markup');
const PREVIEW = 'D:/_obraflow_tmp/opencode/figures';
mkdirSync(OUT, { recursive: true });

const builders = {
    pmu: buildPmu,
    pmi: buildPmi,
    obra: buildObra,
    materiales: buildMateriales,
    geo: buildGeo,
    cierre: buildCierre,
};
const only = process.argv.find(
    (arg) =>
        !arg.startsWith('--') &&
        arg !== process.argv[0] &&
        arg !== process.argv[1],
);
const preview = process.argv.includes('--preview');

const specs = Object.fromEntries(
    Object.entries(builders).map(([name, build]) => [name, build()]),
);

writeFileSync(
    join(HERE, 'figures.css'),
    `${BASE_CSS}\n${Object.values(specs)
        .map((spec) => spec.motion)
        .join('\n')}`,
);

const meta = Object.fromEntries(
    Object.entries(specs).map(([name, spec]) => [
        name,
        {
            title: spec.title,
            hint: spec.hint,
            readout: spec.readout,
            label: spec.label,
        },
    ]),
);
writeFileSync(
    join(HERE, 'meta.ts'),
    `// Generado por build.mjs. No editar a mano.\nexport const FIGURE_META = ${JSON.stringify(
        meta,
        null,
        4,
    )} as const;\n`,
);

for (const [name, spec] of Object.entries(specs)) {
    if (only && only !== name) {
        continue;
    }
    const svg = compact(renderNative(spec));
    writeFileSync(join(OUT, `${name}.svg`), svg);
    console.log(
        `wrote markup/${name}.svg · ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`,
    );
    if (preview) {
        mkdirSync(PREVIEW, { recursive: true });
        const page = compact(renderPreview(spec));
        writeFileSync(join(PREVIEW, `${name}.svg`), page);
        console.log(
            `wrote preview ${name}.svg · ${(Buffer.byteLength(page) / 1024).toFixed(1)} KB`,
        );
    }
}
console.log(
    `wrote figures.css · ${(Buffer.byteLength(readFileSync(join(HERE, 'figures.css'))) / 1024).toFixed(1)} KB`,
);
