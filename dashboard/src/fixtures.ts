import { test as base } from '@playwright/test'
import { buildDemoAppsPageObject } from './POMs/demoAppsPage.ts'
import { buildReportsPageObject } from './POMs/reportsPage.ts'
import { buildTestsPageObject } from './POMs/testsPage.ts'
import { cleanupAll, getDashboardUrl, waitForDashboardReady } from './setup.ts'
import type { DashboardFixture } from './types.ts'

export const test = base.extend<DashboardFixture>({
  // Dashboard fixture that provides page and POMs
  dashboard: async ({ page }, use) => {
    // Navigate to dashboard
    await page.goto(getDashboardUrl())

    // Build POMs
    const demoAppsPage = buildDemoAppsPageObject(page)
    const testsPage = buildTestsPageObject(page)
    const reportsPage = buildReportsPageObject(page)

    const dashboardFixture: DashboardFixture = {
      page,
      POMs: {
        demoAppsPage,
        testsPage,
        reportsPage,
      },
    }

    await use(dashboardFixture)
  },
})

// Test with dashboard setup/teardown
export const dashboardTest = base.extend<DashboardFixture>({
  // Dashboard fixture that provides page and POMs
  dashboard: async ({ page, request }, use) => {
    // Wait for dashboard to be ready
    await waitForDashboardReady(request)

    // Clean up before test
    await cleanupAll(request)

    // Navigate to dashboard
    await page.goto(getDashboardUrl())

    // Build POMs
    const demoAppsPage = buildDemoAppsPageObject(page)
    const testsPage = buildTestsPageObject(page)
    const reportsPage = buildReportsPageObject(page)

    const dashboardFixture: DashboardFixture = {
      page,
      POMs: {
        demoAppsPage,
        testsPage,
        reportsPage,
      },
    }

    await use(dashboardFixture)

    // Clean up after test
    await cleanupAll(request)
  },
})
