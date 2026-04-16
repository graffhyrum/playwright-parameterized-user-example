#!/usr/bin/env bun

/**
 * Script to run demo apps for all environments, execute e2e tests, and clean up
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'bun'

const environments = ['production', 'staging', 'development'] as const
const demoAppDir = join(process.cwd(), 'demo-app')
const e2eDir = join(process.cwd(), 'e2e')

// Check if directories exist
if (!existsSync(demoAppDir)) {
  console.error('❌ demo-app directory not found')
  process.exit(1)
}

if (!existsSync(e2eDir)) {
  console.error('❌ e2e directory not found')
  process.exit(1)
}

async function waitForPort(port: number, timeout = 10000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}`)
      if (response.ok) {
        return true
      }
    } catch {
      // Port not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return false
}

async function runDemo() {
  console.log('🚀 Starting demo apps for all environments...')

  // Start demo app processes
  const processes: { proc: ReturnType<typeof spawn>; env: string; port: number }[] = []

  for (const env of environments) {
    const port = env === 'production' ? 3000 : env === 'staging' ? 3001 : 3002

    console.log(`📦 Starting ${env} environment on port ${port}...`)

    const proc = spawn({
      cmd: ['bun', 'run', 'env.ts', env],
      cwd: demoAppDir,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    })

    processes.push({ proc, env, port })

    // Wait for the app to be ready
    const ready = await waitForPort(port, 15000)
    if (!ready) {
      console.error(`❌ ${env} environment failed to start on port ${port}`)
      // Clean up already started processes
      for (const p of processes) {
        p.proc.kill()
      }
      process.exit(1)
    }

    console.log(`✅ ${env} environment ready on port ${port}`)
  }

  console.log('🎯 All demo apps are running. Starting e2e tests...')

  try {
    // Run e2e tests
    const testProc = spawn({
      cmd: ['bun', 'run', 'test'],
      cwd: e2eDir,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    })

    const testExitCode = await testProc.exited

    if (testExitCode === 0) {
      console.log('✅ All tests passed!')
    } else {
      console.log('❌ Some tests failed')
      process.exitCode = testExitCode
    }
  } catch (error) {
    console.error('❌ Failed to run tests:', error)
    process.exitCode = 1
  } finally {
    // Clean up demo app processes
    console.log('🧹 Cleaning up demo app processes...')

    for (const { proc, env, port } of processes) {
      try {
        proc.kill()
        console.log(`✅ Stopped ${env} environment on port ${port}`)
      } catch (error) {
        console.warn(`⚠️  Failed to stop ${env} environment:`, error)
      }
    }

    console.log('🏁 Demo run complete')
  }
}

runDemo().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
