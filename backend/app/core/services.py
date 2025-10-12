# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Shared service utilities to encourage consistent patterns across modules.
"""

from dataclasses import dataclass
from typing import Protocol

from ..dependencies import CurrentPrincipal


class ServiceWithPrincipal(Protocol):
    """Contract for services that operate in the context of an authenticated user."""

    async def bind_principal(self, principal: CurrentPrincipal) -> "ServiceWithPrincipal":
        ...


@dataclass
class ServiceContext:
    principal: CurrentPrincipal
