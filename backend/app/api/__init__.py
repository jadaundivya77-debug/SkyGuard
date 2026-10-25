"""API routes bundle."""

from fastapi import APIRouter
from app.api.routes_health import router as health_router
from app.api.routes_fires import router as fires_router
from app.api.routes_weather import router as weather_router
from app.api.routes_risk import router as risk_router
from app.api.routes_clusters import router as clusters_router
from app.api.routes_report import router as report_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(fires_router)
api_router.include_router(weather_router)
api_router.include_router(risk_router)
api_router.include_router(clusters_router)
api_router.include_router(report_router)

__all__ = ["api_router"]
