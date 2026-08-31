import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MarkerItem, MarketDataset, AnchorItem } from './types';
import { rawMarketData, parseMarketMarkers } from './data/marketData';
import { OpenStreetMapView, DEFAULT_ANCHORS } from './components/OpenStreetMapView';
import { PrintCoordinatesModal } from './components/PrintCoordinatesModal';
import { 
  Store, 
  Code2
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'leiden_market_dataset_v3_default';
const ANCHORS_STORAGE_KEY = 'leiden_market_anchors_v3_default';

export default function App() {
  const [dataset, setDataset] = useState<MarketDataset>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.markers && parsed.markers.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return rawMarketData;
  });

  const [anchors, setAnchors] = useState<AnchorItem[]>(() => {
    try {
      const saved = localStorage.getItem(ANCHORS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_ANCHORS;
  });

  const [selectedMarker, setSelectedMarker] = useState<MarkerItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showMarkers] = useState(true);
  const [markerSize] = useState<number>(0.65);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Attempt to fetch public/market_data.json on mount if no local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return;
    } catch {
      // ignore
    }

    fetch('/market_data.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Fallback');
      })
      .then((data: MarketDataset) => {
        if (data && data.markers && data.markers.length > 0) {
          setDataset(data);
        }
      })
      .catch(() => {
        // Fallback to rawMarketData
      });
  }, []);

  // Parse all markers
  const allMarkers = useMemo(() => {
    return parseMarketMarkers(dataset);
  }, [dataset]);

  // Keep selectedMarker in sync
  useEffect(() => {
    if (selectedMarker) {
      const updated = allMarkers.find((m) => m.id === selectedMarker.id);
      if (updated) {
        setSelectedMarker(updated);
      }
    }
  }, [allMarkers, selectedMarker?.id]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedMarker(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Direct drag update for a specific marker on OpenStreetMap
  const handleOsmMarkerDrag = useCallback((markerId: string, lat: number, lng: number, xPercent?: number, yPercent?: number) => {
    setDataset((prev) => {
      const markerIndex = prev.markers.findIndex((_, idx) => {
        return `marker-${idx}-${_.text.trim().toUpperCase()}` === markerId;
      });

      if (markerIndex === -1) return prev;

      const newMarkers = [...prev.markers];
      newMarkers[markerIndex] = {
        ...newMarkers[markerIndex],
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        x_percent: xPercent !== undefined ? Number(xPercent.toFixed(3)) : newMarkers[markerIndex].x_percent,
        y_percent: yPercent !== undefined ? Number(yPercent.toFixed(3)) : newMarkers[markerIndex].y_percent,
      };

      const updated = {
        ...prev,
        markers: newMarkers,
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Direct drag update for an Anchor on OpenStreetMap
  const handleAnchorDrag = useCallback((anchorId: string, lat: number, lng: number) => {
    setAnchors((prev) => {
      const updated = prev.map((a) => {
        if (a.id === anchorId) {
          return {
            ...a,
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
          };
        }
        return a;
      });

      try {
        localStorage.setItem(ANCHORS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Download calibrated JSON
  const handleDownloadJson = () => {
    const exportPayload = {
      anchors: anchors.map((a) => ({
        id: a.id,
        name: a.name,
        lat: a.lat,
        lng: a.lng,
      })),
      ...dataset,
    };
    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leiden_market_coordinates.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      
      {/* Clean Top Navigation / Export Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Leidse Marktkaart Demo</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {allMarkers.length} kramen & 4 ankers
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Drag stalls or anchors directly on the map to calibrate coordinates
            </p>
          </div>
        </div>

        {/* Export Coordinates Action */}
        <div>
          <button
            id="open-print-coords-btn"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            title="View, format, and copy coordinates for Python, Kaggle, or JSON"
          >
            <Code2 className="w-4 h-4" />
            <span>Export Coordinates</span>
          </button>
        </div>
      </header>

      {/* Full-Screen Map Viewport */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-slate-950">
        <OpenStreetMapView
          markers={allMarkers}
          anchors={anchors}
          selectedMarker={selectedMarker}
          onSelectMarker={setSelectedMarker}
          onMarkerDrag={handleOsmMarkerDrag}
          onAnchorDrag={handleAnchorDrag}
          showMarkers={showMarkers}
          onToggleShowMarkers={() => {}}
          markerSize={markerSize}
        />

        {/* Floating "Saved & Ready to Export" Toast when changes exist */}
        {hasUnsavedChanges && (
          <div
            id="floating-coords-exporter-banner"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border-2 border-amber-400 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-xs font-bold text-amber-300">Positions Saved</span>
            </div>

            <button
              id="floating-open-print-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-all shadow active:scale-95 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Export Coordinates</span>
            </button>
          </div>
        )}
      </main>

      {/* Print / Export Coordinates Output Modal */}
      <PrintCoordinatesModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        dataset={dataset}
        allMarkers={allMarkers}
        anchors={anchors}
        onDownloadJson={handleDownloadJson}
      />
    </div>
  );
}
