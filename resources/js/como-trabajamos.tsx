import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {
    FIGURE_META,
    loadFigure,
    type FigureId,
} from './features/vitrina/figures';
import {
    ETAPAS_FRENTE,
    FOCUS,
    FRENTE_STORAGE_KEY,
    leerZonaHash,
    parseFrente,
    registrarVisita,
    serializeFrente,
    type FrenteEstado,
    type ZoneId,
} from './features/vitrina/hub-state';

const SITE = {
    ground: '#a9b58a',
    slab: '#bdb7ab',
    road: '#8f8a80',
    concrete: '#6e6a64',
    mud: '#7a5c3e',
    sand: '#d9c48f',
    gravel: '#9a9a94',
    machine: '#f2b01e',
    cabin: '#3f5a73',
    cabinLight: '#a7adb1',
    hoarding: '#2f5d50',
    mesh: '#4c7a5a',
    steel: '#3a3f45',
    rust: '#a4512a',
    timber: '#c28e52',
    cone: '#f26b1d',
    sign: '#c8372d',
    olive: '#6b8a33',
    mint: '#d1ffca',
    sky: '#ece6d8',
    white: '#f4f1e9',
} as const;

type DetailIcon =
    | 'portfolio'
    | 'chart'
    | 'switch'
    | 'cycle'
    | 'gate'
    | 'phase'
    | 'building'
    | 'warehouse'
    | 'helmet'
    | 'recycle'
    | 'check'
    | 'request'
    | 'truck'
    | 'ledger'
    | 'map'
    | 'geofence'
    | 'route'
    | 'clock'
    | 'receipt'
    | 'book'
    | 'flag'
    | 'calendar'
    | 'tools';

interface ZoneDetail {
    icon: DetailIcon;
    title: string;
    text: string;
}

interface Zone {
    id: ZoneId;
    title: string;
    copy: string;
    x: number;
    z: number;
    details: ZoneDetail[];
    implementation: string;
}

const ZONES: Zone[] = [
    {
        id: 'pmu',
        title: 'El programa (PMU)',
        copy: 'El portafolio de obras, su avance consolidado y la redistribución de excedentes entre frentes.',
        x: -26,
        z: 22,
        implementation:
            'Un tablero consolida el avance de todas las obras; la redistribución se calcula por prioridad y capacidad, y cada cambio queda registrado.',
        details: [
            {
                icon: 'portfolio',
                title: 'Portafolio',
                text: 'Cómo se agrupan las obras y se prioriza el esfuerzo del programa.',
            },
            {
                icon: 'chart',
                title: 'EVM consolidado',
                text: 'Cómo se consolida el avance y se detectan desviaciones con indicadores estándar.',
            },
            {
                icon: 'switch',
                title: 'Redistribución',
                text: 'Cómo se reasigna el excedente entre frentes según prioridad y capacidad.',
            },
        ],
    },
    {
        id: 'pmi',
        title: 'El ciclo PMI',
        copy: 'Inicio, planificación, ejecución, control y cierre, con compuertas de decisión en cada fase.',
        x: -19,
        z: -23,
        implementation:
            'Las fases y los gates se modelan como etapas con criterios de salida; el sistema no deja avanzar si falta el requisito de la compuerta.',
        details: [
            {
                icon: 'flag',
                title: 'Inicio',
                text: 'Se formaliza el alcance, los objetivos y el patrocinador de la obra.',
            },
            {
                icon: 'calendar',
                title: 'Planificación',
                text: 'Se descompone el trabajo, se arma el cronograma y se define el presupuesto.',
            },
            {
                icon: 'tools',
                title: 'Ejecución',
                text: 'Se movilizan frentes, partidas y cuadrillas contra el plan.',
            },
            {
                icon: 'chart',
                title: 'Control',
                text: 'Se mide avance, costo, calidad y seguridad, y se corrigen desvíos.',
            },
            {
                icon: 'book',
                title: 'Cierre',
                text: 'Se valoriza lo ejecutado, se firma conformidad y se archivan lecciones.',
            },
            {
                icon: 'gate',
                title: 'Compuertas',
                text: 'Cada fase tiene una compuerta: sin criterio cumplido, no se avanza.',
            },
        ],
    },
    {
        id: 'obra',
        title: 'La obra por dentro',
        copy: 'Frentes, almacén, partidas, EPP, residuos y calidad conviviendo en un mismo espacio.',
        x: -0.6,
        z: 23.5,
        implementation:
            'Cada frente tiene su almacén, sus partidas y sus protocolos; el avance, el EPP y los residuos se capturan desde campo y se consolidan en el panel.',
        details: [
            {
                icon: 'building',
                title: 'Frentes',
                text: 'Cómo se divide la obra en frentes con avance independiente.',
            },
            {
                icon: 'warehouse',
                title: 'Almacén de obra',
                text: 'Cómo se controla el stock del frente y el consumo por partida.',
            },
            {
                icon: 'ledger',
                title: 'Partidas',
                text: 'Cómo se sigue cada partida por metrado, cuadrilla y avance.',
            },
            {
                icon: 'helmet',
                title: 'EPP',
                text: 'Cómo se entrega y controla la protección por trabajador.',
            },
            {
                icon: 'recycle',
                title: 'Residuos',
                text: 'Cómo se segregan los residuos y se controla su salida.',
            },
            {
                icon: 'check',
                title: 'Calidad',
                text: 'Cómo se liberan partidas con protocolos y observaciones.',
            },
        ],
    },
    {
        id: 'materiales',
        title: 'El flujo de materiales',
        copy: 'Solicitud, almacén, transferencia, obra y Kardex: cada movimiento con su rastro.',
        x: -10,
        z: -3,
        implementation:
            'Solicitud, salida, transferencia y consumo comparten un mismo Kardex, con responsable y centro de costo en cada movimiento.',
        details: [
            {
                icon: 'request',
                title: 'Solicitud',
                text: 'El frente pide contra una partida y un centro de costo.',
            },
            {
                icon: 'warehouse',
                title: 'Almacén central',
                text: 'Se atiende con Kardex y se descuenta el saldo.',
            },
            {
                icon: 'truck',
                title: 'Transferencia',
                text: 'Se mueve entre almacenes con guía y responsable.',
            },
            {
                icon: 'building',
                title: 'Obra',
                text: 'Se recibe en el frente y se consume contra la partida.',
            },
            {
                icon: 'ledger',
                title: 'Kardex',
                text: 'Queda el rastro de quién, cuándo y cuánto en cada movimiento.',
            },
        ],
    },
    {
        id: 'geo',
        title: 'Geolocalización y rutas',
        copy: 'Mapa operativo, geocercas de asistencia y rutas con distancia y ETA entre almacén y obra.',
        x: 37,
        z: 8,
        implementation:
            'La ubicación se valida contra una geocerca y las rutas se calculan entre puntos; el mapa y los tiempos se actualizan con cada recorrido.',
        details: [
            {
                icon: 'map',
                title: 'Mapa operativo',
                text: 'Cómo se ubican obras, almacenes y frentes sobre un mapa.',
            },
            {
                icon: 'geofence',
                title: 'Asistencia con geocerca',
                text: 'Cómo el dispositivo valida la ubicación dentro del perímetro.',
            },
            {
                icon: 'route',
                title: 'Rutas y ETA',
                text: 'Cómo se calcula la ruta y el tiempo entre almacén y obra.',
            },
            {
                icon: 'clock',
                title: 'Tracking',
                text: 'Cómo se sigue el recorrido hasta la llegada.',
            },
            {
                icon: 'switch',
                title: 'Redistribución',
                text: 'Cómo la ubicación ayuda a decidir qué obra abastecer primero.',
            },
        ],
    },
    {
        id: 'cierre',
        title: 'El cierre',
        copy: 'Valorizaciones, conformidad y lecciones aprendidas para cerrar con orden.',
        x: 24,
        z: -14,
        implementation:
            'Valorizaciones, conformidad y lecciones se archivan en un expediente único por obra, disponible para auditoría.',
        details: [
            {
                icon: 'receipt',
                title: 'Valorizaciones',
                text: 'Cómo se valoriza el avance físico por periodo.',
            },
            {
                icon: 'check',
                title: 'Conformidad',
                text: 'Cómo se revisa y aprueba el entregable.',
            },
            {
                icon: 'book',
                title: 'Lecciones',
                text: 'Cómo se registran las lecciones para la siguiente obra.',
            },
            {
                icon: 'ledger',
                title: 'Archivo',
                text: 'Cómo queda el expediente disponible para auditoría.',
            },
        ],
    },
];

const DETAIL_ICONS: Record<DetailIcon, ReactNode> = {
    portfolio: (
        <>
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M8 7V5h8v2" />
            <path d="M3 12h18" />
        </>
    ),
    chart: (
        <>
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="M7 15l4-5 3 3 5-7" />
        </>
    ),
    switch: (
        <>
            <path d="M4 8h13l-3-3" />
            <path d="M20 16H7l3 3" />
        </>
    ),
    cycle: (
        <>
            <path d="M20 12a8 8 0 0 1-13.7 5.6" />
            <path d="M4 12a8 8 0 0 1 13.7-5.6" />
            <path d="M4 12V8m0 4h4" />
            <path d="M20 12v4m0-4h-4" />
        </>
    ),
    gate: (
        <>
            <path d="M12 21V3" />
            <path d="M12 6h9" />
            <path d="M12 11h6" />
            <path d="M12 16h9" />
        </>
    ),
    phase: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
        </>
    ),
    building: (
        <>
            <path d="M4 21V9l8-5 8 5v12" />
            <path d="M9 21v-6h6v6" />
            <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </>
    ),
    warehouse: (
        <>
            <path d="M3 21V10l9-6 9 6v11" />
            <path d="M7 21v-8h10v8" />
            <path d="M7 17h10" />
        </>
    ),
    helmet: (
        <>
            <path d="M4 17h16" />
            <path d="M6 17a6 6 0 0 1 12 0" />
            <path d="M10 8V5h4v3" />
        </>
    ),
    recycle: (
        <>
            <path d="M12 4l3 5H9z" />
            <path d="M18 9l2 4-4 2" />
            <path d="M6 15l-2-4 4-2" />
            <path d="M8 19h8" />
        </>
    ),
    check: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </>
    ),
    request: (
        <>
            <path d="M6 3h8l4 4v14H6z" />
            <path d="M14 3v5h4" />
            <path d="M9 13h6M9 17h4" />
        </>
    ),
    truck: (
        <>
            <path d="M3 7h10v8H3z" />
            <path d="M13 10h4l3 3v2h-7z" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
        </>
    ),
    ledger: (
        <>
            <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
            <path d="M9 8h6M9 12h6M9 16h4" />
        </>
    ),
    map: (
        <>
            <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
            <path d="M9 4v14M15 6v14" />
        </>
    ),
    geofence: (
        <>
            <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    route: (
        <>
            <circle cx="6" cy="18" r="2" />
            <circle cx="18" cy="6" r="2" />
            <path d="M8 18h4a3 3 0 0 0 3-3V9" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v5l3 2" />
        </>
    ),
    receipt: (
        <>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
            <path d="M9 8h6M9 12h6" />
        </>
    ),
    flag: (
        <>
            <path d="M5 21V4" />
            <path d="M5 5h12l-3 4 3 4H5" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" />
        </>
    ),
    tools: (
        <>
            <path d="M14 7a4 4 0 0 1-5 5l-5 5 2 2 5-5a4 4 0 0 1 5-5l-2 2-2-2z" />
        </>
    ),
    book: (
        <>
            <path d="M4 5a3 3 0 0 1 3-2h5v18H7a3 3 0 0 1-3-3z" />
            <path d="M12 3h5a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3h-5" />
        </>
    ),
};

function DetailIcon({ name }: { name: DetailIcon }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {DETAIL_ICONS[name]}
        </svg>
    );
}

const ASSETS = {
    crane: '/assets/vitrina/mobile-crane-671d3f.glb',
    dump: '/assets/vitrina/articulated-dump-truck-ee50f3.glb',
    excavator: '/assets/vitrina/tracked-excavator-8ebd3c.glb',
} as const;

declare global {
    interface Window {
        __hubStats?: {
            fps: number;
            calls: number;
            triangles: number;
            meshes: number;
            sourceTriangles: number;
        };
    }
}

const MATERIAL_HUB = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.86,
    metalness: 0.02,
});

function colorDeMesh(mesh: THREE.Mesh): THREE.Color {
    const material = Array.isArray(mesh.material)
        ? mesh.material[0]
        : mesh.material;
    const color = (material as THREE.MeshStandardMaterial | undefined)?.color;

    return color ? color.clone() : new THREE.Color('#ffffff');
}

function geometriaConColor(
    mesh: THREE.Mesh,
    matriz: THREE.Matrix4,
): THREE.BufferGeometry {
    const geometry = mesh.geometry.clone();

    geometry.applyMatrix4(matriz);

    for (const nombre of Object.keys(geometry.attributes)) {
        if (!['position', 'normal', 'color'].includes(nombre)) {
            geometry.deleteAttribute(nombre);
        }
    }

    if (!geometry.attributes.color) {
        const color = colorDeMesh(mesh);
        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);

        for (let index = 0; index < count; index += 1) {
            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    return geometry;
}

/**
 * Fusiona los meshes de un GLTF por grupos articulados. El grupo `root`
 * recoge todo lo estático; cada nombre extra conserva su pivote y su mesh
 * fusionado para poder animarlo sin perder la jerarquía.
 */
function fusionarGrupos(
    root: THREE.Object3D,
    nombres: string[],
): Map<string, THREE.Object3D> {
    root.updateMatrixWorld(true);

    const objetivos = new Map<string, THREE.Object3D>([['root', root]]);

    for (const nombre of nombres) {
        const nodo = root.getObjectByName(nombre);

        if (nodo) {
            objetivos.set(nombre, nodo);
        }
    }

    const conjunto = new Set(objetivos.values());
    const inversos = new Map<THREE.Object3D, THREE.Matrix4>();

    for (const objetivo of conjunto) {
        inversos.set(
            objetivo,
            new THREE.Matrix4().copy(objetivo.matrixWorld).invert(),
        );
    }

    const acumulados = new Map<THREE.Object3D, THREE.BufferGeometry[]>();
    const eliminar: THREE.Mesh[] = [];

    root.traverse((object) => {
        const mesh = object as THREE.Mesh;

        if (!mesh.isMesh) {
            return;
        }

        let objetivo: THREE.Object3D | null = conjunto.has(mesh) ? mesh : null;
        let padre = mesh.parent;

        while (!objetivo && padre) {
            if (conjunto.has(padre)) {
                objetivo = padre;
                break;
            }

            padre = padre.parent;
        }

        if (!objetivo) {
            return;
        }

        const inverso = inversos.get(objetivo);

        if (!inverso) {
            return;
        }

        const matriz = new THREE.Matrix4().multiplyMatrices(
            inverso,
            mesh.matrixWorld,
        );
        const geometria = geometriaConColor(mesh, matriz);
        const lista = acumulados.get(objetivo) ?? [];

        lista.push(geometria);
        acumulados.set(objetivo, lista);
        eliminar.push(mesh);
    });

    for (const mesh of eliminar) {
        mesh.removeFromParent();
    }

    for (const [objetivo, geometrias] of acumulados) {
        const fusionada = mergeGeometries(geometrias, false);

        if (fusionada) {
            objetivo.add(new THREE.Mesh(fusionada, MATERIAL_HUB));
        }
    }

    return objetivos;
}

function clonarModelo(
    gltf: GLTF,
    nombres: string[] = [],
): { scene: THREE.Object3D; grupos: Map<string, THREE.Object3D> } {
    const scene = gltf.scene.clone(true);

    return { scene, grupos: fusionarGrupos(scene, nombres) };
}

function minYDeObjeto(root: THREE.Object3D): number {
    root.updateMatrixWorld(true);

    const punto = new THREE.Vector3();
    let minimo = Infinity;

    root.traverse((object) => {
        const mesh = object as THREE.Mesh;

        if (!mesh.isMesh || !mesh.geometry) {
            return;
        }

        mesh.geometry.computeBoundingBox();

        const caja = mesh.geometry.boundingBox;

        if (!caja) {
            return;
        }

        for (const x of [caja.min.x, caja.max.x]) {
            for (const y of [caja.min.y, caja.max.y]) {
                for (const z of [caja.min.z, caja.max.z]) {
                    punto.set(x, y, z).applyMatrix4(mesh.matrixWorld);
                    minimo = Math.min(minimo, punto.y);
                }
            }
        }
    });

    return Number.isFinite(minimo) ? minimo : 0;
}

function fusionarSkinned(root: THREE.Object3D): THREE.BufferGeometry {
    root.updateMatrixWorld(true);

    const punto = new THREE.Vector3();
    const geometrias: THREE.BufferGeometry[] = [];

    root.traverse((object) => {
        const mesh = object as THREE.SkinnedMesh;

        if (!mesh.isMesh || !mesh.geometry) {
            return;
        }

        const posiciones = mesh.geometry.attributes.position;
        const colores = mesh.geometry.attributes.color;
        const vertices = new Float32Array(posiciones.count * 3);
        const coloresVertice = new Float32Array(posiciones.count * 3);

        for (let indice = 0; indice < posiciones.count; indice += 1) {
            punto.fromBufferAttribute(posiciones, indice);

            if (mesh.isSkinnedMesh) {
                mesh.applyBoneTransform(indice, punto);
            }

            punto.applyMatrix4(mesh.matrixWorld);
            vertices[indice * 3] = punto.x;
            vertices[indice * 3 + 1] = punto.y;
            vertices[indice * 3 + 2] = punto.z;

            if (colores) {
                coloresVertice[indice * 3] = colores.getX(indice);
                coloresVertice[indice * 3 + 1] = colores.getY(indice);
                coloresVertice[indice * 3 + 2] = colores.getZ(indice);
            } else {
                coloresVertice[indice * 3] = 1;
                coloresVertice[indice * 3 + 1] = 1;
                coloresVertice[indice * 3 + 2] = 1;
            }
        }

        const geometria = new THREE.BufferGeometry();

        geometria.setAttribute(
            'position',
            new THREE.BufferAttribute(vertices, 3),
        );
        geometria.setAttribute(
            'color',
            new THREE.BufferAttribute(coloresVertice, 3),
        );
        geometria.computeVertexNormals();
        geometrias.push(geometria);
    });

    return mergeGeometries(geometrias, false) ?? new THREE.BufferGeometry();
}

function crearTrabajadorKit(
    gltf: GLTF,
    tiempo: number,
    nombreClip: string = 'Walk',
): THREE.BufferGeometry {
    const clon = cloneSkeleton(gltf.scene);
    const mixer = new THREE.AnimationMixer(clon);
    const clip =
        THREE.AnimationClip.findByName(gltf.animations, nombreClip) ??
        gltf.animations[0];

    if (clip) {
        const accion = mixer.clipAction(clip);

        accion.play();
        mixer.setTime(tiempo);
    }

    clon.updateMatrixWorld(true);

    return fusionarSkinned(clon);
}

type AccionVehiculo = 'bascula' | 'tambor' | 'horquilla' | 'espera';

interface ParadaVehiculo {
    en: number;
    duracion: number;
    accion: AccionVehiculo;
}

interface RutaVehiculo {
    puntos: [number, number][];
    duracion: number;
    desfase: number;
    giro: number;
    paradas: ParadaVehiculo[];
}

const PARTES_DUMPER = ['dump-body'];
const PARTES_MIXER = ['drum'];
const PARTES_TELEHANDLER = ['lift'];

const RUTA_DUMPER: RutaVehiculo = {
    puntos: [
        [-34, -6],
        [-34, 10],
        [-34, 24],
        [-33, 27.2],
        [-29, 28.2],
        [-20, 28.4],
        [-4, 28.4],
        [12, 28.4],
        [23, 28.4],
        [26.5, 27.4],
        [27.5, 24],
        [27.5, 12],
        [27.5, 0],
        [27.5, -6],
        [16, -8],
        [0, -8],
        [-16, -8],
        [-30, -4],
    ],
    duracion: 41,
    desfase: 0,
    giro: 0,
    paradas: [
        { en: 0.12, duracion: 4.5, accion: 'bascula' },
        { en: 0.66, duracion: 2.6, accion: 'espera' },
    ],
};

const RUTA_MIXER: RutaVehiculo = {
    puntos: [
        [-33, 0],
        [-33, 12],
        [-33, 22],
        [-33, 26],
        [-32, 28],
        [-29, 28.6],
        [-18, 28.6],
        [-4, 28.6],
        [10, 28.6],
        [22, 28.6],
        [25, 28.2],
        [27, 26],
        [27.5, 22],
        [27.5, 10],
        [27.5, -2],
        [27.5, -6],
        [16, -7],
        [0, -7],
        [-14, -7],
        [-26, -4],
        [-33, 8],
    ],
    duracion: 57,
    desfase: 9,
    giro: 0,
    paradas: [{ en: 0.55, duracion: 5, accion: 'tambor' }],
};

const RUTA_TELEHANDLER: RutaVehiculo = {
    puntos: [
        [27, 18],
        [27, 6],
        [27, -10],
        [25, -12],
        [23, -6],
        [23, 2],
        [27, 4],
        [27, 10],
        [27, 16],
    ],
    duracion: 47,
    desfase: 21,
    giro: 0,
    paradas: [{ en: 0.5, duracion: 4, accion: 'horquilla' }],
};

interface Huella {
    nombre: string;
    tipo: 'rect' | 'circulo';
    x: number;
    z: number;
    ancho?: number;
    largo?: number;
    radio?: number;
}

const HUELLAS: Huella[] = [
    { nombre: 'edificio', tipo: 'rect', x: -8, z: 20, ancho: 14, largo: 10 },
    { nombre: 'apartamentos', tipo: 'rect', x: 24, z: -24, ancho: 8, largo: 8 },
    { nombre: 'caseta PMU', tipo: 'rect', x: -26, z: 22, ancho: 4, largo: 4 },
    { nombre: 'gantry', tipo: 'rect', x: 14, z: 25, ancho: 6, largo: 2 },
    { nombre: 'bodega', tipo: 'rect', x: -11, z: 11.5, ancho: 3, largo: 3 },
    { nombre: 'acopio', tipo: 'rect', x: 13, z: -16, ancho: 8, largo: 4 },
    { nombre: 'precintos', tipo: 'rect', x: 39, z: 8, ancho: 5, largo: 8 },
    { nombre: 'pallet', tipo: 'rect', x: 33.5, z: 12.5, ancho: 3, largo: 3 },
    { nombre: 'generador', tipo: 'rect', x: 21.5, z: 10, ancho: 3, largo: 3 },
    { nombre: 'torre', tipo: 'rect', x: 2, z: -20, ancho: 2, largo: 2 },
    { nombre: 'andamio', tipo: 'rect', x: 28, z: -20, ancho: 5, largo: 4 },
    { nombre: 'escombro', tipo: 'circulo', x: -19, z: 24, radio: 1.8 },
    { nombre: 'escombro 2', tipo: 'circulo', x: -2, z: -27, radio: 1.8 },
];

function salirDeHuella(
    x: number,
    z: number,
    huella: Huella,
    margen: number,
): [number, number] | null {
    if (huella.tipo === 'rect') {
        const medioAncho = (huella.ancho ?? 0) / 2 + margen;
        const medioLargo = (huella.largo ?? 0) / 2 + margen;
        const minX = huella.x - medioAncho;
        const maxX = huella.x + medioAncho;
        const minZ = huella.z - medioLargo;
        const maxZ = huella.z + medioLargo;

        if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) {
            return null;
        }

        const distancias = [
            { valor: x - minX, punto: [minX, z] as [number, number] },
            { valor: maxX - x, punto: [maxX, z] as [number, number] },
            { valor: z - minZ, punto: [x, minZ] as [number, number] },
            { valor: maxZ - z, punto: [x, maxZ] as [number, number] },
        ];
        distancias.sort((a, b) => a.valor - b.valor);

        return distancias[0].punto;
    }

    const dx = x - huella.x;
    const dz = z - huella.z;
    const distancia = Math.hypot(dx, dz);
    const radio = (huella.radio ?? 0) + margen;

    if (distancia >= radio) {
        return null;
    }

    const factor = (radio + 0.05) / Math.max(0.001, distancia);

    return [huella.x + dx * factor, huella.z + dz * factor];
}

function ajustarRuta(
    puntos: [number, number][],
    huellas: Huella[],
    margen: number,
): [number, number][] {
    let actual = puntos.map(([x, z]) => [x, z] as [number, number]);

    for (let iteracion = 0; iteracion < 3; iteracion += 1) {
        const curva = new THREE.CatmullRomCurve3(
            actual.map(([x, z]) => new THREE.Vector3(x, 0, z)),
            true,
            'centripetal',
        );
        const muestras = curva.getSpacedPoints(96);
        let ajustada = false;
        actual = muestras.map((muestra) => {
            let x = Math.min(42, Math.max(-42, muestra.x));
            let z = Math.min(31, Math.max(-30, muestra.z));

            for (const huella of huellas) {
                const fuera = salirDeHuella(x, z, huella, margen);

                if (fuera) {
                    x = fuera[0];
                    z = fuera[1];
                    ajustada = true;
                }
            }

            return [x, z] as [number, number];
        });

        if (!ajustada) {
            break;
        }
    }

    return actual;
}

const RUTA_DUMPER_SEGURA: RutaVehiculo = rutaVehiculoSegura(RUTA_DUMPER);
const RUTA_MIXER_SEGURA: RutaVehiculo = rutaVehiculoSegura(RUTA_MIXER);
const RUTA_TELEHANDLER_SEGURA: RutaVehiculo =
    rutaVehiculoSegura(RUTA_TELEHANDLER);

interface TramoVehiculo {
    tipo: 'mover' | 'parar';
    inicio: number;
    duracion: number;
    desde: number;
    hasta: number;
    accion?: AccionVehiculo;
}

function construirTramos(ruta: RutaVehiculo): TramoVehiculo[] {
    const paradas = [...ruta.paradas].sort((a, b) => a.en - b.en);
    const tiempoParadas = paradas.reduce(
        (total, parada) => total + parada.duracion,
        0,
    );
    const tiempoMovimiento = Math.max(0.1, ruta.duracion - tiempoParadas);
    const tramos: TramoVehiculo[] = [];
    let desde = 0;
    let tiempo = 0;

    for (const parada of paradas) {
        const duracion = Math.max(0.01, (parada.en - desde) * tiempoMovimiento);

        tramos.push({
            tipo: 'mover',
            inicio: tiempo,
            duracion,
            desde,
            hasta: parada.en,
        });
        tiempo += duracion;
        tramos.push({
            tipo: 'parar',
            inicio: tiempo,
            duracion: parada.duracion,
            desde: parada.en,
            hasta: parada.en,
            accion: parada.accion,
        });
        tiempo += parada.duracion;
        desde = parada.en;
    }

    tramos.push({
        tipo: 'mover',
        inicio: tiempo,
        duracion: Math.max(0.01, (1 - desde) * tiempoMovimiento),
        desde,
        hasta: 1,
    });

    return tramos;
}

function crearCurvaVehiculo(ruta: RutaVehiculo): THREE.CatmullRomCurve3 {
    return new THREE.CatmullRomCurve3(
        ruta.puntos.map(([x, z]) => new THREE.Vector3(x, 0, z)),
        true,
        'centripetal',
    );
}

interface EstadoMovil {
    nombre: string;
    x: number;
    z: number;
    giro: number;
    radio: number;
}

export const MOVILES_ESTADO: EstadoMovil[] = [];
export const TRABAJADORES_POSICIONES: { x: number; z: number }[] = [];

interface TramoMuestreado {
    punto: THREE.Vector3;
    tangente: THREE.Vector3;
    tramo: TramoVehiculo;
    avance: number;
}

function muestrearRuta(
    tramos: TramoVehiculo[],
    curva: THREE.CatmullRomCurve3,
    tiempo: number,
): TramoMuestreado {
    let tramo = tramos[tramos.length - 1];

    for (const item of tramos) {
        if (tiempo < item.inicio + item.duracion) {
            tramo = item;
            break;
        }
    }

    const avance =
        tramo.duracion > 0
            ? Math.min(1, Math.max(0, (tiempo - tramo.inicio) / tramo.duracion))
            : 1;
    let progreso = tramo.desde;

    if (tramo.tipo === 'mover') {
        const suave = avance * avance * (3 - 2 * avance);

        progreso = tramo.desde + (tramo.hasta - tramo.desde) * suave;
    }

    return {
        punto: curva.getPointAt(progreso % 1),
        tangente: curva.getTangentAt(progreso % 1),
        tramo,
        avance,
    };
}

function colisionesRuta(puntos: [number, number][], margen: number): string[] {
    const curva = new THREE.CatmullRomCurve3(
        puntos.map(([x, z]) => new THREE.Vector3(x, 0, z)),
        true,
        'centripetal',
    );
    const muestras = curva.getSpacedPoints(120);
    const nombres = new Set<string>();

    for (const muestra of muestras) {
        for (const huella of HUELLAS) {
            if (salirDeHuella(muestra.x, muestra.z, huella, margen)) {
                nombres.add(huella.nombre);
            }
        }
    }

    return [...nombres];
}

function rutaVehiculoSegura(ruta: RutaVehiculo): RutaVehiculo {
    return ruta;
}

function rutaPeatonalSegura(puntos: [number, number][]): [number, number][] {
    return colisionesRuta(puntos, 0.8).length > 0
        ? ajustarRuta(puntos, HUELLAS, 0.8)
        : puntos;
}

const LIMITES_LOSA = {
    minX: -43,
    maxX: 43,
    minZ: -31,
    maxZ: 31.3,
};

type Esquina = [number, number];

function esquinasVehiculo(
    x: number,
    z: number,
    largo: number,
    ancho: number,
    giro: number,
): Esquina[] {
    const adelanteX = Math.sin(giro);
    const adelanteZ = Math.cos(giro);
    const ladoX = Math.cos(giro);
    const ladoZ = -Math.sin(giro);
    const mitadLargo = largo / 2;
    const mitadAncho = ancho / 2;

    return [
        [
            x + adelanteX * mitadLargo + ladoX * mitadAncho,
            z + adelanteZ * mitadLargo + ladoZ * mitadAncho,
        ],
        [
            x + adelanteX * mitadLargo - ladoX * mitadAncho,
            z + adelanteZ * mitadLargo - ladoZ * mitadAncho,
        ],
        [
            x - adelanteX * mitadLargo + ladoX * mitadAncho,
            z - adelanteZ * mitadLargo + ladoZ * mitadAncho,
        ],
        [
            x - adelanteX * mitadLargo - ladoX * mitadAncho,
            z - adelanteZ * mitadLargo - ladoZ * mitadAncho,
        ],
    ];
}

function proyectarCaja(
    puntos: Esquina[],
    ejeX: number,
    ejeZ: number,
): [number, number] {
    let minimo = Infinity;
    let maximo = -Infinity;

    for (const [x, z] of puntos) {
        const valor = x * ejeX + z * ejeZ;

        minimo = Math.min(minimo, valor);
        maximo = Math.max(maximo, valor);
    }

    return [minimo, maximo];
}

function satCajas(a: Esquina[], b: Esquina[]): boolean {
    const ejes: [number, number][] = [];

    for (const puntos of [a, b]) {
        for (let indice = 0; indice < 4; indice += 1) {
            const p = puntos[indice];
            const q = puntos[(indice + 1) % 4];
            const dx = q[0] - p[0];
            const dz = q[1] - p[1];
            const largo = Math.hypot(dx, dz) || 1;

            ejes.push([-dz / largo, dx / largo]);
        }
    }

    return ejes.every(([ex, ez]) => {
        const [amin, amax] = proyectarCaja(a, ex, ez);
        const [bmin, bmax] = proyectarCaja(b, ex, ez);

        return !(amax < bmin || bmax < amin);
    });
}

function circuloTocaCaja(
    caja: Esquina[],
    centroX: number,
    centroZ: number,
    radio: number,
): boolean {
    const xs = caja.map(([x]) => x);
    const zs = caja.map(([, z]) => z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const cercanoX = Math.min(maxX, Math.max(minX, centroX));
    const cercanoZ = Math.min(maxZ, Math.max(minZ, centroZ));

    return Math.hypot(centroX - cercanoX, centroZ - cercanoZ) < radio;
}

function cajaHuella(huella: Huella, margen: number): Esquina[] {
    const ancho = huella.ancho ?? 0;
    const largo = huella.largo ?? 0;
    const x1 = huella.x - ancho / 2 - margen;
    const x2 = huella.x + ancho / 2 + margen;
    const z1 = huella.z - largo / 2 - margen;
    const z2 = huella.z + largo / 2 + margen;

    return [
        [x1, z1],
        [x2, z1],
        [x2, z2],
        [x1, z2],
    ];
}

function conflictosCaja(caja: Esquina[], margen = 0.5): string[] {
    const conflictos = new Set<string>();

    for (const [x, z] of caja) {
        if (
            x < LIMITES_LOSA.minX ||
            x > LIMITES_LOSA.maxX ||
            z < LIMITES_LOSA.minZ ||
            z > LIMITES_LOSA.maxZ
        ) {
            conflictos.add('borde de losa');
        }
    }

    for (const huella of HUELLAS) {
        if (huella.tipo === 'rect') {
            if (satCajas(caja, cajaHuella(huella, margen))) {
                conflictos.add(huella.nombre);
            }
        } else if (
            circuloTocaCaja(
                caja,
                huella.x,
                huella.z,
                (huella.radio ?? 0) + margen,
            )
        ) {
            conflictos.add(huella.nombre);
        }
    }

    return [...conflictos];
}

function validarVehiculoRuta(
    ruta: RutaVehiculo,
    config: MovilConfig,
): { colisiones: string[]; accion: string } {
    const curva = new THREE.CatmullRomCurve3(
        ruta.puntos.map(([x, z]) => new THREE.Vector3(x, 0, z)),
        true,
        'centripetal',
    );
    const pasos = Math.ceil(curva.getLength() / 0.25);
    const colisiones = new Set<string>();

    for (let indice = 0; indice < pasos; indice += 1) {
        const t = indice / pasos;
        const punto = curva.getPointAt(t);
        const tangente = curva.getTangentAt(t);
        const giro = Math.atan2(tangente.x, tangente.z);
        const caja = esquinasVehiculo(
            punto.x,
            punto.z,
            config.largo ?? 4,
            config.ancho ?? 3,
            giro,
        );

        conflictosCaja(caja).forEach((nombre) => colisiones.add(nombre));
    }

    let accion = 'sin acción';

    if (ruta.paradas.length > 0 && config.largoAccion) {
        const parada = ruta.paradas[0];
        const punto = curva.getPointAt(parada.en);
        const tangente = curva.getTangentAt(parada.en);
        const giro = Math.atan2(tangente.x, tangente.z);
        const caja = esquinasVehiculo(
            punto.x,
            punto.z,
            config.largoAccion,
            config.ancho ?? 3,
            giro,
        );

        conflictosCaja(caja).forEach((nombre) => colisiones.add(nombre));

        const zona = esquinasVehiculo(
            punto.x,
            punto.z,
            config.largoAccion + 3,
            (config.ancho ?? 3) + 3,
            giro,
        );
        const bloqueos = conflictosCaja(zona);

        accion = bloqueos.length > 0 ? bloqueos.join(', ') : 'libre';
    }

    return { colisiones: [...colisiones], accion };
}

function acercarAngulo(
    actual: number,
    objetivo: number,
    maximo: number,
): number {
    let diferencia = ((objetivo - actual + Math.PI) % (Math.PI * 2)) - Math.PI;

    if (diferencia < -Math.PI) {
        diferencia += Math.PI * 2;
    }

    return actual + Math.min(maximo, Math.max(-maximo, diferencia));
}

interface MovilConfig {
    nombre: string;
    url: string;
    tipo: 'vehiculo' | 'excavadora' | 'grua' | 'gruaTorre';
    ruta?: RutaVehiculo;
    partes: string[];
    posicion?: [number, number, number];
    rotacionY?: number;
    animarTambor?: boolean;
    radioMin?: number;
    ancho?: number;
    largo?: number;
    largoAccion?: number;
}

const MOVILES_CONFIG: MovilConfig[] = [
    {
        nombre: 'dumper',
        url: ASSETS.dump,
        tipo: 'vehiculo',
        ruta: RUTA_DUMPER_SEGURA,
        partes: PARTES_DUMPER,
        radioMin: 5.5,
        ancho: 3.4,
        largo: 4.6,
        largoAccion: 6.2,
    },
    {
        nombre: 'mixer',
        url: '/assets/vitrina/concrete-mixer-truck-4a8d94.glb',
        tipo: 'vehiculo',
        ruta: RUTA_MIXER_SEGURA,
        partes: PARTES_MIXER,
        animarTambor: true,
        radioMin: 5,
        ancho: 3.5,
        largo: 5.2,
    },
    {
        nombre: 'telehandler',
        url: '/assets/vitrina/telehandler-88c668.glb',
        tipo: 'vehiculo',
        ruta: RUTA_TELEHANDLER_SEGURA,
        partes: PARTES_TELEHANDLER,
        radioMin: 3.5,
        ancho: 3.7,
        largo: 5.9,
        largoAccion: 7,
    },
    {
        nombre: 'flatbed',
        url: '/assets/vitrina/flatbed-delivery-lorry-571458.glb',
        tipo: 'vehiculo',
        partes: [],
        posicion: [36, 0, 20],
        rotacionY: 0,
        ancho: 3.3,
        largo: 7.6,
    },
    {
        nombre: 'excavadora',
        url: ASSETS.excavator,
        tipo: 'excavadora',
        partes: ['upper-structure', 'boom', 'dipper', 'bucket'],
        posicion: [-9, 0, -20],
    },
    {
        nombre: 'grua',
        url: ASSETS.crane,
        tipo: 'grua',
        partes: ['superstructure', 'boom-frame', 'extend', 'fall', 'hook'],
        posicion: [13, 0, 12],
        rotacionY: -Math.PI / 2,
    },
    {
        nombre: 'grua-torre',
        url: '/assets/vitrina/tower-crane-top-d8d9c9.glb',
        tipo: 'gruaTorre',
        partes: ['turntable', 'trolley', 'hook', 'hoist-rope'],
        posicion: [2, 15, -20],
    },
];

interface ParteBatch {
    nodo: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    instanceId: number;
}

interface MovilPreparado {
    config: MovilConfig;
    scene: THREE.Object3D;
    partes: ParteBatch[];
    altura: number;
    mixer: THREE.AnimationMixer | null;
    bases: Map<string, THREE.Euler>;
    posiciones: Map<string, THREE.Vector3>;
    reloj: number;
    yaw: number | null;
}

function ParqueMovil({
    activo,
    hovered,
    onSelect,
    onHover,
}: {
    activo: boolean;
    hovered: ZoneId | null;
    onSelect: (id: ZoneId) => void;
    onHover: (id: ZoneId | null) => void;
}) {
    const gltfs = useLoader(
        GLTFLoader,
        MOVILES_CONFIG.map((config) => config.url),
    ) as GLTF[];

    const preparados = useMemo<MovilPreparado[]>(
        () =>
            MOVILES_CONFIG.map((config, indice) => {
                const gltf = gltfs[indice];
                const { scene, grupos } = clonarModelo(gltf, config.partes);
                if (config.tipo === 'gruaTorre') {
                    const cableViejo = scene.getObjectByName('hoist-rope');

                    if (cableViejo) {
                        cableViejo.removeFromParent();
                    }
                }

                const altura = -minYDeObjeto(scene);

                if (config.posicion) {
                    scene.position.set(
                        config.posicion[0],
                        config.posicion[1] + altura,
                        config.posicion[2],
                    );
                    scene.rotation.y = config.rotacionY ?? 0;
                }

                const partes: ParteBatch[] = [];

                for (const [nombre, nodo] of grupos) {
                    if (
                        config.tipo === 'gruaTorre' &&
                        nombre === 'hoist-rope'
                    ) {
                        continue;
                    }

                    const mesh = nodo.children.find(
                        (hijo) => (hijo as THREE.Mesh).isMesh,
                    ) as THREE.Mesh | undefined;

                    if (mesh) {
                        partes.push({
                            nodo: mesh,
                            geometry: mesh.geometry,
                            instanceId: -1,
                        });
                    }
                }

                let mixer: THREE.AnimationMixer | null = null;

                if (config.animarTambor && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(scene);

                    const accion = mixer.clipAction(gltf.animations[0]);

                    accion.setLoop(THREE.LoopRepeat, Infinity);
                    accion.play();
                }

                const bases = new Map<string, THREE.Euler>();
                const posiciones = new Map<string, THREE.Vector3>();

                for (const [nombre, nodo] of grupos) {
                    bases.set(nombre, nodo.rotation.clone());
                    posiciones.set(nombre, nodo.position.clone());
                }

                return {
                    config,
                    scene,
                    partes,
                    altura,
                    mixer,
                    bases,
                    posiciones,
                    reloj: config.ruta?.desfase ?? 0,
                    yaw: null,
                };
            }),
        [gltfs],
    );

    const cable = useMemo(() => {
        const geometria = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -100, 0),
            new THREE.Vector3(0, -100, 0),
        ]);
        const linea = new THREE.Line(
            geometria,
            new THREE.LineBasicMaterial({
                color: '#8a7659',
                toneMapped: false,
            }),
        );

        linea.frustumCulled = false;

        return linea;
    }, []);
    const cableInicio = useMemo(() => new THREE.Vector3(), []);
    const cableFin = useMemo(() => new THREE.Vector3(), []);

    const batch = useMemo(() => {
        let maxVertexCount = 0;
        let maxIndexCount = 0;
        let maxInstances = 0;

        for (const item of preparados) {
            maxInstances += item.partes.length;

            for (const parte of item.partes) {
                maxVertexCount += parte.geometry.attributes.position.count;
                maxIndexCount +=
                    parte.geometry.index?.count ??
                    parte.geometry.attributes.position.count;
            }
        }

        const malla = new THREE.BatchedMesh(
            Math.max(1, maxInstances),
            Math.max(1, maxVertexCount),
            Math.max(1, maxIndexCount),
            MATERIAL_HUB,
        );

        for (const item of preparados) {
            for (const parte of item.partes) {
                const geometryId = malla.addGeometry(parte.geometry);

                parte.instanceId = malla.addInstance(geometryId);
            }
        }

        malla.frustumCulled = false;

        return malla;
    }, [preparados]);

    const zonas = useMemo(() => {
        const mapa = new Map<number, ZoneId>();
        let instancia = 0;

        for (const item of preparados) {
            const zona: ZoneId | null =
                item.config.nombre === 'dumper'
                    ? 'materiales'
                    : item.config.tipo === 'excavadora' ||
                        item.config.tipo === 'grua' ||
                        item.config.tipo === 'gruaTorre'
                      ? 'obra'
                      : null;

            for (let indice = 0; indice < item.partes.length; indice += 1) {
                if (zona) {
                    mapa.set(instancia, zona);
                }

                instancia += 1;
            }
        }

        return mapa;
    }, [preparados]);

    const alPulsar = (evento: ThreeEvent<MouseEvent>): void => {
        const batchId = (
            evento as ThreeEvent<MouseEvent> & { batchId?: number }
        ).batchId;

        if (batchId === undefined) {
            return;
        }

        const zona = zonas.get(batchId);

        if (zona) {
            evento.stopPropagation();
            onSelect(zona);
        }
    };

    const alEntrar = (evento: ThreeEvent<PointerEvent>): void => {
        const batchId = (
            evento as ThreeEvent<PointerEvent> & { batchId?: number }
        ).batchId;

        if (batchId === undefined) {
            return;
        }

        const zona = zonas.get(batchId);

        if (zona) {
            evento.stopPropagation();
            document.body.style.cursor = 'pointer';
            onHover(zona);

            if (isFigure(zona)) {
                void loadFigure(zona);
            }
        }
    };

    const alSalir = (): void => {
        document.body.style.cursor = '';
        onHover(null);
    };

    useEffect(() => {
        const resultados = MOVILES_CONFIG.filter(
            (config) => config.tipo === 'vehiculo',
        ).map((config) => {
            if (!config.ruta) {
                return {
                    nombre: config.nombre,
                    colisiones: 'aparcado',
                    accion: '—',
                };
            }

            const resultado = validarVehiculoRuta(config.ruta, config);

            return {
                nombre: config.nombre,
                colisiones:
                    resultado.colisiones.length > 0
                        ? resultado.colisiones.join(', ')
                        : '0',
                accion: resultado.accion,
            };
        });

        resultados.forEach((resultado) => {
            console.info(
                `[flota] ${resultado.nombre}: colisiones=${resultado.colisiones}; acción=${resultado.accion}`,
            );
        });
    }, [preparados]);

    useEffect(() => {
        for (const item of preparados) {
            if (
                item.config.tipo !== 'vehiculo' ||
                item.config.ruta ||
                !item.config.posicion
            ) {
                continue;
            }

            const nombre = item.config.nombre;

            if (!MOVILES_ESTADO.some((estado) => estado.nombre === nombre)) {
                MOVILES_ESTADO.push({
                    nombre,
                    x: item.config.posicion[0],
                    z: item.config.posicion[2],
                    giro: item.config.rotacionY ?? 0,
                    radio: 5,
                });
            }
        }
    }, [preparados]);

    useFrame((_, delta) => {
        const zonaHover = hovered
            ? ZONES.find((zona) => zona.id === hovered)
            : null;

        for (const item of preparados) {
            const config = item.config;
            const distanciaHover = zonaHover
                ? Math.hypot(
                      item.scene.position.x - zonaHover.x,
                      item.scene.position.z - zonaHover.z,
                  )
                : Infinity;
            const factorRuta =
                config.tipo === 'vehiculo' && distanciaHover < 14 ? 0.4 : 1;

            if (config.ruta) {
                if (activo) {
                    item.reloj =
                        (item.reloj + delta * factorRuta) %
                        config.ruta.duracion;
                }

                const tramos = construirTramos(config.ruta);
                const curva = crearCurvaVehiculo(config.ruta);
                const muestra = muestrearRuta(tramos, curva, item.reloj);
                const objetivo =
                    Math.atan2(muestra.tangente.x, muestra.tangente.z) +
                    config.ruta.giro;

                if (item.yaw === null) {
                    item.yaw = objetivo;
                } else {
                    const radio = config.radioMin ?? 4.5;
                    const velocidad = 2.4;

                    item.yaw = acercarAngulo(
                        item.yaw,
                        objetivo,
                        delta * (activo ? velocidad / radio : 0),
                    );
                }

                item.scene.position.set(
                    muestra.punto.x,
                    item.altura + Math.sin(item.reloj * 2.2) * 0.02,
                    muestra.punto.z,
                );
                item.scene.rotation.y = item.yaw;

                const pulso =
                    muestra.tramo.tipo === 'parar'
                        ? Math.sin(muestra.avance * Math.PI)
                        : 0;

                for (const nombre of config.partes) {
                    const nodo = item.scene.getObjectByName(nombre);

                    if (!nodo) {
                        continue;
                    }

                    const base = item.bases.get(nombre);
                    const baseX = base?.x ?? nodo.rotation.x;
                    let extra = 0;

                    if (
                        muestra.tramo.accion === 'bascula' &&
                        nombre === 'dump-body'
                    ) {
                        extra = pulso * 0.55;
                    }

                    if (
                        muestra.tramo.accion === 'horquilla' &&
                        nombre === 'lift'
                    ) {
                        extra = pulso * 0.14;
                    }

                    nodo.rotation.x = baseX + extra;
                }

                if (item.mixer && activo) {
                    item.mixer.update(delta);
                }

                if (config.tipo === 'vehiculo') {
                    const registro = MOVILES_ESTADO.find(
                        (estado) => estado.nombre === config.nombre,
                    );
                    const datos: EstadoMovil = {
                        nombre: config.nombre,
                        x: muestra.punto.x,
                        z: muestra.punto.z,
                        giro: item.yaw,
                        radio: config.radioMin ?? 4.5,
                    };

                    if (registro) {
                        Object.assign(registro, datos);
                    } else {
                        MOVILES_ESTADO.push(datos);
                    }
                }
            } else {
                if (activo) {
                    item.reloj += delta;
                }

                const tiempo = item.reloj;

                if (config.tipo === 'excavadora') {
                    const giro = item.scene.getObjectByName('turntable');
                    const boom = item.scene.getObjectByName('boom');
                    const dipper = item.scene.getObjectByName('dipper');
                    const bucket = item.scene.getObjectByName('bucket');

                    if (giro) {
                        giro.rotation.y =
                            (item.bases.get('turntable')?.y ?? 0) +
                            Math.sin(tiempo * 0.42) * 0.5;
                    }

                    if (boom) {
                        boom.rotation.x =
                            (item.bases.get('boom')?.x ?? 0) +
                            -0.1 +
                            Math.sin(tiempo * 0.75) * 0.16;
                    }

                    if (dipper) {
                        dipper.rotation.x =
                            (item.bases.get('dipper')?.x ?? 0) +
                            0.28 +
                            Math.sin(tiempo * 0.75 + 0.7) * 0.2;
                    }

                    if (bucket) {
                        bucket.rotation.x =
                            (item.bases.get('bucket')?.x ?? 0) +
                            0.2 +
                            Math.sin(tiempo * 0.75 + 1.3) * 0.3;
                    }
                } else if (config.tipo === 'gruaTorre') {
                    const turntable = item.scene.getObjectByName('turntable');
                    const trolley = item.scene.getObjectByName('trolley');
                    const hook = item.scene.getObjectByName('hook');
                    const descenso =
                        (Math.sin(tiempo * 0.4) * 0.5 + 0.5) * 0.75;

                    if (turntable) {
                        turntable.rotation.y =
                            (item.bases.get('turntable')?.y ?? 0) +
                            Math.sin(tiempo * 0.12) * 0.65;
                    }

                    if (trolley) {
                        const baseX = item.posiciones.get('trolley')?.x ?? -20;

                        trolley.position.x =
                            baseX + 2 + Math.sin(tiempo * 0.25) * 4;
                    }

                    if (hook) {
                        const baseY = item.posiciones.get('hook')?.y ?? -1.6;

                        hook.position.y = baseY - descenso;
                    }
                } else {
                    const giro = item.scene.getObjectByName('turntable');
                    const lift = item.scene.getObjectByName('lift');
                    const extend = item.scene.getObjectByName('extend');
                    const hook = item.scene.getObjectByName('hook');

                    item.scene.rotation.y =
                        (item.config.rotacionY ?? 0) +
                        Math.sin(tiempo * 0.22) * 0.06;
                    item.scene.position.y =
                        item.altura + Math.sin(tiempo * 1.6) * 0.012;

                    if (giro) {
                        giro.rotation.y =
                            (item.bases.get('turntable')?.y ?? 0) +
                            Math.sin(tiempo * 0.32) * 0.5;
                    }

                    if (lift) {
                        lift.rotation.x =
                            (item.bases.get('lift')?.x ?? 0) +
                            Math.sin(tiempo * 0.4) * 0.12;
                    }

                    if (extend) {
                        extend.position.z =
                            (item.posiciones.get('extend')?.z ?? 0) +
                            Math.sin(tiempo * 0.35) * 0.5;
                    }

                    if (hook) {
                        const baseY = item.posiciones.get('hook')?.y ?? 0;

                        hook.position.y =
                            baseY - (Math.sin(tiempo * 0.65) * 0.5 + 0.5) * 1.8;
                    }
                }
            }

            item.scene.updateMatrixWorld(true);

            for (const parte of item.partes) {
                batch.setMatrixAt(parte.instanceId, parte.nodo.matrixWorld);
            }
        }

        const torre = preparados.find(
            (item) => item.config.tipo === 'gruaTorre',
        );
        const trolley = torre?.scene.getObjectByName('trolley');
        const hook = torre?.scene.getObjectByName('hook');

        if (trolley && hook) {
            trolley.getWorldPosition(cableInicio);
            hook.getWorldPosition(cableFin);
            const posiciones = cable.geometry.attributes
                .position as THREE.BufferAttribute;

            posiciones.setXYZ(0, cableInicio.x, cableInicio.y, cableInicio.z);
            posiciones.setXYZ(1, cableFin.x, cableFin.y, cableFin.z);
            posiciones.needsUpdate = true;
        }
    });

    return (
        <>
            <primitive
                object={batch}
                onClick={alPulsar}
                onPointerOver={alEntrar}
                onPointerOut={alSalir}
            />
            <primitive object={cable} />
        </>
    );
}

interface RutaTrabajador {
    puntos: [number, number][];
    duracion: number;
    desfase: number;
}

const RUTAS_KIT: RutaTrabajador[] = [
    {
        puntos: [
            [-33, 22],
            [-33, 27],
            [-30, 30],
            [-33, 25],
        ],
        duracion: 26,
        desfase: 0,
    },
    {
        puntos: [
            [2, 30.6],
            [8, 30.6],
            [14, 30.6],
            [20, 30.6],
            [12, 30.6],
        ],
        duracion: 31,
        desfase: 11,
    },
    {
        puntos: [
            [28.5, 20],
            [28.5, 10],
            [28.5, 0],
            [28.5, -12],
            [28.5, 0],
        ],
        duracion: 29,
        desfase: 19,
    },
];

const RUTAS_NORMALES: RutaTrabajador[] = [
    {
        puntos: [
            [-32, -20],
            [-26, -28],
            [-20, -22],
            [-26, -16],
        ],
        duracion: 24,
        desfase: 4,
    },
    {
        puntos: [
            [-20, -10],
            [-10, -10],
            [0, -10],
            [10, -10],
        ],
        duracion: 22,
        desfase: 13,
    },
    {
        puntos: [
            [6, 30.6],
            [12, 30.6],
            [18, 30.6],
            [24, 30.6],
        ],
        duracion: 27,
        desfase: 8,
    },
    {
        puntos: [
            [-32, 10],
            [-32, 2],
            [-30, -4],
            [-26, 2],
        ],
        duracion: 23,
        desfase: 6,
    },
    {
        puntos: [
            [28.5, 18],
            [28.5, 12],
            [28.5, 6],
            [28.5, 14],
        ],
        duracion: 22,
        desfase: 12,
    },
    {
        puntos: [
            [20, -10],
            [26, -10],
            [30, -6],
            [24, -2],
        ],
        duracion: 25,
        desfase: 9,
    },
    {
        puntos: [
            [-10, 30.6],
            [-4, 30.6],
            [2, 30.6],
            [-4, 30.6],
        ],
        duracion: 21,
        desfase: 3,
    },
    {
        puntos: [
            [0, 2],
            [6, 2],
            [6, -4],
            [0, -4],
        ],
        duracion: 20,
        desfase: 5,
    },
];

const RUTAS_CHALECO: RutaTrabajador[] = [
    {
        puntos: [
            [-30, 29],
            [-26, 30],
            [-22, 29],
            [-26, 28],
        ],
        duracion: 26,
        desfase: 7,
    },
    {
        puntos: [
            [16, 30.6],
            [20, 30.6],
            [24, 30.6],
            [20, 30.6],
        ],
        duracion: 24,
        desfase: 3,
    },
];

function crearTrabajadorSimple(conChaleco: boolean): THREE.BufferGeometry {
    const geometrias: THREE.BufferGeometry[] = [];
    const agregar = (
        geometria: THREE.BoxGeometry,
        posicion: [number, number, number],
        color: string,
    ): void => {
        geometria.translate(...posicion);
        geometrias.push(withColor(geometria, color));
    };

    const pantalon = conChaleco ? '#3c4551' : '#414a57';
    const camisa = conChaleco ? '#fff100' : '#4f7a9a';

    agregar(
        new THREE.BoxGeometry(0.14, 0.58, 0.16),
        [-0.11, 0.35, 0],
        pantalon,
    );
    agregar(new THREE.BoxGeometry(0.14, 0.58, 0.16), [0.11, 0.35, 0], pantalon);
    agregar(
        new THREE.BoxGeometry(0.17, 0.12, 0.25),
        [-0.11, 0.06, 0.03],
        '#242424',
    );
    agregar(
        new THREE.BoxGeometry(0.17, 0.12, 0.25),
        [0.11, 0.06, 0.03],
        '#242424',
    );
    agregar(new THREE.BoxGeometry(0.4, 0.56, 0.25), [0, 0.92, 0], camisa);
    agregar(new THREE.BoxGeometry(0.1, 0.48, 0.12), [-0.27, 0.94, 0], camisa);
    agregar(new THREE.BoxGeometry(0.1, 0.48, 0.12), [0.27, 0.94, 0], camisa);
    agregar(new THREE.BoxGeometry(0.1, 0.1, 0.12), [-0.27, 0.68, 0], '#c98a63');
    agregar(new THREE.BoxGeometry(0.1, 0.1, 0.12), [0.27, 0.68, 0], '#c98a63');
    agregar(new THREE.BoxGeometry(0.2, 0.22, 0.2), [0, 1.32, 0], '#c98a63');
    agregar(new THREE.BoxGeometry(0.26, 0.09, 0.26), [0, 1.46, 0], '#f2b01e');
    agregar(new THREE.BoxGeometry(0.3, 0.04, 0.32), [0, 1.42, 0.03], '#f2b01e');

    if (conChaleco) {
        agregar(
            new THREE.BoxGeometry(0.42, 0.07, 0.27),
            [0, 0.78, 0],
            '#fff100',
        );
        agregar(
            new THREE.BoxGeometry(0.42, 0.07, 0.27),
            [0, 1.06, 0],
            '#fff100',
        );
    }

    return mergeGeometries(geometrias, false) ?? new THREE.BufferGeometry();
}

function crearMaterialTrabajador(
    cadera: number,
    hombro: number,
    caderaX: number,
    hombroX: number,
): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.9,
        metalness: 0,
    });
    const uniformes = {
        uTiempo: { value: 0 },
        uCadera: { value: cadera },
        uHombro: { value: hombro },
        uCaderaX: { value: caderaX },
        uHombroX: { value: hombroX },
    };

    material.userData.uniformes = uniformes;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniformes);
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            attribute float aFase;
            attribute float aMovimiento;
            uniform float uTiempo;
            uniform float uCadera;
            uniform float uHombro;
            uniform float uCaderaX;
            uniform float uHombroX;
            mat2 rotarX(float angulo) {
                float c = cos(angulo);
                float s = sin(angulo);
                return mat2(c, -s, s, c);
            }`,
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `vec3 transformed = vec3(position);
            float lado = sign(transformed.x + 0.0001);
            float pierna = step(transformed.y, uCadera);
            float brazo = step(uHombro - 0.32, transformed.y)
                * step(transformed.y, uHombro + 0.18)
                * step(0.22, abs(transformed.x));

            if (pierna > 0.5) {
                vec3 pivote = vec3(lado * uCaderaX, uCadera, 0.0);
                vec3 p = transformed - pivote;
                p.yz = rotarX(sin(aFase) * 0.55 * lado * aMovimiento) * p.yz;
                transformed = p + pivote;
            }

            if (brazo > 0.5) {
                vec3 pivote = vec3(lado * uHombroX, uHombro, 0.0);
                vec3 p = transformed - pivote;
                p.yz = rotarX(-sin(aFase) * 0.45 * lado * aMovimiento) * p.yz;
                transformed = p + pivote;
            }

            transformed.y += abs(sin(aFase)) * 0.03 * aMovimiento;
            transformed.y += sin(uTiempo * 1.4 + aFase) * 0.01 * (1.0 - aMovimiento);`,
        );
    };
    material.customProgramCacheKey = () =>
        `trabajador-${cadera}-${hombro}-${caderaX}-${hombroX}`;

    return material;
}

function prepararTrabajadoresInstanciados(
    base: THREE.BufferGeometry,
    cantidad: number,
): THREE.BufferGeometry {
    const geometria = base.clone();

    geometria.setAttribute(
        'aFase',
        new THREE.InstancedBufferAttribute(new Float32Array(cantidad), 1),
    );
    geometria.setAttribute(
        'aMovimiento',
        new THREE.InstancedBufferAttribute(new Float32Array(cantidad), 1),
    );

    return geometria;
}

interface EstadoTrabajador {
    reloj: number;
    fase: number;
    movimiento: number;
    pausaHasta: number;
    proximoDescanso: number;
}

function Trabajadores({ activo }: { activo: boolean }) {
    const trabajadorKit = useLoader(
        GLTFLoader,
        `${KIT}/groundworker-083f5c.glb`,
    ) as GLTF;
    const kitBase = useMemo(
        () => crearTrabajadorKit(trabajadorKit, 0.5, 'Idle'),
        [trabajadorKit],
    );
    const simpleBase = useMemo(() => crearTrabajadorSimple(false), []);
    const chalecoBase = useMemo(() => crearTrabajadorSimple(true), []);
    const geometriaKit = useMemo(
        () => prepararTrabajadoresInstanciados(kitBase, RUTAS_KIT.length),
        [kitBase],
    );
    const geometriaNormal = useMemo(
        () =>
            prepararTrabajadoresInstanciados(simpleBase, RUTAS_NORMALES.length),
        [simpleBase],
    );
    const geometriaChaleco = useMemo(
        () =>
            prepararTrabajadoresInstanciados(chalecoBase, RUTAS_CHALECO.length),
        [chalecoBase],
    );
    const materialKit = useMemo(
        () => crearMaterialTrabajador(0.9, 1.45, 0.12, 0.28),
        [],
    );
    const materialSimple = useMemo(
        () => crearMaterialTrabajador(0.65, 1.18, 0.11, 0.27),
        [],
    );
    const kitRef = useRef<THREE.InstancedMesh>(null);
    const normalRef = useRef<THREE.InstancedMesh>(null);
    const chalecoRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const estadosKit = useRef<EstadoTrabajador[]>(
        RUTAS_KIT.map((ruta, indice) => ({
            reloj: ruta.desfase,
            fase: indice * 1.7,
            movimiento: 0,
            pausaHasta: 0,
            proximoDescanso: 8 + indice * 3,
        })),
    );
    const estadosNormal = useRef<EstadoTrabajador[]>(
        RUTAS_NORMALES.map((ruta, indice) => ({
            reloj: ruta.desfase,
            fase: indice * 1.7,
            movimiento: 0,
            pausaHasta: 0,
            proximoDescanso: 6 + indice * 2,
        })),
    );
    const estadosChaleco = useRef<EstadoTrabajador[]>(
        RUTAS_CHALECO.map((ruta, indice) => ({
            reloj: ruta.desfase,
            fase: indice * 1.7,
            movimiento: 0,
            pausaHasta: 0,
            proximoDescanso: 10 + indice * 4,
        })),
    );
    const curvasKit = useMemo(
        () => RUTAS_KIT.map((ruta) => crearCurvaTrabajador(ruta)),
        [],
    );
    const curvasNormal = useMemo(
        () => RUTAS_NORMALES.map((ruta) => crearCurvaTrabajador(ruta)),
        [],
    );
    const curvasChaleco = useMemo(
        () => RUTAS_CHALECO.map((ruta) => crearCurvaTrabajador(ruta)),
        [],
    );

    useFrame(({ clock }, delta) => {
        const tiempo = activo ? clock.elapsedTime : 0;

        const actualizar = (
            malla: THREE.InstancedMesh | null,
            rutas: RutaTrabajador[],
            curvas: THREE.CatmullRomCurve3[],
            estados: React.MutableRefObject<EstadoTrabajador[]>,
            material: THREE.MeshStandardMaterial,
            desplazamiento: number,
        ): void => {
            if (!malla) {
                return;
            }

            const atributoFase = malla.geometry.attributes
                .aFase as THREE.InstancedBufferAttribute;
            const atributoMovimiento = malla.geometry.attributes
                .aMovimiento as THREE.InstancedBufferAttribute;

            rutas.forEach((ruta, indice) => {
                const estado = estados.current[indice];
                const actual = curvas[indice].getPointAt(
                    estado.reloj / ruta.duracion,
                );
                const siguiente = curvas[indice].getPointAt(
                    ((estado.reloj + 2) % ruta.duracion) / ruta.duracion,
                );
                const cercaDeVehiculo = MOVILES_ESTADO.some(
                    (vehiculo) =>
                        Math.hypot(
                            vehiculo.x - actual.x,
                            vehiculo.z - actual.z,
                        ) < 3.4 ||
                        Math.hypot(
                            vehiculo.x - siguiente.x,
                            vehiculo.z - siguiente.z,
                        ) < 3.4,
                );

                if (tiempo > estado.proximoDescanso) {
                    estado.pausaHasta = tiempo + 2 + (indice % 3);
                    estado.proximoDescanso = tiempo + 9 + (indice % 4) * 3;
                }

                const avanzando =
                    activo && !cercaDeVehiculo && tiempo >= estado.pausaHasta;

                if (avanzando) {
                    const anterior = estado.reloj;
                    const velocidad = 0.85 + (indice % 7) * 0.05;

                    estado.reloj =
                        (estado.reloj + delta * velocidad) % ruta.duracion;

                    const puntoAnterior = curvas[indice].getPointAt(
                        anterior / ruta.duracion,
                    );
                    const puntoActual = curvas[indice].getPointAt(
                        estado.reloj / ruta.duracion,
                    );
                    const distancia = Math.hypot(
                        puntoActual.x - puntoAnterior.x,
                        puntoActual.z - puntoAnterior.z,
                    );

                    estado.fase += distancia * ((Math.PI * 2) / 1.3);
                }

                estado.movimiento +=
                    ((avanzando ? 1 : 0) - estado.movimiento) *
                    Math.min(1, delta * 6);

                const punto = curvas[indice].getPointAt(
                    estado.reloj / ruta.duracion,
                );
                const tangente = curvas[indice].getTangentAt(
                    estado.reloj / ruta.duracion,
                );
                const registro = TRABAJADORES_POSICIONES[
                    desplazamiento + indice
                ] ?? {
                    x: 0,
                    z: 0,
                };

                registro.x = punto.x;
                registro.z = punto.z;
                TRABAJADORES_POSICIONES[desplazamiento + indice] = registro;

                dummy.position.set(punto.x, 0, punto.z);
                dummy.rotation.set(0, Math.atan2(tangente.x, tangente.z), 0);
                dummy.scale.setScalar(1);
                dummy.updateMatrix();
                malla.setMatrixAt(indice, dummy.matrix);
                atributoFase.setX(indice, estado.fase);
                atributoMovimiento.setX(indice, estado.movimiento);
            });

            malla.instanceMatrix.needsUpdate = true;
            atributoFase.needsUpdate = true;
            atributoMovimiento.needsUpdate = true;
            material.userData.uniformes.uTiempo.value = tiempo;
        };

        actualizar(
            kitRef.current,
            RUTAS_KIT,
            curvasKit,
            estadosKit,
            materialKit,
            0,
        );
        actualizar(
            normalRef.current,
            RUTAS_NORMALES,
            curvasNormal,
            estadosNormal,
            materialSimple,
            RUTAS_KIT.length,
        );
        actualizar(
            chalecoRef.current,
            RUTAS_CHALECO,
            curvasChaleco,
            estadosChaleco,
            materialSimple,
            RUTAS_KIT.length + RUTAS_NORMALES.length,
        );
    });

    return (
        <>
            <instancedMesh
                ref={kitRef}
                args={[geometriaKit, materialKit, RUTAS_KIT.length]}
                frustumCulled={false}
            />
            <instancedMesh
                ref={normalRef}
                args={[geometriaNormal, materialSimple, RUTAS_NORMALES.length]}
                frustumCulled={false}
            />
            <instancedMesh
                ref={chalecoRef}
                args={[geometriaChaleco, materialSimple, RUTAS_CHALECO.length]}
                frustumCulled={false}
            />
        </>
    );
}

function crearCurvaTrabajador(ruta: RutaTrabajador): THREE.CatmullRomCurve3 {
    return new THREE.CatmullRomCurve3(
        rutaPeatonalSegura(ruta.puntos).map(
            ([x, z]) => new THREE.Vector3(x, 0, z),
        ),
        true,
        'centripetal',
    );
}

const TORRES_LUZ: [number, number][] = [
    [-12, -30],
    [21.5, 13.5],
    [34, -12],
    [-30, 26],
];

function texturaParticula(): THREE.Texture | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const canvas = document.createElement('canvas');

    canvas.width = 64;
    canvas.height = 64;

    const contexto = canvas.getContext('2d');

    if (!contexto) {
        return null;
    }

    const gradiente = contexto.createRadialGradient(32, 32, 0, 32, 32, 32);

    gradiente.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradiente.addColorStop(0.45, 'rgba(255,255,255,0.42)');
    gradiente.addColorStop(1, 'rgba(255,255,255,0)');
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
}

function crearParticulas(): {
    posiciones: Float32Array;
    colores: Float32Array;
    bases: Float32Array;
    fases: Float32Array;
} {
    const total = 90;
    const posiciones = new Float32Array(total * 3);
    const colores = new Float32Array(total * 3);
    const bases = new Float32Array(total * 3);
    const fases = new Float32Array(total);
    const ruido = (indice: number, sal: number): number => {
        const valor = Math.sin(indice * 12.9898 + sal * 78.233) * 43758.5453;

        return valor - Math.floor(valor);
    };

    for (let indice = 0; indice < total; indice += 1) {
        const humo = indice < 60;
        const baseX = humo
            ? 21.5 + (ruido(indice, 1) - 0.5) * 1.2
            : 4 + ruido(indice, 2) * 16;
        const baseY = humo
            ? 0.8 + ruido(indice, 3) * 0.8
            : 0.2 + ruido(indice, 4) * 0.9;
        const baseZ = humo
            ? 10 + (ruido(indice, 5) - 0.5) * 1.2
            : 12 + ruido(indice, 6) * 18;

        bases[indice * 3] = baseX;
        bases[indice * 3 + 1] = baseY;
        bases[indice * 3 + 2] = baseZ;
        posiciones[indice * 3] = baseX;
        posiciones[indice * 3 + 1] = baseY;
        posiciones[indice * 3 + 2] = baseZ;

        const color = new THREE.Color(humo ? '#bdb8ad' : '#c9a56d');

        colores[indice * 3] = color.r;
        colores[indice * 3 + 1] = color.g;
        colores[indice * 3 + 2] = color.b;
        fases[indice] = ruido(indice, 7);
    }

    return { posiciones, colores, bases, fases };
}

interface ClaveDia {
    p: number;
    fondo: string;
    ambiente: string;
    ambienteIntensidad: number;
    sol: string;
    solIntensidad: number;
    rellenoIntensidad: number;
}

const CLAVES_DIA: ClaveDia[] = [
    {
        p: 0,
        fondo: '#d9c9b6',
        ambiente: '#ffd8b0',
        ambienteIntensidad: 0.85,
        sol: '#ffc28a',
        solIntensidad: 0.8,
        rellenoIntensidad: 0.25,
    },
    {
        p: 0.22,
        fondo: '#ece6d8',
        ambiente: '#ffffff',
        ambienteIntensidad: 1.25,
        sol: '#fff2d8',
        solIntensidad: 1.55,
        rellenoIntensidad: 0.45,
    },
    {
        p: 0.55,
        fondo: '#eadfc9',
        ambiente: '#ffe9c9',
        ambienteIntensidad: 1.15,
        sol: '#ffd9a3',
        solIntensidad: 1.35,
        rellenoIntensidad: 0.4,
    },
    {
        p: 0.72,
        fondo: '#e4b28d',
        ambiente: '#ffbd8f',
        ambienteIntensidad: 0.95,
        sol: '#ff9350',
        solIntensidad: 1,
        rellenoIntensidad: 0.3,
    },
    {
        p: 0.83,
        fondo: '#1d2738',
        ambiente: '#5A6B8C',
        ambienteIntensidad: 0.7,
        sol: '#9db4de',
        solIntensidad: 0.55,
        rellenoIntensidad: 0.3,
    },
    {
        p: 1,
        fondo: '#d9c9b6',
        ambiente: '#ffd8b0',
        ambienteIntensidad: 0.85,
        sol: '#ffc28a',
        solIntensidad: 0.8,
        rellenoIntensidad: 0.25,
    },
];

function muestrearDia(fase: number): {
    fondo: THREE.Color;
    ambiente: THREE.Color;
    ambienteIntensidad: number;
    sol: THREE.Color;
    solIntensidad: number;
    rellenoIntensidad: number;
} {
    const valor = ((fase % 1) + 1) % 1;
    let desde = CLAVES_DIA[0];
    let hasta = CLAVES_DIA[CLAVES_DIA.length - 1];

    for (let indice = 0; indice < CLAVES_DIA.length - 1; indice += 1) {
        if (
            valor >= CLAVES_DIA[indice].p &&
            valor <= CLAVES_DIA[indice + 1].p
        ) {
            desde = CLAVES_DIA[indice];
            hasta = CLAVES_DIA[indice + 1];
            break;
        }
    }

    const rango = Math.max(0.0001, hasta.p - desde.p);
    const mezcla = Math.min(1, Math.max(0, (valor - desde.p) / rango));

    return {
        fondo: new THREE.Color(desde.fondo).lerp(
            new THREE.Color(hasta.fondo),
            mezcla,
        ),
        ambiente: new THREE.Color(desde.ambiente).lerp(
            new THREE.Color(hasta.ambiente),
            mezcla,
        ),
        ambienteIntensidad:
            desde.ambienteIntensidad +
            (hasta.ambienteIntensidad - desde.ambienteIntensidad) * mezcla,
        sol: new THREE.Color(desde.sol).lerp(
            new THREE.Color(hasta.sol),
            mezcla,
        ),
        solIntensidad:
            desde.solIntensidad +
            (hasta.solIntensidad - desde.solIntensidad) * mezcla,
        rellenoIntensidad:
            desde.rellenoIntensidad +
            (hasta.rellenoIntensidad - desde.rellenoIntensidad) * mezcla,
    };
}

interface LucesSitio {
    posiciones: Float32Array;
    colores: Float32Array;
    semaforoInicio: number;
    vehiculosInicio: number;
}

const LUCES_TORRES: [number, number][] = TORRES_LUZ;

function crearLucesSitio(): LucesSitio {
    const calor = '#ffdca8';
    const ambar = '#ffb347';
    const rojo = '#ff3b30';
    const blanco = '#fff6e0';
    const estaticas: { p: [number, number, number]; c: string }[] = [];

    for (const [x, z] of LUCES_TORRES) {
        estaticas.push({ p: [x, 8.6, z], c: calor });
    }

    for (const farol of FAROLES_CALLE) {
        estaticas.push({ p: cabezaFarol(farol), c: calor });
    }

    for (const [x, z] of [
        [-44, -30],
        [44, -30],
        [-44, 30],
        [44, 30],
        [-20, -12],
        [0, -12],
        [20, -12],
        [-20, 32],
        [20, 32],
    ] as [number, number][]) {
        estaticas.push({ p: [x, 1.1, z], c: ambar });
    }

    for (const y of [6, 10, 14]) {
        estaticas.push({ p: [2, y, -20], c: calor });
    }

    for (const x of [6, 10]) {
        estaticas.push({ p: [x, 15.2, -20], c: calor });
    }

    estaticas.push({ p: [2, 16.2, -20], c: rojo });
    estaticas.push({ p: [13, 9.2, 12], c: calor });
    estaticas.push({ p: [-26, 2.3, 23.7], c: calor });
    estaticas.push({ p: [-24.4, 2.3, 21.6], c: calor });

    for (const [x, y, z] of [
        [-12, 6.5, 16],
        [-9, 7, 17],
        [-6, 6.5, 18],
        [-12, 6.5, 24],
        [-8, 7, 25],
        [-4, 6.5, 24],
        [-14, 3.5, 18],
        [-2, 3.5, 22],
        [24, 5, -20],
        [25, 5.5, -22],
        [26, 5, -24],
    ] as [number, number, number][]) {
        estaticas.push({ p: [x, y, z], c: calor });
    }

    estaticas.push({ p: [0, 1.2, 31.7], c: ambar });
    estaticas.push({ p: [26, 2.2, 30.5], c: calor });
    estaticas.push({ p: [22, 2, 28.5], c: calor });

    for (const [x, z] of [
        [29, 27],
        [31, 25],
        [20, 30],
        [-16, 30],
        [18, 29],
        [22, 29],
    ] as [number, number][]) {
        estaticas.push({ p: [x, 0.5, z], c: ambar });
    }

    for (const x of [29.4, 30, 30.6]) {
        estaticas.push({ p: [x, 1.4, 22.6], c: ambar });
    }

    estaticas.push({ p: [21.5, 1.75, 11.5], c: ambar });

    const semaforoInicio = estaticas.length;

    estaticas.push({ p: [24.2, 2.78, 30.67], c: rojo });
    estaticas.push({ p: [24.2, 2.45, 30.67], c: ambar });
    estaticas.push({ p: [24.2, 2.12, 30.67], c: blanco });

    const vehiculosInicio = estaticas.length;

    for (let indice = 0; indice < 16; indice += 1) {
        estaticas.push({
            p: [0, -100, 0],
            c: indice % 4 === 2 ? ambar : blanco,
        });
    }

    const posiciones = new Float32Array(estaticas.length * 3);
    const colores = new Float32Array(estaticas.length * 3);

    estaticas.forEach((luz, indice) => {
        posiciones[indice * 3] = luz.p[0];
        posiciones[indice * 3 + 1] = luz.p[1];
        posiciones[indice * 3 + 2] = luz.p[2];
        const color = new THREE.Color(luz.c);

        colores[indice * 3] = color.r;
        colores[indice * 3 + 1] = color.g;
        colores[indice * 3 + 2] = color.b;
    });

    return { posiciones, colores, semaforoInicio, vehiculosInicio };
}

interface FarolCalle {
    x: number;
    z: number;
    giro: number;
}

const FAROLES_CALLE: FarolCalle[] = [
    { x: -38, z: 10, giro: Math.PI / 2 },
    { x: -38, z: -14, giro: Math.PI / 2 },
    { x: 31, z: 10, giro: -Math.PI / 2 },
    { x: 31, z: -14, giro: -Math.PI / 2 },
    { x: 0, z: -13, giro: 0 },
    { x: -33, z: -20, giro: Math.PI },
];

function cabezaFarol(farol: FarolCalle): [number, number, number] {
    const alcance = 0.9;

    return [
        farol.x + Math.sin(farol.giro) * alcance,
        4.68,
        farol.z + Math.cos(farol.giro) * alcance,
    ];
}

type ModoLuz = 'dia' | 'tarde' | 'noche' | 'ciclo';

const MODOS_LUZ: { id: ModoLuz; label: string }[] = [
    { id: 'dia', label: 'Día' },
    { id: 'tarde', label: 'Tarde' },
    { id: 'noche', label: 'Noche' },
    { id: 'ciclo', label: 'Ciclo normal' },
];

function IconoModoLuz({ modo }: { modo: ModoLuz }) {
    if (modo === 'dia') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
            </svg>
        );
    }

    if (modo === 'tarde') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v3M4.5 9.5l2 2M19.5 9.5l-2 2" />
            </svg>
        );
    }

    if (modo === 'noche') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
        </svg>
    );
}

function Ambiente({
    activo,
    reducedMotion,
    modoLuz,
    frente,
}: {
    activo: boolean;
    reducedMotion: boolean;
    modoLuz: ModoLuz;
    frente: number;
}) {
    const fondo = useRef<THREE.Color>(null);
    const ambiente = useRef<THREE.AmbientLight>(null);
    const hemisferio = useRef<THREE.HemisphereLight>(null);
    const sol = useRef<THREE.DirectionalLight>(null);
    const relleno = useRef<THREE.DirectionalLight>(null);
    const particulas = useRef<THREE.Points>(null);
    const luces = useRef<THREE.Points>(null);
    const materialLuces = useRef<THREE.PointsMaterial>(null);
    const bandera = useRef<THREE.Mesh>(null);
    const focos = useRef<(THREE.SpotLight | null)[]>([]);
    const zonas = useRef<(THREE.PointLight | null)[]>([]);
    const gruaTorre = useRef<THREE.PointLight>(null);
    const conosVehiculos = useRef<THREE.InstancedMesh>(null);
    const dummyLuz = useMemo(() => new THREE.Object3D(), []);
    const reloj = useRef(0);
    const faseActual = useRef(0.22);
    const textura = useMemo(() => texturaParticula(), []);
    const datos = useMemo(() => crearParticulas(), []);
    const datosLuces = useMemo(() => crearLucesSitio(), []);
    const geometriaParticulas = useMemo(() => {
        const geometria = new THREE.BufferGeometry();

        geometria.setAttribute(
            'position',
            new THREE.BufferAttribute(datos.posiciones, 3),
        );
        geometria.setAttribute(
            'color',
            new THREE.BufferAttribute(datos.colores, 3),
        );

        return geometria;
    }, [datos]);
    const geometriaLuces = useMemo(() => {
        const geometria = new THREE.BufferGeometry();

        geometria.setAttribute(
            'position',
            new THREE.BufferAttribute(datosLuces.posiciones, 3),
        );
        geometria.setAttribute(
            'color',
            new THREE.BufferAttribute(datosLuces.colores, 3),
        );

        return geometria;
    }, [datosLuces]);
    const geometriaBandera = useMemo(
        () => new THREE.PlaneGeometry(1.6, 1, 8, 6),
        [],
    );
    const geometriaConos = useMemo(() => {
        const geometrias: THREE.BufferGeometry[] = [];

        for (const [x, z] of LUCES_TORRES) {
            const cono = new THREE.ConeGeometry(4.2, 8.6, 16, 1, true);

            cono.translate(x, 4.3, z);
            geometrias.push(cono);
        }

        const conoGrua = new THREE.ConeGeometry(5, 12, 16, 1, true);

        conoGrua.translate(2, 10, -20);
        geometrias.push(conoGrua);

        return mergeGeometries(geometrias, false) ?? new THREE.BufferGeometry();
    }, []);
    const materialConos = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: '#ffe5b5',
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                toneMapped: false,
            }),
        [],
    );
    const geometriaEmisiva = useMemo(() => {
        const cajas: [
            number,
            number,
            number,
            number,
            number,
            number,
            string,
        ][] = [];
        const ventana = (
            x: number,
            y: number,
            z: number,
            ancho: number,
            alto: number,
            fondo: number,
            color = '#ffdca8',
        ): void => {
            cajas.push([x, y, z, ancho, alto, fondo, color]);
        };

        for (const x of [-13, -9, -5]) {
            for (const y of [3, 6]) {
                ventana(x, y, 24.22, 1.6, 0.9, 0.05);
            }
        }

        for (const x of [9, 12, 15]) {
            for (const y of [3, 6]) {
                ventana(x, y, -19.92, 1.4, 0.9, 0.06);
            }
        }

        for (const z of [-27, -23, -19]) {
            for (const y of [3, 6]) {
                ventana(26.08, y, z, 0.06, 0.9, 1.4);
            }
        }

        for (const y of [3, 6]) {
            ventana(24, y, -17.9, 1.2, 0.8, 0.06);
        }

        for (const z of [-6, -3, 0]) {
            for (const y of [2.5, 5]) {
                ventana(37.08, y, z, 0.06, 0.8, 1.2);
            }
        }

        ventana(-27, 2.4, 24.15, 0.8, 0.7, 0.06);
        ventana(-25, 2.4, 24.15, 0.8, 0.7, 0.06);
        ventana(-26, 2.8, 24.18, 2.4, 0.55, 0.06, '#fff6e0');
        ventana(20, 2.4, 31.84, 1.6, 0.5, 0.06, '#fff6e0');

        const geometrias = cajas.map(([x, y, z, ancho, alto, fondo, color]) => {
            const caja = new THREE.BoxGeometry(ancho, alto, fondo);

            caja.translate(x, y, z);

            return withColor(caja, color);
        });

        for (const farol of FAROLES_CALLE) {
            const [x, y, z] = cabezaFarol(farol);
            const enX = Math.abs(Math.sin(farol.giro)) > 0.5;
            const lampara = new THREE.BoxGeometry(
                enX ? 0.72 : 0.42,
                0.14,
                enX ? 0.42 : 0.72,
            );

            lampara.translate(x, y, z);
            geometrias.push(withColor(lampara, '#fff0cf'));
        }

        const progreso = Math.min(
            1,
            Math.max(0, frente / ETAPAS_FRENTE.length),
        );

        if (progreso > 0) {
            const barra = new THREE.BoxGeometry(1.4 * progreso, 0.09, 0.02);

            barra.translate(-20.95 + (1.4 * progreso) / 2, 2.72, -24.405);
            geometrias.push(withColor(barra, SITE.mint));
        }

        return mergeGeometries(geometrias, false) ?? new THREE.BufferGeometry();
    }, [frente]);
    const materialEmisiva = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0,
                toneMapped: false,
            }),
        [],
    );
    const geometriaConoVehiculo = useMemo(
        () => new THREE.ConeGeometry(1.5, 5, 10, 1, true),
        [],
    );
    const materialConoVehiculo = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: '#fff1cf',
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                toneMapped: false,
            }),
        [],
    );

    useFrame((_, delta) => {
        if (activo) {
            reloj.current += delta;
        }

        const tiempo = reloj.current;
        const objetivo =
            modoLuz === 'dia'
                ? 0.22
                : modoLuz === 'tarde'
                  ? 0.72
                  : modoLuz === 'noche'
                    ? 0.83
                    : reducedMotion
                      ? 0.22
                      : (tiempo / 150 + 0.22) % 1;
        let diferencia = objetivo - faseActual.current;

        if (diferencia > 0.5) {
            diferencia -= 1;
        } else if (diferencia < -0.5) {
            diferencia += 1;
        }

        const mezcla = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.2);

        faseActual.current = (faseActual.current + diferencia * mezcla + 1) % 1;

        const fase = faseActual.current;
        const muestra = muestrearDia(fase);
        const lucesDeCiclo = !(reducedMotion && modoLuz === 'ciclo');
        const torresOn = lucesDeCiclo
            ? Math.min(1, Math.max(0, (fase - 0.6) / 0.12))
            : 0;
        const menoresOn = lucesDeCiclo
            ? Math.min(1, Math.max(0, (fase - 0.72) / 0.12))
            : 0;

        fondo.current?.copy(muestra.fondo);

        if (ambiente.current) {
            ambiente.current.color.copy(muestra.ambiente);
            ambiente.current.intensity = muestra.ambienteIntensidad;
        }

        if (hemisferio.current) {
            hemisferio.current.intensity = 0.2 + menoresOn * 0.55;
        }

        if (sol.current) {
            sol.current.color.copy(muestra.sol);
            sol.current.intensity = muestra.solIntensidad;
        }

        if (relleno.current) {
            relleno.current.intensity = muestra.rellenoIntensidad;
        }

        focos.current.forEach((foco) => {
            if (foco) {
                foco.intensity = torresOn * 160;
            }
        });

        if (gruaTorre.current) {
            gruaTorre.current.intensity = torresOn * 45;
        }

        zonas.current.forEach((zona) => {
            if (zona) {
                zona.intensity = menoresOn * 55;
            }
        });

        materialConos.opacity = torresOn * 0.055;
        materialEmisiva.opacity = 0.15 + menoresOn * 0.85;
        materialConoVehiculo.opacity = menoresOn * 0.16;

        if (conosVehiculos.current) {
            MOVILES_ESTADO.forEach((vehiculo, indice) => {
                dummyLuz.position.set(
                    vehiculo.x + Math.sin(vehiculo.giro) * 2.8,
                    0.9,
                    vehiculo.z + Math.cos(vehiculo.giro) * 2.8,
                );
                dummyLuz.rotation.set(Math.PI / 2, vehiculo.giro, 0);
                dummyLuz.scale.set(1, 1, 1);
                dummyLuz.updateMatrix();
                conosVehiculos.current?.setMatrixAt(indice, dummyLuz.matrix);
            });
            conosVehiculos.current.instanceMatrix.needsUpdate = true;
        }

        if (materialLuces.current) {
            materialLuces.current.opacity = 0.32 + menoresOn * 0.66;
        }

        if (luces.current) {
            const posiciones = luces.current.geometry.attributes
                .position as THREE.BufferAttribute;
            const colores = luces.current.geometry.attributes
                .color as THREE.BufferAttribute;
            const pos = posiciones.array as Float32Array;

            for (let indice = 0; indice < MOVILES_ESTADO.length; indice += 1) {
                const vehiculo = MOVILES_ESTADO[indice];
                const base = datosLuces.vehiculosInicio + indice * 4;
                const adelanteX = Math.sin(vehiculo.giro);
                const adelanteZ = Math.cos(vehiculo.giro);
                const ladoX = Math.cos(vehiculo.giro);
                const ladoZ = -Math.sin(vehiculo.giro);

                pos[base * 3] = vehiculo.x + adelanteX * 2.2 + ladoX * 0.9;
                pos[base * 3 + 1] = 0.95;
                pos[base * 3 + 2] = vehiculo.z + adelanteZ * 2.2 + ladoZ * 0.9;
                pos[(base + 1) * 3] =
                    vehiculo.x + adelanteX * 2.2 - ladoX * 0.9;
                pos[(base + 1) * 3 + 1] = 0.95;
                pos[(base + 1) * 3 + 2] =
                    vehiculo.z + adelanteZ * 2.2 - ladoZ * 0.9;
                pos[(base + 2) * 3] = vehiculo.x;
                pos[(base + 2) * 3 + 1] = 3.2;
                pos[(base + 2) * 3 + 2] = vehiculo.z;
                pos[(base + 3) * 3] = vehiculo.x - adelanteX * 2.6;
                pos[(base + 3) * 3 + 1] = 0.9;
                pos[(base + 3) * 3 + 2] = vehiculo.z - adelanteZ * 2.6;
            }

            posiciones.needsUpdate = true;

            const ciclo = tiempo % 12;
            const activoRojo = ciclo < 5;
            const activoAmbar = ciclo >= 5 && ciclo < 8;
            const activoBlanco = ciclo >= 8;
            const rojo = new THREE.Color('#ff3b30');
            const ambar = new THREE.Color('#ffb347');
            const blanco = new THREE.Color('#fff6e0');
            const tenue = new THREE.Color('#2a2118');

            const semaforo = [
                activoRojo ? rojo : tenue,
                activoAmbar ? ambar : tenue,
                activoBlanco ? blanco : tenue,
            ];

            semaforo.forEach((color, indice) => {
                const base = datosLuces.semaforoInicio + indice;

                colores.setXYZ(base, color.r, color.g, color.b);
            });
            colores.needsUpdate = true;
        }

        if (particulas.current) {
            const atributo = particulas.current.geometry.attributes
                .position as THREE.BufferAttribute;
            const posiciones = atributo.array as Float32Array;
            const total = posiciones.length / 3;
            const dumper = MOVILES_ESTADO.find(
                (vehiculo) => vehiculo.nombre === 'dumper',
            );
            const giroDumper = dumper?.giro ?? 0;
            const dumperX = dumper?.x ?? 4;
            const dumperZ = dumper?.z ?? 18;
            const traseroX = dumperX - Math.sin(giroDumper) * 3.4;
            const traseroZ = dumperZ - Math.cos(giroDumper) * 3.4;

            for (let indice = 0; indice < total; indice += 1) {
                const humo = indice < 60;
                const vida =
                    (tiempo * (humo ? 0.05 : 0.1) + datos.fases[indice]) % 1;
                const baseX = datos.bases[indice * 3];
                const baseY = datos.bases[indice * 3 + 1];
                const baseZ = datos.bases[indice * 3 + 2];

                if (humo) {
                    posiciones[indice * 3] =
                        baseX + Math.sin(indice + tiempo * 0.4) * 0.5 * vida;
                    posiciones[indice * 3 + 1] = baseY + vida * 7.5;
                    posiciones[indice * 3 + 2] =
                        baseZ +
                        Math.cos(indice * 1.7 + tiempo * 0.3) * 0.5 * vida;
                } else {
                    posiciones[indice * 3] =
                        traseroX +
                        Math.cos(indice * 1.3 + tiempo * 0.5) *
                            (0.7 + vida * 1.4);
                    posiciones[indice * 3 + 1] = 0.2 + vida * 0.9;
                    posiciones[indice * 3 + 2] =
                        traseroZ +
                        Math.sin(indice * 1.7 + tiempo * 0.6) *
                            (0.7 + vida * 1.4);
                }
            }

            atributo.needsUpdate = true;
        }

        if (bandera.current) {
            const posicion = bandera.current.geometry.attributes
                .position as THREE.BufferAttribute;

            for (let indice = 0; indice < posicion.count; indice += 1) {
                const x = posicion.getX(indice);

                posicion.setZ(
                    indice,
                    Math.sin(x * 3.5 + tiempo * 2.4) * 0.12 * (x + 0.8),
                );
            }

            posicion.needsUpdate = true;
            bandera.current.geometry.computeVertexNormals();
        }
    });

    return (
        <>
            <color ref={fondo} attach="background" args={[SITE.sky]} />
            <ambientLight ref={ambiente} intensity={1.25} />
            <hemisphereLight
                ref={hemisferio}
                args={['#5A6B8C', '#2B2B33', 0.2]}
            />
            <directionalLight
                ref={sol}
                position={[40, 70, 50]}
                intensity={1.55}
            />
            <directionalLight
                ref={relleno}
                position={[-50, 30, -30]}
                intensity={0.45}
            />

            {LUCES_TORRES.map(([x, z], indice) => (
                <spotLight
                    key={`foco-${indice}`}
                    ref={(elemento) => {
                        focos.current[indice] = elemento;
                    }}
                    position={[x, 8.6, z]}
                    color="#ffe0b0"
                    intensity={0}
                    angle={0.5}
                    penumbra={0.6}
                    distance={50}
                    decay={1.4}
                />
            ))}

            <pointLight
                ref={gruaTorre}
                position={[2, 15, -20]}
                color="#ffd9a0"
                intensity={0}
                distance={36}
                decay={1.6}
            />

            {FAROLES_CALLE.map((farol, indice) => (
                <pointLight
                    key={`farol-${indice}`}
                    ref={(elemento) => {
                        zonas.current[indice] = elemento;
                    }}
                    position={cabezaFarol(farol)}
                    color="#ffd6a0"
                    intensity={0}
                    distance={20}
                    decay={1.7}
                />
            ))}

            <points
                ref={particulas}
                geometry={geometriaParticulas}
                frustumCulled={false}
            >
                <pointsMaterial
                    map={textura ?? undefined}
                    size={0.9}
                    sizeAttenuation
                    vertexColors
                    transparent
                    opacity={0.42}
                    depthWrite={false}
                    alphaTest={0.01}
                />
            </points>

            <points ref={luces} geometry={geometriaLuces} frustumCulled={false}>
                <pointsMaterial
                    ref={materialLuces}
                    map={textura ?? undefined}
                    size={0.9}
                    sizeAttenuation
                    vertexColors
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                />
            </points>

            <mesh geometry={geometriaConos} material={materialConos} />
            <mesh geometry={geometriaEmisiva} material={materialEmisiva} />
            <instancedMesh
                ref={conosVehiculos}
                args={[geometriaConoVehiculo, materialConoVehiculo, 4]}
                frustumCulled={false}
            />

            <mesh
                ref={bandera}
                geometry={geometriaBandera}
                position={[-23.18, 2.02, 26]}
            >
                <meshStandardMaterial
                    color={SITE.mint}
                    side={THREE.DoubleSide}
                    roughness={0.9}
                />
            </mesh>
        </>
    );
}

interface StaticBox {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
}

const STATIC_BOXES: StaticBox[] = [
    // Estacionamiento de asfalto (fondo izquierda).
    { position: [-30.5, 0.03, -24], size: [27, 0.06, 16], color: '#4b4a47' },
    // Patio de tierra ocre detrás de la obra: llega al muro del fondo.
    { position: [2.5, 0.02, -22], size: [39, 0.04, 20], color: '#8a6a48' },
    // Parche de tierra bajo el edificio de la derecha.
    { position: [26, 0.02, -24], size: [8, 0.04, 16], color: '#8a6a48' },
    // Franja de tierra clara junto al muro derecho, de muro a muro.
    { position: [37, 0.02, 0], size: [14, 0.04, 64], color: '#b7a98a' },
    // Patio de obra cercado: tierra oscura.
    { position: [-9.5, 0.02, 18], size: [27, 0.04, 20], color: '#5f4a35' },
    // Plataformas de concreto.
    { position: [14, 0.02, 15], size: [16, 0.04, 14], color: SITE.slab },
    { position: [14, 0.02, 25], size: [12, 0.04, 6], color: '#c8c2b6' },
    // Vía perimetral en tres lados.
    { position: [-34, 0.03, 8], size: [8, 0.06, 48], color: SITE.road },
    { position: [-4, 0.03, -8], size: [64, 0.06, 8], color: SITE.road },
    { position: [26, 0.03, 8], size: [8, 0.06, 48], color: SITE.road },
    // Cerco perimetral (hoarding verde) con portones al sur.
    { position: [-44, 0.9, 0], size: [0.3, 1.8, 64], color: SITE.hoarding },
    { position: [44, 0.9, 0], size: [0.3, 1.8, 64], color: SITE.hoarding },
    { position: [0, 0.9, -32], size: [88, 1.8, 0.3], color: SITE.hoarding },
    { position: [-40, 0.9, 32], size: [8, 1.8, 0.3], color: SITE.hoarding },
    { position: [-4, 0.9, 32], size: [56, 1.8, 0.3], color: SITE.hoarding },
    { position: [36, 0.9, 32], size: [16, 1.8, 0.3], color: SITE.hoarding },
    { position: [-36, 1.2, 32], size: [0.2, 2.4, 0.2], color: SITE.steel },
    { position: [-32, 1.2, 32], size: [0.2, 2.4, 0.2], color: SITE.steel },
    { position: [24, 1.2, 32], size: [0.2, 2.4, 0.2], color: SITE.steel },
    { position: [28, 1.2, 32], size: [0.2, 2.4, 0.2], color: SITE.steel },
    // Soportes de la pizarra PMI.
    {
        position: [-20.8, 0.45, -24.5],
        size: [0.08, 0.9, 0.08],
        color: SITE.steel,
    },
    {
        position: [-19.6, 0.45, -24.5],
        size: [0.08, 0.9, 0.08],
        color: SITE.steel,
    },
    // Huellas de neumático en el acceso y el patio.
    { position: [20, 0.075, 28.4], size: [12, 0.012, 0.35], color: '#3e3a34' },
    { position: [24, 0.075, 29.2], size: [12, 0.012, 0.35], color: '#3e3a34' },
    { position: [30, 0.075, 12], size: [0.35, 0.012, 14], color: '#3e3a34' },
    { position: [-18, 0.075, 28.4], size: [14, 0.012, 0.35], color: '#3e3a34' },
    { position: [6, 0.075, 8], size: [0.35, 0.012, 10], color: '#3e3a34' },
    // Fondo de la barra de avance en la pizarra PMI.
    {
        position: [-20.2, 2.72, -24.43],
        size: [1.5, 0.12, 0.02],
        color: '#2b2b33',
    },
    // Mástil de bandera y baliza del generador.
    { position: [-24, 1.15, 26], size: [0.1, 2.3, 0.1], color: '#4a4a4a' },
    { position: [21.5, 0.8, 11.5], size: [0.12, 1.6, 0.12], color: '#3d3a35' },
    // Charcos.
    { position: [-6, 0.08, 25], size: [3.2, 0.012, 2.2], color: '#9fc4d5' },
    { position: [30, 0.08, 4], size: [2.4, 0.012, 1.8], color: '#9fc4d5' },
    { position: [-28, 0.08, 8], size: [2.8, 0.012, 2], color: '#9fc4d5' },
    { position: [8, 0.08, 20], size: [2, 0.012, 1.4], color: '#9fc4d5' },
];

function withColor(
    geometry: THREE.BufferGeometry,
    color: string,
): THREE.BufferGeometry {
    const count = geometry.attributes.position.count;
    const value = new THREE.Color(color);
    const colors = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
        colors[index * 3] = value.r;
        colors[index * 3 + 1] = value.g;
        colors[index * 3 + 2] = value.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
}

interface KitProp {
    url: string;
    position: [number, number, number];
    rotation?: [number, number, number];
}

const KIT = '/assets/vitrina';

const KIT_PROPS: KitProp[] = [
    // ── Edificio: núcleo continuo de concreto, 12 × 8 m y dos niveles ──
    ...[-12, -8, -4].flatMap((x) =>
        [16, 24].flatMap((z) =>
            [0, 6.64].map(
                (y) =>
                    ({
                        url: `${KIT}/concrete-core-section-39af7c.glb`,
                        position: [x, y, z],
                    }) as KitProp,
            ),
        ),
    ),
    ...[-14, -2].flatMap((x) =>
        [18, 22].flatMap((z) =>
            [0, 6.64].map(
                (y) =>
                    ({
                        url: `${KIT}/concrete-core-section-39af7c.glb`,
                        position: [x, y, z],
                        rotation: [0, Math.PI / 2, 0],
                    }) as KitProp,
            ),
        ),
    ),
    ...[-12, -8, -4].flatMap((x) =>
        [18, 22].map(
            (z) =>
                ({
                    url: `${KIT}/metal-deck-floor-plate-6cdd1c.glb`,
                    position: [x, 6.96, z],
                }) as KitProp,
        ),
    ),
    ...[-12, -8, -4].flatMap((x) => [
        {
            url: `${KIT}/formwork-wall-panel-run-52e9f5.glb`,
            position: [x, 8.6, 15.85],
        } as KitProp,
        {
            url: `${KIT}/formwork-wall-panel-run-52e9f5.glb`,
            position: [x, 8.6, 24.15],
            rotation: [0, Math.PI, 0],
        } as KitProp,
    ]),
    ...[-14.96, -1.04].flatMap((x) =>
        [18, 22].map(
            (z) =>
                ({
                    url: `${KIT}/formwork-wall-panel-run-52e9f5.glb`,
                    position: [x, 8.6, z],
                    rotation: [0, Math.PI / 2, 0],
                }) as KitProp,
        ),
    ),
    // Andamios al frente del núcleo.
    ...[-12, -8, -4].flatMap((x) =>
        [0, 3.1, 6.2].map(
            (y) =>
                ({
                    url: `${KIT}/scaffold-bay-4e051b.glb`,
                    position: [x, y, 14.1],
                }) as KitProp,
        ),
    ),

    // ── Patio de obra: acopios, PMU y maquinaria menor ──
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [-18, 0, 14.5],
    },
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [-18, 0.59, 14.5],
    },
    { url: `${KIT}/site-cabin-e9ee10.glb`, position: [-26, 0, 22] },
    {
        url: `${KIT}/tandem-road-roller-f7d8f3.glb`,
        position: [-19, 0, 21],
        rotation: [0, 0.3, 0],
    },
    {
        url: `${KIT}/mini-excavator-cbe1ae.glb`,
        position: [-1, 0, 13],
        rotation: [0, 0.4, 0],
    },
    { url: `${KIT}/site-tool-vault-200e38.glb`, position: [-11, 0, 11.5] },
    { url: `${KIT}/rebar-assembly-889031.glb`, position: [4, 0.1, 14] },
    { url: `${KIT}/spoil-heap-9aaa11.glb`, position: [-19, 0, 24] },

    // ── Estacionamiento (fondo izquierda) ──
    // Caseta Archivo al centro-derecha del asfalto.
    { url: `${KIT}/security-gatehouse-fd00c8.glb`, position: [-25.5, 0, -25] },
    // Fila contra el muro del fondo: cuatro autos alineados.
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-39.5, 0, -29.5] },
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-36.5, 0, -29.5] },
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-33.5, 0, -29.5] },
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-30.5, 0, -29.5] },
    // Dos autos en batería contra el muro izquierdo.
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-42, 0, -24] },
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-42, 0, -18.5] },
    // Dos autos frente a la caseta, junto a la pizarra.
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-18.3, 0, -28.5] },
    { url: `${KIT}/town-car-56eeb6.glb`, position: [-18.3, 0, -22.5] },
    {
        url: `${KIT}/whiteboard-ea98f7.glb`,
        position: [-20.2, 0.95, -24.5],
    },
    { url: `${KIT}/sidewalk-bollard-c2567e.glb`, position: [-39.5, 0, -26.3] },
    { url: `${KIT}/sidewalk-bollard-c2567e.glb`, position: [-36.5, 0, -26.3] },
    { url: `${KIT}/sidewalk-bollard-c2567e.glb`, position: [-33.5, 0, -26.3] },
    { url: `${KIT}/sidewalk-bollard-c2567e.glb`, position: [-30.5, 0, -26.3] },

    // ── Franja trasera: grúa torre, excavadoras y acopios ──
    { url: `${KIT}/tower-crane-mast-1784a3.glb`, position: [2, 0, -20] },
    {
        url: `${KIT}/backhoe-loader-66dccb.glb`,
        position: [-14, 0, -20],
    },
    { url: `${KIT}/spoil-heap-9aaa11.glb`, position: [-2, 0, -27] },
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [9, 0, -16],
    },
    {
        url: `${KIT}/precast-concrete-stack-8945ac.glb`,
        position: [13.5, 0, -16],
    },
    {
        url: `${KIT}/pipe-run-280a0d.glb`,
        position: [19.5, 0, -15.5],
        rotation: [0, Math.PI / 2, 0],
    },
    {
        url: `${KIT}/privacy-curtain-panel-1e1593.glb`,
        position: [5, 0, -31.4],
    },
    {
        url: `${KIT}/privacy-curtain-panel-1e1593.glb`,
        position: [8, 0, -31.4],
    },
    {
        url: `${KIT}/site-lighting-tower-674c45.glb`,
        position: [-12, 0, -30],
    },

    // ── Plataforma de concreto (centro-derecha) ──
    {
        url: `${KIT}/site-generator-298792.glb`,
        position: [21.5, 0, 10],
    },
    {
        url: `${KIT}/site-lighting-tower-674c45.glb`,
        position: [21.5, 0, 13.5],
    },
    {
        url: `${KIT}/signal-cable-drum-88e3f8.glb`,
        position: [9, 0, 17],
    },
    {
        url: `${KIT}/signal-cable-drum-88e3f8.glb`,
        position: [10.2, 0, 17],
    },
    {
        url: `${KIT}/queue-barrier-stanchion-run-1836c8.glb`,
        position: [14.5, 0, 17],
    },
    {
        url: `${KIT}/pipe-run-280a0d.glb`,
        position: [20, 0, 19],
        rotation: [0, Math.PI / 2, 0],
    },

    // ── Almacén (derecha, hacia la calle) ──
    {
        url: `${KIT}/precast-concrete-stack-8945ac.glb`,
        position: [14, 0, 28.2],
    },

    // ── Portón y acceso ──
    {
        url: `${KIT}/lifting-barrier-arm-64a343.glb`,
        position: [26, 0, 30.5],
    },
    {
        url: `${KIT}/crash-barrier-run-b47d1d.glb`,
        position: [21, 0, 30],
    },
    {
        url: `${KIT}/crash-barrier-run-b47d1d.glb`,
        position: [29, 0, 30],
        rotation: [0, Math.PI / 2, 0],
    },
    {
        url: `${KIT}/crash-barrier-run-b47d1d.glb`,
        position: [-34, 0, 30],
    },
    {
        url: `${KIT}/site-safety-sign-board-5408d5.glb`,
        position: [22, 0, 28.5],
    },

    // ── Franja beige: acopio junto a la vía ──
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [33.5, 0, 12.5],
        rotation: [0, 0.3, 0],
    },
    ...[7.5, 9.5].flatMap((z) =>
        [0, 0.9].map(
            (y) =>
                ({
                    url: `${KIT}/precast-concrete-stack-8945ac.glb`,
                    position: [39, y, z],
                    rotation: [0, 0.15, 0],
                }) as KitProp,
        ),
    ),
    {
        url: `${KIT}/privacy-curtain-panel-1e1593.glb`,
        position: [43.5, 0, 12],
        rotation: [0, Math.PI / 2, 0],
    },
    {
        url: `${KIT}/site-lighting-tower-674c45.glb`,
        position: [34, 0, -12],
    },
    {
        url: `${KIT}/site-lighting-tower-674c45.glb`,
        position: [-30, 0, 26],
    },

    // ── Edificio en acabados (parche verde, esquina trasera derecha) ──
    {
        url: `${KIT}/apartment-block-6445af.glb`,
        position: [24, 0, -24],
        rotation: [0, Math.PI / 2, 0],
    },
    // Andamio y acopio alrededor del edificio.
    {
        url: `${KIT}/scaffold-bay-4e051b.glb`,
        position: [28, 0, -20],
    },
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [28, 0, -24],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [28, 0, -22],
        rotation: [0, 0.2, 0],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [28, 0, -27.5],
        rotation: [0, 0.15, 0],
    },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [27, 0, -26],
    },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [29, 0, -26],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [18, 0, -13.5],
        rotation: [0, 0.3, 0],
    },

    // ── Edificio A: franja de pasto izquierda, junto al cerco ──
    {
        url: `${KIT}/three-storey-shophouse-2f6378.glb`,
        position: [-26, 0, 9],
    },
    {
        url: `${KIT}/scaffold-bay-4e051b.glb`,
        position: [-26, 0, 13],
    },
    {
        url: `${KIT}/formwork-wall-panel-run-52e9f5.glb`,
        position: [-26, 0, 4],
    },
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [-24, 0, 15],
    },

    // ── Edificio B: franja beige bajo la torre de luz ──
    {
        url: `${KIT}/hotel-b43f66.glb`,
        position: [34, 0, -3],
    },
    {
        url: `${KIT}/scaffold-bay-4e051b.glb`,
        position: [34, 0, 4],
    },
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [33, 0, 6],
    },

    // ── Edificio adicional sobre el parche de tierra marrón ──
    // Fachada larga hacia la cámara; construcción alrededor.
    {
        url: `${KIT}/apartment-block-6445af.glb`,
        position: [12, 0, -22],
    },
    {
        url: `${KIT}/scaffold-bay-4e051b.glb`,
        position: [12, 0, -18],
    },
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [14, 0, -26],
    },
    {
        url: `${KIT}/formwork-wall-panel-run-52e9f5.glb`,
        position: [16.5, 0, -15.5],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [18, 0, -27],
        rotation: [0, 0.2, 0],
    },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [18.5, 0, -29],
    },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [20, 0, -29],
    },

    // ── Franja izquierda: acopio de materiales y skip ──
    {
        url: `${KIT}/scaffold-material-stack-836dd2.glb`,
        position: [-41, 0, -6],
    },
    { url: `${KIT}/material-pallet-6af263.glb`, position: [-41, 0, -3.4] },
    { url: `${KIT}/material-pallet-6af263.glb`, position: [-41, 0, -2.2] },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [-41, 0, -0.8],
    },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [-41, 0, 0.4],
    },
    { url: `${KIT}/builder-s-skip-191d35.glb`, position: [-28, 0, -13.5] },

    // ── Franja izquierda junto a la entrada: cluster ──
    ...[0, 1, 2].map(
        (y) =>
            ({
                url: `${KIT}/pipe-run-280a0d.glb`,
                position: [-41.5, y, 18],
                rotation: [0, 0.1 + y * 0.02, 0],
            }) as KitProp,
    ),
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [-40.5, 0, 21],
        rotation: [0, 0.4, 0],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [-41.5, 0, 23.5],
        rotation: [0, -0.2, 0],
    },
    {
        url: `${KIT}/formwork-wall-panel-run-52e9f5.glb`,
        position: [-42, 0, 26],
        rotation: [0, Math.PI / 2, 0],
    },
    {
        url: `${KIT}/site-safety-sign-board-5408d5.glb`,
        position: [-40, 0, 25.5],
        rotation: [0, 0.3, 0],
    },

    // ── Banda de pasto detrás del edificio principal ──
    ...[
        [-8, 0.3, 2],
        [-4, -0.4, 4],
        [-10, 0.6, 5],
    ].map(
        ([x, rotation, z]) =>
            ({
                url: `${KIT}/rebar-assembly-889031.glb`,
                position: [x, 0.1, z],
                rotation: [0, rotation, 0],
            }) as KitProp,
    ),
    ...[0, 0.9].map(
        (y) =>
            ({
                url: `${KIT}/precast-concrete-stack-8945ac.glb`,
                position: [2, y, 2],
                rotation: [0, 0.2, 0],
            }) as KitProp,
    ),
    ...[0, 0.59].map(
        (y) =>
            ({
                url: `${KIT}/scaffold-material-stack-836dd2.glb`,
                position: [8, y, 2],
                rotation: [0, -0.2, 0],
            }) as KitProp,
    ),
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [14, 0, 2],
        rotation: [0, 0.4, 0],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [16, 0, 4],
        rotation: [0, -0.2, 0],
    },
    ...[
        [0, 6],
        [5, 6],
        [10, 6],
        [18, 5],
    ].map(
        ([x, z]) =>
            ({
                url: `${KIT}/site-traffic-cone-d3ce94.glb`,
                position: [x, 0, z],
            }) as KitProp,
    ),

    // ── Banda de pasto izquierda detrás del edificio ──
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [-19.5, 0, 5.8],
    },
    {
        url: `${KIT}/builder-s-dumpy-bag-89fd1b.glb`,
        position: [-17.5, 0, 5.8],
    },
    {
        url: `${KIT}/material-pallet-6af263.glb`,
        position: [-15.5, 0, 5.5],
        rotation: [0, 0.3, 0],
    },

    // ── Árboles de olivo ──
    ...(
        [
            [-41, -12],
            [-39, -12],
            [-41, -8.5],
            [-39, -8.5],
            [-41, 2],
            [-41, 10],
            [37, -28],
            [41, -28],
            [37, -23],
            [41, -23],
            [37, -18],
            [41, -18],
            [41, -6],
            [41, 4],
            [41, 16],
            [41, 22],
            [37, 26],
        ] as Array<[number, number]>
    ).map(
        ([x, z]) =>
            ({
                url: `${KIT}/olive-tree-3cb4a4.glb`,
                position: [x, 0, z],
                rotation: [0, ((x * 7 + z * 13) % 360) * (Math.PI / 180), 0],
            }) as KitProp,
    ),

    // ── Cerco metálico exterior, pegado a los bordes de la vía ──
    // a) Lado izquierdo del patio, desde la caseta hasta la esquina trasera.
    ...Array.from({ length: 18 }, (_, index) => -3 + index * 2).map(
        (z) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [-30, 0, z],
                rotation: [0, Math.PI / 2, 0],
            }) as KitProp,
    ),
    // a) Esquina trasera izquierda hasta el edificio.
    ...[-30, -28, -26, -24, -22, -20, -18, -16, -14].map(
        (x) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [x, 0, -4],
            }) as KitProp,
    ),
    // b) Lado trasero desde el edificio hasta la vía derecha.
    ...Array.from({ length: 11 }, (_, index) => -1 + index * 2).map(
        (x) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [x, 0, -4],
            }) as KitProp,
    ),
    // b) Lado derecho hasta el portón, a la par de la vía.
    ...Array.from({ length: 16 }, (_, index) => 1 + index * 2).map(
        (z) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [21.5, 0, z],
                rotation: [0, Math.PI / 2, 0],
            }) as KitProp,
    ),
    // d) Separación entre la vía derecha y la franja de árboles.
    ...Array.from({ length: 31 }, (_, index) => -30 + index * 2).map(
        (z) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [30.5, 0, z],
                rotation: [0, Math.PI / 2, 0],
            }) as KitProp,
    ),
    // c) Patio de tierra: lado izquierdo y lado delantero.
    ...Array.from({ length: 9 }, (_, index) => -29 + index * 2).map(
        (z) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [-17, 0, z],
                rotation: [0, Math.PI / 2, 0],
            }) as KitProp,
    ),
    ...Array.from({ length: 19 }, (_, index) => -16 + index * 2).map(
        (x) =>
            ({
                url: `${KIT}/mesh-fence-panel-11d4e2.glb`,
                position: [x, 0, -12],
            }) as KitProp,
    ),
    // Gantry y pallet del almacén.
    { url: `${KIT}/loading-gantry-34460f.glb`, position: [14, 0, 25] },
    { url: `${KIT}/material-pallet-6af263.glb`, position: [14, 0, 22.2] },
    // Alumbrado público: faroles Polyfork a los lados de las vías.
    ...FAROLES_CALLE.map(
        (farol) =>
            ({
                url: `${KIT}/street-lamp-29f365.glb`,
                position: [farol.x, 0, farol.z],
                rotation: [0, farol.giro, 0],
            }) as KitProp,
    ),
    // Señalización de acceso.
    {
        url: `${KIT}/arrow-board-2eea6b.glb`,
        position: [30, 0, 22.5],
        rotation: [0, -0.65, 0],
    },
    {
        url: `${KIT}/temporary-traffic-light-04c866.glb`,
        position: [24.2, 0, 30.5],
    },
];

function mergePlaced(gltfs: GLTF[], props: KitProp[]): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    const allowed = new Set(['position', 'normal', 'color']);
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();

    gltfs.forEach((gltf, index) => {
        const prop = props[index];
        const placement = new THREE.Matrix4().compose(
            new THREE.Vector3(...prop.position),
            quaternion.setFromEuler(euler.set(...(prop.rotation ?? [0, 0, 0]))),
            new THREE.Vector3(1, 1, 1),
        );

        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((object) => {
            const mesh = object as THREE.Mesh;

            if (!mesh.isMesh) {
                return;
            }

            const geometry = mesh.geometry.clone();
            geometry.applyMatrix4(mesh.matrixWorld);
            geometry.applyMatrix4(placement);

            for (const name of Object.keys(geometry.attributes)) {
                if (!allowed.has(name)) {
                    geometry.deleteAttribute(name);
                }
            }

            if (!geometry.attributes.color) {
                geometry.setAttribute(
                    'color',
                    new THREE.BufferAttribute(
                        new Float32Array(
                            geometry.attributes.position.count * 3,
                        ).fill(1),
                        3,
                    ),
                );
            }
            geometries.push(geometry);
        });
    });

    return mergeGeometries(geometries, false) ?? new THREE.BufferGeometry();
}

function StaticProps() {
    const urls = useMemo(() => KIT_PROPS.map((prop) => prop.url), []);
    const gltfs = useLoader(GLTFLoader, urls) as GLTF[];
    const geometry = useMemo(() => mergePlaced(gltfs, KIT_PROPS), [gltfs]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial vertexColors flatShading />
        </mesh>
    );
}
function buildStaticGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    const ground = new THREE.PlaneGeometry(88, 64);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, -0.01, 0);
    geometries.push(withColor(ground, SITE.ground));

    for (const box of STATIC_BOXES) {
        const geometry = new THREE.BoxGeometry(...box.size);
        geometry.translate(...box.position);
        geometries.push(withColor(geometry, box.color));
    }

    // Barro y desgaste en accesos, patio trasero y franja derecha.
    const patches: Array<[number, number, number, string]> = [
        [-30, 29, 2.5, '#6b4e33'],
        [-34, 26, 2.2, '#8a6a48'],
        [-25, 30.5, 2, '#7a5c3e'],
        [-10, -20, 3, '#6b4e33'],
        [6, -24, 2.6, '#7a5c3e'],
        [14, -18, 2.2, '#6b4e33'],
        [-12, 10, 2.2, '#4f3d2c'],
        [-2, 26, 2, '#4f3d2c'],
        [36, -8, 2.6, '#a99878'],
        [33, 20, 2.2, '#a99878'],
    ];

    patches.forEach(([x, z, radius, color], index) => {
        const patch = new THREE.CircleGeometry(radius, 14);
        patch.rotateX(-Math.PI / 2);
        patch.translate(x, 0.012 + index * 0.0004, z);
        geometries.push(withColor(patch, color));
    });

    // Haces de tuberías naranjas en la franja beige.
    for (const z of [16, 18, 20]) {
        for (const offsetX of [-0.75, 0, 0.75]) {
            const pipe = new THREE.CylinderGeometry(0.32, 0.32, 4, 8);
            pipe.rotateX(Math.PI / 2);
            pipe.translate(35 + offsetX, 0.45, z);
            geometries.push(withColor(pipe, SITE.cone));
        }
    }

    // Montículos de material: arena, grava y tierra.
    const addMound = (x: number, z: number, radius: number, color: string) => {
        const mound = new THREE.ConeGeometry(radius, radius * 0.8, 9);
        mound.translate(x, radius * 0.4, z);
        geometries.push(withColor(mound, color));
    };

    addMound(-21, 2, 1.1, SITE.sand);
    addMound(-18, 3.5, 1, SITE.gravel);
    addMound(-15, 1.5, 1, SITE.mud);
    addMound(38, -13, 1.4, SITE.sand);
    addMound(38.5, -1, 1.2, SITE.gravel);
    addMound(32.5, 10, 1.2, SITE.mud);

    // Escalera de concreto (lado este del núcleo), 21 peldaños.
    for (let step = 0; step < 21; step += 1) {
        const height = (step + 1) * 0.3;
        const stair = new THREE.BoxGeometry(2.4, height, 0.34);
        stair.translate(-0.6, height / 2, 24.4 - step * 0.34);
        const tone = ['#6e6a64', '#76726b', '#67635d'][step % 3] ?? '#6e6a64';
        geometries.push(withColor(stair, tone));
    }

    const landing = new THREE.BoxGeometry(2.6, 0.32, 2.3);
    landing.translate(-0.6, 6.46, 16.3);
    geometries.push(withColor(landing, '#6e6a64'));

    for (const x of [-1.65, 0.45]) {
        const rail = new THREE.BoxGeometry(0.07, 0.07, 7.7);
        rail.rotateX(0.747);
        rail.translate(x, 3.4, 21);
        geometries.push(withColor(rail, SITE.steel));
    }

    // Escalera entre las dos edificaciones de apartamentos.
    for (let step = 0; step < 21; step += 1) {
        const height = (step + 1) * 0.3;
        const stair = new THREE.BoxGeometry(1.6, height, 0.34);
        stair.translate(21.1, height / 2, -17 - step * 0.34);
        const tone = ['#6e6a64', '#76726b', '#67635d'][step % 3] ?? '#6e6a64';
        geometries.push(withColor(stair, tone));
    }

    const centralLanding = new THREE.BoxGeometry(1.6, 0.32, 1.2);
    centralLanding.translate(21.1, 6.46, -17 - 21 * 0.34 - 0.4);
    geometries.push(withColor(centralLanding, '#6e6a64'));

    // Viga corona: remate superior del núcleo.
    const crown: Array<[number, number, number, number]> = [
        [12, 0.45, -8, 16],
        [12, 0.45, -8, 24],
        [0.45, 8, -14, 20],
        [0.45, 8, -2, 20],
    ];

    for (const [width, depth, x, z] of crown) {
        const beam = new THREE.BoxGeometry(width, 0.5, depth);
        beam.translate(x, 13.5, z);
        geometries.push(withColor(beam, SITE.slab));
    }

    // Cerco anaranjado interior: rodea la zona marrón del edificio central.
    const orangeSegments: Array<[number, number, number, number]> = [
        [-21.5, 9, -21.5, 26.5],
        [2.5, 9, 2.5, 26.5],
        [-21.5, 9, 2.5, 9],
        [-21.5, 26.5, 2.5, 26.5],
    ];

    for (const [x1, z1, x2, z2] of orangeSegments) {
        const length = Math.hypot(x2 - x1, z2 - z1);
        const count = Math.max(1, Math.round(length / 4));

        for (let index = 0; index <= count; index += 1) {
            const t = index / count;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const post = new THREE.BoxGeometry(0.12, 1.5, 0.12);
            post.translate(x, 0.75, z);
            geometries.push(withColor(post, SITE.cone));

            if (index < count) {
                const nx = x1 + (x2 - x1) * ((index + 1) / count);
                const nz = z1 + (z2 - z1) * ((index + 1) / count);

                for (const y of [0.55, 1.15]) {
                    const rail = new THREE.BoxGeometry(
                        0.06,
                        0.06,
                        Math.hypot(nx - x, nz - z),
                    );
                    rail.rotateY(Math.atan2(nx - x, nz - z));
                    rail.translate((x + nx) / 2, y, (z + nz) / 2);
                    geometries.push(withColor(rail, SITE.cone));
                }
            }
        }
    }

    // Señalización horizontal: líneas de estacionamiento y vías.
    const marking = '#e9e4d7';

    for (const z of [-8, 0, 8, 16, 24]) {
        for (const x of [-34, 26]) {
            const dash = new THREE.BoxGeometry(0.12, 0.01, 2);
            dash.translate(x, 0.065, z);
            geometries.push(withColor(dash, marking));
        }
    }

    for (const x of [-32, -24, -16, -8, 0, 8, 16, 24]) {
        const dash = new THREE.BoxGeometry(2, 0.01, 0.12);
        dash.translate(x, 0.065, -8);
        geometries.push(withColor(dash, marking));
    }

    for (const x of [-40.5, -37.5, -34.5, -31.5]) {
        const line = new THREE.BoxGeometry(0.06, 0.01, 5.4);
        line.translate(x, 0.065, -29.5);
        geometries.push(withColor(line, marking));
    }

    for (const z of [-26.5, -21.5, -16]) {
        const line = new THREE.BoxGeometry(3, 0.01, 0.06);
        line.translate(-42.5, 0.065, z);
        geometries.push(withColor(line, marking));
    }

    for (const z of [-31, -25.5, -20]) {
        const line = new THREE.BoxGeometry(3, 0.01, 0.06);
        line.translate(-18.5, 0.065, z);
        geometries.push(withColor(line, marking));
    }

    // Canto de losa en tres capas: tierra, grava y base.
    const capas: Array<[number, number, string]> = [
        [0.035, 0.06, '#5f4a35'],
        [0.1, 0.06, '#8a6a48'],
        [0.165, 0.06, '#b7a98a'],
    ];

    for (const [y, alto, color] of capas) {
        for (const [x, z, ancho, fondo] of [
            [0, 31.78, 88, 0.4],
            [0, -31.78, 88, 0.4],
            [-43.78, 0, 0.4, 64],
            [43.78, 0, 0.4, 64],
        ] as [number, number, number, number][]) {
            const capa = new THREE.BoxGeometry(ancho, alto, fondo);

            capa.translate(x, y, z);
            geometries.push(withColor(capa, color));
        }
    }

    return mergeGeometries(geometries, false) ?? new THREE.BufferGeometry();
}

function StaticSite() {
    const geometry = useMemo(buildStaticGeometry, []);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial vertexColors flatShading />
        </mesh>
    );
}

function Hotspots({
    selected,
    hovered,
    pulso,
    onSelect,
    onHover,
}: {
    selected: ZoneId | null;
    hovered: ZoneId | null;
    pulso: { id: ZoneId; inicio: number } | null;
    onSelect: (id: ZoneId) => void;
    onHover: (id: ZoneId | null) => void;
}) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const hoveredZone = hovered
        ? ZONES.find((item) => item.id === hovered)
        : null;
    const anilloHover = useMemo(() => {
        const ring = new THREE.RingGeometry(2.95, 3.2, 64);

        ring.rotateX(-Math.PI / 2);
        ring.translate(0, 0.18, 0);

        return ring;
    }, []);
    const geometry = useMemo(() => {
        const cylinder = new THREE.CylinderGeometry(1.2, 1.55, 6, 32, 1, true);
        cylinder.translate(0, 3, 0);

        const ring = new THREE.RingGeometry(2.4, 2.8, 48);
        ring.rotateX(-Math.PI / 2);
        ring.translate(0, 0.16, 0);

        const cone = new THREE.ConeGeometry(0.85, 1.7, 4);
        cone.rotateX(Math.PI);
        cone.translate(0, 7.5, 0);

        return (
            mergeGeometries([cylinder, ring, cone], false) ??
            new THREE.BufferGeometry()
        );
    }, []);

    useFrame(() => {
        ZONES.forEach((zone, index) => {
            const active = selected === zone.id || hovered === zone.id;
            const pulsoActivo =
                pulso?.id === zone.id
                    ? Math.max(0, 1 - (performance.now() - pulso.inicio) / 600)
                    : 0;

            dummy.position.set(zone.x, active ? 0.1 : 0, zone.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.setScalar((active ? 1.12 : 1) + pulsoActivo * 0.18);
            dummy.updateMatrix();
            mesh.current?.setMatrixAt(index, dummy.matrix);
        });

        if (mesh.current) {
            mesh.current.instanceMatrix.needsUpdate = true;
        }
    });

    const handlers = {
        onClick: (event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();

            if (event.instanceId !== undefined) {
                const zone = ZONES[event.instanceId];

                if (zone) {
                    onSelect(zone.id);
                }
            }
        },
        onPointerOver: (event: ThreeEvent<MouseEvent>) => {
            document.body.style.cursor = 'pointer';

            if (event.instanceId !== undefined) {
                const zone = ZONES[event.instanceId];

                if (zone) {
                    onHover(zone.id);

                    if (isFigure(zone.id)) {
                        void loadFigure(zone.id);
                    }
                }
            }
        },
        onPointerOut: () => {
            document.body.style.cursor = '';
            onHover(null);
        },
    };

    return (
        <>
            <instancedMesh
                ref={mesh}
                args={[geometry, undefined, ZONES.length]}
                {...handlers}
            >
                <meshBasicMaterial
                    color={SITE.mint}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                    toneMapped={false}
                />
            </instancedMesh>
            {hoveredZone && (
                <mesh
                    geometry={anilloHover}
                    position={[hoveredZone.x, 0, hoveredZone.z]}
                    renderOrder={12}
                >
                    <meshBasicMaterial
                        color={SITE.mint}
                        transparent
                        opacity={0.95}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            )}
        </>
    );
}

function CameraRig({ focus }: { focus: ZoneId | null }) {
    const { camera, gl } = useThree();
    const state = useRef({
        az: (20 * Math.PI) / 180,
        el: (34 * Math.PI) / 180,
        dist: 120,
        dragging: false,
        px: 0,
        py: 0,
        parX: 0,
        parY: 0,
        target: new THREE.Vector3(0, 0, 0),
    });
    const desiredPosition = useRef(new THREE.Vector3(34, 67, 94));
    const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
    const desiredDist = useRef(132);

    useEffect(() => {
        const preset = focus ? FOCUS[focus] : null;
        desiredTarget.current.set(
            preset?.x ?? 0,
            preset?.y ?? 0,
            preset?.z ?? 0,
        );
        desiredDist.current = preset?.dist ?? 132;
    }, [focus]);

    useEffect(() => {
        const dom = gl.domElement;
        const clamp = (value: number, min: number, max: number) =>
            Math.min(max, Math.max(min, value));

        const onDown = (event: PointerEvent) => {
            state.current.dragging = true;
            state.current.px = event.clientX;
            state.current.py = event.clientY;
        };
        const onUp = () => {
            state.current.dragging = false;
        };
        const onMove = (event: PointerEvent) => {
            if (state.current.dragging) {
                const dx = event.clientX - state.current.px;
                const dy = event.clientY - state.current.py;
                state.current.az = clamp(
                    state.current.az + dx * 0.002,
                    (12 * Math.PI) / 180,
                    (28 * Math.PI) / 180,
                );
                state.current.el = clamp(
                    state.current.el - dy * 0.002,
                    (30 * Math.PI) / 180,
                    (40 * Math.PI) / 180,
                );
                state.current.px = event.clientX;
                state.current.py = event.clientY;
            } else {
                const rect = dom.getBoundingClientRect();
                state.current.parX =
                    ((event.clientX - rect.left) / rect.width) * 2 - 1;
                state.current.parY =
                    ((event.clientY - rect.top) / rect.height) * 2 - 1;
            }
        };
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            desiredDist.current = clamp(
                desiredDist.current + event.deltaY * 0.05,
                28,
                160,
            );
        };

        dom.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        dom.addEventListener('pointermove', onMove);
        dom.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            dom.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            dom.removeEventListener('pointermove', onMove);
            dom.removeEventListener('wheel', onWheel);
        };
    }, [gl]);

    useFrame(() => {
        state.current.target.lerp(desiredTarget.current, 0.08);
        state.current.dist += (desiredDist.current - state.current.dist) * 0.08;

        const { az, el, dist, parX, parY, target } = state.current;
        const azP = az + parX * ((1.2 * Math.PI) / 180);
        const elP = el - parY * ((1.2 * Math.PI) / 180);

        desiredPosition.current.set(
            target.x + dist * Math.cos(elP) * Math.sin(azP),
            target.y + dist * Math.sin(elP),
            target.z + dist * Math.cos(elP) * Math.cos(azP),
        );

        camera.position.lerp(desiredPosition.current, 0.12);
        camera.lookAt(target);
    });

    return null;
}
function StatsBridge({ onReady }: { onReady: () => void }) {
    const { gl, scene } = useThree();
    const frames = useRef(0);

    const last = useRef(performance.now());
    const announced = useRef(false);

    useFrame(() => {
        frames.current += 1;

        if (!announced.current) {
            announced.current = true;
            onReady();
        }

        const now = performance.now();

        if (now - last.current > 1000) {
            let meshes = 0;
            let sourceTriangles = 0;

            scene.traverse((object) => {
                const mesh = object as THREE.Mesh;

                if (mesh.isMesh && mesh.geometry) {
                    meshes += 1;
                    const index = mesh.geometry.index;
                    const position = mesh.geometry.attributes.position;
                    sourceTriangles += index
                        ? index.count / 3
                        : (position?.count ?? 0) / 3;
                }
            });

            const stats = {
                fps: Math.round((frames.current * 1000) / (now - last.current)),
                calls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
                meshes,
                sourceTriangles: Math.round(sourceTriangles),
            };

            window.__hubStats = stats;
            document
                .querySelector('.hub-screen')
                ?.setAttribute('data-stats', JSON.stringify(stats));
            frames.current = 0;
            last.current = now;
        }
    });

    return null;
}

const CAPAS_FOCO: Partial<Record<ZoneId, [number, number][]>> = {
    obra: [
        [-8, 20],
        [2, -20],
        [14, 25],
    ],
    materiales: [
        [-20, 22],
        [14, 25],
        [27, -8],
    ],
};

function CapasFoco({ focus }: { focus: ZoneId | null }) {
    const malla = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const puntos = focus ? (CAPAS_FOCO[focus] ?? []) : [];
    const geometria = useMemo(() => {
        const anillo = new THREE.RingGeometry(1.3, 1.55, 40);

        anillo.rotateX(-Math.PI / 2);

        return anillo;
    }, []);

    useFrame(() => {
        if (!malla.current) {
            return;
        }

        for (let indice = 0; indice < 3; indice += 1) {
            const punto = puntos[indice] ?? [0, 0];

            dummy.position.set(punto[0], 0.2, punto[1]);
            dummy.scale.setScalar(puntos[indice] ? 1 : 0);
            dummy.updateMatrix();
            malla.current.setMatrixAt(indice, dummy.matrix);
        }

        malla.current.instanceMatrix.needsUpdate = true;
    });

    if (puntos.length === 0) {
        return null;
    }

    return (
        <instancedMesh
            ref={malla}
            args={[geometria, undefined, 3]}
            frustumCulled={false}
        >
            <meshBasicMaterial
                color={SITE.mint}
                transparent
                opacity={0.82}
                depthWrite={false}
                toneMapped={false}
            />
        </instancedMesh>
    );
}

function CapaGeo({ visible }: { visible: boolean }) {
    const geometria = useMemo(() => {
        const posiciones: number[] = [];
        const colores: number[] = [];
        const ruta: [number, number][] = [
            [39, 8],
            [37, 8],
            [34, 2],
            [34, -12],
            [24, 30],
        ];
        const azul = new THREE.Color('#7dd3fc');
        const verde = new THREE.Color('#6ee7b7');

        for (let indice = 0; indice < ruta.length - 1; indice += 1) {
            const [ax, az] = ruta[indice];
            const [bx, bz] = ruta[indice + 1];

            posiciones.push(ax, 0.24, az, bx, 0.24, bz);
            colores.push(azul.r, azul.g, azul.b, azul.r, azul.g, azul.b);
        }

        const centroX = 37;
        const centroZ = 8;
        const radio = 5.15;
        const pasos = 64;

        for (let paso = 0; paso < pasos; paso += 1) {
            const a = (paso / pasos) * Math.PI * 2;
            const b = ((paso + 1) / pasos) * Math.PI * 2;

            posiciones.push(
                centroX + Math.cos(a) * radio,
                0.22,
                centroZ + Math.sin(a) * radio,
                centroX + Math.cos(b) * radio,
                0.22,
                centroZ + Math.sin(b) * radio,
            );
            colores.push(verde.r, verde.g, verde.b, verde.r, verde.g, verde.b);
        }

        const resultado = new THREE.BufferGeometry();

        resultado.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(posiciones, 3),
        );
        resultado.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colores, 3),
        );

        return resultado;
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <lineSegments geometry={geometria} renderOrder={10}>
            <lineBasicMaterial
                vertexColors
                transparent
                opacity={0.9}
                depthWrite={false}
                toneMapped={false}
            />
        </lineSegments>
    );
}

function Sombras() {
    const malla = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const geometria = useMemo(() => {
        const disco = new THREE.CircleGeometry(1, 20);

        disco.rotateX(-Math.PI / 2);

        return disco;
    }, []);

    useFrame(() => {
        if (!malla.current) {
            return;
        }

        let indice = 0;

        for (const vehiculo of MOVILES_ESTADO) {
            dummy.position.set(vehiculo.x, 0.075, vehiculo.z);
            dummy.scale.setScalar(vehiculo.radio > 4 ? 1.55 : 1.15);
            dummy.updateMatrix();
            malla.current.setMatrixAt(indice, dummy.matrix);
            indice += 1;
        }

        for (const trabajador of TRABAJADORES_POSICIONES) {
            dummy.position.set(trabajador.x, 0.072, trabajador.z);
            dummy.scale.setScalar(0.46);
            dummy.updateMatrix();
            malla.current.setMatrixAt(indice, dummy.matrix);
            indice += 1;
        }

        for (; indice < 24; indice += 1) {
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            malla.current.setMatrixAt(indice, dummy.matrix);
        }

        malla.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={malla}
            args={[geometria, undefined, 24]}
            frustumCulled={false}
        >
            <meshBasicMaterial
                color="#1f1b16"
                transparent
                opacity={0.22}
                depthWrite={false}
            />
        </instancedMesh>
    );
}

function DebugRutas({ visible }: { visible: boolean }) {
    const geometria = useMemo(() => {
        const posiciones: number[] = [];
        const colores: number[] = [];
        const color = new THREE.Color();
        const agregar = (
            ax: number,
            az: number,
            bx: number,
            bz: number,
            hex: string,
            y = 0.22,
        ): void => {
            color.set(hex);
            posiciones.push(ax, y, az, bx, y, bz);
            colores.push(color.r, color.g, color.b, color.r, color.g, color.b);
        };
        const agregarRuta = (puntos: [number, number][], hex: string): void => {
            const curva = new THREE.CatmullRomCurve3(
                puntos.map(([x, z]) => new THREE.Vector3(x, 0, z)),
                true,
                'centripetal',
            );
            const muestras = curva.getSpacedPoints(72);

            for (let indice = 0; indice < muestras.length; indice += 1) {
                const a = muestras[indice];
                const b = muestras[(indice + 1) % muestras.length];

                agregar(a.x, a.z, b.x, b.z, hex, 0.32);
            }
        };

        for (const config of MOVILES_CONFIG) {
            if (config.ruta) {
                agregarRuta(config.ruta.puntos, '#ffb347');
            }
        }

        for (const RUTAS of [RUTAS_KIT, RUTAS_NORMALES, RUTAS_CHALECO]) {
            for (const ruta of RUTAS) {
                agregarRuta(rutaPeatonalSegura(ruta.puntos), '#7dd3fc');
            }
        }

        for (const huella of HUELLAS) {
            if (huella.tipo === 'rect') {
                const minX = huella.x - (huella.ancho ?? 0) / 2;
                const maxX = huella.x + (huella.ancho ?? 0) / 2;
                const minZ = huella.z - (huella.largo ?? 0) / 2;
                const maxZ = huella.z + (huella.largo ?? 0) / 2;

                agregar(minX, minZ, maxX, minZ, '#ff5a4e');
                agregar(maxX, minZ, maxX, maxZ, '#ff5a4e');
                agregar(maxX, maxZ, minX, maxZ, '#ff5a4e');
                agregar(minX, maxZ, minX, minZ, '#ff5a4e');
            } else {
                const pasos = 24;

                for (let paso = 0; paso < pasos; paso += 1) {
                    const a = (paso / pasos) * Math.PI * 2;
                    const b = ((paso + 1) / pasos) * Math.PI * 2;
                    const radio = huella.radio ?? 0;

                    agregar(
                        huella.x + Math.cos(a) * radio,
                        huella.z + Math.sin(a) * radio,
                        huella.x + Math.cos(b) * radio,
                        huella.z + Math.sin(b) * radio,
                        '#ff5a4e',
                    );
                }
            }
        }

        for (const config of MOVILES_CONFIG) {
            if (!config.ruta || !config.ancho || !config.largo) {
                continue;
            }

            const curva = new THREE.CatmullRomCurve3(
                config.ruta.puntos.map(([x, z]) => new THREE.Vector3(x, 0, z)),
                true,
                'centripetal',
            );
            const muestras = curva.getSpacedPoints(120);
            let tCurva = 0;
            let mayorGiro = 0;

            for (let indice = 0; indice < muestras.length; indice += 1) {
                const t = indice / muestras.length;
                const tangenteA = curva.getTangentAt(t);
                const tangenteB = curva.getTangentAt(
                    (indice + 1) / muestras.length,
                );
                const giro = Math.abs(
                    Math.atan2(tangenteB.x, tangenteB.z) -
                        Math.atan2(tangenteA.x, tangenteA.z),
                );

                if (giro > mayorGiro) {
                    mayorGiro = giro;
                    tCurva = t;
                }
            }

            const parada = config.ruta.paradas[0]?.en ?? 0.5;
            const posicionesHuella = [
                { t: 0, largo: config.largo },
                {
                    t: parada,
                    largo: config.largoAccion ?? config.largo,
                },
                { t: tCurva, largo: config.largo },
            ];

            for (const posicion of posicionesHuella) {
                const punto = curva.getPointAt(posicion.t);
                const tangente = curva.getTangentAt(posicion.t);
                const giro = Math.atan2(tangente.x, tangente.z);
                const caja = esquinasVehiculo(
                    punto.x,
                    punto.z,
                    posicion.largo,
                    config.ancho,
                    giro,
                );

                for (let indice = 0; indice < 4; indice += 1) {
                    const a = caja[indice];
                    const b = caja[(indice + 1) % 4];

                    agregar(a[0], a[1], b[0], b[1], '#ff2dd4', 0.42);
                }
            }
        }

        const resultado = new THREE.BufferGeometry();

        resultado.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(posiciones, 3),
        );
        resultado.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colores, 3),
        );

        return resultado;
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <lineSegments
            geometry={geometria}
            frustumCulled={false}
            renderOrder={999}
        >
            <lineBasicMaterial
                vertexColors
                depthTest={false}
                transparent
                opacity={0.95}
            />
        </lineSegments>
    );
}

function Scene({
    selected,
    focus,
    reducedMotion,
    modoLuz,
    frente,
    capas,
    onSelect,
    onReady,
}: {
    selected: ZoneId | null;
    focus: ZoneId | null;
    reducedMotion: boolean;
    modoLuz: ModoLuz;
    frente: number;
    capas: boolean;
    onSelect: (id: ZoneId) => void;
    onReady: () => void;
}) {
    const gl = useThree((state) => state.gl);
    const [visible, setVisible] = useState(true);
    const [tabVisible, setTabVisible] = useState(true);
    const [debugRutas, setDebugRutas] = useState(false);
    const [hovered, setHovered] = useState<ZoneId | null>(null);
    const [pulso, setPulso] = useState<{
        id: ZoneId;
        inicio: number;
    } | null>(null);

    useEffect(() => {
        const alTeclear = (evento: KeyboardEvent): void => {
            if (
                evento.key.toLowerCase() !== 'd' ||
                evento.ctrlKey ||
                evento.metaKey ||
                evento.altKey
            ) {
                return;
            }

            const objetivo =
                evento.target instanceof HTMLElement ? evento.target : null;

            if (
                objetivo?.closest(
                    'input, textarea, select, [contenteditable="true"]',
                )
            ) {
                return;
            }

            setDebugRutas((valor) => !valor);
        };

        window.addEventListener('keydown', alTeclear);

        return () => window.removeEventListener('keydown', alTeclear);
    }, []);

    useEffect(() => {
        const alCambiarVisibilidad = (): void => {
            setTabVisible(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', alCambiarVisibilidad);

        return () =>
            document.removeEventListener(
                'visibilitychange',
                alCambiarVisibilidad,
            );
    }, []);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observador = new IntersectionObserver(
            ([entrada]) => {
                setVisible(entrada.isIntersecting);
            },
            { threshold: 0.01 },
        );

        observador.observe(gl.domElement);

        return () => observador.disconnect();
    }, [gl]);

    const activo = visible && tabVisible && !reducedMotion;
    const seleccionar = (id: ZoneId): void => {
        setPulso({ id, inicio: performance.now() });
        onSelect(id);
    };

    return (
        <>
            <Ambiente
                activo={activo}
                reducedMotion={reducedMotion}
                modoLuz={modoLuz}
                frente={frente}
            />

            <Suspense fallback={null}>
                <StaticSite />
                <StaticProps />
                <ParqueMovil
                    activo={activo}
                    hovered={hovered}
                    onSelect={seleccionar}
                    onHover={setHovered}
                />
                <Trabajadores activo={activo} />

                <Hotspots
                    selected={selected}
                    hovered={hovered}
                    pulso={pulso}
                    onSelect={seleccionar}
                    onHover={setHovered}
                />

                <StatsBridge onReady={onReady} />
            </Suspense>

            <CameraRig focus={focus} />
            <Sombras />
            <CapasFoco focus={capas ? focus : null} />
            <CapaGeo visible={capas && focus === 'geo'} />
            <DebugRutas visible={debugRutas} />
        </>
    );
}

const FIGURE_IDS = Object.keys(FIGURE_META) as FigureId[];

const isFigure = (id: ZoneId | null): id is FigureId =>
    id !== null && (FIGURE_IDS as string[]).includes(id);

function FigureStage({ zone, onClose }: { zone: Zone; onClose: () => void }) {
    const id = zone.id as FigureId;
    const [markup, setMarkup] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const artRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let alive = true;
        setMarkup(null);
        setFailed(false);
        loadFigure(id)
            .then((svg) => {
                if (alive) {
                    setMarkup(svg);
                }
            })
            .catch(() => {
                if (alive) {
                    setFailed(true);
                }
            });

        return () => {
            alive = false;
        };
    }, [id]);

    useEffect(() => {
        if (!markup || !artRef.current) {
            return;
        }

        for (const animation of artRef.current.getAnimations({
            subtree: true,
        })) {
            if (
                animation instanceof CSSAnimation &&
                animation.animationName === 'fig-assemble'
            ) {
                continue;
            }

            const timing = animation.effect?.getTiming();
            const duration =
                typeof timing?.duration === 'number' ? timing.duration : 0;

            if (duration > 0) {
                animation.currentTime = duration * 0.35;
            }
        }
    }, [markup]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return (
        <div
            className="figure-stage"
            role="img"
            aria-label={`Figura isométrica de ${zone.title}. La explicación completa está en el panel de detalle.`}
        >
            {markup && (
                <div
                    ref={artRef}
                    className="figure-art figura-iso"
                    dangerouslySetInnerHTML={{ __html: markup }}
                />
            )}
            {!markup && (
                <p className="figure-fallback">
                    {failed
                        ? 'No se pudo cargar la figura. La explicación del proceso sigue en el panel.'
                        : 'Cargando la figura…'}
                </p>
            )}
        </div>
    );
}

function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');

        return Boolean(
            canvas.getContext('webgl2') ??
            canvas.getContext('webgl') ??
            canvas.getContext('experimental-webgl'),
        );
    } catch {
        return false;
    }
}

function App() {
    const [selected, setSelected] = useState<ZoneId | null>(null);
    const [focus, setFocus] = useState<ZoneId | null>(null);
    const [ready, setReady] = useState(false);
    const [webgl] = useState(() => supportsWebGL());
    const [reducedMotion] = useState(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const [modoLuz, setModoLuz] = useState<ModoLuz>('ciclo');
    const [frente, setFrente] = useState<FrenteEstado>(() => {
        try {
            return parseFrente(
                window.sessionStorage.getItem(FRENTE_STORAGE_KEY),
            );
        } catch {
            return parseFrente(null);
        }
    });
    const zone =
        ZONES.find((item) => item.id === (focus ?? selected ?? 'pmu')) ??
        ZONES[0];
    const figureId = isFigure(focus) ? focus : null;
    const capas = focus !== null && !isFigure(focus);

    useEffect(() => {
        try {
            window.sessionStorage.setItem(
                FRENTE_STORAGE_KEY,
                serializeFrente(frente),
            );
        } catch {
            // sessionStorage puede estar bloqueado por privacidad.
        }
    }, [frente]);

    const registrarFrente = useCallback((id: ZoneId) => {
        setFrente((actual) => registrarVisita(actual, id));
    }, []);

    useEffect(() => {
        const syncFromHash = () => {
            const fromHash = leerZonaHash(window.location.hash);

            setSelected(fromHash);
            setFocus(fromHash);

            if (fromHash) {
                registrarFrente(fromHash);
            }
        };

        syncFromHash();
        window.addEventListener('popstate', syncFromHash);
        window.addEventListener('hashchange', syncFromHash);

        return () => {
            window.removeEventListener('popstate', syncFromHash);
            window.removeEventListener('hashchange', syncFromHash);
        };
    }, [registrarFrente]);

    const select = useCallback(
        (id: ZoneId) => {
            setSelected(id);
            setFocus(id);
            registrarFrente(id);

            if (window.location.hash !== `#${id}`) {
                window.history.pushState({ zone: id }, '', `#${id}`);
            }
        },
        [registrarFrente],
    );

    const close = useCallback(() => {
        setFocus(null);

        if (window.location.hash) {
            window.history.pushState(
                { zone: null },
                '',
                `${window.location.pathname}${window.location.search}`,
            );
        }
    }, []);

    useEffect(() => {
        const alCerrar = (evento: KeyboardEvent): void => {
            if (evento.key === 'Escape' && focus) {
                close();
            }
        };

        window.addEventListener('keydown', alCerrar);

        return () => window.removeEventListener('keydown', alCerrar);
    }, [focus, close]);

    return (
        <div className={`hub-screen${focus ? ' is-focused' : ''}`}>
            <div className="hub-copy">
                <p className="eyebrow">
                    <span className="mint-tag">CÓMO TRABAJAMOS</span>
                </p>
                <h1>
                    UNA OBRA.
                    <br />
                    SEIS DECISIONES.
                    <br />
                    TODO CONECTADO.
                </h1>
                <p>Explora la obra y haz click en cada objeto.</p>
            </div>

            <div
                className="hub-canvas"
                role="img"
                aria-label="Maqueta isométrica de la obra. Los seis destinos también se pueden abrir desde la lista de Destinos."
            >
                {webgl ? (
                    <Canvas
                        camera={{
                            fov: 30,
                            position: [34, 67, 94],
                            near: 1,
                            far: 500,
                        }}
                        dpr={[1, 2]}
                        frameloop="always"
                        gl={{ antialias: true }}
                    >
                        <Scene
                            selected={selected}
                            focus={focus}
                            onSelect={select}
                            onReady={() => setReady(true)}
                            reducedMotion={reducedMotion}
                            modoLuz={modoLuz}
                            frente={frente.etapa}
                            capas={capas}
                        />
                    </Canvas>
                ) : (
                    <img
                        className="hub-fallback"
                        src="/assets/vitrina/hub-poster.svg"
                        alt="Vista isométrica fija de la obra con los seis puntos de interés."
                    />
                )}
            </div>

            {!focus && (
                <aside
                    className="hub-panel"
                    aria-label="Destinos de la maqueta"
                >
                    {!webgl && (
                        <p className="hub-fallback-note" role="status">
                            Tu navegador no puede mostrar la maqueta 3D. Abre
                            cada proceso desde esta lista.
                        </p>
                    )}
                    <p className="mono-label">Destinos</p>
                    <div className="hub-zones">
                        {ZONES.map((item) => (
                            <a
                                key={item.id}
                                className={`hub-zone${item.id === selected ? ' is-active' : ''}`}
                                href={`#${item.id}`}
                                aria-current={
                                    item.id === selected ? 'true' : undefined
                                }
                                onClick={(event) => {
                                    event.preventDefault();
                                    select(item.id);
                                }}
                                onPointerEnter={() => {
                                    if (isFigure(item.id)) {
                                        void loadFigure(item.id);
                                    }
                                }}
                            >
                                <span>{item.title}</span>
                                <code>#{item.id}</code>
                            </a>
                        ))}
                    </div>
                    <a className="hub-cta" href="/#contacto">
                        Conversemos <span aria-hidden="true">↗</span>
                    </a>
                </aside>
            )}

            {focus && (
                <div
                    className={`detail-layout${figureId ? '' : ' detail-layout--scene'}`}
                >
                    {figureId && <FigureStage zone={zone} onClose={close} />}
                    <aside
                        className="detail-card"
                        aria-label={`Detalle de ${zone.title}`}
                    >
                        <div className="detail-card-body">
                            <button
                                type="button"
                                className="hub-back"
                                onClick={close}
                                autoFocus
                            >
                                ← Volver a la obra
                            </button>
                            <h3>{zone.title}</h3>
                            <p className="detail-copy">{zone.copy}</p>
                            {zone.id === 'pmi' && (
                                <div
                                    className="detail-progress"
                                    aria-label="Avance del frente"
                                >
                                    <div className="detail-progress-head">
                                        <span>Avance del frente</span>
                                        <strong>
                                            {frente.etapa}/
                                            {ETAPAS_FRENTE.length}
                                        </strong>
                                    </div>
                                    <div
                                        className="detail-progress-track"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={ETAPAS_FRENTE.length}
                                        aria-valuenow={frente.etapa}
                                    >
                                        <span
                                            style={{
                                                width: `${(frente.etapa / ETAPAS_FRENTE.length) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <ol className="detail-progress-steps">
                                        {ETAPAS_FRENTE.map((etapa, indice) => (
                                            <li
                                                key={etapa}
                                                className={
                                                    indice < frente.etapa
                                                        ? 'is-done'
                                                        : undefined
                                                }
                                            >
                                                {etapa}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                            <ul className="hub-detail-list">
                                {zone.details.map((detail) => (
                                    <li
                                        className="hub-detail-item"
                                        key={detail.title}
                                    >
                                        <span
                                            className="hub-detail-icon"
                                            aria-hidden="true"
                                        >
                                            <DetailIcon name={detail.icon} />
                                        </span>
                                        <div>
                                            <strong>{detail.title}</strong>
                                            <p>{detail.text}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="detail-implementation">
                                <span className="detail-implementation-label">
                                    Cómo lo implementamos
                                </span>
                                <p>{zone.implementation}</p>
                            </div>
                        </div>
                        <div className="detail-actions">
                            <a className="hub-cta" href="/#contacto">
                                Conversemos <span aria-hidden="true">↗</span>
                            </a>
                            <a className="detail-secondary" href="/registro">
                                Solicitar acceso
                            </a>
                            <button
                                type="button"
                                className="detail-print"
                                onClick={() => window.print()}
                            >
                                Imprimir este detalle
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            <section className="print-summary" aria-label="Resumen imprimible">
                <h2>Cómo trabajamos: una obra, seis decisiones</h2>
                {ZONES.map((item) => (
                    <article key={item.id}>
                        <h3>{item.title}</h3>
                        <p>{item.copy}</p>
                        <ul>
                            {item.details.map((detail) => (
                                <li key={detail.title}>
                                    <strong>{detail.title}.</strong>{' '}
                                    {detail.text}
                                </li>
                            ))}
                        </ul>
                        <p>
                            <strong>Cómo lo implementamos.</strong>{' '}
                            {item.implementation}
                        </p>
                    </article>
                ))}
            </section>

            <div className="hub-bottom">
                <div className="hub-hint">
                    {webgl
                        ? 'Click en un objeto · arrastra para orbitar'
                        : 'Elige un destino en la lista'}
                </div>

                {webgl && (
                    <div
                        className="hub-light-modes"
                        role="group"
                        aria-label="Ciclo de luz"
                    >
                        {MODOS_LUZ.map((modo) => (
                            <button
                                key={modo.id}
                                type="button"
                                className={`hub-light-mode${modoLuz === modo.id ? ' is-active' : ''}`}
                                aria-pressed={modoLuz === modo.id}
                                onClick={() => setModoLuz(modo.id)}
                                title={`Ver ${modo.label.toLowerCase()}`}
                            >
                                <IconoModoLuz modo={modo.id} />
                                <span>{modo.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {webgl && (
                <img
                    className="hub-poster"
                    src="/assets/vitrina/hub-poster.svg"
                    alt=""
                    style={{ opacity: ready ? 0 : 1 }}
                />
            )}

            {webgl && !ready && (
                <div className="hub-loading">Cargando la obra</div>
            )}
        </div>
    );
}
const container = document.getElementById('como-trabajamos-app');

if (container) {
    createRoot(container).render(<App />);
}
