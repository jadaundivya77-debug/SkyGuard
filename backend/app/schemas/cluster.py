"""Data schemas for spatial detection clustering."""

from typing import List, Optional
from pydantic import BaseModel, Field


class ClusterItem(BaseModel):
    cluster_id: int
    detection_count: int
    center_latitude: float
    center_longitude: float
    radius_km: float
    min_latitude: float
    max_latitude: float
    min_longitude: float
    max_longitude: float
    avg_frp: Optional[float] = None
    max_frp: Optional[float] = None
    avg_brightness: Optional[float] = None
    latest_acq_utc: Optional[str] = None
    detection_ids: List[str] = Field(default_factory=list)


class ClustersResponse(BaseModel):
    clusters: List[ClusterItem]
    cluster_count: int
    total_detections: int
    clustered_detections_count: int
    noise_count: int
    distance_threshold_km: float
    min_cluster_size: int
    algorithm: str = "Density-based spatial grouping (Haversine distance)"
    generated_at_utc: str
