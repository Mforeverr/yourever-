"""Onboarding module exports with lazy router import to avoid circular dependencies."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - only for type hints
    from .router import router as onboarding_router

__all__ = ["router", "onboarding_router"]


def __getattr__(name: str):  # pragma: no cover - simple attribute hook
    if name == "router":
        from .router import router as onboarding_router

        return onboarding_router
    raise AttributeError(f"module 'app.modules.onboarding' has no attribute {name!r}")
