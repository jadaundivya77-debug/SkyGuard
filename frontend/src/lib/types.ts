export interface FireDetection {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number | null;
  bright_t31: number | null;
  frp: number | null;
  confidence: string;
  confidence_category: "high" | "nominal" | "low" | "unknown";
  acquisition_date: string;
  acquisition_time: string;
  acquisition_datetime_utc: string | null;
  satellite: string | null;
  instrument: string | null;
  daynight: string | null;
  scan: number | null;
  track: number | null;
  version: string | null;
}

export interface ConfidenceBreakdown {
  high: number;
  nominal: number;
  low: number;
  unknown: number;
}

export interface FireSummary {
  total_detections: number;
  confidence_breakdown: ConfidenceBreakdown;
  sensors_breakdown: Record<string, number>;
  daynight_breakdown: Record<string, number>;
  avg_frp: number | null;
  max_frp: number | null;
  latest_observation_utc: string | null;
  data_freshness_hours: number | null;
  source: string;
  is_demo: boolean;
  retrieved_at_utc: string;
  disclaimer: string;
}

export interface FiresResponse {
  items: FireDetection[];
  summary: FireSummary;
  query_params: Record<string, unknown>;
  bounding_box: [number, number, number, number];
  is_demo: boolean;
  retrieval_status: string;
  message?: string;
}

export interface WeatherCurrent {
  temperature_c: number | null;
  relative_humidity_pct: number | null;
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  precipitation_mm: number | null;
  weather_code: number | null;
  is_day: number | null;
  timestamp_utc: string | null;
}

export interface HourlyForecastItem {
  time: string;
  temperature_c: number | null;
  relative_humidity_pct: number | null;
  wind_speed_kmh: number | null;
  precipitation_probability_pct: number | null;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  timezone: string;
  current: WeatherCurrent | null;
  hourly_forecast: HourlyForecastItem[] | null;
  source: string;
  retrieved_at_utc: string;
  data_type: string;
  disclaimer: string;
}

export interface RiskFactor {
  name: string;
  display_name: string;
  raw_value: number | null;
  unit: string;
  normalized_score: number;
  weight: number;
  weighted_contribution: number;
  status: "available" | "missing" | "defaulted";
  description: string;
}

export interface RiskAssessmentResponse {
  overall_score: number;
  risk_level: "Low" | "Moderate" | "High" | "Very High" | "Extreme";
  latitude: number;
  longitude: number;
  factors: RiskFactor[];
  available_factors_count: number;
  total_factors_count: number;
  missing_factors: string[];
  confidence_in_score: string;
  warnings: string[];
  methodology: string;
  disclaimer: string;
  calculated_at_utc: string;
}

export interface ClusterItem {
  cluster_id: number;
  detection_count: number;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  min_latitude: number;
  max_latitude: number;
  min_longitude: number;
  max_longitude: number;
  avg_frp: number | null;
  max_frp: number | null;
  avg_brightness: number | null;
  latest_acq_utc: string | null;
  detection_ids: string[];
}

export interface ClustersResponse {
  clusters: ClusterItem[];
  cluster_count: number;
  total_detections: number;
  clustered_detections_count: number;
  noise_count: number;
  distance_threshold_km: number;
  min_cluster_size: number;
  algorithm: string;
  generated_at_utc: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp_utc: string;
  firms: {
    key_configured: boolean;
    default_sensor: string;
    cache_ttl_seconds: number;
  };
  weather: {
    provider: string;
    key_required: boolean;
    cache_ttl_seconds: number;
  };
  mode: {
    demo_mode_forced: boolean;
    can_access_live_firms: boolean;
  };
  cache: {
    firms: Record<string, unknown>;
    weather: Record<string, unknown>;
  };
}
