import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import './expect';

const isCI = process.env.CI === 'true';
const startServers = process.env.E2E_START_SERVERS !== 'false';
const adminPort = process.env.E2E_ADMIN_PORT ?? '3300';
const adminGatewayPort = process.env.E2E_ADMIN_GATEWAY_PORT ?? '14001';
const storefrontGatewayPort = process.env.E2E_STOREFRONT_GATEWAY_PORT ?? '14000';
const e2eConfigFile = process.env.E2E_CONFIG_FILE ?? 'config.e2e.yml';
const baseURL = startServers
  ? `http://127.0.0.1:${adminPort}`
  : process.env.BASE_URL;
const workers = process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : 5;

if (startServers) {
  process.env.BASE_URL = baseURL;
  process.env.ADMIN_GRAPHQL_URL = `http://127.0.0.1:${adminGatewayPort}/graphql`;
  process.env.CLIENT_GRAPHQL_URL = `http://127.0.0.1:${storefrontGatewayPort}/graphql`;
  process.env.CONFIG_FILE = e2eConfigFile;
}

export default defineConfig({
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  globalTeardown: startServers ? './global-teardown.ts' : undefined,
  webServer: startServers
    ? {
        command: 'node bin/start-test-env.mjs',
        url: baseURL,
        timeout: 240 * 1000,
        reuseExistingServer: false,
      }
    : undefined,
  use: {
    headless: true,
    /* Base URL to use in actions like `await page.goto('/')`. */
    viewport: { width: 1920, height: 1080 },
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
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
