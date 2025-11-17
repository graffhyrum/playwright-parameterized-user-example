import type { Browser, PlaywrightTestProject } from '@playwright/test'
// fixtures
import { test as base } from 'playwright/test'
import { buildLoginPageObject, type LoginPageObject } from './POMs/loginPage.ts'
import type { TestableEnvironment, UserFixture, UserTier } from './types.ts'
import { getUserManager } from './userManager.ts'

export type Fixtures = {
  thisEnvironment: TestableEnvironment
  userTier: UserTier
  user1: UserFixture
  user2: UserFixture
  loginPage: LoginPageObject
}

export type ThisTestProject = PlaywrightTestProject<Fixtures>

export const test = base.extend<Fixtures>({
  // fixture options. These will be set by the project matrix
  thisEnvironment: ['production', { option: true }],
  userTier: ['free', { option: true }],

  user1: async ({ browser, userTier, thisEnvironment }, use) => {
    await buildUserFixture(browser, userTier, thisEnvironment, use)
  },
  user2: async ({ browser, userTier, thisEnvironment }, use) => {
    await buildUserFixture(browser, userTier, thisEnvironment, use)
  },
})

async function buildUserFixture(
  browser: Browser,
  tier: UserTier,
  env: TestableEnvironment,
  use: (f: UserFixture) => Promise<void>
) {
  const context = await browser.newContext()
  const page = await context.newPage()

  const userManager = getUserManager(tier, env)
  const user = await userManager.create()

  const userFixture: UserFixture = {
    page,
    tier,
    env,
    POMs: {
      loginPage: buildLoginPageObject(page, env, user),
    },
  }

  await use(userFixture)
  await userManager.delete(user)
}
