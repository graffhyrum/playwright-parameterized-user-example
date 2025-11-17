# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a monorepo with three packages:
- **`e2e/`** - Playwright test framework with parameterized testing
- **`demo-app/`** - Demo System Under Test (SUT) web application
- **`dashboard/`** - Control panel SPA for managing demo-app and tests

## Commands

### Installation

**Install all dependencies:**
```bash
bun install
```

### Dashboard

**Start dashboard (manages demo-app and tests):**
```bash
bun run dashboard
```
Then open `http://localhost:4000`

### Demo Application

**Start demo app (single environment):**
```bash
bun run dev:app
```

**Start all environments (for full test matrix):**
```bash
# Production (port 3000)
bun run dev:app:production

# Staging (port 3001)
bun run dev:app:staging

# Development (port 3002)
bun run dev:app:development
```

### Testing

**Run all tests:**
```bash
bun test
```
OR from the e2e directory:
```bash
cd e2e && bunx playwright test
```

**Run specific test:**
```bash
cd e2e && bunx playwright test tests/example.spec.ts
```

**Run single project (browser/user/env combo):**
```bash
cd e2e && bunx playwright test --project="chromium-free production"
```

**Run with UI:**
```bash
bun test:ui
```

**Show test report:**
```bash
bun test:report
```

## Architecture

### Monorepo Layout

```
├── e2e/                    # Playwright test framework
│   ├── src/
│   │   ├── POMs/          # Page Object Models
│   │   ├── fixtures.ts    # Custom fixtures
│   │   ├── getProjects.ts # Project matrix generation
│   │   ├── userManager.ts # User provisioning
│   │   └── types.ts       # TypeScript types
│   ├── tests/             # Test specs
│   ├── playwright.config.ts
│   └── package.json
├── demo-app/              # Demo SUT
│   ├── src/
│   │   └── index.ts       # Bun web server
│   └── package.json
├── dashboard/             # Control panel SPA
│   ├── src/
│   │   ├── index.ts       # Bun server
│   │   ├── processManager.ts
│   │   ├── testRunner.ts
│   │   └── public/        # HTMX-based UI
│   └── package.json
└── package.json           # Workspace root
```

### Parameterized Test Matrix

The e2e framework implements a **matrix of test configurations** that combines:
- **Browsers**: chromium, firefox, webkit, Mobile Chrome, Mobile Safari, Google Chrome
- **User tiers**: free, paid
- **Environments**: production, staging, development

Projects are dynamically generated in `e2e/src/getProjects.ts:5-56`, creating 36 unique test configurations (6 browsers × 2 user tiers × 3 environments).

### Custom Fixtures System

The fixture system in `e2e/src/fixtures.ts` extends Playwright's base test with:
- `thisEnvironment` - current environment being tested (set per project)
- `userTier` - current user tier (set per project)
- `user1`, `user2` - isolated user fixtures with dedicated browser contexts

Each user fixture (`buildUserFixture` in `e2e/src/fixtures.ts:32-55`):
1. Creates new browser context and page
2. Provisions user via `userManager.create()`
3. Injects Page Object Models (POMs) with env-specific configuration
4. Cleans up user via `userManager.delete()` after test

### Page Object Models (POMs)

POMs use revealing module pattern (not ES6 classes) and are built via factory functions. Located in `e2e/src/POMs/`.

`buildLoginPageObject()` in `e2e/src/POMs/loginPage.ts:4-33`:
- Receives `page`, `env`, and `user` at construction
- Dynamically sets URL based on environment (different ports for prod/staging/dev)
- Returns object with methods: `login()`, `assertNameIsVisible()`, `assertTier()`

### User Management

`getUserManager()` in `e2e/src/userManager.ts:3-23` handles user lifecycle per tier/env combo. Returns pre-configured demo users:
- Free tier: `user@free.com` / `password123`
- Paid tier: `user@paid.com` / `password123`

### Demo Application

The demo SUT (`demo-app/src/index.ts`) is a Bun-based web server that provides:
- Multi-environment support (via PORT and NODE_ENV)
- Login system with cookie-based sessions
- User dashboard with tier-specific features
- Pre-configured test users matching the e2e framework expectations

**Ports by environment:**
- Production: 3000
- Staging: 3001
- Development: 3002

### Dashboard

The dashboard (`dashboard/src/index.ts`) is a Bun server with HTMX-based SPA providing:
- Start/stop demo-app instances for each environment
- Real-time log streaming via Server-Sent Events (SSE)
- Playwright test execution with live output
- Embedded HTML report viewer
- No heavy JS framework dependencies (uses HTMX)

**Dashboard port:** 4000

**Key components:**
- `processManager.ts` - demo-app lifecycle (start/stop/logs/status)
- `testRunner.ts` - Playwright execution manager
- SSE updates every 500ms with real-time status

## Key Files

### E2E Framework
- `e2e/playwright.config.ts` - calls `getProjects()` to generate project matrix
- `e2e/src/getProjects.ts` - generates 36 projects from browser/tier/env combinations
- `e2e/src/fixtures.ts` - defines custom fixtures and test extension
- `e2e/src/types.ts` - shared types for environments, user tiers, users, fixtures
- `e2e/src/userManager.ts` - user provisioning (returns demo users)
- `e2e/src/POMs/` - page object models using revealing module pattern

### Demo Application
- `demo-app/src/index.ts` - web server with authentication and tier-based features
- `demo-app/package.json` - demo app dependencies and scripts

### Dashboard
- `dashboard/src/index.ts` - Bun server with API endpoints and SSE
- `dashboard/src/processManager.ts` - demo-app process lifecycle management
- `dashboard/src/testRunner.ts` - Playwright test execution manager
- `dashboard/src/public/` - HTMX-based SPA with real-time updates

### Workspace Root
- `package.json` - monorepo workspace configuration with convenience scripts
- `README.md` - comprehensive project documentation
