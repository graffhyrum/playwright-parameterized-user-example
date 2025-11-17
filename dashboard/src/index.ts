/**
 * Dashboard Server
 * Control panel for managing demo-app instances and running Playwright tests
 */

import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type } from 'arktype'
import { EnvSchema, type Environment, processManager } from './processManager'
import { testRunner } from './testRunner'

const PORT = process.env.PORT || 4000
const PUBLIC_DIR = join(import.meta.dir, 'public')

// SSE connection tracking
const sseClients = new Set<WritableStreamDefaultWriter>()

const EnvBodySchema = type({
  environment: EnvSchema,
})

// Validation helpers
function validateEnvironment(
  value: unknown
): { success: true; data: Environment } | { success: false; error: string } {
  const result = EnvBodySchema(value)
  if (result instanceof type.errors) {
    return {
      success: false,
      error: `Invalid environment: ${result.summary}\nValue: ${JSON.stringify(value, null, 2)}`,
    }
  }
  return { success: true, data: result.environment }
}

function errorResponse(message: string, status = 400): Response {
  return Response.json({ success: false, message }, { status })
}

const ProjectBodySchema = type({
  'project?': 'string',
})

function validateProjectArgs(value: unknown) {
  const result = ProjectBodySchema(value)
  if (result instanceof type.errors) {
    return {
      success: false,
      error: `Invalid project: ${result.summary}\nValue: ${JSON.stringify(value, null, 2)}`,
    } as const
  }
  return { success: true, data: result.project } as const
}

// Route handlers
async function handleDemoAppStart(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = await req.json()
  const validation = validateEnvironment(body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }
  const result = await processManager.start(validation.data)
  return Response.json(result)
}

async function handleDemoAppStop(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = await req.json()
  const validation = validateEnvironment(body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }
  const result = await processManager.stop(validation.data)
  return Response.json(result)
}

function handleDemoAppStatus(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const status = processManager.getStatus()
  return Response.json(status)
}

function handleDemoAppLogs(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const url = new URL(req.url)
  const envValue = url.pathname.split('/').pop()
  const validation = validateEnvironment(envValue)
  if (!validation.success) {
    return errorResponse(validation.error)
  }
  const logs = processManager.getLogs(validation.data)
  return Response.json({ logs })
}

async function handleTestRun(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = await req.json()
  const validation = validateProjectArgs(body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }
  const result = await testRunner.run(validation.data)
  return Response.json(result)
}

function handleTestStop(req: Request): Response {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const result = testRunner.stop()
  return Response.json(result)
}

function handleTestStatus(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const status = testRunner.getStatus()
  return Response.json(status)
}

function handleTestLogs(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const logs = testRunner.getLogs()
  return Response.json({ logs })
}

function handleTestHasReport(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const hasReport = testRunner.hasReport()
  return Response.json({ hasReport })
}

function handleReport(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const url = new URL(req.url)
  const reportPath = testRunner.getReportPath()
  const filePath = url.pathname.replace('/report', '')
  const fullPath = join(reportPath, filePath || 'index.html')

  if (!existsSync(fullPath)) {
    return new Response('Report not found', { status: 404 })
  }

  const file = Bun.file(fullPath)
  const contentType = getContentType(fullPath)

  return new Response(file, {
    headers: { 'Content-Type': contentType },
  })
}

const routes = {
  // Static files
  '/': (req: Request) => {
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    return serveFile('index.html', 'text/html')
  },
  '/index.html': (req: Request) => {
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    return serveFile('index.html', 'text/html')
  },
  '/styles.css': (req: Request) => {
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    return serveFile('styles.css', 'text/css')
  },

  // Demo App API
  '/api/demo-app/start': handleDemoAppStart,
  '/api/demo-app/stop': handleDemoAppStop,
  '/api/demo-app/status': handleDemoAppStatus,
  '/api/demo-app/logs/:env': handleDemoAppLogs,

  // Test Runner API
  '/api/tests/run': handleTestRun,
  '/api/tests/stop': handleTestStop,
  '/api/tests/status': handleTestStatus,
  '/api/tests/logs': handleTestLogs,
  '/api/tests/has-report': handleTestHasReport,

  // SSE
  '/api/sse/logs': handleSSE,

  // Reports
  '/report': handleReport,
  '/report/*': handleReport,
}

const _server = Bun.serve({
  port: PORT,
  routes,
})

function serveFile(filename: string, contentType: string): Response {
  const filePath = join(PUBLIC_DIR, filename)

  if (!existsSync(filePath)) {
    return new Response('File not found', { status: 404 })
  }

  const content = readFileSync(filePath, 'utf-8')
  return new Response(content, {
    headers: { 'Content-Type': contentType },
  })
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
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
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

function handleSSE(req: Request): Response {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const stream = new ReadableStream({
    start(controller) {
      const writer = controller as any

      // Add client to tracking
      sseClients.add(writer)

      // Send initial connection message
      const encoder = new TextEncoder()
      writer.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      // Send updates every 500ms
      const interval = setInterval(() => {
        try {
          // Send demo-app status and logs
          const appStatus = processManager.getStatus()
          const appLogs: Record<string, string[]> = {
            production: processManager.getLogs('production'),
            staging: processManager.getLogs('staging'),
            development: processManager.getLogs('development'),
          }

          // Send test status and logs
          const testStatus = testRunner.getStatus()
          const testLogs = testRunner.getLogs()

          const _data = {
            type: 'update',
            appStatus,
            appLogs,
            testStatus,
            testLogs,
            hasReport: testRunner.hasReport(),
          }

          writer.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (_error) {
          clearInterval(interval)
          sseClients.delete(writer)
        }
      }, 500)

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        sseClients.delete(writer)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  processManager.stopAll()
  process.exit(0)
})

console.log(`🎛️  Dashboard
		running
		on
		http://localhost:${PORT}`)
console.log('📊 Control panel for demo-app and Playwright tests')
