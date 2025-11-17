# Playwright Parameterized Testing Framework

Portfolio project showcasing advanced Playwright patterns: dynamic test matrix generation, custom fixtures, and environment-aware POMs.

## What It Demonstrates

### 1. Dynamic Test Matrix (36 configurations)

Programmatically generates test projects from combinations of browsers, user tiers, and environments:

```typescript
// src/getProjects.ts:5-56
const browsers = ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari', 'Google Chrome'];
const userTiers = ['free', 'paid'];
const environments = ['production', 'staging', 'development'];

// Creates 6 × 2 × 3 = 36 unique test configurations
```

Run specific configuration:
```bash
bunx playwright test --project="chromium-free production"
```

[Full implementation →](src/getProjects.ts)

### 2. Custom Fixtures with User Provisioning

Extends Playwright with environment-aware fixtures and isolated user contexts:

```typescript
// src/fixtures.ts:32-55
export const buildUserFixture = (userNumber: 1 | 2) =>
  async ({ browser, thisEnvironment, userTier }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const user = await userManager.create(userTier, thisEnvironment);
    const poms = buildPOMs(page, thisEnvironment, user);

    await use({ user, page, poms });

    await userManager.delete(user);
    await context.close();
  };
```

Each test gets isolated user instances with automatic cleanup.

[Full implementation →](src/fixtures.ts)

### 3. Environment-Aware Page Objects

POMs use revealing module pattern and adapt to environment configuration:

```typescript
// src/POMs/loginPage.ts:4-28
export const buildLoginPageObject = (page, env, user) => {
  const url = getUrl(env);  // Switches between prod/staging/dev

  return {
    login: async () => {
      await page.goto(url);
      // Login with environment-specific credentials
    },
    assertTier: async (expectedTier) => {
      // Verify user tier in UI
    }
  };
};
```

[Full implementation →](src/POMs/loginPage.ts)

## Quick Start

```bash
bun install
bun start              # Run all 36 configurations
bun report             # View test results
```

## Architecture

- **[playwright.config.ts](playwright.config.ts)** - Matrix configuration entry point
- **[src/getProjects.ts](src/getProjects.ts)** - Project generation logic
- **[src/fixtures.ts](src/fixtures.ts)** - Custom fixtures and test extension
- **[src/userManager.ts](src/userManager.ts)** - User lifecycle management
- **[src/POMs/](src/POMs/)** - Page object models
- **[src/types.ts](src/types.ts)** - Type definitions

## Key Patterns

✓ Programmatic test configuration
✓ Custom fixture composition
✓ Revealing module POMs _(not ES6 classes)_
✓ Environment-driven test data
✓ Isolated user contexts per test
