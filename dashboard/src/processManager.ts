import { spawn, type Subprocess } from 'bun';
import { resolve, dirname } from 'path';

export type Environment = 'production' | 'staging' | 'development';

interface ProcessInfo {
  process: Subprocess;
  logs: string[];
  startTime: Date;
}

class ProcessManager {
  private processes = new Map<Environment, ProcessInfo>();
  private maxLogLines = 1000; // Keep last 1000 log lines per process

  async start(env: Environment): Promise<{ success: boolean; message: string }> {
    if (this.processes.has(env)) {
      return { success: false, message: `${env} environment is already running` };
    }

    const portMap = {
      production: 3000,
      staging: 3001,
      development: 3002,
    };

    const port = portMap[env];

    try {
      // Use current Bun executable path
      const bunExe = process.execPath;

      // Resolve demo-app directory relative to dashboard
      const demoAppDir = resolve(dirname(import.meta.dir), '..', 'demo-app');

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
      });

      const logs: string[] = [];
      const processInfo: ProcessInfo = {
        process: proc,
        logs,
        startTime: new Date(),
      };

      this.processes.set(env, processInfo);

      // Capture stdout
      this.readStream(proc.stdout, (line) => {
        this.addLog(env, `[stdout] ${line}`);
      });

      // Capture stderr
      this.readStream(proc.stderr, (line) => {
        this.addLog(env, `[stderr] ${line}`);
      });

      // Add initial log
      this.addLog(env, `Starting ${env} environment on port ${port}...`);

      return { success: true, message: `Started ${env} environment on port ${port}` };
    } catch (error) {
      return { success: false, message: `Failed to start ${env}: ${error}` };
    }
  }

  async stop(env: Environment): Promise<{ success: boolean; message: string }> {
    const processInfo = this.processes.get(env);

    if (!processInfo) {
      return { success: false, message: `${env} environment is not running` };
    }

    try {
      processInfo.process.kill();
      this.addLog(env, `Stopped ${env} environment`);
      this.processes.delete(env);
      return { success: true, message: `Stopped ${env} environment` };
    } catch (error) {
      return { success: false, message: `Failed to stop ${env}: ${error}` };
    }
  }

  getStatus(): Record<Environment, { running: boolean; uptime?: number }> {
    const environments: Environment[] = ['production', 'staging', 'development'];
    const status: any = {};

    for (const env of environments) {
      const processInfo = this.processes.get(env);
      if (processInfo) {
        const uptime = Date.now() - processInfo.startTime.getTime();
        status[env] = { running: true, uptime: Math.floor(uptime / 1000) };
      } else {
        status[env] = { running: false };
      }
    }

    return status;
  }

  getLogs(env: Environment): string[] {
    const processInfo = this.processes.get(env);
    return processInfo ? [...processInfo.logs] : [];
  }

  private addLog(env: Environment, line: string) {
    const processInfo = this.processes.get(env);
    if (processInfo) {
      const timestamp = new Date().toISOString();
      processInfo.logs.push(`[${timestamp}] ${line}`);

      // Keep only last N lines
      if (processInfo.logs.length > this.maxLogLines) {
        processInfo.logs.shift();
      }
    }
  }

  private async readStream(stream: ReadableStream, callback: (line: string) => void) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            callback(line);
          }
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        callback(buffer);
      }
    } catch (error) {
      console.error('Error reading stream:', error);
    }
  }

  stopAll() {
    for (const env of this.processes.keys()) {
      this.stop(env);
    }
  }
}

export const processManager = new ProcessManager();
