# demo-app

Bun web server. It is the system under test for the e2e suite. The suite needs one instance per environment.

## Commands

Run from `demo-app/`.

- One instance: `bun run dev`
- Production: `bun run dev:production`
- Staging: `bun run dev:staging`
- Development: `bun run dev:development`

The `dev:<environment>` scripts run `env.ts`. It sets `PORT` and `NODE_ENV` for that environment.

## Ports

Production uses 3000, staging 3001, and development 3002. Source: `ports.demoApp` in `utils/src/index.ts`.

## Behavior

- Cookie-based login.
- Tier-specific dashboard.
- Pre-configured users that match the e2e expectations: `user@free.com` and `user@paid.com`, password `password123`.

## Key files

- `src/index.ts`: web server, authentication, tier features.
- `env.ts`: starts one environment with its port and `NODE_ENV`.
- `package.json`: scripts.
