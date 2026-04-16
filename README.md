# Playwright Parameterized Testing Framework

[![CI](https://github.com/graffhyrum/playwright-parameterized-user-example/actions/workflows/ci.yml/badge.svg)](https://github.com/graffhyrum/playwright-parameterized-user-example/actions/workflows/ci.yml)
[![Playwright](https://img.shields.io/badge/Playwright-1.50+-2eadff?logo=playwright)](https://playwright.dev)

Portfolio project showcasing advanced Playwright patterns: dynamic test matrix generation, custom fixtures, and environment-aware Page Object Models.

## Why This Project

Test automation suites grow configuration exponentially as teams add browsers, environments, and user tiers. Hardcoding project matrices means every change touches multiple files. This project demonstrates a **programmatic, composable approach** where:

- The test matrix is generated from three axes (browsers × tiers × environments) — adding a new browser is a one-line change
- User provisioning is handled by fixtures with explicit lifecycle hooks — tests are fully isolated
- Page objects adapt to environment without conditional sprawl

**See [docs/interview-pack.md](docs/interview-pack.md)** for full architectural decisions, trade-offs, and interview angles.

## Quick Start

```bash
bun install
bun run test    # starts demo server + runs full test suite
```

## What It Demonstrates

### 1. Dynamic Test Matrix (36 configurations)

Programmatically generates test projects from combinations of browsers, user tiers, and environments:

```typescript
// 6 browsers × 2 tiers × 3 environments = 36 unique test configurations
bunx playwright test --project="chromium-free production"
```

[Full implementation →](src/getProjects.ts)

### 2. Custom Fixtures with User Provisioning

Extends Playwright with environment-aware fixtures and isolated user contexts:

```typescript
// Each test gets isolated user instances with automatic cleanup
export const test = base.extend<Fixtures>({
  user1: async ({ browser, userTier, thisEnvironment }, use) => {
    // create user → use fixture → delete user
  },
});
```

[Full implementation →](src/fixtures.ts)

### 3. Environment-Aware Page Objects

POMs use revealing module pattern and adapt to environment configuration:

```typescript
// Factory function returns explicit API surface
export const buildLoginPageObject = (page, env, user) => {
  return {
    login: async () => { /* env-aware login */ },
    assertTier: async (expectedTier) => { /* verify tier */ },
  };
};
```

[Full implementation →](src/POMs/loginPage.ts)

## Architecture

```
├── src/
│   ├── getProjects.ts      # Project matrix generation (36 configs)
│   ├── fixtures.ts         # Custom fixtures + user provisioning
│   ├── userManager.ts      # User lifecycle management
│   ├── types.ts            # Type definitions
│   ├── POMs/
│   │   └── loginPage.ts    # Revealing module POM
│   └── demoServer/
│       └── index.ts        # Demo SUT
├── tests/
│   └── example.spec.ts     # Example test
├── playwright.config.ts
└── docs/
    └── interview-pack.md   # Architecture decisions + interview angles
```

## Key Patterns

✓ Programmatic test configuration (36 configs from 3 axes)  
✓ Custom fixture composition  
✓ Revealing module POMs _(not ES6 classes)_  
✓ Environment-driven test data  
✓ Isolated user contexts per test  
✓ Cookie-based auth with explicit lifecycle
