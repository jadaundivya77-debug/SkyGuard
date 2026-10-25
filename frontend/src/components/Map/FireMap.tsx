"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { FireDetection, ClusterItem } from "@/lib/types";
import { MAP_BASEMAPS } from "@/lib/constants";
import { MapLegend } from "./MapLegend";
import { Flame, Maximize2, Radio } from "lucide-react";

interface FireMapProps {
  detections: FireDetection[];
  clusters: ClusterItem[];
  selectedHotspot: FireDetection | null;
  onSelectHotspot: (detection: FireDetection) => void;
  center: [number, number];
  zoom: number;
  isLoading: boolean;
}

// Subcomponent to smoothly animate map center/bounds updates
function MapController({
  center,
  zoom,
  targetBounds,
}: {
  center: [number, number];
  zoom: number;
  targetBounds: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetBounds) {
      map.fitBounds(targetBounds, { padding: [50, 50], maxZoom: 12 });
    } else {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, targetBounds]);

  return null;
}

export const FireMap: React.FC<FireMapProps> = ({
  detections,
  clusters,
  selectedHotspot,
  onSelectHotspot,
  center,
  zoom,
  isLoading,
}) => {
  const [selectedBasemap, setSelectedBasemap] = useState<string>("dark");
  const [showClusters, setShowClusters] = useState<boolean>(true);
  const [targetBounds, setTargetBounds] = useState<L.LatLngBoundsExpression | null>(null);

  const activeBasemap = useMemo(() => {
    return MAP_BASEMAPS.find((b) => b.id === selectedBasemap) || MAP_BASEMAPS[0];
  }, [selectedBasemap]);

  // Fit bounds to current detections
  const handleZoomToDetections = () => {
    if (detections.length === 0) return;
    const lats = detections.map((d) => d.latitude);
    const lons = detections.map((d) => d.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    if (minLat === maxLat && minLon === maxLon) {
      setTargetBounds([
        [minLat - 0.2, minLon - 0.2],
        [maxLat + 0.2, maxLon + 0.2],
      ]);
    } else {
      setTargetBounds([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);
    }
  };

  // Compute marker styling based on confidence & radiative power
  const getMarkerStyle = (item: FireDetection) => {
    const isSelected = selectedHotspot?.id === item.id;
    let color = "#f97316"; // default nominal orange
    let fillColor = "#ea580c";

    if (item.confidence_category === "high" || (item.frp && item.frp > 60)) {
      color = "#ef4444"; // red
      fillColor = "#dc2626";
    } else if (item.confidence_category === "low") {
      color = "#facc15"; // yellow/amber
      fillColor = "#eab308";
    }

    const radius = isSelected ? 9 : item.frp && item.frp > 50 ? 7 : 5;

    return {
      color: isSelected ? "#38bdf8" : color,
      weight: isSelected ? 3 : 1.5,
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.95 : 0.75,
      radius: radius,
    };
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[620px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[1100] bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="flex items-center space-x-2 bg-slate-900/95 border border-cyan-500/40 px-4 py-2 rounded-lg text-cyan-300 text-xs font-mono shadow-xl">
            <Radio className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Ingesting satellite telemetry...</span>
          </div>
        </div>
      )}

      {/* Floating Control: Zoom to Extent */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
        <button
          onClick={handleZoomToDetections}
          disabled={detections.length === 0}
          className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg disabled:opacity-40 transition-all flex items-center space-x-1.5 text-xs font-medium"
          title="Zoom to fit all active detections"
        >
          <Maximize2 className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Fit Detections</span>
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} targetBounds={targetBounds} />

        <TileLayer
          key={activeBasemap.id}
          url={activeBasemap.url}
          attribution={activeBasemap.attribution}
          maxZoom={19}
        />

        {/* Spatial Cluster Radii Overlays */}
        {showClusters &&
          clusters.map((c) => (
            <React.Fragment key={`cluster-${c.cluster_id}`}>
              <Circle
                center={[c.center_latitude, c.center_longitude]}
                radius={c.radius_km * 1000} // km to meters
                pathOptions={{
                  color: "#06b6d4",
                  fillColor: "#0891b2",
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: "4 4",
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <div className="font-bold text-cyan-400">
                      Cluster #{c.cluster_id} ({c.detection_count} detections)
                    </div>
                    <div className="text-slate-300">
                      Radius: <strong>{c.radius_km} km</strong>
                    </div>
                    {c.max_frp && (
                      <div className="text-slate-300">
                        Peak Radiative Power: <strong>{c.max_frp} MW</strong>
                      </div>
                    )}
                  </div>
                </Popup>
              </Circle>
            </React.Fragment>
          ))}

        {/* Individual Hotspot Circle Markers */}
        {detections.map((item) => {
          const style = getMarkerStyle(item);
          return (
            <CircleMarker
              key={item.id}
              center={[item.latitude, item.longitude]}
              pathOptions={style}
              eventHandlers={{
                click: () => onSelectHotspot(item),
              }}
            >
              <Popup>
                <div className="p-1.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                    <span className="font-bold text-white flex items-center space-x-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Hotspot Pixel</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.confidence_category === "high"
                          ? "bg-red-950 text-red-300 border border-red-700"
                          : item.confidence_category === "low"
                          ? "bg-amber-950 text-amber-300 border border-amber-700"
                          : "bg-orange-950 text-orange-300 border border-orange-700"
                      }`}
                    >
                      {item.confidence_category}
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px] text-slate-300">
                    <div>
                      Coords: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </div>
                    {item.frp !== null && (
                      <div className="text-amber-400">
                        Radiative Power: <strong>{item.frp} MW</strong>
                      </div>
                    )}
                    {item.brightness !== null && (
                      <div>Brightness: {item.brightness} K</div>
                    )}
                    <div>
                      Acquired: {item.acquisition_date} {item.acquisition_time} UTC
                    </div>
                    <div className="text-slate-400">
                      Platform: {item.satellite || "Unknown"} ({item.instrument || "VIIRS"})
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectHotspot(item)}
                    className="w-full mt-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium transition-colors"
                  >
                    Inspect Telemetry &amp; Risk
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <MapLegend
        showClusters={showClusters}
        onToggleClusters={() => setShowClusters(!showClusters)}
        selectedBasemap={selectedBasemap}
        onChangeBasemap={setSelectedBasemap}
        basemaps={MAP_BASEMAPS}
        totalCount={detections.length}
      />
    </div>
  );
};

export default FireMap;
