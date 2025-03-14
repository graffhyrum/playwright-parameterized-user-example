import { defineConfig } from "@playwright/test";
import { CONFIG } from "./CONFIG.ts";
import { getProjects } from "./src/getProjects.ts";

const serverURL = `http://${CONFIG.host}:${CONFIG.port}`;
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: serverURL,
		trace: "on",
	},

	/* Configure projects for major browsers */
	projects: getProjects(),

	webServer: {
		command: "bun demoServer/index.ts",
		url: serverURL,
	},
});
