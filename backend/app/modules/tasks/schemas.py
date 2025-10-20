# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Pydantic v2 schemas for kanban board task management.

This module defines comprehensive data models for task management operations with
proper validation, serialization, and security considerations following the
existing project patterns and implementing all features from the kanban plan.

Models include:
- Kanban boards, columns, and cards (tasks)
- Task relationships and dependencies
- Comments and activity logging
- File attachments and labels
- User assignments and permissions
"""

from datetime import datetime
from typing import Optional, Any, Dict, List
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskPriority(str, Enum):
    """Task priority enumeration for consistent priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    """Task status enumeration for workflow tracking."""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"
    ARCHIVED = "archived"


class ColumnType(str, Enum):
    """Column type enumeration for special column behaviors."""
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    CUSTOM = "custom"


class ActivityType(str, Enum):
    """Activity type enumeration for audit logging."""
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_MOVED = "task_moved"
    TASK_ASSIGNED = "task_assigned"
    TASK_UNASSIGNED = "task_unassigned"
    COMMENT_ADDED = "comment_added"
    COMMENT_UPDATED = "comment_updated"
    COMMENT_DELETED = "comment_deleted"
    ATTACHMENT_ADDED = "attachment_added"
    ATTACHMENT_REMOVED = "attachment_removed"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"


# Base Models
class BaseModelWithTimestamps(BaseModel):
    """Base model with timestamp fields for all entities."""
    model_config = ConfigDict(populate_by_name=True)

    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt", description="Last update timestamp")


class BaseModelWithId(BaseModelWithTimestamps):
    """Base model with ID field for all entities."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Unique identifier")


# User Models
class UserSummary(BaseModel):
    """Lightweight user information for assignments and references."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="User identifier")
    name: str = Field(..., description="User display name")
    email: str = Field(..., description="User email address")
    avatar_url: Optional[str] = Field(None, alias="avatarUrl", description="Profile avatar URL")


# Label Models
class TaskLabel(BaseModel):
    """Task label for categorization and filtering."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Label identifier")
    name: str = Field(..., min_length=1, max_length=50, description="Label name")
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    description: Optional[str] = Field(None, max_length=200, description="Label description")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Label name cannot be empty')
        return v.strip()


# Comment Models
class CommentCreate(BaseModel):
    """Request model for creating comments."""
    content: str = Field(..., min_length=1, max_length=2000, description="Comment content")
    parent_id: Optional[str] = Field(None, alias="parentId", description="Parent comment ID for replies")

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Comment content cannot be empty')
        return v.strip()


class CommentUpdate(BaseModel):
    """Request model for updating comments."""
    content: str = Field(..., min_length=1, max_length=2000, description="Updated comment content")

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Comment content cannot be empty')
        return v.strip()


class Comment(BaseModelWithId):
    """Comment model with complete information."""
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(..., alias="taskId", description="Associated task ID")
    author_id: str = Field(..., alias="authorId", description="Comment author ID")
    content: str = Field(..., description="Comment content")
    parent_id: Optional[str] = Field(None, alias="parentId", description="Parent comment ID for replies")
    edited: bool = Field(default=False, description="Whether comment has been edited")
    edited_at: Optional[datetime] = Field(None, alias="editedAt", description="Last edit timestamp")

    # Nested relationships
    author: Optional[UserSummary] = Field(None, description="Comment author information")
    replies: Optional[List["Comment"]] = Field(default_factory=list, description="Reply comments")

    # Resolve forward reference
    model_config["arbitrary_types_allowed"] = True


# Attachment Models
class AttachmentCreate(BaseModel):
    """Request model for uploading attachments."""
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    content_type: str = Field(..., alias="contentType", description="File MIME type")
    size_bytes: int = Field(..., ge=1, le=100_000_000, alias="sizeBytes", description="File size in bytes")
    description: Optional[str] = Field(None, max_length=500, description="Attachment description")


class Attachment(BaseModelWithId):
    """Attachment model with complete information."""
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(..., alias="taskId", description="Associated task ID")
    uploaded_by: str = Field(..., alias="uploadedBy", description="Uploader user ID")
    filename: str = Field(..., description="Original filename")
    storage_path: str = Field(..., alias="storagePath", description="Storage location path")
    content_type: str = Field(..., alias="contentType", description="File MIME type")
    size_bytes: int = Field(..., alias="sizeBytes", description="File size in bytes")
    description: Optional[str] = Field(None, description="Attachment description")

    # Nested relationships
    uploader: Optional[UserSummary] = Field(None, description="Uploader information")


# Activity Models
class ActivityEntry(BaseModelWithId):
    """Activity log entry for audit and timeline tracking."""
    model_config = ConfigDict(populate_by_name=True)

    task_id: Optional[str] = Field(None, alias="taskId", description="Associated task ID")
    board_id: Optional[str] = Field(None, alias="boardId", description="Associated board ID")
    user_id: str = Field(..., alias="userId", description="User who performed the action")
    activity_type: ActivityType = Field(..., alias="activityType", description="Type of activity")
    description: str = Field(..., description="Human-readable activity description")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional activity data")

    # Nested relationships
    user: Optional[UserSummary] = Field(None, description="User information")


# Column Models
class ColumnCreate(BaseModel):
    """Request model for creating kanban columns."""
    name: str = Field(..., min_length=1, max_length=100, description="Column name")
    color: str = Field(default="#3b82f6", pattern=r"^#[0-9A-Fa-f]{6}$", description="Column color")
    column_type: ColumnType = Field(default=ColumnType.CUSTOM, alias="columnType", description="Column type")
    wip_limit: Optional[int] = Field(None, ge=1, le=100, alias="wipLimit", description="Work in progress limit")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Column name cannot be empty')
        return v.strip()


class ColumnUpdate(BaseModel):
    """Request model for updating kanban columns."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated column name")
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$", description="Updated column color")
    wip_limit: Optional[int] = Field(None, ge=1, le=100, alias="wipLimit", description="Updated WIP limit")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Column name cannot be empty')
        return v.strip() if v else v


class Column(BaseModelWithId):
    """Kanban column model with complete information."""
    model_config = ConfigDict(populate_by_name=True)

    board_id: str = Field(..., alias="boardId", description="Associated board ID")
    name: str = Field(..., description="Column name")
    color: str = Field(..., description="Column color")
    position: int = Field(..., ge=0, description="Column position order")
    column_type: ColumnType = Field(..., alias="columnType", description="Column type")
    wip_limit: Optional[int] = Field(None, alias="wipLimit", description="Work in progress limit")

    # Computed fields
    task_count: int = Field(default=0, description="Number of tasks in column")
    is_over_limit: bool = Field(default=False, description="Whether column exceeds WIP limit")


# Task Models
class TaskCreate(BaseModel):
    """Request model for creating new tasks."""
    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, max_length=2000, description="Task description")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    story_points: Optional[int] = Field(None, ge=0, le=100, alias="storyPoints", description="Story points estimate")
    due_date: Optional[datetime] = Field(None, alias="dueDate", description="Task due date")
    start_date: Optional[datetime] = Field(None, alias="startDate", description="Task start date")
    labels: List[str] = Field(default_factory=list, description="Task label IDs")
    assigned_to: Optional[str] = Field(None, alias="assignedTo", description="Assigned user ID")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, alias="customFields", description="Custom field values")

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Task title cannot be empty')
        return v.strip()


class TaskUpdate(BaseModel):
    """Request model for updating existing tasks."""
    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated task title")
    description: Optional[str] = Field(None, max_length=2000, description="Updated task description")
    priority: Optional[TaskPriority] = Field(None, description="Updated task priority")
    story_points: Optional[int] = Field(None, ge=0, le=100, alias="storyPoints", description="Updated story points")
    due_date: Optional[datetime] = Field(None, alias="dueDate", description="Updated task due date")
    start_date: Optional[datetime] = Field(None, alias="startDate", description="Updated task start date")
    labels: Optional[List[str]] = Field(None, description="Updated task label IDs")
    assigned_to: Optional[str] = Field(None, alias="assignedTo", description="Updated assigned user ID")
    custom_fields: Optional[Dict[str, Any]] = Field(None, alias="customFields", description="Updated custom field values")

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Task title cannot be empty')
        return v.strip() if v else v


class TaskMove(BaseModel):
    """Request model for moving tasks between columns."""
    target_column_id: str = Field(..., alias="targetColumnId", description="Target column ID")
    position: int = Field(..., ge=0, description="New position in target column")


class TaskAssign(BaseModel):
    """Request model for task assignment operations."""
    user_id: Optional[str] = Field(None, alias="userId", description="User ID to assign/unassign")


class Task(BaseModelWithId):
    """Complete task model with all information."""
    model_config = ConfigDict(populate_by_name=True)

    column_id: str = Field(..., alias="columnId", description="Associated column ID")
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    priority: TaskPriority = Field(..., description="Task priority")
    position: int = Field(..., ge=0, description="Position within column")
    story_points: Optional[int] = Field(None, alias="storyPoints", description="Story points estimate")
    due_date: Optional[datetime] = Field(None, alias="dueDate", description="Task due date")
    start_date: Optional[datetime] = Field(None, alias="startDate", description="Task start date")
    completed_at: Optional[datetime] = Field(None, alias="completedAt", description="Completion timestamp")
    created_by: str = Field(..., alias="createdBy", description="Creator user ID")
    assigned_to: Optional[str] = Field(None, alias="assignedTo", description="Assigned user ID")
    labels: List[str] = Field(default_factory=list, description="Task label IDs")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, alias="customFields", description="Custom field values")
    is_archived: bool = Field(default=False, alias="isArchived", description="Whether task is archived")

    # Nested relationships
    creator: Optional[UserSummary] = Field(None, description="Task creator information")
    assignee: Optional[UserSummary] = Field(None, description="Assigned user information")
    column: Optional[Column] = Field(None, description="Associated column information")
    label_objects: Optional[List[TaskLabel]] = Field(None, alias="labelObjects", description="Label objects")
    comments: Optional[List[Comment]] = Field(default_factory=list, description="Task comments")
    attachments: Optional[List[Attachment]] = Field(default_factory=list, description="Task attachments")

    # Computed fields
    comment_count: int = Field(default=0, description="Number of comments")
    attachment_count: int = Field(default=0, description="Number of attachments")
    is_overdue: bool = Field(default=False, description="Whether task is overdue")
    days_since_created: int = Field(default=0, description="Days since task creation")


class TaskSummary(BaseModel):
    """Lightweight task summary for list views."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Task identifier")
    title: str = Field(..., description="Task title")
    priority: TaskPriority = Field(..., description="Task priority")
    position: int = Field(..., description="Position within column")
    due_date: Optional[datetime] = Field(None, alias="dueDate", description="Task due date")
    assigned_to: Optional[str] = Field(None, alias="assignedTo", description="Assigned user ID")
    labels: List[str] = Field(default_factory=list, description="Task label IDs")
    is_archived: bool = Field(default=False, alias="isArchived", description="Whether task is archived")

    # Nested relationships (summary)
    assignee: Optional[UserSummary] = Field(None, description="Assigned user information")
    label_objects: Optional[List[TaskLabel]] = Field(None, alias="labelObjects", description="Label objects")

    # Computed fields
    comment_count: int = Field(default=0, description="Number of comments")
    attachment_count: int = Field(default=0, description="Number of attachments")
    is_overdue: bool = Field(default=False, description="Whether task is overdue")


# Board Models
class BoardCreate(BaseModel):
    """Request model for creating kanban boards."""
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255, description="Board name")
    description: Optional[str] = Field(None, max_length=1000, description="Board description")
    project_id: Optional[str] = Field(None, alias="projectId", description="Associated project ID")
    is_public: bool = Field(default=False, alias="isPublic", description="Whether board is public")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Board-specific settings")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Board name cannot be empty')
        return v.strip()


class BoardUpdate(BaseModel):
    """Request model for updating kanban boards."""
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated board name")
    description: Optional[str] = Field(None, max_length=1000, description="Updated board description")
    is_public: Optional[bool] = Field(None, alias="isPublic", description="Updated visibility setting")
    settings: Optional[Dict[str, Any]] = Field(None, description="Updated board settings")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Board name cannot be empty')
        return v.strip() if v else v


class Board(BaseModelWithId):
    """Complete kanban board model."""
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., description="Board name")
    description: Optional[str] = Field(None, description="Board description")
    organization_id: str = Field(..., alias="organizationId", description="Owner organization ID")
    division_id: Optional[str] = Field(None, alias="divisionId", description="Owner division ID")
    project_id: Optional[str] = Field(None, alias="projectId", description="Associated project ID")
    created_by: str = Field(..., alias="createdBy", description="Board creator ID")
    is_public: bool = Field(default=False, alias="isPublic", description="Whether board is public")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Board-specific settings")

    # Nested relationships
    creator: Optional[UserSummary] = Field(None, description="Board creator information")
    columns: Optional[List[Column]] = Field(default_factory=list, description="Board columns")
    tasks: Optional[List[Task]] = Field(default_factory=list, description="Board tasks")

    # Computed fields
    column_count: int = Field(default=0, description="Number of columns")
    task_count: int = Field(default=0, description="Number of tasks")
    completion_rate: float = Field(default=0.0, description="Task completion percentage")


class BoardSummary(BaseModel):
    """Lightweight board summary for list views."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Board identifier")
    name: str = Field(..., description="Board name")
    description: Optional[str] = Field(None, description="Board description")
    organization_id: str = Field(..., alias="organizationId", description="Owner organization ID")
    division_id: Optional[str] = Field(None, alias="divisionId", description="Owner division ID")
    project_id: Optional[str] = Field(None, alias="projectId", description="Associated project ID")
    is_public: bool = Field(default=False, alias="isPublic", description="Whether board is public")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")

    # Computed fields
    task_count: int = Field(default=0, description="Number of tasks")
    completion_rate: float = Field(default=0.0, description="Task completion percentage")


# Response Models
class TaskResponse(BaseModel):
    """Response model for individual task operations."""
    model_config = ConfigDict(populate_by_name=True)

    task: Task = Field(..., description="Task data")
    success: bool = Field(default=True, description="Operation success status")
    message: Optional[str] = Field(None, description="Operation message")

    @classmethod
    def from_entity(cls, entity: Any) -> "TaskResponse":
        """Create response from a task entity."""
        if hasattr(entity, 'dict'):
            return cls(task=Task(**entity.dict()))
        elif hasattr(entity, '__dict__'):
            return cls(task=Task(**entity.__dict__))
        else:
            return cls(task=Task(**entity))


class TaskListResponse(BaseModel):
    """Response model for task list operations."""
    model_config = ConfigDict(populate_by_name=True)

    tasks: List[TaskSummary] = Field(default_factory=list, description="List of tasks")
    total: int = Field(default=0, description="Total number of tasks")
    page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Items per page")
    has_next: bool = Field(default=False, description="Whether there are more pages")
    has_previous: bool = Field(default=False, description="Whether there are previous pages")


class ColumnResponse(BaseModel):
    """Response model for column operations."""
    model_config = ConfigDict(populate_by_name=True)

    column: Column = Field(..., description="Column data")
    success: bool = Field(default=True, description="Operation success status")
    message: Optional[str] = Field(None, description="Operation message")


class ColumnListResponse(BaseModel):
    """Response model for column list operations."""
    model_config = ConfigDict(populate_by_name=True)

    columns: List[Column] = Field(default_factory=list, description="List of columns")
    total: int = Field(default=0, description="Total number of columns")


class BoardResponse(BaseModel):
    """Response model for board operations."""
    model_config = ConfigDict(populate_by_name=True)

    board: Board = Field(..., description="Board data")
    columns: List[Column] = Field(default_factory=list, description="Board columns")
    tasks: List[TaskSummary] = Field(default_factory=list, description="Board tasks")
    permissions: Dict[str, bool] = Field(default_factory=dict, description="User permissions")
    success: bool = Field(default=True, description="Operation success status")
    message: Optional[str] = Field(None, description="Operation message")

    @classmethod
    def from_entity(cls, entity: Any) -> "BoardResponse":
        """Create response from a board entity."""
        if hasattr(entity, 'dict'):
            return cls(board=Board(**entity.dict()))
        elif hasattr(entity, '__dict__'):
            return cls(board=Board(**entity.__dict__))
        else:
            return cls(board=Board(**entity))


class BoardListResponse(BaseModel):
    """Response model for board list operations."""
    model_config = ConfigDict(populate_by_name=True)

    boards: List[BoardSummary] = Field(default_factory=list, description="List of boards")
    total: int = Field(default=0, description="Total number of boards")
    page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Items per page")
    has_next: bool = Field(default=False, description="Whether there are more pages")


class CommentResponse(BaseModel):
    """Response model for comment operations."""
    model_config = ConfigDict(populate_by_name=True)

    comment: Comment = Field(..., description="Comment data")
    success: bool = Field(default=True, description="Operation success status")
    message: Optional[str] = Field(None, description="Operation message")


class CommentListResponse(BaseModel):
    """Response model for comment list operations."""
    model_config = ConfigDict(populate_by_name=True)

    comments: List[Comment] = Field(default_factory=list, description="List of comments")
    total: int = Field(default=0, description="Total number of comments")
    page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Items per page")
    has_next: bool = Field(default=False, description="Whether there are more pages")


class ActivityResponse(BaseModel):
    """Response model for activity operations."""
    model_config = ConfigDict(populate_by_name=True)

    activities: List[ActivityEntry] = Field(default_factory=list, description="List of activities")
    total: int = Field(default=0, description="Total number of activities")
    page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Items per page")
    has_next: bool = Field(default=False, description="Whether there are more pages")


# Bulk Operations
class BulkTaskMove(BaseModel):
    """Request model for bulk task movement."""
    task_ids: List[str] = Field(..., min_items=1, alias="taskIds", description="Task IDs to move")
    target_column_id: str = Field(..., alias="targetColumnId", description="Target column ID")


class BulkTaskAssign(BaseModel):
    """Request model for bulk task assignment."""
    task_ids: List[str] = Field(..., min_items=1, alias="taskIds", description="Task IDs to assign")
    user_id: Optional[str] = Field(None, alias="userId", description="User ID to assign")
    action: str = Field(..., pattern="^(assign|unassign)$", description="Assignment action")


class BulkOperationResponse(BaseModel):
    """Response model for bulk operations."""
    model_config = ConfigDict(populate_by_name=True)

    success_count: int = Field(..., alias="successCount", description="Number of successful operations")
    failure_count: int = Field(..., alias="failureCount", description="Number of failed operations")
    errors: List[str] = Field(default_factory=list, description="Error messages")
    message: str = Field(..., description="Operation summary message")


# Search and Filtering
class TaskSearchRequest(BaseModel):
    """Request model for task search operations."""
    model_config = ConfigDict(populate_by_name=True)

    query: Optional[str] = Field(None, min_length=1, max_length=255, description="Search query")
    status: Optional[TaskStatus] = Field(None, description="Filter by status")
    priority: Optional[TaskPriority] = Field(None, description="Filter by priority")
    assigned_to: Optional[str] = Field(None, alias="assignedTo", description="Filter by assignee")
    labels: Optional[List[str]] = Field(None, description="Filter by labels")
    due_date_from: Optional[datetime] = Field(None, alias="dueDateFrom", description="Due date range start")
    due_date_to: Optional[datetime] = Field(None, alias="dueDateTo", description="Due date range end")
    is_archived: Optional[bool] = Field(None, alias="isArchived", description="Filter by archived status")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, alias="perPage", description="Items per page")
    sort_by: str = Field(default="updated_at", alias="sortBy", description="Sort field")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", alias="sortOrder", description="Sort order")


class BoardSearchRequest(BaseModel):
    """Request model for board search operations."""
    model_config = ConfigDict(populate_by_name=True)

    query: Optional[str] = Field(None, min_length=1, max_length=255, description="Search query")
    is_public: Optional[bool] = Field(None, alias="isPublic", description="Filter by visibility")
    project_id: Optional[str] = Field(None, alias="projectId", description="Filter by project")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, alias="perPage", description="Items per page")
    sort_by: str = Field(default="updated_at", alias="sortBy", description="Sort field")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", alias="sortOrder", description="Sort order")


# Permission Models
class BoardPermissions(BaseModel):
    """Board permission information for user interface."""
    model_config = ConfigDict(populate_by_name=True)

    can_view: bool = Field(default=False, alias="canView", description="Can view board")
    can_edit: bool = Field(default=False, alias="canEdit", description="Can edit board")
    can_delete: bool = Field(default=False, alias="canDelete", description="Can delete board")
    can_manage_columns: bool = Field(default=False, alias="canManageColumns", description="Can manage columns")
    can_create_tasks: bool = Field(default=False, alias="canCreateTasks", description="Can create tasks")
    can_assign_tasks: bool = Field(default=False, alias="canAssignTasks", description="Can assign tasks")
    can_comment: bool = Field(default=False, alias="canComment", description="Can add comments")
    can_attach_files: bool = Field(default=False, alias="canAttachFiles", description="Can attach files")
    role: str = Field(default="viewer", description="User role on board")


# Statistics and Analytics
class BoardStats(BaseModel):
    """Board statistics for analytics."""
    model_config = ConfigDict(populate_by_name=True)

    total_tasks: int = Field(default=0, alias="totalTasks", description="Total number of tasks")
    completed_tasks: int = Field(default=0, alias="completedTasks", description="Completed tasks")
    overdue_tasks: int = Field(default=0, alias="overdueTasks", description="Overdue tasks")
    tasks_by_status: Dict[str, int] = Field(default_factory=dict, alias="tasksByStatus", description="Tasks by status")
    tasks_by_priority: Dict[str, int] = Field(default_factory=dict, alias="tasksByPriority", description="Tasks by priority")
    avg_completion_time: Optional[float] = Field(None, alias="avgCompletionTime", description="Average completion time in days")
    burndown_data: Optional[List[Dict[str, Any]]] = Field(None, alias="burndownData", description="Burndown chart data")


# WebSocket Event Models
class TaskWebSocketEvent(BaseModel):
    """WebSocket event for task updates."""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(..., alias="eventType", description="Event type")
    task_id: str = Field(..., alias="taskId", description="Task ID")
    board_id: str = Field(..., alias="boardId", description="Board ID")
    user_id: str = Field(..., alias="userId", description="User who triggered event")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event timestamp")


class BoardWebSocketEvent(BaseModel):
    """WebSocket event for board updates."""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(..., alias="eventType", description="Event type")
    board_id: str = Field(..., alias="boardId", description="Board ID")
    user_id: str = Field(..., alias="userId", description="User who triggered event")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event timestamp")