// Componente de Mapa Interactivo Leaflet + OpenStreetMap (sin API key)
// para el dashboard de Consorcio Pillco Marca (Huancayo, Valle del Mantaro).
// Reemplaza el SVG estático MapaSchematic manteniendo compatibilidad de props.
// Soporta capas Callejero (OSM) / Satelital (Esri), marcadores por estado de stock,
// polilíneas para despachos y vectores de redistribución de sobrantes (Procesos Bizagi 10, 12, 14).

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { cn } from '../utils/cn';
import { estadoDeAlmacen, ESTADO_META } from '../utils/estados';
import { formatCantidad } from '../utils/format';
import type { StockState } from '../data/stock';
import type { Almacen, Material, Obra } from '../types';
import { IconMapPin, IconSearch } from './icons';

export interface RutaMapa {
    id: string;
    codigo: string;
    origenId: string;
    destinoId: string;
    estado: 'en-transito' | 'pendiente' | 'entregado';
}

export interface SugerenciaMapa {
    origenId: string;
    destinoId: string;
}

export interface MapaLeafletProps {
    obras: Obra[];
    almacenes: Almacen[];
    stock: StockState;
    materiales: Material[];
    rutas?: RutaMapa[];
    sugerencias?: SugerenciaMapa[];
    seleccionadaId?: string;
    resaltarAlertaOrigenId?: string | null;
    resaltarAlertaDestinoId?: string | null;
    onPinClick?: (obraId: string) => void;
    className?: string;
}

const NOMBRE_CORTO: Record<string, string> = {
    'obra-central': 'Alm. Central San Jerónimo',
    'obra-eltambo': 'Frente El Tambo',
    'obra-puentecunas': 'Puente Cunas',
    'obra-chilca': 'Conexión Chilca',
    'obra-ielosandes': 'IE Los Andes (cierre)',
};

// Coordenadas centrales del Valle del Mantaro (Huancayo, Junín)
const MANTARO_CENTER: [number, number] = [-12.068, -75.21];
const DEFAULT_ZOOM = 12;

export function MapaLeaflet({
    obras,
    almacenes,
    stock,
    materiales,
    rutas = [],
    sugerencias = [],
    seleccionadaId,
    resaltarAlertaOrigenId,
    resaltarAlertaDestinoId,
    onPinClick,
    className,
}: MapaLeafletProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const routesLayerRef = useRef<L.LayerGroup | null>(null);

    const [tileMode, setTileMode] = useState<'osm' | 'satellite'>('osm');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'optimo' | 'bajo' | 'critico' | 'sobrante'>('todos');
    const [mostrarLeyenda, setMostrarLeyenda] = useState(true);

    const obrasMap = useMemo(() => new Map(obras.map((o) => [o.id, o])), [obras]);
    const almacenesMap = useMemo(() => new Map(almacenes.map((a) => [a.id, a])), [almacenes]);

    // Exponer handlers globales para los botones de acción dentro de popups HTML
    useEffect(() => {
        const win = window as unknown as {
            __cpmSelectObra?: (id: string) => void;
            __cpmSetObraActiva?: (id: string) => void;
            __cpmVerMatriz?: (obraId: string) => void;
            __cpmVerRedistribucion?: (obraId: string, almacenId: string) => void;
        };

        win.__cpmSelectObra = (id: string) => {
            if (onPinClick) {
                onPinClick(id);
            }
        };

        win.__cpmSetObraActiva = (id: string) => {
            if (onPinClick) {
                onPinClick(id);
            }
            window.dispatchEvent(new CustomEvent('cpm:set-obra-activa', { detail: { obraId: id } }));
        };

        win.__cpmVerMatriz = (obraId?: string, almacenId?: string) => {
            if (almacenId || obraId) {
                window.location.href = `/stock?almacen=${almacenId || ''}&obra=${obraId || ''}`;
            } else {
                window.location.href = '/stock';
            }
        };

        win.__cpmVerRedistribucion = (obraId: string, almacenId: string) => {
            window.dispatchEvent(new CustomEvent('cpm:calcular-redistribucion', { detail: { obraId, almacenId } }));
        };

        return () => {
            delete win.__cpmSelectObra;
            delete win.__cpmSetObraActiva;
            delete win.__cpmVerMatriz;
            delete win.__cpmVerRedistribucion;
        };
    }, [onPinClick]);

    // 1. Inicialización de la instancia Leaflet
    useEffect(() => {
        if (!mapContainerRef.current) {
            return;
        }

        // Si ya existía una instancia en este contenedor, removerla limpiamente
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            center: MANTARO_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: true,
        });

        const initialLayer = L.tileLayer(
            tileMode === 'osm'
                ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                maxZoom: 18,
                attribution:
                    tileMode === 'osm'
                        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        : '&copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
            },
        ).addTo(map);

        tileLayerRef.current = initialLayer;
        markersLayerRef.current = L.layerGroup().addTo(map);
        routesLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        // Invalidate size después del render para evitar cortes
        setTimeout(() => {
            map.invalidateSize();
        }, 150);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // 2. Cambio de capa base (Callejero OSM vs Satélite Esri)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) {
            return;
        }

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        const newLayer = L.tileLayer(
            tileMode === 'osm'
                ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                maxZoom: 18,
                attribution:
                    tileMode === 'osm'
                        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        : '&copy; Esri World Imagery',
            },
        ).addTo(map);

        // Enviar la capa base al fondo
        newLayer.bringToBack();
        tileLayerRef.current = newLayer;
    }, [tileMode]);

    // 3. Renderizado de Marcadores (Pines) y Rutas
    useEffect(() => {
        const map = mapInstanceRef.current;
        const markersLayer = markersLayerRef.current;
        const routesLayer = routesLayerRef.current;
        if (!map || !markersLayer || !routesLayer) {
            return;
        }

        markersLayer.clearLayers();
        routesLayer.clearLayers();

        // 3.1 Dibujar Rutas de Despachos en Tránsito (líneas continuas índigo + camión SVG en punto medio)
        rutas.forEach((ruta) => {
            const almOrigen = almacenesMap.get(ruta.origenId);
            const almDestino = almacenesMap.get(ruta.destinoId);
            if (!almOrigen || !almDestino) {
                return;
            }

            const latlngs: [number, number][] = [
                [almOrigen.coords.lat, almOrigen.coords.lng],
                [almDestino.coords.lat, almDestino.coords.lng],
            ];

            const polyline = L.polyline(latlngs, {
                color: '#4f46e5',
                weight: 3.5,
                opacity: 0.85,
                lineJoin: 'round',
            });

            polyline.bindTooltip(`Despacho ${ruta.codigo}: ${almOrigen.nombre} ➔ ${almDestino.nombre}`, {
                sticky: true,
                className: 'cpm-leaflet-tooltip',
            });
            routesLayer.addLayer(polyline);

            // Marcador de camión con SVG en el punto medio
            const midLat = (almOrigen.coords.lat + almDestino.coords.lat) / 2;
            const midLng = (almOrigen.coords.lng + almDestino.coords.lng) / 2;

            const truckIcon = L.divIcon({
                className: 'cpm-truck-marker',
                html: `
                    <div style="transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 5px; background: #ffffff; padding: 3px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(16,18,51,0.18); border: 1.5px solid #c3c9ff; font-family: sans-serif; cursor: pointer;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                        <span style="font-size: 10px; font-weight: 700; color: #333fd1;">${ruta.codigo}</span>
                        <span style="font-size: 9px; font-weight: 600; background: #eef0ff; color: #4f46e5; padding: 1px 4px; border-radius: 4px;">ETA 25m</span>
                    </div>
                `,
                iconSize: [0, 0],
            });

            const truckMarker = L.marker([midLat, midLng], { icon: truckIcon });
            routesLayer.addLayer(truckMarker);
        });

        // 3.2 Dibujar Sugerencias de Redistribución (línea violeta punteada)
        sugerencias.forEach((sug) => {
            const almOrigen = almacenesMap.get(sug.origenId);
            const almDestino = almacenesMap.get(sug.destinoId);
            if (!almOrigen || !almDestino) {
                return;
            }

            const isHighlighted =
                resaltarAlertaOrigenId === sug.origenId ||
                resaltarAlertaDestinoId === sug.destinoId;

            const latlngs: [number, number][] = [
                [almOrigen.coords.lat, almOrigen.coords.lng],
                [almDestino.coords.lat, almDestino.coords.lng],
            ];

            const polyline = L.polyline(latlngs, {
                color: '#7c3aed',
                weight: isHighlighted ? 4.5 : 2.5,
                opacity: isHighlighted ? 1 : 0.65,
                dashArray: isHighlighted ? '8, 8' : '6, 8',
                className: 'leaflet-redistribucion-path',
            });

            polyline.bindTooltip(
                `Redistribución sugerida: ${almOrigen.nombre} ➔ ${almDestino.nombre}`,
                { sticky: true },
            );
            routesLayer.addLayer(polyline);
        });

        // 3.3 Dibujar Marcadores de Almacenes y Obras
        almacenes.forEach((alm) => {
            const obra = obrasMap.get(alm.obraId);
            if (!obra) {
                return;
            }

            const estado = estadoDeAlmacen(alm, obra.estado, stock, materiales);

            // Filtrado por estado si aplica
            if (filtroEstado !== 'todos' && estado !== filtroEstado) {
                return;
            }

            const meta = ESTADO_META[estado];
            const isSelected = seleccionadaId === obra.id;
            const shortName = NOMBRE_CORTO[obra.id] ?? obra.nombre;

            // Colores según estado
            let bgBadge = '#ffffff';
            let textBadge = '#101233';
            let dotColor = '#10b981';
            let borderColor = '#e5e7f0';

            if (estado === 'optimo') {
                dotColor = '#10b981';
                borderColor = '#10b981';
            } else if (estado === 'bajo') {
                dotColor = '#f59e0b';
                borderColor = '#f59e0b';
            } else if (estado === 'critico') {
                dotColor = '#ea580c';
                borderColor = '#ea580c';
            } else if (estado === 'sobrante') {
                bgBadge = '#7c3aed';
                textBadge = '#ffffff';
                dotColor = '#fdeccb';
                borderColor = '#5b21b6';
            }

            const customIcon = L.divIcon({
                className: 'cpm-custom-pin',
                html: `
                    <div style="transform: translate(-50%, -100%); position: relative; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: ${bgBadge}; color: ${textBadge}; border: 2px solid ${borderColor}; box-shadow: ${isSelected ? '0 0 0 4px rgba(84, 104, 255, 0.4), 0 8px 20px rgba(16,18,51,0.25)' : '0 4px 12px rgba(16,18,51,0.15)'}; font-family: sans-serif; font-size: 11px; font-weight: 700; transition: transform 0.2s ease;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; display: inline-block;"></span>
                            <span style="white-space: nowrap;">${shortName}</span>
                        </div>
                        <div style="width: 8px; height: 8px; background: ${bgBadge}; border-right: 2px solid ${borderColor}; border-bottom: 2px solid ${borderColor}; transform: rotate(45deg); margin: -4px auto 0 auto;"></div>
                    </div>
                `,
                iconSize: [0, 0],
            });

            const marker = L.marker([alm.coords.lat, alm.coords.lng], { icon: customIcon });

            // Tooltip en hover
            marker.bindTooltip(`<strong>${obra.nombre}</strong><br/>${meta.label}`, {
                offset: L.point(0, -32),
                direction: 'top',
            });

            // Popup detallado interactivo con SVG Icons y predicción
            const stockAlm = stock.stock[alm.id] ?? {};
            const itemsResumen = materiales.slice(0, 3).map((mat) => {
                const cant = stockAlm[mat.id] ?? 0;
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 2px 0;">
                        <span style="color: #6b7190; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${mat.nombre}</span>
                        <span style="font-weight: 700; font-family: monospace; color: #101233;">${formatCantidad(cant)} ${mat.unidad}</span>
                    </div>
                `;
            }).join('');

            const popupHtml = `
                <div style="padding: 12px 14px; min-width: 250px; font-family: sans-serif;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f0f2f8;">
                        <span style="font-size: 10px; font-weight: 700; color: #8a92b2; text-transform: uppercase;">${obra.distrito}</span>
                        <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: ${bgBadge}; color: ${textBadge}; border: 1px solid ${borderColor};">${meta.label}</span>
                    </div>

                    <div style="font-weight: 800; font-size: 13px; color: #101233; line-height: 1.3; margin-bottom: 2px;">${obra.nombre}</div>
                    <div style="font-size: 11px; color: #6b7190; margin-bottom: 8px;">${alm.nombre}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8f9fd; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; font-size: 10px;">
                        <div>
                            <span style="color: #8a92b2; display: block;">RESPONSABLE</span>
                            <span style="font-weight: 600; color: #101233; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${obra.responsable}</span>
                        </div>
                        <div>
                            <span style="color: #8a92b2; display: block;">AVANCE FÍSICO</span>
                            <span style="font-weight: 800; color: #5468ff;">${obra.pctAvance}%</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 9px; font-weight: 700; color: #8a92b2; text-transform: uppercase; margin-bottom: 4px;">Materiales en frente</div>
                        ${itemsResumen}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                            <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #5468ff; color: #ffffff; border: none; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; text-align: center; transition: background 0.15s ease;" onclick="window.__cpmSetObraActiva && window.__cpmSetObraActiva('${obra.id}')" title="Fijar y agregar a comparación en panel">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                <span>Frente activo</span>
                            </button>
                            <button type="button" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #f4f5fb; color: #101233; border: 1px solid #e5e7f0; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; text-align: center; transition: background 0.15s ease;" onclick="window.__cpmVerMatriz && window.__cpmVerMatriz('${obra.id}', '${alm.id}')" title="Ver saldos en la Matriz de Stock">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                                <span>Ver en Matriz</span>
                            </button>
                        </div>
                        <button type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 8px; background: #ede9fe; color: #6d28d9; border: 1px solid #c4b5fd; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; text-align: center; transition: background 0.15s ease;" onclick="window.__cpmVerRedistribucion && window.__cpmVerRedistribucion('${obra.id}', '${alm.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H7"/><circle cx="18" cy="5" r="3"/><polyline points="10 6 7 9 10 12"/></svg>
                            <span>Ver redistribución sugerida</span>
                        </button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupHtml, {
                offset: L.point(0, -28),
                maxWidth: 290,
            });

            // Sincronización en clic
            marker.on('click', () => {
                if (onPinClick) {
                    onPinClick(obra.id);
                }
            });

            markersLayer.addLayer(marker);
        });
    }, [almacenes, obras, stock, materiales, rutas, sugerencias, seleccionadaId, resaltarAlertaOrigenId, resaltarAlertaDestinoId, filtroEstado, onPinClick, obrasMap, almacenesMap]);



    // 4. Centrado suave al seleccionar una obra desde fuera del mapa
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !seleccionadaId) {
            return;
        }

        const alm = almacenes.find((a) => a.obraId === seleccionadaId);
        if (alm) {
            map.flyTo([alm.coords.lat, alm.coords.lng], 14, { duration: 0.8 });
        }
    }, [seleccionadaId, almacenes]);

    // Handler para recentrar el mapa al Valle del Mantaro
    const handleRecenter = () => {
        const map = mapInstanceRef.current;
        if (map) {
            map.flyTo(MANTARO_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
        }
    };

    return (
        <div className={cn('relative w-full rounded-2xl overflow-hidden border border-line bg-surface shadow-sm', className)}>
            {/* Contenedor del Mapa Leaflet */}
            <div ref={mapContainerRef} className="w-full h-[420px] md:h-[460px] z-0" />

            {/* Barra de Controles Superiores Flotantes */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
                {/* Selector de Capa Callejero / Satélite */}
                <div className="flex items-center bg-surface/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-line">
                    <button
                        type="button"
                        onClick={() => setTileMode('osm')}
                        className={cn(
                            'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                            tileMode === 'osm'
                                ? 'bg-brand-500 text-white shadow-sm'
                                : 'text-muted hover:text-ink hover:bg-soft',
                        )}
                    >
                        Callejero (OSM)
                    </button>
                    <button
                        type="button"
                        onClick={() => setTileMode('satellite')}
                        className={cn(
                            'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                            tileMode === 'satellite'
                                ? 'bg-brand-500 text-white shadow-sm'
                                : 'text-muted hover:text-ink hover:bg-soft',
                        )}
                    >
                        Satélite (Esri)
                    </button>
                </div>

                {/* Botón de Recentrado */}
                <button
                    type="button"
                    onClick={handleRecenter}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface/95 backdrop-blur-sm text-ink hover:text-brand-600 rounded-xl shadow-md border border-line transition-all hover:bg-soft"
                    title="Restablecer vista a Huancayo y Valle del Mantaro"
                >
                    <IconMapPin size={13} className="text-brand-500" />
                    <span>Centrar Valle</span>
                </button>

                {/* Filtro de Estado de Stock */}
                <div className="hidden sm:flex items-center bg-surface/95 backdrop-blur-sm px-2 py-1 rounded-xl shadow-md border border-line text-xs">
                    <span className="text-muted mr-1.5 font-medium">Filtro:</span>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
                        className="bg-transparent font-semibold text-ink outline-none cursor-pointer text-xs"
                    >
                        <option value="todos">Todos los almacenes</option>
                        <option value="optimo">Stock óptimo</option>
                        <option value="bajo">Stock bajo</option>
                        <option value="critico">Stock crítico</option>
                        <option value="sobrante">Sobrante por cierre</option>
                    </select>
                </div>
            </div>

            {/* Leyenda Flotante Inferior Derecha */}
            <div className="absolute bottom-3 right-3 z-[1000]">
                {mostrarLeyenda ? (
                    <div className="bg-surface/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-line text-[11px] space-y-1.5 max-w-[210px]">
                        <div className="flex items-center justify-between font-bold text-ink pb-1 border-b border-line">
                            <span>Simbología Operativa</span>
                            <button
                                type="button"
                                onClick={() => setMostrarLeyenda(false)}
                                className="text-muted hover:text-ink text-xs px-1"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-ink">
                            <span className="w-2.5 h-2.5 rounded-full bg-ok inline-block shrink-0" />
                            <span>Stock óptimo</span>
                        </div>
                        <div className="flex items-center gap-2 text-ink">
                            <span className="w-2.5 h-2.5 rounded-full bg-warn inline-block shrink-0" />
                            <span>Stock bajo</span>
                        </div>
                        <div className="flex items-center gap-2 text-ink">
                            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block shrink-0" />
                            <span>Stock crítico</span>
                        </div>
                        <div className="flex items-center gap-2 text-ink">
                            <span className="w-2.5 h-2.5 rounded-full bg-sobrante inline-block shrink-0" />
                            <span>Sobrante por cierre</span>
                        </div>
                        <div className="flex items-center gap-2 text-ink pt-1 border-t border-line/60">
                            <span className="w-3.5 h-0.5 bg-indigo-600 inline-block shrink-0" />
                            <span>Despacho en tránsito</span>
                        </div>
                        <div className="flex items-center gap-2 text-ink">
                            <span className="w-3.5 h-0.5 border-b border-dashed border-sobrante inline-block shrink-0" />
                            <span>Redistribución sugerida</span>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setMostrarLeyenda(true)}
                        className="bg-surface/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl shadow-md border border-line text-xs font-semibold text-ink hover:text-brand-600 transition-all"
                    >
                        Mostrar simbología
                    </button>
                )}
            </div>
        </div>
    );
}
