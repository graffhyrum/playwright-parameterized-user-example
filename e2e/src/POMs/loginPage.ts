import { getDemoAppUrl } from '@monorepo/utils'
import { expect, type Page } from '@playwright/test'
import type { TestableEnvironment, User } from '../types.ts'

export function buildLoginPageObject(page: Page, env: TestableEnvironment, user: User) {
  // Dynamically set the URL of this page by environment
  // Each environment runs on a different port for the demo app
  const url = getDemoAppUrl(env)

  return {
    login: async () => {
      await page.goto(url)
      await page.fill('input[name="email"]', user.username)
      await page.fill('input[name="password"]', user.password)
      await page.click('button[type="submit"]')
    },
    assertNameIsVisible: async () => {
      await expect(page.locator('#userName')).toBeVisible()
    },
    assertTier: async () => {
      await expect(page.locator('#userTier')).toHaveText(user.tier)
    },
  }
}

export type LoginPageObject = ReturnType<typeof buildLoginPageObject>
