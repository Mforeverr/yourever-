# Re-export authentication dependency for routers.

from .auth import CurrentPrincipal, require_current_principal

__all__ = ["CurrentPrincipal", "require_current_principal"]
