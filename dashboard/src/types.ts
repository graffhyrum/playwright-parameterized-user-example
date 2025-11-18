import type { Page } from '@playwright/test'
import type { DashboardPageObject } from './POMs/dashboardPage'
import type { DemoAppsPageObject } from './POMs/demoAppsPage'
import type { ReportsPageObject } from './POMs/reportsPage'
import type { TestsPageObject } from './POMs/testsPage'
import type { TabNavigationComponent } from './POMs/tabNavigation'
import type { EnvironmentCardComponent } from './POMs/environmentCard'
import type { TestFixtures } from './fixtures'

// Re-export POM types for convenience
export type { DashboardPageObject, DemoAppsPageObject, TestsPageObject, ReportsPageObject, TabNavigationComponent, EnvironmentCardComponent }

// Dashboard environment - simpler than e2e since dashboard is single environment
export type DashboardEnvironment = 'dashboard'

// Tab names for the dashboard
export const dashboardTabs = ['demo-apps', 'tests', 'reports'] as const
export type DashboardTab = (typeof dashboardTabs)[number]

// Environment names for demo apps
export const demoEnvironments = ['production', 'staging', 'development'] as const
export type DemoEnvironment = (typeof demoEnvironments)[number]

// Status of demo app instances
export type AppStatus = 'running' | 'stopped'

// Test status
export type TestStatus = 'running' | 'completed' | 'failed' | 'idle'

// Dashboard fixture that provides POMs and page
export type DashboardFixture = {
  page: Page
} & TestFixtures
