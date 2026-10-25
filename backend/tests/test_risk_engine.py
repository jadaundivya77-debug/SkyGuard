"""Unit tests for explainable environmental risk engine."""

import pytest
from app.services.risk_engine import (
    normalize_temperature,
    normalize_relative_humidity,
    normalize_wind_speed,
    normalize_precipitation,
    calculate_environmental_risk,
    categorize_risk_score,
)
from app.schemas.weather import WeatherCurrent


def test_sub_score_normalizations():
    # Temperature (10°C -> 0, 42°C -> 100)
    assert normalize_temperature(5.0) == 0.0
    assert normalize_temperature(10.0) == 0.0
    assert normalize_temperature(26.0) == 50.0
    assert normalize_temperature(42.0) == 100.0
    assert normalize_temperature(50.0) == 100.0
    assert normalize_temperature(None) is None

    # Relative Humidity (65% -> 0, 15% -> 100)
    assert normalize_relative_humidity(80.0) == 0.0
    assert normalize_relative_humidity(65.0) == 0.0
    assert normalize_relative_humidity(40.0) == 50.0
    assert normalize_relative_humidity(15.0) == 100.0
    assert normalize_relative_humidity(5.0) == 100.0
    assert normalize_relative_humidity(None) is None

    # Wind speed (5 km/h -> 0, 45 km/h -> 100)
    assert normalize_wind_speed(0.0) == 0.0
    assert normalize_wind_speed(5.0) == 0.0
    assert normalize_wind_speed(25.0) == 50.0
    assert normalize_wind_speed(45.0) == 100.0
    assert normalize_wind_speed(70.0) == 100.0
    assert normalize_wind_speed(None) is None

    # Precipitation (5.0 mm -> 0, 0.0 mm -> 100)
    assert normalize_precipitation(10.0) == 0.0
    assert normalize_precipitation(5.0) == 0.0
    assert normalize_precipitation(2.5) == 50.0
    assert normalize_precipitation(0.0) == 100.0
    assert normalize_precipitation(None) is None


def test_categorize_risk_score():
    assert categorize_risk_score(10.0) == "Low"
    assert categorize_risk_score(35.0) == "Moderate"
    assert categorize_risk_score(60.0) == "High"
    assert categorize_risk_score(78.0) == "Very High"
    assert categorize_risk_score(92.0) == "Extreme"


def test_extreme_risk_scenario():
    # 42°C, 12% RH, 50 km/h wind, 0mm precip -> Extreme Risk (~100)
    weather = WeatherCurrent(
        temperature_c=42.0,
        relative_humidity_pct=12.0,
        wind_speed_kmh=50.0,
        precipitation_mm=0.0,
    )
    res = calculate_environmental_risk(latitude=38.5, longitude=-122.5, weather=weather)
    assert res.overall_score == 100.0
    assert res.risk_level == "Extreme"
    assert res.available_factors_count == 4
    assert len(res.missing_factors) == 0
    assert "High (All baseline factors available)" in res.confidence_in_score
    assert "EXPERIMENTAL ENVIRONMENTAL RISK ESTIMATE" in res.disclaimer


def test_low_risk_scenario():
    # 8°C, 80% RH, 3 km/h wind, 10mm precip -> Low Risk (0)
    weather = WeatherCurrent(
        temperature_c=8.0,
        relative_humidity_pct=80.0,
        wind_speed_kmh=3.0,
        precipitation_mm=10.0,
    )
    res = calculate_environmental_risk(latitude=38.5, longitude=-122.5, weather=weather)
    assert res.overall_score == 0.0
    assert res.risk_level == "Low"


def test_missing_weather_inputs_graceful_handling():
    # Only temperature and wind available; RH and precip missing
    weather = WeatherCurrent(
        temperature_c=26.0,  # sub-score 50
        relative_humidity_pct=None,
        wind_speed_kmh=25.0,  # sub-score 50
        precipitation_mm=None,
    )
    res = calculate_environmental_risk(latitude=38.5, longitude=-122.5, weather=weather)
    assert res.available_factors_count == 2
    assert "relative_humidity" in res.missing_factors
    assert "precipitation" in res.missing_factors
    assert res.overall_score == 50.0
    assert "Degraded (2 input(s) missing)" in res.confidence_in_score
    assert len(res.warnings) > 0


def test_all_inputs_missing():
    res = calculate_environmental_risk(latitude=38.5, longitude=-122.5, weather=None)
    assert res.overall_score == 0.0
    assert res.available_factors_count == 0
    assert "Degraded (All inputs missing)" in res.confidence_in_score
    assert len(res.warnings) > 0
