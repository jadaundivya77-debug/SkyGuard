"use client";

import React from "react";
import { Flame, Layers } from "lucide-react";

interface MapLegendProps {
  showClusters: boolean;
  onToggleClusters: () => void;
  selectedBasemap: string;
  onChangeBasemap: (id: string) => void;
  basemaps: Array<{ id: string; name: string }>;
  totalCount: number;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  showClusters,
  onToggleClusters,
  selectedBasemap,
  onChangeBasemap,
  basemaps,
  totalCount,
}) => {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-xs text-slate-300 shadow-xl max-w-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center space-x-1.5 font-semibold text-white">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Map Legend ({totalCount})</span>
        </div>
        <button
          onClick={onToggleClusters}
          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
            showClusters
              ? "bg-cyan-950 border-cyan-500 text-cyan-300"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          {showClusters ? "Clusters: ON" : "Clusters: OFF"}
        </button>
      </div>

      {/* Detection Confidence Levels */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          Thermal Detection Confidence
        </div>
        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-950 inline-block"></span>
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-950 inline-block"></span>
            <span>Nominal</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-950 inline-block"></span>
            <span>Low</span>
          </div>
        </div>
      </div>

      {/* Basemap Selection */}
      <div className="space-y-1 border-t border-slate-800 pt-1.5">
        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center space-x-1">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Basemap</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {basemaps.map((b) => (
            <button
              key={b.id}
              onClick={() => onChangeBasemap(b.id)}
              className={`px-1.5 py-1 rounded border text-center truncate transition-colors ${
                selectedBasemap === b.id
                  ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 font-semibold"
                  : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {b.name.replace("Standard", "").replace("Imagery", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
        Satellite heat signatures indicate thermal radiance, not ground-confirmed fires.
      </div>
    </div>
  );
};
