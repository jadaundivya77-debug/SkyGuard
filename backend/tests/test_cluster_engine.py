"""Unit tests for spatial clustering engine and Haversine calculations."""

import pytest
from app.services.cluster_engine import haversine_distance_km, cluster_detections
from app.schemas.fire import FireDetection


def test_haversine_distance():
    # San Francisco (37.7749, -122.4194) to Oakland (37.8044, -122.2711) ~ 13.5 km
    dist = haversine_distance_km(37.7749, -122.4194, 37.8044, -122.2711)
    assert 12.0 < dist < 15.0

    # Distance to self is 0
    assert haversine_distance_km(35.0, -120.0, 35.0, -120.0) == 0.0


def test_cluster_detections_empty():
    res = cluster_detections([])
    assert res.cluster_count == 0
    assert res.total_detections == 0
    assert len(res.clusters) == 0


def test_cluster_detections_grouping():
    # Group of 4 nearby points in Paradise, CA (within 5 km of each other)
    cluster_pts = [
        FireDetection(
            id=f"pt{i}",
            latitude=39.80 + i * 0.01,
            longitude=-121.50 - i * 0.01,
            frp=20.0 * (i + 1),
            brightness=330.0 + i * 10,
            confidence="h",
            confidence_category="high",
            acquisition_date="2024-08-14",
            acquisition_time="1000",
            acquisition_datetime_utc="2024-08-14T10:00:00+00:00",
        )
        for i in range(4)
    ]

    # One isolated point far away in Los Angeles (~600 km away)
    isolated_pt = FireDetection(
        id="pt_isolated",
        latitude=34.05,
        longitude=-118.25,
        frp=15.0,
        brightness=320.0,
        confidence="l",
        confidence_category="low",
        acquisition_date="2024-08-14",
        acquisition_time="1000",
        acquisition_datetime_utc="2024-08-14T10:00:00+00:00",
    )

    all_pts = cluster_pts + [isolated_pt]
    res = cluster_detections(all_pts, eps_km=15.0, min_samples=3)

    assert res.total_detections == 5
    assert res.cluster_count == 1
    assert res.clustered_detections_count == 4
    assert res.noise_count == 1

    c = res.clusters[0]
    assert c.detection_count == 4
    assert 39.80 <= c.center_latitude <= 39.85
    assert -121.55 <= c.center_longitude <= -121.50
    assert c.radius_km > 0.0
    assert c.max_frp == 80.0
    assert c.avg_frp == 50.0
