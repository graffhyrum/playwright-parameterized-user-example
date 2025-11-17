import { expect } from '@playwright/test';
import { test } from '../src/fixtures'

test('user can login and see dashboard', async ({ user1 }) => {
  // Login using the POM
  await user1.POMs.loginPage.login();

  // Verify user name is visible on dashboard
  await user1.POMs.loginPage.assertNameIsVisible();
});

test('user tier is displayed correctly', async ({ user1 }) => {
  // Login and navigate to dashboard
  await user1.POMs.loginPage.login();

  // Verify the correct tier is displayed
  await user1.POMs.loginPage.assertTier();
});
