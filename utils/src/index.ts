/**
 * Shared configuration utilities for the monorepo
 */

// Environment definitions
export const environments = ['production', 'staging', 'development'] as const
export type Environment = (typeof environments)[number]

// Port mappings for different services
export const ports = {
  demoApp: {
    production: 3000,
    staging: 3001,
    development: 3002,
  },
  dashboard: 4000,
} as const

// Get port for demo app by environment
export function getDemoAppPort(env: Environment): number {
  return ports.demoApp[env]
}

// Get base URL for demo app by environment
export function getDemoAppUrl(env: Environment): string {
  const port = getDemoAppPort(env)
  return `http://localhost:${port}`
}

// Get dashboard URL
export function getDashboardUrl(): string {
  return `http://localhost:${ports.dashboard}`
}

// Environment variable helpers
export function getDemoAppEnvVars(env: Environment): string {
  const port = getDemoAppPort(env)
  return `PORT=${port} NODE_ENV=${env}`
}

// Script command builders
export const scripts = {
  // Development commands
  dev: (entry: string) => `bun run ${entry}`,
  start: (entry: string) => `bun run ${entry}`,

  // Test commands
  test: 'bunx playwright test',
  testUi: 'bunx playwright test --ui',
  testDebug: 'bunx playwright test --debug',
  testReport: 'bunx playwright show-report',

  // Code quality commands
  lint: 'biome check .',
  lintFix: 'biome check --write .',
  format: 'biome format --write .',

  // Workspace commands
  installAll: 'bun install',
  dashboard: 'cd dashboard && bun --hot run dev',
  devApp: (env?: Environment) =>
    env ? `cd demo-app && ${getDemoAppEnvVars(env)} bun run dev` : 'cd demo-app && bun run dev',
  testFromRoot: 'cd e2e && bun run test',
  testUiFromRoot: 'cd e2e && bun run test:ui',
  testReportFromRoot: 'cd e2e && bun run report',
  lintWorkspace: 'biome check .',
  lintFixWorkspace: 'biome check --write .',
  formatWorkspace: 'biome format --write .',
} as const
