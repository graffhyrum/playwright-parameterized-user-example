# E2E Test Framework

Playwright test framework with parameterized testing across browsers, user tiers, and environments.

## Features

- **36 test configurations** - Matrix of 6 browsers × 2 user tiers × 3 environments
- **Custom fixtures** - Environment and user tier fixtures with automatic provisioning
- **Page Object Models** - Revealing module pattern with environment-aware configuration
- **Isolated contexts** - Each test gets dedicated browser contexts and users

## Running Tests

From the e2e directory:

```bash
# Run all tests (36 configurations)
bunx playwright test

# Run specific project
bunx playwright test --project="chromium-free production"

# Run with UI
bunx playwright test --ui

# Run specific test file
bunx playwright test tests/example.spec.ts

# Show report
bunx playwright show-report
```

From the root directory:

```bash
bun test
bun test:ui
bun test:report
```

## Architecture

### Project Matrix Generation

See `src/getProjects.ts:5-56` for the dynamic project generation logic that creates 36 unique test configurations.

### Custom Fixtures

See `src/fixtures.ts` for the custom fixture implementation that extends Playwright with:
- `thisEnvironment` - current test environment
- `userTier` - current user tier
- `user1`, `user2` - isolated user instances with POMs

### Page Objects

See `src/POMs/` for page object implementations using the revealing module pattern.

## Test Users

Tests use pre-configured demo users from the demo-app:
- Free: `user@free.com` / `password123`
- Paid: `user@paid.com` / `password123`

## Environment URLs

Tests connect to different ports based on environment:
- Production: `http://localhost:3000`
- Staging: `http://localhost:3001`
- Development: `http://localhost:3002`

Make sure the demo app is running on the appropriate port(s) before running tests.
