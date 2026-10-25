"use client";

import React from "react";
import { KeyRound, X, ExternalLink, CheckCircle2, ShieldAlert } from "lucide-react";

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasFirmsKey: boolean;
  onSwitchToDemo: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  hasFirmsKey,
  onSwitchToDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-200 text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">NASA FIRMS API Key Configuration</h2>
              <p className="text-[11px] text-slate-400">
                Setup guide for accessing live VIIRS &amp; MODIS near-real-time satellite active-fire telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            hasFirmsKey
              ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-200"
              : "bg-amber-950/30 border-amber-800/50 text-amber-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {hasFirmsKey ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span>
              <strong>Current Status:</strong>{" "}
              {hasFirmsKey ? "FIRMS_MAP_KEY is active and configured in backend environment." : "FIRMS_MAP_KEY is missing or empty."}
            </span>
          </div>
          {!hasFirmsKey && (
            <button
              onClick={() => {
                onSwitchToDemo();
                onClose();
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-[11px] transition-colors"
            >
              Use Demo Mode
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
            How to obtain and configure your free NASA key:
          </div>

          <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
            <li className="leading-relaxed">
              <strong>Register for a free NASA MAP_KEY:</strong> Visit the official NASA FIRMS portal and submit your email.
              <div className="mt-1 ml-4">
                <a
                  href="https://firms.modaps.eosdis.nasa.gov/api/map_key"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-cyan-400 hover:underline font-mono"
                >
                  <span>https://firms.modaps.eosdis.nasa.gov/api/map_key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </li>

            <li className="leading-relaxed">
              <strong>Check your email:</strong> NASA will immediately send you your personal 32-character hexadecimal MAP_KEY.
            </li>

            <li className="leading-relaxed">
              <strong>Add key to backend configuration:</strong> Open or create{" "}
              <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                backend/.env
              </code>{" "}
              and assign your key:
              <div className="mt-1.5 ml-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 flex items-center justify-between">
                <span>FIRMS_MAP_KEY=your_32_char_nasa_key</span>
              </div>
            </li>

            <li className="leading-relaxed">
              <strong>Restart the backend service:</strong> The backend will automatically detect the key, query the live VIIRS API, and stream real thermal anomalies.
            </li>
          </ol>
        </div>

        {/* Difference note */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 text-slate-400 text-[11px]">
          <div className="font-semibold text-slate-300">Live vs Demo Mode:</div>
          <p>
            When in <strong>DEMO MODE</strong>, SKYGUARD uses a bundled verified sample dataset (real historical VIIRS satellite observations across California, Greece, Australia, and the Amazon).
            When <strong>LIVE NASA FIRMS</strong> is toggled, SKYGUARD makes direct, authenticated API calls to NASA&apos;s EOSDIS servers.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
