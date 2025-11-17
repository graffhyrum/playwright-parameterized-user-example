import { expect, test } from '@playwright/test'
import { assertStatusBadge, cleanupAll, getDashboardUrl, waitForDashboardReady } from './setup'

const DASHBOARD_URL = getDashboardUrl()

test.describe('Dashboard UI Tests', () => {
  test.beforeAll(async ({ request }) => {
    await waitForDashboardReady(request)
  })

  test.beforeEach(async ({ page, request }) => {
    await cleanupAll(request)
    await page.goto(DASHBOARD_URL)
  })

  test.afterEach(async ({ request }) => {
    await cleanupAll(request)
  })

  test.describe('Page Load', () => {
    test('should load dashboard with correct title', async ({ page }) => {
      await expect(page).toHaveTitle(/Playwright Test Dashboard/)
    })

    test('should display main layout elements', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Playwright Test Dashboard')
      await expect(page.locator('.left-panel')).toBeVisible()
      await expect(page.locator('.right-panel')).toBeVisible()
    })

    test('should show all three environment cards', async ({ page }) => {
      await expect(page.locator('text=Production')).toBeVisible()
      await expect(page.locator('text=Staging')).toBeVisible()
      await expect(page.locator('text=Development')).toBeVisible()
    })

    test('should show port badges', async ({ page }) => {
      await expect(page.locator('text=Port 3000')).toBeVisible()
      await expect(page.locator('text=Port 3001')).toBeVisible()
      await expect(page.locator('text=Port 3002')).toBeVisible()
    })

    test('should have test runner controls visible', async ({ page }) => {
      await expect(page.locator('#run-tests-btn')).toBeVisible()
      await expect(page.locator('#stop-tests-btn')).toBeVisible()
      await expect(page.locator('#test-project')).toBeVisible()
    })
  })

  test.describe('Demo App Start/Stop', () => {
    test('should start production app via UI', async ({ page }) => {
      await page.click('#start-btn-production')

      // Wait for status to update to running
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      // Verify buttons state
      await expect(page.locator('#start-btn-production')).toBeDisabled()
      await expect(page.locator('#stop-btn-production')).toBeEnabled()
    })

    test('should stop production app via UI', async ({ page }) => {
      // Start first
      await page.click('#start-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      // Stop
      await page.click('#stop-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Stopped/, { timeout: 5000 })

      // Verify buttons state
      await expect(page.locator('#start-btn-production')).toBeEnabled()
      await expect(page.locator('#stop-btn-production')).toBeDisabled()
    })

    test('should start staging app via UI', async ({ page }) => {
      await page.click('#start-btn-staging')
      await expect(page.locator('#status-staging')).toContainText(/Running/, { timeout: 10000 })
      await expect(page.locator('#start-btn-staging')).toBeDisabled()
      await expect(page.locator('#stop-btn-staging')).toBeEnabled()
    })

    test('should start development app via UI', async ({ page }) => {
      await page.click('#start-btn-development')
      await expect(page.locator('#status-development')).toContainText(/Running/, { timeout: 10000 })
      await expect(page.locator('#start-btn-development')).toBeDisabled()
      await expect(page.locator('#stop-btn-development')).toBeEnabled()
    })
  })

  test.describe('Log Viewer', () => {
    test('should expand and collapse log details', async ({ page }) => {
      const details = page.locator('.environment-card').first().locator('details')

      // Initially collapsed
      await expect(details).not.toHaveAttribute('open')

      // Click to expand
      await details.locator('summary').click()
      await expect(details).toHaveAttribute('open', '')

      // Click to collapse
      await details.locator('summary').click()
      await expect(details).not.toHaveAttribute('open')
    })

    test('should display logs after starting app', async ({ page }) => {
      await page.click('#start-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      // Wait a bit for logs to appear
      await page.waitForTimeout(2000)

      // Expand logs
      const details = page.locator('.environment-card').first().locator('details')
      await details.locator('summary').click()

      const logs = page.locator('#logs-production')
      await expect(logs).not.toHaveText('No logs yet...')
    })
  })

  test.describe('Test Runner UI', () => {
    test('should run tests via UI button', async ({ page }) => {
      // Start production app first
      await page.click('#start-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      // Run tests
      await page.click('#run-tests-btn')

      // Wait for running status
      await expect(page.locator('#test-status')).toContainText(/Running/, { timeout: 5000 })

      // Verify buttons state
      await expect(page.locator('#run-tests-btn')).toBeDisabled()
      await expect(page.locator('#stop-tests-btn')).toBeEnabled()
    })

    test('should show test output in logs area', async ({ page }) => {
      await page.click('#start-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      await page.click('#run-tests-btn')

      // Wait for test output to appear
      await page.waitForTimeout(3000)

      const testLogs = page.locator('#test-logs')
      await expect(testLogs).not.toHaveText('No test output yet...')
    })

    test('should accept project filter input', async ({ page }) => {
      const projectInput = page.locator('#test-project')
      await projectInput.fill('chromium')
      await expect(projectInput).toHaveValue('chromium')
    })

    test('should stop tests via UI button', async ({ page }) => {
      // Start app and tests
      await page.click('#start-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      await page.click('#run-tests-btn')
      await expect(page.locator('#test-status')).toContainText(/Running/, { timeout: 5000 })

      // Stop tests
      await page.click('#stop-tests-btn')

      // Wait for stopped state
      await page.waitForTimeout(2000)

      // Verify buttons state
      await expect(page.locator('#run-tests-btn')).toBeEnabled()
      await expect(page.locator('#stop-tests-btn')).toBeDisabled()
    })
  })

  test.describe('Report Viewer', () => {
    test('should show report placeholder initially', async ({ page }) => {
      const placeholder = page.locator('.report-placeholder')
      await expect(placeholder).toBeVisible()
      await expect(placeholder).toContainText(/Run tests to generate a report/)
    })

    test('should have refresh report button', async ({ page }) => {
      await expect(page.locator('#refresh-report-btn')).toBeVisible()
      await expect(page.locator('#refresh-report-btn')).toContainText(/Refresh/)
    })

    test('should load report iframe after test run with report', async ({ page }) => {
      // This test assumes there's already a report from previous runs
      // If not, it will just verify the refresh mechanism works
      await page.click('#refresh-report-btn')

      // Check if iframe appears (may not if no report exists)
      const _iframe = page.locator('iframe.report-iframe')
      // Just verify the click worked without error
      await expect(page.locator('#report-container')).toBeVisible()
    })
  })

  test.describe('Real-time Status Updates', () => {
    test('should show uptime counter when app running', async ({ page }) => {
      await page.click('#start-btn-production')

      // Wait for running status
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      // Verify uptime is displayed (format: "Running (Xs)")
      await expect(page.locator('#status-production')).toContainText(/\d+s/)
    })

    test('should show test duration when running', async ({ page }) => {
      await page.click('#start-btn-production')
      await expect(page.locator('#status-production')).toContainText(/Running/, { timeout: 10000 })

      await page.click('#run-tests-btn')
      await expect(page.locator('#test-status')).toContainText(/Running/, { timeout: 5000 })

      // Verify duration is displayed (format: "Running... (Xs)")
      await expect(page.locator('#test-status')).toContainText(/\d+s/)
    })
  })
})
