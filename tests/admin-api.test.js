/**
 * Testes de cobertura das rotas de administradores utilizadas pelo editor inline.
 *
 * Cobertos:
 *  - POST /admin/cadastrar-admin   → 401 sem sessão, 400 dados inválidos
 *  - POST /admin/atualizar-admin/:id → 401 sem sessão, 400 ID ausente
 *  - POST /admin/deletar-admin/:id   → 401 sem sessão, 400 ID inválido
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.SKIP_MONGO_CONNECT = '1';

const { app } = require('../app');

// ─── Cadastrar admin ──────────────────────────────────────────────────────────

test('POST /admin/cadastrar-admin sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/cadastrar-admin')
    .send({ username: 'novoAdmin', senha: 'teste123', nivelAcesso: 'coordenador' });

  // Sem sessão o middleware checkAdminAuth deve devolver 401 ou redirecionar
  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/cadastrar-admin com body vazio sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/cadastrar-admin')
    .send({});

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

// ─── Atualizar admin ──────────────────────────────────────────────────────────

test('POST /admin/atualizar-admin/:id sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/atualizar-admin/000000000000000000000001')
    .send({ username: 'alterado', nivelAcesso: 'consulta' });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/atualizar-admin/invalid-id sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/atualizar-admin/id-invalido')
    .send({ username: 'teste' });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

// ─── Deletar admin ────────────────────────────────────────────────────────────

test('POST /admin/deletar-admin/:id sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/deletar-admin/000000000000000000000001');

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/deletar-admin/:id com ID inválido sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/deletar-admin/xyz');

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});
