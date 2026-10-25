"use client";

import React, { useState } from "react";
import { FireDetection, WeatherResponse } from "@/lib/types";
import {
  Flame,
  Thermometer,
  Wind,
  Droplets,
  Compass,
  Copy,
  Check,
  CloudSun,
  Activity,
} from "lucide-react";

interface HotspotDetailPanelProps {
  hotspot: FireDetection | null;
  weather: WeatherResponse | null;
  isLoadingWeather: boolean;
  onAnalyzeRisk: (hotspot: FireDetection) => void;
}

export const HotspotDetailPanel: React.FC<HotspotDetailPanelProps> = ({
  hotspot,
  weather,
  isLoadingWeather,
  onAnalyzeRisk,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!hotspot) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl text-center flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <div className="p-3 bg-slate-800/80 rounded-full text-slate-500">
          <Flame className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-white text-sm">No Hotspot Selected</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Click on any thermal anomaly marker on the map to inspect satellite telemetry and live micro-meteorological conditions.
          </p>
        </div>
      </div>
    );
  }

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${hotspot.latitude}, ${hotspot.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curWeather = weather?.current;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Target Hotspot Telemetry</h3>
            <span className="text-[10px] text-slate-400 font-mono">ID: {hotspot.id}</span>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
            hotspot.confidence_category === "high"
              ? "bg-red-950/80 text-red-300 border border-red-700/60"
              : hotspot.confidence_category === "low"
              ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
              : "bg-orange-950/80 text-orange-300 border border-orange-700/60"
          }`}
        >
          {hotspot.confidence_category} Confidence
        </span>
      </div>

      {/* Primary Observational Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Coordinates */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Coordinates</span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-cyan-300 font-medium">
              {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
            </span>
            <button
              onClick={handleCopyCoords}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy Coordinates"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Fire Radiative Power (FRP) */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Fire Radiative Power</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-base font-bold text-amber-400 font-mono">
              {hotspot.frp !== null ? hotspot.frp : "N/A"}
            </span>
            <span className="text-[10px] text-slate-400">MW</span>
          </div>
        </div>

        {/* Brightness Temperature */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Brightness T4</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-sm font-semibold text-slate-200 font-mono">
              {hotspot.brightness !== null ? hotspot.brightness : "N/A"}
            </span>
            <span className="text-[10px] text-slate-400">K</span>
          </div>
        </div>

        {/* Brightness Channel 31/I5 */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Brightness T31/I5</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-sm font-semibold text-slate-200 font-mono">
              {hotspot.bright_t31 !== null ? hotspot.bright_t31 : "N/A"}
            </span>
            <span className="text-[10px] text-slate-400">K</span>
          </div>
        </div>
      </div>

      {/* Observation Metadata */}
      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-500">Acquisition:</span>
          <span>
            {hotspot.acquisition_date} {hotspot.acquisition_time} UTC ({hotspot.daynight === "D" ? "Day" : "Night"})
          </span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-500">Platform &amp; Sensor:</span>
          <span>
            {hotspot.satellite || "Satellite"} • {hotspot.instrument || "VIIRS"}
          </span>
        </div>
        {(hotspot.scan !== null || hotspot.track !== null) && (
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Pixel Geometry:</span>
            <span>
              {hotspot.scan}km scan × {hotspot.track}km track
            </span>
          </div>
        )}
      </div>

      {/* Live Open-Meteo Weather Section */}
      <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-xs">
            <CloudSun className="w-4 h-4 text-cyan-400" />
            <span>Collocated Meteorological Grid</span>
          </div>
          <span className="text-[10px] text-cyan-400/80 font-mono">Open-Meteo NWP</span>
        </div>

        {isLoadingWeather ? (
          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Activity className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Retrieving atmospheric conditions...</span>
          </div>
        ) : curWeather ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400">Temperature</div>
                <div className="font-bold text-slate-200">
                  {curWeather.temperature_c !== null ? `${curWeather.temperature_c}°C` : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <div className="text-[10px] text-slate-400">Relative Humidity</div>
                <div className="font-bold text-slate-200">
                  {curWeather.relative_humidity_pct !== null ? `${curWeather.relative_humidity_pct}%` : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <div>
                <div className="text-[10px] text-slate-400">Sustained Wind</div>
                <div className="font-bold text-slate-200">
                  {curWeather.wind_speed_kmh !== null ? `${curWeather.wind_speed_kmh} km/h` : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <div>
                <div className="text-[10px] text-slate-400">Recent Rain</div>
                <div className="font-bold text-slate-200">
                  {curWeather.precipitation_mm !== null ? `${curWeather.precipitation_mm} mm` : "0 mm"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            Weather grid data unavailable for this pixel.
          </div>
        )}

        <div className="text-[10px] text-slate-500 pt-1 border-t border-cyan-900/40">
          Values represent numerical model forecast grid cells, not exact microclimate.
        </div>
      </div>

      {/* Action: Compute Risk */}
      <button
        onClick={() => onAnalyzeRisk(hotspot)}
        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium text-xs shadow-lg shadow-cyan-950 transition-all flex items-center justify-center space-x-1.5"
      >
        <Activity className="w-3.5 h-3.5" />
        <span>Analyze Environmental Fire Risk Score</span>
      </button>
    </div>
  );
};
