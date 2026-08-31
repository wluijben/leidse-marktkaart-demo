import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MarkerItem, AnchorItem } from '../types';

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
    lat: 52.15798,
    lng: 4.49195,
    color: '#6366f1', // Indigo
    border: '#a5b4fc',
    icon: '🏛️',
  },
  {
    id: 'anchor-nieuwe-rijn',
    name: 'Nieuwe Rijn',
    lat: 52.15770,
    lng: 4.49194,
    color: '#0284c7', // Sky Blue
    border: '#7dd3fc',
    icon: '🌊',
  },
  {
    id: 'anchor-botermarkt',
    name: 'Botermarkt',
    lat: 52.15747,
    lng: 4.49221,
    color: '#f59e0b', // Amber / Gold
    border: '#fde68a',
    icon: '🧀',
  },
  {
    id: 'anchor-karnemelksbrug',
    name: 'Karnemelksbrug',
    lat: 52.15667,
    lng: 4.49361,
    color: '#e11d48', // Rose / Red
    border: '#fecdd3',
    icon: '🌉',
  }
];

// Leiden Market Approximate Bounding Box
const LEIDEN_BOUNDS = {
  north: 52.15850,
  south: 52.15650,
  west: 4.49100,
  east: 4.49450,
};

const DEFAULT_CENTER: [number, number] = [52.15735, 4.49275];
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
  const markerLayersRef = useRef<Map<string, L.Marker>>(new Map());
  const anchorLayersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 15,
      maxZoom: 22,
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
      maxZoom: 22,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Calculate initial bounds from anchors
    if (anchors.length > 0) {
      const bounds = L.latLngBounds(anchors.map((a) => [a.lat, a.lng]));
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 18.5,
        animate: false,
      });
    }

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

  // 1. Plot & Enable Dragging on the 4 Anchors
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

      const customHtml = `
        <div class="anchor-pin-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -100%); cursor: grab; pointer-events: auto; user-select: none;">
          <!-- Anchor Badge with Name & Moveable Lat/Long Coords -->
          <div style="background: rgba(15, 23, 42, 0.96); border: 2px solid ${anchor.border}; border-radius: 6px; padding: 2.5px 7px; box-shadow: 0 4px 14px rgba(0,0,0,0.85), 0 0 10px ${anchor.color}; display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 110px; text-align: center; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-weight: 800; font-size: 11px; color: #ffffff; letter-spacing: -0.01em;">
              <span>${anchor.icon}</span>
              <span style="color: ${anchor.border}; text-transform: uppercase;">${anchor.name}</span>
            </div>
            <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 9.5px; font-weight: 700; color: #fde047; letter-spacing: -0.02em; background: rgba(0,0,0,0.55); padding: 1px 4px; border-radius: 3px; width: 100%;">
              ${anchor.lat.toFixed(5)}°N, ${anchor.lng.toFixed(5)}°E
            </div>
          </div>

          <!-- Anchor Teardrop Pin Indicator -->
          <div style="position: relative; width: 26px; height: 26px; margin-top: -1px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="${anchor.color}" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));">
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
          `<b>⚓ ANCHOR: ${anchor.name} (Draggable)</b><br/>Lat: ${anchor.lat.toFixed(5)}° N<br/>Lng: ${anchor.lng.toFixed(5)}° E<br/><span style="color:#93c5fd;font-size:10px;">Drag to adjust anchor coordinate</span>`,
          { direction: 'top', offset: [0, -32], opacity: 0.95 }
        );

        leafletAnchor.on('drag', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          // Update tooltip while dragging
          leafletAnchor.setTooltipContent(
            `<b>⚓ ANCHOR: ${anchor.name}</b><br/>Lat: ${newPos.lat.toFixed(5)}° N<br/>Lng: ${newPos.lng.toFixed(5)}° E`
          );
        });

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

  // 2. Plot the Mini Market Markers layer above the map
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

      // Image coordinates
      const imgX = Math.round((marker.x_percent / 100) * 1614);
      const imgY = Math.round((marker.y_percent / 100) * 2481);

      // Mini Badge sizing & style
      let bgStyle = 'background: #f59e0b; color: #020617; border: 1.5px solid #fef08a;';
      if (!isStall) {
        bgStyle = isBridge 
          ? 'background: #7c3aed; color: #ffffff; border: 1.5px solid #c4b5fd;' 
          : 'background: #059669; color: #ffffff; border: 1.5px solid #6ee7b7;';
      }

      // Mini badge size
      const badgeSize = isStall ? Math.max(17, Math.round(24 * markerSize)) : Math.round(22 * markerSize);
      const fontPx = isStall ? '10px' : '9.5px';

      const customHtml = isStall ? `
        <div class="stall-marker-layer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: grab; user-select: none;">
          <!-- Mini Number Badge -->
          <div style="width: ${badgeSize}px; height: ${badgeSize}px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontPx}; font-family: ui-sans-serif, system-ui, sans-serif; ${bgStyle} box-shadow: 0 2px 6px rgba(0,0,0,0.8), 0 0 6px rgba(245,158,11,0.5); ${isSelected ? 'outline: 2.5px solid #ffffff; transform: scale(1.3); z-index: 9999;' : ''}">
            ${marker.text}
          </div>
        </div>
      ` : `
        <div class="landmark-marker-layer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: grab; user-select: none;">
          <div style="padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: ${fontPx}; font-family: ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; white-space: nowrap; ${bgStyle} box-shadow: 0 2px 6px rgba(0,0,0,0.8); ${isSelected ? 'outline: 2px solid #ffffff; transform: scale(1.2); z-index: 9999;' : ''}">
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
          `<b>${isStall ? 'Stall #' : ''}${marker.text}</b><br/>
           <span style="color:#93c5fd;font-family:monospace;font-size:10px;">Image: (${imgX}px, ${imgY}px) [${marker.x_percent}%, ${marker.y_percent}%]</span><br/>
           <span style="color:#fde047;font-family:monospace;font-size:10px;">GPS: ${markerLat.toFixed(6)}, ${markerLng.toFixed(6)}</span>`,
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
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Leaflet Map */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-osm-container" 
        className="w-full h-full z-0 cursor-default"
      />
    </div>
  );
};
