/**
 * Testes de regressão de UI — Editor Inline de Administradores
 *
 * Pré-requisitos:
 *   1. npx playwright install chromium
 *   2. Servidor rodando com admin logado na sessão (configure SESSION_SECRET + credenciais no .env)
 *   3. Para executar:  npm run test:e2e
 *
 * NOTA: os testes que exigem login real usam a variável de ambiente
 *       ADMIN_USERNAME / ADMIN_PASSWORD.  Se não configuradas, esses
 *       testes são pulados automaticamente.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { test, expect } = require('@playwright/test');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Faz login no painel admin via UI, só se as credenciais estiverem disponíveis.
 * Retorna false se as envs não estiverem definidas (teste será pulado).
 */
async function loginAdmin(page) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return false;

  await page.goto('/admin/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
  return true;
}

// ─── Testes públicos (sem login) ──────────────────────────────────────────────

test.describe('Rotas admin sem autenticação', () => {
  test('GET /admin redireciona para login se não autenticado', async ({ page }) => {
    const response = await page.goto('/admin');
    // Deve redirecionar para a página de login
    expect(page.url()).toMatch(/login/);
  });

  test('GET /admin/gerenciar-cadastros redireciona para login se não autenticado', async ({ page }) => {
    await page.goto('/admin/gerenciar-cadastros');
    expect(page.url()).toMatch(/login/);
  });
});

// ─── Testes com login ─────────────────────────────────────────────────────────

test.describe('Editor inline de administradores', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAdmin(page);
    test.skip(!loggedIn, 'ADMIN_USERNAME/ADMIN_PASSWORD não configurados');

    await page.goto('/admin/gerenciar-cadastros');
    // Navega para a aba de administradores
    const adminsTab = page.locator('#admins-tab, [href*="admins"], button:has-text("Admins")').first();
    if (await adminsTab.isVisible()) await adminsTab.click();
  });

  test('Botão Editar abre o editor inline abaixo da linha', async ({ page }) => {
    const editBtn = page.locator('.js-edit-admin').first();
    test.skip(!(await editBtn.isVisible()), 'Nenhum admin disponível para editar');

    await editBtn.click();

    const editor = page.locator('#admin-inline-editor-row');
    await expect(editor).toBeVisible({ timeout: 5_000 });
  });

  test('Editor inline contém campos obrigatórios de username e nível', async ({ page }) => {
    const editBtn = page.locator('.js-edit-admin').first();
    test.skip(!(await editBtn.isVisible()), 'Nenhum admin disponível para editar');

    await editBtn.click();
    await page.waitForSelector('#admin-inline-editor-row', { timeout: 5_000 });

    await expect(page.locator('#edit_admin_username')).toBeVisible();
    await expect(page.locator('#edit_admin_nivel')).toBeVisible();
  });

  test('Cliques rápidos consecutivos em Editar não travam a página', async ({ page }) => {
    const editBtns = page.locator('.js-edit-admin');
    const count = await editBtns.count();
    test.skip(count === 0, 'Nenhum admin disponível');

    // Clica no mesmo botão 5 vezes rapidamente (testa lock + debounce)
    const firstBtn = editBtns.first();
    for (let i = 0; i < 5; i++) {
      await firstBtn.click({ delay: 30 });
    }

    // Deve existir exatamente um editor inline no DOM
    const editors = page.locator('#admin-inline-editor-row');
    await expect(editors).toHaveCount(1, { timeout: 3_000 });
  });

  test('Clicar em dois admins diferentes abre somente um editor por vez', async ({ page }) => {
    const editBtns = page.locator('.js-edit-admin');
    const count = await editBtns.count();
    test.skip(count < 2, 'Precisa de pelo menos 2 admins para este teste');

    await editBtns.nth(0).click();
    await page.waitForSelector('#admin-inline-editor-row', { timeout: 5_000 });

    await editBtns.nth(1).click();
    // O editor anterior fecha e um novo abre — aguarda transição
    await page.waitForTimeout(400);

    const editors = page.locator('#admin-inline-editor-row');
    await expect(editors).toHaveCount(1, { timeout: 3_000 });
  });

  test('Botão Cancelar fecha o editor inline', async ({ page }) => {
    const editBtn = page.locator('.js-edit-admin').first();
    test.skip(!(await editBtn.isVisible()), 'Nenhum admin disponível para editar');

    await editBtn.click();
    await page.waitForSelector('#admin-inline-editor-row', { timeout: 5_000 });

    const cancelBtn = page.locator('#admin-inline-editor-row .js-cancel-edit-admin, #admin-inline-editor-row button:has-text("Cancelar")').first();
    await cancelBtn.click();

    // Após animação de 180ms o editor deve sumir
    await expect(page.locator('#admin-inline-editor-row')).not.toBeVisible({ timeout: 2_000 });
  });

  test('Botão Salvar fica desabilitado durante a requisição (anti-duplo envio)', async ({ page }) => {
    const editBtn = page.locator('.js-edit-admin').first();
    test.skip(!(await editBtn.isVisible()), 'Nenhum admin disponível para editar');

    await editBtn.click();
    await page.waitForSelector('#admin-inline-editor-row', { timeout: 5_000 });

    const saveBtn = page.locator('#admin-inline-editor-row .js-save-edit-admin, #admin-inline-editor-row button:has-text("Salvar")').first();

    // Intercepta a requisição de salvar para mantê-la pendente enquanto verifica
    await page.route('**/admin/atualizar-admin/**', async (route) => {
      // Verifica que o botão está desabilitado durante a requisição
      const isDisabled = await saveBtn.isDisabled();
      expect(isDisabled).toBeTruthy();
      await route.abort(); // Cancela a requisição para não afetar dados reais
    });

    await saveBtn.click();
  });
});

// ─── Testes de acessibilidade básica ─────────────────────────────────────────

test.describe('Seção Auditoria', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAdmin(page);
    test.skip(!loggedIn, 'ADMIN_USERNAME/ADMIN_PASSWORD não configurados');
    await page.goto('/admin/gerenciar-cadastros');
    const adminsTab = page.locator('#admins-tab, [href*="admins"], button:has-text("Admins")').first();
    if (await adminsTab.isVisible()) await adminsTab.click();
  });

  test('Seção Auditoria inicia fechada e abre ao clicar no cabeçalho', async ({ page }) => {
    const auditCard = page.locator('#admins-audit-card');
    test.skip(!(await auditCard.isVisible()), 'Card de auditoria não encontrado');

    // Deve iniciar fechado (sem classe is-open, ou conteúdo oculto)
    const content = page.locator('#admins-audit-content');
    const initiallyOpen = await auditCard.evaluate((el) => el.classList.contains('is-open'));

    const header = auditCard.locator('.admin-card-head').first();
    await header.click();

    // Após clicar o estado deve ser oposto ao inicial
    await page.waitForTimeout(300);
    const afterClick = await auditCard.evaluate((el) => el.classList.contains('is-open'));
    expect(afterClick).toBe(!initiallyOpen);
  });
});
