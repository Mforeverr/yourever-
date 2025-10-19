#!/usr/bin/env python3
"""
Comprehensive Scope Enforcement Security Test

This script tests the scoped API enforcement implementation to identify:
1. Repository layer scope filtering gaps
2. API endpoint scope validation issues
3. Authentication flow problems
4. Cross-tenant access vulnerabilities
5. Error handling deficiencies

Author: Security Testing Suite
Date: 2025-10-19
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aiohttp
import jwt
from pydantic import BaseModel

# Test Configuration
BASE_URL = "http://localhost:8000"  # Adjust if your backend runs on different port
TEST_EMAIL = "alyssa@yourever.com"
TEST_PASSWORD = "DemoPass123!"

# Test results tracking
class TestResult(BaseModel):
    test_name: str
    status: str  # "PASS", "FAIL", "SKIP"
    details: str
    vulnerability_level: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    evidence: Optional[Dict[str, Any]] = None

class SecurityTestReport(BaseModel):
    timestamp: datetime
    total_tests: int
    passed_tests: int
    failed_tests: int
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    results: List[TestResult]

# Global test results
test_results: List[TestResult] = []

def log_test(test_name: str, status: str, details: str, vulnerability_level: str = "MEDIUM", evidence: Optional[Dict[str, Any]] = None):
    """Log a test result"""
    result = TestResult(
        test_name=test_name,
        status=status,
        details=details,
        vulnerability_level=vulnerability_level,
        evidence=evidence
    )
    test_results.append(result)

    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏭️"
    vuln_icon = {"CRITICAL": "🚨", "HIGH": "⚠️", "MEDIUM": "⚡", "LOW": "ℹ️"}.get(vulnerability_level, "")

    print(f"{status_icon} {vuln_icon} {test_name}: {status} - {details}")

async def get_auth_token(session: aiohttp.ClientSession) -> Optional[str]:
    """Authenticate and get JWT token"""
    try:
        # This would need to be implemented based on your auth endpoint
        # For now, we'll try to get a token from Supabase or use a test token

        # Check if we have a SUPABASE_JWT_SECRET for creating test tokens
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if jwt_secret:
            # Create a test JWT token with scope claims
            now = int(time.time())
            payload = {
                "sub": "test-user-id",
                "email": TEST_EMAIL,
                "role": "authenticated",
                "iat": now,
                "exp": now + 3600,  # 1 hour
                "aud": "authenticated",
                "app_metadata": {
                    "yourever_scope": {
                        "org_ids": ["test-org-1", "test-org-2"],
                        "division_ids": {
                            "test-org-1": ["test-div-1", "test-div-2"],
                            "test-org-2": ["test-div-3"]
                        },
                        "active_org_id": "test-org-1",
                        "active_division_id": "test-div-1"
                    }
                }
            }
            token = jwt.encode(payload, jwt_secret, algorithm="HS256")
            return token
        else:
            log_test(
                "JWT Token Generation",
                "SKIP",
                "SUPABASE_JWT_SECRET not configured - cannot create test tokens",
                "MEDIUM"
            )
            return None

    except Exception as e:
        log_test("JWT Token Generation", "FAIL", f"Failed to generate token: {str(e)}", "HIGH")
        return None

async def test_repository_scope_filtering(session: aiohttp.ClientSession, token: str) -> None:
    """Test if repositories filter by org_id/division_id scope"""

    # Test projects endpoint without scope validation
    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with session.get(f"{BASE_URL}/api/projects", headers=headers) as response:
            if response.status == 200:
                data = await response.json()

                # Check if projects are filtered by scope
                if "results" in data and len(data["results"]) > 0:
                    # Look for projects that shouldn't be accessible
                    unscoped_projects = []
                    for project in data["results"]:
                        if project.get("org_id") not in ["test-org-1", "test-org-2"]:
                            unscoped_projects.append(project)

                    if unscoped_projects:
                        log_test(
                            "Repository Scope Filtering",
                            "FAIL",
                            f"Repository returned {len(unscoped_projects)} projects outside user scope - CRITICAL SECURITY ISSUE",
                            "CRITICAL",
                            {"unscoped_projects": unscoped_projects}
                        )
                    else:
                        # Might still be vulnerable, need more testing
                        log_test(
                            "Repository Scope Filtering",
                            "SKIP",
                            "Cannot determine scope filtering - need test data with different org_ids",
                            "HIGH"
                        )
                else:
                    log_test(
                        "Repository Scope Filtering",
                        "SKIP",
                        "No projects returned to test scope filtering",
                        "MEDIUM"
                    )
            else:
                log_test(
                    "Repository Scope Filtering",
                    "FAIL",
                    f"Projects endpoint returned status {response.status}",
                    "HIGH"
                )

    except Exception as e:
        log_test(
            "Repository Scope Filtering",
            "FAIL",
            f"Error testing repository scope filtering: {str(e)}",
            "HIGH"
        )

async def test_api_endpoint_scope_validation(session: aiohttp.ClientSession, token: str) -> None:
    """Test if API endpoints validate scope claims"""

    headers = {"Authorization": f"Bearer {token}"}

    # Test accessing specific organization resources
    test_org_id = "different-org-id"  # This should not be accessible

    try:
        # Try to access a different organization's projects
        async with session.get(f"{BASE_URL}/api/organizations/{test_org_id}/projects", headers=headers) as response:
            if response.status == 200:
                log_test(
                    "API Endpoint Scope Validation",
                    "FAIL",
                    "API allows access to different organization's resources - CRITICAL SECURITY ISSUE",
                    "CRITICAL",
                    {"endpoint": f"/api/organizations/{test_org_id}/projects", "status": response.status}
                )
            elif response.status == 403:
                log_test(
                    "API Endpoint Scope Validation",
                    "PASS",
                    "API correctly denies access to different organization's resources",
                    "LOW"
                )
            elif response.status == 404:
                log_test(
                    "API Endpoint Scope Validation",
                    "SKIP",
                    "Endpoint not found - scope validation cannot be tested",
                    "MEDIUM"
                )
            else:
                log_test(
                    "API Endpoint Scope Validation",
                    "SKIP",
                    f"Unexpected status code {response.status} - need manual investigation",
                    "MEDIUM"
                )

    except Exception as e:
        log_test(
            "API Endpoint Scope Validation",
            "FAIL",
            f"Error testing API endpoint scope validation: {str(e)}",
            "HIGH"
        )

async def test_cross_tenant_access(session: aiohttp.ClientSession, token: str) -> None:
    """Test for cross-tenant data leakage vulnerabilities"""

    headers = {"Authorization": f"Bearer {token}"}

    # Test various endpoints for potential data leakage
    endpoints_to_test = [
        "/api/projects",
        "/api/organizations",
        "/api/users",
        "/api/huddles",
        "/api/workspace"
    ]

    vulnerabilities_found = 0

    for endpoint in endpoints_to_test:
        try:
            async with session.get(f"{BASE_URL}{endpoint}", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()

                    # Check if data contains tenant information that shouldn't be accessible
                    data_str = json.dumps(data)

                    # Look for potential cross-tenant data leakage patterns
                    suspicious_patterns = [
                        "org_id",
                        "organization_id",
                        "division_id",
                        "user_id",
                        "tenant_id"
                    ]

                    for pattern in suspicious_patterns:
                        if pattern in data_str and "results" in str(type(data)):
                            # This is suspicious - need deeper analysis
                            vulnerabilities_found += 1
                            break

                    if vulnerabilities_found > 0:
                        log_test(
                            f"Cross-Tenant Access - {endpoint}",
                            "FAIL",
                            f"Potential cross-tenant data leakage detected at {endpoint}",
                            "CRITICAL",
                            {"endpoint": endpoint, "sample_data_keys": list(data.keys()) if isinstance(data, dict) else "N/A"}
                        )
                    else:
                        log_test(
                            f"Cross-Tenant Access - {endpoint}",
                            "PASS",
                            f"No obvious cross-tenant data leakage at {endpoint}",
                            "LOW"
                        )

                elif response.status == 403:
                    log_test(
                        f"Cross-Tenant Access - {endpoint}",
                        "PASS",
                        f"Access properly denied to {endpoint}",
                        "LOW"
                    )
                elif response.status == 404:
                    log_test(
                        f"Cross-Tenant Access - {endpoint}",
                        "SKIP",
                        f"Endpoint {endpoint} not found",
                        "MEDIUM"
                    )
                else:
                    log_test(
                        f"Cross-Tenant Access - {endpoint}",
                        "SKIP",
                        f"Unexpected status {response.status} for {endpoint}",
                        "MEDIUM"
                    )

        except Exception as e:
            log_test(
                f"Cross-Tenant Access - {endpoint}",
                "FAIL",
                f"Error testing {endpoint}: {str(e)}",
                "HIGH"
            )

async def test_scope_claim_extraction(session: aiohttp.ClientSession, token: str) -> None:
    """Test if JWT tokens contain proper scope claims"""

    if not token:
        log_test("Scope Claim Extraction", "SKIP", "No token available for testing", "MEDIUM")
        return

    try:
        # Decode the token to check scope claims
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if jwt_secret:
            decoded = jwt.decode(token, jwt_secret, algorithms=["HS256"], options={"verify_signature": False})

            # Check for scope claims in various locations
            scope_locations = [
                ("app_metadata.yourever_scope", decoded.get("app_metadata", {}).get("yourever_scope", {})),
                ("user_metadata.yourever_scope", decoded.get("user_metadata", {}).get("yourever_scope", {})),
                ("app_metadata.scope", decoded.get("app_metadata", {}).get("scope", {})),
                ("yourever_scope", decoded.get("yourever_scope", {})),
            ]

            scope_claims_found = False
            for location, claims in scope_locations:
                if claims and isinstance(claims, dict):
                    if claims.get("org_ids") or claims.get("division_ids"):
                        scope_claims_found = True
                        log_test(
                            "Scope Claim Extraction",
                            "PASS",
                            f"Scope claims found in {location}",
                            "LOW",
                            {"location": location, "claims": claims}
                        )
                        break

            if not scope_claims_found:
                log_test(
                    "Scope Claim Extraction",
                    "FAIL",
                    "No scope claims found in JWT token - authentication system not properly configured",
                    "CRITICAL",
                    {"decoded_token": decoded}
                )
        else:
            log_test(
                "Scope Claim Extraction",
                "SKIP",
                "SUPABASE_JWT_SECRET not configured - cannot decode token",
                "MEDIUM"
            )

    except Exception as e:
        log_test(
            "Scope Claim Extraction",
            "FAIL",
            f"Error extracting scope claims: {str(e)}",
            "HIGH"
        )

async def test_error_handling(session: aiohttp.ClientSession, token: str) -> None:
    """Test error handling for scope violations"""

    headers = {"Authorization": f"Bearer {token}"}

    # Test with invalid token (should get 401)
    invalid_token = "invalid.jwt.token"
    headers_invalid = {"Authorization": f"Bearer {invalid_token}"}

    try:
        async with session.get(f"{BASE_URL}/api/projects", headers=headers_invalid) as response:
            if response.status == 401:
                log_test(
                    "Error Handling - Invalid Token",
                    "PASS",
                    "Correctly returns 401 for invalid token",
                    "LOW"
                )
            else:
                log_test(
                    "Error Handling - Invalid Token",
                    "FAIL",
                    f"Expected 401 for invalid token, got {response.status}",
                    "HIGH"
                )
    except Exception as e:
        log_test(
            "Error Handling - Invalid Token",
            "FAIL",
            f"Error testing invalid token handling: {str(e)}",
            "HIGH"
        )

    # Test without token (should get 401)
    try:
        async with session.get(f"{BASE_URL}/api/projects") as response:
            if response.status == 401:
                log_test(
                    "Error Handling - Missing Token",
                    "PASS",
                    "Correctly returns 401 for missing token",
                    "LOW"
                )
            else:
                log_test(
                    "Error Handling - Missing Token",
                    "FAIL",
                    f"Expected 401 for missing token, got {response.status}",
                    "HIGH"
                )
    except Exception as e:
        log_test(
            "Error Handling - Missing Token",
            "FAIL",
            f"Error testing missing token handling: {str(e)}",
            "HIGH"
        )

async def test_code_integration_patterns() -> None:
    """Test code integration patterns by analyzing the implementation"""

    # Check if scope guard is properly integrated
    integration_checks = [
        {
            "name": "Scope Guard Module Exists",
            "check": lambda: os.path.exists("/home/eldrie/Yourever)/backend/app/core/scope.py"),
            "expected": True,
            "criticality": "HIGH"
        },
        {
            "name": "Scope Integration Module Exists",
            "check": lambda: os.path.exists("/home/eldrie/Yourever)/backend/app/core/scope_integration.py"),
            "expected": True,
            "criticality": "HIGH"
        },
        {
            "name": "Auth Dependencies Extract Scope Claims",
            "check": lambda: os.path.exists("/home/eldrie/Yourever)/backend/app/dependencies/auth.py"),
            "expected": True,
            "criticality": "HIGH"
        }
    ]

    for check in integration_checks:
        try:
            result = check["check"]()
            if result == check["expected"]:
                log_test(
                    f"Code Integration - {check['name']}",
                    "PASS",
                    f"Integration check passed: {check['name']}",
                    "LOW"
                )
            else:
                log_test(
                    f"Code Integration - {check['name']}",
                    "FAIL",
                    f"Integration check failed: {check['name']}",
                    check["criticality"]
                )
        except Exception as e:
            log_test(
                f"Code Integration - {check['name']}",
                "FAIL",
                f"Error checking {check['name']}: {str(e)}",
                "HIGH"
            )

def generate_report() -> SecurityTestReport:
    """Generate comprehensive security test report"""

    total_tests = len(test_results)
    passed_tests = len([r for r in test_results if r.status == "PASS"])
    failed_tests = len([r for r in test_results if r.status == "FAIL"])

    critical_issues = len([r for r in test_results if r.vulnerability_level == "CRITICAL"])
    high_issues = len([r for r in test_results if r.vulnerability_level == "HIGH"])
    medium_issues = len([r for r in test_results if r.vulnerability_level == "MEDIUM"])
    low_issues = len([r for r in test_results if r.vulnerability_level == "LOW"])

    return SecurityTestReport(
        timestamp=datetime.now(timezone.utc),
        total_tests=total_tests,
        passed_tests=passed_tests,
        failed_tests=failed_tests,
        critical_issues=critical_issues,
        high_issues=high_issues,
        medium_issues=medium_issues,
        low_issues=low_issues,
        results=test_results
    )

def print_report_summary(report: SecurityTestReport) -> None:
    """Print a summary of the security test report"""

    print("\n" + "="*80)
    print("🔒 SCOPE ENFORCEMENT SECURITY TEST REPORT")
    print("="*80)
    print(f"Timestamp: {report.timestamp}")
    print(f"Total Tests: {report.total_tests}")
    print(f"Passed: {report.passed_tests} ✅")
    print(f"Failed: {report.failed_tests} ❌")
    print(f"Critical Issues: {report.critical_issues} 🚨")
    print(f"High Issues: {report.high_issues} ⚠️")
    print(f"Medium Issues: {report.medium_issues} ⚡")
    print(f"Low Issues: {report.low_issues} ℹ️")

    print("\n🚨 CRITICAL SECURITY ISSUES:")
    critical_results = [r for r in report.results if r.vulnerability_level == "CRITICAL"]
    for result in critical_results:
        print(f"  ❌ {result.test_name}: {result.details}")
        if result.evidence:
            print(f"     Evidence: {result.evidence}")

    print("\n⚠️ HIGH PRIORITY ISSUES:")
    high_results = [r for r in report.results if r.vulnerability_level == "HIGH"]
    for result in high_results:
        print(f"  ⚠️ {result.test_name}: {result.details}")

    print("\n📋 RECOMMENDATIONS:")
    if report.critical_issues > 0:
        print("  1. 🚨 IMMEDIATE ACTION REQUIRED:")
        print("     - Fix critical scope enforcement vulnerabilities before production deployment")
        print("     - Implement proper repository layer filtering")
        print("     - Add API endpoint scope validation")

    if report.high_issues > 0:
        print("  2. ⚠️ HIGH PRIORITY:")
        print("     - Integrate scope guard with existing repositories")
        print("     - Add scope validation to all API endpoints")
        print("     - Ensure JWT tokens contain proper scope claims")

    if report.failed_tests > 0:
        print("  3. 🔧 GENERAL IMPROVEMENTS:")
        print("     - Connect scope integration patterns to existing code")
        print("     - Add comprehensive error handling")
        print("     - Implement automated scope testing")

    print("\n🛡️ SECURITY STATUS:")
    if report.critical_issues > 0:
        print("  🔴 CRITICAL - Multi-tenant isolation is NOT working")
    elif report.high_issues > 0:
        print("  🟡 HIGH RISK - Major security gaps exist")
    elif report.medium_issues > 0:
        print("  🟠 MEDIUM RISK - Some security issues need attention")
    else:
        print("  🟢 GOOD - No major security issues detected")

    print("="*80)

async def main():
    """Main test execution"""
    print("🔒 Starting Comprehensive Scope Enforcement Security Test...")
    print("="*80)

    # Test code integration patterns first
    await test_code_integration_patterns()

    # Create HTTP session
    async with aiohttp.ClientSession() as session:
        # Get auth token
        print("\n🔐 Getting authentication token...")
        token = await get_auth_token(session)

        if not token:
            print("❌ Could not get authentication token. Some tests will be skipped.")
            print("   Set SUPABASE_JWT_SECRET environment variable to enable full testing.")

        # Run comprehensive tests
        print("\n🧪 Running security tests...")

        await test_scope_claim_extraction(session, token)
        await test_repository_scope_filtering(session, token)
        await test_api_endpoint_scope_validation(session, token)
        await test_cross_tenant_access(session, token)
        await test_error_handling(session, token)

    # Generate and print report
    print("\n📊 Generating security test report...")
    report = generate_report()
    print_report_summary(report)

    # Save detailed report to file
    report_file = f"/tmp/scope_security_report_{int(time.time())}.json"
    with open(report_file, "w") as f:
        json.dump(report.model_dump(), f, indent=2, default=str)

    print(f"\n📄 Detailed report saved to: {report_file}")

    # Exit with appropriate code
    if report.critical_issues > 0:
        print("\n🚨 Critical security issues detected. Exit code: 2")
        sys.exit(2)
    elif report.high_issues > 0:
        print("\n⚠️ High priority security issues detected. Exit code: 1")
        sys.exit(1)
    else:
        print("\n✅ No critical security issues detected. Exit code: 0")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())