import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run the production build: the API serves the compiled client on one origin,
 * so the real CSP, cookies and CSRF flow are exercised.
 *
 * Requires a MongoDB-compatible server at E2E_MONGODB_URI (default mongodb://127.0.0.1:27017).
 * Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a system Chromium instead of `npx playwright install chromium`.
 */
const PORT = Number(process.env.E2E_PORT ?? 4100);
const baseURL = `http://127.0.0.1:${PORT}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] } : {},
  },
  webServer: {
    command: 'npm run build && node server/dist/seed/run.js && node server/dist/index.js',
    url: `${baseURL}/api/v1/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'development',
      PORT: String(PORT),
      MONGODB_URI: `${(process.env.E2E_MONGODB_URI ?? 'mongodb://127.0.0.1:27017').replace(/\/$/, '')}/voyage_e2e_${Date.now()}`,
      SESSION_SECRET: 'e2e-only-session-secret-0123456789-abcdefghijklmnop',
      CORS_ORIGINS: baseURL,
      CLIENT_DIST_DIR: 'client/dist',
      LOG_LEVEL: 'warn',
      SESSION_AUTO_REMOVE: process.env.SESSION_AUTO_REMOVE ?? 'native',
      RATE_LIMIT_REGISTER_MAX: '50',
      RATE_LIMIT_LOGIN_MAX: '50',
    },
  },
});
