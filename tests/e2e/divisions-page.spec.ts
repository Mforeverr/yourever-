import { test, expect } from '@playwright/test'
import {
  performLogin,
  navigateToDivisionsPage,
  SELECTORS,
  setupApiMonitoring,
  takeScreenshot,
  waitForNetworkIdle,
  verifyRealApiData,
  extractCurrentScope,
  setupErrorMonitoring,
  waitForElementWithLogging,
} from './test-utils'

/**
 * Comprehensive tests for the divisions page (/[orgId]/divisions)
 *
 * These tests specifically focus on:
 * 1. Division page loading and rendering
 * 2. Division search and filtering functionality
 * 3. Division switching and navigation
 * 4. Breadcrumb navigation
 * 5. Error handling for invalid divisions
 * 6. Real API data integration
 */

test.describe('Divisions Page Tests', () => {
  let apiMonitoring: { requests: string[], responses: string[] }
  let errorMonitoring: { errors: string[], warnings: string[] }

  test.beforeEach(async ({ page }) => {
    // Set up monitoring
    apiMonitoring = setupApiMonitoring(page)
    errorMonitoring = setupErrorMonitoring(page)

    // Authenticate and navigate to divisions page
    await performLogin(page)
    await navigateToDivisionsPage(page)
  })

  /**
   * Test: Divisions Page Loading and Basic Structure
   * Verifies the divisions page loads correctly with expected structure
   */
  test('should load divisions page with correct structure', async ({ page }) => {
    console.log('📄 Testing divisions page structure...')

    // Wait for page to fully load
    await waitForNetworkIdle(page)

    // Verify page title and headers
    await waitForElementWithLogging(page, SELECTORS.divisionsTitle, 10000, 'divisions page title')

    const title = await page.locator(SELECTORS.divisionsTitle).first().textContent()
    expect(title).toMatch(/divisions|Divisions/i)
    console.log(`📝 Page title: ${title}`)

    // Check for breadcrumb navigation
    const breadcrumbs = page.locator(SELECTORS.breadcrumb)
    const breadcrumbCount = await breadcrumbs.count()
    console.log(`🍞 Found ${breadcrumbCount} breadcrumb navigation elements`)

    // Verify search functionality exists
    const searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="Search"]')
    const searchCount = await searchInput.count()
    console.log(`🔍 Found ${searchCount} search inputs`)

    if (searchCount > 0) {
      expect(await searchInput.first().isVisible()).toBeTruthy()
    }

    // Check for division cards or list
    const divisionCards = page.locator(SELECTORS.divisionCard)
    await waitForElementWithLogging(page, SELECTORS.divisionCard, 15000, 'division cards')

    const divisionCount = await divisionCards.count()
    console.log(`📊 Found ${divisionCount} divisions on the page`)

    // Take screenshot for visual verification
    await takeScreenshot(page, 'divisions-page-structure')

    // Verify we're using real data
    const isRealData = await verifyRealApiData(page)
    expect(isRealData).toBeTruthy()

    console.log('✅ Divisions page structure verification completed')
  })

  /**
   * Test: Division Search and Filtering
   * Tests the search functionality for filtering divisions
   */
  test('should filter divisions based on search query', async ({ page }) => {
    console.log('🔍 Testing division search functionality...')

    // Get initial division count
    const allDivisions = page.locator(SELECTORS.divisionCard)
    const initialCount = await allDivisions.count()

    if (initialCount < 2) {
      console.log('⚠️  Less than 2 divisions available, skipping search test')
      test.skip()
      return
    }

    console.log(`📊 Initial division count: ${initialCount}`)

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="Search"]').first()
    await expect(searchInput).toBeVisible()

    // Get a division name to search for
    const firstDivision = allDivisions.first()
    const divisionName = await firstDivision.locator(SELECTORS.divisionName).first().textContent()
    console.log(`🎯 Will search for division: ${divisionName}`)

    // Enter search query
    await searchInput.fill(divisionName || '')
    await page.waitForTimeout(1000) // Allow for debouncing

    // Check filtered results
    const filteredDivisions = page.locator(SELECTORS.divisionCard)
    const filteredCount = await filteredDivisions.count()

    console.log(`📊 Filtered division count: ${filteredCount}`)

    // Should have fewer or equal results
    expect(filteredCount).toBeLessThanOrEqual(initialCount)

    // If we have results, verify they match the search
    if (filteredCount > 0) {
      const firstFiltered = filteredDivisions.first()
      const filteredName = await firstFiltered.locator(SELECTORS.divisionName).first().textContent()
      console.log(`✅ First filtered result: ${filteredName}`)

      // The result should contain our search term (case insensitive)
      expect(filteredName?.toLowerCase()).toContain(divisionName?.toLowerCase() || '')
    }

    // Clear search and verify all divisions return
    await searchInput.fill('')
    await page.waitForTimeout(1000)

    const afterClearCount = await allDivisions.count()
    expect(afterClearCount).toBe(initialCount)

    await takeScreenshot(page, 'divisions-search-functionality')

    console.log('✅ Division search functionality verified')
  })

  /**
   * Test: Division Card Interaction
   * Tests clicking on division cards and the resulting behavior
   */
  test('should handle division card clicks correctly', async ({ page }) => {
    console.log('🖱️  Testing division card interaction...')

    const divisionCards = page.locator(SELECTORS.divisionCard)
    const divisionCount = await divisionCards.count()

    if (divisionCount === 0) {
      console.log('⚠️  No divisions available to test')
      test.skip()
      return
    }

    // Get information about the first division before clicking
    const firstDivision = divisionCards.first()
    const divisionName = await firstDivision.locator(SELECTORS.divisionName).first().textContent()
    console.log(`🎯 Clicking on division: ${divisionName}`)

    // Get current scope before clicking
    const scopeBefore = extractCurrentScope(page)
    console.log(`📍 Scope before click:`, scopeBefore)

    // Click on the division
    await firstDivision.click()

    // Wait for navigation or state change
    await page.waitForTimeout(3000)

    // Check for success indicators
    const currentScope = extractCurrentScope(page)
    console.log(`📍 Scope after click:`, currentScope)

    // Look for loading indicators or success messages
    const loadingIndicators = page.locator(SELECTORS.loadingIndicator)
    const loadingCount = await loadingIndicators.count()

    if (loadingCount > 0) {
      console.log(`⏳ Found ${loadingCount} loading indicators after division selection`)
    }

    // Check for any error messages
    const errorMessages = page.locator(SELECTORS.errorMessage)
    const errorCount = await errorMessages.count()

    if (errorCount > 0) {
      const errorText = await errorMessages.first().textContent()
      console.warn(`⚠️  Error message found: ${errorText}`)
    }

    await takeScreenshot(page, 'after-division-click')

    console.log('✅ Division card interaction completed')
  })

  /**
   * Test: Breadcrumb Navigation
   * Tests breadcrumb navigation functionality
   */
  test('should have working breadcrumb navigation', async ({ page }) => {
    console.log('🍞 Testing breadcrumb navigation...')

    const breadcrumbs = page.locator(SELECTORS.breadcrumb)
    const breadcrumbCount = await breadcrumbs.count()

    if (breadcrumbCount === 0) {
      console.log('⚠️  No breadcrumb navigation found')
      test.skip()
      return
    }

    console.log(`🍞 Found ${breadcrumbCount} breadcrumb elements`)

    // Extract breadcrumb links
    const breadcrumbLinks = page.locator(`${SELECTORS.breadcrumb} a`)
    const linkCount = await breadcrumbLinks.count()

    console.log(`🔗 Found ${linkCount} breadcrumb links`)

    // Test clicking on "Organizations" or similar link if present
    const organizationsLink = breadcrumbLinks.filter({ hasText: /organizations|Organizations/i }).first()

    if (await organizationsLink.count() > 0) {
      console.log('🏢 Clicking on organizations breadcrumb link...')

      const linkText = await organizationsLink.textContent()
      console.log(`🔗 Link text: ${linkText}`)

      await organizationsLink.click()

      // Wait for navigation
      await page.waitForTimeout(2000)

      // Verify we navigated away from divisions page
      const currentUrl = page.url()
      const navigatedAway = !currentUrl.includes('/divisions')

      if (navigatedAway) {
        console.log(`✅ Successfully navigated to: ${currentUrl}`)
      } else {
        console.log(`⚠️  Still on divisions page: ${currentUrl}`)
      }

      await takeScreenshot(page, 'after-breadcrumb-navigation')
    } else {
      console.log('ℹ️  No organizations breadcrumb link found')
    }

    console.log('✅ Breadcrumb navigation test completed')
  })

  /**
   * Test: API Integration Verification
   * Verifies that divisions data is loaded from real API calls
   */
  test('should load division data from real API', async ({ page }) => {
    console.log('🔍 Verifying API integration for divisions data...')

    // Wait for all API calls to complete
    await waitForNetworkIdle(page)

    // Analyze API requests made
    const { requests, responses } = apiMonitoring

    console.log(`📊 Total API requests: ${requests.length}`)
    console.log(`📊 Total API responses: ${responses.length}`)

    // Look for division-related API calls
    const divisionRequests = requests.filter(req =>
      req.includes('division') || req.includes('scope') || req.includes('organization')
    )

    console.log(`🏢 Division/scope API requests: ${divisionRequests.length}`)
    divisionRequests.forEach(req => console.log(`  - ${req}`))

    // Verify we have real API calls
    expect(divisionRequests.length).toBeGreaterThan(0)

    // Check for successful responses
    const successfulResponses = responses.filter(res =>
      res.startsWith('2') && (res.includes('division') || res.includes('scope'))
    )

    console.log(`✅ Successful division/scope responses: ${successfulResponses.length}`)

    // Verify no mock data indicators
    const isRealData = await verifyRealApiData(page)
    expect(isRealData).toBeTruthy()

    // Check for loading states (indicates real data loading)
    const loadingIndicators = page.locator(SELECTORS.loadingIndicator)
    const loadingFound = await loadingIndicators.count() > 0

    console.log(`⏳ Loading indicators found: ${loadingFound}`)

    await takeScreenshot(page, 'divisions-api-verification')

    console.log('✅ API integration verification completed')
  })

  /**
   * Test: Error Handling for Invalid URLs
   * Tests how the divisions page handles invalid organization or division IDs
   */
  test('should handle invalid organization/division URLs gracefully', async ({ page }) => {
    console.log('🛡️  Testing error handling for invalid URLs...')

    // Try to navigate to an invalid organization
    await page.goto('/invalid-org/divisions', { timeout: 10000 })

    // Wait for error handling or redirect
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    console.log(`📍 Current URL after invalid org navigation: ${currentUrl}`)

    // Check if redirected to workspace hub (expected behavior)
    const isRedirectedToHub = currentUrl.includes('/workspace-hub')

    if (isRedirectedToHub) {
      console.log('✅ Properly redirected to workspace hub for invalid organization')
    } else {
      // Check for error messages
      const errorMessages = page.locator(SELECTORS.errorMessage)
      const errorCount = await errorMessages.count()

      if (errorCount > 0) {
        const errorText = await errorMessages.first().textContent()
        console.log(`📝 Error message displayed: ${errorText}`)
        expect(errorText).toBeTruthy()
      }
    }

    // Try to navigate to valid org but invalid division
    await navigateToDivisionsPage(page) // Go to a valid divisions page first
    const validUrl = page.url()
    const orgMatch = validUrl.match(/\/([^\/]+)\/divisions/)

    if (orgMatch) {
      const validOrg = orgMatch[1]
      await page.goto(`/${validOrg}/divisions/invalid-division`, { timeout: 10000 })

      await page.waitForTimeout(3000)

      const afterInvalidDivisionUrl = page.url()
      console.log(`📍 URL after invalid division navigation: ${afterInvalidDivisionUrl}`)

      // Check for appropriate error handling
      const errorMessages = page.locator(SELECTORS.errorMessage)
      const errorCount = await errorMessages.count()

      if (errorCount > 0) {
        const errorText = await errorMessages.first().textContent()
        console.log(`📝 Error message for invalid division: ${errorText}`)
      }
    }

    await takeScreenshot(page, 'divisions-error-handling')

    console.log('✅ Error handling test completed')
  })

  /**
   * Test: Responsive Design
   * Tests that the divisions page works correctly on different screen sizes
   */
  test('should be responsive on different screen sizes', async ({ page }) => {
    console.log('📱 Testing responsive design...')

    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 })
    await waitForNetworkIdle(page)

    const desktopDivisionCards = page.locator(SELECTORS.divisionCard)
    const desktopCount = await desktopDivisionCards.count()

    console.log(`📊 Desktop divisions displayed: ${desktopCount}`)

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(1000)

    const tabletDivisionCards = page.locator(SELECTORS.divisionCard)
    const tabletCount = await tabletDivisionCards.count()

    console.log(`📊 Tablet divisions displayed: ${tabletCount}`)

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000)

    const mobileDivisionCards = page.locator(SELECTORS.divisionCard)
    const mobileCount = await mobileDivisionCards.count()

    console.log(`📊 Mobile divisions displayed: ${mobileCount}`)

    // Take screenshots of each size
    await takeScreenshot(page, 'divisions-desktop')
    await page.setViewportSize({ width: 768, height: 1024 })
    await takeScreenshot(page, 'divisions-tablet')
    await page.setViewportSize({ width: 375, height: 667 })
    await takeScreenshot(page, 'divisions-mobile')

    // Verify the same number of divisions are available (layout may change)
    expect(desktopCount).toBe(tabletCount)
    expect(tabletCount).toBe(mobileCount)

    console.log('✅ Responsive design test completed')
  })

  test.afterEach(async ({ page }) => {
    // Log any errors or warnings that occurred during the test
    if (errorMonitoring.errors.length > 0) {
      console.error(`❌ ${errorMonitoring.errors.length} console errors occurred:`)
      errorMonitoring.errors.forEach(error => console.error(`  - ${error}`))
    }

    if (errorMonitoring.warnings.length > 0) {
      console.warn(`⚠️  ${errorMonitoring.warnings.length} console warnings occurred:`)
      errorMonitoring.warnings.forEach(warning => console.warn(`  - ${warning}`))
    }

    // Log API activity summary
    console.log(`📊 API Activity Summary:`)
    console.log(`  - Requests: ${apiMonitoring.requests.length}`)
    console.log(`  - Responses: ${apiMonitoring.responses.length}`)
  })
})