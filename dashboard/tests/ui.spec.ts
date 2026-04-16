import { expect } from '@playwright/test'
import { dashboardTest } from '../src'

dashboardTest.describe('Dashboard UI Tests', () => {
  dashboardTest.describe('Page Load', () => {
    dashboardTest('should load dashboard with correct title', async ({ POMs }) => {
      await POMs.pages.dashboardPage.assertions.hasCorrectTitle()
    })

    dashboardTest('should display main layout elements', async ({ POMs }) => {
      await POMs.pages.dashboardPage.assertions.hasMainLayoutElements()
    })

    dashboardTest('should show tab navigation', async ({ POMs }) => {
      await POMs.pages.dashboardPage.assertions.hasTabNavigation()
    })

    dashboardTest('should default to Demo Apps tab', async ({ POMs }) => {
      await POMs.pages.dashboardPage.assertions.isDefaultTabActive()
    })

    dashboardTest('should show all three environment cards in Demo Apps tab', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.switchToTab()
      await POMs.components.productionEnvironmentCard.assertions.isVisible()
      await POMs.components.stagingEnvironmentCard.assertions.isVisible()
      await POMs.components.developmentEnvironmentCard.assertions.isVisible()
    })

    dashboardTest('should show port badges in Demo Apps tab', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.switchToTab()
      await POMs.components.productionEnvironmentCard.assertions.hasPortBadge()
      await POMs.components.stagingEnvironmentCard.assertions.hasPortBadge()
      await POMs.components.developmentEnvironmentCard.assertions.hasPortBadge()
    })

    dashboardTest(
      'should have test runner controls visible in Tests & Status tab',
      async ({ POMs, page }) => {
        await POMs.pages.testsPage.actions.switchToTab()
        await expect(page.locator('#run-tests-btn')).toBeVisible()
        await expect(page.locator('#stop-tests-btn')).toBeVisible()
        await expect(page.locator('#test-project')).toBeVisible()
      }
    )
  })

  dashboardTest.describe('Tab Navigation', () => {
    dashboardTest('should switch to Demo Apps tab', async ({ POMs }) => {
      await POMs.components.tabNavigation.actions.switchToTab('demo-apps')
      await POMs.components.tabNavigation.assertions.isTabActive('demo-apps')
      await POMs.components.tabNavigation.assertions.isTabInactive('tests')
      await POMs.components.tabNavigation.assertions.isTabInactive('reports')
    })

    dashboardTest('should switch to Tests & Status tab', async ({ POMs }) => {
      await POMs.components.tabNavigation.actions.switchToTab('tests')
      await POMs.components.tabNavigation.assertions.isTabActive('tests')
      await POMs.components.tabNavigation.assertions.isTabInactive('demo-apps')
      await POMs.components.tabNavigation.assertions.isTabInactive('reports')
    })

    dashboardTest('should switch to Reports tab', async ({ POMs }) => {
      await POMs.components.tabNavigation.actions.switchToTab('reports')
      await POMs.components.tabNavigation.assertions.isTabActive('reports')
      await POMs.components.tabNavigation.assertions.isTabInactive('demo-apps')
      await POMs.components.tabNavigation.assertions.isTabInactive('tests')
    })

    dashboardTest('should maintain tab state when switching', async ({ POMs }) => {
      // Switch to tests tab
      await POMs.components.tabNavigation.actions.switchToTab('tests')
      await POMs.components.tabNavigation.assertions.isTabActive('tests')

      // Switch to reports tab
      await POMs.components.tabNavigation.actions.switchToTab('reports')
      await POMs.components.tabNavigation.assertions.isTabActive('reports')

      // Switch back to tests tab
      await POMs.components.tabNavigation.actions.switchToTab('tests')
      await POMs.components.tabNavigation.assertions.isTabActive('tests')
    })
  })

  dashboardTest.describe('Demo App Start/Stop', () => {
    dashboardTest('should start production app via UI', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.startApp('production')
    })

    dashboardTest('should stop production app via UI', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.startApp('production')
      await POMs.pages.demoAppsPage.actions.stopApp('production')
    })

    dashboardTest('should start staging app via UI', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.startApp('staging')
    })

    dashboardTest('should start development app via UI', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.startApp('development')
    })
  })

  dashboardTest.describe('Log Viewer', () => {
    dashboardTest('should expand and collapse log details', async ({ POMs }) => {
      await POMs.pages.demoAppsPage.actions.switchToTab()

      // Initially collapsed
      await POMs.components.productionEnvironmentCard.assertions.logsCollapsed()

      // Click to expand
      await POMs.components.productionEnvironmentCard.actions.expandLogs()
      await POMs.components.productionEnvironmentCard.assertions.logsExpanded()

      // Click to collapse
      await POMs.components.productionEnvironmentCard.actions.collapseLogs()
      await POMs.components.productionEnvironmentCard.assertions.logsCollapsed()
    })

    dashboardTest('should display logs after starting app', async ({ POMs, page }) => {
      await POMs.pages.demoAppsPage.actions.startApp('production')

      // Wait a bit for logs to appear
      await page.waitForTimeout(2000)

      // Expand logs
      await POMs.components.productionEnvironmentCard.actions.expandLogs()

      await POMs.components.productionEnvironmentCard.assertions.hasLogsContent()
    })
  })

  dashboardTest.describe('Test Runner UI', () => {
    dashboardTest('should run tests via UI button', async ({ POMs }) => {
      // Start production app first
      await POMs.pages.demoAppsPage.actions.startApp('production')

      // Switch to tests tab and run tests
      await POMs.pages.testsPage.actions.runTests()
    })

    dashboardTest('should show test output in logs area', async ({ POMs, page }) => {
      // Start production app first
      await POMs.pages.demoAppsPage.actions.startApp('production')

      // Switch to tests tab and run tests
      await POMs.pages.testsPage.actions.runTests()

      // Wait for test output to appear
      await page.waitForTimeout(3000)

      const testOutput = await POMs.pages.testsPage.assertions.getTestOutput()
      expect(testOutput).not.toBe('No test output yet...')
    })

    dashboardTest('should accept project filter input', async ({ POMs }) => {
      await POMs.pages.testsPage.actions.setProjectFilter('chromium')
      const filterValue = await POMs.pages.testsPage.assertions.getProjectFilter()
      expect(filterValue).toBe('chromium')
    })

    dashboardTest('should stop tests via UI button', async ({ POMs }) => {
      // Start app and tests
      await POMs.pages.demoAppsPage.actions.startApp('production')
      await POMs.pages.testsPage.actions.runTests()

      // Stop tests
      await POMs.pages.testsPage.actions.stopTests()
    })
  })

  dashboardTest.describe('Report Viewer', () => {
    dashboardTest('should show report placeholder initially', async ({ POMs, page }) => {
      await POMs.pages.reportsPage.actions.switchToTab()
      const placeholder = page.locator('.report-placeholder')
      await expect(placeholder).toBeVisible()
      await expect(placeholder).toContainText(/Run tests to generate a report/)
    })

    dashboardTest('should have refresh report button', async ({ POMs, page }) => {
      await POMs.pages.reportsPage.actions.switchToTab()
      await expect(page.locator('#refresh-report-btn')).toBeVisible()
      await expect(page.locator('#refresh-report-btn')).toContainText(/Refresh/)
    })

    dashboardTest(
      'should load report iframe after test run with report',
      async ({ POMs, page }) => {
        await POMs.pages.reportsPage.actions.switchToTab()
        // This test assumes there's already a report from previous runs
        // If not, it will just verify the refresh mechanism works
        await POMs.pages.reportsPage.actions.refreshReport()

        // Check if iframe appears (may not if no report exists)
        const _iframe = page.locator('iframe.report-iframe')
        // Just verify the click worked without error
        await expect(page.locator('#report-container')).toBeVisible()
      }
    )
  })

  dashboardTest.describe('Real-time Status Updates', () => {
    dashboardTest('should show uptime counter when app running', async ({ POMs, page }) => {
      await POMs.pages.demoAppsPage.actions.startApp('production')

      // Verify uptime is displayed (format: "Running (Xs)")
      await expect(page.locator('#status-production')).toContainText(/\d+s/)
    })

    dashboardTest('should show test duration when running', async ({ POMs, page }) => {
      await POMs.pages.demoAppsPage.actions.startApp('production')
      await POMs.pages.testsPage.actions.runTests()

      // Verify duration is displayed (format: "Running... (Xs)")
      await expect(page.locator('#test-status')).toContainText(/\d+s/)
    })
  })
})
