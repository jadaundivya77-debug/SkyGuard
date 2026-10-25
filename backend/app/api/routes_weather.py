"""Weather API route using Open-Meteo."""

import logging
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas.weather import WeatherResponse
from app.clients.open_meteo import OpenMeteoClient, OpenMeteoClientError


logger = logging.getLogger("skyguard.api.weather")
router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("", response_model=WeatherResponse)
async def get_weather(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target longitude"),
    force_refresh: bool = Query(False, description="Bypass weather cache"),
):
    """
    Retrieve real meteorological conditions (temperature, humidity, wind, precipitation)
    from Open-Meteo numerical weather model grid.
    """
    client = OpenMeteoClient()
    try:
        weather = await client.fetch_weather(
            latitude=latitude,
            longitude=longitude,
            force_refresh=force_refresh,
        )
        return weather
    except OpenMeteoClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Meteorological data provider failure: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process weather request: {str(exc)}",
        )
