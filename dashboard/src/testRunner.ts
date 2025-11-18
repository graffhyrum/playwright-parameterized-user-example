import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { type Subprocess, spawn } from 'bun'

interface TestRun {
  process: Subprocess | null
  logs: string[]
  startTime: Date
  endTime?: Date
  running: boolean
  exitCode?: number
}

const buildTestRunner = () => {
  let currentRun: TestRun | null = null
  const maxLogLines = 2000

  const addLog = (line: string) => {
    if (currentRun) {
      currentRun.logs.push(line)

      // Keep only last N lines
      if (currentRun.logs.length > maxLogLines) {
        currentRun.logs.shift()
      }
    }
  }

  const stripAnsi = (str: string): string => {
    // Remove ANSI escape codes
    // This regex matches common ANSI escape sequences
    return str.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    )
  }

  const readStream = async (stream: ReadableStream, callback: (line: string) => void) => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          callback(line)
        }
      }

      // Handle any remaining buffer
      if (buffer) {
        callback(buffer)
      }
    } catch (error) {
      console.error('Error reading stream:', error)
    }
  }

  const run = async (project?: string): Promise<{ success: boolean; message: string }> => {
    if (currentRun?.running) {
      return { success: false, message: 'Tests are already running' }
    }

    // Use current Bun executable path
    const bunExe = process.execPath
    const args = [bunExe, 'x', 'playwright', 'test']

    if (project) {
      args.push('--project', project)
    }

    // Resolve e2e directory relative to dashboard
    const e2eDir = resolve(dirname(import.meta.dir), '..', 'e2e')

    try {
      const proc = spawn({
        cmd: args,
        cwd: e2eDir,
        env: {
          ...process.env,
          FORCE_COLOR: '0', // Disable colored output to avoid ANSI codes
        },
        stdout: 'pipe',
        stderr: 'pipe',
      })

      currentRun = {
        process: proc,
        logs: [],
        startTime: new Date(),
        running: true,
      }

      addLog(`Starting Playwright tests${project ? ` for project: ${project}` : ''}...`)
      addLog(`Command: ${args.join(' ')}`)
      addLog('')

      // Capture stdout
      void readStream(proc.stdout, (line) => {
        addLog(stripAnsi(line))
      })

      // Capture stderr
      void readStream(proc.stderr, (line) => {
        addLog(`[ERROR] ${stripAnsi(line)}`)
      })

      // Wait for process to complete
      proc.exited.then((exitCode) => {
        if (currentRun) {
          currentRun.running = false
          currentRun.endTime = new Date()
          currentRun.exitCode = exitCode
          addLog('')
          addLog(`Tests completed with exit code: ${exitCode}`)

          if (exitCode === 0) {
            addLog('✓ All tests passed!')
          } else {
            addLog('✗ Some tests failed')
          }
        }
      })

      return { success: true, message: 'Tests started' }
    } catch (error) {
      return { success: false, message: `Failed to start tests: ${error}` }
    }
  }

  const stop = (): { success: boolean; message: string } => {
    if (!currentRun?.running) {
      return { success: false, message: 'No tests are currently running' }
    }

    try {
      currentRun.process?.kill()
      currentRun.running = false
      currentRun.endTime = new Date()
      addLog('')
      addLog('Tests stopped by user')
      return { success: true, message: 'Tests stopped' }
    } catch (error) {
      return { success: false, message: `Failed to stop tests: ${error}` }
    }
  }

  const getStatus = () => {
    if (!currentRun) {
      return { running: false }
    }

    const duration = currentRun.endTime
      ? currentRun.endTime.getTime() - currentRun.startTime.getTime()
      : Date.now() - currentRun.startTime.getTime()

    return {
      running: currentRun.running,
      duration: Math.floor(duration / 1000),
      exitCode: currentRun.exitCode,
    }
  }

  const getLogs = (): string[] => {
    return currentRun ? [...currentRun.logs] : []
  }

  const hasReport = (): boolean => {
    const e2eDir = resolve(dirname(import.meta.dir), '..', 'e2e')
    return existsSync(join(e2eDir, 'playwright-report', 'index.html'))
  }

  const getReportPath = (): string => {
    const e2eDir = resolve(dirname(import.meta.dir), '..', 'e2e')
    return join(e2eDir, 'playwright-report')
  }

  return {
    run,
    stop,
    getStatus,
    getLogs,
    hasReport,
    getReportPath,
  }
}

export const testRunner = buildTestRunner()
