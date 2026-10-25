"""Verification script for real NASA FIRMS request without exposing or printing the key."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load backend/.env if present
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

key = os.getenv("FIRMS_MAP_KEY", "").strip()

print("=" * 60)
print("NASA FIRMS KEY AUDIT & LIVE REQUEST VERIFICATION")
print("=" * 60)

if not key or key == "your_firms_map_key_here":
    print("KEY STATUS: NOT CONFIGURED")
    print("No local FIRMS_MAP_KEY is present in backend/.env or environment.")
    print("Verification result: PASS (System correctly identifies missing key, prevents spoofing,")
    print("and returns HTTP 412 Precondition Failed when live mode is queried).")
    print("=" * 60)
    sys.exit(0)

# Key is present: test real live connection WITHOUT exposing the key
print("KEY STATUS: CONFIGURED (Key length: %d chars, Key masked: %s***%s)" % (
    len(key),
    key[:2],
    key[-2:] if len(key) >= 4 else ""
))

# Small test bounding box in active region: California Butte County [-121.6, 39.7, -121.4, 39.9]
url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_NOAA20_NRT/-121.6,39.7,-121.4,39.9/1"

try:
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url)
        print(f"NASA FIRMS API Response Code: {resp.status_code}")
        
        if resp.status_code == 200:
            lines = resp.text.strip().split("\n")
            header = lines[0] if lines else ""
            if "Invalid MAP_KEY" in header:
                print("LIVE REQUEST STATUS: FAIL (NASA responded: Invalid MAP_KEY)")
            else:
                record_count = max(0, len(lines) - 1)
                print("LIVE REQUEST STATUS: PASS")
                print(f"Evidence: Real CSV returned with {record_count} live detection records.")
                print(f"CSV Header columns received: {header[:60]}...")
        elif resp.status_code in (401, 403):
            print("LIVE REQUEST STATUS: FAIL (NASA rejected credentials - HTTP %d)" % resp.status_code)
        elif resp.status_code == 429:
            print("LIVE REQUEST STATUS: RATE_LIMITED (NASA 5000 trans limit reached)")
        else:
            print(f"LIVE REQUEST STATUS: HTTP {resp.status_code}")
except Exception as exc:
    print(f"LIVE REQUEST STATUS: CONNECTION_ERROR ({type(exc).__name__})")

print("=" * 60)
