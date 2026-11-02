# e2e

Playwright tests. Each test runs against the demo app in one environment, as one user tier.

## Commands

Run from `e2e/`. The demo apps must already run for these, unless you use the root `bun run test:e2e`.

- All projects: `bun run test`
- One spec: `bun run test -- tests/example.spec.ts`
- One project: `bun run test --project="chromium-free production"`
- UI mode: `bun run test:ui`
- Report: `bun run test:report`

## Test matrix

`src/getProjects.ts` builds 36 projects: 6 browsers × 2 user tiers × 3 environments.

- Browsers: chromium, firefox, webkit, Mobile Chrome, Mobile Safari, Google Chrome.
- User tiers: `free`, `paid`. Source: `userTiers` in `src/types.ts`.
- Environments: `production`, `staging`, `development`. Source: `environments` in `utils`.
- Project name format: `<browser>-<tier> <environment>`.

## Fixtures and page objects

- `src/fixtures.ts` extends Playwright's `test`. It reads `thisEnvironment` and `userTier` from the project. It provides `user1` and `user2`.
- Each user fixture opens a new browser context and page. It creates the user through `userManager`, builds the page objects, and deletes the user after the test.
- Page objects use the revealing module pattern, not ES6 classes. They live in `src/POMs/`.
- `buildLoginPageObject(page, env, user)` in `src/POMs/loginPage.ts` returns `login()`, `assertNameIsVisible()`, and `assertTier()`. Its URL comes from `getDemoAppUrl(env)` in `utils`.

## Users

`src/userManager.ts` returns fixed demo users. The demo app keeps them, so `delete` does nothing.

- Free: `user@free.com` / `password123`
- Paid: `user@paid.com` / `password123`

## Key files

- `playwright.config.ts`: calls `getProjects()`.
- `src/getProjects.ts`: builds the matrix.
- `src/fixtures.ts`: custom fixtures and the test extension.
- `src/types.ts`: tiers, users, and fixture types.
- `src/userManager.ts`: demo user lookup.
- `src/POMs/`: page objects.
- `tests/`: specs. `tests-examples/` holds example specs.
