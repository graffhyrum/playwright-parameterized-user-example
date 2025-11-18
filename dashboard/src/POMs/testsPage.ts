import { type Page, expect } from '@playwright/test'
import type { PageObject, PomFactory } from './pomTemplate'

export function buildTestsPageObject(page: Page) {
  return {
    page,
    actions: {
      switchToTab: async () => {
        await page.click('[data-tab="tests"]')
        await expect(page.locator('#tests')).toHaveClass(/active/)
      },

      runTests: async (project?: string) => {
        if (project) {
          await page.fill('#test-project', project)
        }
        await page.click('#run-tests-btn')

        // Wait for running status
        await expect(page.locator('#test-status')).toContainText(/Running/, { timeout: 5000 })
        await expect(page.locator('#run-tests-btn')).toBeDisabled()
        await expect(page.locator('#stop-tests-btn')).toBeEnabled()
      },

      stopTests: async () => {
        await page.click('#stop-tests-btn')
        await page.waitForTimeout(2000) // Wait for stop to complete
        await expect(page.locator('#run-tests-btn')).toBeEnabled()
        await expect(page.locator('#stop-tests-btn')).toBeDisabled()
      },

      setProjectFilter: async (project: string) => {
        await page.fill('#test-project', project)
        await expect(page.locator('#test-project')).toHaveValue(project)
      },
    },
    assertions: {
      getTestStatus: async (): Promise<'running' | 'completed' | 'failed' | 'idle'> => {
        const statusEl = page.locator('#test-status')
        const statusText = await statusEl.textContent()

        if (!statusText || statusText.trim() === '') {
          return 'idle'
        }

        if (statusText.includes('Running')) {
          return 'running'
        }

        if (statusText.includes('passed') || statusText.includes('✓')) {
          return 'completed'
        }

        if (statusText.includes('failed') || statusText.includes('✗')) {
          return 'failed'
        }

        return 'idle'
      },

      getTestOutput: async (): Promise<string> => {
        const logsEl = page.locator('#test-logs')
        return (await logsEl.textContent()) || ''
      },

      getProjectFilter: async (): Promise<string> => {
        return await page.locator('#test-project').inputValue()
      },
    },
  } as const satisfies PageObject
}

export const buildTestsPage = buildTestsPageObject satisfies PomFactory

export type TestsPageObject = ReturnType<typeof buildTestsPage>
