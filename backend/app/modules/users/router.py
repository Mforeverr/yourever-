# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
User profile and management endpoints with comprehensive scope validation.

This module implements secure user management operations following REST principles
and the Open/Closed Pattern. Organizational user operations require proper scope
validation to prevent cross-tenant access and ensure security compliance.

Security Implementation:
- Current user endpoints: /api/users/me (self-service)
- Organization-scoped user management: /api/organizations/{org_id}/users
- Division-scoped user management: /api/organizations/{org_id}/divisions/{div_id}/users
- Cross-tenant prevention via scope guard validation
- Audit logging for security violations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_user_service
from .schemas import (
    OnboardingProgressUpdate,
    OnboardingSessionResponse,
    UserProfileResponse,
    UserListResponse,
    UserProfileUpdateRequest,
    UserResponse,
    UserInviteRequest
)
from .service import UserService
from ..onboarding.errors import OnboardingRevisionConflict

router = APIRouter(prefix="/api", tags=["users"])


# Current user endpoints (self-service - no scope validation needed)
@router.get("/users/me", response_model=UserProfileResponse)
async def get_current_user(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserProfileResponse:
    """
    Get the current user's profile information.

    This endpoint allows users to access their own profile information
    without requiring additional scope validation beyond authentication.
    """
    try:
        user = await service.get_current_user(principal)
    except Exception as e:
        # Log the actual error for debugging
        print(f"ERROR in get_current_user: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User profile not found: {str(e)}") from None
    return UserProfileResponse(user=user)


@router.get("/users/me/onboarding-progress", response_model=OnboardingSessionResponse)
async def get_onboarding_progress(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> OnboardingSessionResponse:
    """
    Get the current user's onboarding progress.

    This endpoint allows users to access their own onboarding progress
    without requiring additional scope validation beyond authentication.
    """
    session = await service.get_onboarding_session(principal)
    return OnboardingSessionResponse(session=session)


@router.patch("/users/me/onboarding-progress", response_model=OnboardingSessionResponse)
async def update_onboarding_progress(
    payload: OnboardingProgressUpdate,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> OnboardingSessionResponse:
    """
    Update the current user's onboarding progress.

    This endpoint allows users to update their own onboarding progress
    without requiring additional scope validation beyond authentication.
    """
    try:
        session = await service.update_onboarding_progress(principal, payload.status)
    except OnboardingRevisionConflict as error:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": error.detail,
                "conflict": error.context,
            },
        )

    return OnboardingSessionResponse(session=session)


@router.patch("/users/me/profile", response_model=UserProfileResponse)
async def update_current_user_profile(
    profile_update: UserProfileUpdateRequest,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserProfileResponse:
    """
    Update the current user's profile information.

    This endpoint allows users to update their own profile information
    without requiring additional scope validation beyond authentication.
    """
    try:
        user = await service.update_current_user_profile(principal, profile_update)
        return UserProfileResponse(user=user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update profile: {str(e)}"
        ) from None


# Organization-scoped user management endpoints
@router.get("/organizations/{org_id}/users", response_model=UserListResponse)
async def list_organization_users(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"user:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserListResponse:
    """
    List all users within a specific organization.

    Requires organization-level user:read permission.
    Prevents cross-organization user data access.
    """
    users = await service.list_users_for_organization(principal, org_id)
    return UserListResponse(results=users)


@router.post("/organizations/{org_id}/users/invite", response_model=UserResponse)
async def invite_user_to_organization(
    org_id: str,
    invite_request: UserInviteRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"user:invite"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """
    Invite a user to join an organization.

    Requires organization-level user:invite permission.
    The user will be associated with the validated organization scope.
    """
    user = await service.invite_user_to_organization(principal, org_id, invite_request)
    return UserResponse.from_entity(user)


@router.get("/organizations/{org_id}/users/{user_id}", response_model=UserResponse)
async def get_organization_user(
    org_id: str,
    user_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"user:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """
    Get a specific user within an organization.

    Requires organization-level user:read permission.
    Validates that the user belongs to the specified organization.
    """
    user = await service.get_user_for_organization(principal, org_id, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            code="user_not_found"
        )
    return UserResponse.from_entity(user)


@router.put("/organizations/{org_id}/users/{user_id}/profile", response_model=UserResponse)
async def update_organization_user_profile(
    org_id: str,
    user_id: str,
    profile_update: UserProfileUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"user:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """
    Update a user's profile within an organization.

    Requires organization-level user:update permission.
    Validates that the user belongs to the specified organization.
    """
    user = await service.update_user_profile_for_organization(principal, org_id, user_id, profile_update)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            code="user_not_found"
        )
    return UserResponse.from_entity(user)


@router.delete("/organizations/{org_id}/users/{user_id}")
async def remove_user_from_organization(
    org_id: str,
    user_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"user:remove"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> dict:
    """
    Remove a user from an organization.

    Requires organization-level user:remove permission.
    Validates that the user belongs to the specified organization.
    """
    success = await service.remove_user_from_organization(principal, org_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            code="user_not_found"
        )
    return {"message": "User removed from organization successfully"}


# Division-scoped user management endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/users", response_model=UserListResponse)
async def list_division_users(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"user:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserListResponse:
    """
    List all users within a specific division.

    Requires division-level user:read permission.
    Prevents cross-division user data access.
    """
    users = await service.list_users_for_division(principal, org_id, div_id)
    return UserListResponse(results=users)


@router.post("/organizations/{org_id}/divisions/{div_id}/users/invite", response_model=UserResponse)
async def invite_user_to_division(
    org_id: str,
    div_id: str,
    invite_request: UserInviteRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"user:invite"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """
    Invite a user to join a division.

    Requires division-level user:invite permission.
    The user will be associated with the validated division scope.
    """
    user = await service.invite_user_to_division(principal, org_id, div_id, invite_request)
    return UserResponse.from_entity(user)


@router.get("/organizations/{org_id}/divisions/{div_id}/users/{user_id}", response_model=UserResponse)
async def get_division_user(
    org_id: str,
    div_id: str,
    user_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"user:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """
    Get a specific user within a division.

    Requires division-level user:read permission.
    Validates that the user belongs to the specified division.
    """
    user = await service.get_user_for_division(principal, org_id, div_id, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            code="user_not_found"
        )
    return UserResponse.from_entity(user)


@router.put("/organizations/{org_id}/divisions/{div_id}/users/{user_id}/profile", response_model=UserResponse)
async def update_division_user_profile(
    org_id: str,
    div_id: str,
    user_id: str,
    profile_update: UserProfileUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"user:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    """
    Update a user's profile within a division.

    Requires division-level user:update permission.
    Validates that the user belongs to the specified division.
    """
    user = await service.update_user_profile_for_division(principal, org_id, div_id, user_id, profile_update)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            code="user_not_found"
        )
    return UserResponse.from_entity(user)


@router.delete("/organizations/{org_id}/divisions/{div_id}/users/{user_id}")
async def remove_user_from_division(
    org_id: str,
    div_id: str,
    user_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"user:remove"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> dict:
    """
    Remove a user from a division.

    Requires division-level user:remove permission.
    Validates that the user belongs to the specified division.
    """
    success = await service.remove_user_from_division(principal, org_id, div_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            code="user_not_found"
        )
    return {"message": "User removed from division successfully"}
