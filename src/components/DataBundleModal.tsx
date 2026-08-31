import React, { useState } from 'react';
import { MarketDataset } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  FileCode, 
  FileImage, 
  RefreshCw, 
  AlertCircle,
  Terminal,
  ExternalLink,
  Code
} from 'lucide-react';

interface DataBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: MarketDataset;
  onLoadCustomDataset: (newDataset: MarketDataset, customImageSrc?: string) => void;
  onResetToDefault: () => void;
  onDownloadImage: () => void;
}

export const DataBundleModal: React.FC<DataBundleModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onLoadCustomDataset,
  onResetToDefault,
  onDownloadImage,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'ocr_helper'>('editor');
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(dataset, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(dataset, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.markers || !Array.isArray(parsed.markers)) {
          throw new Error('Invalid format: JSON must contain a "markers" array');
        }
        setJsonText(JSON.stringify(parsed, null, 2));
        setError(null);
        onLoadCustomDataset(parsed);
      } catch (err: any) {
        setError(err.message || 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImageName(file.name);
      onLoadCustomDataset(dataset, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyJsonText = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.markers || !Array.isArray(parsed.markers)) {
        throw new Error('JSON must contain a "markers" array');
      }
      setError(null);
      onLoadCustomDataset(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid JSON syntax');
    }
  };

  const pythonOcrScript = `# Python / Kaggle OCR Script for Leiden Market Map
# Install: pip install easyocr opencv-python

import cv2
import easyocr
import json

# 1. Load the downloaded extracted_map.png
img_path = 'extracted_map.png'
img = cv2.imread(img_path)
h, w = img.shape[:2]
print(f"Loaded image: {w}x{h} px")

# 2. Run OCR (English/Dutch support)
reader = easyocr.Reader(['en', 'nl'], gpu=True) # Set gpu=False if no CUDA
results = reader.readtext(img_path)

markers = []
for bbox, text, conf in results:
    clean_text = text.strip()
    if not clean_text:
        continue
        
    # Calculate bounding box center point
    # bbox: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    cx = sum([pt[0] for pt in bbox]) / 4.0
    cy = sum([pt[1] for pt in bbox]) / 4.0
    
    # Calculate percentage coordinates (0.0 to 100.0)
    x_percent = round((cx / w) * 100.0, 3)
    y_percent = round((cy / h) * 100.0, 3)
    
    markers.append({
        "text": clean_text,
        "x_percent": x_percent,
        "y_percent": y_percent,
        "confidence": round(float(conf), 3)
    })

# 3. Format into the app's exact schema
dataset = {
    "image_file": "extracted_map.png",
    "width": w,
    "height": h,
    "markers": markers
}

# 4. Save to JSON
with open('market_data_calibrated.json', 'w') as f:
    json.dump(dataset, f, indent=2)

print(f"Extracted {len(markers)} stall/landmark coordinates!")
print("Now copy/paste the JSON back into the app.")
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(pythonOcrScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div
      id="data-bundle-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Market Data & OCR Pipeline</h3>
              <p className="text-xs text-slate-400">
                {dataset.markers.length} markers mapped onto {dataset.image_file} ({dataset.width}x{dataset.height}px)
              </p>
            </div>
          </div>

          <button
            id="close-bundle-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent High-Res Image Download Banner */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Map Image ({dataset.image_file})</span>
                <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">
                  {dataset.width} x {dataset.height} px
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Download the raw high-resolution map image to run OCR in Python / Kaggle.
              </p>
            </div>
          </div>

          <button
            id="modal-download-image-btn"
            onClick={onDownloadImage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>Download High-Res Map (.PNG)</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-4 pt-3 gap-2 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'editor'
                ? 'border-amber-400 text-amber-300 bg-slate-800/50 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON Dataset & Import</span>
          </button>

          <button
            onClick={() => setActiveTab('ocr_helper')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'ocr_helper'
                ? 'border-amber-400 text-amber-300 bg-slate-800/50 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Python / Kaggle OCR Script Helper</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'editor' ? (
            <>
              {/* Quick File Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Custom JSON Upload */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-400/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold text-slate-200">Upload Kaggle/Python JSON</div>
                      <div className="text-[11px] text-slate-400">Load processed marker coordinates</div>
                    </div>
                  </div>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
                </label>

                {/* Custom Map Image Upload */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-400/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-slate-200">
                        {uploadedImageName ? 'Custom Map Loaded' : 'Upload alternative map image'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {uploadedImageName || 'Replace extracted_map.png'}
                      </div>
                    </div>
                  </div>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {/* JSON Text Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-slate-400">
                  <span className="font-mono text-[11px]">market_data.json content (paste OCR output here)</span>
                  <div className="flex items-center gap-2">
                    <button
                      id="copy-json-btn"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                    <button
                      id="download-json-btn"
                      onClick={handleDownload}
                      className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>
                <textarea
                  id="raw-json-textarea"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-950 font-mono text-xs text-amber-300/90 p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            /* Python / Kaggle OCR Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Python OCR Pipeline Script</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      EasyOCR / OpenCV
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Copy and run this in your Kaggle Notebook or local Python environment with the downloaded map image.
                  </p>
                </div>

                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Script Copied!' : 'Copy Python Script'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-[320px] leading-relaxed">
                  <code>{pythonOcrScript}</code>
                </pre>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-slate-300 space-y-1 text-[11px]">
                <div className="font-semibold text-white">How it connects:</div>
                <div>1. Click <strong>"Download High-Res Map"</strong> above to save <code className="text-amber-300">extracted_map.png</code>.</div>
                <div>2. Run this script in Kaggle or Python to extract text bounding box centers converted to <code className="text-emerald-300">x_percent</code> and <code className="text-emerald-300">y_percent</code>.</div>
                <div>3. Switch back to the <strong>"JSON Dataset & Import"</strong> tab and paste the generated JSON or upload the output file.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <button
            id="reset-default-data-btn"
            onClick={() => {
              onResetToDefault();
              setUploadedImageName(null);
              setJsonText(JSON.stringify(dataset, null, 2));
              setError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="apply-json-changes-btn"
              onClick={handleApplyJsonText}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition-colors"
            >
              Apply JSON to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
