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

type Proc = ReturnType<typeof spawn>
type ServerProcess = { proc: Proc; env: string; port: number }
type StopSignal = 'SIGINT' | 'SIGTERM'

// Extra CLI args go to Playwright, e.g. `bun run runDemo --grep login`
const playwrightArgs = process.argv.slice(2)
const processes: ServerProcess[] = []
let testProc: Proc | undefined
let stopping = false

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
  if (!(await startServers())) return

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

// Resolves false when startup was cut short: a stop began (the signal handler cleans up).
async function startServers(): Promise<boolean> {
  console.log('🚀 Starting demo apps for all environments...')

  for (const env of environments) {
    if (stopping) return false
    const port = env === 'production' ? 3000 : env === 'staging' ? 3001 : 3002

    console.log(`📦 Starting ${env} environment on port ${port}...`)

    // Own process group, so one SIGKILL takes down the env.ts wrapper and the server together
    const proc = spawn({
      cmd: ['bun', 'run', 'env.ts', env],
      cwd: demoAppDir,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      detached: true,
    })

    processes.push({ proc, env, port })

    // Wait for the app to be ready
    const ready = await waitForPort(port, 15000)
    if (stopping) return false
    if (!ready) {
      console.error(`❌ ${env} environment failed to start on port ${port}`)
      await stopAll()
      process.exit(1)
    }

    console.log(`✅ ${env} environment ready on port ${port}`)
  }
  return true
}

function stopAll(): Promise<unknown> {
  return Promise.all(processes.map(stopServer))
}

// Waits for the process to really exit, so the port is free when we say "Stopped"
async function stopServer({ proc, env, port }: ServerProcess): Promise<void> {
  proc.kill('SIGTERM')
  if (await timedOutWaiting(proc, STOP_TIMEOUT_MS)) {
    console.warn(`⚠️  ${env} did not exit in ${STOP_TIMEOUT_MS}ms, sending SIGKILL`)
    killGroup(proc)
    await proc.exited
  }
  console.log(`✅ Stopped ${env} environment on port ${port}`)
}

// Cancellable timer: a pending Bun.sleep would keep the process alive after a fast stop
async function timedOutWaiting(proc: Proc, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<true>((resolve) => {
    timer = setTimeout(() => resolve(true), ms)
  })
  const timedOut = await Promise.race([proc.exited.then(() => false), timeout])
  clearTimeout(timer)
  return timedOut
}

// A negative pid addresses the whole process group (wrapper + server)
function killGroup(proc: Proc): void {
  try {
    process.kill(-proc.pid, 'SIGKILL')
  } catch {
    // Group already gone
  }
}

// Ctrl-C / SIGTERM: stop the tests and let runDemo's finally stop the servers.
// Before the tests start there is nothing to wait for, so stop the servers and exit.
// A second signal means "now": kill everything and exit.
function installSignalHandlers(): void {
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ] as const) {
    process.on(signal, () => handleSignal(signal, code))
  }
}

function handleSignal(signal: StopSignal, code: number): void {
  if (stopping) forceExit(code)
  stopping = true
  process.exitCode = code
  if (testProc) forwardToTests(testProc, signal)
  else stopAll().finally(() => process.exit(code))
}

// A terminal sends Ctrl-C to the whole foreground group, so Playwright already has its
// SIGINT, and a second one makes it force quit. Forward SIGINT only when stdin is no terminal.
function forwardToTests(tests: Proc, signal: StopSignal): void {
  if (signal === 'SIGINT' && process.stdin.isTTY) return
  tests.kill(signal)
}

function forceExit(code: number): never {
  for (const { proc } of processes) killGroup(proc)
  testProc?.kill('SIGKILL')
  process.exit(code)
}
