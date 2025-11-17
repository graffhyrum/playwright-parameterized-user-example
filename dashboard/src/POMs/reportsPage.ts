import { expect, type Page } from '@playwright/test'
import type { ReportsPageObject } from '../types.ts'

export function buildReportsPageObject(page: Page): ReportsPageObject {
  return {
    switchToTab: async () => {
      await page.click('[data-tab="reports"]')
      await expect(page.locator('#reports')).toHaveClass(/active/)
    },

    refreshReport: async () => {
      await page.click('#refresh-report-btn')
      // The refresh action is complete when clicked
      await expect(page.locator('#report-container')).toBeVisible()
    },

    isReportAvailable: async (): Promise<boolean> => {
      const placeholder = page.locator('.report-placeholder')
      const iframe = page.locator('iframe.report-iframe')

      // If placeholder is visible, no report is available
      const placeholderVisible = await placeholder.isVisible()
      if (placeholderVisible) {
        return false
      }

      // If iframe is present, report is available
      return await iframe.isVisible()
    },
  }
}
