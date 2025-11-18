import { environments, getDashboardUrl } from '@monorepo/utils'
import { type APIRequestContext, type Page, expect } from '@playwright/test'

const TIMEOUT = 30000

export const waitForDashboardReady = async (request: APIRequestContext) => {
  const dashboardUrl = getDashboardUrl()
  const startTime = Date.now()
  while (Date.now() - startTime < TIMEOUT) {
    try {
      const response = await request.get(`${dashboardUrl}/api/demo-app/status`)
      if (response.ok()) return
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Dashboard server not ready within timeout')
}

export const stopAllDemoApps = async (request: APIRequestContext) => {
  const dashboardUrl = getDashboardUrl()
  for (const environment of environments) {
    try {
      await request.post(`${dashboardUrl}/api/demo-app/stop`, {
        data: { environment },
      })
    } catch {
      // Ignore errors - may already be stopped
    }
  }
  // Wait for processes to stop
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

export const stopTests = async (request: APIRequestContext) => {
  const dashboardUrl = getDashboardUrl()
  try {
    await request.post(`${dashboardUrl}/api/tests/stop`)
  } catch {
    // Ignore errors - may not be running
  }
  // Wait for test process to stop
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

export const cleanupAll = async (request: APIRequestContext) => {
  await stopTests(request)
  await stopAllDemoApps(request)
}

export const waitForDemoAppRunning = async (
  request: APIRequestContext,
  environment: string,
  maxWaitMs = 10000
) => {
  const dashboardUrl = getDashboardUrl()
  const startTime = Date.now()
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request.get(`${dashboardUrl}/api/demo-app/status`)
    const data = await response.json()
    if (data[environment]?.running) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Demo app ${environment} not running within timeout`)
}

export const waitForDemoAppStopped = async (
  request: APIRequestContext,
  environment: string,
  maxWaitMs = 5000
) => {
  const dashboardUrl = getDashboardUrl()
  const startTime = Date.now()
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request.get(`${dashboardUrl}/api/demo-app/status`)
    const data = await response.json()
    if (!data[environment]?.running) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Demo app ${environment} still running after timeout`)
}

export const waitForTestsComplete = async (request: APIRequestContext, maxWaitMs = 60000) => {
  const dashboardUrl = getDashboardUrl()
  const startTime = Date.now()
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request.get(`${dashboardUrl}/api/tests/status`)
    const data = await response.json()
    if (!data.running) return data
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Tests did not complete within timeout')
}

export const assertStatusBadge = async (
  page: Page,
  environment: string,
  expectedStatus: 'running' | 'stopped'
) => {
  const badge = page.locator(`#${environment}-status`)
  await expect(badge).toHaveText(new RegExp(expectedStatus, 'i'))
}
