"""Unit tests for detection normalization, invalid coordinates, and summary calculation."""

import pytest
from app.services.normalizer import (
    normalize_detection_record,
    normalize_confidence,
    compute_fire_summary,
    parse_acq_datetime,
    generate_detection_id,
)
from app.schemas.fire import FireDetection


def test_normalize_confidence_viirs():
    assert normalize_confidence("l") == ("l", "low")
    assert normalize_confidence("n") == ("n", "nominal")
    assert normalize_confidence("h") == ("h", "high")
    assert normalize_confidence("LOW") == ("LOW", "low")
    assert normalize_confidence("NOMINAL") == ("NOMINAL", "nominal")


def test_normalize_confidence_modis_numeric():
    assert normalize_confidence("25") == ("25", "low")
    assert normalize_confidence("50") == ("50", "nominal")
    assert normalize_confidence("80") == ("80", "nominal")
    assert normalize_confidence("95") == ("95", "high")
    assert normalize_confidence(None) == ("unknown", "unknown")


def test_parse_acq_datetime():
    # Regular 4-digit UTC time
    iso = parse_acq_datetime("2024-08-14", "1430")
    assert iso == "2024-08-14T14:30:00+00:00"

    # 3-digit padded time (e.g. 435 -> 0435)
    iso_padded = parse_acq_datetime("2024-08-14", "435")
    assert iso_padded == "2024-08-14T04:35:00+00:00"

    # Malformed inputs
    assert parse_acq_datetime("bad-date", "1200") is None


def test_normalize_valid_viirs_row():
    row = {
        "latitude": "39.8124",
        "longitude": "-121.5432",
        "bright_ti4": "348.6",
        "scan": "0.42",
        "track": "0.61",
        "acq_date": "2024-08-14",
        "acq_time": "0945",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "h",
        "version": "2.0NRT",
        "bright_ti5": "298.4",
        "frp": "48.2",
        "daynight": "N",
    }
    item = normalize_detection_record(row)
    assert item is not None
    assert isinstance(item, FireDetection)
    assert item.latitude == 39.8124
    assert item.longitude == -121.5432
    assert item.confidence_category == "high"
    assert item.confidence == "h"
    assert item.frp == 48.2
    assert item.brightness == 348.6
    assert item.bright_t31 == 298.4
    assert item.acquisition_datetime_utc == "2024-08-14T09:45:00+00:00"


def test_normalize_invalid_coordinates():
    # Out of latitude bounds
    assert normalize_detection_record({"latitude": "95.0", "longitude": "0.0", "acq_date": "2024-01-01"}) is None
    assert normalize_detection_record({"latitude": "-95.0", "longitude": "0.0", "acq_date": "2024-01-01"}) is None

    # Out of longitude bounds
    assert normalize_detection_record({"latitude": "0.0", "longitude": "195.0", "acq_date": "2024-01-01"}) is None

    # Non-numeric coordinate strings
    assert normalize_detection_record({"latitude": "invalid", "longitude": "-120.0", "acq_date": "2024-01-01"}) is None
    assert normalize_detection_record({"latitude": None, "longitude": "-120.0", "acq_date": "2024-01-01"}) is None

    # Missing acq_date
    assert normalize_detection_record({"latitude": "35.0", "longitude": "-120.0", "acq_date": ""}) is None


def test_compute_fire_summary():
    d1 = FireDetection(
        id="det1",
        latitude=35.0,
        longitude=-120.0,
        brightness=330.0,
        frp=20.0,
        confidence="h",
        confidence_category="high",
        acquisition_date="2024-08-14",
        acquisition_time="1000",
        acquisition_datetime_utc="2024-08-14T10:00:00+00:00",
        instrument="VIIRS",
        daynight="N",
    )
    d2 = FireDetection(
        id="det2",
        latitude=35.1,
        longitude=-120.1,
        brightness=350.0,
        frp=60.0,
        confidence="n",
        confidence_category="nominal",
        acquisition_date="2024-08-14",
        acquisition_time="1200",
        acquisition_datetime_utc="2024-08-14T12:00:00+00:00",
        instrument="VIIRS",
        daynight="D",
    )
    summary = compute_fire_summary([d1, d2], source="Test Source", is_demo=True)
    assert summary.total_detections == 2
    assert summary.confidence_breakdown.high == 1
    assert summary.confidence_breakdown.nominal == 1
    assert summary.confidence_breakdown.low == 0
    assert summary.avg_frp == 40.0
    assert summary.max_frp == 60.0
    assert summary.latest_observation_utc == "2024-08-14T12:00:00+00:00"
    assert summary.is_demo is True
