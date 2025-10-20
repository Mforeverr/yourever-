# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Tasks module for comprehensive kanban board task management.

This module provides secure, multi-tenant task management capabilities with:
- Task CRUD operations with scope validation
- Kanban board and column management
- Task assignment and collaboration features
- Activity logging and comments
- File attachments support
- Real-time collaboration foundation

Security Features:
- Organization and division-based access control
- Scope validation for all operations
- Cross-tenant access prevention
- Audit logging for compliance

Architecture:
- Follows Open/Closed Principle
- Extends existing scope guard system
- Modular, testable design
- RESTful API endpoints
"""

from .service import TasksService
from .repository import TasksRepository
from .schemas import *

__all__ = [
    "TasksService",
    "TasksRepository",
]