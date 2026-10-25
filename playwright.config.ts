import { defineConfig, devices } from '@playwright/test'

// `npm run record` sets RECORD=1: every test is filmed, slowed down so the
// video is watchable, and copied to recordings/ for attaching to PRs.
const record = !!process.env.RECORD
const port = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: record ? [['list'], ['./e2e/video-reporter.ts']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    video: record ? { mode: 'on', size: { width: 1280, height: 720 } } : 'retain-on-failure',
    launchOptions: { slowMo: record ? Number(process.env.SLOWMO ?? 400) : 0 },
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  // Record against the production build, the same output reviewers would ship.
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
})
