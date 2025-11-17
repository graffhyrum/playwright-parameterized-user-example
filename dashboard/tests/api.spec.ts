import { expect, test } from '@playwright/test'
import {
  cleanupAll,
  getDashboardUrl,
  waitForDashboardReady,
  waitForDemoAppRunning,
  waitForDemoAppStopped,
  waitForTestsComplete,
} from './setup'

const DASHBOARD_URL = getDashboardUrl()

test.describe('Dashboard API Tests', () => {
  test.beforeAll(async ({ request }) => {
    await waitForDashboardReady(request)
  })

  test.beforeEach(async ({ request }) => {
    await cleanupAll(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupAll(request)
  })

  test.afterAll(async ({ request }) => {
    await waitForTestsComplete(request)
  })

  test.describe('Demo App Lifecycle API', () => {
    test('should start production demo app', async ({ request }) => {
      const response = await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'production' },
      })
      expect(response.ok()).toBeTruthy()

      await waitForDemoAppRunning(request, 'production')

      const status = await request.get(`${DASHBOARD_URL}/api/demo-app/status`)
      const data = await status.json()
      expect(data.production.running).toBe(true)
      expect(data.production.uptime).toBeGreaterThanOrEqual(0)
    })

    test('should start staging demo app', async ({ request }) => {
      const response = await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'staging' },
      })
      expect(response.ok()).toBeTruthy()

      await waitForDemoAppRunning(request, 'staging')

      const status = await request.get(`${DASHBOARD_URL}/api/demo-app/status`)
      const data = await status.json()
      expect(data.staging.running).toBe(true)
    })

    test('should start development demo app', async ({ request }) => {
      const response = await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'development' },
      })
      expect(response.ok()).toBeTruthy()

      await waitForDemoAppRunning(request, 'development')

      const status = await request.get(`${DASHBOARD_URL}/api/demo-app/status`)
      const data = await status.json()
      expect(data.development.running).toBe(true)
    })

    test('should stop running demo app', async ({ request }) => {
      // Start first
      await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'production' },
      })
      await waitForDemoAppRunning(request, 'production')

      // Stop
      const response = await request.post(`${DASHBOARD_URL}/api/demo-app/stop`, {
        data: { environment: 'production' },
      })
      expect(response.ok()).toBeTruthy()

      await waitForDemoAppStopped(request, 'production')

      const status = await request.get(`${DASHBOARD_URL}/api/demo-app/status`)
      const data = await status.json()
      expect(data.production.running).toBe(false)
    })

    test('should get status for all environments', async ({ request }) => {
      const response = await request.get(`${DASHBOARD_URL}/api/demo-app/status`)
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data).toHaveProperty('production')
      expect(data).toHaveProperty('staging')
      expect(data).toHaveProperty('development')

      expect(data.production).toHaveProperty('running')
      expect(data.production).toHaveProperty('uptime')
    })

    test('should reject invalid environment', async ({ request }) => {
      const response = await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'invalid' },
      })
      expect(response.ok()).toBe(false)
    })
  })

  test.describe('Logs API', () => {
    test('should fetch demo app logs', async ({ request }) => {
      // Start app to generate logs
      await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'production' },
      })
      await waitForDemoAppRunning(request, 'production')

      // Small delay for logs to accumulate
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const response = await request.get(`${DASHBOARD_URL}/api/demo-app/logs/production`)
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(Array.isArray(data.logs)).toBe(true)
      expect(data.logs.length).toBeGreaterThan(0)
    })

    test('should fetch test logs after run', async ({ request }) => {
      const response = await request.get(`${DASHBOARD_URL}/api/tests/logs`)
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(Array.isArray(data.logs)).toBe(true)
    })
  })

  test.describe('Test Runner API', () => {
    test('should run tests', async ({ request }) => {
      // Start demo app first
      await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'production' },
      })
      await waitForDemoAppRunning(request, 'production')

      const response = await request.post(`${DASHBOARD_URL}/api/tests/run`, {
        data: {},
      })
      expect(response.ok()).toBeTruthy()

      // Wait a bit for test to start
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const status = await request.get(`${DASHBOARD_URL}/api/tests/status`)
      const data = await status.json()
      expect(data).toHaveProperty('running')
      expect(data).toHaveProperty('duration')
    })

    test('should run tests with specific project', async ({ request }) => {
      await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'production' },
      })
      await waitForDemoAppRunning(request, 'production')

      const response = await request.post(`${DASHBOARD_URL}/api/tests/run`, {
        data: { project: 'chromium' },
      })
      expect(response.ok()).toBeTruthy()
    })

    test('should stop running tests', async ({ request }) => {
      // Start demo app and tests
      await request.post(`${DASHBOARD_URL}/api/demo-app/start`, {
        data: { environment: 'production' },
      })
      await waitForDemoAppRunning(request, 'production')

      await request.post(`${DASHBOARD_URL}/api/tests/run`, { data: {} })
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const response = await request.post(`${DASHBOARD_URL}/api/tests/stop`)
      expect(response.ok()).toBeTruthy()

      // Wait for stop to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const status = await request.get(`${DASHBOARD_URL}/api/tests/status`)
      const data = await status.json()
      expect(data.running).toBe(false)
    })

    test('should check for report availability', async ({ request }) => {
      const response = await request.get(`${DASHBOARD_URL}/api/tests/has-report`)
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(typeof data.hasReport).toBe('boolean')
    })
  })
})
