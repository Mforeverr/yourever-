# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Tasks repository for comprehensive kanban board data access.

This repository implements all data access operations for kanban boards,
columns, tasks, comments, attachments, and activity logging. It follows
the existing repository patterns and provides efficient, secure data
access with proper organization and division scoping.

Key Features:
- Organization and division scoping for security
- Efficient queries with proper indexing
- Transaction support for complex operations
- Activity logging integration
- Bulk operations for performance
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import uuid
import json

from ...dependencies import CurrentPrincipal
from .schemas import (
    Board, Column, Task, Comment, Attachment, ActivityEntry,
    TaskPriority, TaskStatus, ColumnType, ActivityType,
    TaskSummary, BoardSummary, UserSummary
)


class TasksRepository:
    """
    Repository for kanban board data access with scope validation.

    This repository provides comprehensive CRUD operations for all kanban
    entities while maintaining proper security boundaries and efficient
    data access patterns.
    """

    def __init__(self, db_session) -> None:
        self._db = db_session

    # ==================== BOARD OPERATIONS ====================

    async def create_board(self, board_data: Dict[str, Any]) -> Board:
        """Create a new kanban board."""
        board_id = board_data.get('id', str(uuid.uuid4()))

        query = """
        INSERT INTO kanban_boards (
            id, name, description, organization_id, division_id,
            project_id, created_by, is_public, settings, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        """

        result = await self._db.fetchrow(
            query,
            board_id,
            board_data['name'],
            board_data.get('description'),
            board_data['organization_id'],
            board_data.get('division_id'),
            board_data.get('project_id'),
            board_data['created_by'],
            board_data.get('is_public', False),
            json.dumps(board_data.get('settings', {})),
            board_data['created_at'],
            board_data['updated_at']
        )

        return self._row_to_board(result)

    async def get_board_by_id(self, board_id: str) -> Optional[Board]:
        """Get a board by ID with basic information."""
        query = """
        SELECT * FROM kanban_boards WHERE id = $1
        """
        result = await self._db.fetchrow(query, board_id)
        return self._row_to_board(result) if result else None

    async def list_boards_for_organization(
        self,
        organization_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[BoardSummary]:
        """List boards for an organization."""
        query = """
        SELECT id, name, description, organization_id, division_id,
               project_id, is_public, created_at
        FROM kanban_boards
        WHERE organization_id = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
        """

        results = await self._db.fetch(query, organization_id, limit, offset)
        return [self._row_to_board_summary(row) for row in results]

    async def list_boards_for_division(
        self,
        organization_id: str,
        division_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[BoardSummary]:
        """List boards for a specific division."""
        query = """
        SELECT id, name, description, organization_id, division_id,
               project_id, is_public, created_at
        FROM kanban_boards
        WHERE organization_id = $1 AND division_id = $2
        ORDER BY updated_at DESC
        LIMIT $3 OFFSET $4
        """

        results = await self._db.fetch(query, organization_id, division_id, limit, offset)
        return [self._row_to_board_summary(row) for row in results]

    async def update_board(self, board_id: str, update_data: Dict[str, Any]) -> Optional[Board]:
        """Update board information."""
        set_clauses = []
        values = []
        param_index = 1

        for field, value in update_data.items():
            if field in ['name', 'description', 'is_public', 'settings']:
                set_clauses.append(f"{field} = ${param_index}")
                if field == 'settings':
                    values.append(json.dumps(value))
                else:
                    values.append(value)
                param_index += 1

        if not set_clauses:
            return await self.get_board_by_id(board_id)

        set_clauses.append(f"updated_at = ${param_index}")
        values.append(datetime.utcnow())
        param_index += 1

        query = f"""
        UPDATE kanban_boards
        SET {', '.join(set_clauses)}
        WHERE id = ${param_index}
        RETURNING *
        """
        values.append(board_id)

        result = await self._db.fetchrow(query, *values)
        return self._row_to_board(result) if result else None

    async def delete_board(self, board_id: str) -> bool:
        """Delete a board and all associated data."""
        async with self._db.transaction():
            # Delete related data in order
            await self._db.execute("DELETE FROM task_attachments WHERE task_id IN (SELECT id FROM kanban_cards WHERE column_id IN (SELECT id FROM kanban_columns WHERE board_id = $1))", board_id)
            await self._db.execute("DELETE FROM task_comments WHERE task_id IN (SELECT id FROM kanban_cards WHERE column_id IN (SELECT id FROM kanban_columns WHERE board_id = $1))", board_id)
            await self._db.execute("DELETE FROM kanban_cards WHERE column_id IN (SELECT id FROM kanban_columns WHERE board_id = $1)", board_id)
            await self._db.execute("DELETE FROM kanban_columns WHERE board_id = $1", board_id)
            await self._db.execute("DELETE FROM kanban_boards WHERE id = $1", board_id)

        return True

    # ==================== COLUMN OPERATIONS ====================

    async def create_column(self, column_data: Dict[str, Any]) -> Column:
        """Create a new kanban column."""
        column_id = column_data.get('id', str(uuid.uuid4()))

        query = """
        INSERT INTO kanban_columns (
            id, board_id, name, color, position, column_type,
            wip_limit, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """

        result = await self._db.fetchrow(
            query,
            column_id,
            column_data['board_id'],
            column_data['name'],
            column_data['color'],
            column_data['position'],
            column_data['column_type'],
            column_data.get('wip_limit'),
            column_data['created_at'],
            column_data['updated_at']
        )

        return self._row_to_column(result)

    async def get_columns_for_board(self, board_id: str) -> List[Column]:
        """Get all columns for a board, ordered by position."""
        query = """
        SELECT c.*,
               COUNT(t.id) as task_count,
               CASE WHEN c.wip_limit IS NOT NULL AND COUNT(t.id) >= c.wip_limit THEN true ELSE false END as is_over_limit
        FROM kanban_columns c
        LEFT JOIN kanban_cards t ON c.id = t.column_id AND t.is_archived = false
        WHERE c.board_id = $1
        GROUP BY c.id, c.board_id, c.name, c.color, c.position, c.column_type, c.wip_limit, c.created_at, c.updated_at
        ORDER BY c.position ASC
        """

        results = await self._db.fetch(query, board_id)
        return [self._row_to_column(row) for row in results]

    async def get_column_by_id(self, column_id: str) -> Optional[Column]:
        """Get a column by ID."""
        query = """
        SELECT c.*,
               COUNT(t.id) as task_count,
               CASE WHEN c.wip_limit IS NOT NULL AND COUNT(t.id) >= c.wip_limit THEN true ELSE false END as is_over_limit
        FROM kanban_columns c
        LEFT JOIN kanban_cards t ON c.id = t.column_id AND t.is_archived = false
        WHERE c.id = $1
        GROUP BY c.id, c.board_id, c.name, c.color, c.position, c.column_type, c.wip_limit, c.created_at, c.updated_at
        """

        result = await self._db.fetchrow(query, column_id)
        return self._row_to_column(result) if result else None

    async def update_column(self, column_id: str, update_data: Dict[str, Any]) -> Optional[Column]:
        """Update column information."""
        set_clauses = []
        values = []
        param_index = 1

        for field, value in update_data.items():
            if field in ['name', 'color', 'wip_limit']:
                set_clauses.append(f"{field} = ${param_index}")
                values.append(value)
                param_index += 1

        if not set_clauses:
            return await self.get_column_by_id(column_id)

        set_clauses.append(f"updated_at = ${param_index}")
        values.append(datetime.utcnow())
        param_index += 1

        query = f"""
        UPDATE kanban_columns
        SET {', '.join(set_clauses)}
        WHERE id = ${param_index}
        RETURNING *
        """
        values.append(column_id)

        result = await self._db.fetchrow(query, *values)
        return self._row_to_column(result) if result else None

    async def reorder_columns(self, board_id: str, column_orders: List[Tuple[str, int]]) -> bool:
        """Reorder columns in a board."""
        async with self._db.transaction():
            for column_id, position in column_orders:
                await self._db.execute(
                    "UPDATE kanban_columns SET position = $1, updated_at = $2 WHERE id = $3 AND board_id = $4",
                    position, datetime.utcnow(), column_id, board_id
                )
        return True

    async def delete_column(self, column_id: str) -> bool:
        """Delete a column and move tasks to a backup column."""
        async with self._db.transaction():
            # Check if this is the last column
            remaining_count = await self._db.fetchval(
                "SELECT COUNT(*) FROM kanban_columns WHERE board_id = (SELECT board_id FROM kanban_columns WHERE id = $1) AND id != $1",
                column_id
            )

            if remaining_count == 0:
                # Cannot delete the last column
                return False

            # Find a column to move tasks to
            target_column_id = await self._db.fetchval(
                "SELECT id FROM kanban_columns WHERE board_id = (SELECT board_id FROM kanban_columns WHERE id = $1) AND id != $1 LIMIT 1",
                column_id
            )

            # Move tasks to target column
            if target_column_id:
                await self._db.execute(
                    "UPDATE kanban_cards SET column_id = $1, updated_at = $2 WHERE column_id = $3",
                    target_column_id, datetime.utcnow(), column_id
                )

            # Delete the column
            await self._db.execute("DELETE FROM kanban_columns WHERE id = $1", column_id)

        return True

    # ==================== TASK OPERATIONS ====================

    async def create_task(self, task_data: Dict[str, Any]) -> Task:
        """Create a new task."""
        task_id = task_data.get('id', str(uuid.uuid4()))

        # Get the next position in the column
        position = task_data.get('position', 0)
        if position == 0:
            position = await self._db.fetchval(
                "SELECT COALESCE(MAX(position), 0) + 1 FROM kanban_cards WHERE column_id = $1",
                task_data['column_id']
            ) or 0

        query = """
        INSERT INTO kanban_cards (
            id, column_id, title, description, priority, position,
            story_points, due_date, start_date, created_by, assigned_to,
            labels, custom_fields, is_archived, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        """

        result = await self._db.fetchrow(
            query,
            task_id,
            task_data['column_id'],
            task_data['title'],
            task_data.get('description'),
            task_data['priority'],
            position,
            task_data.get('story_points'),
            task_data.get('due_date'),
            task_data.get('start_date'),
            task_data['created_by'],
            task_data.get('assigned_to'),
            json.dumps(task_data.get('labels', [])),
            json.dumps(task_data.get('custom_fields', {})),
            task_data.get('is_archived', False),
            task_data['created_at'],
            task_data['updated_at']
        )

        return self._row_to_task(result)

    async def get_task_by_id(self, task_id: str) -> Optional[Task]:
        """Get a task by ID with all relationships."""
        query = """
        SELECT t.*,
               c.name as column_name, c.color as column_color, c.position as column_position,
               u_creator.name as creator_name, u_creator.email as creator_email,
               u_assignee.name as assignee_name, u_assignee.email as assignee_email,
               COUNT(tc.id) as comment_count,
               COUNT(ta.id) as attachment_count,
               CASE WHEN t.due_date < NOW() AND t.completed_at IS NULL THEN true ELSE false END as is_overdue,
               EXTRACT(DAYS FROM NOW() - t.created_at)::integer as days_since_created
        FROM kanban_cards t
        LEFT JOIN kanban_columns c ON t.column_id = c.id
        LEFT JOIN users u_creator ON t.created_by = u_creator.id
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        LEFT JOIN task_comments tc ON t.id = tc.task_id
        LEFT JOIN task_attachments ta ON t.id = ta.task_id
        WHERE t.id = $1
        GROUP BY t.id, c.id, u_creator.id, u_assignee.id
        """

        result = await self._db.fetchrow(query, task_id)
        return self._row_to_task(result) if result else None

    async def get_tasks_for_column(self, column_id: str, include_archived: bool = False) -> List[TaskSummary]:
        """Get all tasks in a column, ordered by position."""
        archived_clause = "" if include_archived else "AND t.is_archived = false"

        query = f"""
        SELECT t.id, t.title, t.priority, t.position, t.due_date, t.assigned_to,
               t.labels, t.is_archived, t.updated_at,
               u_assignee.name as assignee_name, u_assignee.email as assignee_email,
               COUNT(tc.id) as comment_count,
               COUNT(ta.id) as attachment_count,
               CASE WHEN t.due_date < NOW() AND t.completed_at IS NULL THEN true ELSE false END as is_overdue
        FROM kanban_cards t
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        LEFT JOIN task_comments tc ON t.id = tc.task_id
        LEFT JOIN task_attachments ta ON t.id = ta.task_id
        WHERE t.column_id = $1 {archived_clause}
        GROUP BY t.id, u_assignee.id
        ORDER BY t.position ASC
        """

        results = await self._db.fetch(query, column_id)
        return [self._row_to_task_summary(row) for row in results]

    async def update_task(self, task_id: str, update_data: Dict[str, Any]) -> Optional[Task]:
        """Update task information."""
        set_clauses = []
        values = []
        param_index = 1

        for field, value in update_data.items():
            if field in ['title', 'description', 'priority', 'story_points', 'due_date',
                        'start_date', 'assigned_to', 'is_archived']:
                set_clauses.append(f"{field} = ${param_index}")
                values.append(value)
                param_index += 1
            elif field in ['labels', 'custom_fields']:
                set_clauses.append(f"{field} = ${param_index}")
                values.append(json.dumps(value))
                param_index += 1

        if not set_clauses:
            return await self.get_task_by_id(task_id)

        # Handle completion
        if 'completed_at' in update_data:
            set_clauses.append(f"completed_at = ${param_index}")
            values.append(update_data['completed_at'])
            param_index += 1

        set_clauses.append(f"updated_at = ${param_index}")
        values.append(datetime.utcnow())
        param_index += 1

        query = f"""
        UPDATE kanban_cards
        SET {', '.join(set_clauses)}
        WHERE id = ${param_index}
        RETURNING *
        """
        values.append(task_id)

        result = await self._db.fetchrow(query, *values)
        return self._row_to_task(result) if result else None

    async def move_task(self, task_id: str, target_column_id: str, new_position: int) -> bool:
        """Move a task to a different column and position."""
        async with self._db.transaction():
            # Get current task info
            current = await self._db.fetchrow(
                "SELECT column_id, position FROM kanban_cards WHERE id = $1",
                task_id
            )

            if not current:
                return False

            current_column_id = current['column_id']
            current_position = current['position']

            # If moving to same column, just update position
            if current_column_id == target_column_id:
                if new_position > current_position:
                    # Move tasks down to make space
                    await self._db.execute(
                        "UPDATE kanban_cards SET position = position - 1 WHERE column_id = $1 AND position > $2 AND position <= $3",
                        current_column_id, current_position, new_position
                    )
                else:
                    # Move tasks up to make space
                    await self._db.execute(
                        "UPDATE kanban_cards SET position = position + 1 WHERE column_id = $1 AND position >= $2 AND position < $3",
                        current_column_id, new_position, current_position
                    )
            else:
                # Moving to different column
                # Shift tasks in old column to fill gap
                await self._db.execute(
                    "UPDATE kanban_cards SET position = position - 1 WHERE column_id = $1 AND position > $2",
                    current_column_id, current_position
                )

                # Make space in new column
                await self._db.execute(
                    "UPDATE kanban_cards SET position = position + 1 WHERE column_id = $1 AND position >= $2",
                    target_column_id, new_position
                )

            # Move the task
            await self._db.execute(
                "UPDATE kanban_cards SET column_id = $1, position = $2, updated_at = $3 WHERE id = $4",
                target_column_id, new_position, datetime.utcnow(), task_id
            )

        return True

    async def bulk_move_tasks(self, task_ids: List[str], target_column_id: str) -> int:
        """Move multiple tasks to a column."""
        if not task_ids:
            return 0

        async with self._db.transaction():
            # Get next position in target column
            max_position = await self._db.fetchval(
                "SELECT COALESCE(MAX(position), 0) FROM kanban_cards WHERE column_id = $1",
                target_column_id
            ) or 0

            # Move all tasks
            position = max_position + 1
            for task_id in task_ids:
                await self._db.execute(
                    "UPDATE kanban_cards SET column_id = $1, position = $2, updated_at = $3 WHERE id = $4",
                    target_column_id, position, datetime.utcnow(), task_id
                )
                position += 1

        return len(task_ids)

    async def bulk_assign_tasks(self, task_ids: List[str], user_id: Optional[str]) -> int:
        """Assign or unassign multiple tasks to a user."""
        if not task_ids:
            return 0

        result = await self._db.execute(
            "UPDATE kanban_cards SET assigned_to = $1, updated_at = $2 WHERE id = ANY($3)",
            user_id, datetime.utcnow(), task_ids
        )

        return result.split()[1] if result else 0  # Extract number of affected rows

    async def delete_task(self, task_id: str) -> bool:
        """Delete a task and all associated data."""
        async with self._db.transaction():
            # Delete comments and attachments first
            await self._db.execute("DELETE FROM task_comments WHERE task_id = $1", task_id)
            await self._db.execute("DELETE FROM task_attachments WHERE task_id = $1", task_id)

            # Delete the task
            result = await self._db.execute("DELETE FROM kanban_cards WHERE id = $1", task_id)

            # Reposition remaining tasks in the column
            await self._db.execute("""
                UPDATE kanban_cards
                SET position = position - 1
                WHERE column_id = (SELECT column_id FROM kanban_cards WHERE id = $1)
                AND position > (SELECT position FROM kanban_cards WHERE id = $1)
            """, task_id)

        return True

    async def search_tasks(
        self,
        board_id: Optional[str] = None,
        column_id: Optional[str] = None,
        query: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        assigned_to: Optional[str] = None,
        labels: Optional[List[str]] = None,
        due_date_from: Optional[datetime] = None,
        due_date_to: Optional[datetime] = None,
        is_archived: Optional[bool] = None,
        limit: int = 20,
        offset: int = 0,
        sort_by: str = "updated_at",
        sort_order: str = "desc"
    ) -> Tuple[List[TaskSummary], int]:
        """Search tasks with various filters."""

        # Build WHERE clause
        where_conditions = []
        params = []
        param_index = 1

        if board_id:
            where_conditions.append(f"c.board_id = ${param_index}")
            params.append(board_id)
            param_index += 1

        if column_id:
            where_conditions.append(f"t.column_id = ${param_index}")
            params.append(column_id)
            param_index += 1

        if query:
            where_conditions.append(f"(t.title ILIKE ${param_index} OR t.description ILIKE ${param_index})")
            params.append(f"%{query}%")
            param_index += 1

        if status:
            where_conditions.append(f"t.status = ${param_index}")
            params.append(status.value)
            param_index += 1

        if priority:
            where_conditions.append(f"t.priority = ${param_index}")
            params.append(priority.value)
            param_index += 1

        if assigned_to:
            where_conditions.append(f"t.assigned_to = ${param_index}")
            params.append(assigned_to)
            param_index += 1

        if labels:
            where_conditions.append(f"t.labels && ${param_index}")
            params.append(labels)
            param_index += 1

        if due_date_from:
            where_conditions.append(f"t.due_date >= ${param_index}")
            params.append(due_date_from)
            param_index += 1

        if due_date_to:
            where_conditions.append(f"t.due_date <= ${param_index}")
            params.append(due_date_to)
            param_index += 1

        if is_archived is not None:
            where_conditions.append(f"t.is_archived = ${param_index}")
            params.append(is_archived)
            param_index += 1

        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

        # Validate sort field
        valid_sort_fields = ["created_at", "updated_at", "due_date", "priority", "title", "position"]
        if sort_by not in valid_sort_fields:
            sort_by = "updated_at"

        # Build ORDER BY
        order_clause = f"ORDER BY t.{sort_by} {sort_order.upper()}"

        # Count query
        count_query = f"""
        SELECT COUNT(*)
        FROM kanban_cards t
        JOIN kanban_columns c ON t.column_id = c.id
        {where_clause}
        """
        total_count = await self._db.fetchval(count_query, *params)

        # Data query
        data_query = f"""
        SELECT t.id, t.title, t.priority, t.position, t.due_date, t.assigned_to,
               t.labels, t.is_archived, t.updated_at,
               u_assignee.name as assignee_name, u_assignee.email as assignee_email,
               COUNT(tc.id) as comment_count,
               COUNT(ta.id) as attachment_count,
               CASE WHEN t.due_date < NOW() AND t.completed_at IS NULL THEN true ELSE false END as is_overdue
        FROM kanban_cards t
        JOIN kanban_columns c ON t.column_id = c.id
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        LEFT JOIN task_comments tc ON t.id = tc.task_id
        LEFT JOIN task_attachments ta ON t.id = ta.task_id
        {where_clause}
        GROUP BY t.id, u_assignee.id
        {order_clause}
        LIMIT ${param_index} OFFSET ${param_index + 1}
        """
        params.extend([limit, offset])

        results = await self._db.fetch(data_query, *params)
        tasks = [self._row_to_task_summary(row) for row in results]

        return tasks, total_count

    # ==================== COMMENT OPERATIONS ====================

    async def create_comment(self, comment_data: Dict[str, Any]) -> Comment:
        """Create a new comment."""
        comment_id = comment_data.get('id', str(uuid.uuid4()))

        query = """
        INSERT INTO task_comments (
            id, task_id, author_id, content, parent_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """

        result = await self._db.fetchrow(
            query,
            comment_id,
            comment_data['task_id'],
            comment_data['author_id'],
            comment_data['content'],
            comment_data.get('parent_id'),
            comment_data['created_at'],
            comment_data['updated_at']
        )

        return self._row_to_comment(result)

    async def get_comments_for_task(self, task_id: str, limit: int = 50, offset: int = 0) -> List[Comment]:
        """Get comments for a task, ordered by creation date."""
        query = """
        SELECT c.*,
               u.name as author_name, u.email as author_email,
               c.created_at = c.updated_at as not_edited,
               CASE WHEN c.created_at != c.updated_at THEN c.updated_at ELSE NULL END as edited_at
        FROM task_comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.task_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
        """

        results = await self._db.fetch(query, task_id, limit, offset)
        return [self._row_to_comment(row) for row in results]

    async def update_comment(self, comment_id: str, content: str) -> Optional[Comment]:
        """Update a comment."""
        query = """
        UPDATE task_comments
        SET content = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
        """

        result = await self._db.fetchrow(query, content, datetime.utcnow(), comment_id)
        return self._row_to_comment(result) if result else None

    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment."""
        result = await self._db.execute("DELETE FROM task_comments WHERE id = $1", comment_id)
        return True

    # ==================== ATTACHMENT OPERATIONS ====================

    async def create_attachment(self, attachment_data: Dict[str, Any]) -> Attachment:
        """Create a new attachment record."""
        attachment_id = attachment_data.get('id', str(uuid.uuid4()))

        query = """
        INSERT INTO task_attachments (
            id, task_id, uploaded_by, filename, storage_path,
            content_type, size_bytes, description, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """

        result = await self._db.fetchrow(
            query,
            attachment_id,
            attachment_data['task_id'],
            attachment_data['uploaded_by'],
            attachment_data['filename'],
            attachment_data['storage_path'],
            attachment_data['content_type'],
            attachment_data['size_bytes'],
            attachment_data.get('description'),
            attachment_data['created_at']
        )

        return self._row_to_attachment(result)

    async def get_attachments_for_task(self, task_id: str) -> List[Attachment]:
        """Get attachments for a task."""
        query = """
        SELECT a.*, u.name as uploader_name, u.email as uploader_email
        FROM task_attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.task_id = $1
        ORDER BY a.created_at DESC
        """

        results = await self._db.fetch(query, task_id)
        return [self._row_to_attachment(row) for row in results]

    async def delete_attachment(self, attachment_id: str) -> bool:
        """Delete an attachment."""
        result = await self._db.execute("DELETE FROM task_attachments WHERE id = $1", attachment_id)
        return True

    # ==================== ACTIVITY LOGGING ====================

    async def create_activity(self, activity_data: Dict[str, Any]) -> ActivityEntry:
        """Create an activity log entry."""
        activity_id = activity_data.get('id', str(uuid.uuid4()))

        query = """
        INSERT INTO task_activities (
            id, task_id, board_id, user_id, activity_type,
            description, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """

        result = await self._db.fetchrow(
            query,
            activity_id,
            activity_data.get('task_id'),
            activity_data.get('board_id'),
            activity_data['user_id'],
            activity_data['activity_type'],
            activity_data['description'],
            json.dumps(activity_data.get('metadata', {})),
            activity_data['created_at']
        )

        return self._row_to_activity(result)

    async def get_activities_for_task(self, task_id: str, limit: int = 50, offset: int = 0) -> List[ActivityEntry]:
        """Get activity log for a task."""
        query = """
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM task_activities a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.task_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
        """

        results = await self._db.fetch(query, task_id, limit, offset)
        return [self._row_to_activity(row) for row in results]

    async def get_activities_for_board(self, board_id: str, limit: int = 50, offset: int = 0) -> List[ActivityEntry]:
        """Get activity log for a board."""
        query = """
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM task_activities a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.board_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
        """

        results = await self._db.fetch(query, board_id, limit, offset)
        return [self._row_to_activity(row) for row in results]

    # ==================== STATISTICS ====================

    async def get_board_stats(self, board_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a board."""
        # Get task counts by status
        status_counts = await self._db.fetch("""
            SELECT c.name as status, COUNT(t.id) as count
            FROM kanban_columns c
            LEFT JOIN kanban_cards t ON c.id = t.column_id AND t.is_archived = false
            WHERE c.board_id = $1
            GROUP BY c.id, c.name
            ORDER BY c.position
        """, board_id)

        tasks_by_status = {row['status']: row['count'] for row in status_counts}

        # Get priority counts
        priority_counts = await self._db.fetch("""
            SELECT priority, COUNT(*) as count
            FROM kanban_cards t
            JOIN kanban_columns c ON t.column_id = c.id
            WHERE c.board_id = $1 AND t.is_archived = false
            GROUP BY priority
        """, board_id)

        tasks_by_priority = {row['priority']: row['count'] for row in priority_counts}

        # Get completion stats
        total_tasks = sum(tasks_by_status.values())
        completed_tasks = tasks_by_status.get('Done', 0)
        overdue_tasks = await self._db.fetchval("""
            SELECT COUNT(*) FROM kanban_cards t
            JOIN kanban_columns c ON t.column_id = c.id
            WHERE c.board_id = $1 AND t.due_date < NOW() AND t.completed_at IS NULL AND t.is_archived = false
        """, board_id)

        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'overdue_tasks': overdue_tasks or 0,
            'tasks_by_status': tasks_by_status,
            'tasks_by_priority': tasks_by_priority,
            'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }

    # ==================== HELPER METHODS ====================

    def _row_to_board(self, row) -> Board:
        """Convert database row to Board object."""
        if not row:
            return None
        return Board(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            organization_id=row['organization_id'],
            division_id=row['division_id'],
            project_id=row['project_id'],
            created_by=row['created_by'],
            is_public=row['is_public'],
            settings=json.loads(row['settings']) if row['settings'] else {},
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def _row_to_board_summary(self, row) -> BoardSummary:
        """Convert database row to BoardSummary object."""
        if not row:
            return None
        return BoardSummary(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            organization_id=row['organization_id'],
            division_id=row['division_id'],
            project_id=row['project_id'],
            is_public=row['is_public'],
            created_at=row['created_at']
        )

    def _row_to_column(self, row) -> Column:
        """Convert database row to Column object."""
        if not row:
            return None
        return Column(
            id=row['id'],
            board_id=row['board_id'],
            name=row['name'],
            color=row['color'],
            position=row['position'],
            column_type=row['column_type'],
            wip_limit=row['wip_limit'],
            task_count=row.get('task_count', 0),
            is_over_limit=row.get('is_over_limit', False)
        )

    def _row_to_task(self, row) -> Task:
        """Convert database row to Task object."""
        if not row:
            return None
        return Task(
            id=row['id'],
            column_id=row['column_id'],
            title=row['title'],
            description=row['description'],
            priority=row['priority'],
            position=row['position'],
            story_points=row['story_points'],
            due_date=row['due_date'],
            start_date=row['start_date'],
            completed_at=row['completed_at'],
            created_by=row['created_by'],
            assigned_to=row['assigned_to'],
            labels=json.loads(row['labels']) if row['labels'] else [],
            custom_fields=json.loads(row['custom_fields']) if row['custom_fields'] else {},
            is_archived=row['is_archived'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            comment_count=row.get('comment_count', 0),
            attachment_count=row.get('attachment_count', 0),
            is_overdue=row.get('is_overdue', False),
            days_since_created=row.get('days_since_created', 0)
        )

    def _row_to_task_summary(self, row) -> TaskSummary:
        """Convert database row to TaskSummary object."""
        if not row:
            return None
        return TaskSummary(
            id=row['id'],
            title=row['title'],
            priority=row['priority'],
            position=row['position'],
            due_date=row['due_date'],
            assigned_to=row['assigned_to'],
            labels=json.loads(row['labels']) if row['labels'] else [],
            is_archived=row['is_archived'],
            comment_count=row.get('comment_count', 0),
            attachment_count=row.get('attachment_count', 0),
            is_overdue=row.get('is_overdue', False)
        )

    def _row_to_comment(self, row) -> Comment:
        """Convert database row to Comment object."""
        if not row:
            return None
        return Comment(
            id=row['id'],
            task_id=row['task_id'],
            author_id=row['author_id'],
            content=row['content'],
            parent_id=row['parent_id'],
            edited=row.get('not_edited', False) is False,
            edited_at=row.get('edited_at'),
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def _row_to_attachment(self, row) -> Attachment:
        """Convert database row to Attachment object."""
        if not row:
            return None
        return Attachment(
            id=row['id'],
            task_id=row['task_id'],
            uploaded_by=row['uploaded_by'],
            filename=row['filename'],
            storage_path=row['storage_path'],
            content_type=row['content_type'],
            size_bytes=row['size_bytes'],
            description=row['description'],
            created_at=row['created_at']
        )

    def _row_to_activity(self, row) -> ActivityEntry:
        """Convert database row to ActivityEntry object."""
        if not row:
            return None
        return ActivityEntry(
            id=row['id'],
            task_id=row['task_id'],
            board_id=row['board_id'],
            user_id=row['user_id'],
            activity_type=row['activity_type'],
            description=row['description'],
            metadata=json.loads(row['metadata']) if row['metadata'] else {},
            created_at=row['created_at']
        )