#!/usr/bin/env bun
/**
 * Root-level E2E test runner
 * Starts demo-app for all environments (production, staging, development),
 * runs full Playwright test matrix, then cleans up
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'bun'

const DEMO_APP_DIR = join(process.cwd(), 'demo-app')
const E2E_DIR = join(process.cwd(), 'e2e')

const ENVIRONMENTS = ['production', 'staging', 'development'] as const
const PORTS = {
  production: 3000,
  staging: 3001,
  development: 3002,
}

if (!existsSync(DEMO_APP_DIR)) {
  console.error('❌ demo-app directory not found')
  process.exit(1)
}

if (!existsSync(E2E_DIR)) {
  console.error('❌ e2e directory not found')
  process.exit(1)
}

async function waitForHealthy(port: number, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now()
  console.log(`⏳ Waiting for demo app on http://localhost:${port}...`)

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/health`)
      if (res.ok) {
        const data = await res.json()
        console.log(`✅ Demo app ready (${data.environment})`)
        return true
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

console.log('🚀 Starting E2E test run with all 3 environments...')

const processes: Map<string, ReturnType<typeof spawn>> = new Map()

try {
  // 1. Start demo-app for all environments
  for (const env of ENVIRONMENTS) {
    const port = PORTS[env]
    console.log(`📦 Starting demo-app (${env}) on port ${port}...`)

    const proc = spawn({
      cmd: ['bun', 'run', 'src/index.ts'],
      cwd: DEMO_APP_DIR,
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: env,
      },
      stdout: 'inherit',
      stderr: 'inherit',
    })

    processes.set(env, proc)

    const isReady = await waitForHealthy(port)
    if (!isReady) {
      throw new Error(`Demo app (${env}) failed to become healthy`)
    }
  }

  // 2. Run tests - all environments should now be available
  console.log('🎯 Running full parameterized test suite...')
  const testProc = spawn({
    cmd: ['bunx', 'playwright', 'test'],
    cwd: E2E_DIR,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const exitCode = await testProc.exited
  console.log(exitCode === 0 ? '✅ All tests passed!' : `❌ Tests failed with code ${exitCode}`)

  process.exitCode = exitCode
} catch (err) {
  console.error('💥 Test run failed:', err)
  process.exitCode = 1
} finally {
  // 3. Graceful cleanup - kill all demo-app processes
  console.log('🧹 Shutting down demo-app processes...')
  for (const [env, proc] of processes) {
    try {
      proc.kill()
      console.log(`✅ Stopped ${env} environment`)
    } catch (killErr) {
      console.warn(`⚠️  Could not kill ${env} process:`, killErr)
    }
  }
  console.log('🏁 E2E test run complete')
}
