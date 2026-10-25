"use client";

import React from "react";
import { AlertTriangle, Info, CheckCircle2, Clock } from "lucide-react";
import { FireSummary } from "@/lib/types";

interface StatusBannerProps {
  isDemoMode: boolean;
  hasFirmsKey?: boolean;
  summary: FireSummary | null;
  errorMessage: string | null;
  onSwitchToDemo: () => void;
  onOpenSetup: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  isDemoMode,
  summary,
  errorMessage,
  onSwitchToDemo,
  onOpenSetup,
}) => {
  // If there is an active error (e.g., 412 missing key or upstream failure)
  if (errorMessage) {
    return (
      <div className="bg-red-950/60 border-y border-red-800/80 px-4 py-2 text-xs text-red-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              <strong>Telemetry Error:</strong> {errorMessage}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {!isDemoMode && (
              <button
                onClick={onSwitchToDemo}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-colors"
              >
                Switch to Demo Mode
              </button>
            )}
            <button
              onClick={onOpenSetup}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
            >
              Setup Guide
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Demo Mode Banner
  if (isDemoMode) {
    return (
      <div className="bg-amber-950/40 border-y border-amber-800/50 px-4 py-2 text-xs text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>DEMO TELEMETRY ACTIVE:</strong> Displaying bundled historical satellite observations. Live NASA
              FIRMS credentials are not being queried.
            </span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span className="font-mono text-[11px] text-amber-300">
              {summary ? `${summary.total_detections} sample hotspots loaded` : "Loading sample dataset..."}
            </span>
            <button
              onClick={onOpenSetup}
              className="underline text-amber-400 hover:text-amber-300 transition-colors"
            >
              Configure Live NASA API Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Live NASA FIRMS Mode Banner
  return (
    <div className="bg-emerald-950/30 border-y border-emerald-800/40 px-4 py-2 text-xs text-emerald-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>LIVE SATELLITE STREAM:</strong> Ingesting real-time telemetry from NASA FIRMS Area API.
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300">
            Source: {summary?.source || "NASA FIRMS Near-Real-Time"}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-slate-300 text-[11px] font-mono">
          {summary?.latest_observation_utc && (
            <div className="flex items-center space-x-1" title="Latest satellite acquisition timestamp">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Latest: {new Date(summary.latest_observation_utc).toUTCString().replace("GMT", "UTC")}
              </span>
            </div>
          )}
          {summary?.data_freshness_hours !== null && summary?.data_freshness_hours !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/50 text-emerald-300">
              Freshness: {summary.data_freshness_hours}h ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
