"""Spatial clustering API endpoint."""

from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.cluster import ClustersResponse
from app.api.routes_fires import get_fires
from app.services.cluster_engine import cluster_detections


router = APIRouter(prefix="/clusters", tags=["Clustering"])


@router.get("", response_model=ClustersResponse)
async def get_clusters(
    min_lat: float = Query(32.5, ge=-90.0, le=90.0),
    min_lon: float = Query(-124.5, ge=-180.0, le=180.0),
    max_lat: float = Query(42.0, ge=-90.0, le=90.0),
    max_lon: float = Query(-114.0, ge=-180.0, le=180.0),
    source: str = Query("VIIRS_NOAA20_NRT"),
    day_range: int = Query(1, ge=1, le=10),
    demo: Optional[bool] = Query(None),
    eps_km: float = Query(15.0, ge=1.0, le=100.0, description="Spatial neighborhood distance in km"),
    min_samples: int = Query(3, ge=2, le=50, description="Minimum detections to form a cluster"),
):
    """
    Compute spatial density clusters from active-fire detection coordinates
    using the Haversine DBSCAN algorithm.
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

    clusters_res = cluster_detections(
        items=fires_res.items,
        eps_km=eps_km,
        min_samples=min_samples,
    )

    return clusters_res
