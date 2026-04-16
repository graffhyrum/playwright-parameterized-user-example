# Demo SUT (System Under Test)

A simple web application built with Bun that serves as a demo System Under Test for the Playwright parameterized testing framework.

## Features

- Multi-environment support (production, staging, development)
- User tier management (free, paid)
- Login system with session management
- Dashboard with tier-specific features

## Running the Demo App

### Single Environment

```bash
bun run dev
```

Runs on `http://localhost:3000` by default.

### Multiple Environments (for testing)

To run all three environments simultaneously for comprehensive testing:

```bash
# Terminal 1 - Production
bun run dev:production

# Terminal 2 - Staging
bun run dev:staging

# Terminal 3 - Development
bun run dev:development
```

## Test Users

The demo app comes with pre-configured test users:

- **Free tier**: `user@free.com` / `password123`
- **Paid tier**: `user@paid.com` / `password123`

## API Endpoints

- `GET /` or `GET /login` - Login page
- `POST /api/login` - Login endpoint
- `GET /dashboard` - User dashboard (requires authentication)
- `GET /health` - Health check endpoint

## Architecture

The demo app uses:
- **Bun** as the runtime and web server
- **In-memory user database** (Map-based storage)
- **Cookie-based sessions** for authentication
- **Server-side rendering** for HTML pages
