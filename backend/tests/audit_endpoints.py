"""Audit script to test every documented API endpoint against the running server."""

import time
import httpx

import os
base = os.getenv("API_URL", "http://127.0.0.1:8001")

tests = [
    ("Root Service Info", "GET", "/", {}),
    ("Health Check Endpoint", "GET", "/api/health", {}),
    ("Active Fires (Demo)", "GET", "/api/fires", {
        "demo": "true",
        "min_lat": 32.5,
        "min_lon": -124.5,
        "max_lat": 42.0,
        "max_lon": -114.0
    }),
    ("Active Fires (Live without key -> 412 expected)", "GET", "/api/fires", {
        "demo": "false",
        "min_lat": 32.5,
        "min_lon": -124.5,
        "max_lat": 42.0,
        "max_lon": -114.0
    }),
    ("Fires Summary (Demo)", "GET", "/api/fires/summary", {"demo": "true"}),
    ("Supported Satellite Sensors", "GET", "/api/fires/sensors", {}),
    ("Weather (Live Open-Meteo Grid)", "GET", "/api/weather", {
        "latitude": 38.5,
        "longitude": -122.5
    }),
    ("Risk Assessment (Live Open-Meteo)", "GET", "/api/risk", {
        "latitude": 38.5,
        "longitude": -122.5
    }),
    ("Risk Assessment (What-If Simulation)", "GET", "/api/risk", {
        "latitude": 38.5,
        "longitude": -122.5,
        "override_temp": 38.0,
        "override_rh": 14.0,
        "override_wind": 35.0,
        "override_precip": 0.0
    }),
    ("Spatial Clusters (Haversine DBSCAN)", "GET", "/api/clusters", {
        "demo": "true",
        "eps_km": 15.0,
        "min_samples": 3
    }),
    ("Incident Report Export (CSV)", "GET", "/api/report", {
        "demo": "true",
        "format": "csv"
    }),
    ("Incident Report Export (JSON)", "GET", "/api/report", {
        "demo": "true",
        "format": "json"
    }),
]

client = httpx.Client(base_url=base, timeout=15.0)

print(f"{'Endpoint Test':<44} | {'Method':<6} | {'Status':<6} | {'Latency':<9} | {'Details'}")
print("-" * 105)

all_passed = True
for name, method, path, params in tests:
    t0 = time.time()
    try:
        resp = client.request(method, path, params=params)
        elapsed = round((time.time() - t0) * 1000, 1)
        ct = resp.headers.get("content-type", "")
        
        # Determine expected status
        expected = 412 if "412 expected" in name else 200
        ok = resp.status_code == expected
        if not ok:
            all_passed = False

        if "json" in ct:
            data = resp.json()
            if isinstance(data, dict):
                if "items" in data:
                    details = f"{len(data['items'])} detections returned, source: {data.get('summary', {}).get('source', '')[:30]}"
                elif "overall_score" in data:
                    details = f"Risk Score: {data['overall_score']} ({data['risk_level']}), Confidence: {data['confidence_in_score']}"
                elif "clusters" in data:
                    details = f"{len(data['clusters'])} clusters, algorithm: {data.get('algorithm', '')[:25]}"
                elif "sensors" in data:
                    details = f"{len(data['sensors'])} sensors supported: {', '.join(s['code'] for s in data['sensors'][:2])}..."
                elif "detail" in data:
                    details = f"Detail: {data['detail'][:60]}..."
                else:
                    details = f"Keys: {list(data.keys())[:5]}"
            else:
                details = f"List len: {len(data)}"
        elif "csv" in ct:
            lines = resp.text.strip().split("\n")
            details = f"CSV with {len(lines)} lines; header: {lines[0] if lines else ''}"
        else:
            details = resp.text[:50]

        status_str = f"{resp.status_code} [PASS]" if ok else f"{resp.status_code} [FAIL]"
        print(f"{name:<44} | {method:<6} | {status_str:<12} | {elapsed:>6} ms | {details}")
    except Exception as exc:
        all_passed = False
        print(f"{name:<44} | {method:<6} | {'ERR':<12} | {'-':>6} ms | Exception: {str(exc)}")

print("-" * 105)
print(f"OVERALL API AUDIT: {'ALL 12 ENDPOINT CHECKS PASSED' if all_passed else 'SOME ENDPOINTS FAILED'}")
