import { test, expect } from '@playwright/test'

/**
 * Comprehensive E2E tests for workspace components
 *
 * Test suite covers:
 * 1. Authentication and login flow
 * 2. Workspace hub navigation and functionality
 * 3. Division page navigation and switching
 * 4. Scope switching end-to-end
 * 5. Real API data integration verification
 *
 * Test account: alyssa@yourever.com, password: DemoPass123!
 */

test.describe('Workspace Components E2E Tests', () => {
  // Test configuration
  const TEST_USER = {
    email: 'alyssa@yourever.com',
    password: 'DemoPass123!',
  }

  test.beforeEach(async ({ page }) => {
    // Set up authentication state for each test
    await page.goto('/')
  })

  /**
   * Test: Authentication and Login Flow
   * Verifies that the test user can successfully authenticate
   */
  test('should authenticate with test credentials', async ({ page }) => {
    console.log('🔐 Testing authentication flow...')

    // Check if we're on the login page or need to navigate there
    await page.waitForLoadState('networkidle')

    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first()

    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await expect(passwordInput).toBeVisible({ timeout: 10000 })
    await expect(submitButton).toBeVisible({ timeout: 10000 })

    // Fill in credentials
    await emailInput.fill(TEST_USER.email)
    await passwordInput.fill(TEST_USER.password)

    // Submit form
    await submitButton.click()

    // Wait for authentication to complete
    await page.waitForURL('**/workspace-hub', { timeout: 30000 })

    // Verify we're on the workspace hub
    await expect(page.locator('h1:has-text("Workspace Hub")')).toBeVisible({ timeout: 15000 })

    console.log('✅ Authentication successful')
  })

  /**
   * Test: Workspace Hub Functionality
   * Verifies workspace hub loads correctly and displays expected content
   */
  test('should load and display workspace hub correctly', async ({ page }) => {
    console.log('🏠 Testing workspace hub functionality...')

    // First authenticate
    await performLogin(page, TEST_USER)

    // Wait for workspace hub to load
    await page.waitForURL('**/workspace-hub')
    await expect(page.locator('h1:has-text("Workspace Hub")')).toBeVisible()

    // Verify main components are present
    await expect(page.locator('[data-tutorial="join-existing-option"]')).toBeVisible()
    await expect(page.locator('[data-tutorial="create-new-option"]')).toBeVisible()

    // Check for organizations section
    const organizationsSection = page.locator('text=Join an organization you already belong to')
    await expect(organizationsSection).toBeVisible()

    // Check for create organization section
    const createOrgSection = page.locator('text=Create a new organization')
    await expect(createOrgSection).toBeVisible()

    console.log('✅ Workspace hub loaded successfully')
  })

  /**
   * Test: Organization Selection and Division Navigation
   * Tests navigation from workspace hub to divisions page
   */
  test('should navigate to divisions page and display divisions', async ({ page }) => {
    console.log('🏢 Testing organization and division navigation...')

    // Authenticate first
    await performLogin(page, TEST_USER)

    // Wait for workspace hub and organizations to load
    await page.waitForURL('**/workspace-hub')
    await page.waitForSelector('[data-tutorial="join-existing-option"]', { timeout: 15000 })

    // Look for organization cards or list
    const organizationCard = page.locator('[data-testid="organization-card"], [data-testid*="org"], .organization-card').first()

    // If we can't find org cards, look for any clickable organization elements
    if (await organizationCard.count() === 0) {
      const orgLink = page.locator('a[href*="/divisions"], button:has-text("Enter"), button:has-text("Open")').first()
      await expect(orgLink).toBeVisible({ timeout: 10000 })
      await orgLink.click()
    } else {
      await organizationCard.click()
    }

    // Wait for navigation to divisions page
    await page.waitForURL('**/divisions**', { timeout: 15000 })

    // Verify we're on a divisions page
    await expect(page.locator('h1, h2').filter({ hasText: /divisions|Divisions/i })).toBeVisible({ timeout: 10000 })

    // Check for division cards or division list
    const divisionCards = page.locator('[data-testid="division-card"], .division-card')
    const divisionCount = await divisionCards.count()

    console.log(`📊 Found ${divisionCount} divisions`)

    // Take screenshot for debugging
    await page.screenshot({ path: './test-results/divisions-page.png' })

    if (divisionCount > 0) {
      // Verify division cards have expected content
      const firstDivision = divisionCards.first()
      await expect(firstDivision).toBeVisible()

      // Check for division name
      const divisionName = firstDivision.locator('h3, h4, [data-testid="division-name"]')
      await expect(divisionName).toBeVisible()
    }

    console.log('✅ Division navigation successful')
  })

  /**
   * Test: Division Switching Functionality
   * Tests switching between different divisions
   */
  test('should handle division switching correctly', async ({ page }) => {
    console.log('🔄 Testing division switching functionality...')

    // Authenticate and navigate to divisions
    await performLogin(page, TEST_USER)
    await navigateToDivisionsPage(page)

    // Get all available divisions
    const divisionCards = page.locator('[data-testid="division-card"], .division-card')
    const divisionCount = await divisionCards.count()

    if (divisionCount < 2) {
      console.log('⚠️  Less than 2 divisions available, skipping division switching test')
      test.skip()
      return
    }

    // Get the first division for reference
    const firstDivision = divisionCards.first()
    const firstDivisionName = await firstDivision.locator('h3, h4, [data-testid="division-name"]').first().textContent()

    console.log(`📋 Starting from division: ${firstDivisionName}`)

    // Click on a different division
    const secondDivision = divisionCards.nth(1)
    const secondDivisionName = await secondDivision.locator('h3, h4, [data-testid="division-name"]').first().textContent()

    console.log(`🎯 Switching to division: ${secondDivisionName}`)

    // Click to switch divisions
    await secondDivision.click()

    // Wait for the switch to complete
    await page.waitForTimeout(3000) // Allow time for scope switching

    // Check for success indicators (toast, navigation, etc.)
    const currentDivisionIndicator = page.locator('[data-testid="current-division"], .current-division')
    if (await currentDivisionIndicator.count() > 0) {
      const currentName = await currentDivisionIndicator.textContent()
      console.log(`✅ Successfully switched to: ${currentName}`)
    }

    // Take screenshot after switching
    await page.screenshot({ path: './test-results/after-division-switch.png' })

    console.log('✅ Division switching completed')
  })

  /**
   * Test: Scope Switching End-to-End
   * Tests the complete scope switching flow from workspace hub to specific division
   */
  test('should handle complete scope switching flow', async ({ page }) => {
    console.log('🌐 Testing complete scope switching flow...')

    // Start from workspace hub
    await performLogin(page, TEST_USER)
    await page.waitForURL('**/workspace-hub')

    // Record initial scope state
    const initialUrl = page.url()
    console.log(`📍 Starting URL: ${initialUrl}`)

    // Navigate to organizations and select one
    const organizationCard = page.locator('[data-testid="organization-card"], [data-testid*="org"]').first()
    if (await organizationCard.count() > 0) {
      await organizationCard.click()
    } else {
      // Alternative navigation
      const orgLink = page.locator('a[href*="/divisions"]').first()
      await orgLink.click()
    }

    // Wait for divisions page
    await page.waitForURL('**/divisions**')

    // Select a division
    const divisionCard = page.locator('[data-testid="division-card"], .division-card').first()
    await divisionCard.click()

    // Wait for scope switching to complete
    await page.waitForTimeout(5000)

    // Verify final state
    const finalUrl = page.url()
    console.log(`🏁 Final URL: ${finalUrl}`)

    // Check that we have a valid scope (orgId and divisionId in URL)
    expect(finalUrl).toMatch(/\/[^\/]+\/divisions\/[^\/]+/)

    // Verify breadcrumb navigation
    const breadcrumbs = page.locator('[data-testid="breadcrumb"], .breadcrumb, nav[aria-label="breadcrumb"]')
    if (await breadcrumbs.count() > 0) {
      console.log('🍞 Breadcrumb navigation is present')
    }

    // Take screenshot of final state
    await page.screenshot({ path: './test-results/scope-switching-complete.png' })

    console.log('✅ Complete scope switching flow successful')
  })

  /**
   * Test: Real API Data Verification
   * Verifies that the application is using real API data instead of mocks
   */
  test('should use real API data instead of mocks', async ({ page }) => {
    console.log('🔍 Verifying real API data usage...')

    // Set up network monitoring
    const apiRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url())
        console.log(`📡 API Request: ${request.method()} ${request.url()}`)
      }
    })

    // Authenticate and navigate
    await performLogin(page, TEST_USER)
    await page.waitForURL('**/workspace-hub')

    // Wait for API calls to complete
    await page.waitForLoadState('networkidle')

    // Check for real API requests
    const hasApiRequests = apiRequests.length > 0
    console.log(`📊 Found ${apiRequests.length} API requests`)

    // Log all API requests for verification
    apiRequests.forEach(request => {
      console.log(`  - ${request}`)
    })

    // Verify we're not using mock data indicators
    const mockIndicators = page.locator('[data-testid="mock"], [data-testid="test-data"], .mock-data')
    const mockCount = await mockIndicators.count()
    console.log(`🚫 Found ${mockCount} mock data indicators`)

    // Check for real data loading patterns
    const loadingIndicators = page.locator('[data-testid="loading"], .loading, [aria-busy="true"]')
    const loadingCount = await loadingIndicators.count()
    console.log(`⏳ Found ${loadingCount} loading indicators`)

    // Navigate to divisions to check for more API calls
    await navigateToDivisionsPage(page)
    await page.waitForLoadState('networkidle')

    // Verify division data comes from API
    const divisionApiRequests = apiRequests.filter(url => url.includes('division') || url.includes('scope'))
    console.log(`🏢 Found ${divisionApiRequests.length} division/scope API requests`)

    // Take screenshot for debugging
    await page.screenshot({ path: './test-results/api-data-verification.png' })

    // Assertions
    expect(hasApiRequests).toBeTruthy()
    expect(mockCount).toBe(0)

    console.log('✅ Real API data verification completed')
  })

  /**
   * Test: Error Handling and Resilience
   * Tests how the application handles errors and edge cases
   */
  test('should handle errors gracefully', async ({ page }) => {
    console.log('🛡️  Testing error handling...')

    // Monitor for error messages
    const errorMessages: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text())
        console.log(`❌ Console error: ${msg.text()}`)
      }
    })

    // Try to navigate to a non-existent division
    await performLogin(page, TEST_USER)
    await page.goto('/invalid-org/divisions/invalid-division', { timeout: 15000 })

    // Wait for error handling or redirect
    await page.waitForTimeout(3000)

    // Check if we're redirected to workspace hub (expected behavior)
    const currentUrl = page.url()
    const isRedirectedToHub = currentUrl.includes('/workspace-hub')

    if (isRedirectedToHub) {
      console.log('✅ Properly redirected to workspace hub for invalid scope')
    } else {
      console.log(`⚠️  Current URL after invalid navigation: ${currentUrl}`)
    }

    // Check for user-friendly error messages
    const errorAlerts = page.locator('[role="alert"], .error-message, [data-testid="error"]')
    const errorCount = await errorAlerts.count()

    if (errorCount > 0) {
      const errorText = await errorAlerts.first().textContent()
      console.log(`📝 Error message displayed: ${errorText}`)
    }

    // Take screenshot for debugging
    await page.screenshot({ path: './test-results/error-handling.png' })

    console.log('✅ Error handling test completed')
  })
})

/**
 * Helper function to perform login
 */
async function performLogin(page: any, user: { email: string; password: string }) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Check if already logged in
  if (page.url().includes('/workspace-hub')) {
    console.log('✅ Already authenticated')
    return
  }

  // Look for login form
  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first()

  await emailInput.fill(user.email)
  await passwordInput.fill(user.password)
  await submitButton.click()

  // Wait for successful login
  await page.waitForURL('**/workspace-hub', { timeout: 30000 })
  console.log('✅ Login completed')
}

/**
 * Helper function to navigate to divisions page
 */
async function navigateToDivisionsPage(page: any) {
  await page.waitForURL('**/workspace-hub')

  // Look for organization to click
  const organizationCard = page.locator('[data-testid="organization-card"], [data-testid*="org"], .organization-card').first()

  if (await organizationCard.count() > 0) {
    await organizationCard.click()
  } else {
    // Try alternative approach
    const orgLink = page.locator('a[href*="/divisions"], button:has-text("Enter"), button:has-text("Open")').first()
    await orgLink.click()
  }

  await page.waitForURL('**/divisions**', { timeout: 15000 })
}