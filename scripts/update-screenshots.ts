#!/usr/bin/env bun

const SCREENSHOTS_DIR = 'docs/screenshots';
const HELPER_FILE = 'scripts/screenshot-helper.cjs';

// Ensure screenshots directory exists
import {existsSync, mkdirSync} from 'node:fs';

if (!existsSync(SCREENSHOTS_DIR)) {
	mkdirSync(SCREENSHOTS_DIR, {recursive: true});
}

async function takeScreenshot(url: string, filename: string): Promise<void> {
	console.log(`Capturing screenshot of ${url}...`);

	const outputPath = `${SCREENSHOTS_DIR}/${filename}`;

	// Execute helper script using Bun's child process API
	const proc = Bun.spawn(['node', HELPER_FILE, url, outputPath], {
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit'
	});

	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Screenshot process exited with code ${exitCode}`);
	}
}


async function main(): Promise<void> {
	console.log('🚀 Starting screenshot capture...');
	console.log('⚠️  Make sure dashboard and demo-app are running on ports 4000 and 3000 respectively');
	console.log('   Start them with: bun run dashboard (in one terminal)');
	console.log('                cd demo-app && bun run dev:production (in another terminal)');
	console.log('');

	try {
		// Take screenshots
		await takeScreenshot('http://localhost:4000', 'dashboard.png');
		await takeScreenshot('http://localhost:3000', 'demo-app.png');

		console.log('✅ Screenshots updated successfully!');

	} catch (error) {
		console.error('❌ Error:', error);
		console.log('💡 Make sure both applications are running before executing this script');
		process.exit(1);
	}
}

await main();
