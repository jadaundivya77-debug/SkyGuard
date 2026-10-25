"""Fire detection and summary API endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.config import settings
from app.schemas.fire import FiresResponse, FireSummary
from app.clients.firms import (
    FirmsClient,
    FirmsAuthError,
    FirmsRateLimitError,
    FirmsUpstreamError,
    FirmsClientError,
    SUPPORTED_SENSORS,
)
from app.services.demo_data import load_sample_detections
from app.services.normalizer import compute_fire_summary


logger = logging.getLogger("skyguard.api.fires")
router = APIRouter(prefix="/fires", tags=["Fire Detections"])


@router.get("", response_model=FiresResponse)
async def get_fires(
    min_lat: float = Query(32.5, ge=-90.0, le=90.0, description="Minimum latitude (South)"),
    min_lon: float = Query(-124.5, ge=-180.0, le=180.0, description="Minimum longitude (West)"),
    max_lat: float = Query(42.0, ge=-90.0, le=90.0, description="Maximum latitude (North)"),
    max_lon: float = Query(-114.0, ge=-180.0, le=180.0, description="Maximum longitude (East)"),
    source: str = Query("VIIRS_NOAA20_NRT", description="Sensor product code"),
    day_range: int = Query(1, ge=1, le=10, description="Days to look back (1-10)"),
    demo: Optional[bool] = Query(None, description="Force demo mode (true/false)"),
    force_refresh: bool = Query(False, description="Bypass cache and re-fetch"),
):
    """
    Retrieve satellite-observed thermal anomaly detections for bounding box.
    Separates live NASA FIRMS telemetry from offline demo sample data.
    """
    if min_lat >= max_lat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_lat must be strictly less than max_lat",
        )
    if min_lon >= max_lon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_lon must be strictly less than max_lon",
        )

    # Determine execution mode: live vs demo
    is_demo = demo if demo is not None else settings.demo_mode

    # If demo mode is explicitly requested or forced by settings
    if is_demo:
        items = load_sample_detections(min_lat, min_lon, max_lat, max_lon)
        # If bounding box query yielded no sample records, return all sample items so user has data to explore in demo mode
        if not items:
            items = load_sample_detections()

        summary = compute_fire_summary(
            items=items,
            source="Bundled Sample Telemetry (DEMO MODE — Historical VIIRS Dataset)",
            is_demo=True,
        )
        return FiresResponse(
            items=items,
            summary=summary,
            query_params={
                "source": "DEMO_SAMPLE",
                "day_range": day_range,
                "bbox": [min_lat, min_lon, max_lat, max_lon],
            },
            bounding_box=[min_lat, min_lon, max_lat, max_lon],
            is_demo=True,
            retrieval_status="success",
            message="DEMO DATA: Operating in offline sample mode. Live NASA FIRMS key not utilized.",
        )

    # Live Mode: Check NASA FIRMS Key
    if not settings.has_firms_key:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail=(
                "NASA FIRMS MAP_KEY is not configured in backend environment. "
                "Configure FIRMS_MAP_KEY in backend/.env or toggle Demo Mode in the UI to explore bundled sample telemetry. "
                "Get a free key at https://firms.modaps.eosdis.nasa.gov/api/map_key"
            ),
        )

    client = FirmsClient()
    try:
        response = await client.fetch_area_detections(
            min_lat=min_lat,
            min_lon=min_lon,
            max_lat=max_lat,
            max_lon=max_lon,
            source=source,
            day_range=day_range,
            force_refresh=force_refresh,
        )
        return response
    except FirmsAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"NASA FIRMS Authentication Failure: {str(exc)}",
        )
    except FirmsRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"NASA FIRMS Rate Limit Exceeded: {str(exc)}",
        )
    except FirmsUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NASA FIRMS Upstream Service Error: {str(exc)}",
        )
    except FirmsClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying NASA FIRMS API: {str(exc)}",
        )


@router.get("/summary", response_model=FireSummary)
async def get_fires_summary(
    min_lat: float = Query(32.5, ge=-90.0, le=90.0),
    min_lon: float = Query(-124.5, ge=-180.0, le=180.0),
    max_lat: float = Query(42.0, ge=-90.0, le=90.0),
    max_lon: float = Query(-114.0, ge=-180.0, le=180.0),
    source: str = Query("VIIRS_NOAA20_NRT"),
    day_range: int = Query(1, ge=1, le=10),
    demo: Optional[bool] = Query(None),
):
    """Return summary statistics derived from retrieved detections."""
    fires_res = await get_fires(
        min_lat=min_lat,
        min_lon=min_lon,
        max_lat=max_lat,
        max_lon=max_lon,
        source=source,
        day_range=day_range,
        demo=demo,
        force_refresh=False,
    )
    return fires_res.summary


@router.get("/sensors")
async def get_supported_sensors():
    """Return supported FIRMS satellite sensors."""
    return {
        "sensors": [
            {"code": code, "name": name, "is_default": code == settings.default_sensor}
            for code, name in SUPPORTED_SENSORS.items()
        ]
    }
