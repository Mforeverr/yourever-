#!/usr/bin/env python3
"""
Author: Eldrie (CTO Dev)
Date: 2025-10-20
Role: Integration Testing

Manual security test execution without pytest dependency.

This script manually runs security test functions to validate
the P0 security fixes without requiring external test frameworks.
"""

import asyncio
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
from unittest.mock import MagicMock, AsyncMock

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class ManualSecurityTester:
    """Manual security test executor."""

    def __init__(self):
        self.test_results = {
            "test_run": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_seconds": 0,
                "python_version": sys.version
            },
            "summary": {
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "error_tests": 0,
                "success_rate": 0.0
            },
            "categories": {},
            "security_validations": {},
            "recommendations": []
        }

    def run_test(self, test_name: str, test_func, *args, **kwargs):
        """Run a single test function and record results."""
        self.test_results["summary"]["total_tests"] += 1

        print(f"🧪 Running {test_name}... ", end="")

        try:
            start_time = time.time()
            result = test_func(*args, **kwargs)
            duration = time.time() - start_time

            if asyncio.iscoroutinefunction(test_func):
                # For async functions, we need to run them in an event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    start_time = time.time()
                    result = loop.run_until_complete(test_func(*args, **kwargs))
                    duration = time.time() - start_time
                finally:
                    loop.close()

            # Test passed
            self.test_results["summary"]["passed_tests"] += 1
            print(f"✅ PASSED ({duration:.3f}s)")
            return True

        except Exception as e:
            # Test failed
            self.test_results["summary"]["failed_tests"] += 1
            print(f"❌ FAILED ({str(e)[:100]})")

            # Record error details
            error_details = {
                "test_name": test_name,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            if "errors" not in self.test_results:
                self.test_results["errors"] = []
            self.test_results["errors"].append(error_details)

            return False

    def test_scope_guard_organization_access(self):
        """Test ScopeGuard organization access validation."""
        from backend.app.core.scope import ScopeGuard, ScopeDecision, ScopeViolationType
        from backend.app.core.errors import APIError
        from fastapi import status

        # Create mock principal
        principal = MagicMock()
        principal.id = "test_user"
        principal.org_ids = {"org_123", "org_456"}
        principal.division_ids = {"org_123": ["div_1"], "org_456": ["div_3"]}
        principal.permissions = {"project:read"}

        guard = ScopeGuard()

        async def test_valid_access():
            """Test valid organization access."""
            context = await guard.check_organization_access(principal, "org_123", {"project:read"})
            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == "org_123"

        async def test_invalid_access():
            """Test invalid organization access."""
            with pytest.raises(APIError) as exc_info:
                await guard.check_organization_access(principal, "org_789", {"project:read"})
            assert exc_info.value.code == "org_access_denied"

        # Create a simple pytest-like raises context manager
        class Raises:
            def __init__(self, expected_exception):
                self.expected_exception = expected_exception
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                if exc_type is None:
                    raise AssertionError(f"Expected {self.expected_exception} but no exception was raised")
                if not issubclass(exc_type, self.expected_exception):
                    raise AssertionError(f"Expected {self.expected_exception} but got {exc_type}")
                return True

        # Run the tests
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(test_valid_access())

            # Test invalid access
            try:
                loop.run_until_complete(test_invalid_access())
                raise AssertionError("Expected APIError but no exception was raised")
            except APIError as e:
                assert e.code == "org_access_denied"

        finally:
            loop.close()

    def test_scope_guard_division_access(self):
        """Test ScopeGuard division access validation."""
        from backend.app.core.scope import ScopeGuard, ScopeDecision
        from backend.app.core.errors import APIError

        # Create mock principal
        principal = MagicMock()
        principal.id = "test_user"
        principal.org_ids = {"org_123"}
        principal.division_ids = {"org_123": ["div_1", "div_2"]}
        principal.permissions = {"project:read"}

        guard = ScopeGuard()

        async def test_valid_division_access():
            """Test valid division access."""
            context = await guard.check_division_access(principal, "org_123", "div_1", {"project:read"})
            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == "org_123"
            assert context.division_id == "div_1"

        async def test_invalid_division_access():
            """Test invalid division access."""
            with pytest.raises(APIError) as exc_info:
                await guard.check_division_access(principal, "org_123", "div_999", {"project:read"})
            assert exc_info.value.code == "division_access_denied"

        # Run the tests
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(test_valid_division_access())

            # Test invalid access
            try:
                loop.run_until_complete(test_invalid_division_access())
                raise AssertionError("Expected APIError but no exception was raised")
            except APIError as e:
                assert e.code == "division_access_denied"

        finally:
            loop.close()

    def test_cross_organization_blocking(self):
        """Test that cross-organization access is blocked."""
        from backend.app.core.scope import ScopeGuard
        from backend.app.core.errors import APIError

        principal = MagicMock()
        principal.id = "test_user"
        principal.org_ids = {"org_123", "org_456"}
        principal.division_ids = {"org_123": ["div_1"], "org_456": ["div_3"]}

        guard = ScopeGuard()

        async def test_cross_org_blocked():
            """Test cross-organization access is blocked."""
            with pytest.raises(APIError) as exc_info:
                await guard.check_cross_organization_access(
                    principal, "org_123", "org_456", {"project:manage"}
                )
            assert exc_info.value.code == "cross_org_access"

        # Run the test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Test blocked access
            try:
                loop.run_until_complete(test_cross_org_blocked())
                raise AssertionError("Expected APIError but no exception was raised")
            except APIError as e:
                assert e.code == "cross_org_access"

        finally:
            loop.close()

    def test_scoped_service_validation(self):
        """Test ScopedService validation methods."""
        from backend.app.core.scope_integration import ScopedService
        from backend.app.core.scope import ScopeGuard, ScopeDecision, ScopeContext
        from backend.app.core.errors import APIError

        # Create mock scope guard
        mock_guard = MagicMock(spec=ScopeGuard)

        async def mock_check_org_access(principal, org_id, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id,
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

        mock_guard.check_organization_access = mock_check_org_access

        # Create scoped service
        service = ScopedService(mock_guard)

        # Create mock principal
        principal = MagicMock()
        principal.id = "test_user"

        async def test_service_validation():
            """Test service validation method."""
            context = await service.validate_organization_access(
                principal, "org_123", {"project:read"}
            )
            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == "org_123"

        # Run the test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(test_service_validation())
        finally:
            loop.close()

    def test_scope_cache_isolation(self):
        """Test that scope cache is properly isolated between users."""
        from backend.app.core.scope import ScopeGuard, ScopeContext, ScopeDecision

        guard = ScopeGuard()

        # Create two different principals
        principal1 = MagicMock()
        principal1.id = "user_1"
        principal1.org_ids = {"org_123"}
        principal1.division_ids = {"org_123": ["div_1"]}

        principal2 = MagicMock()
        principal2.id = "user_2"
        principal2.org_ids = {"org_123"}
        principal2.division_ids = {"org_123": ["div_1"]}

        async def test_cache_isolation():
            """Test cache isolation between users."""
            # User 1 accesses org_123
            context1 = await guard.check_organization_access(principal1, "org_123", {"project:read"})

            # User 2 accesses the same org_123
            context2 = await guard.check_organization_access(principal2, "org_123", {"project:read"})

            # Both should succeed
            assert context1.decision == ScopeDecision.ALLOW
            assert context2.decision == ScopeDecision.ALLOW

            # But should have different principals
            assert context1.principal.id != context2.principal.id

        # Run the test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(test_cache_isolation())
        finally:
            loop.close()

    def test_scope_validation_rate_limiting(self):
        """Test scope validation rate limiting."""
        from backend.app.core.scope import ScopeGuard, ScopeRateLimiter

        # Create a rate limiter with low limits for testing
        rate_limiter = ScopeRateLimiter(max_requests=5, window_seconds=1)
        guard = ScopeGuard(rate_limiter=rate_limiter)

        principal = MagicMock()
        principal.id = "test_user"
        principal.org_ids = {"org_123"}
        principal.division_ids = {"org_123": ["div_1"]}

        async def test_rate_limiting():
            """Test rate limiting functionality."""
            # Make several requests
            success_count = 0
            for i in range(10):
                try:
                    await guard.check_organization_access(principal, "org_123", {"project:read"})
                    success_count += 1
                except Exception:
                    break

            # Should succeed for some requests then be rate limited
            assert success_count >= 1
            assert success_count <= 5  # Should not exceed rate limit

        # Run the test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(test_rate_limiting())
        finally:
            loop.close()

    def create_mock_pytest(self):
        """Create a mock pytest module for the tests."""
        import types

        pytest_module = types.ModuleType('pytest')

        class Raises:
            def __init__(self, expected_exception):
                self.expected_exception = expected_exception
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                if exc_type is None:
                    raise AssertionError(f"Expected {self.expected_exception} but no exception was raised")
                if not issubclass(exc_type, self.expected_exception):
                    raise AssertionError(f"Expected {self.expected_exception} but got {exc_type}")
                return True

        pytest_module.raises = Raises
        pytest_module.mark = types.SimpleNamespace()
        pytest_module.mark.asyncio = lambda f: f
        pytest_module.mark.security = lambda f: f

        sys.modules['pytest'] = pytest_module
        return pytest_module

    def run_all_tests(self):
        """Run all security tests manually."""
        print("🔒 Starting Manual Security Test Execution")
        print(f"📅 Test Run: {self.test_results['test_run']['timestamp']}")
        print(f"🐍 Python: {self.test_results['test_run']['python_version']}\n")

        start_time = time.time()

        # Create mock pytest for tests that need it
        self.create_mock_pytest()

        # Define test categories
        test_categories = [
            ("Core Scope Guard", [
                ("Organization Access Validation", self.test_scope_guard_organization_access),
                ("Division Access Validation", self.test_scope_guard_division_access),
                ("Cross-Organization Blocking", self.test_cross_organization_blocking),
                ("Scope Cache Isolation", self.test_scope_cache_isolation),
                ("Rate Limiting", self.test_scope_validation_rate_limiting),
            ]),
            ("Service Layer Security", [
                ("Scoped Service Validation", self.test_scoped_service_validation),
            ]),
        ]

        # Run tests by category
        for category_name, tests in test_categories:
            print(f"\n{'='*60}")
            print(f"🧪 {category_name}")
            print(f"{'='*60}")

            category_results = {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "errors": 0,
                "tests": []
            }

            for test_name, test_func in tests:
                category_results["total"] += 1
                success = self.run_test(test_name, test_func)

                if success:
                    category_results["passed"] += 1
                else:
                    category_results["failed"] += 1

            self.test_results["categories"][category_name.lower().replace(" ", "_")] = category_results

            # Print category summary
            total = category_results["total"]
            passed = category_results["passed"]
            failed = category_results["failed"]
            success_rate = (passed / total * 100) if total > 0 else 0

            print(f"\n📊 {category_name} Results:")
            print(f"   Total: {total}")
            print(f"   ✅ Passed: {passed}")
            print(f"   ❌ Failed: {failed}")
            print(f"   📈 Success Rate: {success_rate:.1f}%")
            print(f"   {'✅ Status: PASSED' if failed == 0 else '❌ Status: FAILED'}")

        # Calculate overall summary
        self.test_results["test_run"]["duration_seconds"] = time.time() - start_time
        self.test_results["summary"]["success_rate"] = (
            self.test_results["summary"]["passed_tests"] /
            self.test_results["summary"]["total_tests"] * 100
            if self.test_results["summary"]["total_tests"] > 0 else 0
        )

        # Generate recommendations
        self._generate_recommendations()

        return self.test_results

    def _generate_recommendations(self):
        """Generate security recommendations."""
        recommendations = []

        success_rate = self.test_results["summary"]["success_rate"]
        failed_tests = self.test_results["summary"]["failed_tests"]

        if success_rate == 100:
            recommendations.append({
                "priority": "INFO",
                "title": "All Security Tests Passed",
                "description": "All manual security tests passed successfully.",
                "action": "Continue to maintain security test coverage."
            })
        else:
            recommendations.append({
                "priority": "HIGH",
                "title": "Security Test Failures",
                "description": f"{failed_tests} security tests failed.",
                "action": "Review and fix all failed security tests."
            })

        self.test_results["recommendations"] = recommendations

    def print_summary(self):
        """Print final test summary."""
        print("\n" + "=" * 60)
        print("🏁 MANUAL SECURITY TEST SUMMARY")
        print("=" * 60)

        summary = self.test_results["summary"]
        print(f"📊 Total Tests: {summary['total_tests']}")
        print(f"✅ Passed: {summary['passed_tests']}")
        print(f"❌ Failed: {summary['failed_tests']}")
        print(f"📈 Success Rate: {summary['success_rate']:.1f}%")
        print(f"⏱️  Duration: {self.test_results['test_run']['duration_seconds']:.2f}s")

        if summary["success_rate"] == 100:
            print("\n🎉 All security tests PASSED! The scope enforcement system is working correctly.")
        else:
            print(f"\n⚠️  {summary['failed_tests']} security issues found!")
            print("🚨 Address these issues before production deployment.")

        # Print recommendations
        if self.test_results["recommendations"]:
            print("\n🎯 Recommendations:")
            for rec in self.test_results["recommendations"]:
                priority_emoji = {"HIGH": "🚨", "MEDIUM": "⚠️", "INFO": "ℹ️"}.get(rec["priority"], "📝")
                print(f"   {priority_emoji} {rec['title']}")
                print(f"      {rec['action']}")

    def save_report(self, filename: str = None):
        """Save test report to file."""
        if filename is None:
            filename = f"manual_security_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)

        print(f"\n📄 Report saved to: {filename}")
        return filename


def main():
    """Main function to run manual security tests."""
    print("🔒 Manual Security Test Suite (No pytest dependency)")
    print("=" * 60)

    tester = ManualSecurityTester()
    results = tester.run_all_tests()
    tester.print_summary()

    # Save report
    report_file = tester.save_report()

    # Exit with appropriate code
    success_rate = results["summary"]["success_rate"]
    if success_rate == 100:
        print("\n✅ Security validation completed successfully.")
        sys.exit(0)
    else:
        print("\n❌ Security validation failed. See report for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()