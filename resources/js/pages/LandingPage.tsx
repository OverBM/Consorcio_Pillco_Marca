import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    IconBrandMark,
    IconArrowRight,
    IconBuilding,
    IconBox,
    IconTruck,
    IconRepeat,
    IconShield,
    IconCheck,
    IconClose,
    IconTrendingUp,
    IconMapPin,
    IconInbox,
} from '@/components/icons/Icons';

export default function LandingPage() {
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        interest: 'inventario',
        message: '',
    });
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [copiedText, setCopiedText] = useState(false);

    const handleRolePreset = (roleId: string, roleEmail: string) => {
        setSelectedRole(roleId);
        setEmail(roleEmail);
        setPassword('password123');
    };

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitted(true);
    };

    const handleCopy = () => {
        const text = `Consulta de: ${contactForm.name} (${contactForm.email})\nInterés: ${contactForm.interest}\nMensaje: ${contactForm.message}`;
        void navigator.clipboard.writeText(text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);
    };

    return (
        <div className="min-h-screen bg-[#e5e5e5] text-[#000000] font-sans antialiased selection:bg-[#d1ffca] selection:text-[#000000]">
            <Head>
                <title>Consorcio Pillco Marca · Infraestructura e Inventarios Geolocalizados</title>
                <meta name="description" content="Diseño e implementación de sistema web geolocalizado para la optimización de inventarios multi-almacén en obras bajo el enfoque de PMI y PMU." />
            </Head>

            {/* Header / Barra de Navegación */}
            <header className="sticky top-0 z-40 bg-[#000000] text-white border-b border-[#222222]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <a href="#inicio" className="flex items-center gap-3 group">
                        <IconBrandMark size={38} />
                        <div className="flex flex-col">
                            <span className="font-mono text-[9px] text-[#888888] tracking-widest uppercase">Valle del Mantaro</span>
                            <span className="font-display text-lg tracking-wide uppercase text-white font-bold leading-none">
                                Consorcio Pillco Marca
                            </span>
                        </div>
                    </a>

                    <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-[#cccccc] uppercase tracking-wider">
                        <a href="#proyectos" className="hover:text-[#d1ffca] transition-colors">01 Proyectos</a>
                        <a href="#lineas" className="hover:text-[#d1ffca] transition-colors">02 Líneas</a>
                        <a href="#sistema" className="hover:text-[#d1ffca] transition-colors">03 Sistema Web</a>
                        <a href="#enfoque" className="hover:text-[#d1ffca] transition-colors">04 PMI + PMU</a>
                        <a href="#contacto" className="hover:text-[#d1ffca] transition-colors">05 Contacto</a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setLoginModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#d1ffca] text-black font-mono text-xs font-bold hover:bg-[#bbf7b3] transition-all cursor-pointer shadow-sm"
                        >
                            <span>Acceso Interno</span>
                            <IconArrowRight size={14} />
                        </button>
                        <Link
                            href="/panel"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-white border border-[#333333] font-mono text-xs font-medium hover:bg-[#262626] transition-all"
                        >
                            <span>Dashboard</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="relative bg-[#000000] text-white pt-16 pb-20 border-b border-[#222222] overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Eyebrow */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-2.5 py-0.5 rounded bg-[#d1ffca] text-black text-[10px] font-mono font-black uppercase tracking-wider">
                            VALLE DEL MANTARO · JUNÍN
                        </span>
                        <span className="text-[11px] font-mono text-[#888888] uppercase tracking-widest">
                            GESTIÓN MULTI-OBRA CPM
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-8 space-y-6">
                            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold uppercase tracking-tight leading-[0.95] text-white">
                                CONSTRUIMOS INFRAESTRUCTURA.<br />
                                <span className="text-[#d1ffca]">OPTIMIZAMOS</span> CADA RECURSO.
                            </h1>
                            <p className="text-sm sm:text-base text-[#aaaaaa] max-w-2xl font-normal leading-relaxed">
                                Diseño e implementación de un sistema web geolocalizado para el control y redistribución de inventarios multi-almacén en obras de construcción bajo el marco metodológico de <strong>PMI</strong> y <strong>PMU</strong>.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-4">
                                <Link
                                    href="/panel"
                                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#d1ffca] text-black font-display text-lg font-bold uppercase tracking-wider hover:bg-[#bbf7b3] transition-all shadow-md"
                                >
                                    <span>Ingresar al Sistema</span>
                                    <IconArrowRight size={18} />
                                </Link>
                                <a
                                    href="#sistema"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#1a1a1a] text-white border border-[#333333] font-mono text-xs font-semibold hover:bg-[#262626] transition-all"
                                >
                                    <span>Ver Arquitectura y Flujos</span>
                                </a>
                            </div>
                        </div>

                        {/* Columna Lateral de Métricas */}
                        <div className="lg:col-span-4 bg-[#111111] p-6 rounded-xl border border-[#262626] space-y-5">
                            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                                <span className="text-[10px] font-mono text-[#888888] uppercase tracking-widest">ESTADO OPERATIVO</span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#d1ffca]">
                                    <span className="w-2 h-2 rounded-full bg-[#d1ffca] animate-ping" />
                                    EN LÍNEA
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                                    <span className="font-display text-3xl font-black text-white block">03</span>
                                    <span className="text-[10px] font-mono text-[#888888] uppercase block mt-1">Obras Activas</span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                                    <span className="font-display text-3xl font-black text-[#d1ffca] block">100%</span>
                                    <span className="text-[10px] font-mono text-[#888888] uppercase block mt-1">Kardex Inmutable</span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                                    <span className="font-display text-3xl font-black text-[#fff100] block">AHP</span>
                                    <span className="text-[10px] font-mono text-[#888888] uppercase block mt-1">Ranking Multi-Criterio</span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-[#181818] border border-[#2a2a2a]">
                                    <span className="font-display text-3xl font-black text-white block">PMI</span>
                                    <span className="text-[10px] font-mono text-[#888888] uppercase block mt-1">EVM & Partidas</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#222222] text-[11px] font-mono text-[#aaaaaa]">
                                <span className="text-white font-bold block mb-1 flex items-center gap-1.5">
                                    <IconMapPin size={13} className="text-[#d1ffca]" />
                                    Región Central del Perú:
                                </span>
                                Huancayo · Chupaca · Pilcomayo · El Tambo
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección 01 / Proyectos */}
            <section id="proyectos" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between border-b border-[#000000] pb-2 mb-8">
                    <span className="font-mono text-xs font-bold tracking-widest text-[#666666]">01 / PROYECTOS EN EJECUCIÓN</span>
                    <span className="font-mono text-xs text-[#666666]">VALLE DEL MANTARO</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Obra 1 */}
                    <div className="bg-white p-6 rounded-xl border border-[#c6c6c6] flex flex-col justify-between hover:border-black transition-all shadow-sm">
                        <div>
                            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#666666]">
                                <span>OBRA 01</span>
                                <span className="px-2 py-0.5 rounded bg-[#d1ffca] text-black font-bold">EJECUCIÓN</span>
                            </div>
                            <h3 className="font-display text-2xl font-bold uppercase text-black leading-tight mb-2">
                                Mejoramiento Vial Chupaca - Sicaya
                            </h3>
                            <p className="text-xs text-[#555555] mb-4">
                                Pavimentación flexible de 12.4 km, construcción de cunetas, drenaje pluvial y señalización vial.
                            </p>
                        </div>
                        <div className="pt-4 border-t border-[#f0f0f0] flex items-center justify-between text-xs font-mono text-[#444444]">
                            <span>Chupaca, Junín</span>
                            <span className="font-bold text-black">Almacén Central</span>
                        </div>
                    </div>

                    {/* Obra 2 */}
                    <div className="bg-white p-6 rounded-xl border border-[#c6c6c6] flex flex-col justify-between hover:border-black transition-all shadow-sm">
                        <div>
                            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#666666]">
                                <span>OBRA 02</span>
                                <span className="px-2 py-0.5 rounded bg-[#d1ffca] text-black font-bold">ESTRUCTURAS</span>
                            </div>
                            <h3 className="font-display text-2xl font-bold uppercase text-black leading-tight mb-2">
                                Puesto de Salud Pilcomayo
                            </h3>
                            <p className="text-xs text-[#555555] mb-4">
                                Edificación hospitalaria nivel I-3, módulos de atención, instalaciones electromecánicas y equipamiento médico.
                            </p>
                        </div>
                        <div className="pt-4 border-t border-[#f0f0f0] flex items-center justify-between text-xs font-mono text-[#444444]">
                            <span>Huancayo, Junín</span>
                            <span className="font-bold text-black">Almacén Pilcomayo</span>
                        </div>
                    </div>

                    {/* Obra 3 */}
                    <div className="bg-white p-6 rounded-xl border border-[#c6c6c6] flex flex-col justify-between hover:border-black transition-all shadow-sm">
                        <div>
                            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#666666]">
                                <span>OBRA 03</span>
                                <span className="px-2 py-0.5 rounded bg-[#fff100] text-black font-bold">MONTAJE</span>
                            </div>
                            <h3 className="font-display text-2xl font-bold uppercase text-black leading-tight mb-2">
                                Puente Comuneros II
                            </h3>
                            <p className="text-xs text-[#555555] mb-4">
                                Estructura atirantada de doble vía sobre el Río Mantaro, estribos de concreto armado y accesos pavimentados.
                            </p>
                        </div>
                        <div className="pt-4 border-t border-[#f0f0f0] flex items-center justify-between text-xs font-mono text-[#444444]">
                            <span>El Tambo / Huancayo</span>
                            <span className="font-bold text-black">Almacén Comuneros</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección 02 / Líneas de Acción */}
            <section id="lineas" className="py-16 bg-white border-y border-[#c6c6c6]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between border-b border-[#000000] pb-2 mb-8">
                        <span className="font-mono text-xs font-bold tracking-widest text-[#666666]">02 / LÍNEAS DE ACCIÓN TÉCNICA</span>
                        <span className="font-mono text-xs text-[#666666]">CAPACIDAD CPM</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-[#000000] text-[#d1ffca] flex items-center justify-center">
                                <IconTruck size={22} />
                            </div>
                            <h3 className="font-display text-xl font-bold uppercase text-black">Infraestructura Vial</h3>
                            <p className="text-xs text-[#555555] leading-relaxed">
                                Pavimentaciones, movimiento de tierras, puentes, obras de arte y drenaje pluvial en vías urbanas y departamentales.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-[#000000] text-[#d1ffca] flex items-center justify-center">
                                <IconBuilding size={22} />
                            </div>
                            <h3 className="font-display text-xl font-bold uppercase text-black">Edificaciones & Salud</h3>
                            <p className="text-xs text-[#555555] leading-relaxed">
                                Centros de salud, colegios emblemáticos, instalaciones comerciales y estructuras de concreto armado sismorresistentes.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="w-10 h-10 rounded-lg bg-[#000000] text-[#d1ffca] flex items-center justify-center">
                                <IconBox size={22} />
                            </div>
                            <h3 className="font-display text-xl font-bold uppercase text-black">Logística & Materiales</h3>
                            <p className="text-xs text-[#555555] leading-relaxed">
                                Gestión de inventarios multi-almacén, abastecimiento estratégico de insumos críticos y control de mermas en obra.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección 03 / Sistema Web Geolocalizado */}
            <section id="sistema" className="py-20 bg-[#000000] text-white border-b border-[#222222]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between border-b border-[#333333] pb-2 mb-10">
                        <span className="font-mono text-xs font-bold tracking-widest text-[#d1ffca]">03 / INNOVACIÓN EN OBRA</span>
                        <span className="font-mono text-xs text-[#888888]">SISTEMA WEB / MULTI-ALMACÉN</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <span className="px-2.5 py-0.5 rounded bg-[#d1ffca] text-black text-[10px] font-mono font-black uppercase">
                                INVENTARIO MULTI-ALMACÉN
                            </span>
                            <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase leading-[0.95] text-white">
                                DEL ALMACÉN<br />
                                AL FRENTE<br />
                                <span className="text-[#d1ffca]">DE OBRA.</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-[#aaaaaa] leading-relaxed">
                                El sistema web geolocalizado conecta materiales, almacenes y frentes de trabajo en tiempo real, permitiendo consultar saldos físicos, registrar recepciones e-POD y despachar con trazabilidad total.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-lg bg-[#111111] border border-[#222222]">
                                    <div className="flex items-center gap-2 text-[#d1ffca] mb-1 font-mono text-xs font-bold">
                                        <IconRepeat size={14} />
                                        <span>REDISTRIBUCIÓN</span>
                                    </div>
                                    <p className="text-[11px] text-[#888888]">
                                        Detección automática de excedentes y sugerencia de transferencias entre obras sin compras redundantes.
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-[#111111] border border-[#222222]">
                                    <div className="flex items-center gap-2 text-[#fff100] mb-1 font-mono text-xs font-bold">
                                        <IconShield size={14} />
                                        <span>KARDEX SEGURO</span>
                                    </div>
                                    <p className="text-[11px] text-[#888888]">
                                        Registro inmutable por trigger de base de datos con bloqueo de concurrencia y saldos garantizados.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Link
                                    href="/panel"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d1ffca] text-black font-mono text-xs font-bold hover:bg-[#bbf7b3] transition-all"
                                >
                                    <span>Acceder a la Matriz de Inventario</span>
                                    <IconArrowRight size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Map Panel Preview */}
                        <div className="lg:col-span-6 bg-[#111111] p-6 rounded-xl border border-[#262626]">
                            <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
                                <span className="text-[10px] font-mono text-[#888888] uppercase">MAPA GEOLOCALIZADO · RED MANTARO</span>
                                <span className="text-[10px] font-mono text-[#d1ffca]">POSTGIS 3.4</span>
                            </div>

                            <div className="h-64 rounded-lg bg-[#080808] border border-[#222222] relative overflow-hidden flex flex-col justify-between p-4">
                                <div className="flex justify-between items-start">
                                    <div className="bg-[#000000]/80 backdrop-blur px-3 py-1.5 rounded border border-[#333333] text-[10px] font-mono">
                                        <span className="text-[#888888]">ORIGEN:</span> Almacén Central Chupaca<br />
                                        <span className="text-[#888888]">DESTINO:</span> Almacén Pilcomayo (8.4 km)
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-[#9333ea] text-white text-[9px] font-mono font-bold">
                                        VECTOR EXCEDENTE
                                    </span>
                                </div>

                                <div className="space-y-1 text-center font-mono text-[11px] text-[#888888]">
                                    <div className="w-full border-b border-dashed border-[#9333ea] my-3 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#000000] border border-[#333333] text-[9px] text-[#d1ffca] flex items-center gap-1">
                                            <IconTruck size={12} />
                                            <span>ETA: 28 min</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-[#666666]">Camión estático en punto medio con insignia de arribo estimada</span>
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-mono text-[#777777]">
                                    <span>Lat: -12.0653 · Lng: -75.2890</span>
                                    <span className="text-[#d1ffca]">GPS VALIDADO</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección 04 / Enfoque PMI + PMU */}
            <section id="enfoque" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between border-b border-[#000000] pb-2 mb-8">
                    <span className="font-mono text-xs font-bold tracking-widest text-[#666666]">04 / ENFOQUE DE TRABAJO</span>
                    <span className="font-mono text-xs text-[#666666]">PMI + PMU</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-black text-white p-8 rounded-xl border border-black space-y-4">
                        <span className="text-[10px] font-mono text-[#d1ffca] uppercase tracking-widest">MARCO METODOLÓGICO</span>
                        <h3 className="font-display text-3xl font-bold uppercase text-white">PMI (Gestión de Proyectos)</h3>
                        <p className="text-xs text-[#aaaaaa] leading-relaxed">
                            Estructuración de ciclo de vida en fases, línea base de costos vinculada a partidas, cálculo de valor ganado (EVM: SPI, CPI, EAC, VAC) y matriz de riesgos de obra.
                        </p>
                    </div>

                    <div className="bg-white text-black p-8 rounded-xl border border-[#c6c6c6] space-y-4">
                        <span className="text-[10px] font-mono text-[#666666] uppercase tracking-widest">PORTAFOLIO ESTRATÉGICO</span>
                        <h3 className="font-display text-3xl font-bold uppercase text-black">PMU (Program Management)</h3>
                        <p className="text-xs text-[#555555] leading-relaxed">
                            Monitoreo consolidado de múltiples obras simultáneas, optimización del presupuesto global, mitigación de quiebres de stock y reubicación de excedentes entre proyectos.
                        </p>
                    </div>
                </div>

                {/* Ciclo 4 pasos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-[#c6c6c6]">
                        <span className="font-mono text-xs text-[#888888] font-bold block mb-1">01 / ENTENDER</span>
                        <strong className="text-sm font-bold text-black block mb-1">Procesos & Actores</strong>
                        <p className="text-[11px] text-[#666666]">Levantamiento de diagramas Bizagi y roles operativos en obra.</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[#c6c6c6]">
                        <span className="font-mono text-xs text-[#888888] font-bold block mb-1">02 / DISEÑAR</span>
                        <strong className="text-sm font-bold text-black block mb-1">Flujos & Arquitectura</strong>
                        <p className="text-[11px] text-[#666666]">Esquema relacional de 83 tablas y servicios de dominio acoplados.</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[#c6c6c6]">
                        <span className="font-mono text-xs text-[#888888] font-bold block mb-1">03 / IMPLEMENTAR</span>
                        <strong className="text-sm font-bold text-black block mb-1">API & Geolocalización</strong>
                        <p className="text-[11px] text-[#666666]">Backend Laravel, React 19 y base espacial PostGIS.</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[#c6c6c6]">
                        <span className="font-mono text-xs text-[#888888] font-bold block mb-1">04 / MEJORAR</span>
                        <strong className="text-sm font-bold text-black block mb-1">Control & Calidad</strong>
                        <p className="text-[11px] text-[#666666]">Pruebas automatizadas, reportes SonarQube y pipeline DevOps.</p>
                    </div>
                </div>
            </section>

            {/* Sección 05 / Contacto & Consulta */}
            <section id="contacto" className="py-16 bg-[#000000] text-white border-t border-[#222222]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between border-b border-[#333333] pb-2 mb-10">
                        <span className="font-mono text-xs font-bold tracking-widest text-[#d1ffca]">05 / CONTACTO Y CONSULTA</span>
                        <span className="font-mono text-xs text-[#888888]">CANAL OFICIAL CPM</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-5 space-y-4">
                            <span className="px-2.5 py-0.5 rounded bg-[#d1ffca] text-black text-[10px] font-mono font-black uppercase">
                                HABLEMOS DE OBRA
                            </span>
                            <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase leading-[0.95] text-white">
                                CUÉNTANOS<br />
                                QUÉ HAY<br />
                                <span className="text-[#d1ffca]">POR CONSTRUIR.</span>
                            </h2>
                            <p className="text-xs text-[#aaaaaa] leading-relaxed">
                                Organiza una consulta técnica sobre un proyecto en ejecución, una línea de abastecimiento o la integración del sistema multi-almacén.
                            </p>
                            <div className="pt-4 text-xs font-mono text-[#888888] space-y-2">
                                <p className="flex items-center gap-2">
                                    <IconMapPin size={14} className="text-[#d1ffca]" />
                                    <span>Jr. Ayacucho N° 450, Huancayo, Junín</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <IconInbox size={14} className="text-[#d1ffca]" />
                                    <span>contacto@pillcomarca.pe</span>
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-7 bg-[#111111] p-6 rounded-xl border border-[#262626]">
                            {!formSubmitted ? (
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="contact-name" className="block text-[11px] font-mono text-[#cccccc] uppercase mb-1">Nombre Completo</label>
                                        <input
                                            id="contact-name"
                                            type="text"
                                            required
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                            placeholder="Ingresa tu nombre"
                                            className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d1ffca]"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="contact-email" className="block text-[11px] font-mono text-[#cccccc] uppercase mb-1">Correo Corporativo</label>
                                        <input
                                            id="contact-email"
                                            type="email"
                                            required
                                            value={contactForm.email}
                                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                            placeholder="nombre@empresa.com"
                                            className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d1ffca]"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="contact-interest" className="block text-[11px] font-mono text-[#cccccc] uppercase mb-1">Tema de Consulta</label>
                                        <select
                                            id="contact-interest"
                                            value={contactForm.interest}
                                            onChange={(e) => setContactForm({ ...contactForm, interest: e.target.value })}
                                            className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d1ffca]"
                                        >
                                            <option value="inventario">Sistema de Inventarios y Almacenes</option>
                                            <option value="proyectos">Proyectos y Obras en Ejecución</option>
                                            <option value="proveedor">Homologación de Proveedores</option>
                                            <option value="otro">Otro Asunto</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="contact-message" className="block text-[11px] font-mono text-[#cccccc] uppercase mb-1">Mensaje o Requerimiento</label>
                                        <textarea
                                            id="contact-message"
                                            rows={3}
                                            required
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            placeholder="Detalla tu consulta técnica..."
                                            className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d1ffca]"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-2.5 rounded-lg bg-[#d1ffca] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#bbf7b3] transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <span>Preparar Consulta</span>
                                        <IconArrowRight size={14} />
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-lg bg-[#000000] border border-[#2a2a2a] text-xs font-mono text-[#cccccc] space-y-1">
                                        <span className="text-[#d1ffca] font-bold block mb-2">CONSULTA PREPARADA:</span>
                                        <p><strong>Remitente:</strong> {contactForm.name} ({contactForm.email})</p>
                                        <p><strong>Tema:</strong> {contactForm.interest}</p>
                                        <p><strong>Mensaje:</strong> {contactForm.message}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="flex-1 py-2 rounded-lg bg-[#ffffff] text-black font-mono text-xs font-bold hover:bg-[#e0e0e0] transition-all flex items-center justify-center gap-2"
                                        >
                                            {copiedText ? <IconCheck size={14} /> : null}
                                            <span>{copiedText ? 'Copiado al Portapapeles' : 'Copiar Mensaje'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormSubmitted(false)}
                                            className="px-4 py-2 rounded-lg bg-[#222222] text-white font-mono text-xs font-bold hover:bg-[#333333] transition-all"
                                        >
                                            Nueva Consulta
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#000000] text-white border-t border-[#1a1a1a] py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#666666]">
                    <div className="flex items-center gap-2">
                        <IconBrandMark size={28} />
                        <span className="text-white font-bold">CONSORCIO PILLCO MARCA</span>
                    </div>
                    <div>CONSTRUIR CON VISIÓN · GESTIONAR CON ORDEN</div>
                    <div>© 2026 CONSORCIO PILLCO MARCA · TODOS LOS DERECHOS RESERVADOS</div>
                </div>
            </footer>

            {/* Modal de Acceso Rápido / Login */}
            {loginModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-[#2a2a2a] text-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                        <button
                            type="button"
                            onClick={() => setLoginModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#1e1e1e] text-[#888888] hover:text-white transition-colors"
                        >
                            <IconClose size={16} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <IconBrandMark size={40} />
                            <div>
                                <span className="text-[10px] font-mono text-[#888888] uppercase block">Portal Operativo</span>
                                <h3 className="font-display text-2xl font-bold uppercase text-white leading-none">
                                    Iniciar Sesión
                                </h3>
                            </div>
                        </div>

                        <div className="mb-4">
                            <span className="block text-[10px] font-mono text-[#888888] uppercase mb-1.5">
                                Seleccionar Rol de Prueba
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleRolePreset('residente_obra', 'residente.chupaca@pillcomarca.pe')}
                                    className={`p-2 rounded-lg text-left text-[11px] font-mono border transition-all ${
                                        selectedRole === 'residente_obra'
                                            ? 'bg-[#d1ffca] text-black font-bold border-[#d1ffca]'
                                            : 'bg-[#181818] text-[#cccccc] border-[#2a2a2a] hover:border-[#444444]'
                                    }`}
                                >
                                    Residente Obra
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRolePreset('jefe_logistica', 'logistica@pillcomarca.pe')}
                                    className={`p-2 rounded-lg text-left text-[11px] font-mono border transition-all ${
                                        selectedRole === 'jefe_logistica'
                                            ? 'bg-[#d1ffca] text-black font-bold border-[#d1ffca]'
                                            : 'bg-[#181818] text-[#cccccc] border-[#2a2a2a] hover:border-[#444444]'
                                    }`}
                                >
                                    Jefe Logística
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRolePreset('almacenero', 'almacen.central@pillcomarca.pe')}
                                    className={`p-2 rounded-lg text-left text-[11px] font-mono border transition-all ${
                                        selectedRole === 'almacenero'
                                            ? 'bg-[#d1ffca] text-black font-bold border-[#d1ffca]'
                                            : 'bg-[#181818] text-[#cccccc] border-[#2a2a2a] hover:border-[#444444]'
                                    }`}
                                >
                                    Almacenero
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRolePreset('gerente_general', 'gerencia@pillcomarca.pe')}
                                    className={`p-2 rounded-lg text-left text-[11px] font-mono border transition-all ${
                                        selectedRole === 'gerente_general'
                                            ? 'bg-[#d1ffca] text-black font-bold border-[#d1ffca]'
                                            : 'bg-[#181818] text-[#cccccc] border-[#2a2a2a] hover:border-[#444444]'
                                    }`}
                                >
                                    Gerente General
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div>
                                <label htmlFor="login-email" className="block text-[10px] font-mono text-[#888888] uppercase mb-1">Correo Electrónico</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d1ffca]"
                                />
                            </div>
                            <div>
                                <label htmlFor="login-password" className="block text-[10px] font-mono text-[#888888] uppercase mb-1">Contraseña</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d1ffca]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Link
                                href="/panel"
                                className="w-full py-2.5 rounded-lg bg-[#d1ffca] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#bbf7b3] transition-all flex items-center justify-center gap-2 shadow-md"
                            >
                                <span>Ingresar al Dashboard</span>
                                <IconArrowRight size={14} />
                            </Link>
                            <p className="text-[10px] font-mono text-center text-[#666666]">
                                Modo demostración con credenciales de prueba
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
