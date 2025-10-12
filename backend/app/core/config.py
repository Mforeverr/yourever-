# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Minimal configuration loader for the FastAPI application.

The goal is to differentiate runtime configuration (environment variables)
from code defaults while staying lightweight during early development.
"""

from functools import lru_cache
import os
from typing import Optional

from pydantic import BaseModel, Field


class Settings(BaseModel):
    api_name: str = Field(default="Yourever API")
    api_version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)

    database_url: Optional[str] = Field(default=None)
    database_echo: bool = Field(default=False, alias="databaseEcho")

    supabase_url: Optional[str] = Field(default=None)
    supabase_service_role_key: Optional[str] = Field(default=None)
    supabase_jwt_secret: Optional[str] = Field(default=None)
    supabase_jwt_audience: Optional[str] = Field(default=None)

    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from environment variables."""

        return cls(
            api_name=os.getenv("YOUREVER_API_NAME", "Yourever API"),
            api_version=os.getenv("YOUREVER_API_VERSION", "0.1.0"),
            debug=os.getenv("YOUREVER_API_DEBUG", "false").lower() == "true",
            database_url=os.getenv("YOUREVER_DATABASE_URL") or os.getenv("DATABASE_URL"),
            database_echo=os.getenv("YOUREVER_DATABASE_ECHO", "false").lower() == "true",
            supabase_url=os.getenv("SUPABASE_URL"),
            supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
            supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET"),
            supabase_jwt_audience=os.getenv("SUPABASE_JWT_AUDIENCE"),
        )


@lru_cache
def get_settings() -> Settings:
    """Expose cached settings for dependency injection."""

    return Settings.from_env()
