import React, { useRef, useState, useEffect } from 'react';
import { MarkerItem, MarkerOverlayStyle } from '../types';
import { MapPin, Landmark, Move, Target } from 'lucide-react';

interface MarkerBadgeProps {
  marker: MarkerItem;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (marker: MarkerItem) => void;
  onHover: (marker: MarkerItem | null) => void;
  isCalibrating?: boolean;
  onMarkerDrag?: (markerId: string, newX: number, newY: number) => void;
  overlayStyle?: MarkerOverlayStyle;
  markerSize?: number; // 0.8 to 1.5 scale multiplier
  markerOpacity?: number; // 0.2 to 1.0
}

export const MarkerBadge: React.FC<MarkerBadgeProps> = ({
  marker,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isCalibrating = false,
  onMarkerDrag,
  overlayStyle = 'solid',
  markerSize = 1,
  markerOpacity = 1,
}) => {
  const isStall = marker.type === 'stall';
  const isBridge = marker.type === 'bridge';
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isDraggingThis, setIsDraggingThis] = useState(false);

  // Palette color by stall range or category
  const getColorScheme = () => {
    if (isBridge) {
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-300',
        ring: 'ring-amber-400',
        text: 'text-white',
        ringStyle: 'border-amber-400 text-amber-900 bg-amber-400/20',
        glowStyle: 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] text-amber-300 bg-slate-950/80',
      };
    }
    if (!isStall) {
      return {
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        ring: 'ring-slate-400',
        text: 'text-amber-300',
        ringStyle: 'border-slate-800 text-slate-900 bg-slate-900/20',
        glowStyle: 'border-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)] text-amber-200 bg-slate-950/80',
      };
    }
    const num = parseInt(marker.text, 10);
    if (num <= 45) {
      return {
        bg: 'bg-emerald-600',
        border: 'border-emerald-300',
        ring: 'ring-emerald-400',
        text: 'text-white',
        ringStyle: 'border-emerald-500 text-emerald-900 bg-emerald-500/20',
        glowStyle: 'border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] text-emerald-300 bg-slate-950/80',
      };
    }
    if (num <= 53) {
      return {
        bg: 'bg-sky-600',
        border: 'border-sky-300',
        ring: 'ring-sky-400',
        text: 'text-white',
        ringStyle: 'border-sky-500 text-sky-900 bg-sky-500/20',
        glowStyle: 'border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.8)] text-sky-300 bg-slate-950/80',
      };
    }
    if (num <= 60) {
      return {
        bg: 'bg-purple-600',
        border: 'border-purple-300',
        ring: 'ring-purple-400',
        text: 'text-white',
        ringStyle: 'border-purple-500 text-purple-900 bg-purple-500/20',
        glowStyle: 'border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)] text-purple-300 bg-slate-950/80',
      };
    }
    if (num <= 70) {
      return {
        bg: 'bg-amber-600',
        border: 'border-amber-300',
        ring: 'ring-amber-400',
        text: 'text-white',
        ringStyle: 'border-amber-500 text-amber-900 bg-amber-500/20',
        glowStyle: 'border-amber-400 shadow-[0_0_12px_rgba(217,119,6,0.8)] text-amber-300 bg-slate-950/80',
      };
    }
    return {
      bg: 'bg-rose-600',
      border: 'border-rose-300',
      ring: 'ring-rose-400',
      text: 'text-white',
      ringStyle: 'border-rose-500 text-rose-900 bg-rose-500/20',
      glowStyle: 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] text-rose-300 bg-slate-950/80',
    };
  };

  const scheme = getColorScheme();

  // Pointer drag handling: works smoothly in both drag & calibration modes
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    e.preventDefault();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let hasMoved = false;

    const targetElement = e.currentTarget.parentElement; // The map image container
    if (!targetElement) return;

    onSelect(marker);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startClientX);
      const deltaY = Math.abs(moveEvent.clientY - startClientY);

      if (!hasMoved && (deltaX > 2 || deltaY > 2)) {
        hasMoved = true;
        setIsDraggingThis(true);
      }

      if (hasMoved && onMarkerDrag) {
        const rect = targetElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const newXPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const newYPercent = ((moveEvent.clientY - rect.top) / rect.height) * 100;

        const clampedX = Math.max(0, Math.min(100, Number(newXPercent.toFixed(3))));
        const clampedY = Math.max(0, Math.min(100, Number(newYPercent.toFixed(3))));

        onMarkerDrag(marker.id, clampedX, clampedY);
      }
    };

    const onPointerUp = () => {
      setIsDraggingThis(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      ref={badgeRef}
      id={`marker-overlay-${marker.id}`}
      style={{
        left: `${marker.x_percent}%`,
        top: `${marker.y_percent}%`,
        transform: `translate(-50%, -50%) scale(${markerSize})`,
        opacity: markerOpacity,
      }}
      className={`absolute z-10 select-none group transition-transform duration-75 cursor-grab active:cursor-grabbing ${
        isSelected ? 'z-40 scale-110' : isHovered ? 'z-30 scale-105' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(marker);
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => onHover(marker)}
      onMouseLeave={() => onHover(null)}
      title={`${marker.text} (${marker.x_percent}%, ${marker.y_percent}%)`}
    >
      {/* Selected Indicator Ring */}
      {isSelected && (
        <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-pulse pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      )}

      {/* RENDER COMPACT BADGES */}
      {isStall ? (
        overlayStyle === 'ring' ? (
          // HOLLOW RING (Lets you see through directly to the number on the map image)
          <div
            className={`flex items-center justify-center rounded-full font-bold border transition-all ${
              scheme.ringStyle
            } ${
              isSelected
                ? 'w-5 h-5 text-[9px] ring-2 ring-amber-400 bg-amber-400/30'
                : 'w-4 h-4 text-[8px]'
            }`}
          >
            <span className="w-1 h-1 rounded-full bg-current opacity-80" />
          </div>
        ) : overlayStyle === 'glow' ? (
          // GLOW STYLE
          <div
            className={`flex items-center justify-center rounded-full font-bold border transition-all backdrop-blur-[1px] ${
              scheme.glowStyle
            } ${
              isSelected
                ? 'w-5 h-5 text-[9px] ring-2 ring-amber-300'
                : 'w-4 h-4 text-[8px]'
            }`}
          >
            {marker.text}
          </div>
        ) : overlayStyle === 'minimal' ? (
          // MINIMAL TARGET DOT
          <div
            className={`flex items-center justify-center rounded-full border border-white shadow-sm ${scheme.bg} ${
              isSelected
                ? 'w-4 h-4 ring-2 ring-amber-400 text-[8px] text-white font-bold'
                : 'w-3 h-3'
            }`}
          >
            {isSelected && marker.text}
          </div>
        ) : (
          // SOLID FILLED BADGE (Default - Compact & Crisp)
          <div
            className={`flex items-center justify-center rounded-full font-bold shadow-sm border transition-all ${scheme.bg} ${scheme.border} ${scheme.text} ${
              isSelected
                ? 'w-5 h-5 text-[9px] ring-2 ring-amber-400 shadow-md font-black'
                : 'w-4 h-4 text-[8px]'
            }`}
          >
            {marker.text}
          </div>
        )
      ) : (
        // STREET & BRIDGE LANDMARKS (Compact Pill)
        <div
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold tracking-tight uppercase shadow-sm border transition-all ${
            overlayStyle === 'glow' ? scheme.glowStyle : `${scheme.bg} ${scheme.border} ${scheme.text}`
          } ${
            isSelected
              ? 'text-[9px] ring-2 ring-amber-400 shadow-md'
              : 'text-[8px]'
          }`}
        >
          {isBridge ? (
            <Landmark className="w-2.5 h-2.5 text-amber-200" />
          ) : (
            <MapPin className="w-2.5 h-2.5 text-amber-300" />
          )}
          <span className="whitespace-nowrap">{marker.text}</span>
        </div>
      )}

      {/* Mini Floating Tooltip when Hovering or Dragging */}
      {(isHovered || isDraggingThis) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-slate-900/95 text-white text-[10px] font-mono rounded shadow-lg whitespace-nowrap pointer-events-none border border-slate-700 backdrop-blur-sm z-50">
          <span className="text-amber-300 font-bold">{isStall ? `#${marker.text}` : marker.text}</span>
          <span className="text-slate-400 ml-1.5">({marker.x_percent.toFixed(2)}%, {marker.y_percent.toFixed(2)}%)</span>
        </div>
      )}
    </div>
  );
};

