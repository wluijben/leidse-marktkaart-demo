import React, { useState } from 'react';
import { MarkerItem } from '../types';
import { 
  X, 
  MapPin, 
  Landmark, 
  Navigation, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Crosshair, 
  ShoppingBag,
  Store,
  Compass
} from 'lucide-react';

interface InfoPanelProps {
  marker: MarkerItem | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onFocusMarker: (marker: MarkerItem) => void;
  currentIndex: number;
  totalCount: number;
  imageDimensions: { width: number; height: number };
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  marker,
  onClose,
  onNavigate,
  onFocusMarker,
  currentIndex,
  totalCount,
  imageDimensions,
}) => {
  const [copied, setCopied] = useState(false);

  if (!marker) return null;

  const isStall = marker.type === 'stall';
  const isBridge = marker.type === 'bridge';
  
  // Calculate pixel coordinates based on original base image
  const pixelX = Math.round((marker.x_percent / 100) * imageDimensions.width);
  const pixelY = Math.round((marker.y_percent / 100) * imageDimensions.height);

  const handleCopyCoords = () => {
    const text = `Marker: ${marker.text}, X: ${marker.x_percent}%, Y: ${marker.y_percent}% (px: ${pixelX}, ${pixelY})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="marker-info-panel"
      className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-5 md:p-6 w-full max-w-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold shadow-sm ${
              isBridge
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : isStall
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 text-lg'
                : 'bg-slate-900 text-amber-300 border border-slate-800'
            }`}
          >
            {isBridge ? (
              <Landmark className="w-6 h-6" />
            ) : isStall ? (
              marker.text
            ) : (
              <MapPin className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {isStall ? 'Market Stall' : isBridge ? 'Bridge Monument' : 'District Landmark'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentIndex + 1} of {totalCount}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              {isStall ? `Stall #${marker.text}` : marker.text}
            </h2>
          </div>
        </div>

        <button
          id="close-info-panel-btn"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close panel (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Details */}
      <div className="py-4 space-y-4">
        {/* Category & Zone */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              Category
            </div>
            <div className="text-sm font-semibold text-slate-800 truncate">
              {marker.category || 'Vendor Stand'}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Location Zone
            </div>
            <div className="text-sm font-semibold text-slate-800 truncate">
              {marker.zone || 'Leiden Promenade'}
            </div>
          </div>
        </div>

        {/* Description */}
        {marker.description && (
          <div className="text-sm text-slate-600 leading-relaxed bg-amber-50/50 p-3.5 rounded-xl border border-amber-100/70">
            {marker.description}
          </div>
        )}

        {/* Typical Products / Features */}
        {marker.typicalProducts && marker.typicalProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              Typical Goods & Highlights
            </div>
            <div className="flex flex-wrap gap-1.5">
              {marker.typicalProducts.map((prod, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200/60"
                >
                  {prod}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Precise Relative Coordinates */}
        <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-sans font-medium text-[11px]">
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              Mapped Relative Coordinates
            </span>
            <button
              id="copy-coords-btn"
              onClick={handleCopyCoords}
              className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-200">
            <div className="bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">X:</span>{' '}
              <span className="text-amber-300 font-semibold">{marker.x_percent}%</span>
              <span className="text-slate-500 text-[10px] ml-1">({pixelX}px)</span>
            </div>
            <div className="bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">Y:</span>{' '}
              <span className="text-amber-300 font-semibold">{marker.y_percent}%</span>
              <span className="text-slate-500 text-[10px] ml-1">({pixelY}px)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <button
            id="prev-marker-btn"
            onClick={() => onNavigate('prev')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Previous marker (Left arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            id="next-marker-btn"
            onClick={() => onNavigate('next')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Next marker (Right arrow)"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          id="center-on-map-btn"
          onClick={() => onFocusMarker(marker)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all hover:shadow-lg"
        >
          <Crosshair className="w-4 h-4 text-amber-400" />
          Focus on Map
        </button>
      </div>
    </div>
  );
};
