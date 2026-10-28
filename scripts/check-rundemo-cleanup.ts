#!/usr/bin/env bun
/**
 * Proves that runDemo.ts leaves no demo-app server listening on 3000-3002.
 * The success case runs the real e2e suite once; the other cases abort it early.
 *
 * Linux only (uses ss and /proc) and deliberately not part of vet or CI: CI runs runDemo
 * directly, and the SIGINT case would overwrite the Playwright report CI uploads.
 */

import { readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { connect, spawn, spawnSync } from 'bun'

const PORTS = [3000, 3001, 3002]
const ROOT = process.cwd()
const READY_MARKER = 'All demo apps are running'
const MATCHES_NOTHING = ['--grep', 'no-test-has-this-title-zzz']
const SIGINT_DELAY_MS = 3000
const EXIT_TIMEOUT_MS = 120_000

type Case = {
  name: string
  args: string[]
  expectedExitCode: number
  signalWhenReady?: 'SIGINT' | 'SIGHUP'
}

const CASES: Case[] = [
  { name: 'success path', args: [], expectedExitCode: 0 },
  { name: 'test-failure path', args: MATCHES_NOTHING, expectedExitCode: 1 },
  { name: 'SIGINT during tests', args: [], expectedExitCode: 130, signalWhenReady: 'SIGINT' },
  { name: 'SIGHUP during tests', args: [], expectedExitCode: 129, signalWhenReady: 'SIGHUP' },
]

const failures = await main()
process.exit(failures.length === 0 ? 0 : 1)

async function main(): Promise<string[]> {
  const busy = await busyPorts()
  if (busy.length > 0) {
    return [`precondition: ports already in use before the check: ${busy.join(', ')}`]
  }
  const failures: string[] = []
  for (const testCase of CASES) {
    failures.push(...(await runCase(testCase)))
  }
  reportSummary(failures)
  return failures
}

async function runCase(testCase: Case): Promise<string[]> {
  console.log(`\n=== check: ${testCase.name} ===`)
  const exitCode = await runDemoToExit(testCase)
  const failures = exitCodeFailures(testCase, exitCode)
  const leaked = await busyPorts()
  if (leaked.length > 0) {
    failures.push(`${testCase.name}: ports still in use after runDemo exited: ${leaked.join(', ')}`)
    await killLeftoverServers()
  }
  return failures
}

function exitCodeFailures(testCase: Case, exitCode: number): string[] {
  if (exitCode === testCase.expectedExitCode) return []
  return [`${testCase.name}: runDemo exit code ${exitCode}, expected ${testCase.expectedExitCode}`]
}

async function runDemoToExit(testCase: Case): Promise<number> {
  const child = spawn({
    cmd: ['bun', 'run', 'runDemo.ts', ...testCase.args],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'inherit',
  })
  const watchdog = setTimeout(() => child.kill('SIGKILL'), EXIT_TIMEOUT_MS)
  const sawReady = relayOutput(child.stdout)
  if (testCase.signalWhenReady) {
    await sawReady
    await Bun.sleep(SIGINT_DELAY_MS)
    child.kill(testCase.signalWhenReady)
  }
  const exitCode = await child.exited
  clearTimeout(watchdog)
  return exitCode
}

/** Copies child output to our stdout; resolves once the ready marker went by. */
async function relayOutput(stream: ReadableStream<Uint8Array>): Promise<void> {
  const decoder = new TextDecoder()
  let seen = false
  let recent = ''
  let resolveReady: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  void (async () => {
    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true })
      process.stdout.write(text)
      // The marker can be split across chunks, so search a rolling tail
      const window = recent + text
      if (!seen && window.includes(READY_MARKER)) {
        seen = true
        resolveReady()
      }
      recent = window.slice(-(READY_MARKER.length - 1))
    }
    process.stdout.write(decoder.decode())
    resolveReady()
  })()
  return ready
}

async function busyPorts(): Promise<number[]> {
  const states = await Promise.all(PORTS.map(isListening))
  return PORTS.filter((_, index) => states[index])
}

async function isListening(port: number): Promise<boolean> {
  try {
    const socket = await connect({ hostname: '127.0.0.1', port, socket: { data() {} } })
    socket.end()
    return true
  } catch {
    return false
  }
}

/** Machine cleanup: kill leaked servers, but only ones started from this worktree. */
async function killLeftoverServers(): Promise<void> {
  for (const port of PORTS) {
    for (const pid of listeningPids(port)) {
      if (startedFromWorktree(pid)) process.kill(pid, 'SIGKILL')
    }
  }
  await Bun.sleep(500)
}

function listeningPids(port: number): number[] {
  const { stdout } = spawnSync({ cmd: ['ss', '-ltnpH', `sport = :${port}`] })
  const matches = stdout.toString().matchAll(/pid=(\d+)/g)
  return [...matches].map((match) => Number(match[1]))
}

function startedFromWorktree(pid: number): boolean {
  try {
    return readlinkSync(`/proc/${pid}/cwd`).startsWith(join(ROOT, '/'))
  } catch {
    return false
  }
}

function reportSummary(failures: string[]): void {
  console.log('\n=== check-rundemo-cleanup summary ===')
  if (failures.length === 0) console.log('PASS: no server left on ports ' + PORTS.join(', '))
  for (const failure of failures) console.error(`FAIL: ${failure}`)
}
