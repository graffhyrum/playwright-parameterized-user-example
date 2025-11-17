import { devices, type PlaywrightTestProject } from '@playwright/test'
import type { ThisTestProject } from './fixtures.ts'
import { testableEnvironments, userTiers } from './types.ts'

export function getProjects() {
  const projects: ThisTestProject[] = []
  const browserConfigs = [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ] as const satisfies PlaywrightTestProject[]

  for (const browserConfig of browserConfigs) {
    for (const testableUser of userTiers) {
      for (const testableEnvironment of testableEnvironments) {
        const params: ThisTestProject = {
          name: `${browserConfig.name}-${testableUser} ${testableEnvironment}`,
          use: {
            ...browserConfig.use,
            thisEnvironment: testableEnvironment,
            userTier: testableUser,
          },
        }
        projects.push(params)
      }
    }
  }
  return projects
}
