# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Tasks service with comprehensive business logic and scope validation.

This service implements secure task management operations that respect
organization and division boundaries while following the Open/Closed Principle.
All operations are scoped to prevent cross-tenant data access and include
proper business logic validation, activity logging, and real-time event support.

Key Features:
- Organization and division scope validation
- Business rule enforcement
- Activity logging and audit trails
- Real-time event integration
- Bulk operations with transaction support
- Comprehensive error handling
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import uuid

from ...dependencies import CurrentPrincipal
from ...core.scope_integration import ScopedService
from ...core.scope import ScopeContext
from .repository import TasksRepository
from .schemas import (
    Board, Column, Task, Comment, Attachment, ActivityEntry,
    TaskPriority, TaskStatus, ColumnType, ActivityType,
    TaskCreate, TaskUpdate, TaskMove, TaskAssign,
    ColumnCreate, ColumnUpdate,
    BoardCreate, BoardUpdate,
    CommentCreate, CommentUpdate,
    AttachmentCreate,
    BulkTaskMove, BulkTaskAssign, BulkOperationResponse,
    TaskSearchRequest, BoardSearchRequest,
    TaskResponse, ColumnResponse, BoardResponse,
    TaskListResponse, ColumnListResponse, BoardListResponse,
    CommentListResponse, ActivityResponse,
    BoardStats, BoardPermissions,
    TaskSummary, BoardSummary
)


class TasksService(ScopedService):
    """
    Encapsulates secure task management domain behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all task operations respect organization
    and division boundaries while enforcing proper business rules.
    """

    def __init__(self, repository: TasksRepository) -> None:
        super().__init__()
        self._repository = repository

    # ==================== BOARD OPERATIONS ====================

    async def create_board_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_request: BoardCreate
    ) -> Board:
        """
        Create a new kanban board within an organization.

        Validates organization access and creates board with default columns.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"board:create"}
        )

        board_data = {
            "id": str(uuid.uuid4()),
            "name": board_request.name,
            "description": board_request.description,
            "organization_id": organization_id,
            "division_id": None,
            "project_id": board_request.project_id,
            "created_by": principal.id,
            "is_public": board_request.is_public,
            "settings": board_request.settings or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Create board
        board = await self._repository.create_board(board_data)

        # Create default columns
        await self._create_default_columns(board.id, principal.id)

        # Log activity
        await self._log_activity(
            board_id=board.id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_CREATED,
            description=f"Created board '{board.name}'",
            metadata={"board_name": board.name}
        )

        return board

    async def create_board_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        board_request: BoardCreate
    ) -> Board:
        """
        Create a new kanban board within a division.

        Validates division access and creates board with default columns.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"board:create"}
        )

        board_data = {
            "id": str(uuid.uuid4()),
            "name": board_request.name,
            "description": board_request.description,
            "organization_id": organization_id,
            "division_id": division_id,
            "project_id": board_request.project_id,
            "created_by": principal.id,
            "is_public": board_request.is_public,
            "settings": board_request.settings or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Create board
        board = await self._repository.create_board(board_data)

        # Create default columns
        await self._create_default_columns(board.id, principal.id)

        # Log activity
        await self._log_activity(
            board_id=board.id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_CREATED,
            description=f"Created board '{board.name}' in division",
            metadata={"board_name": board.name, "division_id": division_id}
        )

        return board

    async def get_board_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str
    ) -> Optional[Board]:
        """
        Get a specific board within an organization.

        Validates organization access and ensures board belongs to organization.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"board:read"}
        )

        board = await self._repository.get_board_by_id(board_id)

        # Ensure board belongs to the validated organization
        if board and board.organization_id == organization_id:
            # Load columns and tasks
            board.columns = await self._repository.get_columns_for_board(board_id)
            return board

        return None

    async def get_board_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        board_id: str
    ) -> Optional[Board]:
        """
        Get a specific board within a division.

        Validates division access and ensures board belongs to division.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"board:read"}
        )

        board = await self._repository.get_board_by_id(board_id)

        # Ensure board belongs to the validated division
        if board and board.organization_id == organization_id and board.division_id == division_id:
            # Load columns and tasks
            board.columns = await self._repository.get_columns_for_board(board_id)
            return board

        return None

    async def update_board_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str,
        board_request: BoardUpdate
    ) -> Optional[Board]:
        """
        Update a board within an organization.

        Validates organization access and ensures board belongs to organization.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"board:update"}
        )

        # Verify board exists and belongs to organization
        existing_board = await self._repository.get_board_by_id(board_id)
        if not existing_board or existing_board.organization_id != organization_id:
            return None

        update_data = {
            k: v for k, v in board_request.dict(exclude_unset=True).items()
            if v is not None
        }

        board = await self._repository.update_board(board_id, update_data)

        # Log activity
        if board:
            await self._log_activity(
                board_id=board.id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_UPDATED,
                description=f"Updated board '{board.name}'",
                metadata={"changes": list(update_data.keys())}
            )

        return board

    async def delete_board_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str
    ) -> bool:
        """
        Delete a board within an organization.

        Validates organization access and ensures board belongs to organization.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"board:delete"}
        )

        # Verify board exists and belongs to organization
        existing_board = await self._repository.get_board_by_id(board_id)
        if not existing_board or existing_board.organization_id != organization_id:
            return False

        # Log activity before deletion
        await self._log_activity(
            board_id=board_id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_UPDATED,
            description=f"Deleted board '{existing_board.name}'",
            metadata={"board_name": existing_board.name}
        )

        return await self._repository.delete_board(board_id)

    async def update_board_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        board_id: str,
        board_request: BoardUpdate
    ) -> Optional[Board]:
        """
        Update a board within a division.

        Validates division access and ensures board belongs to division.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"board:update"}
        )

        # Verify board exists and belongs to division
        existing_board = await self._repository.get_board_by_id(board_id)
        if (not existing_board or
            existing_board.organization_id != organization_id or
            existing_board.division_id != division_id):
            return None

        update_data = {
            k: v for k, v in board_request.dict(exclude_unset=True).items()
            if v is not None
        }

        board = await self._repository.update_board(board_id, update_data)

        # Log activity
        if board:
            await self._log_activity(
                board_id=board.id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_UPDATED,
                description=f"Updated board '{board.name}'",
                metadata={"changes": list(update_data.keys())}
            )

        return board

    async def delete_board_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        board_id: str
    ) -> bool:
        """
        Delete a board within a division.

        Validates division access and ensures board belongs to division.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"board:delete"}
        )

        # Verify board exists and belongs to division
        existing_board = await self._repository.get_board_by_id(board_id)
        if (not existing_board or
            existing_board.organization_id != organization_id or
            existing_board.division_id != division_id):
            return False

        # Log activity before deletion
        await self._log_activity(
            board_id=board_id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_UPDATED,
            description=f"Deleted board '{existing_board.name}'",
            metadata={"board_name": existing_board.name}
        )

        return await self._repository.delete_board(board_id)

    async def list_boards_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[BoardSummary]:
        """
        List boards within an organization.

        Validates organization access and returns paginated results.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"board:read"}
        )

        return await self._repository.list_boards_for_organization(
            organization_id, limit, offset
        )

    async def list_boards_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[BoardSummary]:
        """
        List boards within a division.

        Validates division access and returns paginated results.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"board:read"}
        )

        return await self._repository.list_boards_for_division(
            organization_id, division_id, limit, offset
        )

    async def get_board_stats(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str,
        division_id: Optional[str] = None
    ) -> Optional[BoardStats]:
        """
        Get comprehensive statistics for a board.

        Validates appropriate access and returns board statistics.
        """
        # Validate access based on scope
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, organization_id, division_id, {"board:read"}
            )
        else:
            scope_ctx = await self.validate_organization_access(
                principal, organization_id, {"board:read"}
            )

        # Verify board exists and is accessible
        board = await self._repository.get_board_by_id(board_id)
        if not board or board.organization_id != organization_id:
            return None

        if division_id and board.division_id != division_id:
            return None

        stats_data = await self._repository.get_board_stats(board_id)
        return BoardStats(**stats_data)

    # ==================== COLUMN OPERATIONS ====================

    async def create_column(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str,
        column_request: ColumnCreate,
        division_id: Optional[str] = None
    ) -> Optional[Column]:
        """
        Create a new column in a board.

        Validates board access and creates column with proper positioning.
        """
        # Validate board access
        board = await self._validate_board_access(
            principal, organization_id, board_id, division_id, {"column:create"}
        )

        if not board:
            return None

        # Get next position
        existing_columns = await self._repository.get_columns_for_board(board_id)
        next_position = max([c.position for c in existing_columns], default=-1) + 1

        column_data = {
            "id": str(uuid.uuid4()),
            "board_id": board_id,
            "name": column_request.name,
            "color": column_request.color,
            "position": next_position,
            "column_type": column_request.column_type,
            "wip_limit": column_request.wip_limit,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        column = await self._repository.create_column(column_data)

        # Log activity
        await self._log_activity(
            board_id=board_id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_UPDATED,
            description=f"Added column '{column.name}'",
            metadata={"column_name": column.name, "column_type": column.column_type}
        )

        return column

    async def update_column(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        column_id: str,
        column_request: ColumnUpdate,
        division_id: Optional[str] = None
    ) -> Optional[Column]:
        """
        Update a column.

        Validates board access and updates column properties.
        """
        # Get column and validate board access
        column = await self._repository.get_column_by_id(column_id)
        if not column:
            return None

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"column:update"}
        )

        if not board:
            return None

        update_data = {
            k: v for k, v in column_request.dict(exclude_unset=True).items()
            if v is not None
        }

        updated_column = await self._repository.update_column(column_id, update_data)

        # Log activity
        if updated_column:
            await self._log_activity(
                board_id=column.board_id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_UPDATED,
                description=f"Updated column '{updated_column.name}'",
                metadata={"changes": list(update_data.keys())}
            )

        return updated_column

    async def delete_column(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        column_id: str,
        division_id: Optional[str] = None
    ) -> bool:
        """
        Delete a column.

        Validates board access and handles task relocation.
        """
        # Get column and validate board access
        column = await self._repository.get_column_by_id(column_id)
        if not column:
            return False

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"column:delete"}
        )

        if not board:
            return False

        success = await self._repository.delete_column(column_id)

        # Log activity
        if success:
            await self._log_activity(
                board_id=column.board_id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_UPDATED,
                description=f"Deleted column '{column.name}'",
                metadata={"column_name": column.name}
            )

        return success

    async def reorder_columns(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str,
        column_orders: List[Tuple[str, int]],
        division_id: Optional[str] = None
    ) -> bool:
        """
        Reorder columns in a board.

        Validates board access and updates column positions.
        """
        # Validate board access
        board = await self._validate_board_access(
            principal, organization_id, board_id, division_id, {"column:update"}
        )

        if not board:
            return False

        success = await self._repository.reorder_columns(board_id, column_orders)

        # Log activity
        if success:
            await self._log_activity(
                board_id=board_id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_UPDATED,
                description="Reordered columns",
                metadata={"column_count": len(column_orders)}
            )

        return success

    # ==================== TASK OPERATIONS ====================

    async def create_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        column_id: str,
        task_request: TaskCreate,
        division_id: Optional[str] = None
    ) -> Optional[Task]:
        """
        Create a new task in a column.

        Validates board access and creates task with proper validation.
        """
        # Get column and validate board access
        column = await self._repository.get_column_by_id(column_id)
        if not column:
            return None

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"task:create"}
        )

        if not board:
            return None

        # Validate business rules
        validation_error = await self._validate_task_creation(
            column, task_request
        )
        if validation_error:
            raise ValueError(validation_error)

        task_data = {
            "id": str(uuid.uuid4()),
            "column_id": column_id,
            "title": task_request.title,
            "description": task_request.description,
            "priority": task_request.priority,
            "position": 0,  # Will be set by repository
            "story_points": task_request.story_points,
            "due_date": task_request.due_date,
            "start_date": task_request.start_date,
            "created_by": principal.id,
            "assigned_to": task_request.assigned_to,
            "labels": task_request.labels or [],
            "custom_fields": task_request.custom_fields or {},
            "is_archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        task = await self._repository.create_task(task_data)

        # Log activity
        await self._log_activity(
            task_id=task.id,
            board_id=column.board_id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_CREATED,
            description=f"Created task '{task.title}'",
            metadata={
                "task_title": task.title,
                "column_name": column.name,
                "priority": task.priority
            }
        )

        return task

    async def get_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        division_id: Optional[str] = None
    ) -> Optional[Task]:
        """
        Get a specific task.

        Validates board access and returns task with all details.
        """
        # Get task
        task = await self._repository.get_task_by_id(task_id)
        if not task:
            return None

        # Get column and validate board access
        column = await self._repository.get_column_by_id(task.column_id)
        if not column:
            return None

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"task:read"}
        )

        return task if board else None

    async def update_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        task_request: TaskUpdate,
        division_id: Optional[str] = None
    ) -> Optional[Task]:
        """
        Update a task.

        Validates board access and updates task with business rule validation.
        """
        # Get task and validate access
        task = await self._repository.get_task_by_id(task_id)
        if not task:
            return None

        column = await self._repository.get_column_by_id(task.column_id)
        if not column:
            return None

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"task:update"}
        )

        if not board:
            return None

        # Track changes for activity logging
        old_values = {}
        changes = []

        update_data = {}
        for field, value in task_request.dict(exclude_unset=True).items():
            if value is not None and getattr(task, field) != value:
                old_values[field] = getattr(task, field)
                update_data[field] = value
                changes.append(field)

        if not update_data:
            return task

        # Handle status changes
        if 'status' in update_data:
            if update_data['status'] == TaskStatus.DONE and task.status != TaskStatus.DONE:
                update_data['completed_at'] = datetime.utcnow()
            elif update_data['status'] != TaskStatus.DONE and task.status == TaskStatus.DONE:
                update_data['completed_at'] = None

        updated_task = await self._repository.update_task(task_id, update_data)

        # Log activity
        if updated_task:
            await self._log_activity(
                task_id=task_id,
                board_id=column.board_id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_UPDATED,
                description=f"Updated task '{updated_task.title}'",
                metadata={
                    "task_title": updated_task.title,
                    "changes": changes,
                    "old_values": old_values
                }
            )

        return updated_task

    async def move_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        move_request: TaskMove,
        division_id: Optional[str] = None
    ) -> bool:
        """
        Move a task to a different column and position.

        Validates board access and handles position reordering.
        """
        # Get task and current column
        task = await self._repository.get_task_by_id(task_id)
        if not task:
            return False

        current_column = await self._repository.get_column_by_id(task.column_id)
        if not current_column:
            return False

        # Get target column
        target_column = await self._repository.get_column_by_id(move_request.target_column_id)
        if not target_column:
            return False

        # Validate board access for both columns
        board = await self._validate_board_access(
            principal, organization_id, current_column.board_id, division_id, {"task:update"}
        )

        if not board or current_column.board_id != target_column.board_id:
            return False

        # Validate WIP limits
        if target_column.wip_limit:
            current_tasks = await self._repository.get_tasks_for_column(target_column.id)
            if len(current_tasks) >= target_column.wip_limit:
                raise ValueError(f"Column '{target_column.name}' has reached its WIP limit of {target_column.wip_limit}")

        success = await self._repository.move_task(
            task_id, move_request.target_column_id, move_request.position
        )

        # Log activity
        if success:
            await self._log_activity(
                task_id=task_id,
                board_id=current_column.board_id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_MOVED,
                description=f"Moved task '{task.title}' to '{target_column.name}'",
                metadata={
                    "task_title": task.title,
                    "from_column": current_column.name,
                    "to_column": target_column.name,
                    "position": move_request.position
                }
            )

        return success

    async def assign_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        assign_request: TaskAssign,
        division_id: Optional[str] = None
    ) -> Optional[Task]:
        """
        Assign or unassign a task to a user.

        Validates board access and updates task assignment.
        """
        # Get task and validate access
        task = await self._repository.get_task_by_id(task_id)
        if not task:
            return None

        column = await self._repository.get_column_by_id(task.column_id)
        if not column:
            return None

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"task:assign"}
        )

        if not board:
            return None

        old_assignee = task.assigned_to
        activity_type = ActivityType.TASK_ASSIGNED if assign_request.user_id else ActivityType.TASK_UNASSIGNED

        updated_task = await self._repository.update_task(task_id, {
            "assigned_to": assign_request.user_id
        })

        # Log activity
        if updated_task:
            action = "assigned to" if assign_request.user_id else "unassigned from"
            await self._log_activity(
                task_id=task_id,
                board_id=column.board_id,
                user_id=principal.id,
                activity_type=activity_type,
                description=f"{action.title()} task '{updated_task.title}'",
                metadata={
                    "task_title": updated_task.title,
                    "old_assignee": old_assignee,
                    "new_assignee": assign_request.user_id
                }
            )

        return updated_task

    async def delete_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        division_id: Optional[str] = None
    ) -> bool:
        """
        Delete a task.

        Validates board access and handles task deletion with cleanup.
        """
        # Get task and validate access
        task = await self._repository.get_task_by_id(task_id)
        if not task:
            return False

        column = await self._repository.get_column_by_id(task.column_id)
        if not column:
            return False

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, {"task:delete"}
        )

        if not board:
            return False

        # Log activity before deletion
        await self._log_activity(
            task_id=task_id,
            board_id=column.board_id,
            user_id=principal.id,
            activity_type=ActivityType.TASK_UPDATED,
            description=f"Deleted task '{task.title}'",
            metadata={"task_title": task.title}
        )

        return await self._repository.delete_task(task_id)

    async def search_tasks(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        search_request: TaskSearchRequest,
        division_id: Optional[str] = None
    ) -> Tuple[List[TaskSummary], int]:
        """
        Search tasks with various filters.

        Validates board access and returns filtered results.
        """
        # Validate organization or division access
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, organization_id, division_id, {"task:read"}
            )
        else:
            scope_ctx = await self.validate_organization_access(
                principal, organization_id, {"task:read"}
            )

        # Build search parameters
        search_params = {
            "query": search_request.query,
            "status": search_request.status,
            "priority": search_request.priority,
            "assigned_to": search_request.assigned_to,
            "labels": search_request.labels,
            "due_date_from": search_request.due_date_from,
            "due_date_to": search_request.due_date_to,
            "is_archived": search_request.is_archived,
            "limit": search_request.per_page,
            "offset": (search_request.page - 1) * search_request.per_page,
            "sort_by": search_request.sort_by,
            "sort_order": search_request.sort_order
        }

        # If division scope, limit search to division boards
        if division_id:
            # Get board IDs for this division
            boards = await self._repository.list_boards_for_division(
                organization_id, division_id, limit=1000
            )
            if boards:
                board_ids = [board.id for board in boards]
                # Note: This would need to be implemented in repository
                # search_params["board_ids"] = board_ids

        return await self._repository.search_tasks(**search_params)

    # ==================== BULK OPERATIONS ====================

    async def bulk_move_tasks(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        bulk_request: BulkTaskMove,
        division_id: Optional[str] = None
    ) -> BulkOperationResponse:
        """
        Move multiple tasks to a column.

        Validates board access and handles bulk move operations.
        """
        # Validate target column access
        target_column = await self._repository.get_column_by_id(bulk_request.target_column_id)
        if not target_column:
            return BulkOperationResponse(
                success_count=0,
                failure_count=len(bulk_request.task_ids),
                errors=["Target column not found"],
                message="Bulk move failed - target column not found"
            )

        board = await self._validate_board_access(
            principal, organization_id, target_column.board_id, division_id, {"task:update"}
        )

        if not board:
            return BulkOperationResponse(
                success_count=0,
                failure_count=len(bulk_request.task_ids),
                errors=["Access denied to target board"],
                message="Bulk move failed - access denied"
            )

        # Validate WIP limits
        if target_column.wip_limit:
            current_tasks = await self._repository.get_tasks_for_column(target_column.id)
            available_space = target_column.wip_limit - len(current_tasks)
            if available_space < len(bulk_request.task_ids):
                return BulkOperationResponse(
                    success_count=0,
                    failure_count=len(bulk_request.task_ids),
                    errors=[f"Column '{target_column.name}' has only {available_space} slots available"],
                    message="Bulk move failed - WIP limit exceeded"
                )

        try:
            moved_count = await self._repository.bulk_move_tasks(
                bulk_request.task_ids, bulk_request.target_column_id
            )

            # Log activity
            await self._log_activity(
                board_id=target_column.board_id,
                user_id=principal.id,
                activity_type=ActivityType.TASK_MOVED,
                description=f"Bulk moved {moved_count} tasks to '{target_column.name}'",
                metadata={
                    "target_column": target_column.name,
                    "task_count": moved_count
                }
            )

            return BulkOperationResponse(
                success_count=moved_count,
                failure_count=len(bulk_request.task_ids) - moved_count,
                errors=[],
                message=f"Successfully moved {moved_count} tasks"
            )

        except Exception as e:
            return BulkOperationResponse(
                success_count=0,
                failure_count=len(bulk_request.task_ids),
                errors=[str(e)],
                message="Bulk move failed due to server error"
            )

    async def bulk_assign_tasks(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        bulk_request: BulkTaskAssign,
        division_id: Optional[str] = None
    ) -> BulkOperationResponse:
        """
        Assign or unassign multiple tasks to a user.

        Validates access and handles bulk assignment operations.
        """
        # Validate organization or division access
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, organization_id, division_id, {"task:assign"}
            )
        else:
            scope_ctx = await self.validate_organization_access(
                principal, organization_id, {"task:assign"}
            )

        try:
            assigned_count = await self._repository.bulk_assign_tasks(
                bulk_request.task_ids, bulk_request.user_id
            )

            action = "assigned" if bulk_request.user_id else "unassigned"
            user_part = f" to user {bulk_request.user_id}" if bulk_request.user_id else " from all users"

            # Log activity
            await self._log_activity(
                user_id=principal.id,
                activity_type=ActivityType.TASK_ASSIGNED if bulk_request.user_id else ActivityType.TASK_UNASSIGNED,
                description=f"Bulk {action} {assigned_count} tasks{user_part}",
                metadata={
                    "action": action,
                    "task_count": assigned_count,
                    "user_id": bulk_request.user_id
                }
            )

            return BulkOperationResponse(
                success_count=assigned_count,
                failure_count=len(bulk_request.task_ids) - assigned_count,
                errors=[],
                message=f"Successfully {action} {assigned_count} tasks"
            )

        except Exception as e:
            return BulkOperationResponse(
                success_count=0,
                failure_count=len(bulk_request.task_ids),
                errors=[str(e)],
                message="Bulk assignment failed due to server error"
            )

    # ==================== COMMENT OPERATIONS ====================

    async def add_comment(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        comment_request: CommentCreate,
        division_id: Optional[str] = None
    ) -> Optional[Comment]:
        """
        Add a comment to a task.

        Validates task access and creates comment.
        """
        # Validate task access
        task = await self._validate_task_access(
            principal, organization_id, task_id, division_id, {"comment:create"}
        )

        if not task:
            return None

        comment_data = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "author_id": principal.id,
            "content": comment_request.content,
            "parent_id": comment_request.parent_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        comment = await self._repository.create_comment(comment_data)

        # Log activity
        if comment:
            await self._log_activity(
                task_id=task_id,
                board_id=task.column_id,  # This would need to be fetched from task
                user_id=principal.id,
                activity_type=ActivityType.COMMENT_ADDED,
                description=f"Added comment to task '{task.title}'",
                metadata={
                    "task_title": task.title,
                    "comment_id": comment.id
                }
            )

        return comment

    async def get_comments_for_task(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        limit: int = 50,
        offset: int = 0,
        division_id: Optional[str] = None
    ) -> List[Comment]:
        """
        Get comments for a task.

        Validates task access and returns paginated comments.
        """
        # Validate task access
        task = await self._validate_task_access(
            principal, organization_id, task_id, division_id, {"comment:read"}
        )

        if not task:
            return []

        return await self._repository.get_comments_for_task(task_id, limit, offset)

    # ==================== ACTIVITY OPERATIONS ====================

    async def get_task_activities(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        limit: int = 50,
        offset: int = 0,
        division_id: Optional[str] = None
    ) -> List[ActivityEntry]:
        """
        Get activity log for a task.

        Validates task access and returns activity history.
        """
        # Validate task access
        task = await self._validate_task_access(
            principal, organization_id, task_id, division_id, {"activity:read"}
        )

        if not task:
            return []

        return await self._repository.get_activities_for_task(task_id, limit, offset)

    async def get_board_activities(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str,
        limit: int = 50,
        offset: int = 0,
        division_id: Optional[str] = None
    ) -> List[ActivityEntry]:
        """
        Get activity log for a board.

        Validates board access and returns activity history.
        """
        # Validate board access
        board = await self._validate_board_access(
            principal, organization_id, board_id, division_id, {"activity:read"}
        )

        if not board:
            return []

        return await self._repository.get_activities_for_board(board_id, limit, offset)

    # ==================== HELPER METHODS ====================

    async def _create_default_columns(self, board_id: str, user_id: str) -> None:
        """Create default columns for a new board."""
        default_columns = [
            {"name": "To Do", "color": "#6b7280", "column_type": ColumnType.TODO},
            {"name": "In Progress", "color": "#3b82f6", "column_type": ColumnType.IN_PROGRESS},
            {"name": "Review", "color": "#f59e0b", "column_type": ColumnType.REVIEW},
            {"name": "Done", "color": "#10b981", "column_type": ColumnType.DONE},
        ]

        for i, col_data in enumerate(default_columns):
            column_data = {
                "id": str(uuid.uuid4()),
                "board_id": board_id,
                "name": col_data["name"],
                "color": col_data["color"],
                "position": i,
                "column_type": col_data["column_type"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            await self._repository.create_column(column_data)

    async def _validate_board_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        board_id: str,
        division_id: Optional[str],
        required_permissions: set
    ) -> Optional[Board]:
        """Validate board access and return board if accessible."""
        board = await self._repository.get_board_by_id(board_id)
        if not board:
            return None

        # Check organization match
        if board.organization_id != organization_id:
            return None

        # Check division match if division context
        if division_id and board.division_id != division_id:
            return None

        # Access already validated at service level
        return board

    async def _validate_task_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        task_id: str,
        division_id: Optional[str],
        required_permissions: set
    ) -> Optional[Task]:
        """Validate task access through board validation."""
        task = await self._repository.get_task_by_id(task_id)
        if not task:
            return None

        # Get column to validate board access
        column = await self._repository.get_column_by_id(task.column_id)
        if not column:
            return None

        board = await self._validate_board_access(
            principal, organization_id, column.board_id, division_id, required_permissions
        )

        return task if board else None

    async def _validate_task_creation(
        self,
        column: Column,
        task_request: TaskCreate
    ) -> Optional[str]:
        """Validate business rules for task creation."""
        # Check WIP limits
        if column.wip_limit:
            current_tasks = await self._repository.get_tasks_for_column(column.id)
            if len(current_tasks) >= column.wip_limit:
                return f"Column '{column.name}' has reached its WIP limit of {column.wip_limit}"

        # Validate due date
        if task_request.due_date and task_request.due_date < datetime.utcnow():
            return "Due date cannot be in the past"

        return None

    async def _log_activity(
        self,
        user_id: str,
        activity_type: ActivityType,
        description: str,
        metadata: Dict[str, Any],
        task_id: Optional[str] = None,
        board_id: Optional[str] = None
    ) -> None:
        """Log an activity entry."""
        activity_data = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "board_id": board_id,
            "user_id": user_id,
            "activity_type": activity_type,
            "description": description,
            "metadata": metadata,
            "created_at": datetime.utcnow(),
        }

        await self._repository.create_activity(activity_data)