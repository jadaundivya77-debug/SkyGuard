"""Application configuration settings for SKYGUARD backend."""

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    firms_map_key: str = ""
    default_sensor: str = "VIIRS_NOAA20_NRT"
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    firms_cache_ttl: int = 600  # 10 minutes
    weather_cache_ttl: int = 1800  # 30 minutes
    demo_mode: bool = False

    model_config = SettingsConfigDict(
        env_file=(
            str(BACKEND_DIR / ".env"),
            str(ROOT_DIR / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def has_firms_key(self) -> bool:
        return bool(self.firms_map_key and self.firms_map_key.strip() and self.firms_map_key != "your_firms_map_key_here")


settings = Settings()
