import type { Page } from '@playwright/test'

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
  POMs: {
    demoAppsPage: DemoAppsPageObject
    testsPage: TestsPageObject
    reportsPage: ReportsPageObject
  }
}

// Forward declarations for POM types (defined in their respective files)
export type DemoAppsPageObject = {
  switchToTab: () => Promise<void>
  startApp: (env: DemoEnvironment) => Promise<void>
  stopApp: (env: DemoEnvironment) => Promise<void>
  toggleApp: (env: DemoEnvironment) => Promise<void>
  startAllApps: () => Promise<void>
  toggleAllApps: () => Promise<void>
  getAppStatus: (env: DemoEnvironment) => Promise<AppStatus>
  expandLogs: (env: DemoEnvironment) => Promise<void>
  getLogs: (env: DemoEnvironment) => Promise<string>
}

export type TestsPageObject = {
  switchToTab: () => Promise<void>
  runTests: (project?: string) => Promise<void>
  stopTests: () => Promise<void>
  getTestStatus: () => Promise<TestStatus>
  getTestOutput: () => Promise<string>
  setProjectFilter: (project: string) => Promise<void>
  getProjectFilter: () => Promise<string>
}

export type ReportsPageObject = {
  switchToTab: () => Promise<void>
  refreshReport: () => Promise<void>
  isReportAvailable: () => Promise<boolean>
}
