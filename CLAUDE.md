# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Install dependencies:**
```bash
bun install
```

**Run tests:**
```bash
bun start
```
OR
```bash
bunx playwright test
```


**Run specific test:**
```bash
bunx playwright test tests/example.spec.ts
```

**Run single project (browser/user/env combo):**
```bash
bunx playwright test --project="chromium-free production"
```

**Show test report:**
```sh
bun report
```
```bash
bunx playwright show-report
```

## Architecture

### Parameterized Test Matrix

This codebase implements a Playwright test framework with a **matrix of test configurations** that combines:
- **Browsers**: chromium, firefox, webkit, Mobile Chrome, Mobile Safari, Google Chrome
- **User tiers**: free, paid
- **Environments**: production, staging, development

Projects are dynamically generated in `src/getProjects.ts:5-56`, creating 36 unique test configurations (6 browsers × 2 user tiers × 3 environments).

### Custom Fixtures System

The fixture system in `src/fixtures.ts` extends Playwright's base test with:
- `thisEnvironment` - current environment being tested (set per project)
- `userTier` - current user tier (set per project)
- `user1`, `user2` - isolated user fixtures with dedicated browser contexts

Each user fixture (`buildUserFixture` in `src/fixtures.ts:32-55`):
1. Creates new browser context and page
2. Provisions user via `userManager.create()`
3. Injects Page Object Models (POMs) with env-specific configuration
4. Cleans up user via `userManager.delete()` after test

### Page Object Models (POMs)

POMs use revealing module pattern (not ES6 classes) and are built via factory functions. Located in `src/POMs/`.

`buildLoginPageObject()` in `src/POMs/loginPage.ts:4-28`:
- Receives `page`, `env`, and `user` at construction
- Dynamically sets URL based on environment
- Returns object with methods: `login()`, `assertNameIsVisible()`, `assertTier()`

### User Management

`getUserManager()` in `src/userManager.ts:3-21` handles user lifecycle per tier/env combo. Stub implementation currently - needs API integration for actual user provisioning.

## Key Files

- `playwright.config.ts` - calls `getProjects()` to generate project matrix
- `src/getProjects.ts` - generates 36 projects from browser/tier/env combinations
- `src/fixtures.ts` - defines custom fixtures and test extension
- `src/types.ts` - shared types for environments, user tiers, users, fixtures
- `src/userManager.ts` - user provisioning/cleanup (stub)
- `src/POMs/` - page object models using revealing module pattern
