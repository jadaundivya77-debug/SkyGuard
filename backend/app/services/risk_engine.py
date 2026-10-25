"""Explainable environmental wildfire risk heuristic engine.

Transparent, unvalidated atmospheric indicator model combining temperature,
relative humidity deficit, wind velocity, and precipitation deficit.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.schemas.risk import RiskAssessmentResponse, RiskFactor
from app.schemas.weather import WeatherCurrent


# Default weights (sum to 1.0)
DEFAULT_WEIGHTS = {
    "relative_humidity": 0.35,  # Strongest determinant of fine fuel moisture content
    "temperature": 0.25,        # Thermal preheating and vapor pressure deficit
    "wind_speed": 0.25,         # Flame front propagation, spot fire ignition
    "precipitation": 0.15,      # Immediate fuel wetting suppression
}


def normalize_temperature(temp_c: Optional[float]) -> Optional[float]:
    """
    Normalize 2m air temperature (°C) into a 0-100 risk score.
    <= 10°C: 0 (minimal drying)
    >= 42°C: 100 (extreme preheating)
    Linear scaling between 10°C and 42°C.
    """
    if temp_c is None:
        return None
    if temp_c <= 10.0:
        return 0.0
    if temp_c >= 42.0:
        return 100.0
    return round(((temp_c - 10.0) / (42.0 - 10.0)) * 100.0, 2)


def normalize_relative_humidity(rh_pct: Optional[float]) -> Optional[float]:
    """
    Normalize relative humidity (%) into a 0-100 risk score.
    Higher humidity reduces fire risk; lower humidity accelerates fine fuel desiccation.
    >= 65%: 0 (saturated/high moisture)
    <= 15%: 100 (critical red-flag threshold)
    Linear inverse scaling between 65% and 15%.
    """
    if rh_pct is None:
        return None
    # Bound input to 0-100%
    clamped_rh = max(0.0, min(100.0, rh_pct))
    if clamped_rh >= 65.0:
        return 0.0
    if clamped_rh <= 15.0:
        return 100.0
    return round(((65.0 - clamped_rh) / (65.0 - 15.0)) * 100.0, 2)


def normalize_wind_speed(wind_kmh: Optional[float]) -> Optional[float]:
    """
    Normalize 10m wind speed (km/h) into a 0-100 risk score.
    <= 5 km/h: 0 (light breeze/calm)
    >= 45 km/h: 100 (severe sustained gale/red-flag warning level)
    Linear scaling between 5 km/h and 45 km/h.
    """
    if wind_kmh is None:
        return None
    clamped_wind = max(0.0, wind_kmh)
    if clamped_wind <= 5.0:
        return 0.0
    if clamped_wind >= 45.0:
        return 100.0
    return round(((clamped_wind - 5.0) / (45.0 - 5.0)) * 100.0, 2)


def normalize_precipitation(precip_mm: Optional[float]) -> Optional[float]:
    """
    Normalize recent precipitation (mm) into a 0-100 deficit score.
    >= 5.0 mm: 0 (significant wetting threshold)
    0.0 mm: 100 (complete lack of recent rain)
    Linear deficit scaling between 5.0mm and 0.0mm.
    """
    if precip_mm is None:
        return None
    clamped_precip = max(0.0, precip_mm)
    if clamped_precip >= 5.0:
        return 0.0
    return round(((5.0 - clamped_precip) / 5.0) * 100.0, 2)


def categorize_risk_score(score: float) -> str:
    """Classify 0-100 score into standard operational threat levels."""
    if score < 25.0:
        return "Low"
    elif score < 50.0:
        return "Moderate"
    elif score < 70.0:
        return "High"
    elif score < 85.0:
        return "Very High"
    else:
        return "Extreme"


def calculate_environmental_risk(
    latitude: float,
    longitude: float,
    weather: Optional[WeatherCurrent] = None,
    custom_weights: Optional[Dict[str, float]] = None,
) -> RiskAssessmentResponse:
    """
    Compute transparent, factor-explainable environmental risk score.
    Dynamically re-weights available factors if some are missing without inventing data.
    """
    weights = custom_weights or DEFAULT_WEIGHTS.copy()
    warnings: List[str] = []
    missing_factors: List[str] = []

    # Extract raw values from WeatherCurrent if provided
    raw_temp = weather.temperature_c if weather else None
    raw_rh = weather.relative_humidity_pct if weather else None
    raw_wind = weather.wind_speed_kmh if weather else None
    raw_precip = weather.precipitation_mm if weather else None

    # Compute normalized sub-scores
    score_temp = normalize_temperature(raw_temp)
    score_rh = normalize_relative_humidity(raw_rh)
    score_wind = normalize_wind_speed(raw_wind)
    score_precip = normalize_precipitation(raw_precip)

    factor_defs = [
        {
            "name": "relative_humidity",
            "display_name": "Relative Humidity Deficit",
            "raw_val": raw_rh,
            "unit": "%",
            "score": score_rh,
            "weight": weights.get("relative_humidity", 0.35),
            "desc": "Fine dead fuel moisture equilibrium is governed directly by ambient atmospheric humidity.",
        },
        {
            "name": "temperature",
            "display_name": "Surface Air Temperature",
            "raw_val": raw_temp,
            "unit": "°C",
            "score": score_temp,
            "weight": weights.get("temperature", 0.25),
            "desc": "Elevated temperatures drive fuel desiccation, vapor pressure deficit, and thermal preheating.",
        },
        {
            "name": "wind_speed",
            "display_name": "Sustained Wind Velocity",
            "raw_val": raw_wind,
            "unit": "km/h",
            "score": score_wind,
            "weight": weights.get("wind_speed", 0.25),
            "desc": "Wind enhances convective oxygen transfer, tilts flame geometry, and drives spot fire propagation.",
        },
        {
            "name": "precipitation",
            "display_name": "Precipitation Deficit",
            "raw_val": raw_precip,
            "unit": "mm",
            "score": score_precip,
            "weight": weights.get("precipitation", 0.15),
            "desc": "Absence of recent rainfall elevates flammability of dead organic canopy and litter.",
        },
    ]

    factors: List[RiskFactor] = []
    available_weights_sum = 0.0

    for f in factor_defs:
        if f["score"] is not None:
            available_weights_sum += f["weight"]
        else:
            missing_factors.append(f["name"])

    # Calculate weighted contributions
    accumulated_score = 0.0

    for f in factor_defs:
        if f["score"] is not None:
            # Re-normalize weight based on available inputs
            re_weighted = f["weight"] / available_weights_sum if available_weights_sum > 0 else 0.0
            contrib = f["score"] * re_weighted
            accumulated_score += contrib
            factors.append(
                RiskFactor(
                    name=f["name"],
                    display_name=f["display_name"],
                    raw_value=round(f["raw_val"], 2) if f["raw_val"] is not None else None,
                    unit=f["unit"],
                    normalized_score=round(f["score"], 2),
                    weight=round(re_weighted, 3),
                    weighted_contribution=round(contrib, 2),
                    status="available",
                    description=f["desc"],
                )
            )
        else:
            factors.append(
                RiskFactor(
                    name=f["name"],
                    display_name=f["display_name"],
                    raw_value=None,
                    unit=f["unit"],
                    normalized_score=0.0,
                    weight=0.0,
                    weighted_contribution=0.0,
                    status="missing",
                    description=f"Missing input. {f['desc']}",
                )
            )

    available_count = len(factors) - len(missing_factors)
    total_count = len(factors)

    if available_count == 0:
        overall_score = 0.0
        confidence = "Degraded (All inputs missing)"
        warnings.append("No weather data available. Environmental risk score cannot be evaluated.")
    elif available_count < total_count:
        overall_score = min(100.0, max(0.0, round(accumulated_score, 1)))
        confidence = f"Degraded ({len(missing_factors)} input(s) missing)"
        warnings.append(
            f"Missing {', '.join(missing_factors)}. Weights dynamically re-allocated across remaining factors."
        )
    else:
        overall_score = min(100.0, max(0.0, round(accumulated_score, 1)))
        confidence = "High (All baseline factors available)"

    risk_level = categorize_risk_score(overall_score)
    now_utc = datetime.now(timezone.utc).isoformat()

    return RiskAssessmentResponse(
        overall_score=overall_score,
        risk_level=risk_level,
        latitude=latitude,
        longitude=longitude,
        factors=factors,
        available_factors_count=available_count,
        total_factors_count=total_count,
        missing_factors=missing_factors,
        confidence_in_score=confidence,
        warnings=warnings,
        calculated_at_utc=now_utc,
    )
