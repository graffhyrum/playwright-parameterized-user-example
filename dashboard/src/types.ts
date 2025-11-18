import { type Environment, environments } from '@monorepo/utils'
import type { Page } from '@playwright/test'
import type { DashboardPageObject } from './POMs/dashboardPage'
import type { DemoAppsPageObject } from './POMs/demoAppsPage'
import type { EnvironmentCardComponent } from './POMs/environmentCard'
import type { ReportsPageObject } from './POMs/reportsPage'
import type { TabNavigationComponent } from './POMs/tabNavigation'
import type { TestsPageObject } from './POMs/testsPage'
import type { TestFixtures } from './fixtures'

// Re-export POM types for convenience
export type {
  DashboardPageObject,
  DemoAppsPageObject,
  TestsPageObject,
  ReportsPageObject,
  TabNavigationComponent,
  EnvironmentCardComponent,
}

// Re-export utils types for convenience
export { environments, type Environment }

// Dashboard environment - simpler than e2e since dashboard is single environment
export type DashboardEnvironment = 'dashboard'

// Tab names for the dashboard
export const dashboardTabs = ['demo-apps', 'tests', 'reports'] as const
export type DashboardTab = (typeof dashboardTabs)[number]

// Environment names for demo apps (alias for utils environments)
export const demoEnvironments = environments
export type DemoEnvironment = Environment

// Status of demo app instances
export type AppStatus = 'running' | 'stopped'

// Test status
export type TestStatus = 'running' | 'completed' | 'failed' | 'idle'

// Dashboard fixture that provides POMs and page
export type DashboardFixture = {
  page: Page
} & TestFixtures
