"""Integration tests for all FastAPI API endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "firms" in data
        assert "weather" in data
        assert "cache" in data


@pytest.mark.asyncio
async def test_fires_demo_mode():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/fires?demo=true")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_demo"] is True
        assert len(data["items"]) > 0
        assert data["summary"]["total_detections"] == len(data["items"])
        assert "DEMO" in data["summary"]["source"]


@pytest.mark.asyncio
async def test_fires_live_mode_without_key_returns_412():
    # Ensure key is empty for this test
    original_key = settings.firms_map_key
    settings.firms_map_key = ""
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/fires?demo=false")
            assert resp.status_code == 412
            data = resp.json()
            assert "NASA FIRMS MAP_KEY is not configured" in data["detail"]
    finally:
        settings.firms_map_key = original_key


@pytest.mark.asyncio
async def test_fires_summary_demo():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/fires/summary?demo=true")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_detections"] > 0
        assert data["is_demo"] is True
        assert "confidence_breakdown" in data


@pytest.mark.asyncio
async def test_sensors_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/fires/sensors")
        assert resp.status_code == 200
        data = resp.json()
        assert "sensors" in data
        assert len(data["sensors"]) >= 4


@pytest.mark.asyncio
async def test_clusters_demo():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/clusters?demo=true&eps_km=25.0&min_samples=2")
        assert resp.status_code == 200
        data = resp.json()
        assert "clusters" in data
        assert data["total_detections"] > 0


@pytest.mark.asyncio
async def test_risk_calculation_with_simulated_weather():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Hot, dry, windy, zero precip -> Should trigger High or Extreme risk
        resp = await client.get(
            "/api/risk?latitude=38.5&longitude=-122.5&override_temp=38&override_rh=14&override_wind=35&override_precip=0"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_score"] >= 75.0
        assert data["risk_level"] in ("Very High", "Extreme")
        assert len(data["factors"]) == 4
        assert "EXPERIMENTAL ENVIRONMENTAL RISK ESTIMATE" in data["disclaimer"]


@pytest.mark.asyncio
async def test_report_export_csv():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/report?demo=true&format=csv")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert "attachment; filename=" in resp.headers["content-disposition"]
        content = resp.text
        assert "# SKYGUARD — Eyes on Earth" in content
        assert "latitude,longitude" in content


@pytest.mark.asyncio
async def test_report_export_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/report?demo=true&format=json")
        assert resp.status_code == 200
        data = resp.json()
        assert "metadata" in data
        assert "detections" in data
        assert data["metadata"]["is_demo_telemetry"] is True
