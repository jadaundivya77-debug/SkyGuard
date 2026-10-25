"use client";

import React from "react";
import { Satellite, Download, RefreshCw, KeyRound, Radio } from "lucide-react";

interface NavbarProps {
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenSetupModal: () => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  isLoading: boolean;
  hasFirmsKey: boolean;
  totalDetections: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDemoMode,
  onToggleDemoMode,
  onOpenSetupModal,
  onRefresh,
  onExportCsv,
  onExportJson,
  isLoading,
  hasFirmsKey,
  totalDetections,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand and Tagline */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-950">
            <Satellite className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-wider text-white">SKYGUARD</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-700/50 font-mono">
                EYES ON EARTH
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Satellite Active-Fire Monitoring &amp; Environmental Risk Engine
            </p>
          </div>
        </div>

        {/* Status Indicators & Mode Switcher */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Mode Badge & Switch */}
          <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Mode:</span>
            <button
              onClick={onToggleDemoMode}
              className={`text-xs font-semibold px-2.5 py-1 rounded transition-all flex items-center space-x-1.5 ${
                isDemoMode
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                  : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
              }`}
              title="Click to toggle between Live NASA FIRMS data and Bundled Sample Telemetry"
            >
              <Radio className={`w-3.5 h-3.5 ${isDemoMode ? "text-amber-400" : "text-emerald-400 animate-ping"}`} />
              <span>{isDemoMode ? "DEMO MODE (Sample)" : "LIVE NASA FIRMS"}</span>
            </button>
          </div>

          {/* NASA Key Status Button */}
          <button
            onClick={onOpenSetupModal}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-colors ${
              hasFirmsKey
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-amber-500/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>{hasFirmsKey ? "NASA Key Configured" : "Configure NASA Key"}</span>
          </button>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 disabled:opacity-50 transition-colors"
            title="Force refresh satellite telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onExportCsv}
              disabled={totalDetections === 0}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-40 transition-colors flex items-center space-x-1"
              title="Download incident report as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={onExportJson}
              disabled={totalDetections === 0}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              title="Download full incident report as JSON"
            >
              JSON
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
