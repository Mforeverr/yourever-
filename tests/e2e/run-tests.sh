#!/bin/bash

# Comprehensive E2E Test Runner for Workspace Components
# This script sets up the environment and runs Playwright tests

set -e

echo "🚀 Starting Workspace Components E2E Tests..."
echo "============================================="

# Configuration
BASE_URL=${TEST_BASE_URL:-"http://localhost:3000"}
HEADED=${HEADED:-"false"}
BROWSER=${BROWSER:-"chromium"}
TEST_TIMEOUT=${TEST_TIMEOUT:-"60000"}

echo "📡 Base URL: $BASE_URL"
echo "🖥️  Browser: $BROWSER"
echo "🖥️  Headed mode: $HEADED"
echo "⏱️  Test timeout: ${TEST_TIMEOUT}ms"

# Ensure test results directory exists
mkdir -p test-results

# Check if the application is running
echo "🔍 Checking if application is running at $BASE_URL..."
if curl -s --max-time 10 "$BASE_URL" > /dev/null; then
    echo "✅ Application is running"
else
    echo "❌ Application is not running at $BASE_URL"
    echo "Please start the application first: npm run dev"
    exit 1
fi

# Install Playwright browsers if needed
echo "📦 Checking Playwright browsers..."
if ! npx playwright --version > /dev/null 2>&1; then
    echo "📦 Installing Playwright..."
    npx playwright install
fi

# Set environment variables
export TEST_BASE_URL="$BASE_URL"
export TEST_TIMEOUT="$TEST_TIMEOUT"

# Run tests based on parameters
echo ""
echo "🧪 Running E2E Tests..."
echo "======================="

if [ "$BROWSER" = "all" ]; then
    echo "🌐 Running tests on all browsers..."
    npx playwright test --project=chromium --project=firefox --project=webkit --timeout="$TEST_TIMEOUT"
else
    echo "🖥️  Running tests on $BROWSER..."
    npx playwright test --project="$BROWSER" --timeout="$TEST_TIMEOUT"
fi

echo ""
echo "📊 Test Results Summary:"
echo "======================="

# Generate HTML report
echo "📈 Generating HTML report..."
npx playwright show-report

# Display test results summary
if [ -f "test-results/results.json" ]; then
    echo "📋 Detailed results available in: test-results/results.json"
fi

echo ""
echo "📁 Artifacts saved in: test-results/"
echo "🌐 HTML report available at: playwright-report/index.html"

echo ""
echo "✅ E2E tests completed!"
echo "======================="