# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Centralised logging configuration to keep structured logging consistent across modules.
"""

import logging
from typing import Optional


def setup_logging(level: Optional[int] = None) -> None:
    """
    Configure application logging.

    Parameters
    ----------
    level:
        Optional logging level. Defaults to ``logging.INFO`` when not provided.
    """

    logging.basicConfig(
        level=level or logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
