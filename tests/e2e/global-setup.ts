import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests
 * Ensures test environment is ready and performs initial authentication setup
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...')

  const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:3000'
  console.log(`📡 Base URL: ${baseURL}`)

  // Verify the application is running
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log('🔍 Checking application availability...')
    await page.goto(baseURL, { timeout: 30000 })

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check if we can see the login page or workspace hub
    const title = await page.title()
    console.log(`📄 Page title: ${title}`)

    // Take a screenshot for debugging
    await page.screenshot({ path: './test-results/setup-initial-state.png' })

  } catch (error) {
    console.error('❌ Application is not available:', error)
    throw new Error(`Application at ${baseURL} is not available. Please ensure it's running before running tests.`)
  } finally {
    await context.close()
    await browser.close()
  }

  console.log('✅ Global setup completed successfully')
}

export default globalSetup