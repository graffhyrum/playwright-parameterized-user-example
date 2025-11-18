import { dirname, resolve } from 'node:path'
import { type Environment, environments, getDemoAppPort } from '@monorepo/utils'
import { type } from 'arktype'
import { type Subprocess, spawn } from 'bun'

export const EnvSchema = type.enumerated(...environments)

interface ProcessInfo {
  process: Subprocess
  logs: string[]
  startTime: Date
}

function createProcessManager() {
  const processes = new Map<Environment, ProcessInfo>()
  const maxLogLines = 1000 // Keep last 1000 log lines per process

  function addLog(env: Environment, line: string) {
    const processInfo = processes.get(env)
    if (processInfo) {
      const timestamp = new Date().toISOString()
      processInfo.logs.push(`[${timestamp}] ${line}`)

      // Keep only last N lines
      if (processInfo.logs.length > maxLogLines) {
        processInfo.logs.shift()
      }
    }
  }

  async function readStream(stream: ReadableStream, callback: (line: string) => void) {
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
          if (line.trim()) {
            callback(line)
          }
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        callback(buffer)
      }
    } catch (error) {
      console.error('Error reading stream:', error)
    }
  }

  async function start(env: Environment): Promise<{ success: boolean; message: string }> {
    if (processes.has(env)) {
      return { success: false, message: `${env} environment is already running` }
    }

    const port = getDemoAppPort(env)

    try {
      // Use current Bun executable path
      const bunExe = process.execPath

      // Resolve demo-app directory relative to dashboard
      const demoAppDir = resolve(dirname(import.meta.dir), '..', 'demo-app')

      const proc = spawn({
        cmd: [bunExe, 'run', 'src/index.ts'],
        cwd: demoAppDir,
        env: {
          ...process.env,
          PORT: port.toString(),
          NODE_ENV: env,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const logs: string[] = []
      const processInfo: ProcessInfo = {
        process: proc,
        logs,
        startTime: new Date(),
      }

      processes.set(env, processInfo)

      // Capture stdout
      void readStream(proc.stdout, (line) => {
        addLog(env, `[stdout] ${line}`)
      })

      // Capture stderr
      void readStream(proc.stderr, (line) => {
        addLog(env, `[stderr] ${line}`)
      })

      // Add initial log
      addLog(env, `Starting ${env} environment on port ${port}...`)

      return { success: true, message: `Started ${env} environment on port ${port}` }
    } catch (error) {
      return { success: false, message: `Failed to start ${env}: ${error}` }
    }
  }

  async function stop(env: Environment): Promise<{ success: boolean; message: string }> {
    const processInfo = processes.get(env)

    if (!processInfo) {
      return { success: false, message: `${env} environment is not running` }
    }

    try {
      processInfo.process.kill()
      addLog(env, `Stopped ${env} environment`)
      processes.delete(env)
      return { success: true, message: `Stopped ${env} environment` }
    } catch (error) {
      return { success: false, message: `Failed to stop ${env}: ${error}` }
    }
  }

  function getStatus(): Record<Environment, { running: boolean; uptime?: number }> {
    const status: any = {}

    for (const env of environments) {
      const processInfo = processes.get(env)
      if (processInfo) {
        const uptime = Date.now() - processInfo.startTime.getTime()
        status[env] = { running: true, uptime: Math.floor(uptime / 1000) }
      } else {
        status[env] = { running: false, uptime: 0 }
      }
    }

    return status
  }

  function getLogs(env: Environment): string[] {
    const processInfo = processes.get(env)
    return processInfo ? [...processInfo.logs] : []
  }

  function stopAll() {
    for (const env of processes.keys()) {
      stop(env)
    }
  }

  return {
    start,
    stop,
    getStatus,
    getLogs,
    stopAll,
  }
}

export const processManager = createProcessManager()
