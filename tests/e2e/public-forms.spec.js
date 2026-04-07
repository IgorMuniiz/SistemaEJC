const { test, expect } = require('@playwright/test');

test('Página de inscrição pública renderiza formulário', async ({ page }) => {
  await page.goto('/inscricao');
  await expect(page.locator('form')).toBeVisible();
});

test('Página de login pública continua acessível', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('body')).toContainText(/login|acesso/i);
});
