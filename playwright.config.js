// playwright.config.js
// Documentação: https://playwright.dev/docs/test-configuration

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Inicia o servidor Express automaticamente antes dos testes E2E
  webServer: {
    command: 'node app.js',
    url: 'http://localhost:3000/healthz',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    env: {
      NODE_ENV: 'test',
      // Não conectar ao Mongo real durante testes E2E no CI;
      // remova SKIP_MONGO_CONNECT em ambiente com Mongo disponível.
      SKIP_MONGO_CONNECT: process.env.CI ? '1' : '',
    },
  },
});
