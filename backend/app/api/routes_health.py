"""Health check and dependency status endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.services.cache import firms_cache, weather_cache


router = APIRouter(tags=["Health"])


@router.get("/health")
async def get_health_status():
    """Return application status, external API key configuration, and cache telemetry."""
    now_utc = datetime.now(timezone.utc).isoformat()
    return {
        "status": "healthy",
        "service": "SKYGUARD — Eyes on Earth API",
        "version": "1.0.0-prototype",
        "timestamp_utc": now_utc,
        "firms": {
            "key_configured": settings.has_firms_key,
            "default_sensor": settings.default_sensor,
            "cache_ttl_seconds": settings.firms_cache_ttl,
        },
        "weather": {
            "provider": "Open-Meteo Forecast API",
            "key_required": False,
            "cache_ttl_seconds": settings.weather_cache_ttl,
        },
        "mode": {
            "demo_mode_forced": settings.demo_mode,
            "can_access_live_firms": settings.has_firms_key and not settings.demo_mode,
        },
        "cache": {
            "firms": firms_cache.stats(),
            "weather": weather_cache.stats(),
        },
    }
