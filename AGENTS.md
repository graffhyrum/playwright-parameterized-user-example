# AGENTS.md

Bun monorepo with a Playwright e2e suite, a demo app under test, and a control dashboard.

## Find the package doc before you edit

Each package has its own `AGENTS.md`. Read the one for the package you change before you change it.

| Working in | Read first |
| --- | --- |
| `e2e/`: Playwright tests, page objects, fixtures | `e2e/AGENTS.md` |
| `demo-app/`: system under test, dev servers | `demo-app/AGENTS.md` |
| `dashboard/`: control panel, test runner UI | `dashboard/AGENTS.md` |
| `utils/`: shared ports, environment names, URL helpers | `utils/src/index.ts` |

## Workspaces

- `e2e/`: Playwright framework with a parameterized test matrix.
- `demo-app/`: Bun web server, the system under test.
- `dashboard/`: Bun server and HTMX panel that manages the demo apps and test runs.
- `utils/`: shared config used by the other three.

## Commands

- Install: `bun install` from the root.
- Verify a change: `bun vet`. It runs typecheck, format, and lint in every workspace. Run it before you report a change done.
- Full e2e matrix: `bun run test:e2e`. It starts all three demo-app environments, runs the suite, then stops them. Source: `scripts/test-e2e.ts`.
- Do not run `bun run test` at the root. The root has no Playwright config, so Playwright loads test files from the other packages and fails. Run a single package's tests from that package (see its doc).
