"""Open-Meteo Meteorological Forecast API Client."""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import httpx
from app.config import settings
from app.schemas.weather import WeatherResponse, WeatherCurrent
from app.services.cache import weather_cache


logger = logging.getLogger("skyguard.open_meteo")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


class OpenMeteoClientError(Exception):
    """Exception raised on Open-Meteo failures."""
    pass


class OpenMeteoClient:
    """HTTP client for Open-Meteo weather forecast and current atmospheric conditions."""

    async def fetch_weather(
        self,
        latitude: float,
        longitude: float,
        force_refresh: bool = False,
    ) -> WeatherResponse:
        """Fetch current weather and next 24-hr hourly forecast for given coordinates."""
        # Round coordinates to 2 decimal places (~1.1 km) for efficient grid caching
        lat_rounded = round(latitude, 2)
        lon_rounded = round(longitude, 2)
        cache_key = f"weather:{lat_rounded}:{lon_rounded}"

        if not force_refresh:
            cached_val = weather_cache.get(cache_key)
            if cached_val is not None:
                return cached_val

        params = {
            "latitude": lat_rounded,
            "longitude": lon_rounded,
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code,is_day",
            "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability",
            "timezone": "UTC",
            "forecast_days": 2,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(OPEN_METEO_URL, params=params)
                if resp.status_code != 200:
                    raise OpenMeteoClientError(f"Open-Meteo returned status {resp.status_code}: {resp.text}")
                data = resp.json()
        except httpx.TimeoutException:
            raise OpenMeteoClientError("Open-Meteo API request timed out (10s limit).")
        except httpx.RequestError as exc:
            raise OpenMeteoClientError(f"Network error querying Open-Meteo: {str(exc)}")

        # Parse current block
        cur = data.get("current", {})
        weather_cur = WeatherCurrent(
            temperature_c=cur.get("temperature_2m"),
            relative_humidity_pct=cur.get("relative_humidity_2m"),
            wind_speed_kmh=cur.get("wind_speed_10m"),
            wind_direction_deg=cur.get("wind_direction_10m"),
            precipitation_mm=cur.get("precipitation"),
            weather_code=cur.get("weather_code"),
            is_day=cur.get("is_day"),
            timestamp_utc=cur.get("time"),
        )

        # Parse hourly block for next 24 hours
        hourly_raw = data.get("hourly", {})
        times = hourly_raw.get("time", [])[:24]
        temps = hourly_raw.get("temperature_2m", [])[:24]
        rhs = hourly_raw.get("relative_humidity_2m", [])[:24]
        winds = hourly_raw.get("wind_speed_10m", [])[:24]
        precip_probs = hourly_raw.get("precipitation_probability", [])[:24]

        hourly_list: List[Dict[str, Any]] = []
        for i in range(len(times)):
            hourly_list.append({
                "time": times[i],
                "temperature_c": temps[i] if i < len(temps) else None,
                "relative_humidity_pct": rhs[i] if i < len(rhs) else None,
                "wind_speed_kmh": winds[i] if i < len(winds) else None,
                "precipitation_probability_pct": precip_probs[i] if i < len(precip_probs) else None,
            })

        now_utc = datetime.now(timezone.utc).isoformat()
        response = WeatherResponse(
            latitude=latitude,
            longitude=longitude,
            elevation_m=data.get("elevation"),
            timezone=data.get("timezone", "UTC"),
            current=weather_cur,
            hourly_forecast=hourly_list,
            source="Open-Meteo Numerical Weather Prediction API",
            retrieved_at_utc=now_utc,
            data_type="ECMWF/GFS numerical forecast grid interpolation",
        )

        weather_cache.set(cache_key, response, ttl=settings.weather_cache_ttl)
        return response
