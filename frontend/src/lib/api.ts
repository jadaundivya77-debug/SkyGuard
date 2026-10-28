import {
  HealthResponse,
  FiresResponse,
  FireSummary,
  WeatherResponse,
  RiskAssessmentResponse,
  ClustersResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export interface FetchFiresParams {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
  source?: string;
  dayRange?: number;
  demo?: boolean;
  forceRefresh?: boolean;
}

export async function fetchFires(params: FetchFiresParams): Promise<FiresResponse> {
  const query = new URLSearchParams({
    min_lat: params.minLat.toString(),
    min_lon: params.minLon.toString(),
    max_lat: params.maxLat.toString(),
    max_lon: params.maxLon.toString(),
    source: params.source || "VIIRS_NOAA20_NRT",
    day_range: (params.dayRange || 1).toString(),
    force_refresh: params.forceRefresh ? "true" : "false",
  });

  if (params.demo !== undefined) {
    query.set("demo", params.demo ? "true" : "false");
  }

  const res = await fetch(`${API_BASE}/api/fires?${query.toString()}`, { cache: "no-store" });
  
  
if (!res.ok) {
  const responseText = await res.text();

  console.error("NASA FIRMS request failed:", {
    status: res.status,
    url: res.url,
    response: responseText,
  });

  let message = `Error fetching active fire detections (${res.status})`;

  try {
    const errorData = JSON.parse(responseText);
    message =
      typeof errorData.detail === "string"
        ? errorData.detail
        : JSON.stringify(errorData.detail ?? errorData);
  } catch {
    if (responseText) message = responseText;
  }

  const error = new Error(message) as Error & { status?: number };
  error.status = res.status;
  throw error;
}

  return res.json();
}

export async function fetchFiresSummary(params: FetchFiresParams): Promise<FireSummary> {
  const query = new URLSearchParams({
    min_lat: params.minLat.toString(),
    min_lon: params.minLon.toString(),
    max_lat: params.maxLat.toString(),
    max_lon: params.maxLon.toString(),
    source: params.source || "VIIRS_NOAA20_NRT",
    day_range: (params.dayRange || 1).toString(),
  });

  if (params.demo !== undefined) {
    query.set("demo", params.demo ? "true" : "false");
  }

  const res = await fetch(`${API_BASE}/api/fires/summary?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Error fetching fires summary: ${res.status}`);
  }
  return res.json();
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  forceRefresh: boolean = false
): Promise<WeatherResponse> {
  const query = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    force_refresh: forceRefresh ? "true" : "false",
  });

  const res = await fetch(`${API_BASE}/api/weather?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error fetching weather: ${res.status}`);
  }
  return res.json();
}

export interface RiskParams {
  latitude: number;
  longitude: number;
  temp?: number;
  rh?: number;
  wind?: number;
  precip?: number;
}

export async function fetchRiskAssessment(params: RiskParams): Promise<RiskAssessmentResponse> {
  const query = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
  });

  if (params.temp !== undefined) query.set("override_temp", params.temp.toString());
  if (params.rh !== undefined) query.set("override_rh", params.rh.toString());
  if (params.wind !== undefined) query.set("override_wind", params.wind.toString());
  if (params.precip !== undefined) query.set("override_precip", params.precip.toString());

  const res = await fetch(`${API_BASE}/api/risk?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error calculating risk assessment: ${res.status}`);
  }
  return res.json();
}

export interface FetchClustersParams extends FetchFiresParams {
  epsKm?: number;
  minSamples?: number;
}

export async function fetchClusters(params: FetchClustersParams): Promise<ClustersResponse> {
  const query = new URLSearchParams({
    min_lat: params.minLat.toString(),
    min_lon: params.minLon.toString(),
    max_lat: params.maxLat.toString(),
    max_lon: params.maxLon.toString(),
    source: params.source || "VIIRS_NOAA20_NRT",
    day_range: (params.dayRange || 1).toString(),
    eps_km: (params.epsKm || 15.0).toString(),
    min_samples: (params.minSamples || 3).toString(),
  });

  if (params.demo !== undefined) {
    query.set("demo", params.demo ? "true" : "false");
  }

  const res = await fetch(`${API_BASE}/api/clusters?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Error fetching clusters: ${res.status}`);
  }
  return res.json();
}

export function getReportDownloadUrl(params: FetchFiresParams, format: "csv" | "json" = "csv"): string {
  const query = new URLSearchParams({
    min_lat: params.minLat.toString(),
    min_lon: params.minLon.toString(),
    max_lat: params.maxLat.toString(),
    max_lon: params.maxLon.toString(),
    source: params.source || "VIIRS_NOAA20_NRT",
    day_range: (params.dayRange || 1).toString(),
    format: format,
  });

  if (params.demo !== undefined) {
    query.set("demo", params.demo ? "true" : "false");
  }

  return `${API_BASE}/api/report?${query.toString()}`;
}
