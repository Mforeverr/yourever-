# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
SQLAlchemy models for projects domain.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, String

from ...db.base import Base


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    org_id = Column(String, nullable=False)
    division_id = Column(String, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
