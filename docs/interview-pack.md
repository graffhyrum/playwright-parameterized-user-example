# Interview Pack: Playwright Parameterized Testing Framework

## The Problem

Test automation projects routinely hit a wall: what starts as "just a few tests" becomes a sprawling suite where adding one new browser or environment means touching dozens of files. At OvationCXM, the team migrated from Cypress to Playwright but still faced configuration sprawl across environments. The answer wasn't a better test runner — it was a **programmatic, composable approach** to test configuration.

## What This Project Is

A portfolio-quality E2E testing framework demonstrating three patterns that matter in senior/Staff SDET roles:

1. **Dynamic test matrix** — 36 configurations generated from 3 axes (6 browsers × 2 user tiers × 3 environments), not hardcoded
2. **User provisioning fixtures** — isolated, self-cleaning user contexts per test via Playwright's fixture system
3. **Environment-aware POMs** — page objects that adapt behavior based on the target environment (prod/staging/dev)

The monorepo also includes a **dashboard control panel** (Bun + HTMX + SSE) for managing demo app instances and monitoring test execution in real time.

## Architecture Decisions

### Why revealing module pattern for POMs (not ES6 classes)?

ES6 class POMs look familiar but have a trap: they encourage binding `this.page` and `this.user` in methods, which creates hidden coupling and makes partial reuse awkward. The revealing module pattern (return an object from a factory function) makes the API surface explicit and makes composition natural. Each POM is a pure function `(page, env, user) => POM` — trivially testable, trivially composable.

### Why not just use Playwright's built-in project matrix?

The built-in matrix is static (defined in `playwright.config.ts`). `getProjects.ts` generates projects programmatically, which means the matrix can be derived from external config, environment variables, or a remote source. This unlocks scenarios like:
- Pull browser list from a team config repo
- Disable mobile browsers on a feature branch
- Run a reduced matrix in CI vs. full matrix on a schedule

### Why cookie-based auth over OAuth/JWT?

Cookie auth is the simplest signal for "logged in vs. not" without external dependencies. A production system would call a user service, but this approach isolates the test framework's concerns from the auth implementation.

### Why explicit fixture teardown over Playwright's auto-cleanup?

Explicit `userManager.delete(user)` makes the cleanup visible and auditable. When debugging test pollution, you can trace exactly what was created and what was deleted.

### Why Bun over Node?

Bun's native TypeScript execution (no build step), faster `bun install`, and bundled process management made it ideal for running the multi-environment demo and dashboard control panel in the same runtime.

## Metrics

| Metric | Value |
|--------|-------|
| Configurations generated | 36 (6 browsers × 2 tiers × 3 envs) |
| User context isolation | Per-test, auto-cleanup via fixture teardown |
| Environments supported | production, staging, development |
| Demo app instances | 3 (one per environment) |
| Dashboard updates | Real-time via Server-Sent Events |

## Trade-offs

| What I chose | What I didn't do | Why |
|---------------|-----------------|-----|
| Cookie-based auth | OAuth, JWT, SSO | Simplest signal for logged-in state without external deps |
| Hardcoded test users | Real user provisioning via API | Isolates test framework from user service complexity |
| Explicit fixture teardown | Playwright's `auto-cleanup` hooks | Makes lifecycle auditable and debuggable |
| HTMX + SSE for dashboard | React + WebSockets | HTMX avoids a JS bundle; SSE avoids a WebSocket server |

## What I'd Do Differently

1. **Add a shared test data store** — currently each environment has its own hardcoded users. A shared PostgreSQL or SQLite test data store with per-environment schemas would be more realistic.
2. **Parameterize the matrix from a config file** — `getProjects.ts` is hardcoded. Extracting it to `CONFIG.ts` would make the project more maintainable.
3. **Add visual regression testing** — Playwright supports screenshot diffing natively. Adding this would round out the testing types demonstrated.

## Interview Angles

- **"Tell me about a time you reduced test flakiness."** → The `userManager` pattern and isolated contexts prevent cross-test pollution, which is a primary cause of flake.
- **"How do you design test data?"** → The `userManager.create/delete` lifecycle and tier-based users show a deliberate approach to fixture data.
- **"How do you handle multi-environment testing?"** → The `getProjects.ts` matrix and environment-aware POMs show a structured approach to environment parity.
- **"What's your approach to test reporting?"** → The dashboard + Playwright HTML reports shows investment in making test results actionable.
- **"Why did you choose the revealing module pattern over class-based POMs?"** → The interview-pack explains the reasoning and trade-offs.

## Live Demo

```bash
bun install
bun run runDemo      # starts all 3 envs + runs full test suite + cleans up
bun run dashboard    # starts dashboard at http://localhost:4000
bun run test         # run e2e tests directly
```

## Monorepo Structure

```
├── e2e/              # Playwright test framework
│   ├── src/          # Test utilities, fixtures, POMs
│   ├── tests/        # Test specs
│   └── playwright.config.ts
├── demo-app/         # Demo System Under Test (SUT)
│   └── src/          # Bun-based web application
├── dashboard/        # Control panel SPA
│   └── src/          # Bun server with HTMX UI
├── scripts/          # Utility scripts
├── utils/            # Shared utilities
└── runDemo.ts        # Orchestrates full demo run
```

## Related Work

- **crap4ts** — CRAP score calculator for TypeScript codebases: [github.com/graffhyrum/crap4ts](https://github.com/graffhyrum/crap4ts)
