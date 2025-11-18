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
