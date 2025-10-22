# Author: Eldrie (CTO Dev)
# Date: 2025-10-22
# Role: Backend

"""
Error handling utilities for project routers.

This module provides error handling functions for the project routers
to ensure consistent HTTP responses and proper error propagation.
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Union

from .errors import ProjectError


async def project_error_handler(request: Request, exc: ProjectError) -> JSONResponse:
    """
    Handle ProjectError exceptions and convert them to HTTP responses.

    This error handler ensures that all project-specific errors are
    consistently formatted and include proper HTTP status codes.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.detail,
                "details": exc.extra
            }
        }
    )


def handle_service_error(exc: Exception) -> HTTPException:
    """
    Convert service layer exceptions to HTTP exceptions.

    Args:
        exc: The exception from the service layer

    Returns:
        HTTPException with appropriate status code and message
    """
    from .errors import (
        ProjectNotFoundError,
        ProjectAccessDeniedError,
        ProjectValidationError,
        ProjectMemberNotFoundError,
        ProjectMemberAlreadyExistsError,
        ProjectOwnerOperationError,
        ProjectWorkspaceError
    )

    if isinstance(exc, (ProjectNotFoundError, ProjectMemberNotFoundError)):
        return HTTPException(
            status_code=404,
            detail={
                "code": exc.code,
                "message": exc.detail,
                "details": exc.extra
            }
        )
    elif isinstance(exc, (ProjectAccessDeniedError, ProjectOwnerOperationError)):
        return HTTPException(
            status_code=403,
            detail={
                "code": exc.code,
                "message": exc.detail,
                "details": exc.extra
            }
        )
    elif isinstance(exc, ProjectMemberAlreadyExistsError):
        return HTTPException(
            status_code=409,
            detail={
                "code": exc.code,
                "message": exc.detail,
                "details": exc.extra
            }
        )
    elif isinstance(exc, (ProjectValidationError, ProjectWorkspaceError)):
        return HTTPException(
            status_code=400,
            detail={
                "code": exc.code,
                "message": exc.detail,
                "details": exc.extra
            }
        )
    else:
        # Unknown exception - return generic error
        return HTTPException(
            status_code=500,
            detail={
                "code": "internal_server_error",
                "message": "An unexpected error occurred",
                "details": {"type": type(exc).__name__}
            }
        )


def create_error_response(code: str, message: str, status_code: int = 400, details: dict = None) -> dict:
    """
    Create a standardized error response.

    Args:
        code: Machine-readable error code
        message: Human-readable error message
        status_code: HTTP status code
        details: Additional error details

    Returns:
        Standardized error response dictionary
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        },
        "status_code": status_code
    }