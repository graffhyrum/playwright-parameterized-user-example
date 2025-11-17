/**
 * Dashboard Server
 * Control panel for managing demo-app instances and running Playwright tests
 */

import {type Environment, EnvSchema, processManager} from './processManager';
import {join} from 'path';
import {type} from "arktype";
import {testRunner} from "./testRunner";
import {readFileSync} from "node:fs";
import {existsSync} from "fs";

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = join(import.meta.dir, 'public');

// SSE connection tracking
const sseClients = new Set<WritableStreamDefaultWriter>();

const EnvBodySchema = type({
	environment: EnvSchema
})

// Validation helpers
function validateEnvironment(value: unknown): { success: true; data: Environment } | { success: false; error: string } {
	const result = EnvBodySchema(value);
	if (result instanceof type.errors) {
		return {
			success: false,
			error: `Invalid environment: ${result.summary}\nValue: ${JSON.stringify(value, null, 2)}`
		};
	}
	return {success: true, data: result.environment};
}

function errorResponse(message: string, status = 400): Response {
	return Response.json({success: false, message}, {status});
}

const ProjectBodySchema = type({
	project: 'string'
})

function validateProjectArgs(value: unknown): { success: true; data: string } | { success: false; error: string } {
	const result = ProjectBodySchema(value)
	if (result instanceof type.errors) {
		return {success: false, error: `Invalid project: ${result.summary}\nValue: ${JSON.stringify(value, null, 2)}`}
	}
	return {success: true, data: result.project}
}

// Route handlers
async function handleDemoAppStart(req: Request): Promise<Response> {
	const body = await req.json();
	const validation = validateEnvironment(body);
	if (!validation.success) {
		return errorResponse(validation.error);
	}
	const result = await processManager.start(validation.data);
	return Response.json(result);
}

async function handleDemoAppStop(req: Request): Promise<Response> {
	const body = await req.json();
	const validation = validateEnvironment(body);
	if (!validation.success) {
		return errorResponse(validation.error);
	}
	const result = await processManager.stop(validation.data);
	return Response.json(result);
}

function handleDemoAppStatus(): Response {
	const status = processManager.getStatus();
	return Response.json(status);
}

function handleDemoAppLogs(url: URL): Response {
	const envValue = url.pathname.split('/').pop();
	const validation = validateEnvironment(envValue);
	if (!validation.success) {
		return errorResponse(validation.error);
	}
	const logs = processManager.getLogs(validation.data);
	return Response.json({logs});
}

async function handleTestRun(req: Request): Promise<Response> {
	const body = await req.json();
	const validation = validateProjectArgs(body);
	if (!validation.success) {
		return errorResponse(validation.error);
	}
	const result = await testRunner.run(validation.data);
	return Response.json(result);
}

function handleTestStop(): Response {
	const result = testRunner.stop();
	return Response.json(result);
}

function handleTestStatus(): Response {
	const status = testRunner.getStatus();
	return Response.json(status);
}

function handleTestLogs(): Response {
	const logs = testRunner.getLogs();
	return Response.json({logs});
}

function handleTestHasReport(): Response {
	const hasReport = testRunner.hasReport();
	return Response.json({hasReport});
}

function handleReport(url: URL): Response {
	const reportPath = testRunner.getReportPath();
	const filePath = url.pathname.replace('/report', '');
	const fullPath = join(reportPath, filePath || 'index.html');

	if (!existsSync(fullPath)) {
		return new Response('Report not found', {status: 404});
	}

	const file = Bun.file(fullPath);
	const contentType = getContentType(fullPath);

	return new Response(file, {
		headers: {'Content-Type': contentType},
	});
}

const server = Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);
		const {pathname, searchParams} = url;
		const method = req.method;

		// Static files
		if (pathname === '/' || pathname === '/index.html') return serveFile('index.html', 'text/html');
		if (pathname === '/styles.css') return serveFile('styles.css', 'text/css');

		// Demo App API
		if (pathname === '/api/demo-app/start' && method === 'POST') return handleDemoAppStart(req);
		if (pathname === '/api/demo-app/stop' && method === 'POST') return handleDemoAppStop(req);
		if (pathname === '/api/demo-app/status' && method === 'GET') return handleDemoAppStatus();
		if (pathname.startsWith('/api/demo-app/logs/') && method === 'GET') return handleDemoAppLogs(url);

		// Test Runner API
		if (pathname === '/api/tests/run' && method === 'POST') return handleTestRun(req);
		if (pathname === '/api/tests/stop' && method === 'POST') return handleTestStop();
		if (pathname === '/api/tests/status' && method === 'GET') return handleTestStatus();
		if (pathname === '/api/tests/logs' && method === 'GET') return handleTestLogs();
		if (pathname === '/api/tests/has-report' && method === 'GET') return handleTestHasReport();

		// SSE
		if (pathname === '/api/sse/logs') return handleSSE(req);

		// Reports
		if (pathname.startsWith('/report')) return handleReport(url);

		return new Response('Not Found', {status: 404});
	},
});

function serveFile(filename: string, contentType: string): Response {
	const filePath = join(PUBLIC_DIR, filename);

	if (!existsSync(filePath)) {
		return new Response('File not found', {status: 404});
	}

	const content = readFileSync(filePath, 'utf-8');
	return new Response(content, {
		headers: {'Content-Type': contentType},
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

					writer.enqueue(encoder.encode(`
		data: $
		{
			JSON.stringify(data)
		}\n\n`));
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

console.log(`🎛️  Dashboard
		running
		on
		http://localhost:${PORT}`);
console.log(`📊 Control panel for demo-app and Playwright tests`);
