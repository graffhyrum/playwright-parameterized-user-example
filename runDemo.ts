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
const STOP_TIMEOUT_MS = 5000

type ServerProcess = { proc: ReturnType<typeof spawn>; env: string; port: number }

// Extra CLI args go to Playwright, e.g. `bun run runDemo --grep login`
const playwrightArgs = process.argv.slice(2)
const processes: ServerProcess[] = []
let testProc: ReturnType<typeof spawn> | undefined

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
      await stopAll()
      process.exit(1)
    }

    console.log(`✅ ${env} environment ready on port ${port}`)
  }

  console.log('🎯 All demo apps are running. Starting e2e tests...')

  try {
    // Run e2e tests
    testProc = spawn({
      cmd: ['bun', 'run', 'test', ...playwrightArgs],
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

    await stopAll()

    console.log('🏁 Demo run complete')
  }
}

installSignalHandlers()

runDemo().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})

function stopAll(): Promise<unknown> {
  return Promise.all(processes.map(stopServer))
}

// Waits for the process to really exit, so the port is free when we say "Stopped"
async function stopServer({ proc, env, port }: ServerProcess): Promise<void> {
  proc.kill('SIGTERM')
  const exited = await Promise.race([proc.exited, Bun.sleep(STOP_TIMEOUT_MS).then(() => null)])
  if (exited === null) {
    console.warn(`⚠️  ${env} did not exit in ${STOP_TIMEOUT_MS}ms, sending SIGKILL`)
    proc.kill('SIGKILL')
    await proc.exited
  }
  console.log(`✅ Stopped ${env} environment on port ${port}`)
}

// Ctrl-C / SIGTERM: stop the tests and let runDemo's finally stop the servers.
// Before the tests start there is nothing to wait for, so stop the servers and exit.
function installSignalHandlers(): void {
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ] as const) {
    process.on(signal, () => {
      process.exitCode = code
      if (testProc) testProc.kill(signal)
      else stopAll().finally(() => process.exit(code))
    })
  }
}
