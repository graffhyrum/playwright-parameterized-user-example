import { processManager } from './processManager.ts'
import { testRunner } from './testRunner.ts'
import { environments } from '@monorepo/utils'

// Server setup
const PORT = 4000

// SSE clients for real-time updates
const sseClients = new Set<{
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
}>()

function broadcastUpdate() {
  const processStatus = processManager.getStatus()
  const testStatus = testRunner.getStatus()
  const appLogs = {
    production: processManager.getLogs('production'),
    staging: processManager.getLogs('staging'),
    development: processManager.getLogs('development'),
  }
  const testLogs = testRunner.getLogs()
  const hasReport = testRunner.hasReport()

  const message = `data: ${JSON.stringify({
    type: 'update',
    appStatus: processStatus,
    appLogs,
    testStatus,
    testLogs,
    hasReport
  })}\n\n`

  for (const client of sseClients) {
    try {
      client.controller.enqueue(client.encoder.encode(message))
    } catch {
      // Client disconnected, will be cleaned up on next iteration
    }
  }
}

// Periodic status updates
setInterval(broadcastUpdate, 500)

// API Routes
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // SSE endpoint
    if (url.pathname === '/api/sse/logs') {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          sseClients.add({ controller, encoder })

          req.signal.addEventListener('abort', () => {
            sseClients.delete({ controller, encoder })
          })
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      // Process management
      if (url.pathname === '/api/demo-app/start' && req.method === 'POST') {
        const body = await req.json()
        const env = body.environment
        if (!environments.includes(env)) {
          return new Response(JSON.stringify({ error: 'Invalid environment' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        const result = await processManager.start(env)
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (url.pathname === '/api/demo-app/stop' && req.method === 'POST') {
        const body = await req.json()
        const env = body.environment
        if (!environments.includes(env)) {
          return new Response(JSON.stringify({ error: 'Invalid environment' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        const result = await processManager.stop(env)
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Test management
      if (url.pathname === '/api/tests/run' && req.method === 'POST') {
        const body = await req.json()
        const project = body.project
        const result = await testRunner.run(project)
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (url.pathname === '/api/tests/stop' && req.method === 'POST') {
        const result = testRunner.stop()
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Report endpoint
    if (url.pathname === '/report/index.html') {
      if (testRunner.hasReport()) {
        const reportPath = testRunner.getReportPath()
        return new Response(Bun.file(`${reportPath}/index.html`))
      }
      return new Response('No report available', { status: 404 })
    }

    // Static files
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(Bun.file('src/public/index.html'))
    }

    if (url.pathname === '/styles.css') {
      return new Response(Bun.file('src/public/styles.css'))
    }

    // 404
    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Dashboard server running on http://localhost:${PORT}`)

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Shutting down...')
  processManager.stopAll()
  server.stop()
  process.exit(0)
})

// Export types for backwards compatibility
export * from './types.ts'
