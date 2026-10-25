"""Thread-safe bounded in-memory TTL cache with statistics."""

import time
import threading
from typing import Any, Dict, Optional, Tuple


class TTLCache:
    """A thread-safe in-memory cache with bounded capacity and time-to-live expiration."""

    def __init__(self, max_size: int = 500, default_ttl: int = 600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}  # key -> (value, expire_at)
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            if key in self._cache:
                value, expire_at = self._cache[key]
                if expire_at > now:
                    self.hits += 1
                    return value
                else:
                    # Expired
                    del self._cache[key]
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        now = time.time()
        ttl_val = ttl if ttl is not None else self.default_ttl
        expire_at = now + ttl_val

        with self._lock:
            # Enforce max size via simple eviction of expired or oldest
            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_expired(now)
                if len(self._cache) >= self.max_size:
                    # Evict any one item
                    first_key = next(iter(self._cache))
                    del self._cache[first_key]

            self._cache[key] = (value, expire_at)

    def _evict_expired(self, now: float) -> None:
        keys_to_del = [k for k, (_, exp) in self._cache.items() if exp <= now]
        for k in keys_to_del:
            del self._cache[k]

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self.hits = 0
            self.misses = 0

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            now = time.time()
            active_count = sum(1 for _, exp in self._cache.values() if exp > now)
            return {
                "active_entries": active_count,
                "total_stored": len(self._cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio": round(self.hits / (self.hits + self.misses), 3) if (self.hits + self.misses) > 0 else 0.0,
            }


# Global instances for firms queries and weather queries
firms_cache = TTLCache(max_size=200, default_ttl=600)
weather_cache = TTLCache(max_size=300, default_ttl=1800)
