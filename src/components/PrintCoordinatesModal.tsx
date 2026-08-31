import React, { useState } from 'react';
import { MarketDataset, MarkerItem, AnchorItem } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Code2, 
  FileText, 
  Table, 
  CheckCircle2,
  Anchor
} from 'lucide-react';

interface PrintCoordinatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: MarketDataset;
  allMarkers: MarkerItem[];
  anchors: AnchorItem[];
  onDownloadJson: () => void;
}

export const PrintCoordinatesModal: React.FC<PrintCoordinatesModalProps> = ({
  isOpen,
  onClose,
  dataset,
  allMarkers,
  anchors,
  onDownloadJson,
}) => {
  const [activeFormat, setActiveFormat] = useState<'json' | 'python' | 'table'>('json');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Complete exported dataset object including custom anchors
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

  // Generate Python format with current anchor coordinates
  const pythonString = `# Calibrated Leiden Market Coordinates (OpenStreetMap)
# 4 Ground-Truth Anchors:
${anchors.map((a) => `# - ${a.name}: lat ${a.lat.toFixed(5)}, lng ${a.lng.toFixed(5)}`).join('\n')}

anchors = [
${anchors.map((a) => `    {"name": "${a.name}", "lat": ${a.lat}, "lng": ${a.lng}}`).join(',\n')}
]

market_markers = [
${dataset.markers
  .map((m) => {
    const pxX = Math.round((m.x_percent / 100) * 1614);
    const pxY = Math.round((m.y_percent / 100) * 2481);
    if (m.lat && m.lng) {
      return `    {"text": "${m.text}", "lat": ${m.lat}, "lng": ${m.lng}, "img_x": ${pxX}, "img_y": ${pxY}, "x_percent": ${m.x_percent}, "y_percent": ${m.y_percent}}`;
    }
    return `    {"text": "${m.text}", "img_x": ${pxX}, "img_y": ${pxY}, "x_percent": ${m.x_percent}, "y_percent": ${m.y_percent}}`;
  })
  .join(',\n')}
]

dataset_meta = {
    "location": "Leiden Market, Netherlands",
    "anchors": [${anchors.map((a) => `"${a.name}"`).join(', ')}],
    "total_markers": ${dataset.markers.length},
    "image_dimensions": {"width": 1614, "height": 2481}
}
`;

  const handleCopy = () => {
    const textToCopy = activeFormat === 'python' ? pythonString : jsonString;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="print-coordinates-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Leiden Market Coordinates Output</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  {dataset.markers.length} stalls & 4 anchors
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Calibrated against Koornbrug · Botermarkt · Nieuwe Rijn · Karnemelksbrug
              </p>
            </div>
          </div>

          <button
            id="close-print-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector & Action Buttons */}
        <div className="px-4 md:px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFormat === 'json'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON Format</span>
            </button>

            <button
              onClick={() => setActiveFormat('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFormat === 'python'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Python / Kaggle</span>
            </button>

            <button
              onClick={() => setActiveFormat('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFormat === 'table'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Coordinates Table</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-coordinates-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400/50 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>

            <button
              id="download-calibrated-json-btn"
              onClick={onDownloadJson}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Download .JSON</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-5 flex-1 overflow-y-auto font-mono text-xs">
          {activeFormat === 'json' && (
            <div className="relative">
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-amber-300/90 overflow-x-auto max-h-[50vh] leading-relaxed select-all">
                <code>{jsonString}</code>
              </pre>
            </div>
          )}

          {activeFormat === 'python' && (
            <div className="relative">
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-300 overflow-x-auto max-h-[50vh] leading-relaxed select-all">
                <code>{pythonString}</code>
              </pre>
            </div>
          )}

          {activeFormat === 'table' && (
            <div className="flex flex-col gap-4">
              {/* Anchors Subsection */}
              <div className="border border-indigo-900/60 rounded-xl overflow-hidden bg-slate-950">
                <div className="bg-indigo-950/60 px-3.5 py-2 text-indigo-200 font-sans font-bold text-xs flex items-center gap-2 border-b border-indigo-900/60">
                  <Anchor className="w-4 h-4 text-indigo-400" />
                  <span>4 Ground-Truth Lat/Long Anchors (Draggable)</span>
                </div>
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2 pl-4">Anchor Name</th>
                      <th className="p-2 text-right">Latitude (°N)</th>
                      <th className="p-2 text-right pr-4">Longitude (°E)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {anchors.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="p-2 pl-4 text-white font-bold flex items-center gap-2">
                          <span>{a.icon}</span>
                          <span>{a.name}</span>
                        </td>
                        <td className="p-2 text-right text-indigo-300 font-bold">{a.lat.toFixed(6)}</td>
                        <td className="p-2 text-right pr-4 text-indigo-300 font-bold">{a.lng.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Markers Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="max-h-[35vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 sticky top-0 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 pl-4"># / Name</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right font-mono">Latitude</th>
                        <th className="p-2.5 text-right font-mono">Longitude</th>
                        <th className="p-2.5 text-right font-mono">X %</th>
                        <th className="p-2.5 text-right pr-4 font-mono">Y %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {dataset.markers.map((m, idx) => {
                        const isNumber = !isNaN(Number(m.text));

                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 pl-4 font-bold text-white flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${
                                isNumber ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-purple-600 text-white'
                              }`}>
                                {m.text}
                              </span>
                              <span>{m.text}</span>
                            </td>
                            <td className="p-2.5 text-slate-400 font-sans text-[11px]">
                              {isNumber ? 'Stall' : 'Landmark / Bridge'}
                            </td>
                            <td className="p-2.5 text-right text-emerald-300 font-bold">
                              {m.lat ? m.lat.toFixed(5) : '-'}
                            </td>
                            <td className="p-2.5 text-right text-emerald-300 font-bold">
                              {m.lng ? m.lng.toFixed(5) : '-'}
                            </td>
                            <td className="p-2.5 text-right text-amber-300">
                              {m.x_percent.toFixed(2)}%
                            </td>
                            <td className="p-2.5 text-right pr-4 text-amber-300">
                              {m.y_percent.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Coordinates & Anchors saved and calibrated.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
