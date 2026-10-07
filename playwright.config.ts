import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const staticRun = process.env.PLAYWRIGHT_STATIC === '1';
const baseURL = staticRun ? 'http://127.0.0.1:5174' : 'http://127.0.0.1:5173';
const requestedBrowser = process.env.PLAYWRIGHT_BROWSER;
const windowsEdge = process.platform === 'win32' && !requestedBrowser
  ? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  : undefined;
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || windowsEdge;

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath,
      channel: executablePath || !requestedBrowser || requestedBrowser === 'chromium' ? undefined : requestedBrowser,
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: staticRun ? 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5174 --strictPort' : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
