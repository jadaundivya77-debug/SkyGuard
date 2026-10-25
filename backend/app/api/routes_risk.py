"""Environmental Risk Assessment API route."""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas.risk import RiskAssessmentResponse
from app.schemas.weather import WeatherCurrent
from app.clients.open_meteo import OpenMeteoClient
from app.services.risk_engine import calculate_environmental_risk


logger = logging.getLogger("skyguard.api.risk")
router = APIRouter(prefix="/risk", tags=["Risk Assessment"])


@router.get("", response_model=RiskAssessmentResponse)
async def get_environmental_risk(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target longitude"),
    # Optional manual overrides for what-if simulation & testing
    override_temp: Optional[float] = Query(None, description="Manual temperature override in °C"),
    override_rh: Optional[float] = Query(None, ge=0.0, le=100.0, description="Manual relative humidity override in %"),
    override_wind: Optional[float] = Query(None, ge=0.0, description="Manual wind speed override in km/h"),
    override_precip: Optional[float] = Query(None, ge=0.0, description="Manual precipitation override in mm"),
):
    """
    Calculate an experimental, explainable environmental risk estimate (0-100)
    for requested coordinates using live Open-Meteo meteorological data.
    """
    weather_cur: Optional[WeatherCurrent] = None

    # If any overrides are supplied, use them; otherwise fetch from Open-Meteo
    has_overrides = any(
        x is not None for x in [override_temp, override_rh, override_wind, override_precip]
    )

    if not has_overrides:
        client = OpenMeteoClient()
        try:
            weather_res = await client.fetch_weather(latitude, longitude)
            weather_cur = weather_res.current
        except Exception as exc:
            logger.warning(f"Could not retrieve weather for ({latitude}, {longitude}): {exc}")
            # Do NOT fail completely; the risk engine handles missing inputs gracefully and documents degraded confidence
            weather_cur = None
    else:
        # Use provided what-if overrides
        weather_cur = WeatherCurrent(
            temperature_c=override_temp,
            relative_humidity_pct=override_rh,
            wind_speed_kmh=override_wind,
            precipitation_mm=override_precip,
        )

    risk_result = calculate_environmental_risk(
        latitude=latitude,
        longitude=longitude,
        weather=weather_cur,
    )

    return risk_result
