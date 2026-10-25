"""FastAPI Main Application Entry Point for SKYGUARD."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import api_router


logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("skyguard.main")

app = FastAPI(
    title="SKYGUARD — Eyes on Earth API",
    description=(
        "Satellite-observed active-fire monitoring, Open-Meteo weather integration, "
        "explainable environmental risk assessment, and spatial clustering."
    ),
    version="1.0.0-prototype",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = settings.cors_origins or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    """Root status summary."""
    return {
        "service": "SKYGUARD — Eyes on Earth",
        "description": "Satellite Active-Fire Monitoring & Environmental Risk Engine",
        "health": "/api/health",
        "documentation": "/docs",
        "has_firms_key": settings.has_firms_key,
        "demo_mode": settings.demo_mode,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
