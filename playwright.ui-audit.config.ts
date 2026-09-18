import { defineConfig, devices } from '@playwright/test'

/**
 * Stable, production-preview audit configuration.
 *
 * The regular E2E config intentionally reuses the development server on 5173.
 * This audit uses a strict preview port and one worker so lazy-module/HMR
 * state from another run cannot affect the evidence.
 */
export default defineConfig({
  testDir: './test/e2e',
  testMatch: 'full-ui-audit.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5190',
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'Mobile Safari (iPhone 14)', use: { ...devices['iPhone 14'] } },
    { name: 'Tablet Safari (iPad Pro 11)', use: { ...devices['iPad Pro 11'] } },
    { name: 'Mobile Chrome (Pixel 7)', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5190',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: false,
    timeout: 30000,
  },
})
