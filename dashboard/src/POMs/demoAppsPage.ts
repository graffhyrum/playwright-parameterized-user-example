import { expect, type Page } from '@playwright/test'
import type { DemoAppsPageObject, DemoEnvironment } from '../types.ts'

export function buildDemoAppsPageObject(page: Page): DemoAppsPageObject {
  return {
    switchToTab: async () => {
      await page.click('[data-tab="demo-apps"]')
      await expect(page.locator('#demo-apps')).toHaveClass(/active/)
    },

    startApp: async (env: DemoEnvironment) => {
      await page.click(`#start-btn-${env}`)
      await expect(page.locator(`#status-${env}`)).toContainText(/Running/, { timeout: 10000 })
      await expect(page.locator(`#start-btn-${env}`)).toBeDisabled()
      await expect(page.locator(`#stop-btn-${env}`)).toBeEnabled()
    },

    stopApp: async (env: DemoEnvironment) => {
      await page.click(`#stop-btn-${env}`)
      await expect(page.locator(`#status-${env}`)).toContainText(/Stopped/, { timeout: 5000 })
      await expect(page.locator(`#start-btn-${env}`)).toBeEnabled()
      await expect(page.locator(`#stop-btn-${env}`)).toBeDisabled()
    },

    toggleApp: async (env: DemoEnvironment) => {
      const statusEl = page.locator(`#status-${env}`)
      const isRunning = await statusEl.evaluate((el: any) => el.classList.contains('running'))

      if (isRunning) {
        await page.click(`#stop-btn-${env}`)
        await expect(page.locator(`#status-${env}`)).toContainText(/Stopped/, { timeout: 5000 })
        await expect(page.locator(`#start-btn-${env}`)).toBeEnabled()
        await expect(page.locator(`#stop-btn-${env}`)).toBeDisabled()
      } else {
        await page.click(`#start-btn-${env}`)
        await expect(page.locator(`#status-${env}`)).toContainText(/Running/, { timeout: 10000 })
        await expect(page.locator(`#start-btn-${env}`)).toBeDisabled()
        await expect(page.locator(`#stop-btn-${env}`)).toBeEnabled()
      }
    },

    startAllApps: async () => {
      await page.click('text=Start All')
      // Wait for all apps to start
      for (const env of ['production', 'staging', 'development'] as const) {
        await expect(page.locator(`#status-${env}`)).toContainText(/Running/, { timeout: 10000 })
      }
    },

    toggleAllApps: async () => {
      await page.click('text=Toggle All')
      // This toggles all apps, so we can't predict the final state
      // Just wait a moment for the action to complete
      await page.waitForTimeout(1000)
    },

    getAppStatus: async (env: DemoEnvironment): Promise<'running' | 'stopped'> => {
      const statusEl = page.locator(`#status-${env}`)
      const isRunning = await statusEl.evaluate((el: any) => el.classList.contains('running'))
      return isRunning ? 'running' : 'stopped'
    },

    expandLogs: async (env: DemoEnvironment) => {
      const details = page.locator(
        `.environment-card:has(h3:has-text("${env.charAt(0).toUpperCase() + env.slice(1)}")) details`
      )
      await details.locator('summary').click()
      await expect(details).toHaveAttribute('open', '')
    },

    getLogs: async (env: DemoEnvironment): Promise<string> => {
      const logsEl = page.locator(`#logs-${env}`)
      return (await logsEl.textContent()) || ''
    },
  }
}
