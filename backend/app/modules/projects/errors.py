# Author: Eldrie (CTO Dev)
# Date: 2025-10-22
# Role: Backend

"""
Project-specific error handling and validation utilities.

This module provides custom exceptions and error handling functions for
project management operations to ensure consistent error responses
and proper validation.
"""

from typing import Optional, Any, Dict
from fastapi import HTTPException, status

from app.core.errors import APIError


class ProjectError(APIError):
    """Base exception for project-related errors."""

    def __init__(
        self,
        detail: str,
        code: str = "project_error",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        extra: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail=detail,
            code=code,
            extra=extra or {}
        )


class ProjectNotFoundError(ProjectError):
    """Raised when a project cannot be found."""

    def __init__(self, project_id: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"Project with ID '{project_id}' not found",
            code="project_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            extra={"project_id": project_id, **(extra or {})}
        )


class ProjectAccessDeniedError(ProjectError):
    """Raised when user lacks access to a project."""

    def __init__(self, project_id: str, reason: str = "Access denied", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"Access denied to project '{project_id}': {reason}",
            code="project_access_denied",
            status_code=status.HTTP_403_FORBIDDEN,
            extra={"project_id": project_id, "reason": reason, **(extra or {})}
        )


class ProjectValidationError(ProjectError):
    """Raised when project data validation fails."""

    def __init__(self, field: str, message: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"Validation failed for field '{field}': {message}",
            code="project_validation_error",
            status_code=status.HTTP_400_BAD_REQUEST,
            extra={"field": field, "validation_message": message, **(extra or {})}
        )


class ProjectMemberNotFoundError(ProjectError):
    """Raised when a project member cannot be found."""

    def __init__(self, project_id: str, user_id: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"User '{user_id}' is not a member of project '{project_id}'",
            code="project_member_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            extra={"project_id": project_id, "user_id": user_id, **(extra or {})}
        )


class ProjectMemberAlreadyExistsError(ProjectError):
    """Raised when trying to add a user who is already a project member."""

    def __init__(self, project_id: str, user_id: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"User '{user_id}' is already a member of project '{project_id}'",
            code="project_member_already_exists",
            status_code=status.HTTP_409_CONFLICT,
            extra={"project_id": project_id, "user_id": user_id, **(extra or {})}
        )


class ProjectOwnerOperationError(ProjectError):
    """Raised when trying to perform an invalid operation on a project owner."""

    def __init__(self, operation: str, reason: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"Cannot {operation} project owner: {reason}",
            code="project_owner_operation_error",
            status_code=status.HTTP_400_BAD_REQUEST,
            extra={"operation": operation, "reason": reason, **(extra or {})}
        )


class ProjectWorkspaceError(ProjectError):
    """Raised when project workspace operations fail."""

    def __init__(self, operation: str, message: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=f"Workspace {operation} failed: {message}",
            code="project_workspace_error",
            status_code=status.HTTP_400_BAD_REQUEST,
            extra={"operation": operation, "message": message, **(extra or {})}
        )


def handle_project_not_found(project_id: str) -> HTTPException:
    """Create a standardized HTTP exception for project not found errors."""
    error = ProjectNotFoundError(project_id)
    return error.to_http_exception()


def handle_project_access_denied(project_id: str, reason: str = "Access denied") -> HTTPException:
    """Create a standardized HTTP exception for project access denied errors."""
    error = ProjectAccessDeniedError(project_id, reason)
    return error.to_http_exception()


def handle_project_validation_error(field: str, message: str) -> HTTPException:
    """Create a standardized HTTP exception for project validation errors."""
    error = ProjectValidationError(field, message)
    return error.to_http_exception()


def handle_project_member_not_found(project_id: str, user_id: str) -> HTTPException:
    """Create a standardized HTTP exception for project member not found errors."""
    error = ProjectMemberNotFoundError(project_id, user_id)
    return error.to_http_exception()


def handle_project_member_already_exists(project_id: str, user_id: str) -> HTTPException:
    """Create a standardized HTTP exception for project member already exists errors."""
    error = ProjectMemberAlreadyExistsError(project_id, user_id)
    return error.to_http_exception()


def handle_project_owner_error(operation: str, reason: str) -> HTTPException:
    """Create a standardized HTTP exception for project owner operation errors."""
    error = ProjectOwnerOperationError(operation, reason)
    return error.to_http_exception()


def handle_project_workspace_error(operation: str, message: str) -> HTTPException:
    """Create a standardized HTTP exception for project workspace errors."""
    error = ProjectWorkspaceError(operation, message)
    return error.to_http_exception()


# Validation helper functions
def validate_project_name(name: Optional[str]) -> str:
    """Validate and normalize project name."""
    if not name:
        raise ProjectValidationError("name", "Project name is required")

    name = name.strip()
    if not name:
        raise ProjectValidationError("name", "Project name cannot be empty")

    if len(name) > 255:
        raise ProjectValidationError("name", "Project name cannot exceed 255 characters")

    return name


def validate_project_description(description: Optional[str]) -> Optional[str]:
    """Validate and normalize project description."""
    if description is None:
        return None

    description = description.strip()
    if description and len(description) > 1000:
        raise ProjectValidationError("description", "Project description cannot exceed 1000 characters")

    return description or None


def validate_project_status(status: Optional[str]) -> str:
    """Validate project status."""
    from .schemas import ProjectStatus

    if not status:
        return ProjectStatus.ACTIVE.value

    # If it's already an enum instance, get its value
    if hasattr(status, 'value'):
        return status.value

    try:
        # Validate it's a valid status and return the string value
        validated_status = ProjectStatus(status.lower())
        return validated_status.value
    except ValueError:
        valid_statuses = [s.value for s in ProjectStatus]
        raise ProjectValidationError(
            "status",
            f"Invalid status '{status}'. Valid statuses: {', '.join(valid_statuses)}"
        )


def validate_project_priority(priority: Optional[str]) -> str:
    """Validate project priority."""
    from .schemas import ProjectPriority

    if not priority:
        return ProjectPriority.MEDIUM.value

    # If it's already an enum instance, get its value
    if hasattr(priority, 'value'):
        return priority.value

    try:
        # Validate it's a valid priority and return the string value
        validated_priority = ProjectPriority(priority.lower())
        return validated_priority.value
    except ValueError:
        valid_priorities = [p.value for p in ProjectPriority]
        raise ProjectValidationError(
            "priority",
            f"Invalid priority '{priority}'. Valid priorities: {', '.join(valid_priorities)}"
        )


def validate_user_id(user_id: Optional[str]) -> str:
    """Validate and normalize user ID."""
    if not user_id:
        raise ProjectValidationError("user_id", "User ID is required")

    user_id = user_id.strip()
    if not user_id:
        raise ProjectValidationError("user_id", "User ID cannot be empty")

    return user_id


def validate_project_member_role(role: Optional[str]) -> str:
    """Validate project member role."""
    from .schemas import ProjectMemberRole

    if not role:
        raise ProjectValidationError("role", "Member role is required")

    # If it's already an enum instance, get its value
    if hasattr(role, 'value'):
        return role.value

    try:
        # Validate it's a valid role and return the string value
        validated_role = ProjectMemberRole(role.lower())
        return validated_role.value
    except ValueError:
        valid_roles = [r.value for r in ProjectMemberRole]
        raise ProjectValidationError(
            "role",
            f"Invalid role '{role}'. Valid roles: {', '.join(valid_roles)}"
        )