# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Tasks REST endpoints with comprehensive scope validation.

This module implements secure kanban board task management endpoints following
REST principles and the Open/Closed Pattern. All endpoints require proper scope
validation to prevent cross-tenant access and ensure security compliance.

Security Implementation:
- Organization-level access: /api/organizations/{org_id}/boards/*
- Division-level access: /api/organizations/{org_id}/divisions/{div_id}/boards/*
- Cross-tenant prevention via scope guard validation
- Audit logging for security violations

API Groups:
- Board management (CRUD + operations)
- Column management (CRUD + reordering)
- Task management (CRUD + move/assign)
- Comment system (CRUD + threading)
- Activity logging and audit trails
- Bulk operations for efficiency
- Search and filtering capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from ...core.errors import APIError
from .di import get_tasks_service
from .schemas import (
    # Board schemas
    BoardCreate, BoardUpdate, BoardResponse, BoardListResponse, BoardStats, BoardPermissions,
    BoardSearchRequest,

    # Column schemas
    ColumnCreate, ColumnUpdate, ColumnResponse, ColumnListResponse,

    # Task schemas
    TaskCreate, TaskUpdate, TaskResponse, TaskListResponse, TaskSummary,
    TaskMove, TaskAssign, TaskSearchRequest,

    # Comment schemas
    CommentCreate, CommentUpdate, CommentResponse, CommentListResponse,

    # Activity schemas
    ActivityResponse,

    # Bulk operation schemas
    BulkTaskMove, BulkTaskAssign, BulkOperationResponse,

    # Base models
    TaskPriority, TaskStatus, ColumnType
)
from .service import TasksService

router = APIRouter(prefix="/api", tags=["tasks", "kanban", "boards"])


# ==================== BOARD MANAGEMENT ENDPOINTS ====================

# Organization-scoped board endpoints
@router.get("/organizations/{org_id}/boards", response_model=BoardListResponse)
async def list_organization_boards(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"board:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> BoardListResponse:
    """
    List all kanban boards within a specific organization.

    Requires organization-level board:read permission.
    Prevents cross-organization data access.
    """
    offset = (page - 1) * per_page
    boards = await service.list_boards_for_organization(principal, org_id, per_page, offset)

    return BoardListResponse(
        boards=boards,
        total=len(boards),  # Would need count query for accurate total
        page=page,
        per_page=per_page,
        has_next=len(boards) == per_page,
        has_previous=page > 1
    )


@router.post("/organizations/{org_id}/boards", response_model=BoardResponse)
async def create_organization_board(
    org_id: str,
    board_request: BoardCreate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"board:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardResponse:
    """
    Create a new kanban board within a specific organization.

    Requires organization-level board:create permission.
    Board will be associated with the validated organization.
    """
    board = await service.create_board_for_organization(principal, org_id, board_request)
    return BoardResponse(
        board=board,
        columns=await service._repository.get_columns_for_board(board.id),
        tasks=[],
        permissions={"can_view": True, "can_edit": True, "can_delete": True},
        success=True,
        message="Board created successfully"
    )


@router.get("/organizations/{org_id}/boards/{board_id}", response_model=BoardResponse)
async def get_organization_board(
    org_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"board:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardResponse:
    """
    Get a specific board within an organization.

    Requires organization-level board:read permission.
    Validates that the board belongs to the specified organization.
    """
    board = await service.get_board_for_organization(principal, org_id, board_id)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    # Get all tasks for the board
    all_tasks = []
    if board.columns:
        for column in board.columns:
            column_tasks = await service._repository.get_tasks_for_column(column.id)
            all_tasks.extend(column_tasks)

    return BoardResponse(
        board=board,
        columns=board.columns or [],
        tasks=all_tasks,
        permissions={"can_view": True, "can_edit": True, "can_delete": True},
        success=True
    )


@router.put("/organizations/{org_id}/boards/{board_id}", response_model=BoardResponse)
async def update_organization_board(
    org_id: str,
    board_id: str,
    board_request: BoardUpdate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"board:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardResponse:
    """
    Update a board within an organization.

    Requires organization-level board:update permission.
    Validates that the board belongs to the specified organization.
    """
    board = await service.update_board_for_organization(principal, org_id, board_id, board_request)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return BoardResponse(
        board=board,
        columns=await service._repository.get_columns_for_board(board.id),
        tasks=[],
        permissions={"can_view": True, "can_edit": True, "can_delete": True},
        success=True,
        message="Board updated successfully"
    )


@router.delete("/organizations/{org_id}/boards/{board_id}")
async def delete_organization_board(
    org_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"board:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """
    Delete a board within an organization.

    Requires organization-level board:delete permission.
    Validates that the board belongs to the specified organization.
    """
    success = await service.delete_board_for_organization(principal, org_id, board_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return {"message": "Board deleted successfully"}


@router.get("/organizations/{org_id}/boards/{board_id}/stats", response_model=BoardStats)
async def get_organization_board_stats(
    org_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"board:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardStats:
    """
    Get comprehensive statistics for a board within an organization.

    Requires organization-level board:read permission.
    """
    stats = await service.get_board_stats(principal, org_id, board_id)
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return stats


# Division-scoped board endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/boards", response_model=BoardListResponse)
async def list_division_boards(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"board:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> BoardListResponse:
    """
    List all boards within a specific division.

    Requires division-level board:read permission.
    Prevents cross-division data access.
    """
    offset = (page - 1) * per_page
    boards = await service.list_boards_for_division(principal, org_id, div_id, per_page, offset)

    return BoardListResponse(
        boards=boards,
        total=len(boards),
        page=page,
        per_page=per_page,
        has_next=len(boards) == per_page,
        has_previous=page > 1
    )


@router.post("/organizations/{org_id}/divisions/{div_id}/boards", response_model=BoardResponse)
async def create_division_board(
    org_id: str,
    div_id: str,
    board_request: BoardCreate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"board:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardResponse:
    """
    Create a new board within a specific division.

    Requires division-level board:create permission.
    Board will be associated with the validated division.
    """
    board = await service.create_board_for_division(principal, org_id, div_id, board_request)
    return BoardResponse(
        board=board,
        columns=await service._repository.get_columns_for_board(board.id),
        tasks=[],
        permissions={"can_view": True, "can_edit": True, "can_delete": True},
        success=True,
        message="Board created successfully"
    )


@router.get("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}", response_model=BoardResponse)
async def get_division_board(
    org_id: str,
    div_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"board:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardResponse:
    """
    Get a specific board within a division.

    Requires division-level board:read permission.
    Validates that the board belongs to the specified division.
    """
    board = await service.get_board_for_division(principal, org_id, div_id, board_id)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    # Get all tasks for the board
    all_tasks = []
    if board.columns:
        for column in board.columns:
            column_tasks = await service._repository.get_tasks_for_column(column.id)
            all_tasks.extend(column_tasks)

    return BoardResponse(
        board=board,
        columns=board.columns or [],
        tasks=all_tasks,
        permissions={"can_view": True, "can_edit": True, "can_delete": True},
        success=True
    )


@router.put("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}", response_model=BoardResponse)
async def update_division_board(
    org_id: str,
    div_id: str,
    board_id: str,
    board_request: BoardUpdate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"board:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardResponse:
    """
    Update a board within a division.

    Requires division-level board:update permission.
    Validates that the board belongs to the specified division.
    """
    board = await service.update_board_for_division(principal, org_id, div_id, board_id, board_request)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return BoardResponse(
        board=board,
        columns=await service._repository.get_columns_for_board(board.id),
        tasks=[],
        permissions={"can_view": True, "can_edit": True, "can_delete": True},
        success=True,
        message="Board updated successfully"
    )


@router.delete("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}")
async def delete_division_board(
    org_id: str,
    div_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"board:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """
    Delete a board within a division.

    Requires division-level board:delete permission.
    Validates that the board belongs to the specified division.
    """
    success = await service.delete_board_for_division(principal, org_id, div_id, board_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return {"message": "Board deleted successfully"}


@router.get("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}/stats", response_model=BoardStats)
async def get_division_board_stats(
    org_id: str,
    div_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"board:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BoardStats:
    """
    Get comprehensive statistics for a board within a division.

    Requires division-level board:read permission.
    """
    stats = await service.get_board_stats(principal, org_id, board_id, div_id)
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return stats


# ==================== COLUMN MANAGEMENT ENDPOINTS ====================

@router.post("/organizations/{org_id}/boards/{board_id}/columns", response_model=ColumnResponse)
async def create_organization_column(
    org_id: str,
    board_id: str,
    column_request: ColumnCreate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"column:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> ColumnResponse:
    """
    Create a new column in an organization board.

    Requires organization-level column:create permission.
    """
    column = await service.create_column(principal, org_id, board_id, column_request)
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return ColumnResponse(
        column=column,
        success=True,
        message="Column created successfully"
    )


@router.put("/organizations/{org_id}/boards/{board_id}/columns/{column_id}", response_model=ColumnResponse)
async def update_organization_column(
    org_id: str,
    board_id: str,
    column_id: str,
    column_request: ColumnUpdate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"column:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> ColumnResponse:
    """
    Update a column in an organization board.

    Requires organization-level column:update permission.
    """
    column = await service.update_column(principal, org_id, column_id, column_request)
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found",
            code="column_not_found"
        )

    return ColumnResponse(
        column=column,
        success=True,
        message="Column updated successfully"
    )


@router.delete("/organizations/{org_id}/boards/{board_id}/columns/{column_id}")
async def delete_organization_column(
    org_id: str,
    board_id: str,
    column_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"column:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """
    Delete a column from an organization board.

    Requires organization-level column:delete permission.
    """
    success = await service.delete_column(principal, org_id, column_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found or cannot be deleted",
            code="column_not_found"
        )

    return {"message": "Column deleted successfully"}


@router.put("/organizations/{org_id}/boards/{board_id}/columns/reorder")
async def reorder_organization_columns(
    org_id: str,
    board_id: str,
    column_orders: List[tuple[str, int]],
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"column:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """
    Reorder columns in an organization board.

    Requires organization-level column:update permission.
    """
    success = await service.reorder_columns(principal, org_id, board_id, column_orders)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return {"message": "Columns reordered successfully"}


# Division column endpoints follow the same pattern...
@router.post("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}/columns", response_model=ColumnResponse)
async def create_division_column(
    org_id: str,
    div_id: str,
    board_id: str,
    column_request: ColumnCreate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"column:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> ColumnResponse:
    """Create a new column in a division board."""
    column = await service.create_column(principal, org_id, board_id, column_request, div_id)
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return ColumnResponse(
        column=column,
        success=True,
        message="Column created successfully"
    )


@router.put("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}/columns/{column_id}", response_model=ColumnResponse)
async def update_division_column(
    org_id: str,
    div_id: str,
    board_id: str,
    column_id: str,
    column_request: ColumnUpdate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"column:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> ColumnResponse:
    """Update a column in a division board."""
    column = await service.update_column(principal, org_id, column_id, column_request, div_id)
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found",
            code="column_not_found"
        )

    return ColumnResponse(
        column=column,
        success=True,
        message="Column updated successfully"
    )


@router.delete("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}/columns/{column_id}")
async def delete_division_column(
    org_id: str,
    div_id: str,
    board_id: str,
    column_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"column:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """Delete a column from a division board."""
    success = await service.delete_column(principal, org_id, column_id, div_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found or cannot be deleted",
            code="column_not_found"
        )

    return {"message": "Column deleted successfully"}


@router.put("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}/columns/reorder")
async def reorder_division_columns(
    org_id: str,
    div_id: str,
    board_id: str,
    column_orders: List[tuple[str, int]],
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"column:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """Reorder columns in a division board."""
    success = await service.reorder_columns(principal, org_id, board_id, column_orders, div_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
            code="board_not_found"
        )

    return {"message": "Columns reordered successfully"}


# ==================== TASK MANAGEMENT ENDPOINTS ====================

@router.post("/organizations/{org_id}/columns/{column_id}/tasks", response_model=TaskResponse)
async def create_organization_task(
    org_id: str,
    column_id: str,
    task_request: TaskCreate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """
    Create a new task in an organization column.

    Requires organization-level task:create permission.
    """
    try:
        task = await service.create_task(principal, org_id, column_id, task_request)
        return TaskResponse(
            task=task,
            success=True,
            message="Task created successfully"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            code="task_creation_failed"
        )


@router.get("/organizations/{org_id}/tasks/{task_id}", response_model=TaskResponse)
async def get_organization_task(
    org_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """
    Get a specific task within an organization.

    Requires organization-level task:read permission.
    """
    task = await service.get_task(principal, org_id, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return TaskResponse(task=task, success=True)


@router.put("/organizations/{org_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_organization_task(
    org_id: str,
    task_id: str,
    task_request: TaskUpdate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """
    Update a task within an organization.

    Requires organization-level task:update permission.
    """
    task = await service.update_task(principal, org_id, task_id, task_request)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return TaskResponse(
        task=task,
        success=True,
        message="Task updated successfully"
    )


@router.put("/organizations/{org_id}/tasks/{task_id}/move")
async def move_organization_task(
    org_id: str,
    task_id: str,
    move_request: TaskMove,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """
    Move a task to a different column within an organization.

    Requires organization-level task:update permission.
    """
    try:
        success = await service.move_task(principal, org_id, task_id, move_request)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
                code="task_not_found"
            )

        return {"message": "Task moved successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            code="task_move_failed"
        )


@router.put("/organizations/{org_id}/tasks/{task_id}/assign", response_model=TaskResponse)
async def assign_organization_task(
    org_id: str,
    task_id: str,
    assign_request: TaskAssign,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:assign"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """
    Assign or unassign a task within an organization.

    Requires organization-level task:assign permission.
    """
    task = await service.assign_task(principal, org_id, task_id, assign_request)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    action = "assigned" if assign_request.user_id else "unassigned"
    return TaskResponse(
        task=task,
        success=True,
        message=f"Task {action} successfully"
    )


@router.delete("/organizations/{org_id}/tasks/{task_id}")
async def delete_organization_task(
    org_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """
    Delete a task within an organization.

    Requires organization-level task:delete permission.
    """
    success = await service.delete_task(principal, org_id, task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return {"message": "Task deleted successfully"}


@router.get("/organizations/{org_id}/tasks/search", response_model=TaskListResponse)
async def search_organization_tasks(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    query: Optional[str] = Query(None, description="Search query"),
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    priority: Optional[TaskPriority] = Query(None, description="Filter by priority"),
    assigned_to: Optional[str] = Query(None, alias="assignedTo", description="Filter by assignee"),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page"),
    sort_by: str = Query(default="updated_at", alias="sortBy", description="Sort field"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$", alias="sortOrder", description="Sort order")
) -> TaskListResponse:
    """
    Search tasks within an organization with various filters.

    Requires organization-level task:read permission.
    """
    search_request = TaskSearchRequest(
        query=query,
        status=status,
        priority=priority,
        assigned_to=assigned_to,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )

    tasks, total = await service.search_tasks(principal, org_id, search_request)

    return TaskListResponse(
        tasks=tasks,
        total=total,
        page=page,
        per_page=per_page,
        has_next=page * per_page < total,
        has_previous=page > 1
    )


# Division task endpoints follow the same pattern...
@router.post("/organizations/{org_id}/divisions/{div_id}/columns/{column_id}/tasks", response_model=TaskResponse)
async def create_division_task(
    org_id: str,
    div_id: str,
    column_id: str,
    task_request: TaskCreate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """Create a new task in a division column."""
    try:
        task = await service.create_task(principal, org_id, column_id, task_request, div_id)
        return TaskResponse(
            task=task,
            success=True,
            message="Task created successfully"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            code="task_creation_failed"
        )


@router.get("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}", response_model=TaskResponse)
async def get_division_task(
    org_id: str,
    div_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """Get a specific task within a division."""
    task = await service.get_task(principal, org_id, task_id, div_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return TaskResponse(task=task, success=True)


@router.put("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_division_task(
    org_id: str,
    div_id: str,
    task_id: str,
    task_request: TaskUpdate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """Update a task within a division."""
    task = await service.update_task(principal, org_id, task_id, task_request, div_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return TaskResponse(
        task=task,
        success=True,
        message="Task updated successfully"
    )


@router.put("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}/move")
async def move_division_task(
    org_id: str,
    div_id: str,
    task_id: str,
    move_request: TaskMove,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """Move a task to a different column within a division."""
    try:
        success = await service.move_task(principal, org_id, task_id, move_request, div_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
                code="task_not_found"
            )

        return {"message": "Task moved successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            code="task_move_failed"
        )


@router.put("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}/assign", response_model=TaskResponse)
async def assign_division_task(
    org_id: str,
    div_id: str,
    task_id: str,
    assign_request: TaskAssign,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:assign"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> TaskResponse:
    """Assign or unassign a task within a division."""
    task = await service.assign_task(principal, org_id, task_id, assign_request, div_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    action = "assigned" if assign_request.user_id else "unassigned"
    return TaskResponse(
        task=task,
        success=True,
        message=f"Task {action} successfully"
    )


@router.delete("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}")
async def delete_division_task(
    org_id: str,
    div_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> dict:
    """Delete a task within a division."""
    success = await service.delete_task(principal, org_id, task_id, div_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return {"message": "Task deleted successfully"}


@router.get("/organizations/{org_id}/divisions/{div_id}/tasks/search", response_model=TaskListResponse)
async def search_division_tasks(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    query: Optional[str] = Query(None, description="Search query"),
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    priority: Optional[TaskPriority] = Query(None, description="Filter by priority"),
    assigned_to: Optional[str] = Query(None, alias="assignedTo", description="Filter by assignee"),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page"),
    sort_by: str = Query(default="updated_at", alias="sortBy", description="Sort field"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$", alias="sortOrder", description="Sort order")
) -> TaskListResponse:
    """Search tasks within a division with various filters."""
    search_request = TaskSearchRequest(
        query=query,
        status=status,
        priority=priority,
        assigned_to=assigned_to,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )

    tasks, total = await service.search_tasks(principal, org_id, search_request, div_id)

    return TaskListResponse(
        tasks=tasks,
        total=total,
        page=page,
        per_page=per_page,
        has_next=page * per_page < total,
        has_previous=page > 1
    )


# ==================== COMMENT ENDPOINTS ====================

@router.post("/organizations/{org_id}/tasks/{task_id}/comments", response_model=CommentResponse)
async def add_organization_task_comment(
    org_id: str,
    task_id: str,
    comment_request: CommentCreate,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"comment:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> CommentResponse:
    """
    Add a comment to a task within an organization.

    Requires organization-level comment:create permission.
    """
    comment = await service.add_comment(principal, org_id, task_id, comment_request)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return CommentResponse(
        comment=comment,
        success=True,
        message="Comment added successfully"
    )


@router.get("/organizations/{org_id}/tasks/{task_id}/comments", response_model=CommentListResponse)
async def get_organization_task_comments(
    org_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"comment:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> CommentListResponse:
    """
    Get comments for a task within an organization.

    Requires organization-level comment:read permission.
    """
    offset = (page - 1) * per_page
    comments = await service.get_comments_for_task(principal, org_id, task_id, per_page, offset)

    return CommentListResponse(
        comments=comments,
        total=len(comments),
        page=page,
        per_page=per_page,
        has_next=len(comments) == per_page,
        has_previous=page > 1
    )


# Division comment endpoints
@router.post("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}/comments", response_model=CommentResponse)
async def add_division_task_comment(
    org_id: str,
    div_id: str,
    task_id: str,
    comment_request: CommentCreate,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"comment:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> CommentResponse:
    """Add a comment to a task within a division."""
    comment = await service.add_comment(principal, org_id, task_id, comment_request, div_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
            code="task_not_found"
        )

    return CommentResponse(
        comment=comment,
        success=True,
        message="Comment added successfully"
    )


@router.get("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}/comments", response_model=CommentListResponse)
async def get_division_task_comments(
    org_id: str,
    div_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"comment:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> CommentListResponse:
    """Get comments for a task within a division."""
    offset = (page - 1) * per_page
    comments = await service.get_comments_for_task(principal, org_id, task_id, per_page, offset, div_id)

    return CommentListResponse(
        comments=comments,
        total=len(comments),
        page=page,
        per_page=per_page,
        has_next=len(comments) == per_page,
        has_previous=page > 1
    )


# ==================== ACTIVITY ENDPOINTS ====================

@router.get("/organizations/{org_id}/tasks/{task_id}/activities", response_model=ActivityResponse)
async def get_organization_task_activities(
    org_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"activity:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> ActivityResponse:
    """
    Get activity log for a task within an organization.

    Requires organization-level activity:read permission.
    """
    offset = (page - 1) * per_page
    activities = await service.get_task_activities(principal, org_id, task_id, per_page, offset)

    return ActivityResponse(
        activities=activities,
        total=len(activities),
        page=page,
        per_page=per_page,
        has_next=len(activities) == per_page
    )


@router.get("/organizations/{org_id}/boards/{board_id}/activities", response_model=ActivityResponse)
async def get_organization_board_activities(
    org_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"activity:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> ActivityResponse:
    """
    Get activity log for a board within an organization.

    Requires organization-level activity:read permission.
    """
    offset = (page - 1) * per_page
    activities = await service.get_board_activities(principal, org_id, board_id, per_page, offset)

    return ActivityResponse(
        activities=activities,
        total=len(activities),
        page=page,
        per_page=per_page,
        has_next=len(activities) == per_page
    )


# Division activity endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/tasks/{task_id}/activities", response_model=ActivityResponse)
async def get_division_task_activities(
    org_id: str,
    div_id: str,
    task_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"activity:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> ActivityResponse:
    """Get activity log for a task within a division."""
    offset = (page - 1) * per_page
    activities = await service.get_task_activities(principal, org_id, task_id, per_page, offset, div_id)

    return ActivityResponse(
        activities=activities,
        total=len(activities),
        page=page,
        per_page=per_page,
        has_next=len(activities) == per_page
    )


@router.get("/organizations/{org_id}/divisions/{div_id}/boards/{board_id}/activities", response_model=ActivityResponse)
async def get_division_board_activities(
    org_id: str,
    div_id: str,
    board_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"activity:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, alias="perPage", description="Items per page")
) -> ActivityResponse:
    """Get activity log for a board within a division."""
    offset = (page - 1) * per_page
    activities = await service.get_board_activities(principal, org_id, board_id, per_page, offset, div_id)

    return ActivityResponse(
        activities=activities,
        total=len(activities),
        page=page,
        per_page=per_page,
        has_next=len(activities) == per_page
    )


# ==================== BULK OPERATIONS ENDPOINTS ====================

@router.post("/organizations/{org_id}/tasks/bulk-move", response_model=BulkOperationResponse)
async def bulk_move_organization_tasks(
    org_id: str,
    bulk_request: BulkTaskMove,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BulkOperationResponse:
    """
    Move multiple tasks to a column within an organization.

    Requires organization-level task:update permission.
    """
    result = await service.bulk_move_tasks(principal, org_id, bulk_request)
    return result


@router.post("/organizations/{org_id}/tasks/bulk-assign", response_model=BulkOperationResponse)
async def bulk_assign_organization_tasks(
    org_id: str,
    bulk_request: BulkTaskAssign,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"task:assign"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BulkOperationResponse:
    """
    Assign or unassign multiple tasks within an organization.

    Requires organization-level task:assign permission.
    """
    result = await service.bulk_assign_tasks(principal, org_id, bulk_request)
    return result


# Division bulk operation endpoints
@router.post("/organizations/{org_id}/divisions/{div_id}/tasks/bulk-move", response_model=BulkOperationResponse)
async def bulk_move_division_tasks(
    org_id: str,
    div_id: str,
    bulk_request: BulkTaskMove,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BulkOperationResponse:
    """Move multiple tasks to a column within a division."""
    result = await service.bulk_move_tasks(principal, org_id, bulk_request, div_id)
    return result


@router.post("/organizations/{org_id}/divisions/{div_id}/tasks/bulk-assign", response_model=BulkOperationResponse)
async def bulk_assign_division_tasks(
    org_id: str,
    div_id: str,
    bulk_request: BulkTaskAssign,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"task:assign"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: TasksService = Depends(get_tasks_service)
) -> BulkOperationResponse:
    """Assign or unassign multiple tasks within a division."""
    result = await service.bulk_assign_tasks(principal, org_id, bulk_request, div_id)
    return result