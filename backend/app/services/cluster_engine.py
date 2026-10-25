"""Spatial clustering engine for satellite active-fire detections.

Uses Haversine density-based neighborhood grouping (DBSCAN algorithm)
to identify dense hotspot clusters and compute geographic centroids/radii.
"""

import math
from datetime import datetime, timezone
from typing import List, Set, Dict, Optional
from app.schemas.fire import FireDetection
from app.schemas.cluster import ClusterItem, ClustersResponse


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    radius_earth_km = 6371.0088

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius_earth_km * c


def cluster_detections(
    items: List[FireDetection],
    eps_km: float = 15.0,
    min_samples: int = 3,
) -> ClustersResponse:
    """
    Cluster active-fire detections into spatial groups using DBSCAN with Haversine distance.
    """
    n = len(items)
    now_utc = datetime.now(timezone.utc).isoformat()

    if n == 0:
        return ClustersResponse(
            clusters=[],
            cluster_count=0,
            total_detections=0,
            clustered_detections_count=0,
            noise_count=0,
            distance_threshold_km=eps_km,
            min_cluster_size=min_samples,
            generated_at_utc=now_utc,
        )

    # Precompute coordinates
    coords = [(item.latitude, item.longitude) for item in items]

    # Build adjacency neighbors list
    neighbors: List[List[int]] = [[] for _ in range(n)]
    for i in range(n):
        lat1, lon1 = coords[i]
        for j in range(i + 1, n):
            lat2, lon2 = coords[j]
            # Quick bounding box pre-filter before Haversine (1 deg lat ~ 111 km)
            if abs(lat1 - lat2) * 111.0 > eps_km * 1.5:
                continue
            dist = haversine_distance_km(lat1, lon1, lat2, lon2)
            if dist <= eps_km:
                neighbors[i].append(j)
                neighbors[j].append(i)

    # DBSCAN state
    visited: Set[int] = set()
    cluster_labels: Dict[int, int] = {}  # index -> cluster_id
    current_cluster_id = 0

    for i in range(n):
        if i in visited:
            continue
        visited.add(i)

        current_neighbors = neighbors[i].copy()
        # Including self: length of neighbors + 1
        if len(current_neighbors) + 1 < min_samples:
            # Noise point for now (might be claimed by another cluster later)
            cluster_labels[i] = -1
            continue

        # Start a new cluster
        current_cluster_id += 1
        cluster_labels[i] = current_cluster_id

        queue = current_neighbors
        idx = 0
        while idx < len(queue):
            pt = queue[idx]
            idx += 1

            if pt not in visited:
                visited.add(pt)
                pt_neighbors = neighbors[pt]
                if len(pt_neighbors) + 1 >= min_samples:
                    for nbr in pt_neighbors:
                        if nbr not in queue and nbr != i:
                            queue.append(nbr)

            # Assign to current cluster if not already assigned
            if cluster_labels.get(pt, -1) <= 0:
                cluster_labels[pt] = current_cluster_id

    # Group into ClusterItem objects
    clusters_dict: Dict[int, List[int]] = {}
    noise_count = 0

    for idx, c_id in cluster_labels.items():
        if c_id > 0:
            clusters_dict.setdefault(c_id, []).append(idx)
        else:
            noise_count += 1

    cluster_items: List[ClusterItem] = []
    clustered_detections_count = 0

    for c_id, member_indices in sorted(clusters_dict.items(), key=lambda x: len(x[1]), reverse=True):
        members = [items[idx] for idx in member_indices]
        cnt = len(members)
        clustered_detections_count += cnt

        lats = [m.latitude for m in members]
        lons = [m.longitude for m in members]
        center_lat = round(sum(lats) / cnt, 5)
        center_lon = round(sum(lons) / cnt, 5)

        # Max radius from center to any member
        max_rad = max(haversine_distance_km(center_lat, center_lon, m.latitude, m.longitude) for m in members)

        # FRP & Brightness stats
        frp_vals = [m.frp for m in members if m.frp is not None]
        bright_vals = [m.brightness for m in members if m.brightness is not None]

        # Latest acq
        latest_acq: Optional[str] = None
        for m in members:
            if m.acquisition_datetime_utc:
                if latest_acq is None or m.acquisition_datetime_utc > latest_acq:
                    latest_acq = m.acquisition_datetime_utc

        cluster_items.append(
            ClusterItem(
                cluster_id=c_id,
                detection_count=cnt,
                center_latitude=center_lat,
                center_longitude=center_lon,
                radius_km=round(max(0.5, max_rad), 2),
                min_latitude=round(min(lats), 5),
                max_latitude=round(max(lats), 5),
                min_longitude=round(min(lons), 5),
                max_longitude=round(max(lons), 5),
                avg_frp=round(sum(frp_vals) / len(frp_vals), 2) if frp_vals else None,
                max_frp=round(max(frp_vals), 2) if frp_vals else None,
                avg_brightness=round(sum(bright_vals) / len(bright_vals), 2) if bright_vals else None,
                latest_acq_utc=latest_acq,
                detection_ids=[m.id for m in members],
            )
        )

    return ClustersResponse(
        clusters=cluster_items,
        cluster_count=len(cluster_items),
        total_detections=n,
        clustered_detections_count=clustered_detections_count,
        noise_count=noise_count,
        distance_threshold_km=eps_km,
        min_cluster_size=min_samples,
        algorithm="Haversine Density-Based Spatial Clustering (DBSCAN)",
        generated_at_utc=now_utc,
    )
