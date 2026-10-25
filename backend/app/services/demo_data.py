"""Sample and demo dataset provider for offline and initial demonstration."""

import csv
import os
from pathlib import Path
from typing import List, Optional
from app.schemas.fire import FireDetection
from app.services.normalizer import normalize_detection_record


DATA_FILE = Path(__file__).parent.parent / "data" / "sample_firms.csv"


def load_sample_detections(
    min_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lat: Optional[float] = None,
    max_lon: Optional[float] = None,
) -> List[FireDetection]:
    """Load and optionally filter sample detections from bundled CSV."""
    if not DATA_FILE.exists():
        return []

    results: List[FireDetection] = []
    with open(DATA_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = normalize_detection_record(row)
            if item is None:
                continue

            # Apply bounding box filter if all 4 coords are provided
            if min_lat is not None and max_lat is not None and min_lon is not None and max_lon is not None:
                if not (min_lat <= item.latitude <= max_lat and min_lon <= item.longitude <= max_lon):
                    continue

            results.append(item)

    return results
