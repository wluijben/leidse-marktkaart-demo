import React, { useState } from 'react';
import { MarkerItem, MarkerOverlayStyle, MarketDataset } from '../types';
import { 
  Move, 
  Target, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Eye, 
  Sliders, 
  Sparkles,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  Save,
  FileImage,
  EyeOff,
  Code2
} from 'lucide-react';

interface AlignmentToolbarProps {
  isCalibrating: boolean;
  onToggleCalibrating: () => void;
  selectedMarker: MarkerItem | null;
  onUpdateMarkerCoords: (markerId: string, newX: number, newY: number) => void;
  onNudgeMarker: (markerId: string, dx: number, dy: number) => void;
  onGlobalShift: (dx: number, dy: number) => void;
  onGlobalScale: (scaleX: number, scaleY: number) => void;
  onAddNewMarker: (x: number, y: number, text: string) => void;
  onDeleteMarker: (markerId: string) => void;
  overlayStyle: MarkerOverlayStyle;
  onOverlayStyleChange: (style: MarkerOverlayStyle) => void;
  markerOpacity: number;
  onMarkerOpacityChange: (opacity: number) => void;
  markerSize: number;
  onMarkerSizeChange: (size: number) => void;
  onDownloadJson: () => void;
  onCopyJson: () => void;
  onResetOriginal: () => void;
  onSaveToLocalStorage: () => void;
  onDownloadImage: () => void;
  onOpenPrintModal?: () => void;
  showMarkers?: boolean;
  onToggleShowMarkers?: () => void;
  hasUnsavedChanges: boolean;
  totalMarkersCount: number;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
  isCalibrating,
  onToggleCalibrating,
  selectedMarker,
  onUpdateMarkerCoords,
  onNudgeMarker,
  onGlobalShift,
  onGlobalScale,
  onAddNewMarker,
  onDeleteMarker,
  overlayStyle,
  onOverlayStyleChange,
  markerOpacity,
  onMarkerOpacityChange,
  markerSize,
  onMarkerSizeChange,
  onDownloadJson,
  onCopyJson,
  onResetOriginal,
  onSaveToLocalStorage,
  onDownloadImage,
  onOpenPrintModal,
  showMarkers = true,
  onToggleShowMarkers,
  hasUnsavedChanges,
  totalMarkersCount,
}) => {
  const [nudgeStep, setNudgeStep] = useState<number>(0.2); // percent step
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [newMarkerText, setNewMarkerText] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  const handleCopyClick = () => {
    onCopyJson();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveClick = () => {
    onSaveToLocalStorage();
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2500);
  };

  const handleNudge = (dx: number, dy: number) => {
    if (!selectedMarker) return;
    onNudgeMarker(selectedMarker.id, dx * nudgeStep, dy * nudgeStep);
  };

  if (!isCalibrating) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {onToggleShowMarkers && (
          <button
            id="toggle-markers-btn"
            onClick={onToggleShowMarkers}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              !showMarkers
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={showMarkers ? 'Hide interactive numbers / markers to see clean map image' : 'Show interactive numbers / markers'}
          >
            {showMarkers ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-rose-600" />}
            <span className="hidden sm:inline">{showMarkers ? 'Markers: Visible' : 'Markers: Hidden'}</span>
            <span className="sm:hidden">{showMarkers ? 'Visible' : 'Hidden'}</span>
          </button>
        )}

        {onOpenPrintModal && (
          <button
            id="open-print-modal-btn"
            onClick={onOpenPrintModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-sm"
            title="Print or copy all current marker coordinates"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Print / Output Coords</span>
            <span className="sm:hidden">Coords</span>
          </button>
        )}

        <button
          id="toggle-calibration-mode-btn"
          onClick={onToggleCalibrating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition-all hover:scale-105 active:scale-95"
          title="Enable Hand Calibration & Alignment Mode"
        >
          <Move className="w-4 h-4 text-slate-950" />
          <span>Move Markers by Hand</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="alignment-calibration-toolbar"
      className="bg-slate-900/95 text-slate-100 backdrop-blur-md rounded-2xl border-2 border-amber-400/80 shadow-2xl p-3.5 md:p-4 space-y-3 transition-all animate-in slide-in-from-top-2"
    >
      {/* Calibration Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center animate-pulse">
            <Move className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>Hand Calibration & Alignment Mode</span>
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Drag any marker directly on the map, use arrow nudge buttons, or adjust batch offsets.
            </p>
          </div>
        </div>

        {/* Quick Save & Exit Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="calib-download-image-btn"
            onClick={onDownloadImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition-colors shadow-sm"
            title="Download extracted_map.png for OCR processing in Kaggle / Python"
          >
            <FileImage className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Image</span>
          </button>

          <button
            id="save-calibration-local-btn"
            onClick={handleSaveClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              savedBadge
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40'
            }`}
            title="Save changes to your browser"
          >
            {savedBadge ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedBadge ? 'Saved!' : 'Save Progress'}</span>
          </button>

          {onOpenPrintModal && (
            <button
              id="calib-open-print-modal-btn"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/50 transition-colors shadow-sm"
              title="Print, view, or copy calibrated coordinates as JSON or Python dict"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Print / Copy Output</span>
            </button>
          )}

          <button
            id="download-calibrated-json-btn"
            onClick={onDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Download updated market_data.json"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export JSON</span>
          </button>

          <button
            id="copy-calibrated-json-btn"
            onClick={handleCopyClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Copy JSON to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="exit-calibration-mode-btn"
            onClick={onToggleCalibrating}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow transition-colors"
          >
            Done Editing
          </button>
        </div>
      </div>

      {/* Primary Calibration Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Left: Selected Marker Precision Nudge & Readout */}
        <div className="md:col-span-5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
          {selectedMarker ? (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                    {selectedMarker.text}
                  </span>
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {selectedMarker.type === 'stall' ? `Stall #${selectedMarker.text}` : selectedMarker.text}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                  X: {selectedMarker.x_percent.toFixed(3)}% | Y: {selectedMarker.y_percent.toFixed(3)}%
                </div>
              </div>

              {/* Nudge Directional Pad */}
              <div className="flex flex-col items-center gap-1">
                <button
                  id="nudge-up-btn"
                  onClick={() => handleNudge(0, -1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
                  title="Nudge Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    id="nudge-left-btn"
                    onClick={() => handleNudge(-1, 0)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
                    title="Nudge Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id="nudge-right-btn"
                    onClick={() => handleNudge(1, 0)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
                    title="Nudge Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  id="nudge-down-btn"
                  onClick={() => handleNudge(0, 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
                  title="Nudge Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step Size Selector */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Step</span>
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded border border-slate-700">
                  {[0.05, 0.2, 0.5, 1.0].map((step) => (
                    <button
                      key={step}
                      onClick={() => setNudgeStep(step)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        nudgeStep === step ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Click or drag any marker on the map to fine-tune</span>
            </div>
          )}
        </div>

        {/* Center: Marker Visual Overlay Styles (See-through vs Solid) */}
        <div className="md:col-span-4 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">Style:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              id="style-ring-btn"
              onClick={() => onOverlayStyleChange('ring')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                overlayStyle === 'ring'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="See-Through Ring (Shows the original number underneath on the map image!)"
            >
              Hollow Ring
            </button>
            <button
              id="style-solid-btn"
              onClick={() => onOverlayStyleChange('solid')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                overlayStyle === 'solid'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Solid filled badge"
            >
              Badge
            </button>
            <button
              id="style-glow-btn"
              onClick={() => onOverlayStyleChange('glow')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                overlayStyle === 'glow'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Neon outline glow"
            >
              Glow
            </button>
            <button
              id="style-minimal-btn"
              onClick={() => onOverlayStyleChange('minimal')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                overlayStyle === 'minimal'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Target dot"
            >
              Dot
            </button>
          </div>
        </div>

        {/* Right: Opacity and Size Sliders */}
        <div className="md:col-span-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Marker Opacity</span>
              <span className="font-mono text-amber-300">{Math.round(markerOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={markerOpacity}
              onChange={(e) => onMarkerOpacityChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Toggle Bulk Offset Drawer */}
          <button
            onClick={() => setIsBulkOpen(!isBulkOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isBulkOpen ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Bulk Shift & Scale all markers together"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Collapsible Bulk Offset & Scaling Panel */}
      {isBulkOpen && (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Bulk Shift All {totalMarkersCount} Markers Together</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              Applies uniform shift if the whole image has an offset
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onGlobalShift(-0.5, 0)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3 text-amber-400" />
              <span>Shift Left (-0.5%)</span>
            </button>
            <button
              onClick={() => onGlobalShift(0.5, 0)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-3 h-3 text-amber-400" />
              <span>Shift Right (+0.5%)</span>
            </button>
            <button
              onClick={() => onGlobalShift(0, -0.5)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
            >
              <ArrowUp className="w-3 h-3 text-amber-400" />
              <span>Shift Up (-0.5%)</span>
            </button>
            <button
              onClick={() => onGlobalShift(0, 0.5)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
            >
              <ArrowDown className="w-3 h-3 text-amber-400" />
              <span>Shift Down (+0.5%)</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
            <button
              onClick={onResetOriginal}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All to Initial Raw Data</span>
            </button>

            {hasUnsavedChanges && (
              <span className="text-amber-400 text-[10px] font-semibold">
                ● You have unsaved coordinate adjustments
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
