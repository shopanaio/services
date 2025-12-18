import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import './expect';

const isCI = process.env.CI === 'true';
const workers = process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : 5;

export default defineConfig({
  timeout: 60 * 60 * 1000, // 1 hourx
  expect: {
    timeout: 5000,
  },
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,
  reporter: isCI ? 'list' : 'list',
  use: {
    headless: true,
    /* Base URL to use in actions like `await page.goto('/')`. */
    viewport: { width: 1920, height: 1080 },
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 800 },
        launchOptions: {
          headless: false,
          args: [
            '--start-maximized',
            '--window-size=1440,800',
            '--force-device-scale-factor=1',
            '--disable-gpu',
            '--no-sandbox',
          ],
        },
      },
    },
  ],
});
