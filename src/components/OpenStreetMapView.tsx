import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MarkerItem, AnchorItem } from '../types';
import { Focus, Eye, EyeOff, Maximize2 } from 'lucide-react';

interface OpenStreetMapViewProps {
  markers: MarkerItem[];
  anchors: AnchorItem[];
  selectedMarker: MarkerItem | null;
  onSelectMarker: (marker: MarkerItem | null) => void;
  onMarkerDrag: (markerId: string, lat: number, lng: number, xPercent?: number, yPercent?: number) => void;
  onAnchorDrag: (anchorId: string, lat: number, lng: number) => void;
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

// Delineated Leiden Market Perimeter:
// Covers Koornbrug -> Nieuwe Rijn -> Sint Sebastiaansbrug -> Karnemelksbrug -> Gangetje -> Botermarkt
export const MARKET_FOCUS_POLYGON: [number, number][] = [
  [52.15830, 4.49140], // NW: Koornbrug North bank approach
  [52.15822, 4.49240], // N: Nieuwe Rijn north quay
  [52.15788, 4.49385], // NE: Approaching Sint Sebastiaansbrug
  [52.15765, 4.49448], // E: Sint Sebastiaansbrug bridgehead
  [52.15725, 4.49458], // E: Steenschuur corner
  [52.15685, 4.49442], // SE: Karnemelksbrug east edge
  [52.15638, 4.49418], // SE: Karnemelksbrug south quay
  [52.15628, 4.49365], // S: Gangetje south exit
  [52.15632, 4.49290], // SW: Gangetje / Steenschuur turn
  [52.15690, 4.49170], // SW: Botermarkt west perimeter
  [52.15760, 4.49130], // W: Nieuwe Rijn west entrance
  [52.15810, 4.49125], // W: Koornbrug west landing
];

// Inverse mask: World outer ring + Market inner hole
const WORLD_MASK_RING: [number, number][] = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
];

// Strict bounds for Leiden Market to prevent scrolling away
const LEIDEN_MARKET_MAX_BOUNDS = L.latLngBounds(
  [52.15580, 4.49000], // South-West limit
  [52.15890, 4.49580]  // North-East limit
);

const LEIDEN_BOUNDS = {
  north: 52.15850,
  south: 52.15650,
  west: 4.49100,
  east: 4.49450,
};

const DEFAULT_CENTER: [number, number] = [52.15740, 4.49270];
const DEFAULT_ZOOM = 18.5;

export const OpenStreetMapView: React.FC<OpenStreetMapViewProps> = ({
  markers,
  anchors,
  selectedMarker,
  onSelectMarker,
  onMarkerDrag,
  onAnchorDrag,
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

  // Mask display options
  const [maskOpacity, setMaskOpacity] = useState<number>(0.96); // 0.96 = solid dark outside
  const [showBorderGlow, setShowBorderGlow] = useState<boolean>(true);

  // Initialize Leaflet Map with constrained view
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 17,
      maxZoom: 21,
      maxBounds: LEIDEN_MARKET_MAX_BOUNDS,
      maxBoundsViscosity: 0.9,
      zoomControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: false,
      scrollWheelZoom: true,
      boxZoom: true,
      keyboard: true,
    });

    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: 21,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Fit view comfortably around the market polygon with clean margin
    const marketBounds = L.latLngBounds(MARKET_FOCUS_POLYGON);
    map.fitBounds(marketBounds, {
      padding: [45, 45],
      maxZoom: 19,
      animate: false,
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // 1. Draw Inverse Polygon Mask (Solid Dark Outside Leiden Market Area)
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
      // Leaflet hole polygon: [outerRing, innerRing]
      const maskPolygon = L.polygon([WORLD_MASK_RING, MARKET_FOCUS_POLYGON], {
        color: '#020617',
        fillColor: '#020617',
        fillOpacity: maskOpacity,
        weight: 0,
        interactive: false,
        pane: 'overlayPane',
      }).addTo(map);

      maskLayerRef.current = maskPolygon;
    }

    if (showBorderGlow) {
      // Amber dashed boundary line highlighting the Leiden market zone
      const borderPolygon = L.polygon(MARKET_FOCUS_POLYGON, {
        color: '#f59e0b',
        weight: 2,
        opacity: 0.85,
        fill: false,
        dashArray: '5, 5',
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
          <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid ${anchor.border}; border-radius: 6px; padding: 3px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.8), 0 0 8px ${anchor.color}; display: flex; align-items: center; justify-content: center; text-align: center; white-space: nowrap;">
            <span style="font-weight: 800; font-size: 11px; color: #ffffff; letter-spacing: 0.03em; text-transform: uppercase;">${anchor.name}</span>
          </div>

          <!-- Anchor Teardrop Pin Indicator -->
          <div style="position: relative; width: 24px; height: 24px; margin-top: -1px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="${anchor.color}" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8));">
              <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
            </svg>
            <div style="position: absolute; top: 6px; width: 6px; height: 6px; background: #ffffff; border-radius: 9999px;"></div>
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
          { direction: 'top', offset: [0, -30], opacity: 0.95 }
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

      // Clean styling
      let bgStyle = 'background: #f59e0b; color: #020617; border: 1.5px solid #fef08a;';
      if (!isStall) {
        bgStyle = isBridge 
          ? 'background: #7c3aed; color: #ffffff; border: 1.5px solid #c4b5fd;' 
          : 'background: #059669; color: #ffffff; border: 1.5px solid #6ee7b7;';
      }

      // Badge size
      const badgeSize = isStall ? Math.max(18, Math.round(24 * markerSize)) : Math.round(22 * markerSize);
      const fontPx = isStall ? '10px' : '9.5px';

      // Pure text badges - NO coordinates, NO emojis
      const customHtml = isStall ? `
        <div class="stall-marker-layer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: grab; user-select: none;">
          <div style="width: ${badgeSize}px; height: ${badgeSize}px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontPx}; font-family: ui-sans-serif, system-ui, sans-serif; ${bgStyle} box-shadow: 0 2px 6px rgba(0,0,0,0.8), 0 0 6px rgba(245,158,11,0.5); ${isSelected ? 'outline: 2.5px solid #ffffff; transform: scale(1.3); z-index: 9999;' : ''}">
            ${marker.text}
          </div>
        </div>
      ` : `
        <div class="landmark-marker-layer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: grab; user-select: none;">
          <div style="padding: 2.5px 7px; border-radius: 4px; font-weight: 800; font-size: ${fontPx}; font-family: ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; white-space: nowrap; ${bgStyle} box-shadow: 0 2px 6px rgba(0,0,0,0.8); ${isSelected ? 'outline: 2px solid #ffffff; transform: scale(1.2); z-index: 9999;' : ''}">
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

  // Center strictly back to the Leidse Markt Corridor
  const handleResetToMarket = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(MARKET_FOCUS_POLYGON);
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 19,
      animate: true,
      duration: 0.6,
    });
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Leaflet Map */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-osm-container" 
        className="w-full h-full z-0 cursor-default bg-slate-950"
      />

      {/* Floating Focus Area Control Strip */}
      <div 
        id="market-focus-toolbar"
        className="absolute top-3 left-3 z-30 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-xl text-xs font-semibold text-slate-200"
      >
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 font-bold">
          <Focus className="w-3.5 h-3.5 text-amber-400" />
          <span>Leidse Markt</span>
        </div>

        {/* Mask Opacity Mode buttons */}
        <button
          onClick={() => setMaskOpacity((prev) => (prev > 0.5 ? 0 : 0.96))}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            maskOpacity > 0 
              ? 'bg-slate-800 text-amber-300 border border-slate-700' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title={maskOpacity > 0 ? "Buitenregio zwart gemaskeerd (klik om te tonen)" : "Buitenregio tonen (klik om te maskeren)"}
        >
          {maskOpacity > 0 ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{maskOpacity > 0 ? 'Zwart masker: Aan' : 'Zwart masker: Uit'}</span>
        </button>

        {/* Re-center strictly to Market Area */}
        <button
          onClick={handleResetToMarket}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Hercentreer op de markt"
        >
          <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Centreer markt</span>
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
