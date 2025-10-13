# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Dependency wiring for the users module.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency, get_engine
from .publishers import OnboardingAnswerPublisher, PostgresNotifyOnboardingAnswerPublisher
from .repository import UserRepository
from .service import UserService


async def get_onboarding_answer_publisher() -> OnboardingAnswerPublisher:
    engine = get_engine()
    return PostgresNotifyOnboardingAnswerPublisher(engine=engine)


async def get_user_repository(
    session: AsyncSession = Depends(db_session_dependency),
    publisher: OnboardingAnswerPublisher = Depends(get_onboarding_answer_publisher),
) -> UserRepository:
    return UserRepository(session=session, answer_publisher=publisher)


async def get_user_service(repository: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(repository=repository)
