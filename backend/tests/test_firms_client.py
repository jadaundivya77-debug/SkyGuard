"""Unit tests for NASA FIRMS client error handling and parameter encoding."""

import pytest
from app.clients.firms import (
    FirmsClient,
    FirmsAuthError,
    FirmsRateLimitError,
    FirmsUpstreamError,
)


def test_format_area_bbox_order():
    client = FirmsClient(map_key="test_key")
    # Area: min_lat=34.0, min_lon=-119.0, max_lat=36.0, max_lon=-117.0
    # Must format as: west,south,east,north -> -119.0000,34.0000,-117.0000,36.0000
    formatted = client.format_area_bbox(min_lat=34.0, min_lon=-119.0, max_lat=36.0, max_lon=-117.0)
    parts = formatted.split(",")
    assert len(parts) == 4
    west, south, east, north = [float(p) for p in parts]
    assert west == -119.0
    assert south == 34.0
    assert east == -117.0
    assert north == 36.0


@pytest.mark.asyncio
async def test_missing_firms_key_raises_auth_error():
    client = FirmsClient(map_key="")
    with pytest.raises(FirmsAuthError) as exc_info:
        await client.fetch_area_detections(
            min_lat=34.0, min_lon=-119.0, max_lat=36.0, max_lon=-117.0
        )
    assert "NASA FIRMS MAP_KEY is not configured" in str(exc_info.value)
