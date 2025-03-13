import {expect, type Page} from "@playwright/test";
import type {TestableEnvironment, User} from "../types.ts";

export function buildLoginPageObject(
    page: Page,
    env: TestableEnvironment,
    user: User
) {
    // Dynamically set the URL of this page by environment. This could also be done
    // at the test level via `baseUrl` in the test options.
    const url =
        env === 'production' ? 'https://example.com' : `https://${env}.example.com`;

    return {
        login: async () => {
            await page.goto(url);
            await page.fill('input[name="username"]', user.username);
            await page.fill('input[name="password"]', user.password);
            await page.click('button[type="submit"]');
        },
        assertNameIsVisible: async () => {
            await expect(page.getByText(user.username)).toBeVisible()
        },
        assertTier: async () => {
            await expect(page.getByText(`Tier: ${user.tier}`)).toBeVisible()
        }
    };
}

export type LoginPageObject = ReturnType<typeof buildLoginPageObject>;
