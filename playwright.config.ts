import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm preview --host 127.0.0.1 --port 4173',
		port: 4173,
		// Reusing a stale preview from another session silently tests old code.
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	use: { baseURL: 'http://127.0.0.1:4173' },
	testDir: 'e2e'
});
