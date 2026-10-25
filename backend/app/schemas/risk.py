"""Data schemas for explainable environmental risk scoring."""

from typing import List, Optional
from pydantic import BaseModel, Field


class RiskFactor(BaseModel):
    name: str = Field(..., description="Factor identifier (e.g., temperature, relative_humidity)")
    display_name: str
    raw_value: Optional[float] = None
    unit: str
    normalized_score: float = Field(..., ge=0.0, le=100.0, description="Normalized factor score (0-100)")
    weight: float = Field(..., ge=0.0, le=1.0, description="Weight proportion (sum to 1.0)")
    weighted_contribution: float = Field(..., ge=0.0, le=100.0)
    status: str = Field("available", description="'available', 'missing', or 'defaulted'")
    description: str


class RiskAssessmentResponse(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Aggregated 0-100 environmental risk score")
    risk_level: str = Field(..., description="Low, Moderate, High, Very High, Extreme")
    latitude: float
    longitude: float
    factors: List[RiskFactor]
    available_factors_count: int
    total_factors_count: int
    missing_factors: List[str] = Field(default_factory=list)
    confidence_in_score: str = Field(..., description="High, Moderate, Degraded (Missing Inputs)")
    warnings: List[str] = Field(default_factory=list)
    methodology: str = (
        "Baseline linear-sigmoid atmospheric risk heuristic combining temperature, "
        "relative humidity deficit, wind velocity, and precipitation deficit."
    )
    disclaimer: str = (
        "EXPERIMENTAL ENVIRONMENTAL RISK ESTIMATE. This heuristic is unvalidated and is NOT a calibrated "
        "wildfire probability or machine-learning prediction model. Hotspot presence alone does not establish "
        "future fire spread, and model estimates require ground verification."
    )
    calculated_at_utc: str
