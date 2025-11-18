import { type Page, expect } from '@playwright/test'
import type { DemoEnvironment } from '../types.ts'
import type { ComponentFactory, ComponentObject } from './pomTemplate'

export function buildEnvironmentCardComponent(page: Page, environment: DemoEnvironment) {
  const envTitle = environment.charAt(0).toUpperCase() + environment.slice(1)
  const portMap = {
    production: 3000,
    staging: 3001,
    development: 3002,
  }

  return {
    page,
    actions: {
      expandLogs: async () => {
        const details = page.locator(`.environment-card:has(h3:has-text("${envTitle}")) details`)
        await details.locator('summary').click()
        await expect(details).toHaveAttribute('open', '')
      },

      collapseLogs: async () => {
        const details = page.locator(`.environment-card:has(h3:has-text("${envTitle}")) details`)
        await details.locator('summary').click()
        await expect(details).not.toHaveAttribute('open')
      },

      toggleLogs: async () => {
        const details = page.locator(`.environment-card:has(h3:has-text("${envTitle}")) details`)
        const isOpen = await details.evaluate((el) => (el as HTMLElement).hasAttribute('open'))
        await details.locator('summary').click()
        if (isOpen) {
          await expect(details).not.toHaveAttribute('open')
        } else {
          await expect(details).toHaveAttribute('open', '')
        }
      },
    },
    assertions: {
      isVisible: async () => {
        await expect(page.locator(`h3:has-text("${envTitle}")`)).toBeVisible()
      },

      hasPortBadge: async () => {
        await expect(page.locator(`text=Port ${portMap[environment]}`)).toBeVisible()
      },

      logsExpanded: async () => {
        const details = page.locator(`.environment-card:has(h3:has-text("${envTitle}")) details`)
        await expect(details).toHaveAttribute('open', '')
      },

      logsCollapsed: async () => {
        const details = page.locator(`.environment-card:has(h3:has-text("${envTitle}")) details`)
        await expect(details).not.toHaveAttribute('open')
      },

      hasLogsContent: async () => {
        const logs = await page.locator(`#logs-${environment}`).textContent()
        expect(logs).not.toBe('No logs yet...')
      },
    },
  } as const satisfies ComponentObject
}

export const buildEnvironmentCard = buildEnvironmentCardComponent satisfies ComponentFactory

export type EnvironmentCardComponent = ReturnType<typeof buildEnvironmentCard>
