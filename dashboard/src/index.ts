/**
 * Dashboard Server
 * Control panel for managing demo-app instances and running Playwright tests
 */

import { processManager, type Environment } from './processManager';
import { testRunner } from './testRunner';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = join(import.meta.dir, 'public');

// SSE connection tracking
const sseClients = new Set<WritableStreamDefaultWriter>();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveFile('index.html', 'text/html');
    }

    if (url.pathname === '/styles.css') {
      return serveFile('styles.css', 'text/css');
    }

    // API: Demo App Management
    if (url.pathname === '/api/demo-app/start' && req.method === 'POST') {
      const body = await req.json();
      const env = body.environment as Environment;
      const result = await processManager.start(env);
      return Response.json(result);
    }

    if (url.pathname === '/api/demo-app/stop' && req.method === 'POST') {
      const body = await req.json();
      const env = body.environment as Environment;
      const result = await processManager.stop(env);
      return Response.json(result);
    }

    if (url.pathname === '/api/demo-app/status' && req.method === 'GET') {
      const status = processManager.getStatus();
      return Response.json(status);
    }

    if (url.pathname.startsWith('/api/demo-app/logs/') && req.method === 'GET') {
      const env = url.pathname.split('/').pop() as Environment;
      const logs = processManager.getLogs(env);
      return Response.json({ logs });
    }

    // API: Test Runner
    if (url.pathname === '/api/tests/run' && req.method === 'POST') {
      const body = await req.json();
      const project = body.project;
      const result = await testRunner.run(project);
      return Response.json(result);
    }

    if (url.pathname === '/api/tests/stop' && req.method === 'POST') {
      const result = testRunner.stop();
      return Response.json(result);
    }

    if (url.pathname === '/api/tests/status' && req.method === 'GET') {
      const status = testRunner.getStatus();
      return Response.json(status);
    }

    if (url.pathname === '/api/tests/logs' && req.method === 'GET') {
      const logs = testRunner.getLogs();
      return Response.json({ logs });
    }

    if (url.pathname === '/api/tests/has-report' && req.method === 'GET') {
      const hasReport = testRunner.hasReport();
      return Response.json({ hasReport });
    }

    // SSE: Real-time log streaming
    if (url.pathname === '/api/sse/logs') {
      return handleSSE(req);
    }

    // Serve Playwright HTML report
    if (url.pathname.startsWith('/report')) {
      const reportPath = testRunner.getReportPath();
      const filePath = url.pathname.replace('/report', '');
      const fullPath = join(reportPath, filePath || 'index.html');

      if (!existsSync(fullPath)) {
        return new Response('Report not found', { status: 404 });
      }

      const file = Bun.file(fullPath);
      const contentType = getContentType(fullPath);

      return new Response(file, {
        headers: { 'Content-Type': contentType },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

function serveFile(filename: string, contentType: string): Response {
  const filePath = join(PUBLIC_DIR, filename);

  if (!existsSync(filePath)) {
    return new Response('File not found', { status: 404 });
  }

  const content = readFileSync(filePath, 'utf-8');
  return new Response(content, {
    headers: { 'Content-Type': contentType },
  });
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

function handleSSE(req: Request): Response {
  const stream = new ReadableStream({
    start(controller) {
      const writer = controller as any;

      // Add client to tracking
      sseClients.add(writer);

      // Send initial connection message
      const encoder = new TextEncoder();
      writer.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Send updates every 500ms
      const interval = setInterval(() => {
        try {
          // Send demo-app status and logs
          const appStatus = processManager.getStatus();
          const appLogs: Record<string, string[]> = {
            production: processManager.getLogs('production'),
            staging: processManager.getLogs('staging'),
            development: processManager.getLogs('development'),
          };

          // Send test status and logs
          const testStatus = testRunner.getStatus();
          const testLogs = testRunner.getLogs();

          const data = {
            type: 'update',
            appStatus,
            appLogs,
            testStatus,
            testLogs,
            hasReport: testRunner.hasReport(),
          };

          writer.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          clearInterval(interval);
          sseClients.delete(writer);
        }
      }, 500);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        sseClients.delete(writer);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  processManager.stopAll();
  process.exit(0);
});

console.log(`🎛️  Dashboard running on http://localhost:${PORT}`);
console.log(`📊 Control panel for demo-app and Playwright tests`);
