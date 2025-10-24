# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
FastAPI application bootstrap that wires core utilities, dependencies, and routers.
Enhanced with WebSocket support for Phase 2 real-time collaboration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router
from .core import get_settings, register_exception_handlers, setup_logging
# Temporarily commented out for Phase 2 testing
# from .modules.websocket.integration import integrate_websocket_with_app


def create_app() -> FastAPI:
    """Build the FastAPI application with shared configuration."""

    settings = get_settings()
    setup_logging()

    app = FastAPI(
        title=settings.api_name,
        version=settings.api_version,
        debug=settings.debug,
    )

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3005", "http://localhost:3000"],  # Next.js dev server
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint for frontend connectivity testing."""
        return {
            "status": "healthy",
            "timestamp": settings.api_name,
            "version": settings.api_version,
            "debug": settings.debug,
            "supabase_configured": bool(settings.supabase_jwt_secret),
            "database_configured": bool(settings.database_url)
        }

    register_exception_handlers(app)
    app.include_router(api_router)

    # Integrate WebSocket server for real-time collaboration
    # app = integrate_websocket_with_app(app)  # Temporarily commented for Phase 2 testing

    return app


app = create_app()
