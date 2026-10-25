"""Data schemas for Open-Meteo weather data."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class WeatherCurrent(BaseModel):
    temperature_c: Optional[float] = Field(None, description="2-meter air temperature in Celsius")
    relative_humidity_pct: Optional[float] = Field(None, description="Relative humidity percentage (0-100)")
    wind_speed_kmh: Optional[float] = Field(None, description="10-meter wind speed in km/h")
    wind_direction_deg: Optional[float] = Field(None, description="Wind direction in degrees (0-360)")
    precipitation_mm: Optional[float] = Field(None, description="Current or recent precipitation in mm")
    weather_code: Optional[int] = Field(None, description="WMO weather interpretation code")
    is_day: Optional[int] = Field(None, description="1 for day, 0 for night")
    timestamp_utc: Optional[str] = Field(None, description="Observation timestamp in UTC")


class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    elevation_m: Optional[float] = None
    timezone: str = "UTC"
    current: Optional[WeatherCurrent] = None
    hourly_forecast: Optional[List[Dict[str, Any]]] = None
    source: str = "Open-Meteo Forecast API (open-meteo.com)"
    retrieved_at_utc: str
    data_type: str = "Model grid analysis / forecast"
    disclaimer: str = (
        "Weather values reflect numerical weather prediction model grid cells and do not "
        "represent exact microclimatic conditions at a specific fire pixel."
    )
