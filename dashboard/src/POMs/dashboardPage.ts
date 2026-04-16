import { type Page, expect } from '@playwright/test'
import type { PageObject, PomFactory } from './pomTemplate'

export function buildDashboardPageObject(page: Page) {
  return {
    page,
    actions: {
      // Navigation actions can be added here if needed
    },
    assertions: {
      hasCorrectTitle: async () => {
        await expect(page).toHaveTitle(/Playwright Test Dashboard/)
      },

      hasMainLayoutElements: async () => {
        await expect(page.locator('h1')).toContainText('Playwright Test Dashboard')
        await expect(page.locator('.header-nav')).toBeVisible()
        await expect(page.locator('.tabs-container')).toBeVisible()
      },

      hasTabNavigation: async () => {
        await expect(page.locator('[data-tab="demo-apps"]')).toBeVisible()
        await expect(page.locator('[data-tab="tests"]')).toBeVisible()
        await expect(page.locator('[data-tab="reports"]')).toBeVisible()
      },

      isDefaultTabActive: async () => {
        await expect(page.locator('#demo-apps')).toHaveClass(/active/)
        await expect(page.locator('[data-tab="demo-apps"]')).toHaveClass(/active/)
      },

      isTabActive: async (tabId: string) => {
        await expect(page.locator(`#${tabId}`)).toHaveClass(/active/)
        await expect(page.locator(`[data-tab="${tabId.replace('-', '-')}"]`)).toHaveClass(/active/)
      },

      isTabInactive: async (tabId: string) => {
        await expect(page.locator(`#${tabId}`)).not.toHaveClass(/active/)
      },
    },
  } as const satisfies PageObject
}

export const buildDashboardPage = buildDashboardPageObject satisfies PomFactory

export type DashboardPageObject = ReturnType<typeof buildDashboardPage>
