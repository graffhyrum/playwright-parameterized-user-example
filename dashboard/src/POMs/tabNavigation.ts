import { type Page, expect } from '@playwright/test'
import type { ComponentFactory, ComponentObject } from './pomTemplate'

export type TabName = 'demo-apps' | 'tests' | 'reports'

export function buildTabNavigationComponent(page: Page) {
  return {
    page,
    actions: {
      switchToTab: async (tabName: TabName) => {
        await page.click(`[data-tab="${tabName}"]`)
        await expect(page.locator(`#${tabName}`)).toHaveClass(/active/)
      },
    },
    assertions: {
      isTabActive: async (tabName: TabName) => {
        await expect(page.locator(`#${tabName}`)).toHaveClass(/active/)
        await expect(page.locator(`[data-tab="${tabName}"]`)).toHaveClass(/active/)
      },

      isTabInactive: async (tabName: TabName) => {
        await expect(page.locator(`#${tabName}`)).not.toHaveClass(/active/)
      },

      areOtherTabsInactive: async (activeTab: TabName) => {
        const inactiveTabs = (['demo-apps', 'tests', 'reports'] as const).filter(
          (tab) => tab !== activeTab
        )
        for (const tab of inactiveTabs) {
          await expect(page.locator(`#${tab}`)).not.toHaveClass(/active/)
        }
      },
    },
  } as const satisfies ComponentObject
}

export const buildTabNavigation = buildTabNavigationComponent satisfies ComponentFactory

export type TabNavigationComponent = ReturnType<typeof buildTabNavigation>
