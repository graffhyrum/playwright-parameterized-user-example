import type {Page} from "@playwright/test";
import type {LoginPageObject} from "./POMs/loginPage.ts";

export const testableEnvironments = [
    'production',
    'staging',
    'development',
] as const;
export type TestableEnvironment = typeof testableEnvironments[number];
export const userTiers = [
    'free',
    'paid'
] as const
export type UserTier = typeof userTiers[number];
export type User = {
    tier: UserTier
    env: TestableEnvironment
    username: string;
    password: string;
}
export type UserFixture = {
    POMs: {
        loginPage: LoginPageObject;
    };
    env: TestableEnvironment;
    page: Page;
    tier: UserTier
}
