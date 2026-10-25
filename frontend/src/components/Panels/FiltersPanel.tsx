"use client";

import React, { useState } from "react";
import { REGION_PRESETS, SENSOR_OPTIONS, RegionPreset } from "@/lib/constants";
import { Globe, Filter, Calendar, Satellite, SlidersHorizontal, Search } from "lucide-react";

interface FiltersPanelProps {
  selectedRegionId: string;
  onSelectRegion: (preset: RegionPreset) => void;
  customBbox: [number, number, number, number];
  onChangeCustomBbox: (bbox: [number, number, number, number]) => void;
  selectedSensor: string;
  onChangeSensor: (sensor: string) => void;
  dayRange: number;
  onChangeDayRange: (days: number) => void;
  confidenceFilter: "all" | "high" | "nominal_high";
  onChangeConfidenceFilter: (filter: "all" | "high" | "nominal_high") => void;
  onApplyFilters: () => void;
  isLoading: boolean;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  selectedRegionId,
  onSelectRegion,
  customBbox,
  onChangeCustomBbox,
  selectedSensor,
  onChangeSensor,
  dayRange,
  onChangeDayRange,
  confidenceFilter,
  onChangeConfidenceFilter,
  onApplyFilters,
  isLoading,
}) => {
  const [isCustomMode, setIsCustomMode] = useState<boolean>(selectedRegionId === "custom");

  const handlePresetChange = (presetId: string) => {
    if (presetId === "custom") {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      const found = REGION_PRESETS.find((p) => p.id === presetId);
      if (found) onSelectRegion(found);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>Telemetry Controls &amp; Query Bounds</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">FIRMS Area REST API</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Region Presets */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Region</span>
          </label>
          <select
            value={isCustomMode ? "custom" : selectedRegionId}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {REGION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">Custom Bounding Box...</option>
          </select>
        </div>

        {/* Satellite Sensor Selection */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium flex items-center space-x-1">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>Satellite / Sensor</span>
          </label>
          <select
            value={selectedSensor}
            onChange={(e) => onChangeSensor(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {SENSOR_OPTIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Observation Lookback Window */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lookback Window</span>
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChangeDayRange(days)}
                className={`flex-1 py-1.5 text-center rounded-lg border font-mono transition-colors ${
                  dayRange === days
                    ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Filter Pills */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium flex items-center space-x-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter Confidence</span>
          </label>
          <div className="flex space-x-1">
            {[
              { id: "all", label: "All" },
              { id: "nominal_high", label: "Nominal+" },
              { id: "high", label: "High Only" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeConfidenceFilter(f.id as "all" | "high" | "nominal_high")}
                className={`flex-1 py-1.5 text-center rounded-lg border font-medium text-[11px] transition-colors ${
                  confidenceFilter === f.id
                    ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Coordinates Sub-form */}
      {isCustomMode && (
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400">Min Lat (South)</span>
            <input
              type="number"
              step="0.01"
              value={customBbox[0]}
              onChange={(e) =>
                onChangeCustomBbox([parseFloat(e.target.value) || 0, customBbox[1], customBbox[2], customBbox[3]])
              }
              className="w-full bg-slate-950 border border-slate-700 rounded p-1 font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Min Lon (West)</span>
            <input
              type="number"
              step="0.01"
              value={customBbox[1]}
              onChange={(e) =>
                onChangeCustomBbox([customBbox[0], parseFloat(e.target.value) || 0, customBbox[2], customBbox[3]])
              }
              className="w-full bg-slate-950 border border-slate-700 rounded p-1 font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Max Lat (North)</span>
            <input
              type="number"
              step="0.01"
              value={customBbox[2]}
              onChange={(e) =>
                onChangeCustomBbox([customBbox[0], customBbox[1], parseFloat(e.target.value) || 0, customBbox[3]])
              }
              className="w-full bg-slate-950 border border-slate-700 rounded p-1 font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Max Lon (East)</span>
            <input
              type="number"
              step="0.01"
              value={customBbox[3]}
              onChange={(e) =>
                onChangeCustomBbox([customBbox[0], customBbox[1], customBbox[2], parseFloat(e.target.value) || 0])
              }
              className="w-full bg-slate-950 border border-slate-700 rounded p-1 font-mono text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Query Trigger Action */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onApplyFilters}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs flex items-center space-x-2 shadow-lg shadow-cyan-950 disabled:opacity-50 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isLoading ? "Querying Telemetry..." : "Execute Spatial Query"}</span>
        </button>
      </div>
    </div>
  );
};
