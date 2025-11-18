# Playwright Parameterized Testing Framework

Portfolio project showcasing advanced Playwright patterns: dynamic test matrix generation, custom fixtures, and environment-aware POMs.

## Monorepo Structure

```
├── e2e/                # Playwright test framework
│   ├── src/           # Test utilities, fixtures, POMs
│   ├── tests/         # Test specs
│   └── playwright.config.ts
├── demo-app/          # Demo System Under Test (SUT)
│   └── src/           # Bun-based web application
├── dashboard/         # Control panel SPA
│   └── src/           # Bun server with HTMX UI
└── package.json       # Workspace configuration
```

## 🎛️ Dashboard

This project includes a web-based control panel for managing demo-app instances and running tests:

```bash
bun run dashboard
```

Then open `http://localhost:4000` in your browser.

**Features:**
- Start/stop demo-app instances for each environment
- View real-time logs from running apps
- Run Playwright tests with live output
- View embedded Playwright HTML reports
- Real-time updates via Server-Sent Events (SSE)

See [dashboard/README.md](dashboard/README.md) for details.

## What It Demonstrates

### 1. Dynamic Test Matrix (36 configurations)

Programmatically generates test projects from combinations of browsers, user tiers, and environments:

```typescript
// e2e/src/getProjects.ts:5-56
const browsers = ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari', 'Google Chrome'];
const userTiers = ['free', 'paid'];
const environments = ['production', 'staging', 'development'];

// Creates 6 × 2 × 3 = 36 unique test configurations
```

Run specific configuration:
```bash
cd e2e && bunx playwright test --project="chromium-free production"
```

[Full implementation →](e2e/src/getProjects.ts)

### 2. Custom Fixtures with User Provisioning

Extends Playwright with environment-aware fixtures and isolated user contexts:

```typescript
// e2e/src/fixtures.ts:32-55
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

[Full implementation →](e2e/src/fixtures.ts)

### 3. Environment-Aware Page Objects

POMs use revealing module pattern and adapt to environment configuration:

```typescript
// e2e/src/POMs/loginPage.ts:4-28
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

[Full implementation →](e2e/src/POMs/loginPage.ts)

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Start Demo Application(s)

Run all three environments in separate terminals for full testing:

```bash
# Terminal 1 - Production (port 3000)
cd demo-app && bun run dev:production

# Terminal 2 - Staging (port 3001)
cd demo-app && bun run dev:staging

# Terminal 3 - Development (port 3002)
cd demo-app && bun run dev:development
```

Or run a single environment:

```bash
cd demo-app && bun run dev
```

### 3. Run Tests

```bash
cd e2e && bun run test              # Run all 36 configurations
cd e2e && bun run test:ui           # Run with Playwright UI
cd e2e && bun run test:report       # View test results
```

## Architecture

### E2E Test Framework (`e2e/`)

- **[playwright.config.ts](e2e/playwright.config.ts)** - Matrix configuration entry point
- **[src/getProjects.ts](e2e/src/getProjects.ts)** - Project generation logic (36 configs)
- **[src/fixtures.ts](e2e/src/fixtures.ts)** - Custom fixtures and test extension
- **[src/userManager.ts](e2e/src/userManager.ts)** - User lifecycle management
- **[src/POMs/](e2e/src/POMs/)** - Page object models
- **[src/types.ts](e2e/src/types.ts)** - Type definitions

### Demo Application (`demo-app/`)

- **[src/index.ts](demo-app/src/index.ts)** - Bun web server with multi-env support
- Supports production/staging/development environments
- Pre-configured test users (free/paid tiers)
- Cookie-based authentication

### Dashboard (`dashboard/`)

- **[src/index.ts](dashboard/src/index.ts)** - Bun server with API endpoints
- **[src/processManager.ts](dashboard/src/processManager.ts)** - Demo-app process lifecycle management
- **[src/testRunner.ts](dashboard/src/testRunner.ts)** - Playwright test execution manager
- **[src/public/](dashboard/src/public/)** - HTMX-based SPA with real-time updates

## Key Patterns

✓ Programmatic test configuration
✓ Custom fixture composition
✓ Revealing module POMs _(not ES6 classes)_
✓ Environment-driven test data
✓ Isolated user contexts per test
✓ Monorepo structure with demo SUT

## Test Users

The demo app includes pre-configured users for testing:

- **Free tier**: `user@free.com` / `password123`
- **Paid tier**: `user@paid.com` / `password123`

Access the demo app at:
- Production: `http://localhost:3000`
- Staging: `http://localhost:3001`
- Development: `http://localhost:3002`
