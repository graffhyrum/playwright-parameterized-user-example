# dashboard

Bun server with an HTMX control panel. It starts and stops demo apps, runs Playwright tests, and streams live status.

## Commands

- From the root: `bun run dashboard`, then open `http://localhost:4000`.
- From `dashboard/`: `bun run dev` (hot reload) or `bun run start`.
- Specs: `tests/` holds the dashboard's own Playwright specs. Config: `playwright.config.ts`.

## Behavior

- Starts and stops demo-app instances per environment.
- Streams logs over Server-Sent Events. Status broadcasts every 500 ms (`src/index.ts`).
- Runs Playwright tests and streams their output.
- Shows the embedded HTML report.
- Uses HTMX. It has no JavaScript framework.

## Key files

- `src/index.ts`: Bun server, API endpoints, SSE.
- `src/processManager.ts`: demo-app start, stop, logs, status.
- `src/testRunner.ts`: Playwright execution.
- `src/public/`: HTMX UI (`index.html`, `styles.css`).
- `src/POMs/`: page objects for the dashboard's specs.
