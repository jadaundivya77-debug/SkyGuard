"""Data normalization and sanitization for satellite fire observations."""

import hashlib
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.schemas.fire import FireDetection, FireSummary, ConfidenceBreakdown


def generate_detection_id(
    lat: float, lon: float, acq_date: str, acq_time: str, satellite: str, instrument: str
) -> str:
    """Generate a stable deterministic ID for a fire detection pixel."""
    raw = f"{lat:.5f}_{lon:.5f}_{acq_date}_{acq_time}_{satellite}_{instrument}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def parse_acq_datetime(acq_date: str, acq_time: str) -> Optional[str]:
    """Parse YYYY-MM-DD and HHMM (UTC) into ISO-8601 UTC timestamp."""
    try:
        # Zero-pad acq_time to 4 digits (e.g., '435' -> '0435')
        time_str = str(acq_time).strip().zfill(4)
        hour = int(time_str[:2])
        minute = int(time_str[2:4])
        dt = datetime.strptime(f"{acq_date} {hour:02d}:{minute:02d}", "%Y-%m-%d %H:%M")
        dt_utc = dt.replace(tzinfo=timezone.utc)
        return dt_utc.isoformat()
    except Exception:
        return None


def normalize_confidence(conf_val: Any) -> Tuple[str, str]:
    """
    Normalize confidence across VIIRS ('l', 'n', 'h') and MODIS (0-100 numeric).
    Returns (raw_str, normalized_category).
    """
    if conf_val is None:
        return ("unknown", "unknown")

    raw_str = str(conf_val).strip()
    lower = raw_str.lower()

    if lower in ("l", "low"):
        return (raw_str, "low")
    if lower in ("n", "nominal", "med", "medium"):
        return (raw_str, "nominal")
    if lower in ("h", "high"):
        return (raw_str, "high")

    # Check if numeric (MODIS style 0 - 100)
    try:
        num = float(raw_str)
        if num < 30.0:
            return (raw_str, "low")
        elif num <= 80.0:
            return (raw_str, "nominal")
        else:
            return (raw_str, "high")
    except ValueError:
        return (raw_str, "unknown")


def safe_float(val: Any) -> Optional[float]:
    """Convert value to float if valid and not NaN/Inf."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def normalize_detection_record(row: Dict[str, Any]) -> Optional[FireDetection]:
    """
    Normalize a raw dictionary row (from FIRMS CSV or sample data) into a validated FireDetection.
    Returns None if essential coordinates or date are missing or invalid.
    """
    lat = safe_float(row.get("latitude"))
    lon = safe_float(row.get("longitude"))

    if lat is None or lon is None:
        return None
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        return None

    acq_date = str(row.get("acq_date", "")).strip()
    acq_time = str(row.get("acq_time", "")).strip()
    if not acq_date:
        return None

    # Brightness (VIIRS uses bright_ti4, MODIS uses brightness)
    brightness = safe_float(row.get("bright_ti4"))
    if brightness is None:
        brightness = safe_float(row.get("brightness"))

    # Brightness T31/I5 (VIIRS uses bright_ti5, MODIS uses bright_t31)
    bright_t31 = safe_float(row.get("bright_ti5"))
    if bright_t31 is None:
        bright_t31 = safe_float(row.get("bright_t31"))

    frp = safe_float(row.get("frp"))
    scan = safe_float(row.get("scan"))
    track = safe_float(row.get("track"))

    satellite = str(row.get("satellite", "")).strip() or None
    instrument = str(row.get("instrument", "")).strip() or None
    daynight = str(row.get("daynight", "")).strip().upper() or None
    version = str(row.get("version", "")).strip() or None

    raw_conf, conf_cat = normalize_confidence(row.get("confidence"))
    acq_iso = parse_acq_datetime(acq_date, acq_time)

    det_id = generate_detection_id(
        lat, lon, acq_date, acq_time, satellite or "UNK", instrument or "UNK"
    )

    return FireDetection(
        id=det_id,
        latitude=round(lat, 5),
        longitude=round(lon, 5),
        brightness=round(brightness, 2) if brightness is not None else None,
        bright_t31=round(bright_t31, 2) if bright_t31 is not None else None,
        frp=round(frp, 2) if frp is not None else None,
        confidence=raw_conf,
        confidence_category=conf_cat,
        acquisition_date=acq_date,
        acquisition_time=acq_time,
        acquisition_datetime_utc=acq_iso,
        satellite=satellite,
        instrument=instrument,
        daynight=daynight,
        scan=round(scan, 2) if scan is not None else None,
        track=round(track, 2) if track is not None else None,
        version=version,
    )


def compute_fire_summary(
    items: List[FireDetection], source: str, is_demo: bool
) -> FireSummary:
    """Compute summary statistics across normalized detections."""
    conf_counts = {"high": 0, "nominal": 0, "low": 0, "unknown": 0}
    sensors: Dict[str, int] = {}
    daynight: Dict[str, int] = {}
    frp_vals: List[float] = []
    latest_dt: Optional[datetime] = None

    for item in items:
        # Confidence
        cat = item.confidence_category
        conf_counts[cat] = conf_counts.get(cat, 0) + 1

        # Sensor
        sens = item.instrument or "VIIRS/MODIS"
        sensors[sens] = sensors.get(sens, 0) + 1

        # Day/Night
        dn = item.daynight or "U"
        daynight[dn] = daynight.get(dn, 0) + 1

        # FRP
        if item.frp is not None and item.frp > 0:
            frp_vals.append(item.frp)

        # Datetime
        if item.acquisition_datetime_utc:
            try:
                dt = datetime.fromisoformat(item.acquisition_datetime_utc)
                if latest_dt is None or dt > latest_dt:
                    latest_dt = dt
            except Exception:
                pass

    now_utc = datetime.now(timezone.utc)
    freshness_hours: Optional[float] = None
    if latest_dt:
        diff_seconds = (now_utc - latest_dt).total_seconds()
        freshness_hours = round(max(0.0, diff_seconds / 3600.0), 1)

    return FireSummary(
        total_detections=len(items),
        confidence_breakdown=ConfidenceBreakdown(**conf_counts),
        sensors_breakdown=sensors,
        daynight_breakdown=daynight,
        avg_frp=round(sum(frp_vals) / len(frp_vals), 2) if frp_vals else None,
        max_frp=round(max(frp_vals), 2) if frp_vals else None,
        latest_observation_utc=latest_dt.isoformat() if latest_dt else None,
        data_freshness_hours=freshness_hours,
        source=source,
        is_demo=is_demo,
        retrieved_at_utc=now_utc.isoformat(),
    )
