const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'smoke.spec.cjs',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', {outputFolder: 'playwright-report', open: 'never'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: {width: 1365, height: 900},
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/studio/',
    timeout: 30000,
    reuseExistingServer: !process.env.CI
  }
});