"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { StatusBanner } from "@/components/StatusBanner";
import { FiltersPanel } from "@/components/Panels/FiltersPanel";
import { HotspotDetailPanel } from "@/components/Panels/HotspotDetailPanel";
import { RiskAssessmentPanel } from "@/components/Panels/RiskAssessmentPanel";
import { AnalyticsDashboard } from "@/components/Analytics/AnalyticsDashboard";
import { SetupGuideModal } from "@/components/Panels/SetupGuideModal";
import { REGION_PRESETS, RegionPreset } from "@/lib/constants";
import {
  FireDetection,
  FireSummary,
  ClusterItem,
  WeatherResponse,
  RiskAssessmentResponse,
} from "@/lib/types";
import {
  fetchHealth,
  fetchFires,
  fetchClusters,
  fetchWeather,
  fetchRiskAssessment,
  getReportDownloadUrl,
} from "@/lib/api";
import { Map as MapIcon, BarChart3, BookOpen, Layers, Flame } from "lucide-react";

// Dynamic import of Leaflet map with SSR disabled
const FireMap = dynamic(() => import("@/components/Map/FireMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] lg:h-[620px] rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center space-y-2 text-slate-400 font-mono text-xs">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <span>Initializing Geospatial Map Engine...</span>
    </div>
  ),
});

export default function SkyGuardDashboard() {
  // App Telemetry State
  const [hasFirmsKey, setHasFirmsKey] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"map" | "analytics" | "methodology">("map");

  // Query & Filter State
  const [selectedRegion, setSelectedRegion] = useState<RegionPreset>(REGION_PRESETS[0]);
  const [customBbox, setCustomBbox] = useState<[number, number, number, number]>(REGION_PRESETS[0].bbox);
  const [selectedSensor, setSelectedSensor] = useState<string>("VIIRS_NOAA20_NRT");
  const [dayRange, setDayRange] = useState<number>(1);
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "nominal_high">("all");

  // Data State
  const [detections, setDetections] = useState<FireDetection[]>([]);
  const [summary, setSummary] = useState<FireSummary | null>(null);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<FireDetection | null>(null);
  const [hotspotWeather, setHotspotWeather] = useState<WeatherResponse | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentResponse | null>(null);

  // Loading & Error States
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState<boolean>(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [isLoadingRisk, setIsLoadingRisk] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial Health Check on Mount
  useEffect(() => {
    async function initHealth() {
      try {
        const health = await fetchHealth();
        const keyOk = health.firms.key_configured;
        setHasFirmsKey(keyOk);
        // If no key is configured, start in demo mode
        if (!keyOk) {
          setIsDemoMode(true);
        } else {
          setIsDemoMode(health.mode.demo_mode_forced);
        }
      } catch (err) {
        console.warn("Could not reach backend health endpoint:", err);
        setIsDemoMode(true);
      }
    }
    initHealth();
  }, []);

  // 2. Load Collocated Weather and Risk for Selected Hotspot
  const loadWeatherAndRisk = useCallback(async (hotspot: FireDetection) => {
    setIsLoadingWeather(true);
    setIsLoadingRisk(true);

    try {
      // Fetch live weather
      const weather = await fetchWeather(hotspot.latitude, hotspot.longitude);
      setHotspotWeather(weather);

      // Fetch environmental risk heuristic
      const risk = await fetchRiskAssessment({
        latitude: hotspot.latitude,
        longitude: hotspot.longitude,
      });
      setRiskAssessment(risk);
    } catch (err) {
      console.warn("Weather/Risk loading warning:", err);
      // Fallback: evaluate baseline risk with defaults if external weather is temporarily unreachable
      try {
        const risk = await fetchRiskAssessment({
          latitude: hotspot.latitude,
          longitude: hotspot.longitude,
        });
        setRiskAssessment(risk);
      } catch (riskErr) {
        console.error("Failed to calculate fallback risk:", riskErr);
      }
    } finally {
      setIsLoadingWeather(false);
      setIsLoadingRisk(false);
    }
  }, []);

  // 3. Fetch Active Fires and Spatial Clusters
  const loadTelemetry = useCallback(
    async (forceRefresh: boolean = false) => {
      setIsLoadingTelemetry(true);
      setErrorMessage(null);

      const bbox = selectedRegion.id === "custom" ? customBbox : selectedRegion.bbox;
      const [minLat, minLon, maxLat, maxLon] = bbox;

      try {
        const [firesRes, clustersRes] = await Promise.all([
          fetchFires({
            minLat,
            minLon,
            maxLat,
            maxLon,
            source: selectedSensor,
            dayRange,
            demo: isDemoMode,
            forceRefresh,
          }),
          fetchClusters({
            minLat,
            minLon,
            maxLat,
            maxLon,
            source: selectedSensor,
            dayRange,
            demo: isDemoMode,
            epsKm: 15.0,
            minSamples: 3,
          }).catch((err) => {
            console.warn("Clusters fetch warning:", err);
            return {
              clusters: [],
              cluster_count: 0,
              total_detections: 0,
              clustered_detections_count: 0,
              noise_count: 0,
              distance_threshold_km: 15,
              min_cluster_size: 3,
              algorithm: "Haversine DBSCAN",
              generated_at_utc: new Date().toISOString(),
            };
          }),
        ]);

        setDetections(firesRes.items);
        setSummary(firesRes.summary);
        setClusters(clustersRes.clusters);

        // Auto-select the first hotspot if available
        if (firesRes.items.length > 0) {
          const first = firesRes.items[0];
          setSelectedHotspot(first);
          loadWeatherAndRisk(first);
        } else {
          setSelectedHotspot(null);
          setHotspotWeather(null);
          setRiskAssessment(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to retrieve satellite observations.";
        console.error("Failed to fetch satellite telemetry:", err);
        setErrorMessage(msg);
        setDetections([]);
        setSummary(null);
        setClusters([]);
      } finally {
        setIsLoadingTelemetry(false);
      }
    },
    [selectedRegion, customBbox, selectedSensor, dayRange, isDemoMode, loadWeatherAndRisk]
  );

  // Trigger telemetry fetch on filter or mode changes
  useEffect(() => {
    let ignore = false;
    async function execute() {
      if (!ignore) {
        await loadTelemetry(false);
      }
    }
    execute();
    return () => {
      ignore = true;
    };
  }, [loadTelemetry]);

  // Hotspot Click Handler
  const handleSelectHotspot = (hotspot: FireDetection) => {
    setSelectedHotspot(hotspot);
    loadWeatherAndRisk(hotspot);
  };

  // What-If Simulator Handler
  const handleSimulateRisk = async (temp: number, rh: number, wind: number, precip: number) => {
    if (!selectedHotspot) return;
    setIsLoadingRisk(true);
    try {
      const risk = await fetchRiskAssessment({
        latitude: selectedHotspot.latitude,
        longitude: selectedHotspot.longitude,
        temp,
        rh,
        wind,
        precip,
      });
      setRiskAssessment(risk);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  const handleResetSimulation = () => {
    if (selectedHotspot) {
      loadWeatherAndRisk(selectedHotspot);
    }
  };

  // Cluster Selection Handler
  const handleSelectCluster = (cluster: ClusterItem) => {
    // Find first member detection in cluster
    const member = detections.find((d) => d.id === cluster.detection_ids[0]);
    if (member) {
      handleSelectHotspot(member);
    }
    setActiveTab("map");
  };

  // Mode Toggle Handler
  const handleToggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  // Filtered Detections based on confidence
  const visibleDetections = useMemo(() => {
    if (confidenceFilter === "all") return detections;
    if (confidenceFilter === "high") {
      return detections.filter((d) => d.confidence_category === "high");
    }
    if (confidenceFilter === "nominal_high") {
      return detections.filter(
        (d) => d.confidence_category === "high" || d.confidence_category === "nominal"
      );
    }
    return detections;
  }, [detections, confidenceFilter]);

  // Report Export Handlers
  const handleExportCsv = () => {
    const bbox = selectedRegion.id === "custom" ? customBbox : selectedRegion.bbox;
    const url = getReportDownloadUrl(
      {
        minLat: bbox[0],
        minLon: bbox[1],
        maxLat: bbox[2],
        maxLon: bbox[3],
        source: selectedSensor,
        dayRange,
        demo: isDemoMode,
      },
      "csv"
    );
    window.open(url, "_blank");
  };

  const handleExportJson = () => {
    const bbox = selectedRegion.id === "custom" ? customBbox : selectedRegion.bbox;
    const url = getReportDownloadUrl(
      {
        minLat: bbox[0],
        minLon: bbox[1],
        maxLat: bbox[2],
        maxLon: bbox[3],
        source: selectedSensor,
        dayRange,
        demo: isDemoMode,
      },
      "json"
    );
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
        onRefresh={() => loadTelemetry(true)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        isLoading={isLoadingTelemetry}
        hasFirmsKey={hasFirmsKey}
        totalDetections={detections.length}
      />

      {/* Persistent Status / Mode Banner */}
      <StatusBanner
        isDemoMode={isDemoMode}
        hasFirmsKey={hasFirmsKey}
        summary={summary}
        errorMessage={errorMessage}
        onSwitchToDemo={() => setIsDemoMode(true)}
        onOpenSetup={() => setIsSetupModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Spatial Query Controls & Filters Panel */}
        <FiltersPanel
          selectedRegionId={selectedRegion.id}
          onSelectRegion={(preset) => {
            setSelectedRegion(preset);
            setCustomBbox(preset.bbox);
          }}
          customBbox={customBbox}
          onChangeCustomBbox={setCustomBbox}
          selectedSensor={selectedSensor}
          onChangeSensor={setSelectedSensor}
          dayRange={dayRange}
          onChangeDayRange={setDayRange}
          confidenceFilter={confidenceFilter}
          onChangeConfidenceFilter={setConfidenceFilter}
          onApplyFilters={() => loadTelemetry(true)}
          isLoading={isLoadingTelemetry}
        />

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === "map"
                ? "bg-cyan-950 border border-cyan-500/60 text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Interactive Map &amp; Inspection ({visibleDetections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === "analytics"
                ? "bg-cyan-950 border border-cyan-500/60 text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Telemetry Analytics &amp; Clusters ({clusters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("methodology")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === "methodology"
                ? "bg-cyan-950 border border-cyan-500/60 text-cyan-300"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Methodology &amp; Disclaimers</span>
          </button>
        </div>

        {/* TAB 1: Geospatial Operations & Hotspot Inspection */}
        {activeTab === "map" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left/Main Column: Leaflet Map */}
            <div className="lg:col-span-8 space-y-4">
              <FireMap
                detections={visibleDetections}
                clusters={clusters}
                selectedHotspot={selectedHotspot}
                onSelectHotspot={handleSelectHotspot}
                center={selectedRegion.center}
                zoom={selectedRegion.zoom}
                isLoading={isLoadingTelemetry}
              />
            </div>

            {/* Right Column: Selected Hotspot Telemetry & Environmental Risk Score */}
            <div className="lg:col-span-4 space-y-4">
              <HotspotDetailPanel
                hotspot={selectedHotspot}
                weather={hotspotWeather}
                isLoadingWeather={isLoadingWeather}
                onAnalyzeRisk={loadWeatherAndRisk}
              />

              <RiskAssessmentPanel
                riskData={riskAssessment}
                isLoading={isLoadingRisk}
                onSimulate={handleSimulateRisk}
                onResetSimulation={handleResetSimulation}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Analytics & Clustered Hotspots */}
        {activeTab === "analytics" && (
          <AnalyticsDashboard
            detections={visibleDetections}
            clusters={clusters}
            summary={summary}
            onSelectCluster={handleSelectCluster}
          />
        )}

        {/* TAB 3: Scientific Methodology & Attribution */}
        {activeTab === "methodology" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 text-xs text-slate-300">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span>Scientific Methodology, Data Provenance &amp; System Limitations</span>
              </h2>
              <p className="text-slate-400 mt-1">
                Transparency and remote sensing documentation for SKYGUARD — Eyes on Earth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
              {/* Remote Sensing Principles */}
              <div className="space-y-3">
                <h3 className="font-semibold text-cyan-300 text-sm flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>1. Thermal Anomaly Detections vs Confirmed Wildfires</span>
                </h3>
                <p>
                  Satellite radiometers (such as the 375m VIIRS sensor aboard NOAA-20 and Suomi-NPP, and the 1km MODIS sensor aboard Terra and Aqua) detect thermal anomalies by measuring mid-infrared brightness temperature (3.9 µm channel) against the background longwave infrared emission (11.0 µm channel).
                </p>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-amber-300/90 space-y-1">
                  <strong>Critical Scientific Distinction:</strong>
                  <p>
                    A satellite-observed hotspot indicates an elevated localized radiative heat signature. It does <em>not</em> constitute a confirmed wildfire without independent ground or airborne validation. Hotspots can also arise from prescribed agricultural burns, industrial flaring, solar panel reflections, or volcanic activity.
                  </p>
                </div>
              </div>

              {/* Environmental Risk Heuristic */}
              <div className="space-y-3">
                <h3 className="font-semibold text-cyan-300 text-sm flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>2. Explainable Environmental Risk Heuristic</span>
                </h3>
                <p>
                  SKYGUARD integrates numerical weather prediction data from Open-Meteo to calculate a transparent atmospheric susceptibility score from 0 to 100 based on four physical fire-weather drivers:
                </p>
                <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-300">
                  <li><strong>Relative Humidity Deficit (35% weight):</strong> Desiccates 1-hour and 10-hour fine fuels when ambient RH drops below 25%.</li>
                  <li><strong>Air Temperature (25% weight):</strong> Thermal preheating and elevated vapor pressure deficit above 25°C.</li>
                  <li><strong>Sustained Wind Speed (25% weight):</strong> Supplies convective oxygen and governs flame front tilt and spotting.</li>
                  <li><strong>Precipitation Deficit (15% weight):</strong> Absence of recent rainfall (&lt; 5mm) elevating fuel combustibility.</li>
                </ul>
                <p className="text-slate-400 text-[11px]">
                  <strong>Notice:</strong> This is a transparent, explainable heuristic. It is <em>not</em> a machine-learning probability model and must not be interpreted as guaranteed wildfire spread.
                </p>
              </div>

              {/* Clustering Methodology */}
              <div className="space-y-3">
                <h3 className="font-semibold text-cyan-300 text-sm">3. Spatial Clustering Algorithm</h3>
                <p>
                  Spatial groupings are derived using a density-based spatial clustering (DBSCAN) algorithm parameterized with great-circle Haversine distances. Hotspot pixels within an epsilon neighborhood of 15 kilometers with at least 3 detections are aggregated into incident complexes, calculating bounding boxes, geometric centroids, and composite fire radiative power (FRP).
                </p>
              </div>

              {/* Data Providers & Attribution */}
              <div className="space-y-3">
                <h3 className="font-semibold text-cyan-300 text-sm">4. Data Attribution &amp; Credits</h3>
                <ul className="space-y-1.5 text-slate-400">
                  <li>
                    <strong>NASA FIRMS:</strong> Earth Observing System Data and Information System (EOSDIS), NASA Goddard Space Flight Center. Near-Real-Time active fire data.
                  </li>
                  <li>
                    <strong>Open-Meteo:</strong> Free Weather Forecast API, integrating ECMWF, GFS, and DWD numerical weather prediction grids.
                  </li>
                  <li>
                    <strong>Mapping Basemaps:</strong> CARTO Dark Matter &amp; OpenStreetMap contributors; Esri World Imagery.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>SKYGUARD — Eyes on Earth</strong> • Student Space-Technology Innovation Prototype
          </span>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>NASA FIRMS VIIRS/MODIS Telemetry</span>
            <span>•</span>
            <span>Open-Meteo NWP Grid</span>
            <span>•</span>
            <span>Leaflet Geospatial Engine</span>
          </div>
        </div>
      </footer>

      {/* NASA Key Setup Modal */}
      <SetupGuideModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        hasFirmsKey={hasFirmsKey}
        onSwitchToDemo={() => setIsDemoMode(true)}
      />
    </div>
  );
}
