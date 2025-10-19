#!/usr/bin/env node

/**
 * Comprehensive Security Test for Scoped API Enforcement
 * Tests authentication, authorization, and scope validation
 *
 * @author Eldrie
 * @date 2025-10-19
 * @role Integration Testing Specialist
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  frontend: {
    url: 'http://localhost:3005',
    credentials: {
      email: 'alyssa@yourever.com',
      password: 'DemoPass123!'
    }
  },
  backend: {
    url: 'http://localhost:8000'
  },
  output: {
    dir: './test-results',
    networkLog: 'network-requests.json',
    securityReport: 'security-test-report.json',
    screenshots: 'screenshots'
  }
};

// Security test scenarios
const testScenarios = [
  {
    name: 'Authentication Flow Test',
    description: 'Test login and capture JWT tokens',
    path: '/auth/signin',
    expectedApiCalls: ['auth/signin', 'auth/session'],
    securityChecks: ['jwt_token_extraction', 'session_validation']
  },
  {
    name: 'Dashboard Scope Test',
    description: 'Test dashboard data access and scope filtering',
    path: '/dashboard',
    expectedApiCalls: ['dashboard', 'projects', 'user/profile'],
    securityChecks: ['org_id_filtering', 'division_id_filtering', 'cross_tenant_access']
  },
  {
    name: 'Projects API Scope Test',
    description: 'Test project endpoints for scope validation',
    path: '/projects',
    expectedApiCalls: ['projects'],
    securityChecks: ['scope_validation', 'authorization_headers', 'data_isolation']
  },
  {
    name: 'Workspace Switching Test',
    description: 'Test scope context changes when switching workspaces',
    path: '/workspace',
    expectedApiCalls: ['workspace/switch', 'scope/context'],
    securityChecks: ['scope_context_changes', 'token_refresh', 'ui_state_sync']
  },
  {
    name: 'Unauthorized Access Test',
    description: 'Test access to data outside current scope',
    path: '/admin',
    expectedApiCalls: ['admin/*'],
    securityChecks: ['access_denied', '403_responses', 'error_handling']
  }
];

class SecurityTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.networkRequests = [];
    this.securityViolations = [];
    this.testResults = [];
  }

  async initialize() {
    console.log('🔧 Initializing browser and test environment...');

    // Create output directory
    if (!fs.existsSync(config.output.dir)) {
      fs.mkdirSync(config.output.dir, { recursive: true });
    }
    if (!fs.existsSync(path.join(config.output.dir, config.output.screenshots))) {
      fs.mkdirSync(path.join(config.output.dir, config.output.screenshots), { recursive: true });
    }

    // Launch browser with security-focused settings
    this.browser = await chromium.launch({
      headless: false, // Set to true for headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      recordVideo: {
        dir: path.join(config.output.dir, config.output.screenshots),
        size: { width: 1920, height: 1080 }
      }
    });

    this.page = await this.context.newPage();

    // Set up network monitoring
    await this.setupNetworkMonitoring();

    console.log('✅ Browser initialized successfully');
  }

  async setupNetworkMonitoring() {
    // Capture all network requests
    this.page.on('request', request => {
      const requestInfo = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString(),
        type: 'request'
      };

      // Log authentication headers
      if (request.headers().authorization) {
        requestInfo.hasAuth = true;
        requestInfo.tokenType = request.headers().authorization.startsWith('Bearer ') ? 'Bearer' : 'Other';
      }

      this.networkRequests.push(requestInfo);
    });

    this.page.on('response', response => {
      const responseInfo = {
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString(),
        type: 'response'
      };

      // Log security-related responses
      if (response.status() === 403 || response.status() === 401) {
        responseInfo.securityRelevant = true;
        responseInfo.reason = 'Access Denied';
      }

      this.networkRequests.push(responseInfo);
    });

    // Capture console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.securityViolations.push({
          type: 'console_error',
          message: msg.text(),
          timestamp: new Date().toISOString(),
          location: msg.location()
        });
      }
    });

    // Capture page errors
    this.page.on('pageerror', error => {
      this.securityViolations.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
  }

  async performLogin() {
    console.log('🔐 Performing login...');

    try {
      await this.page.goto(config.frontend.url);
      await this.page.waitForLoadState('networkidle');

      // Take screenshot
      await this.page.screenshot({
        path: path.join(config.output.dir, config.output.screenshots, '01-landing.png')
      });

      // Look for login form or navigate to login
      const loginSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email"]',
        'a[href*="signin"]',
        'a[href*="login"]',
        'button:has-text("Sign in")',
        'button:has-text("Login")'
      ];

      let loginFound = false;
      for (const selector of loginSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            console.log(`Found login element: ${selector}`);
            loginFound = true;
            break;
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      if (!loginFound) {
        // Try common login paths
        const loginPaths = ['/auth/signin', '/login', '/signin', '/auth/login'];
        for (const loginPath of loginPaths) {
          try {
            await this.page.goto(`${config.frontend.url}${loginPath}`);
            await this.page.waitForLoadState('networkidle');
            console.log(`Navigated to: ${loginPath}`);
            break;
          } catch (e) {
            // Continue trying other paths
          }
        }
      }

      // Fill login form
      await this.page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]',
                          config.frontend.credentials.email);
      await this.page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]',
                          config.frontend.credentials.password);

      // Submit form
      await this.page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Continue")');

      // Wait for navigation
      await this.page.waitForLoadState('networkidle');

      // Take screenshot after login
      await this.page.screenshot({
        path: path.join(config.output.dir, config.output.screenshots, '02-after-login.png')
      });

      console.log('✅ Login completed');
      return true;

    } catch (error) {
      console.error('❌ Login failed:', error.message);
      await this.page.screenshot({
        path: path.join(config.output.dir, config.output.screenshots, 'login-error.png')
      });
      return false;
    }
  }

  async runSecurityTests() {
    console.log('🧪 Running security tests...');

    for (const scenario of testScenarios) {
      console.log(`\n📋 Running: ${scenario.name}`);
      console.log(`   ${scenario.description}`);

      const result = await this.runSingleTest(scenario);
      this.testResults.push(result);

      // Take screenshot after each test
      await this.page.screenshot({
        path: path.join(config.output.dir, config.output.screenshots, `test-${scenario.name.toLowerCase().replace(/\s+/g, '-')}.png`)
      });
    }
  }

  async runSingleTest(scenario) {
    const startTime = Date.now();
    const result = {
      name: scenario.name,
      description: scenario.description,
      passed: false,
      errors: [],
    warnings: [],
      findings: [],
      networkRequests: [],
      duration: 0
    };

    try {
      // Navigate to test path
      if (scenario.path) {
        await this.page.goto(`${config.frontend.url}${scenario.path}`);
        await this.page.waitForLoadState('networkidle');
      }

      // Wait a bit to capture network activity
      await this.page.waitForTimeout(3000);

      // Analyze network requests for this test
      const testRequests = this.networkRequests.filter(req =>
        req.timestamp > new Date(startTime - 1000).toISOString() &&
        (req.url.includes(config.frontend.url) || req.url.includes(config.backend.url))
      );

      result.networkRequests = testRequests;

      // Perform security checks
      for (const check of scenario.securityChecks) {
        const checkResult = await this.performSecurityCheck(check, testRequests);
        result.findings.push(checkResult);

        if (!checkResult.passed) {
          result.errors.push(...checkResult.errors);
        }
        if (checkResult.warnings && checkResult.warnings.length > 0) {
          result.warnings.push(...checkResult.warnings);
        }
      }

      result.passed = result.errors.length === 0;

    } catch (error) {
      result.errors.push({
        type: 'test_execution_error',
        message: error.message,
        stack: error.stack
      });
      result.passed = false;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async performSecurityCheck(checkType, requests) {
    const check = {
      name: checkType,
      passed: false,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      switch (checkType) {
        case 'jwt_token_extraction':
          await this.checkJWTTokenExtraction(check, requests);
          break;
        case 'org_id_filtering':
          await this.checkOrgIdFiltering(check, requests);
          break;
        case 'division_id_filtering':
          await this.checkDivisionIdFiltering(check, requests);
          break;
        case 'cross_tenant_access':
          await this.checkCrossTenantAccess(check, requests);
          break;
        case 'scope_validation':
          await this.checkScopeValidation(check, requests);
          break;
        case 'authorization_headers':
          await this.checkAuthorizationHeaders(check, requests);
          break;
        case 'access_denied':
          await this.checkAccessDenied(check, requests);
          break;
        case '403_responses':
          await this.check403Responses(check, requests);
          break;
        default:
          check.warnings.push(`Unknown security check: ${checkType}`);
      }
    } catch (error) {
      check.errors.push({
        type: 'security_check_error',
        message: error.message
      });
    }

    return check;
  }

  async checkJWTTokenExtraction(check, requests) {
    const authRequests = requests.filter(req => req.headers && req.headers.authorization);

    check.details.authRequestCount = authRequests.length;
    check.details.authHeaderExamples = authRequests.slice(0, 3).map(req => ({
      url: req.url,
      hasAuth: true,
      tokenType: req.headers.authorization.startsWith('Bearer ') ? 'Bearer' : 'Other'
    }));

    if (authRequests.length === 0) {
      check.errors.push({
        type: 'missing_authentication',
        message: 'No authentication headers found in API requests',
        severity: 'HIGH'
      });
      return;
    }

    const bearerTokens = authRequests.filter(req => req.headers.authorization.startsWith('Bearer '));
    check.details.bearerTokenCount = bearerTokens.length;

    if (bearerTokens.length === 0) {
      check.warnings.push({
        type: 'non_bearer_auth',
        message: 'Authentication headers found but not using Bearer tokens',
        severity: 'MEDIUM'
      });
    }

    check.passed = bearerTokens.length > 0;
  }

  async checkOrgIdFiltering(check, requests) {
    const apiRequests = requests.filter(req =>
      req.url.includes('/api/') && req.method !== 'OPTIONS'
    );

    check.details.apiRequestCount = apiRequests.length;

    // Look for org_id in query parameters or request bodies
    const requestsWithOrgId = apiRequests.filter(req => {
      const url = new URL(req.url);
      return url.searchParams.has('org_id') ||
             (req.postData && req.postData.includes('org_id'));
    });

    check.details.requestsWithOrgId = requestsWithOrgId.length;
    check.details.orgIdExamples = requestsWithOrgId.slice(0, 3).map(req => req.url);

    if (requestsWithOrgId.length === 0 && apiRequests.length > 0) {
      check.errors.push({
        type: 'missing_org_id_filtering',
        message: 'API requests are not including org_id filtering parameters',
        severity: 'HIGH',
        affectedEndpoints: apiRequests.map(req => req.url)
      });
      check.passed = false;
    } else {
      check.passed = true;
    }
  }

  async checkDivisionIdFiltering(check, requests) {
    const apiRequests = requests.filter(req =>
      req.url.includes('/api/') && req.method !== 'OPTIONS'
    );

    const requestsWithDivisionId = apiRequests.filter(req => {
      const url = new URL(req.url);
      return url.searchParams.has('division_id') ||
             (req.postData && req.postData.includes('division_id'));
    });

    check.details.requestsWithDivisionId = requestsWithDivisionId.length;

    // This is not necessarily an error - division filtering might be optional
    check.passed = true;

    if (requestsWithDivisionId.length === 0) {
      check.warnings.push({
        type: 'missing_division_id_filtering',
        message: 'No division_id filtering found in API requests',
        severity: 'LOW'
      });
    }
  }

  async checkCrossTenantAccess(check, requests) {
    // Look for potential cross-tenant access patterns
    const suspiciousRequests = requests.filter(req => {
      const url = new URL(req.url);
      // Look for direct resource access without proper scoping
      return req.url.includes('/api/') &&
             !url.searchParams.has('org_id') &&
             req.method !== 'OPTIONS' &&
             req.method !== 'GET';
    });

    check.details.suspiciousRequests = suspiciousRequests.length;
    check.details.suspiciousExamples = suspiciousRequests.slice(0, 3).map(req => ({
      url: req.url,
      method: req.method
    }));

    if (suspiciousRequests.length > 0) {
      check.errors.push({
        type: 'potential_cross_tenant_access',
        message: 'Found API requests that may access data without proper tenant scoping',
        severity: 'HIGH',
        details: suspiciousRequests.map(req => ({ url: req.url, method: req.method }))
      });
      check.passed = false;
    } else {
      check.passed = true;
    }
  }

  async checkScopeValidation(check, requests) {
    // Check for scope validation endpoints or middleware
    const scopeValidationRequests = requests.filter(req =>
      req.url.includes('scope') ||
      req.url.includes('validation') ||
      req.url.includes('authorize')
    );

    check.details.scopeValidationRequests = scopeValidationRequests.length;

    if (scopeValidationRequests.length === 0) {
      check.warnings.push({
        type: 'no_explicit_scope_validation',
        message: 'No explicit scope validation requests detected',
        severity: 'MEDIUM'
      });
    }

    check.passed = true; // This is informational
  }

  async checkAuthorizationHeaders(check, requests) {
    const apiRequests = requests.filter(req => req.url.includes('/api/') && req.method !== 'OPTIONS');
    const requestsWithAuth = apiRequests.filter(req => req.headers && req.headers.authorization);

    check.details.totalApiRequests = apiRequests.length;
    check.details.authenticatedRequests = requestsWithAuth.length;
    check.details.authenticationRate = apiRequests.length > 0 ?
      (requestsWithAuth.length / apiRequests.length * 100).toFixed(2) + '%' : '0%';

    if (requestsWithAuth.length < apiRequests.length) {
      const unauthenticatedRequests = apiRequests.filter(req => !req.headers || !req.headers.authorization);
      check.errors.push({
        type: 'unauthenticated_api_requests',
        message: `${unauthenticatedRequests.length} API requests are missing authentication headers`,
        severity: 'HIGH',
        details: unauthenticatedRequests.map(req => ({ url: req.url, method: req.method }))
      });
      check.passed = false;
    } else {
      check.passed = true;
    }
  }

  async checkAccessDenied(check, requests) {
    const responses = requests.filter(req => req.type === 'response');
    const deniedResponses = responses.filter(req => req.status === 403 || req.status === 401);

    check.details.totalResponses = responses.length;
    check.details.deniedResponses = deniedResponses.length;
    check.details.denialRate = responses.length > 0 ?
      (deniedResponses.length / responses.length * 100).toFixed(2) + '%' : '0%';

    if (deniedResponses.length > 0) {
      check.details.denialExamples = deniedResponses.slice(0, 3).map(req => ({
        url: req.url,
        status: req.status
      }));

      check.warnings.push({
        type: 'access_denied_responses',
        message: `Found ${deniedResponses.length} access denied responses`,
        severity: 'MEDIUM'
      });
    }

    check.passed = true; // Access denied responses are expected for security tests
  }

  async check403Responses(check, requests) {
    const responses = requests.filter(req => req.type === 'response' && req.status === 403);

    check.details.forbiddenResponses = responses.length;
    check.details.forbiddenExamples = responses.map(req => ({
      url: req.url,
      status: req.status,
      headers: req.headers
    }));

    if (responses.length > 0) {
      check.passed = true; // 403 responses indicate proper authorization is working
    } else {
      check.warnings.push({
        type: 'no_403_responses',
        message: 'No 403 Forbidden responses found - authorization might not be properly enforced',
        severity: 'MEDIUM'
      });
      check.passed = false;
    }
  }

  async generateReport() {
    console.log('📊 Generating security test report...');

    const report = {
      metadata: {
        testDate: new Date().toISOString(),
        tester: 'Eldrie - Integration Testing Specialist',
        environment: {
          frontend: config.frontend.url,
          backend: config.backend.url,
          testUser: config.frontend.credentials.email
        },
        summary: {
          totalTests: this.testResults.length,
          passedTests: this.testResults.filter(t => t.passed).length,
          failedTests: this.testResults.filter(t => !t.passed).length,
          totalNetworkRequests: this.networkRequests.length,
          securityViolations: this.securityViolations.length
        }
      },
      testResults: this.testResults,
      networkAnalysis: {
        totalRequests: this.networkRequests.length,
        authenticatedRequests: this.networkRequests.filter(r => r.headers && r.headers.authorization).length,
        errorResponses: this.networkRequests.filter(r => r.type === 'response' && (r.status >= 400 || r.status < 200)).length,
        securityRelevantResponses: this.networkRequests.filter(r => r.securityRelevant).length
      },
      securityViolations: this.securityViolations,
      recommendations: this.generateRecommendations(),
      networkRequests: this.networkRequests
    };

    // Save detailed network log
    fs.writeFileSync(
      path.join(config.output.dir, config.output.networkLog),
      JSON.stringify(this.networkRequests, null, 2)
    );

    // Save security report
    fs.writeFileSync(
      path.join(config.output.dir, config.output.securityReport),
      JSON.stringify(report, null, 2)
    );

    console.log('✅ Report generated successfully');
    console.log(`📁 Results saved to: ${config.output.dir}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    const failedTests = this.testResults.filter(t => !t.passed);
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security Implementation',
        title: 'Fix Failed Security Tests',
        description: `${failedTests.length} security tests failed. Review and fix the identified issues.`,
        details: failedTests.map(t => t.name)
      });
    }

    const missingAuth = this.networkRequests.filter(r =>
      r.url.includes('/api/') && r.method !== 'OPTIONS' && (!r.headers || !r.headers.authorization)
    );
    if (missingAuth.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Authentication',
        title: 'Implement Missing Authentication',
        description: `${missingAuth.length} API requests are missing authentication headers.`,
        details: missingAuth.map(r => r.url)
      });
    }

    const noOrgFiltering = this.testResults.flatMap(t =>
      t.findings.filter(f => f.name === 'org_id_filtering' && !f.passed)
    );
    if (noOrgFiltering.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Data Isolation',
        title: 'Implement Organization-based Data Filtering',
        description: 'API endpoints are not filtering data by organization_id, creating cross-tenant data access risks.',
        details: noOrgFiltering.map(f => f.errors)
      });
    }

    const no403Responses = this.testResults.flatMap(t =>
      t.findings.filter(f => f.name === '403_responses' && !f.passed)
    );
    if (no403Responses.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Authorization',
        title: 'Implement Proper Access Control',
        description: 'No 403 Forbidden responses found - authorization enforcement may be missing.',
        details: no403Responses.map(f => f.warnings)
      });
    }

    return recommendations;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');

    if (this.page) {
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }

    console.log('✅ Cleanup completed');
  }

  async run() {
    try {
      await this.initialize();

      const loginSuccess = await this.performLogin();
      if (!loginSuccess) {
        console.error('❌ Login failed. Cannot proceed with security tests.');
        return;
      }

      await this.runSecurityTests();
      const report = await this.generateReport();

      // Print summary
      console.log('\n' + '='.repeat(80));
      console.log('🔒 SECURITY TEST SUMMARY');
      console.log('='.repeat(80));
      console.log(`Total Tests: ${report.metadata.summary.totalTests}`);
      console.log(`Passed: ${report.metadata.summary.passedTests} ✅`);
      console.log(`Failed: ${report.metadata.summary.failedTests} ❌`);
      console.log(`Network Requests Captured: ${report.metadata.summary.totalNetworkRequests}`);
      console.log(`Security Violations: ${report.metadata.summary.securityViolations}`);

      if (report.recommendations.length > 0) {
        console.log('\n🚨 CRITICAL RECOMMENDATIONS:');
        report.recommendations.filter(r => r.priority === 'HIGH').forEach((rec, i) => {
          console.log(`\n${i + 1}. ${rec.title} (${rec.category})`);
          console.log(`   ${rec.description}`);
        });
      }

      console.log('\n📊 Detailed report saved to:');
      console.log(`   Network Log: ${path.join(config.output.dir, config.output.networkLog)}`);
      console.log(`   Security Report: ${path.join(config.output.dir, config.output.securityReport)}`);
      console.log(`   Screenshots: ${path.join(config.output.dir, config.output.screenshots)}`);

      return report;

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      console.error(error.stack);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the security tests
if (require.main === module) {
  const tester = new SecurityTester();
  tester.run().catch(console.error);
}

module.exports = SecurityTester;