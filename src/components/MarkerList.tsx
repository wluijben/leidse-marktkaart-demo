import React from 'react';
import { MarkerItem } from '../types';
import { Store, Landmark, MapPin, Navigation, ChevronRight, Search } from 'lucide-react';

interface MarkerListProps {
  markers: MarkerItem[];
  selectedMarker: MarkerItem | null;
  onSelectMarker: (marker: MarkerItem) => void;
  searchQuery: string;
}

export const MarkerList: React.FC<MarkerListProps> = ({
  markers,
  selectedMarker,
  onSelectMarker,
  searchQuery,
}) => {
  return (
    <div
      id="marker-directory-sidebar"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden"
    >
      {/* Directory Title */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-amber-500" />
            <span>Marker Directory</span>
          </h3>
          <p className="text-xs text-slate-500">
            {markers.length} {markers.length === 1 ? 'location' : 'locations'} mapped
          </p>
        </div>
        {searchQuery && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
            Filtered
          </span>
        )}
      </div>

      {/* Scrollable Marker List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
        {markers.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No markers match your search</p>
            <p className="text-xs text-slate-400 mt-1">Try a stall number (e.g., 41, 48) or street name</p>
          </div>
        ) : (
          markers.map((marker) => {
            const isSelected = selectedMarker?.id === marker.id;
            const isStall = marker.type === 'stall';
            const isBridge = marker.type === 'bridge';

            return (
              <button
                key={marker.id}
                id={`sidebar-marker-${marker.id}`}
                onClick={() => onSelectMarker(marker)}
                className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-2 border-amber-400 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Badge Icon / Number */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-amber-300'
                        : isBridge
                        ? 'bg-amber-100 text-amber-800'
                        : isStall
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isBridge ? (
                      <Landmark className="w-4 h-4" />
                    ) : isStall ? (
                      marker.text
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>

                  {/* Marker Information */}
                  <div className="truncate">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {isStall ? `Stall #${marker.text}` : marker.text}
                    </div>
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                      <span>{marker.category || 'Vendor'}</span>
                      {marker.zone && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-400 truncate">{marker.zone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Relative Coordinates Chip */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {marker.x_percent.toFixed(0)}%, {marker.y_percent.toFixed(0)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
