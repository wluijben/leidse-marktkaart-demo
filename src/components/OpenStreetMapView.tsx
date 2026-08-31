import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MarkerItem, AnchorItem, MapViewState } from '../types';
import { Focus, Eye, EyeOff, Maximize2, Satellite, Map as MapIcon, Layers } from 'lucide-react';

interface OpenStreetMapViewProps {
  markers: MarkerItem[];
  anchors: AnchorItem[];
  selectedMarker: MarkerItem | null;
  onSelectMarker: (marker: MarkerItem | null) => void;
  onMarkerDrag: (markerId: string, lat: number, lng: number, xPercent?: number, yPercent?: number) => void;
  onAnchorDrag: (anchorId: string, lat: number, lng: number) => void;
  onViewChange?: (view: MapViewState) => void;
  showMarkers?: boolean;
  onToggleShowMarkers?: () => void;
  markerSize?: number;
}

export const DEFAULT_ANCHORS: AnchorItem[] = [
  {
    id: 'anchor-koornbrug',
    name: 'Koornbrug',
    lat: 52.157994,
    lng: 4.491849,
    color: '#6366f1', // Indigo
    border: '#a5b4fc',
  },
  {
    id: 'anchor-nieuwe-rijn',
    name: 'Nieuwe Rijn',
    lat: 52.157587,
    lng: 4.493298,
    color: '#0284c7', // Sky Blue
    border: '#7dd3fc',
  },
  {
    id: 'anchor-botermarkt',
    name: 'Botermarkt',
    lat: 52.157176,
    lng: 4.491716,
    color: '#f59e0b', // Amber / Gold
    border: '#fde68a',
  },
  {
    id: 'anchor-karnemelksbrug',
    name: 'Karnemelksbrug',
    lat: 52.156957,
    lng: 4.493961,
    color: '#e11d48', // Rose / Red
    border: '#fecdd3',
  }
];

// Spacious Square / Rectangular focus bounding box around Leiden Market & surrounding context
// Perfectly encloses Koornbrug (N), Nieuwe Rijn (E), Karnemelksbrug/Gangetje (S), Botermarkt (W)
export const MARKET_FOCUS_SQUARE: [number, number][] = [
  [52.15875, 4.49020], // NW corner
  [52.15875, 4.49480], // NE corner
  [52.15610, 4.49480], // SE corner
  [52.15610, 4.49020], // SW corner
];

// Inverse mask: World outer ring + Market inner square hole
const WORLD_MASK_RING: [number, number][] = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
];

// Broad limits for smooth panning without drifting away
const LEIDEN_MARKET_MAX_BOUNDS = L.latLngBounds(
  [52.15300, 4.48200], // South-West limit
  [52.16100, 4.50200]  // North-East limit
);

const LEIDEN_BOUNDS = {
  north: 52.15850,
  south: 52.15650,
  west: 4.49100,
  east: 4.49450,
};

const DEFAULT_CENTER: [number, number] = [52.15742, 4.49250];
const DEFAULT_ZOOM = 18.25;

// High-speed, high-zoom, reliable tile layers with NO API KEY and NO watermarks
type TileMode = 'google-streets' | 'osm' | 'google-hybrid';

const TILE_CONFIGS: Record<TileMode, { name: string; url: string; subdomains?: string[]; attribution: string; maxNativeZoom: number; maxZoom: number }> = {
  'google-streets': {
    name: 'Straten',
    // Clean Google Maps street tiles: clear canals, clean roads, high zoom clarity, NO API KEY REQUIRED
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
    maxNativeZoom: 20,
    maxZoom: 22,
  },
  'osm': {
    name: 'OSM',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  'google-hybrid': {
    name: 'Satelliet',
    // Google Satellite + Street labels hybrid: crisp photographic imagery at high zoom
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
    maxNativeZoom: 20,
    maxZoom: 22,
  }
};

export const OpenStreetMapView: React.FC<OpenStreetMapViewProps> = ({
  markers,
  anchors,
  selectedMarker,
  onSelectMarker,
  onMarkerDrag,
  onAnchorDrag,
  onViewChange,
  showMarkers = true,
  markerSize = 0.75,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const borderLayerRef = useRef<L.Polygon | null>(null);
  const markerLayersRef = useRef<Map<string, L.Marker>>(new Map());
  const anchorLayersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);

  // Map view mode: Google street tiles are crisp, reliable, and free of noisy watermarks
  const [mapMode, setMapMode] = useState<TileMode>('google-streets');

  // Solid black mask outside the square (1.0 = solid pitch black)
  const [maskOpacity, setMaskOpacity] = useState<number>(1.0);
  const [showBorderGlow, setShowBorderGlow] = useState<boolean>(true);

  // Helper to emit view changes
  const notifyViewChange = useCallback((map: L.Map) => {
    if (!onViewChange) return;
    const center = map.getCenter();
    const zoom = Number(map.getZoom().toFixed(2));
    const bounds = map.getBounds();
    setCurrentZoom(zoom);
    onViewChange({
      center: {
        lat: Number(center.lat.toFixed(6)),
        lng: Number(center.lng.toFixed(6)),
      },
      zoom,
      bounds: {
        north: Number(bounds.getNorth().toFixed(6)),
        south: Number(bounds.getSouth().toFixed(6)),
        east: Number(bounds.getEast().toFixed(6)),
        west: Number(bounds.getWest().toFixed(6)),
      }
    });
  }, [onViewChange]);

  // Center strictly back to the Market Square (Mobile & Desktop optimized)
  const handleResetToMarket = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const isMobile = window.innerWidth < 640;
    const bounds = L.latLngBounds(MARKET_FOCUS_SQUARE);
    map.fitBounds(bounds, {
      padding: isMobile ? [10, 10] : [25, 25],
      maxZoom: isMobile ? 18.25 : 18.75,
      animate: true,
      duration: 0.5,
    });
  }, []);

  // Initialize Leaflet Map with mobile-first spacious square view
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const isMobile = window.innerWidth < 640;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: isMobile ? 18.0 : DEFAULT_ZOOM,
      minZoom: 15,
      maxZoom: 22,
      maxBounds: LEIDEN_MARKET_MAX_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      zoomSnap: 0.1,
      zoomDelta: 0.25,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: false,
      scrollWheelZoom: true,
      boxZoom: true,
      keyboard: true,
    });

    const initialConfig = TILE_CONFIGS[mapMode];
    const tileLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      subdomains: initialConfig.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
      maxNativeZoom: initialConfig.maxNativeZoom,
      maxZoom: initialConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Fit view comfortably around the square market area with mobile-friendly padding
    const marketBounds = L.latLngBounds(MARKET_FOCUS_SQUARE);
    map.fitBounds(marketBounds, {
      padding: isMobile ? [10, 10] : [25, 25],
      maxZoom: isMobile ? 18.25 : 18.75,
      animate: false,
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    // View state listeners
    const handleMoveOrZoom = () => {
      notifyViewChange(map);
    };

    map.on('moveend', handleMoveOrZoom);
    map.on('zoomend', handleMoveOrZoom);

    // Initial notify
    setTimeout(() => {
      map.invalidateSize();
      notifyViewChange(map);
    }, 150);

    // Responsive resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.off('moveend', handleMoveOrZoom);
      map.off('zoomend', handleMoveOrZoom);
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, [notifyViewChange]);

  // Handle layer switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = TILE_CONFIGS[mapMode];
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
      maxNativeZoom: config.maxNativeZoom,
      maxZoom: config.maxZoom,
    }).addTo(map);

    // Ensure tile layer is behind the mask polygon
    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
  }, [mapMode, mapReady]);

  // 1. Draw Solid Black Inverse Mask Outside the Square Focus Box
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Remove previous mask layer if any
    if (maskLayerRef.current) {
      map.removeLayer(maskLayerRef.current);
      maskLayerRef.current = null;
    }
    if (borderLayerRef.current) {
      map.removeLayer(borderLayerRef.current);
      borderLayerRef.current = null;
    }

    if (maskOpacity > 0) {
      // Leaflet hole polygon: [outerRing, innerSquare]
      const maskPolygon = L.polygon([WORLD_MASK_RING, MARKET_FOCUS_SQUARE], {
        color: '#000000',
        fillColor: '#000000',
        fillOpacity: maskOpacity,
        weight: 0,
        interactive: false,
        pane: 'overlayPane',
      }).addTo(map);

      maskLayerRef.current = maskPolygon;
    }

    if (showBorderGlow) {
      // Clean golden / amber square boundary frame
      const borderPolygon = L.polygon(MARKET_FOCUS_SQUARE, {
        color: '#f59e0b',
        weight: 2,
        opacity: 0.9,
        fill: false,
        dashArray: '6, 6',
        interactive: false,
        pane: 'overlayPane',
      }).addTo(map);

      borderLayerRef.current = borderPolygon;
    }
  }, [mapReady, maskOpacity, showBorderGlow]);

  // 2. Plot Anchors with pure text labels (no emojis, no coordinates on badge)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const currentAnchorIds = new Set(anchors.map((a) => a.id));

    // Remove obsolete anchors
    anchorLayersRef.current.forEach((leafletAnchor, id) => {
      if (!currentAnchorIds.has(id)) {
        map.removeLayer(leafletAnchor);
        anchorLayersRef.current.delete(id);
      }
    });

    anchors.forEach((anchor) => {
      let existingAnchor = anchorLayersRef.current.get(anchor.id);

      // Clean text badge without emojis and without coordinates
      const customHtml = `
        <div class="anchor-pin-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -100%); cursor: grab; pointer-events: auto; user-select: none;">
          <!-- Clean Text Anchor Badge -->
          <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid ${anchor.border}; border-radius: 6px; padding: 2px 7px; box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 8px ${anchor.color}; display: flex; align-items: center; justify-content: center; text-align: center; white-space: nowrap;">
            <span style="font-weight: 800; font-size: 10.5px; color: #ffffff; letter-spacing: 0.03em; text-transform: uppercase;">${anchor.name}</span>
          </div>

          <!-- Anchor Teardrop Pin Indicator -->
          <div style="position: relative; width: 22px; height: 22px; margin-top: -1px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="${anchor.color}" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6));">
              <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
            </svg>
            <div style="position: absolute; top: 5.5px; width: 5.5px; height: 5.5px; background: #ffffff; border-radius: 9999px;"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-anchor-leaflet-pin',
        html: customHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      if (existingAnchor) {
        existingAnchor.setIcon(customIcon);
        const curPos = existingAnchor.getLatLng();
        if (Math.abs(curPos.lat - anchor.lat) > 0.000002 || Math.abs(curPos.lng - anchor.lng) > 0.000002) {
          existingAnchor.setLatLng([anchor.lat, anchor.lng]);
        }
      } else {
        const leafletAnchor = L.marker([anchor.lat, anchor.lng], {
          icon: customIcon,
          draggable: true,
          autoPan: false,
          zIndexOffset: 9000,
        }).addTo(map);

        leafletAnchor.bindTooltip(
          `<b>${anchor.name}</b>`,
          { direction: 'top', offset: [0, -28], opacity: 0.95 }
        );

        leafletAnchor.on('dragend', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          onAnchorDrag(
            anchor.id,
            Number(newPos.lat.toFixed(6)),
            Number(newPos.lng.toFixed(6))
          );
        });

        anchorLayersRef.current.set(anchor.id, leafletAnchor);
      }
    });
  }, [anchors, mapReady, onAnchorDrag]);

  // 3. Plot Market Markers with pure text labels (no emojis, no coordinates on badge)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (!showMarkers) {
      markerLayersRef.current.forEach((m) => map.removeLayer(m));
      markerLayersRef.current.clear();
      return;
    }

    const currentMarkerIds = new Set(markers.map((m) => m.id));

    // Remove obsolete markers
    markerLayersRef.current.forEach((leafletMarker, id) => {
      if (!currentMarkerIds.has(id)) {
        map.removeLayer(leafletMarker);
        markerLayersRef.current.delete(id);
      }
    });

    // Add or update markers directly on the map
    markers.forEach((marker) => {
      let markerLat = marker.lat;
      let markerLng = marker.lng;

      if (!markerLat || !markerLng) {
        markerLng = LEIDEN_BOUNDS.west + (marker.x_percent / 100) * (LEIDEN_BOUNDS.east - LEIDEN_BOUNDS.west);
        markerLat = LEIDEN_BOUNDS.north - (marker.y_percent / 100) * (LEIDEN_BOUNDS.north - LEIDEN_BOUNDS.south);
      }

      const isSelected = selectedMarker?.id === marker.id;
      const isStall = marker.type === 'stall';
      const isBridge = marker.type === 'bridge';

      // Clean styling with high contrast
      let bgStyle = 'background: #f59e0b; color: #020617; border: 1.5px solid #ffffff;';
      if (!isStall) {
        bgStyle = isBridge 
          ? 'background: #7c3aed; color: #ffffff; border: 1.5px solid #ffffff;' 
          : 'background: #059669; color: #ffffff; border: 1.5px solid #ffffff;' ;
      }

      // Badge size optimized for mobile touch targets
      const badgeSize = isStall ? Math.max(20, Math.round(24 * markerSize)) : Math.round(22 * markerSize);
      const fontPx = isStall ? '10px' : '9.5px';

      // Pure text badges - NO coordinates, NO emojis
      const customHtml = isStall ? `
        <div class="stall-marker-layer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: grab; user-select: none;">
          <div style="width: ${badgeSize}px; height: ${badgeSize}px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontPx}; font-family: ui-sans-serif, system-ui, sans-serif; ${bgStyle} box-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 6px rgba(245,158,11,0.5); ${isSelected ? 'outline: 3px solid #0284c7; transform: scale(1.3); z-index: 9999;' : ''}">
            ${marker.text}
          </div>
        </div>
      ` : `
        <div class="landmark-marker-layer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: grab; user-select: none;">
          <div style="padding: 2.5px 7px; border-radius: 4px; font-weight: 800; font-size: ${fontPx}; font-family: ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; white-space: nowrap; ${bgStyle} box-shadow: 0 2px 6px rgba(0,0,0,0.5); ${isSelected ? 'outline: 2.5px solid #0284c7; transform: scale(1.2); z-index: 9999;' : ''}">
            ${marker.text}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-stall-marker-icon',
        html: customHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      let existing = markerLayersRef.current.get(marker.id);

      if (existing) {
        existing.setIcon(customIcon);
        const curPos = existing.getLatLng();
        if (Math.abs(curPos.lat - markerLat) > 0.000002 || Math.abs(curPos.lng - markerLng) > 0.000002) {
          existing.setLatLng([markerLat, markerLng]);
        }
      } else {
        const leafletMarker = L.marker([markerLat, markerLng], {
          icon: customIcon,
          draggable: true,
          autoPan: false,
          zIndexOffset: isStall ? 500 : 1000,
        }).addTo(map);

        leafletMarker.bindTooltip(
          `<b>${isStall ? 'Kraam ' : ''}${marker.text}</b>`,
          { direction: 'top', offset: [0, -10], opacity: 0.95 }
        );

        leafletMarker.on('click', () => {
          onSelectMarker(marker);
        });

        leafletMarker.on('dragend', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          const xPercent = ((newPos.lng - LEIDEN_BOUNDS.west) / (LEIDEN_BOUNDS.east - LEIDEN_BOUNDS.west)) * 100;
          const yPercent = ((LEIDEN_BOUNDS.north - newPos.lat) / (LEIDEN_BOUNDS.north - LEIDEN_BOUNDS.south)) * 100;

          onMarkerDrag(
            marker.id,
            Number(newPos.lat.toFixed(6)),
            Number(newPos.lng.toFixed(6)),
            Math.max(0, Math.min(100, Number(xPercent.toFixed(3)))),
            Math.max(0, Math.min(100, Number(yPercent.toFixed(3))))
          );
        });

        markerLayersRef.current.set(marker.id, leafletMarker);
      }
    });
  }, [markers, selectedMarker, showMarkers, markerSize, mapReady, onMarkerDrag, onSelectMarker]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Leaflet Map */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-osm-container" 
        className="w-full h-full z-0 cursor-default bg-black"
      />

      {/* Floating Toolbar with Mobile-first responsive layout */}
      <div 
        id="market-focus-toolbar"
        className="absolute top-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-none z-30 flex flex-wrap items-center justify-between sm:justify-start gap-1.5 p-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl text-xs font-semibold text-slate-200"
      >
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 font-bold">
          <Focus className="w-3.5 h-3.5 text-amber-400" />
          <span>Leidse Markt</span>
          <span className="text-[10px] font-mono text-amber-400/80 bg-amber-400/10 px-1 py-0.2 rounded">
            z{currentZoom.toFixed(1)}
          </span>
        </div>

        {/* Map View Mode Selector */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700">
          <button
            id="tile-google-streets-btn"
            onClick={() => setMapMode('google-streets')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mapMode === 'google-streets'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Google Maps stratenkaart"
          >
            <MapIcon className="w-3 h-3" />
            <span>Straten</span>
          </button>

          <button
            id="tile-osm-btn"
            onClick={() => setMapMode('osm')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mapMode === 'osm'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="OpenStreetMap"
          >
            <Layers className="w-3 h-3" />
            <span>OSM</span>
          </button>

          <button
            id="tile-hybrid-btn"
            onClick={() => setMapMode('google-hybrid')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mapMode === 'google-hybrid'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Satellietbeeld"
          >
            <Satellite className="w-3 h-3" />
            <span>Satelliet</span>
          </button>
        </div>

        {/* Square Mask Opacity Toggle */}
        <button
          id="square-mask-toggle-btn"
          onClick={() => setMaskOpacity((prev) => (prev > 0.5 ? 0 : 1.0))}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            maskOpacity > 0 
              ? 'bg-slate-800 text-amber-300 border border-slate-700' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title={maskOpacity > 0 ? "Buiten het vierkant is zwart gemaskeerd" : "Buitenregio tonen"}
        >
          {maskOpacity > 0 ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{maskOpacity > 0 ? 'Zwart masker: Aan' : 'Zwart masker: Uit'}</span>
          <span className="sm:hidden">{maskOpacity > 0 ? 'Masker' : 'Masker uit'}</span>
        </button>

        {/* Re-center strictly to Market Area */}
        <button
          onClick={handleResetToMarket}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Hercentreer op de markt"
        >
          <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Centreer markt</span>
          <span className="sm:hidden">Centreer</span>
        </button>
      </div>

      {/* Floating Legend for the Market Corridor (Text Only - No Unicode Emojis) */}
      <div 
        id="market-corridor-legend"
        className="absolute bottom-3 left-3 z-30 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-lg text-[11px] text-slate-300"
      >
        <span className="flex items-center gap-1 font-bold text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Marktzone:</span>
        </span>
        <span>Koornbrug</span>
        <span>•</span>
        <span>Nieuwe Rijn</span>
        <span>•</span>
        <span>Botermarkt</span>
        <span>•</span>
        <span>Gangetje</span>
        <span>•</span>
        <span>Karnemelksbrug</span>
      </div>
    </div>
  );
};
