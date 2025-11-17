import { spawn, type Subprocess } from 'bun';
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

interface TestRun {
  process: Subprocess | null;
  logs: string[];
  startTime: Date;
  endTime?: Date;
  running: boolean;
  exitCode?: number;
}

class TestRunner {
  private currentRun: TestRun | null = null;
  private maxLogLines = 2000;

  async run(project?: string): Promise<{ success: boolean; message: string }> {
    if (this.currentRun?.running) {
      return { success: false, message: 'Tests are already running' };
    }

    // Use current Bun executable path
    const bunExe = process.execPath;
    const args = [bunExe, 'x', 'playwright', 'test'];

    if (project) {
      args.push('--project', project);
    }

    // Resolve e2e directory relative to dashboard
    const e2eDir = resolve(dirname(import.meta.dir), '..', 'e2e');

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
      });

      this.currentRun = {
        process: proc,
        logs: [],
        startTime: new Date(),
        running: true,
      };

      this.addLog(`Starting Playwright tests${project ? ` for project: ${project}` : ''}...`);
      this.addLog(`Command: ${args.join(' ')}`);
      this.addLog('');

      // Capture stdout
      this.readStream(proc.stdout, (line) => {
        this.addLog(this.stripAnsi(line));
      });

      // Capture stderr
      this.readStream(proc.stderr, (line) => {
        this.addLog(`[ERROR] ${this.stripAnsi(line)}`);
      });

      // Wait for process to complete
      proc.exited.then((exitCode) => {
        if (this.currentRun) {
          this.currentRun.running = false;
          this.currentRun.endTime = new Date();
          this.currentRun.exitCode = exitCode;
          this.addLog('');
          this.addLog(`Tests completed with exit code: ${exitCode}`);

          if (exitCode === 0) {
            this.addLog('✓ All tests passed!');
          } else {
            this.addLog('✗ Some tests failed');
          }
        }
      });

      return { success: true, message: 'Tests started' };
    } catch (error) {
      return { success: false, message: `Failed to start tests: ${error}` };
    }
  }

  stop(): { success: boolean; message: string } {
    if (!this.currentRun?.running) {
      return { success: false, message: 'No tests are currently running' };
    }

    try {
      this.currentRun.process?.kill();
      this.currentRun.running = false;
      this.currentRun.endTime = new Date();
      this.addLog('');
      this.addLog('Tests stopped by user');
      return { success: true, message: 'Tests stopped' };
    } catch (error) {
      return { success: false, message: `Failed to stop tests: ${error}` };
    }
  }

  getStatus() {
    if (!this.currentRun) {
      return { running: false };
    }

    const duration = this.currentRun.endTime
      ? this.currentRun.endTime.getTime() - this.currentRun.startTime.getTime()
      : Date.now() - this.currentRun.startTime.getTime();

    return {
      running: this.currentRun.running,
      duration: Math.floor(duration / 1000),
      exitCode: this.currentRun.exitCode,
    };
  }

  getLogs(): string[] {
    return this.currentRun ? [...this.currentRun.logs] : [];
  }

  hasReport(): boolean {
    const e2eDir = resolve(dirname(import.meta.dir), '..', 'e2e');
    return existsSync(join(e2eDir, 'playwright-report', 'index.html'));
  }

  getReportPath(): string {
    const e2eDir = resolve(dirname(import.meta.dir), '..', 'e2e');
    return join(e2eDir, 'playwright-report');
  }

  private addLog(line: string) {
    if (this.currentRun) {
      this.currentRun.logs.push(line);

      // Keep only last N lines
      if (this.currentRun.logs.length > this.maxLogLines) {
        this.currentRun.logs.shift();
      }
    }
  }

  private stripAnsi(str: string): string {
    // Remove ANSI escape codes
    // This regex matches common ANSI escape sequences
    return str.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
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
          callback(line);
        }
      }

      // Handle any remaining buffer
      if (buffer) {
        callback(buffer);
      }
    } catch (error) {
      console.error('Error reading stream:', error);
    }
  }
}

export const testRunner = new TestRunner();
