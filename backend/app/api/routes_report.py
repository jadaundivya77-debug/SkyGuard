"""Incident report generation and export endpoint."""

import io
import csv
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query, Response
from fastapi.responses import StreamingResponse
from app.api.routes_fires import get_fires


router = APIRouter(prefix="/report", tags=["Reporting"])


@router.get("")
async def generate_report(
    min_lat: float = Query(32.5, ge=-90.0, le=90.0),
    min_lon: float = Query(-124.5, ge=-180.0, le=180.0),
    max_lat: float = Query(42.0, ge=-90.0, le=90.0),
    max_lon: float = Query(-114.0, ge=-180.0, le=180.0),
    source: str = Query("VIIRS_NOAA20_NRT"),
    day_range: int = Query(1, ge=1, le=10),
    demo: Optional[bool] = Query(None),
    format: str = Query("csv", pattern="^(csv|json)$", description="Export format: csv or json"),
):
    """
    Export retrieved satellite thermal anomalies and observational metadata
    with complete scientific provenance and caveats as downloadable CSV or JSON.
    """
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

    now_slug = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")

    if format == "json":
        report_data = {
            "metadata": {
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "project": "SKYGUARD — Eyes on Earth",
                "source": fires_res.summary.source,
                "is_demo_telemetry": fires_res.is_demo,
                "query_bbox": [min_lat, min_lon, max_lat, max_lon],
                "day_range": day_range,
                "total_records": fires_res.summary.total_detections,
                "scientific_caveats": (
                    "Satellite thermal anomalies indicate localized radiative heat emissions, "
                    "not confirmed wildfires. Independent ground truth verification is required."
                ),
            },
            "summary": fires_res.summary.model_dump(),
            "detections": [item.model_dump() for item in fires_res.items],
        }
        return report_data

    # Format == CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Provenance metadata comments
    writer.writerow(["# SKYGUARD — Eyes on Earth Incident Export"])
    writer.writerow([f"# Generated At UTC: {datetime.now(timezone.utc).isoformat()}"])
    writer.writerow([f"# Source: {fires_res.summary.source}"])
    writer.writerow([f"# Demo Mode: {'YES (Bundled Sample)' if fires_res.is_demo else 'NO (Live NASA FIRMS)'}"])
    writer.writerow([f"# Bounding Box: {min_lat},{min_lon},{max_lat},{max_lon}"])
    writer.writerow([f"# Caveat: Satellite thermal anomalies are unconfirmed hotspots. Ground verification required."])
    writer.writerow([])  # Blank row

    # Headers
    writer.writerow([
        "id",
        "latitude",
        "longitude",
        "brightness_k",
        "bright_t31_k",
        "frp_mw",
        "confidence_raw",
        "confidence_category",
        "acquisition_date",
        "acquisition_time_utc",
        "acquisition_iso_utc",
        "satellite",
        "instrument",
        "daynight",
        "scan",
        "track",
    ])

    for d in fires_res.items:
        writer.writerow([
            d.id,
            d.latitude,
            d.longitude,
            d.brightness or "",
            d.bright_t31 or "",
            d.frp or "",
            d.confidence,
            d.confidence_category,
            d.acquisition_date,
            d.acquisition_time,
            d.acquisition_datetime_utc or "",
            d.satellite or "",
            d.instrument or "",
            d.daynight or "",
            d.scan or "",
            d.track or "",
        ])

    csv_content = output.getvalue()
    filename = f"skyguard_incident_report_{now_slug}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
