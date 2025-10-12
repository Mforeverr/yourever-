# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Repository contracts and helpers.
"""

from typing import Protocol, Sequence


class Repository(Protocol):
    """Marker protocol for repositories to enable type-safe dependency injection."""

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}>"


class InMemoryRepository(Repository):
    """Simple in-memory repository base for early development."""

    def __init__(self) -> None:
        self._items: list[dict] = []

    def load(self, items: Sequence[dict]) -> None:
        self._items = list(items)

    @property
    def items(self) -> list[dict]:
        return self._items
