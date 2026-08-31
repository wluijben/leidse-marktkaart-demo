import React from 'react';
import { ViewFilter } from '../types';
import { 
  MapPin, 
  Search, 
  Store, 
  Landmark, 
  FileCode, 
  FileImage,
  Layers, 
  Compass,
  X
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: ViewFilter;
  onFilterChange: (filter: ViewFilter) => void;
  totalMarkers: number;
  filteredCount: number;
  onOpenBundleModal: () => void;
  onDownloadImage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  totalMarkers,
  filteredCount,
  onOpenBundleModal,
  onDownloadImage,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Logo and App Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md">
                <Compass className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Leiden Market Map</span>
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Interactive
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Nieuwe Rijn & Botermarkt · Precise coordinate overlay
                </p>
              </div>
            </div>

            {/* Mobile Action for Bundle Modal */}
            <button
              id="mobile-open-bundle-btn"
              onClick={onOpenBundleModal}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              title="Inspect JSON Bundle"
            >
              <FileCode className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar and Quick Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl md:mx-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="marker-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search stall # (e.g. 48, 71) or street (e.g. Botermarkt)..."
                className="w-full bg-slate-800/90 text-sm text-slate-100 placeholder-slate-400 rounded-xl pl-9 pr-8 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                id="filter-all-btn"
                onClick={() => onFilterChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                All ({totalMarkers})
              </button>
              <button
                id="filter-stalls-btn"
                onClick={() => onFilterChange('stalls')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'stalls'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Stalls
              </button>
              <button
                id="filter-landmarks-btn"
                onClick={() => onFilterChange('landmarks')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === 'landmarks'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Landmarks
              </button>
            </div>
          </div>

          {/* Desktop Right Action: JSON Bundle & Export */}
          <div className="hidden md:flex items-center gap-2">
            <button
              id="header-download-image-btn"
              onClick={onDownloadImage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-500/40 transition-colors shadow-sm"
              title="Download extracted_map.png for OCR processing in Kaggle / Python"
            >
              <FileImage className="w-4 h-4 text-emerald-400" />
              <span>Download Map Image</span>
            </button>

            <button
              id="desktop-open-bundle-btn"
              onClick={onOpenBundleModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-colors shadow-sm"
              title="Inspect or load custom market data bundle & OCR helper"
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>Data & OCR Bundle</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
