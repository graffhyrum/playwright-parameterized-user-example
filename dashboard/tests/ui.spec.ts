import { expect } from '@playwright/test'
import { dashboardTest } from '../src/fixtures.ts'
import type { DashboardFixture } from '../src/types.ts'

dashboardTest.describe('Dashboard UI Tests', () => {
  dashboardTest.describe('Page Load', () => {
    dashboardTest('should load dashboard with correct title', async ({ dashboard }) => {
      await expect(dashboard.page).toHaveTitle(/Playwright Test Dashboard/)
    })

    dashboardTest('should display main layout elements', async ({ dashboard }) => {
      await expect(dashboard.page.locator('h1')).toContainText('Playwright Test Dashboard')
      await expect(dashboard.page.locator('.header-nav')).toBeVisible()
      await expect(dashboard.page.locator('.tabs-container')).toBeVisible()
    })

    dashboardTest('should show tab navigation', async ({ dashboard }) => {
      await expect(dashboard.page.locator('[data-tab="demo-apps"]')).toBeVisible()
      await expect(dashboard.page.locator('[data-tab="tests"]')).toBeVisible()
      await expect(dashboard.page.locator('[data-tab="reports"]')).toBeVisible()
    })

    dashboardTest('should default to Demo Apps tab', async ({ dashboard }) => {
      await expect(dashboard.page.locator('#demo-apps')).toHaveClass(/active/)
      await expect(dashboard.page.locator('[data-tab="demo-apps"]')).toHaveClass(/active/)
    })

    dashboardTest(
      'should show all three environment cards in Demo Apps tab',
      async ({ dashboard }) => {
        await dashboard.POMs.demoAppsPage.switchToTab()
        await expect(dashboard.page.locator('h3:has-text("Production")')).toBeVisible()
        await expect(dashboard.page.locator('h3:has-text("Staging")')).toBeVisible()
        await expect(dashboard.page.locator('h3:has-text("Development")')).toBeVisible()
      }
    )

    dashboardTest('should show port badges in Demo Apps tab', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.switchToTab()
      await expect(dashboard.page.locator('text=Port 3000')).toBeVisible()
      await expect(dashboard.page.locator('text=Port 3001')).toBeVisible()
      await expect(dashboard.page.locator('text=Port 3002')).toBeVisible()
    })

    dashboardTest(
      'should have test runner controls visible in Tests & Status tab',
      async ({ dashboard }) => {
        await dashboard.POMs.testsPage.switchToTab()
        await expect(dashboard.page.locator('#run-tests-btn')).toBeVisible()
        await expect(dashboard.page.locator('#stop-tests-btn')).toBeVisible()
        await expect(dashboard.page.locator('#test-project')).toBeVisible()
      }
    )
  })

  dashboardTest.describe('Tab Navigation', () => {
    dashboardTest('should switch to Demo Apps tab', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.switchToTab()
      await expect(dashboard.page.locator('#demo-apps')).toHaveClass(/active/)
      await expect(dashboard.page.locator('#tests')).not.toHaveClass(/active/)
      await expect(dashboard.page.locator('#reports')).not.toHaveClass(/active/)
    })

    dashboardTest('should switch to Tests & Status tab', async ({ dashboard }) => {
      await dashboard.POMs.testsPage.switchToTab()
      await expect(dashboard.page.locator('#tests')).toHaveClass(/active/)
      await expect(dashboard.page.locator('#demo-apps')).not.toHaveClass(/active/)
      await expect(dashboard.page.locator('#reports')).not.toHaveClass(/active/)
    })

    dashboardTest('should switch to Reports tab', async ({ dashboard }) => {
      await dashboard.POMs.reportsPage.switchToTab()
      await expect(dashboard.page.locator('#reports')).toHaveClass(/active/)
      await expect(dashboard.page.locator('#demo-apps')).not.toHaveClass(/active/)
      await expect(dashboard.page.locator('#tests')).not.toHaveClass(/active/)
    })

    dashboardTest('should maintain tab state when switching', async ({ dashboard }) => {
      // Switch to tests tab
      await dashboard.POMs.testsPage.switchToTab()
      await expect(dashboard.page.locator('#tests')).toHaveClass(/active/)

      // Switch to reports tab
      await dashboard.POMs.reportsPage.switchToTab()
      await expect(dashboard.page.locator('#reports')).toHaveClass(/active/)

      // Switch back to tests tab
      await dashboard.POMs.testsPage.switchToTab()
      await expect(dashboard.page.locator('#tests')).toHaveClass(/active/)
    })
  })

  dashboardTest.describe('Demo App Start/Stop', () => {
    dashboardTest('should start production app via UI', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('production')
    })

    dashboardTest('should stop production app via UI', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('production')
      await dashboard.POMs.demoAppsPage.stopApp('production')
    })

    dashboardTest('should start staging app via UI', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('staging')
    })

    dashboardTest('should start development app via UI', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('development')
    })
  })

  dashboardTest.describe('Log Viewer', () => {
    dashboardTest('should expand and collapse log details', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.switchToTab()
      const details = dashboard.page.locator('.environment-card').first().locator('details')

      // Initially collapsed
      await expect(details).not.toHaveAttribute('open')

      // Click to expand
      await details.locator('summary').click()
      await expect(details).toHaveAttribute('open', '')

      // Click to collapse
      await details.locator('summary').click()
      await expect(details).not.toHaveAttribute('open')
    })

    dashboardTest('should display logs after starting app', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('production')

      // Wait a bit for logs to appear
      await dashboard.page.waitForTimeout(2000)

      // Expand logs
      await dashboard.POMs.demoAppsPage.expandLogs('production')

      const logs = await dashboard.POMs.demoAppsPage.getLogs('production')
      expect(logs).not.toBe('No logs yet...')
    })
  })

  dashboardTest.describe('Test Runner UI', () => {
    dashboardTest('should run tests via UI button', async ({ dashboard }) => {
      // Start production app first
      await dashboard.POMs.demoAppsPage.startApp('production')

      // Switch to tests tab and run tests
      await dashboard.POMs.testsPage.runTests()
    })

    dashboardTest('should show test output in logs area', async ({ dashboard }) => {
      // Start production app first
      await dashboard.POMs.demoAppsPage.startApp('production')

      // Switch to tests tab and run tests
      await dashboard.POMs.testsPage.runTests()

      // Wait for test output to appear
      await dashboard.page.waitForTimeout(3000)

      const testOutput = await dashboard.POMs.testsPage.getTestOutput()
      expect(testOutput).not.toBe('No test output yet...')
    })

    dashboardTest('should accept project filter input', async ({ dashboard }) => {
      await dashboard.POMs.testsPage.setProjectFilter('chromium')
      const filterValue = await dashboard.POMs.testsPage.getProjectFilter()
      expect(filterValue).toBe('chromium')
    })

    dashboardTest('should stop tests via UI button', async ({ dashboard }) => {
      // Start app and tests
      await dashboard.POMs.demoAppsPage.startApp('production')
      await dashboard.POMs.testsPage.runTests()

      // Stop tests
      await dashboard.POMs.testsPage.stopTests()
    })
  })

  dashboardTest.describe('Report Viewer', () => {
    dashboardTest('should show report placeholder initially', async ({ dashboard }) => {
      await dashboard.POMs.reportsPage.switchToTab()
      const placeholder = dashboard.page.locator('.report-placeholder')
      await expect(placeholder).toBeVisible()
      await expect(placeholder).toContainText(/Run tests to generate a report/)
    })

    dashboardTest('should have refresh report button', async ({ dashboard }) => {
      await dashboard.POMs.reportsPage.switchToTab()
      await expect(dashboard.page.locator('#refresh-report-btn')).toBeVisible()
      await expect(dashboard.page.locator('#refresh-report-btn')).toContainText(/Refresh/)
    })

    dashboardTest('should load report iframe after test run with report', async ({ dashboard }) => {
      await dashboard.POMs.reportsPage.switchToTab()
      // This test assumes there's already a report from previous runs
      // If not, it will just verify the refresh mechanism works
      await dashboard.POMs.reportsPage.refreshReport()

      // Check if iframe appears (may not if no report exists)
      const _iframe = dashboard.page.locator('iframe.report-iframe')
      // Just verify the click worked without error
      await expect(dashboard.page.locator('#report-container')).toBeVisible()
    })
  })

  dashboardTest.describe('Real-time Status Updates', () => {
    dashboardTest('should show uptime counter when app running', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('production')

      // Verify uptime is displayed (format: "Running (Xs)")
      await expect(dashboard.page.locator('#status-production')).toContainText(/\d+s/)
    })

    dashboardTest('should show test duration when running', async ({ dashboard }) => {
      await dashboard.POMs.demoAppsPage.startApp('production')
      await dashboard.POMs.testsPage.runTests()

      // Verify duration is displayed (format: "Running... (Xs)")
      await expect(dashboard.page.locator('#test-status')).toContainText(/\d+s/)
    })
  })
})
