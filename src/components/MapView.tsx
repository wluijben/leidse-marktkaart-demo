import React, { useRef, useState } from 'react';
import { MarkerItem, MarkerOverlayStyle } from '../types';
import { MarkerBadge } from './MarkerBadge';
import { 
  Maximize2, 
  Minimize2, 
  Eye, 
  EyeOff
} from 'lucide-react';

interface MapViewProps {
  imageSrc: string;
  markers: MarkerItem[];
  selectedMarker: MarkerItem | null;
  onSelectMarker: (marker: MarkerItem) => void;
  imageDimensions: { width: number; height: number };
  focusedMarker: MarkerItem | null;
  isCalibrating?: boolean;
  onMarkerDrag?: (markerId: string, newX: number, newY: number) => void;
  overlayStyle?: MarkerOverlayStyle;
  markerOpacity?: number;
  markerSize?: number;
  showMarkers?: boolean;
  onToggleShowMarkers?: () => void;
  onMapClickAdd?: (xPercent: number, yPercent: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  imageSrc,
  markers,
  selectedMarker,
  onSelectMarker,
  imageDimensions,
  focusedMarker,
  isCalibrating = false,
  onMarkerDrag,
  overlayStyle = 'solid',
  markerOpacity = 1,
  markerSize = 1,
  showMarkers = true,
  onToggleShowMarkers,
  onMapClickAdd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  
  const [hoveredMarker, setHoveredMarker] = useState<MarkerItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      id="leiden-map-viewport"
      className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center select-none"
    >
      {/* Background Subtle Grid Texture */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating Control Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-xl">
        {/* Toggle Markers Visibility */}
        <button
          id="map-toggle-markers-btn"
          onClick={onToggleShowMarkers}
          className={`p-2 rounded-lg transition-colors ${
            !showMarkers 
              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
              : 'text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
          title={showMarkers ? 'Hide Interactive Markers' : 'Show Interactive Markers'}
        >
          {showMarkers ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-rose-400" />}
        </button>

        <button
          id="map-toggle-fullscreen-btn"
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Helper Status (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 shadow-lg pointer-events-none">
        <span className={`font-semibold ${showMarkers ? 'text-emerald-400' : 'text-rose-400'}`}>
          {showMarkers ? `${markers.length} markers active` : 'Markers Hidden'}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Map Locked · Drag badges to position</span>
      </div>

      {/* Static Fixed Map Container */}
      <div
        id="map-fixed-container"
        className="relative flex items-center justify-center max-w-full max-h-full p-2"
      >
        {/* Relative Positioning Canvas / Image Container */}
        <div
          ref={imageWrapperRef}
          id="map-image-wrapper"
          className="relative inline-block shadow-2xl rounded-lg overflow-hidden bg-slate-900 border border-slate-700 select-none"
          style={{
            aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
            maxHeight: 'calc(100vh - 72px)',
            maxWidth: '100vw',
          }}
        >
          {/* Base Map Image */}
          <img
            id="extracted-map-image"
            src={imageSrc}
            alt="Leiden Market Map"
            className="w-full h-full object-contain block select-none pointer-events-none"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('extracted_map.png')) {
                target.src = '/extracted_map.png';
              }
            }}
          />

          {/* Markers Overlay Layer */}
          {showMarkers && (
            <div id="markers-overlay-container" className="absolute inset-0">
              {markers.map((marker) => {
                const isSelected = selectedMarker?.id === marker.id;
                const isHovered = hoveredMarker?.id === marker.id;

                return (
                  <MarkerBadge
                    key={marker.id}
                    marker={marker}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    onSelect={onSelectMarker}
                    onHover={setHoveredMarker}
                    isCalibrating={isCalibrating}
                    onMarkerDrag={onMarkerDrag}
                    overlayStyle={overlayStyle}
                    markerOpacity={markerOpacity}
                    markerSize={markerSize}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

