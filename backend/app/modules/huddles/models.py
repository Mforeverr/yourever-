# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
SQLAlchemy models for the huddles domain.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from ...db.base import Base


class HuddleModel(Base):
    __tablename__ = "huddles"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    org_id = Column(String, nullable=False)
    division_id = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
