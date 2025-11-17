import { defineConfig } from '@playwright/test';
import {getProjects} from "./src/getProjects.ts";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', {open: 'never'}]],
  use: {
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: getProjects()
});


