"""Data schemas for satellite fire detections and summaries."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class FireDetection(BaseModel):
    id: str = Field(..., description="Deterministic hash ID for detection")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    brightness: Optional[float] = Field(None, description="Brightness temperature (Kelvin)")
    bright_t31: Optional[float] = Field(None, description="Channel 31/I5 brightness temperature (Kelvin)")
    frp: Optional[float] = Field(None, description="Fire Radiative Power (MW)")
    confidence: str = Field("nominal", description="Raw confidence indicator")
    confidence_category: str = Field("nominal", description="Normalized category: high, nominal, low, unknown")
    acquisition_date: str = Field(..., description="YYYY-MM-DD")
    acquisition_time: str = Field(..., description="HHMM UTC")
    acquisition_datetime_utc: Optional[str] = Field(None, description="ISO-8601 UTC timestamp")
    satellite: Optional[str] = Field(None, description="Satellite platform (e.g., NOAA-20, Suomi-NPP)")
    instrument: Optional[str] = Field(None, description="Sensor name (e.g., VIIRS, MODIS)")
    daynight: Optional[str] = Field(None, description="D for Day, N for Night")
    scan: Optional[float] = Field(None, description="Along-scan pixel size")
    track: Optional[float] = Field(None, description="Along-track pixel size")
    version: Optional[str] = Field(None, description="Processing version")


class ConfidenceBreakdown(BaseModel):
    high: int = 0
    nominal: int = 0
    low: int = 0
    unknown: int = 0


class FireSummary(BaseModel):
    total_detections: int
    confidence_breakdown: ConfidenceBreakdown
    sensors_breakdown: Dict[str, int] = Field(default_factory=dict)
    daynight_breakdown: Dict[str, int] = Field(default_factory=dict)
    avg_frp: Optional[float] = None
    max_frp: Optional[float] = None
    latest_observation_utc: Optional[str] = None
    data_freshness_hours: Optional[float] = None
    source: str
    is_demo: bool
    retrieved_at_utc: str
    disclaimer: str = (
        "Satellite thermal anomalies indicate radiative brightness heat signatures, "
        "not confirmed wildfires. Independent ground truth validation is required."
    )


class FiresResponse(BaseModel):
    items: List[FireDetection]
    summary: FireSummary
    query_params: Dict[str, Any]
    bounding_box: List[float]  # [min_lat, min_lon, max_lat, max_lon]
    is_demo: bool
    retrieval_status: str = "success"
    message: Optional[str] = None
