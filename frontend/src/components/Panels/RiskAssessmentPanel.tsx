"use client";

import React, { useState } from "react";
import { RiskAssessmentResponse } from "@/lib/types";
import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Sliders,
} from "lucide-react";

interface RiskAssessmentPanelProps {
  riskData: RiskAssessmentResponse | null;
  isLoading: boolean;
  onSimulate: (temp: number, rh: number, wind: number, precip: number) => void;
  onResetSimulation: () => void;
}

export const RiskAssessmentPanel: React.FC<RiskAssessmentPanelProps> = ({
  riskData,
  isLoading,
  onSimulate,
  onResetSimulation,
}) => {
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [simTemp, setSimTemp] = useState<number>(32);
  const [simRh, setSimRh] = useState<number>(20);
  const [simWind, setSimWind] = useState<number>(28);
  const [simPrecip, setSimPrecip] = useState<number>(0);

  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl text-center flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs text-slate-300 font-mono">Computing environmental risk heuristic...</div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl text-center flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <div className="p-3 bg-slate-800/80 rounded-full text-slate-500">
          <ShieldAlert className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-white text-sm">Environmental Risk Engine Ready</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Select a hotspot on the map or use the simulation mode to evaluate explainable atmospheric wildfire risk.
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score < 25) return { text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-600" };
    if (score < 50) return { text: "text-cyan-400", bg: "bg-cyan-500", border: "border-cyan-600" };
    if (score < 70) return { text: "text-amber-400", bg: "bg-amber-500", border: "border-amber-600" };
    if (score < 85) return { text: "text-orange-400", bg: "bg-orange-500", border: "border-orange-600" };
    return { text: "text-red-400", bg: "bg-red-500", border: "border-red-600" };
  };

  const colors = getScoreColor(riskData.overall_score);

  const handleApplySim = () => {
    onSimulate(simTemp, simRh, simWind, simPrecip);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Environmental Risk Assessment</h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Loc: {riskData.latitude.toFixed(3)}, {riskData.longitude.toFixed(3)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center space-x-1 transition-colors"
        >
          <Sliders className="w-3 h-3" />
          <span>{showSimulator ? "Hide Simulator" : "What-If Simulator"}</span>
        </button>
      </div>

      {/* Score Summary Box */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Circular Score Visual */}
          <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-900 border-4 border-slate-800">
            <div className="text-center">
              <div className={`text-2xl font-black font-mono leading-none ${colors.text}`}>
                {riskData.overall_score.toFixed(0)}
              </div>
              <div className="text-[9px] uppercase font-bold text-slate-500">/ 100</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colors.text} bg-slate-900 border ${colors.border}`}>
                {riskData.risk_level} Threat Level
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {riskData.confidence_in_score}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Aggregated uncalibrated atmospheric wildfire susceptibility score.
            </p>
          </div>
        </div>

        {/* Factors Breakdown Bar */}
        <div className="w-full sm:w-48 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Inputs Available:</span>
            <span className="font-mono text-cyan-400">
              {riskData.available_factors_count} / {riskData.total_factors_count}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className={`h-full ${colors.bg}`}
              style={{ width: `${riskData.overall_score}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Warnings if inputs are missing */}
      {riskData.warnings.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {riskData.warnings.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive What-If Simulator Panel */}
      {showSimulator && (
        <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-700/50 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>What-If Environmental Simulator</span>
            </span>
            <button
              onClick={onResetSimulation}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Reset to Live Weather
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Temperature:</span>
                <span className="font-mono text-slate-200">{simTemp}°C</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={simTemp}
                onChange={(e) => setSimTemp(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Relative Humidity:</span>
                <span className="font-mono text-slate-200">{simRh}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={simRh}
                onChange={(e) => setSimRh(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Wind Speed:</span>
                <span className="font-mono text-slate-200">{simWind} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={simWind}
                onChange={(e) => setSimWind(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Precipitation:</span>
                <span className="font-mono text-slate-200">{simPrecip} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={simPrecip}
                onChange={(e) => setSimPrecip(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          <button
            onClick={handleApplySim}
            className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold transition-colors"
          >
            Re-calculate Score With Simulated Atmospheric Variables
          </button>
        </div>
      )}

      {/* Factors Contributing to Score */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Factor Contribution Breakdown
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {riskData.factors.map((f) => (
            <div
              key={f.name}
              className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{f.display_name}</span>
                <span className="font-mono text-[10px] text-cyan-400">
                  Weight {(f.weight * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-baseline justify-between font-mono text-[11px]">
                <span className="text-slate-400">
                  Raw: {f.raw_value !== null ? `${f.raw_value} ${f.unit}` : "Missing"}
                </span>
                <span className="font-bold text-slate-200">
                  Contrib: +{f.weighted_contribution.toFixed(1)}
                </span>
              </div>

              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full"
                  style={{ width: `${f.normalized_score}%` }}
                ></div>
              </div>

              <p className="text-[10px] text-slate-500 leading-tight">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scientific Caveat Alert */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Scientific Caveat &amp; Limitations</span>
        </div>
        <p className="leading-relaxed">
          {riskData.disclaimer}
        </p>
      </div>
    </div>
  );
};
