# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
Pytest configuration and fixtures for security testing.

This module provides shared test fixtures and configuration for
comprehensive security validation of scope enforcement systems.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, Optional, List
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient

from backend.app.core.scope import (
    ScopeGuard,
    ScopeContext,
    ScopeDecision,
    ScopeViolationType,
    get_scope_guard,
    set_scope_guard
)
from backend.app.core.scope_integration import ScopedService
from backend.app.dependencies import CurrentPrincipal


# Test Data Fixtures
@pytest.fixture
def test_organization_data():
    """Mock organization data for testing."""
    return {
        "org_1": {
            "id": "org_123",
            "name": "Test Organization 1",
            "domains": ["test1.com"],
            "divisions": ["div_1", "div_2"]
        },
        "org_2": {
            "id": "org_456",
            "name": "Test Organization 2",
            "domains": ["test2.com"],
            "divisions": ["div_3", "div_4"]
        },
        "org_3": {
            "id": "org_789",
            "name": "Unauthorized Organization",
            "domains": ["test3.com"],
            "divisions": ["div_5", "div_6"]
        }
    }


@pytest.fixture
def test_user_data():
    """Mock user data for testing."""
    return {
        "alyssa": {
            "id": "user_alyssa_123",
            "email": "alyssa@yourever.com",
            "name": "Alyssa Test User",
            "org_ids": ["org_123", "org_456"],
            "division_ids": {
                "org_123": ["div_1", "div_2"],
                "org_456": ["div_3"]
            },
            "permissions": ["project:read", "project:create", "project:update"]
        },
        "bob": {
            "id": "user_bob_456",
            "email": "bob@test.com",
            "name": "Bob Test User",
            "org_ids": ["org_123"],
            "division_ids": {
                "org_123": ["div_1"]
            },
            "permissions": ["project:read"]
        },
        "charlie": {
            "id": "user_charlie_789",
            "email": "charlie@test.com",
            "name": "Charlie Test User",
            "org_ids": ["org_456"],
            "division_ids": {
                "org_456": ["div_3", "div_4"]
            },
            "permissions": ["project:read", "project:delete"]
        }
    }


@pytest.fixture
def test_project_data():
    """Mock project data for testing."""
    return {
        "proj_1": {
            "id": "proj_111",
            "name": "Project 1 - Org 1",
            "org_id": "org_123",
            "division_id": "div_1",
            "owner_id": "user_alyssa_123",
            "status": "active"
        },
        "proj_2": {
            "id": "proj_222",
            "name": "Project 2 - Org 1",
            "org_id": "org_123",
            "division_id": "div_2",
            "owner_id": "user_bob_456",
            "status": "active"
        },
        "proj_3": {
            "id": "proj_333",
            "name": "Project 3 - Org 2",
            "org_id": "org_456",
            "division_id": "div_3",
            "owner_id": "user_charlie_789",
            "status": "active"
        },
        "proj_4": {
            "id": "proj_444",
            "name": "Project 4 - Unauthorized Org",
            "org_id": "org_789",
            "division_id": "div_5",
            "owner_id": "user_charlie_789",
            "status": "active"
        }
    }


# Principal Fixtures
@pytest.fixture
def mock_principal_alyssa(test_user_data):
    """Create mock principal for Alyssa user."""
    user_data = test_user_data["alyssa"]
    principal = MagicMock(spec=CurrentPrincipal)
    principal.id = user_data["id"]
    principal.email = user_data["email"]
    principal.name = user_data["name"]
    principal.org_ids = set(user_data["org_ids"])
    principal.division_ids = user_data["division_ids"]
    principal.permissions = set(user_data["permissions"])
    return principal


@pytest.fixture
def mock_principal_bob(test_user_data):
    """Create mock principal for Bob user."""
    user_data = test_user_data["bob"]
    principal = MagicMock(spec=CurrentPrincipal)
    principal.id = user_data["id"]
    principal.email = user_data["email"]
    principal.name = user_data["name"]
    principal.org_ids = set(user_data["org_ids"])
    principal.division_ids = user_data["division_ids"]
    principal.permissions = set(user_data["permissions"])
    return principal


@pytest.fixture
def mock_principal_charlie(test_user_data):
    """Create mock principal for Charlie user."""
    user_data = test_user_data["charlie"]
    principal = MagicMock(spec=CurrentPrincipal)
    principal.id = user_data["id"]
    principal.email = user_data["email"]
    principal.name = user_data["name"]
    principal.org_ids = set(user_data["org_ids"])
    principal.division_ids = user_data["division_ids"]
    principal.permissions = set(user_data["permissions"])
    return principal


# Scope Guard Fixtures
@pytest.fixture
def mock_scope_guard():
    """Create a mock scope guard for testing."""
    guard = MagicMock(spec=ScopeGuard)

    # Mock successful organization access
    async def mock_check_org_access(principal, org_id, required_permissions=None):
        if org_id in principal.org_ids:
            return ScopeContext(
                principal=principal,
                organization_id=org_id,
                division_id=None,
                permissions={"org:view", "org:read"} | (required_permissions or set()),
                decision=ScopeDecision.ALLOW
            )
        else:
            from backend.app.core.errors import APIError
            from fastapi import status
            raise APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization access denied",
                code="org_access_denied"
            )

    # Mock successful division access
    async def mock_check_div_access(principal, org_id, div_id, required_permissions=None):
        if (org_id in principal.org_ids and
            div_id in principal.division_ids.get(org_id, [])):
            return ScopeContext(
                principal=principal,
                organization_id=org_id,
                division_id=div_id,
                permissions={"division:view", "division:read"} | (required_permissions or set()),
                decision=ScopeDecision.ALLOW
            )
        else:
            from backend.app.core.errors import APIError
            from fastapi import status
            raise APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Division access denied",
                code="division_access_denied"
            )

    guard.check_organization_access = mock_check_org_access
    guard.check_division_access = mock_check_div_access
    guard.log_violation = AsyncMock()
    guard.invalidate_cache = AsyncMock()

    return guard


@pytest.fixture
def test_scope_guard():
    """Create a real scope guard instance for testing."""
    return ScopeGuard()


@pytest.fixture
def app_with_mock_scope(mock_scope_guard):
    """Create FastAPI app with mocked scope guard."""
    app = FastAPI()

    # Override the global scope guard
    set_scope_guard(mock_scope_guard)

    return app


# Test Client Fixtures
@pytest.fixture
def test_client(app_with_mock_scope):
    """Create test client for FastAPI app."""
    return TestClient(app_with_mock_scope)


@pytest_asyncio.fixture
async def async_client(app_with_mock_scope):
    """Create async test client for FastAPI app."""
    async with AsyncClient(app=app_with_mock_scope, base_url="http://test") as client:
        yield client


# Security Test Result Fixtures
@pytest.fixture
def security_test_results():
    """Container for security test results."""
    results = {
        "cross_tenant_tests": [],
        "division_scope_tests": [],
        "api_endpoint_tests": [],
        "service_layer_tests": [],
        "url_manipulation_tests": [],
        "session_management_tests": [],
        "summary": {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "security_violations": 0,
            "performance_metrics": {}
        }
    }
    return results


# Database Mock Fixtures
@pytest.fixture
def mock_repository():
    """Create a mock repository for testing."""
    repo = AsyncMock()
    repo.list_for_principal = AsyncMock(return_value=[])
    repo.list_for_organization = AsyncMock(return_value=[])
    repo.list_for_division = AsyncMock(return_value=[])
    repo.get_by_id = AsyncMock(return_value=None)
    repo.create = AsyncMock(return_value=None)
    repo.update = AsyncMock(return_value=None)
    repo.delete = AsyncMock(return_value=True)
    return repo


# Performance Testing Fixtures
@pytest.fixture
def performance_monitor():
    """Monitor performance during security tests."""
    class PerformanceMonitor:
        def __init__(self):
            self.metrics = {}
            self.start_times = {}

        def start_timer(self, operation_name: str):
            self.start_times[operation_name] = asyncio.get_event_loop().time()

        def end_timer(self, operation_name: str):
            if operation_name in self.start_times:
                duration = asyncio.get_event_loop().time() - self.start_times[operation_name]
                if operation_name not in self.metrics:
                    self.metrics[operation_name] = []
                self.metrics[operation_name].append(duration)
                return duration
            return None

        def get_average_time(self, operation_name: str):
            if operation_name in self.metrics and self.metrics[operation_name]:
                return sum(self.metrics[operation_name]) / len(self.metrics[operation_name])
            return None

        def get_max_time(self, operation_name: str):
            if operation_name in self.metrics and self.metrics[operation_name]:
                return max(self.metrics[operation_name])
            return None

    return PerformanceMonitor()


# Security Event Fixtures
@pytest.fixture
def security_event_logger():
    """Log security events during testing."""
    logged_events = []

    class SecurityEventLogger:
        def __init__(self):
            self.events = logged_events

        def log_access_attempt(self, user_id: str, resource: str, success: bool, reason: str = None):
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id,
                "resource": resource,
                "success": success,
                "reason": reason
            }
            self.events.append(event)

        def log_violation(self, user_id: str, violation_type: str, details: Dict[str, Any]):
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id,
                "violation_type": violation_type,
                "details": details,
                "severity": "HIGH"
            }
            self.events.append(event)

        def get_violations_by_type(self, violation_type: str):
            return [e for e in self.events if e.get("violation_type") == violation_type]

        def get_violations_by_user(self, user_id: str):
            return [e for e in self.events if e.get("user_id") == user_id]

    return SecurityEventLogger()


# Async Event Loop Management
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Global Test Configuration
def pytest_configure(config):
    """Configure pytest for security testing."""
    config.addinivalue_line(
        "markers", "security: marks tests as security tests"
    )
    config.addinivalue_line(
        "markers", "cross_tenant: marks tests as cross-tenant security tests"
    )
    config.addinivalue_line(
        "markers", "division_scope: marks tests as division scope security tests"
    )
    config.addinivalue_line(
        "markers", "api_security: marks tests as API endpoint security tests"
    )
    config.addinivalue_line(
        "markers", "service_security: marks tests as service layer security tests"
    )


def pytest_collection_modifyitems(config, items):
    """Add markers to security tests automatically."""
    for item in items:
        if "security" in item.nodeid:
            item.add_marker(pytest.mark.security)
        if "cross_tenant" in item.nodeid:
            item.add_marker(pytest.mark.cross_tenant)
        if "division" in item.nodeid and "scope" in item.nodeid:
            item.add_marker(pytest.mark.division_scope)
        if "api" in item.nodeid and "security" in item.nodeid:
            item.add_marker(pytest.mark.api_security)
        if "service" in item.nodeid and "security" in item.nodeid:
            item.add_marker(pytest.mark.service_security)