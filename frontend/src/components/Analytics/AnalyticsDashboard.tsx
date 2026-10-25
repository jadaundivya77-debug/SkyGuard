"use client";

import React, { useMemo } from "react";
import { FireDetection, ClusterItem, FireSummary } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, Flame, Radio, MapPin } from "lucide-react";

interface AnalyticsDashboardProps {
  detections: FireDetection[];
  clusters: ClusterItem[];
  summary: FireSummary | null;
  onSelectCluster: (cluster: ClusterItem) => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#ef4444",
  nominal: "#f97316",
  low: "#eab308",
  unknown: "#64748b",
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  detections,
  clusters,
  summary,
  onSelectCluster,
}) => {
  // Timeline: Aggregate detections by acquisition date & hour
  const timelineData = useMemo(() => {
    const buckets: Record<string, number> = {};
    detections.forEach((d) => {
      const hour = d.acquisition_time.slice(0, 2) + ":00";
      const key = `${d.acquisition_date.slice(5)} ${hour}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });

    return Object.entries(buckets)
      .map(([time, count]) => ({ time, count }))
      .slice(-12); // last 12 observation slots
  }, [detections]);

  // FRP Distribution buckets
  const frpData = useMemo(() => {
    const buckets = [
      { range: "< 15 MW", count: 0 },
      { range: "15-30 MW", count: 0 },
      { range: "30-60 MW", count: 0 },
      { range: "60-100 MW", count: 0 },
      { range: "> 100 MW", count: 0 },
    ];

    detections.forEach((d) => {
      const frp = d.frp || 0;
      if (frp < 15) buckets[0].count++;
      else if (frp < 30) buckets[1].count++;
      else if (frp < 60) buckets[2].count++;
      else if (frp < 100) buckets[3].count++;
      else buckets[4].count++;
    });

    return buckets;
  }, [detections]);

  // Confidence Pie Data
  const confidenceData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "High", value: summary.confidence_breakdown.high, color: CONFIDENCE_COLORS.high },
      { name: "Nominal", value: summary.confidence_breakdown.nominal, color: CONFIDENCE_COLORS.nominal },
      { name: "Low", value: summary.confidence_breakdown.low, color: CONFIDENCE_COLORS.low },
    ].filter((item) => item.value > 0);
  }, [summary]);

  return (
    <div className="space-y-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Hotspots</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {summary ? summary.total_detections : detections.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Satellite Thermal Pixels</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span>High Confidence</span>
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {summary?.confidence_breakdown.high || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {summary && summary.total_detections > 0
              ? `${Math.round((summary.confidence_breakdown.high / summary.total_detections) * 100)}% of detections`
              : "0%"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Peak Radiative Power</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {summary?.max_frp ? `${summary.max_frp} MW` : "N/A"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Avg: {summary?.avg_frp ? `${summary.avg_frp} MW` : "N/A"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Spatial Clusters</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {clusters.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">DBSCAN Groups (&le;15km)</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline Chart */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-white text-xs">Detections Over Time (UTC)</span>
            <span className="text-[10px] text-slate-400 font-mono">VIIRS/MODIS</span>
          </div>
          <div className="h-44 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData}>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} width={25} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No temporal telemetry for this query
              </div>
            )}
          </div>
        </div>

        {/* FRP Distribution */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-white text-xs">Fire Radiative Power (MW)</span>
            <span className="text-[10px] text-slate-400 font-mono">Intensity</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frpData}>
                <XAxis dataKey="range" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                />
                <Bar dataKey="count" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Breakdown */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-white text-xs">Confidence Classification</span>
            <span className="text-[10px] text-slate-400 font-mono">Algorithm Score</span>
          </div>
          <div className="h-44 w-full flex items-center justify-center">
            {confidenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={confidenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {confidenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No confidence breakdown available</div>
            )}
          </div>
        </div>
      </div>

      {/* Detected Clusters Table */}
      {clusters.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white text-xs">Identified Spatial Clusters (DBSCAN)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Radius &le; 15 km</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="py-1.5 px-2">ID</th>
                  <th className="py-1.5 px-2">Detections</th>
                  <th className="py-1.5 px-2">Centroid Lat/Lon</th>
                  <th className="py-1.5 px-2">Radius</th>
                  <th className="py-1.5 px-2">Max FRP</th>
                  <th className="py-1.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {clusters.slice(0, 5).map((c) => (
                  <tr key={c.cluster_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 text-cyan-400 font-bold">#{c.cluster_id}</td>
                    <td className="py-2 px-2">{c.detection_count} points</td>
                    <td className="py-2 px-2">
                      {c.center_latitude.toFixed(3)}, {c.center_longitude.toFixed(3)}
                    </td>
                    <td className="py-2 px-2">{c.radius_km} km</td>
                    <td className="py-2 px-2 text-amber-400">{c.max_frp ? `${c.max_frp} MW` : "N/A"}</td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => onSelectCluster(c)}
                        className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
