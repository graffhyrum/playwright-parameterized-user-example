# Dashboard

SPA control panel for managing demo-app instances and running Playwright tests.

## Features

### Left Panel: Demo App Management
- Start/stop demo-app instances for each environment (production, staging, development)
- Real-time log streaming for each environment
- Visual status indicators with uptime tracking

### Right Panel: Test Runner
- Run Playwright tests with optional project selection
- Real-time test output streaming
- Embedded Playwright HTML report viewer
- Test status and duration tracking

## Architecture

Built with:
- **Bun** - Runtime and web server
- **HTMX** - Client-side interactivity without heavy JavaScript
- **Server-Sent Events (SSE)** - Real-time log streaming
- **Vanilla HTML/CSS** - No framework dependencies

## Running the Dashboard

### From the root directory:

```bash
bun run dashboard
```

### From the dashboard directory:

```bash
bun run dev
```

The dashboard will be available at `http://localhost:4000`

## API Endpoints

### Demo App Management
- `POST /api/demo-app/start` - Start a demo-app instance
- `POST /api/demo-app/stop` - Stop a demo-app instance
- `GET /api/demo-app/status` - Get status of all environments
- `GET /api/demo-app/logs/:env` - Get logs for an environment

### Test Runner
- `POST /api/tests/run` - Run Playwright tests
- `POST /api/tests/stop` - Stop running tests
- `GET /api/tests/status` - Get test runner status
- `GET /api/tests/logs` - Get test output
- `GET /api/tests/has-report` - Check if HTML report exists

### Real-time Updates
- `GET /api/sse/logs` - SSE stream for real-time updates

### Report Viewer
- `GET /report/*` - Serve Playwright HTML report files

## Usage

1. **Start the dashboard**: `bun run dashboard`
2. **Start demo-app environments**: Click "Start" for production, staging, or development
3. **Run tests**: Enter an optional project name and click "Run Tests"
4. **View results**: Watch real-time test output and view the HTML report when complete

## Technical Details

### Process Manager (`processManager.ts`)
Manages demo-app instances with:
- Process lifecycle management (start/stop)
- Log capture and buffering (last 1000 lines)
- Status tracking with uptime calculation

### Test Runner (`testRunner.ts`)
Manages Playwright test execution with:
- Process spawning and output capture
- Exit code tracking
- Log buffering (last 2000 lines)
- Report availability detection

### SSE Streaming
Updates clients every 500ms with:
- Demo-app status and logs
- Test runner status and logs
- Report availability

## Port Configuration

- Dashboard: `4000`
- Production demo-app: `3000`
- Staging demo-app: `3001`
- Development demo-app: `3002`
