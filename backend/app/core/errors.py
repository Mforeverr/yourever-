# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Shared error helpers to keep REST responses consistent.
"""

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class APIError(Exception):
    """Domain-friendly error that maps to our shared response schema."""

    def __init__(self, status_code: int, detail: str, code: Optional[str] = None, extra: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.code = code
        self.extra = extra or {}

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"detail": self.detail}
        if self.code:
            payload["code"] = self.code
        if self.extra:
            payload["meta"] = self.extra
        return payload


def register_exception_handlers(app: FastAPI) -> None:
    """Register consistent exception handlers for APIError and generic errors."""

    @app.exception_handler(APIError)
    async def handle_api_error(_request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
        # Avoid leaking stack traces to clients; log upstream.
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Unexpected server error",
                "code": "internal_server_error",
            },
        )
