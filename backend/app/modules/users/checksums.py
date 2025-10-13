"""Utilities for computing deterministic onboarding status checksums."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Mapping


def _normalize_mapping(data: Any) -> Mapping[str, Any]:
    if isinstance(data, Mapping):
        return data
    if isinstance(data, dict):
        return data
    return {}


def compute_status_checksum(data: Any) -> str:
    """Return a stable SHA-1 checksum for the provided onboarding status data."""

    normalized = _normalize_mapping(data)
    serialized = json.dumps(normalized, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha1(serialized.encode("utf-8")).hexdigest()
