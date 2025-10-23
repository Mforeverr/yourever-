import { Page, expect } from '@playwright/test'

/**
 * Test utilities for workspace component testing
 * Provides helper functions for common test operations
 */

export const TEST_USER = {
  email: 'alyssa@yourever.com',
  password: 'DemoPass123!',
}

export const SELECTORS = {
  // Authentication
  emailInput: 'input[type="email"], input[name="email"]',
  passwordInput: 'input[type="password"], input[name="password"]',
  submitButton: 'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")',

  // Workspace Hub
  workspaceHubTitle: 'h1:has-text("Workspace Hub")',
  organizationCard: '[data-testid="organization-card"], [data-testid*="org"], .organization-card',
  createOrgButton: '[data-tutorial="create-new-option"] button, button:has-text("Create organization")',

  // Divisions Page
  divisionsTitle: 'h1, h2',
  divisionCard: '[data-testid="division-card"], .division-card',
  divisionName: 'h3, h4, [data-testid="division-name"]',

  // Navigation
  breadcrumb: '[data-testid="breadcrumb"], .breadcrumb, nav[aria-label="breadcrumb"]',

  // Loading and Error States
  loadingIndicator: '[data-testid="loading"], .loading, [aria-busy="true"]',
  errorMessage: '[role="alert"], .error-message, [data-testid="error"]',

  // API Monitoring
  mockIndicator: '[data-testid="mock"], [data-testid="test-data"], .mock-data',
}

/**
 * Performs authentication with test credentials
 */
export async function performLogin(page: Page, user = TEST_USER) {
  console.log(`🔐 Logging in as ${user.email}...`)

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Check if already authenticated
  if (page.url().includes('/workspace-hub')) {
    console.log('✅ Already authenticated')
    return
  }

  // Fill login form
  await page.fill(SELECTORS.emailInput, user.email)
  await page.fill(SELECTORS.passwordInput, user.password)
  await page.click(SELECTORS.submitButton)

  // Wait for successful authentication
  await page.waitForURL('**/workspace-hub', { timeout: 30000 })
  console.log('✅ Authentication successful')
}

/**
 * Navigates to divisions page from workspace hub
 */
export async function navigateToDivisionsPage(page: Page) {
  console.log('🏢 Navigating to divisions page...')

  await page.waitForURL('**/workspace-hub')

  // Try to find and click on an organization
  const organizationCard = page.locator(SELECTORS.organizationCard).first()

  if (await organizationCard.count() > 0) {
    await organizationCard.click()
  } else {
    // Alternative approach - look for links to divisions
    const orgLink = page.locator('a[href*="/divisions"], button:has-text("Enter"), button:has-text("Open")').first()
    await orgLink.click()
  }

  await page.waitForURL('**/divisions**', { timeout: 15000 })
  console.log('✅ Successfully navigated to divisions page')
}

/**
 * Sets up API request monitoring
 */
export function setupApiMonitoring(page: Page): { requests: string[], responses: string[] } {
  const requests: string[] = []
  const responses: string[] = []

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      requests.push(`${request.method()} ${request.url()}`)
      console.log(`📡 API Request: ${request.method()} ${request.url()}`)
    }
  })

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      responses.push(`${response.status()} ${response.url()}`)
      console.log(`📥 API Response: ${response.status()} ${response.url()}`)
    }
  })

  return { requests, responses }
}

/**
 * Takes a screenshot with automatic filename
 */
export async function takeScreenshot(page: Page, testName: string, step?: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = step
    ? `./test-results/${testName}-${step}-${timestamp}.png`
    : `./test-results/${testName}-${timestamp}.png`

  await page.screenshot({ path: filename, fullPage: true })
  console.log(`📸 Screenshot saved: ${filename}`)
}

/**
 * Waits for network activity to settle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  console.log('⏳ Waiting for network activity to settle...')
  await page.waitForLoadState('networkidle', { timeout })
  console.log('✅ Network activity settled')
}

/**
 * Verifies that real API data is being used (no mock data indicators)
 */
export async function verifyRealApiData(page: Page) {
  const mockIndicators = page.locator(SELECTORS.mockIndicator)
  const mockCount = await mockIndicators.count()

  if (mockCount > 0) {
    console.warn(`⚠️  Found ${mockCount} mock data indicators`)
    for (let i = 0; i < mockCount; i++) {
      const indicator = mockIndicators.nth(i)
      const text = await indicator.textContent()
      console.warn(`  Mock indicator: ${text}`)
    }
  }

  return mockCount === 0
}

/**
 * Extracts organization and division information from the current page
 */
export async function extractCurrentScope(page: Page) {
  const url = page.url()
  const urlMatch = url.match(/\/([^\/]+)\/divisions\/([^\/]+)/)

  if (urlMatch) {
    return {
      organizationId: urlMatch[1],
      divisionId: urlMatch[2],
      fullUrl: url
    }
  }

  return null
}

/**
 * Checks for and logs any console errors
 */
export function setupErrorMonitoring(page: Page): { errors: string[], warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
      console.error(`❌ Console error: ${msg.text()}`)
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text())
      console.warn(`⚠️  Console warning: ${msg.text()}`)
    }
  })

  page.on('pageerror', error => {
    errors.push(error.message)
    console.error(`🚨 Page error: ${error.message}`)
  })

  return { errors, warnings }
}

/**
 * Helper to wait for element with timeout and logging
 */
export async function waitForElementWithLogging(
  page: Page,
  selector: string,
  timeout = 10000,
  description?: string
) {
  console.log(`🔍 Waiting for element${description ? ` (${description})` : ''}: ${selector}`)

  try {
    const element = page.locator(selector)
    await element.waitFor({ state: 'visible', timeout })
    console.log(`✅ Element found: ${selector}`)
    return element
  } catch (error) {
    console.error(`❌ Element not found within ${timeout}ms: ${selector}`)
    throw error
  }
}

/**
 * Generates test report data
 */
export function generateTestReport(testResults: any) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.length,
      passed: testResults.filter((r: any) => r.status === 'passed').length,
      failed: testResults.filter((r: any) => r.status === 'failed').length,
      skipped: testResults.filter((r: any) => r.status === 'skipped').length,
    },
    environment: {
      userAgent: testResults[0]?.project?.use?.userAgent || 'unknown',
      baseURL: testResults[0]?.project?.use?.baseURL || 'unknown',
    }
  }
}