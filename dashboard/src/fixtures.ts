import { test as base } from '@playwright/test'
import { buildDashboardPage } from './POMs/dashboardPage.ts'
import { buildDemoAppsPage } from './POMs/demoAppsPage.ts'
import { buildEnvironmentCard } from './POMs/environmentCard.ts'
import type { ComponentObject, PageObject } from './POMs/pomTemplate'
import { buildReportsPage } from './POMs/reportsPage.ts'
import { buildTabNavigation } from './POMs/tabNavigation.ts'
import { buildTestsPage } from './POMs/testsPage.ts'
import { cleanupAll, getDashboardUrl, waitForDashboardReady } from './setup.ts'
import type { DashboardFixture } from './types.ts'

type PageLinkKeys = 'dashboard' | 'demoApps' | 'tests' | 'reports'

export type PagePOMRegistry = {
  [K in PageLinkKeys as `${string & K}Page`]?: PageObject
} & {
  dashboardPage: ReturnType<typeof buildDashboardPage>
  demoAppsPage: ReturnType<typeof buildDemoAppsPage>
  testsPage: ReturnType<typeof buildTestsPage>
  reportsPage: ReturnType<typeof buildReportsPage>
}

type ComponentPOMRegistry = Record<string, ComponentObject> & {
  tabNavigation: ReturnType<typeof buildTabNavigation>
  productionEnvironmentCard: ReturnType<typeof buildEnvironmentCard>
  stagingEnvironmentCard: ReturnType<typeof buildEnvironmentCard>
  developmentEnvironmentCard: ReturnType<typeof buildEnvironmentCard>
}

export type TestFixtures = {
  POMs: {
    pages: PagePOMRegistry
    components: ComponentPOMRegistry
  }
}

export const test = base.extend<TestFixtures>({
  // POM registry fixture
  POMs: async ({ page }, use) => {
    // Navigate to dashboard
    await page.goto(getDashboardUrl())

    // Build POMs using registry pattern
    const dashboardPage = buildDashboardPage(page)
    const demoAppsPage = buildDemoAppsPage(page)
    const testsPage = buildTestsPage(page)
    const reportsPage = buildReportsPage(page)

    // Build components
    const tabNavigation = buildTabNavigation(page)
    const productionEnvironmentCard = buildEnvironmentCard(page, 'production')
    const stagingEnvironmentCard = buildEnvironmentCard(page, 'staging')
    const developmentEnvironmentCard = buildEnvironmentCard(page, 'development')

    const pomRegistry: TestFixtures['POMs'] = {
      pages: {
        dashboardPage,
        demoAppsPage,
        testsPage,
        reportsPage,
      },
      components: {
        tabNavigation,
        productionEnvironmentCard,
        stagingEnvironmentCard,
        developmentEnvironmentCard,
      },
    }

    await use(pomRegistry)
  },
})

// Test with dashboard setup/teardown
export const dashboardTest = base.extend<TestFixtures>({
  // POM registry fixture with setup/teardown
  POMs: async ({ page, request }, use) => {
    // Wait for dashboard to be ready
    await waitForDashboardReady(request)

    // Clean up before test
    await cleanupAll(request)

    // Navigate to dashboard
    await page.goto(getDashboardUrl())

    // Build POMs using registry pattern
    const dashboardPage = buildDashboardPage(page)
    const demoAppsPage = buildDemoAppsPage(page)
    const testsPage = buildTestsPage(page)
    const reportsPage = buildReportsPage(page)

    // Build components
    const tabNavigation = buildTabNavigation(page)
    const productionEnvironmentCard = buildEnvironmentCard(page, 'production')
    const stagingEnvironmentCard = buildEnvironmentCard(page, 'staging')
    const developmentEnvironmentCard = buildEnvironmentCard(page, 'development')

    const pomRegistry: TestFixtures['POMs'] = {
      pages: {
        dashboardPage,
        demoAppsPage,
        testsPage,
        reportsPage,
      },
      components: {
        tabNavigation,
        productionEnvironmentCard,
        stagingEnvironmentCard,
        developmentEnvironmentCard,
      },
    }

    await use(pomRegistry)

    // Clean up after test
    await cleanupAll(request)
  },
})
