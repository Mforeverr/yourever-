#!/usr/bin/env python3
"""
Author: Eldrie (CTO Dev)
Date: 2025-10-20
Role: Integration Testing

Comprehensive security test runner and report generator.

This script executes all security tests and generates a detailed
report on the security validation results of the P0 fixes.
"""

import asyncio
import json
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
import subprocess
import sys
import os

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class SecurityTestRunner:
    """Comprehensive security test runner."""

    def __init__(self, test_dir: Path = None):
        self.test_dir = test_dir or Path(__file__).parent
        self.results = {
            "test_run": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_seconds": 0,
                "python_version": sys.version,
                "platform": os.name
            },
            "summary": {
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "skipped_tests": 0,
                "error_tests": 0,
                "success_rate": 0.0
            },
            "categories": {
                "cross_tenant_security": {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "errors": 0,
                    "tests": []
                },
                "division_scope_security": {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "errors": 0,
                    "tests": []
                },
                "api_endpoint_security": {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "errors": 0,
                    "tests": []
                },
                "service_layer_security": {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "errors": 0,
                    "tests": []
                },
                "url_manipulation_security": {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "errors": 0,
                    "tests": []
                },
                "session_management_security": {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "errors": 0,
                    "tests": []
                }
            },
            "security_violations": [],
            "performance_metrics": {},
            "recommendations": [],
            "detailed_results": []
        }

    def run_test_category(self, category_name: str, test_file: str) -> Dict[str, Any]:
        """Run a specific test category and return results."""
        print(f"\n{'='*60}")
        print(f"Running {category_name.replace('_', ' ').title()}")
        print(f"{'='*60}")

        start_time = time.time()

        try:
            # Run pytest with JSON output
            cmd = [
                sys.executable, "-m", "pytest",
                str(test_file),
                "-v",
                "--tb=short",
                "--json-report",
                "--json-report-file=/tmp/test_results.json"
            ]

            result = subprocess.run(
                cmd,
                cwd=self.test_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            duration = time.time() - start_time

            # Parse results
            test_results = self._parse_pytest_output(result.stdout, result.stderr, result.returncode)

            return {
                "category": category_name,
                "duration_seconds": duration,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "test_results": test_results
            }

        except subprocess.TimeoutExpired:
            return {
                "category": category_name,
                "duration_seconds": 300,
                "return_code": -1,
                "error": "Test execution timed out after 5 minutes",
                "test_results": {"total": 0, "passed": 0, "failed": 0, "skipped": 0, "errors": 1}
            }
        except Exception as e:
            return {
                "category": category_name,
                "duration_seconds": time.time() - start_time,
                "return_code": -1,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "test_results": {"total": 0, "passed": 0, "failed": 0, "skipped": 0, "errors": 1}
            }

    def _parse_pytest_output(self, stdout: str, stderr: str, return_code: int) -> Dict[str, int]:
        """Parse pytest output to extract test counts."""
        import re

        # Look for test summary in output
        summary_pattern = r"(\d+) passed, (\d+) failed, (\d+) skipped(?:, (\d+) error(?:s)?)?"
        summary_match = re.search(summary_pattern, stdout)

        if summary_match:
            passed = int(summary_match.group(1))
            failed = int(summary_match.group(2))
            skipped = int(summary_match.group(3))
            errors = int(summary_match.group(4) or 0)
            total = passed + failed + skipped + errors
        else:
            # Fallback parsing
            total = len(re.findall(r"test_\w+::", stdout))
            passed = len(re.findall(r"PASSED", stdout))
            failed = len(re.findall(r"FAILED", stdout))
            skipped = len(re.findall(r"SKIPPED", stdout))
            errors = len(re.findall(r"ERROR", stdout))

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "errors": errors
        }

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all security test categories."""
        print("🔒 Starting Comprehensive Security Test Suite")
        print(f"📅 Test Run: {self.results['test_run']['timestamp']}")
        print(f"🐍 Python: {self.results['test_run']['python_version']}")
        print(f"💻 Platform: {self.results['test_run']['platform']}")

        start_time = time.time()

        # Define test categories
        test_categories = [
            ("cross_tenant_security", "test_cross_tenant_security.py"),
            ("division_scope_security", "test_division_scope_security.py"),
            ("api_endpoint_security", "test_api_endpoint_security.py"),
            ("service_layer_security", "test_service_layer_security.py"),
            ("url_manipulation_security", "test_url_manipulation_security.py"),
            ("session_management_security", "test_session_management_security.py")
        ]

        # Run each test category
        for category_name, test_file in test_categories:
            test_file_path = self.test_dir / test_file

            if not test_file_path.exists():
                print(f"⚠️  Test file not found: {test_file_path}")
                continue

            result = self.run_test_category(category_name, str(test_file_path))

            # Update results
            self.results["categories"][category_name].update(result["test_results"])
            self.results["categories"][category_name]["duration_seconds"] = result["duration_seconds"]
            self.results["detailed_results"].append(result)

            # Print category summary
            self._print_category_summary(category_name, result["test_results"])

        # Calculate overall summary
        self._calculate_summary()

        # Update test run duration
        self.results["test_run"]["duration_seconds"] = time.time() - start_time

        # Generate recommendations
        self._generate_recommendations()

        return self.results

    def _print_category_summary(self, category_name: str, test_results: Dict[str, int]):
        """Print summary for a test category."""
        total = test_results["total"]
        passed = test_results["passed"]
        failed = test_results["failed"]
        skipped = test_results["skipped"]
        errors = test_results["errors"]

        if total == 0:
            print(f"❌ {category_name}: No tests executed")
            return

        success_rate = (passed / total) * 100 if total > 0 else 0

        print(f"\n📊 {category_name.replace('_', ' ').title()} Results:")
        print(f"   Total: {total}")
        print(f"   ✅ Passed: {passed}")
        print(f"   ❌ Failed: {failed}")
        print(f"   ⏭️  Skipped: {skipped}")
        print(f"   🚨 Errors: {errors}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")

        if failed > 0 or errors > 0:
            print(f"   ⚠️  Status: {'FAILED' if failed > 0 else 'ERRORS'}")
        else:
            print(f"   ✅ Status: PASSED")

    def _calculate_summary(self):
        """Calculate overall test summary."""
        total = 0
        passed = 0
        failed = 0
        skipped = 0
        errors = 0

        for category_data in self.results["categories"].values():
            total += category_data["total"]
            passed += category_data["passed"]
            failed += category_data["failed"]
            skipped += category_data["skipped"]
            errors += category_data["errors"]

        self.results["summary"] = {
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": failed,
            "skipped_tests": skipped,
            "error_tests": errors,
            "success_rate": (passed / total * 100) if total > 0 else 0.0
        }

    def _generate_recommendations(self):
        """Generate security recommendations based on test results."""
        recommendations = []

        # Check for failed tests
        total_failed = self.results["summary"]["failed_tests"]
        total_errors = self.results["summary"]["error_tests"]

        if total_failed > 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "test_failures",
                "title": "Security Tests Failed",
                "description": f"{total_failed} security tests failed. These failures indicate potential security vulnerabilities.",
                "action": "Review and fix all failed security tests before deploying to production."
            })

        if total_errors > 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "test_errors",
                "title": "Security Test Errors",
                "description": f"{total_errors} security tests encountered errors. These may indicate issues with test setup or actual security problems.",
                "action": "Investigate and resolve all test errors."
            })

        # Category-specific recommendations
        for category_name, category_data in self.results["categories"].items():
            if category_data["failed"] > 0:
                recommendations.append({
                    "priority": "HIGH",
                    "category": category_name,
                    "title": f"{category_name.replace('_', ' ').title()} Issues",
                    "description": f"{category_data['failed']} tests failed in {category_name}.",
                    "action": f"Review {category_name} implementation and fix security issues."
                })

        # Success rate recommendations
        success_rate = self.results["summary"]["success_rate"]
        if success_rate < 100:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "coverage",
                "title": "Incomplete Security Coverage",
                "description": f"Security test success rate is {success_rate:.1f}%. Aim for 100% security test coverage.",
                "action": "Address all security test failures to ensure comprehensive protection."
            })

        if success_rate == 100:
            recommendations.append({
                "priority": "INFO",
                "category": "success",
                "title": "All Security Tests Passed",
                "description": "All security tests passed successfully. The scope enforcement system appears to be working correctly.",
                "action": "Continue to maintain security test coverage and add tests for new features."
            })

        self.results["recommendations"] = recommendations

    def generate_report(self, output_file: Optional[str] = None) -> str:
        """Generate comprehensive security test report."""
        if output_file is None:
            output_file = f"security_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        report_path = Path(output_file)

        # Add security validation summary
        self._add_security_validation_summary()

        # Write JSON report
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        # Generate markdown report
        markdown_file = report_path.with_suffix('.md')
        self._generate_markdown_report(markdown_file)

        return str(report_path)

    def _add_security_validation_summary(self):
        """Add security validation summary to results."""
        self.results["security_validation"] = {
            "p0_fixes_validated": {
                "multi_tenant_isolation": self._validate_category("cross_tenant_security"),
                "division_level_enforcement": self._validate_category("division_scope_security"),
                "api_endpoint_security": self._validate_category("api_endpoint_security"),
                "service_layer_validation": self._validate_category("service_layer_security"),
                "url_manipulation_protection": self._validate_category("url_manipulation_security"),
                "session_management_security": self._validate_category("session_management_security")
            },
            "overall_security_status": "SECURE" if self.results["summary"]["success_rate"] == 100 else "NEEDS_ATTENTION",
            "critical_issues": self._count_critical_issues(),
            "security_coverage": f"{self.results['summary']['success_rate']:.1f}%"
        }

    def _validate_category(self, category_name: str) -> bool:
        """Validate if a security category passed all tests."""
        category_data = self.results["categories"].get(category_name, {})
        return (category_data.get("total", 0) > 0 and
                category_data.get("failed", 0) == 0 and
                category_data.get("errors", 0) == 0)

    def _count_critical_issues(self) -> int:
        """Count critical security issues."""
        critical_issues = 0
        for category_data in self.results["categories"].values():
            critical_issues += category_data.get("failed", 0)
            critical_issues += category_data.get("errors", 0)
        return critical_issues

    def _generate_markdown_report(self, output_file: Path):
        """Generate markdown report."""
        with open(output_file, 'w') as f:
            f.write("# 🔒 Comprehensive Security Test Report\n\n")
            f.write(f"**Generated:** {self.results['test_run']['timestamp']}\n")
            f.write(f"**Duration:** {self.results['test_run']['duration_seconds']:.2f} seconds\n\n")

            # Executive Summary
            f.write("## 📋 Executive Summary\n\n")
            summary = self.results["summary"]
            f.write(f"- **Total Tests:** {summary['total_tests']}\n")
            f.write(f"- **Passed:** ✅ {summary['passed_tests']}\n")
            f.write(f"- **Failed:** ❌ {summary['failed_tests']}\n")
            f.write(f"- **Errors:** 🚨 {summary['error_tests']}\n")
            f.write(f"- **Success Rate:** {summary['success_rate']:.1f}%\n\n")

            # Security Status
            security_status = self.results["security_validation"]["overall_security_status"]
            status_emoji = "✅" if security_status == "SECURE" else "⚠️"
            f.write(f"**Overall Security Status:** {status_emoji} {security_status}\n\n")

            # P0 Fixes Validation
            f.write("## 🛡️ P0 Security Fixes Validation\n\n")
            p0_fixes = self.results["security_validation"]["p0_fixes_validated"]
            for fix_name, status in p0_fixes.items():
                status_emoji = "✅" if status else "❌"
                f.write(f"- {status_emoji} **{fix_name.replace('_', ' ').title()}:** {'VALIDATED' if status else 'FAILED'}\n")
            f.write("\n")

            # Category Results
            f.write("## 📊 Test Category Results\n\n")
            for category_name, category_data in self.results["categories"].items():
                if category_data["total"] == 0:
                    continue

                f.write(f"### {category_name.replace('_', ' ').title()}\n\n")
                f.write(f"- **Total:** {category_data['total']}\n")
                f.write(f"- **Passed:** ✅ {category_data['passed']}\n")
                f.write(f"- **Failed:** ❌ {category_data['failed']}\n")
                f.write(f"- **Errors:** 🚨 {category_data['errors']}\n")
                f.write(f"- **Duration:** {category_data.get('duration_seconds', 0):.2f}s\n\n")

            # Recommendations
            if self.results["recommendations"]:
                f.write("## 🎯 Security Recommendations\n\n")
                for rec in self.results["recommendations"]:
                    priority_emoji = {"HIGH": "🚨", "MEDIUM": "⚠️", "INFO": "ℹ️"}.get(rec["priority"], "📝")
                    f.write(f"### {priority_emoji} {rec['title']} ({rec['priority']})\n\n")
                    f.write(f"**Description:** {rec['description']}\n\n")
                    f.write(f"**Action:** {rec['action']}\n\n")

            # Detailed Results
            f.write("## 📋 Detailed Test Results\n\n")
            for result in self.results["detailed_results"]:
                f.write(f"### {result['category'].replace('_', ' ').title()}\n\n")
                if "error" in result:
                    f.write(f"**Error:** {result['error']}\n\n")
                    if "traceback" in result:
                        f.write("```\n" + result['traceback'] + "\n```\n\n")
                else:
                    f.write(f"**Return Code:** {result['return_code']}\n")
                    f.write(f"**Duration:** {result['duration_seconds']:.2f}s\n\n")

            # Conclusion
            f.write("## 🏁 Conclusion\n\n")
            if summary["success_rate"] == 100:
                f.write("✅ **All security tests passed!** The scope enforcement system is working correctly and providing robust multi-tenant security.\n\n")
            else:
                f.write(f"⚠️ **Security issues detected!** {summary['failed_tests'] + summary['error_tests']} tests failed or encountered errors. These issues must be addressed before deploying to production.\n\n")

            f.write("This comprehensive security test suite validates the P0 security fixes for multi-tenant isolation, scope enforcement, and access control. Regular execution of these tests ensures continued security compliance.\n")


def main():
    """Main function to run security tests."""
    print("🔒 Comprehensive Security Test Suite")
    print("=" * 50)

    # Change to tests directory
    test_dir = Path(__file__).parent
    os.chdir(test_dir)

    # Create test runner
    runner = SecurityTestRunner(test_dir)

    # Run all tests
    results = runner.run_all_tests()

    # Print final summary
    print("\n" + "=" * 60)
    print("🏁 FINAL SECURITY TEST SUMMARY")
    print("=" * 60)

    summary = results["summary"]
    print(f"📊 Total Tests: {summary['total_tests']}")
    print(f"✅ Passed: {summary['passed_tests']}")
    print(f"❌ Failed: {summary['failed_tests']}")
    print(f"🚨 Errors: {summary['error_tests']}")
    print(f"📈 Success Rate: {summary['success_rate']:.1f}%")

    if summary["success_rate"] == 100:
        print("\n🎉 All security tests PASSED! The system is secure.")
    else:
        print(f"\n⚠️  {summary['failed_tests'] + summary['error_tests']} security issues found!")
        print("🚨 Address these issues before production deployment.")

    # Generate reports
    print("\n📄 Generating reports...")
    report_file = runner.generate_report()
    markdown_file = Path(report_file).with_suffix('.md')

    print(f"📄 JSON Report: {report_file}")
    print(f"📄 Markdown Report: {markdown_file}")

    # Exit with appropriate code
    if summary["success_rate"] == 100:
        print("\n✅ Security validation completed successfully.")
        sys.exit(0)
    else:
        print("\n❌ Security validation failed. See reports for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()