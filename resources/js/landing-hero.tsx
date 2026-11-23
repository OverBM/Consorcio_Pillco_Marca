import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import '../css/landing-hero.css';
import {
    HERO_EMISIVAS,
    HERO_GRUA,
    HERO_GRUA_PIVOTE,
    HERO_OPACAS,
    HERO_TRANSPARENTES,
    type HeroPieza,
} from './features/landing/hero-edificio';

interface ProgresoRef {
    current: number;
}

const MATERIAL_OPACO = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
});
const MATERIAL_EMISIVO = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    toneMapped: false,
});
const MATERIAL_TRANSPARENTE = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.6,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
});

function smoothstep(valor: number): number {
    const t = Math.min(1, Math.max(0, valor));

    return t * t * (3 - 2 * t);
}

function retrasoDe(pieza: HeroPieza): number {
    return Math.min(0.68, (pieza.p[1] / 7.2) * 0.58);
}

function asignarColores(
    malla: THREE.InstancedMesh | null,
    piezas: HeroPieza[],
): void {
    if (!malla) {
        return;
    }

    const color = new THREE.Color();

    piezas.forEach((pieza, indice) => {
        color.setRGB(pieza.c[0], pieza.c[1], pieza.c[2], THREE.SRGBColorSpace);
        malla.setColorAt(indice, color);
    });

    if (malla.instanceColor) {
        malla.instanceColor.needsUpdate = true;
    }
}

function GrupoEdificio({
    piezas,
    material,
    progreso,
    desplazar,
}: {
    piezas: HeroPieza[];
    material: THREE.Material;
    progreso: ProgresoRef;
    desplazar: number;
}) {
    const malla = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame(() => {
        const mallaActual = malla.current;

        if (!mallaActual) {
            return;
        }

        piezas.forEach((pieza, indice) => {
            const t = smoothstep((progreso.current - retrasoDe(pieza)) / 0.22);
            const separacion = 1 - t;
            const ex =
                pieza.p[0] * 0.55 + Math.sign(pieza.p[0] || 1) * desplazar;
            const ez =
                pieza.p[2] * 0.55 + Math.sign(pieza.p[2] || 1) * desplazar;
            const ey = 0.8 + pieza.p[1] * 0.14;

            dummy.position.set(
                pieza.p[0] + ex * separacion,
                pieza.p[1] + ey * separacion,
                pieza.p[2] + ez * separacion,
            );
            dummy.quaternion.set(
                pieza.q[0],
                pieza.q[1],
                pieza.q[2],
                pieza.q[3],
            );
            dummy.scale.set(pieza.s[0], pieza.s[1], pieza.s[2]);
            dummy.updateMatrix();
            mallaActual.setMatrixAt(indice, dummy.matrix);
        });

        mallaActual.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={(elemento) => {
                malla.current = elemento;
                asignarColores(elemento, piezas);
            }}
            args={[undefined, undefined, piezas.length]}
            material={material}
            frustumCulled={false}
        >
            <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
    );
}

function Edificio({
    progreso,
    objetivo,
}: {
    progreso: ProgresoRef;
    objetivo: ProgresoRef;
}) {
    const grupo = useRef<THREE.Group>(null);
    const grua = useRef<THREE.Group>(null);
    const inicio = useRef(performance.now());
    const introduccion = useRef(true);

    useFrame(({ clock }, delta) => {
        const ahora = performance.now();
        const t = Math.min(1, (ahora - inicio.current) / 2400);

        if (introduccion.current) {
            progreso.current = Math.min(smoothstep(t), objetivo.current);

            if (t >= 1) {
                introduccion.current = false;
            }
        } else {
            progreso.current +=
                (objetivo.current - progreso.current) *
                (1 - Math.exp(-delta * 9));
        }

        if (grupo.current) {
            const tiempo = clock.elapsedTime;
            grupo.current.rotation.y = Math.sin(tiempo * 0.28) * 0.065;
            grupo.current.position.y = Math.sin(tiempo * 0.75) * 0.02;
        }

        if (grua.current) {
            grua.current.rotation.y =
                0.55 + Math.sin(clock.elapsedTime * 0.22) * 0.55;
        }

        MATERIAL_EMISIVO.color.setScalar(
            0.88 + Math.sin(clock.elapsedTime * 1.4) * 0.08,
        );
        MATERIAL_TRANSPARENTE.opacity =
            0.3 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
    });

    return (
        <group ref={grupo}>
            <GrupoEdificio
                piezas={HERO_OPACAS}
                material={MATERIAL_OPACO}
                progreso={progreso}
                desplazar={0.35}
            />
            <GrupoEdificio
                piezas={HERO_EMISIVAS}
                material={MATERIAL_EMISIVO}
                progreso={progreso}
                desplazar={0.28}
            />
            <GrupoEdificio
                piezas={HERO_TRANSPARENTES}
                material={MATERIAL_TRANSPARENTE}
                progreso={progreso}
                desplazar={0.5}
            />
            <group
                ref={grua}
                position={HERO_GRUA_PIVOTE}
                rotation={[0, 0.55, 0]}
            >
                <GrupoEdificio
                    piezas={HERO_GRUA}
                    material={MATERIAL_OPACO}
                    progreso={progreso}
                    desplazar={0.25}
                />
            </group>
        </group>
    );
}

function Sombra() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[2.9, 48]} />
            <meshBasicMaterial
                color="#c6c6c6"
                transparent
                opacity={0.5}
                depthWrite={false}
            />
        </mesh>
    );
}

function Vista() {
    const { camera } = useThree();

    useEffect(() => {
        camera.lookAt(0, 3.2, 0);
    }, [camera]);

    return null;
}

function StatsHero() {
    const { gl } = useThree();
    const frames = useRef(0);
    const ultimo = useRef(performance.now());

    useFrame(() => {
        frames.current += 1;
        const ahora = performance.now();

        if (ahora - ultimo.current > 1000) {
            (
                window as unknown as {
                    __heroStats?: {
                        fps: number;
                        calls: number;
                        triangles: number;
                    };
                }
            ).__heroStats = {
                fps: Math.round(
                    (frames.current * 1000) / (ahora - ultimo.current),
                ),
                calls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
            };
            frames.current = 0;
            ultimo.current = ahora;
        }
    });

    return null;
}

function Hero() {
    const [listo, setListo] = useState(false);
    const [activo, setActivo] = useState(true);
    const [estatico] = useState(() => {
        try {
            const canvas = document.createElement('canvas');

            return (
                !(
                    canvas.getContext('webgl2') ??
                    canvas.getContext('webgl') ??
                    canvas.getContext('experimental-webgl')
                ) ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches
            );
        } catch {
            return true;
        }
    });
    const stage = useRef<HTMLDivElement>(null);
    const progreso = useRef(0);
    const objetivo = useRef(1);
    const baseTop = useRef<number | null>(null);

    useEffect(() => {
        if (estatico) {
            return;
        }

        progreso.current = 0;

        const actualizar = (): void => {
            const rect = stage.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            if (baseTop.current === null) {
                baseTop.current = rect.top;
            }

            const fraccion = Math.min(
                1,
                Math.max(
                    0,
                    (baseTop.current - rect.top) /
                        Math.max(1, rect.height * 0.78),
                ),
            );

            objetivo.current = 1 - fraccion;
        };
        const reiniciar = (): void => {
            baseTop.current =
                stage.current?.getBoundingClientRect().top ?? null;
            actualizar();
        };

        const visibilidad = (): void => {
            setActivo(document.visibilityState === 'visible');
        };
        const observador = new IntersectionObserver(
            ([entrada]) => {
                setActivo(entrada.isIntersecting);
            },
            { threshold: 0.01 },
        );

        if (stage.current) {
            observador.observe(stage.current);
        }

        actualizar();
        window.addEventListener('scroll', actualizar, { passive: true });
        window.addEventListener('resize', reiniciar);
        document.addEventListener('visibilitychange', visibilidad);

        return () => {
            window.removeEventListener('scroll', actualizar);
            window.removeEventListener('resize', reiniciar);
            document.removeEventListener('visibilitychange', visibilidad);
            observador.disconnect();
        };
    }, [estatico]);

    useEffect(() => {
        stage.current
            ?.closest('.hero-art')
            ?.classList.toggle('is-ready', listo);
    }, [listo]);

    if (estatico) {
        return <div className="hero-stage" ref={stage} data-hero="static" />;
    }

    return (
        <div className="hero-stage" ref={stage}>
            <Canvas
                camera={{
                    fov: 38,
                    position: [6.8, 8.7, 7.3],
                    near: 0.1,
                    far: 80,
                }}
                dpr={[1, 2]}
                frameloop={activo ? 'always' : 'never'}
                gl={{ antialias: true, alpha: true }}
                onCreated={() => setListo(true)}
            >
                <Vista />
                <ambientLight intensity={1.18} />
                <hemisphereLight args={['#ffffff', '#d9d9d9', 0.6]} />
                <directionalLight position={[7, 12, 9]} intensity={2.2} />
                <directionalLight position={[-8, 6, -7]} intensity={0.65} />
                <Sombra />
                <Edificio progreso={progreso} objetivo={objetivo} />
                <StatsHero />
            </Canvas>
        </div>
    );
}

const contenedor = document.getElementById('landing-hero');

if (contenedor) {
    createRoot(contenedor).render(<Hero />);
}
