"""NASA FIRMS (Fire Information for Resource Management System) API Client."""

import io
import csv
import logging
from typing import List, Optional, Tuple
import httpx
from app.config import settings
from app.schemas.fire import FireDetection, FireSummary, FiresResponse
from app.services.cache import firms_cache
from app.services.normalizer import normalize_detection_record, compute_fire_summary


logger = logging.getLogger("skyguard.firms")

BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

SUPPORTED_SENSORS = {
    "VIIRS_NOAA20_NRT": "VIIRS (NOAA-20 Near Real-Time)",
    "VIIRS_SNPP_NRT": "VIIRS (Suomi-NPP Near Real-Time)",
    "VIIRS_NOAA21_NRT": "VIIRS (NOAA-21 Near Real-Time)",
    "MODIS_NRT": "MODIS (Terra & Aqua Near Real-Time)",
}


class FirmsClientError(Exception):
    """Base exception for FIRMS client errors."""
    pass


class FirmsAuthError(FirmsClientError):
    """Exception raised when FIRMS API key is missing or rejected."""
    pass


class FirmsRateLimitError(FirmsClientError):
    """Exception raised when FIRMS rate limit (5000 transactions/10 min) is exceeded."""
    pass


class FirmsUpstreamError(FirmsClientError):
    """Exception raised when upstream FIRMS service is unavailable."""
    pass


class FirmsClient:
    """HTTP Client for NASA FIRMS Area CSV API."""

    def __init__(self, map_key: Optional[str] = None):
        if map_key is not None:
            self.map_key = map_key.strip()
        else:
            self.map_key = (settings.firms_map_key or "").strip()

    def format_area_bbox(
        self, min_lat: float, min_lon: float, max_lat: float, max_lon: float
    ) -> str:
        """
        FIRMS Area API expects bbox formatted as: west,south,east,north
        i.e. min_lon,min_lat,max_lon,max_lat
        """
        # Clamp coordinate bounds
        w = max(-180.0, min(180.0, min_lon))
        s = max(-90.0, min(90.0, min_lat))
        e = max(-180.0, min(180.0, max_lon))
        n = max(-90.0, min(90.0, max_lat))

        # Format with up to 4 decimal places
        return f"{w:.4f},{s:.4f},{e:.4f},{n:.4f}"

    async def fetch_area_detections(
        self,
        min_lat: float,
        min_lon: float,
        max_lat: float,
        max_lon: float,
        source: str = "VIIRS_NOAA20_NRT",
        day_range: int = 1,
        force_refresh: bool = False,
    ) -> FiresResponse:
        """
        Fetch active-fire detections for the specified geographic bounding box.
        Cached according to configured TTL.
        """
        if not self.map_key or self.map_key == "your_firms_map_key_here":
            raise FirmsAuthError(
                "NASA FIRMS MAP_KEY is not configured. Register for a free key at "
                "https://firms.modaps.eosdis.nasa.gov/api/map_key and configure FIRMS_MAP_KEY."
            )

        if source not in SUPPORTED_SENSORS:
            # Fall back to default if sensor is unrecognized
            source = settings.default_sensor

        day_range = max(1, min(10, day_range))
        bbox_str = self.format_area_bbox(min_lat, min_lon, max_lat, max_lon)

        cache_key = f"firms:{source}:{bbox_str}:{day_range}"
        if not force_refresh:
            cached_res = firms_cache.get(cache_key)
            if cached_res is not None:
                logger.info(f"Returning cached FIRMS detections for key {cache_key}")
                return cached_res

        # Construct documented URL: /api/area/csv/{map_key}/{source}/{area}/{day_range}
        url = f"{BASE_URL}/{self.map_key}/{source}/{bbox_str}/{day_range}"
        logger.info(f"Querying FIRMS API: {BASE_URL}/***KEY***/{source}/{bbox_str}/{day_range}")

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(url)

                if resp.status_code == 401 or resp.status_code == 403:
                    raise FirmsAuthError("NASA FIRMS rejected MAP_KEY. Verify your key validity.")
                elif resp.status_code == 429:
                    raise FirmsRateLimitError("NASA FIRMS rate limit exceeded. Please wait before retrying.")
                elif resp.status_code >= 500:
                    raise FirmsUpstreamError(f"NASA FIRMS upstream server error (HTTP {resp.status_code}).")
                elif resp.status_code != 200:
                    raise FirmsClientError(f"Unexpected FIRMS API response: HTTP {resp.status_code}")

                csv_text = resp.text

        except httpx.TimeoutException:
            raise FirmsUpstreamError("NASA FIRMS API request timed out (20s limit).")
        except httpx.RequestError as exc:
            raise FirmsUpstreamError(f"Network error connecting to NASA FIRMS API: {str(exc)}")

        # Check for error messages returned in body
        first_line = csv_text.strip().split("\n")[0] if csv_text else ""
        if "Invalid MAP_KEY" in first_line or "Bad Request" in first_line:
            raise FirmsAuthError(f"NASA FIRMS API rejected request: {first_line}")

        # Parse CSV safely
        items: List[FireDetection] = []
        try:
            reader = csv.DictReader(io.StringIO(csv_text))
            for row in reader:
                item = normalize_detection_record(row)
                if item is not None:
                    items.append(item)
        except Exception as exc:
            raise FirmsClientError(f"Failed to parse FIRMS CSV response: {str(exc)}")

        summary = compute_fire_summary(
            items=items,
            source=f"NASA FIRMS ({SUPPORTED_SENSORS.get(source, source)})",
            is_demo=False,
        )

        response = FiresResponse(
            items=items,
            summary=summary,
            query_params={
                "source": source,
                "day_range": day_range,
                "bbox": [min_lat, min_lon, max_lat, max_lon],
            },
            bounding_box=[min_lat, min_lon, max_lat, max_lon],
            is_demo=False,
            retrieval_status="success",
        )

        # Store in cache
        firms_cache.set(cache_key, response, ttl=settings.firms_cache_ttl)
        return response
