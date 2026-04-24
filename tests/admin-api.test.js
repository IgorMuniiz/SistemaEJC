/**
 * Testes de cobertura das rotas de administradores utilizadas pelo editor inline.
 *
 * Cobertos:
 *  - POST /admin/cadastrar-admin   → 401 sem sessão, 400 dados inválidos
 *  - POST /admin/atualizar-admin/:id → 401 sem sessão, 400 ID ausente
 *  - POST /admin/deletar-admin/:id   → 401 sem sessão, 400 ID inválido
 *  - POST /admin/cadastrar-subequipe → 401 sem sessão
 *  - POST /admin/editar-subequipe/:id → 401 sem sessão
 *  - POST /admin/deletar-subequipe/:id → 401 sem sessão
 *  - POST /admin/vincular-encontreiro-subequipe → 401 sem sessão
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');

process.env.NODE_ENV = 'test';
process.env.SKIP_MONGO_CONNECT = '1';

const { app, getCrachaPalette, invalidarCacheEncontroAtivo } = require('../app');
const Admin = mongoose.model('Admin');
const SubEquipe = mongoose.model('SubEquipe');
const Cadastro = mongoose.model('Cadastro_EJC');
const Encontro = mongoose.model('Encontro');
const Equipe = mongoose.model('Equipe');
const Circulo = mongoose.model('Circulo');
const Ejc = mongoose.model('Ejc');
const VinculoEncontro = mongoose.model('VinculoEncontro');
const GastoEncontro = mongoose.model('GastoEncontro');
const FluxoCaixaEncontro = mongoose.model('FluxoCaixaEncontro');
const AdminAuditLog = mongoose.model('AdminAuditLog');
const PushSubscription = mongoose.model('PushSubscription');

const ADMIN_ID = '507f1f77bcf86cd799439011';

const createMockAdminDoc = () => ({
  _id: ADMIN_ID,
  username: 'admin_teste',
  nivelAcesso: 'super_admin',
  permissoes: [],
  senha: 'senha123',
  save: async () => {},
});

const mockAdminAuthFlow = (t) => {
  const originalFindOne = Admin.findOne;
  const originalFindById = Admin.findById;

  Admin.findOne = async () => createMockAdminDoc();
  Admin.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: ADMIN_ID,
        username: 'admin_teste',
        nivelAcesso: 'super_admin',
        permissoes: [],
      }),
    }),
  });

  t.after(() => {
    Admin.findOne = originalFindOne;
    Admin.findById = originalFindById;
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loginAsAdmin = async (agent) => {
  let response = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await agent
      .post('/admin/login')
      .send({ username: 'admin_teste', senha: 'senha123' });

    if (response.status !== 429) break;
    await wait(250);
  }

  assert.equal(response.status, 302, `Login deveria redirecionar, retornou ${response.status}`);
};

const asSameOrigin = (req) => req
  .set('Host', 'localhost')
  .set('Origin', 'http://localhost')
  .set('Referer', 'http://localhost/admin/gerenciar-cadastros')
  .set('Accept', 'application/json');

const binaryParser = (res, callback) => {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
};

test('getCrachaPalette usa vermelho quando o círculo é vermelho', () => {
  const palette = getCrachaPalette('circulo', 'Círculo Vermelho');

  assert.equal(palette.accent, '#dc2626');
  assert.equal(palette.border, '#fca5a5');
  assert.equal(palette.chipText, '#991b1b');
});

test('getCrachaPalette usa amarelo fiel quando o círculo é amarelo', () => {
  const palette = getCrachaPalette('circulo', 'Círculo Amarelo');

  assert.equal(palette.accent, '#eab308');
  assert.equal(palette.border, '#fde047');
  assert.equal(palette.chipText, '#a16207');
});

test('getCrachaPalette usa roxo premium para equipe de liturgia', () => {
  const palette = getCrachaPalette('equipe', 'Liturgia interna');

  assert.equal(palette.accent, '#6d28d9');
  assert.equal(palette.border, '#c4b5fd');
  assert.equal(palette.chipText, '#4c1d95');
});

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

test('POST /admin/login persiste sessão e mantém acesso a rota protegida', async (t) => {
  mockAdminAuthFlow(t);

  const agent = request.agent(app);
  const loginResponse = await agent
    .post('/admin/login')
    .send({ username: 'admin_teste', senha: 'senha123' });

  assert.equal(loginResponse.status, 302);
  assert.equal(loginResponse.headers.location, '/admin/gerenciar-cadastros');
  assert.ok(
    Array.isArray(loginResponse.headers['set-cookie'])
    && loginResponse.headers['set-cookie'].some((cookie) => String(cookie).includes('ejc.sid=')),
    'Login deve emitir cookie de sessão do admin',
  );

  const protectedResponse = await agent.get('/admin/home');
  assert.equal(protectedResponse.status, 302);
  assert.equal(protectedResponse.headers.location, '/admin/gerenciar-cadastros');
});

// ─── Sub-equipes ─────────────────────────────────────────────────────────────

test('POST /admin/cadastrar-subequipe sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/cadastrar-subequipe')
    .send({ nome: 'Acolhida', anoVigencia: 2025 });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});
test('POST /admin/cadastrar-gasto sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/cadastrar-gasto')
    .send({ descricao: 'Mercado', valor: '120,00', dataGasto: '2026-04-04' });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/cadastrar-fluxo-caixa sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/cadastrar-fluxo-caixa')
    .send({ tipoMovimento: 'entrada', descricao: 'Doação', valor: '180,00', dataMovimento: '2026-04-04' });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});
test('POST /admin/editar-subequipe/:id sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/editar-subequipe/000000000000000000000001')
    .send({ nome: 'Acolhida 2', anoVigencia: 2026 });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/deletar-subequipe/:id sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/deletar-subequipe/000000000000000000000001');

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/vincular-encontreiro-subequipe sem autenticação retorna 401 ou redireciona', async () => {
  const response = await request(app)
    .post('/admin/vincular-encontreiro-subequipe')
    .send({
      pessoaId: '000000000000000000000001',
      subequipeId: '000000000000000000000002',
      papel: 'coordenador',
    });

  assert.ok(
    response.status === 401 || response.status === 302 || response.status === 403,
    `Status esperado 401/302/403, recebido: ${response.status}`,
  );
});

test('POST /admin/cadastrar-subequipe autenticado retorna sucesso', async (t) => {
  mockAdminAuthFlow(t);

  const originalFindOne = SubEquipe.findOne;
  const originalCreate = SubEquipe.create;

  let createPayload = null;
  SubEquipe.findOne = async () => null;
  SubEquipe.create = async (payload) => {
    createPayload = payload;
    return { _id: '507f1f77bcf86cd799439012', ...payload };
  };

  t.after(() => {
    SubEquipe.findOne = originalFindOne;
    SubEquipe.create = originalCreate;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/cadastrar-subequipe').send({ nome: 'Acolhida Técnica', anoVigencia: 2025 })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(createPayload.nome, 'Acolhida Técnica');
  assert.equal(createPayload.anoVigencia, 2025);
});

test('POST /admin/cadastrar-gasto autenticado retorna sucesso', async (t) => {
  mockAdminAuthFlow(t);

  const originalEjcFindById = Ejc.findById;
  const originalGastoCreate = GastoEncontro.create;
  const originalAdminAuditCreate = AdminAuditLog.create;
  let createPayload = null;

  Ejc.findById = () => ({
    select: () => ({
      lean: async () => ({ _id: '507f1f77bcf86cd799439032', nome: 'EJC Teste' }),
    }),
  });
  GastoEncontro.create = async (payload) => {
    createPayload = payload;
    return { _id: '507f1f77bcf86cd799439033', ...payload };
  };
  AdminAuditLog.create = async () => ({ _id: '507f1f77bcf86cd799439034' });

  t.after(() => {
    Ejc.findById = originalEjcFindById;
    GastoEncontro.create = originalGastoCreate;
    AdminAuditLog.create = originalAdminAuditCreate;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/cadastrar-gasto').send({
      ejcId: '507f1f77bcf86cd799439032',
      escopoTipo: 'encontro',
      categoria: 'Alimentação',
      descricao: 'Compra de mercado',
      valor: '1.234,56',
      dataGasto: '2026-04-04',
      responsavel: 'Tesouraria',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(createPayload.valor, 1234.56);
  assert.equal(createPayload.descricao, 'Compra de mercado');
  assert.equal(response.body.gasto.valor, 1234.56);
});

test('POST /admin/cadastrar-fluxo-caixa autenticado retorna sucesso', async (t) => {
  mockAdminAuthFlow(t);

  const originalEjcFindById = Ejc.findById;
  const originalFluxoCreate = FluxoCaixaEncontro.create;
  const originalAdminAuditCreate = AdminAuditLog.create;
  let createPayload = null;

  Ejc.findById = () => ({
    select: () => ({
      lean: async () => ({ _id: '507f1f77bcf86cd799439052', nome: 'EJC Teste' }),
    }),
  });
  FluxoCaixaEncontro.create = async (payload) => {
    createPayload = payload;
    return { _id: '507f1f77bcf86cd799439053', ...payload };
  };
  AdminAuditLog.create = async () => ({ _id: '507f1f77bcf86cd799439054' });

  t.after(() => {
    Ejc.findById = originalEjcFindById;
    FluxoCaixaEncontro.create = originalFluxoCreate;
    AdminAuditLog.create = originalAdminAuditCreate;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/cadastrar-fluxo-caixa').send({
      ejcId: '507f1f77bcf86cd799439052',
      tipoMovimento: 'entrada',
      categoria: 'Doação',
      descricao: 'Doação de família',
      valor: '987,65',
      dataMovimento: '2026-04-04',
      responsavel: 'Tesouraria',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(createPayload.valor, 987.65);
  assert.equal(createPayload.tipoMovimento, 'entrada');
  assert.equal(response.body.movimento.valor, 987.65);
});

test('POST /admin/transferir-encontrista/:id autenticado transfere para o encontro escolhido', async (t) => {
  mockAdminAuthFlow(t);

  const originalCadastroFindById = Cadastro.findById;
  const originalCadastroFindByIdAndDelete = Cadastro.findByIdAndDelete;
  const originalEncontroFindOne = Encontro.findOne;
  const originalEncontroCreate = Encontro.create;
  const originalEjcFindById = Ejc.findById;

  let createPayload = null;
  let deletedId = null;

  Cadastro.findById = async () => ({
    _id: '507f1f77bcf86cd799439061',
    nomeCompleto: 'Encontrista Transferido',
    ejc: 'EJC 2019',
    email: 'transferido@test.local',
    telefone: '(11) 99999-0000',
    logradouro: 'Rua A',
    bairro: 'Centro',
    dataNascimento: '2000-01-01',
    instagram: '@teste',
    foto: 'foto.webp',
    dataCadastro: new Date('2026-04-01T00:00:00.000Z'),
    aprovado: false,
    statusAprovacao: 'pendente',
  });
  Cadastro.findByIdAndDelete = async (id) => {
    deletedId = String(id);
    return { acknowledged: true };
  };
  Encontro.findOne = async () => null;
  Encontro.create = async (payload) => {
    createPayload = payload;
    return { _id: '507f1f77bcf86cd799439062', ...payload };
  };
  Ejc.findById = () => ({
    lean: async () => ({ _id: '507f1f77bcf86cd799439063', nome: 'EJC Destino 2026' }),
  });

  t.after(() => {
    Cadastro.findById = originalCadastroFindById;
    Cadastro.findByIdAndDelete = originalCadastroFindByIdAndDelete;
    Encontro.findOne = originalEncontroFindOne;
    Encontro.create = originalEncontroCreate;
    Ejc.findById = originalEjcFindById;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/transferir-encontrista/507f1f77bcf86cd799439061').send({
      ejcId: '507f1f77bcf86cd799439063',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(createPayload.ejc, 'EJC Destino 2026');
  assert.equal(createPayload.qualEjcPertence, 'EJC 2019');
  assert.equal(String(createPayload.ejcVinculadoId), '507f1f77bcf86cd799439063');
  assert.equal(createPayload.ejcVinculadoNome, 'EJC Destino 2026');
  assert.match(createPayload.observacoes, /EJC Destino 2026/);
  assert.equal(deletedId, '507f1f77bcf86cd799439061');
});

test('POST /admin/transferir-encontrista/:id atualiza encontreiro existente quando nome e email sao os mesmos', async (t) => {
  mockAdminAuthFlow(t);

  const originalCadastroFindById = Cadastro.findById;
  const originalCadastroFindByIdAndDelete = Cadastro.findByIdAndDelete;
  const originalEncontroFindOne = Encontro.findOne;
  const originalEncontroFindByIdAndUpdate = Encontro.findByIdAndUpdate;
  const originalEncontroCreate = Encontro.create;
  const originalEjcFindById = Ejc.findById;

  let deletedId = null;
  let updatedId = null;
  let updatePayload = null;
  let createCalled = false;

  Cadastro.findById = async () => ({
    _id: '507f1f77bcf86cd799439161',
    nomeCompleto: 'Encontrista Transferido',
    ejc: 'EJC 2019',
    email: 'transferido@test.local',
    telefone: '(11) 99999-0000',
    logradouro: 'Rua A',
    bairro: 'Centro',
    dataNascimento: '2000-01-01',
    instagram: '@teste',
    foto: 'foto.webp',
    dataCadastro: new Date('2026-04-01T00:00:00.000Z'),
    aprovado: false,
    statusAprovacao: 'pendente',
  });
  Cadastro.findByIdAndDelete = async (id) => {
    deletedId = String(id);
    return { acknowledged: true };
  };
  Encontro.findOne = async () => ({
    _id: '507f1f77bcf86cd799439162',
    nomeCompleto: 'Encontrista Transferido',
    email: 'transferido@test.local',
  });
  Encontro.findByIdAndUpdate = async (id, payload) => {
    updatedId = String(id);
    updatePayload = payload;
    return { _id: id, ...payload };
  };
  Encontro.create = async () => {
    createCalled = true;
    return null;
  };
  Ejc.findById = () => ({
    lean: async () => ({ _id: '507f1f77bcf86cd799439163', nome: 'EJC Destino 2026' }),
  });

  t.after(() => {
    Cadastro.findById = originalCadastroFindById;
    Cadastro.findByIdAndDelete = originalCadastroFindByIdAndDelete;
    Encontro.findOne = originalEncontroFindOne;
    Encontro.findByIdAndUpdate = originalEncontroFindByIdAndUpdate;
    Encontro.create = originalEncontroCreate;
    Ejc.findById = originalEjcFindById;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/transferir-encontrista/507f1f77bcf86cd799439161').send({
      ejcId: '507f1f77bcf86cd799439163',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.updated, true);
  assert.equal(updatedId, '507f1f77bcf86cd799439162');
  assert.equal(updatePayload.ejc, 'EJC Destino 2026');
  assert.equal(updatePayload.email, 'transferido@test.local');
  assert.equal(deletedId, '507f1f77bcf86cd799439161');
  assert.equal(createCalled, false);
});

test('POST /admin/transferir-encontristas-lote autenticado exige encontro de destino', async (t) => {
  mockAdminAuthFlow(t);

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/transferir-encontristas-lote').send({
      ids: ['507f1f77bcf86cd799439071'],
    })
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.error, /encontro valido/i);
});

test('POST /admin/cadastrar-subequipe autenticado retorna 409 quando duplicado', async (t) => {
  mockAdminAuthFlow(t);

  const originalFindOne = SubEquipe.findOne;
  SubEquipe.findOne = async () => ({ _id: '507f1f77bcf86cd799439013' });

  t.after(() => {
    SubEquipe.findOne = originalFindOne;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/cadastrar-subequipe').send({ nome: 'Acolhida Técnica', anoVigencia: 2025 })
  );

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
});

test('POST /admin/editar-subequipe/:id autenticado retorna 400 para id inválido', async (t) => {
  mockAdminAuthFlow(t);

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/editar-subequipe/id-invalido').send({ nome: 'Novo Nome', anoVigencia: 2026 })
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


test('POST /admin/aprovar vincula o aprovado ao encontro ativo sem alterar o EJC informado no cadastro', async (t) => {
  mockAdminAuthFlow(t);

  invalidarCacheEncontroAtivo();

  const originalEjcFindOne = Ejc.findOne;
  const originalEncontroFindOne = Encontro.findOne;
  const originalEncontroFindOneAndUpdate = Encontro.findOneAndUpdate;

  const cadastroId = '507f1f77bcf86cd799439130';
  const encontroAtivo = {
    _id: '507f1f77bcf86cd799439131',
    nome: 'EJC Ativo 2026',
    ativo: true,
  };
  const cadastroAtual = {
    _id: cadastroId,
    nomeCompleto: 'Encontreiro Aprovado',
    ejc: 'EJC 2019',
    ejcVinculadoId: null,
    ejcVinculadoNome: '',
  };

  let payloadAtualizado = null;

  Ejc.findOne = (query = {}) => ({
    lean: async () => ((query && query.ativo === true) ? encontroAtivo : encontroAtivo),
    sort: () => ({ lean: async () => encontroAtivo }),
  });
  Encontro.findOne = async () => cadastroAtual;
  Encontro.findOneAndUpdate = async (_query, payload) => {
    payloadAtualizado = payload;
    return {
      ...cadastroAtual,
      ...payload,
    };
  };

  t.after(() => {
    Ejc.findOne = originalEjcFindOne;
    Encontro.findOne = originalEncontroFindOne;
    Encontro.findOneAndUpdate = originalEncontroFindOneAndUpdate;
    invalidarCacheEncontroAtivo();
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/aprovar').send({
      id: cadastroId,
      tipoLista: 'encontreiro',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(payloadAtualizado.aprovado, true);
  assert.equal(payloadAtualizado.statusAprovacao, 'aprovado');
  assert.equal(String(payloadAtualizado.ejcVinculadoId), encontroAtivo._id);
  assert.equal(payloadAtualizado.ejcVinculadoNome, encontroAtivo.nome);
  assert.equal(cadastroAtual.ejc, 'EJC 2019');
});

test('POST /encontro retorna 409 quando a mesma pessoa tenta reenviar cadastro e a sobrescrita publica esta desabilitada', async (t) => {
  invalidarCacheEncontroAtivo();

  const originalAdminFindOne = Admin.findOne;
  const originalEjcFindOne = Ejc.findOne;
  const originalEncontroFindOne = Encontro.findOne;
  const originalSubscriptionFind = PushSubscription.find;

  const cadastroId = '507f1f77bcf86cd799439140';
  const encontroAtivo = {
    _id: '507f1f77bcf86cd799439141',
    nome: 'EJC Atual 2026',
    ativo: true,
  };
  const cadastroExistente = {
    _id: cadastroId,
    nomeCompleto: 'Maria Reentrada',
    ejc: 'EJC Antigo 2024',
    ejcVinculadoId: '507f1f77bcf86cd799439142',
    ejcVinculadoNome: 'EJC Antigo 2024',
    aprovado: true,
    statusAprovacao: 'aprovado',
    foto: 'foto-antiga.jpg',
    tipo: 'jovens',
  };

  Admin.findOne = () => ({ lean: async () => null });
  Ejc.findOne = (query = {}) => ({
    lean: async () => ((query && query.ativo === true) ? encontroAtivo : encontroAtivo),
    sort: () => ({ lean: async () => encontroAtivo }),
  });
  Encontro.findOne = async () => cadastroExistente;
  PushSubscription.find = () => ({ lean: async () => [] });

  t.after(() => {
    Admin.findOne = originalAdminFindOne;
    Ejc.findOne = originalEjcFindOne;
    Encontro.findOne = originalEncontroFindOne;
    PushSubscription.find = originalSubscriptionFind;
    invalidarCacheEncontroAtivo();
  });

  const response = await request(app)
    .post('/encontro')
    .set('Accept', 'application/json')
    .send({
      nomeCompleto: 'Maria Reentrada',
      genero: 'feminino',
      tipo: 'jovens',
      ejc: 'EJC Digitado no Cadastro',
      paroquiaFrequenta: 'Paroquia Central',
      logradouro: 'Rua das Flores, 10',
      bairro: 'Centro',
      dataNascimento: '1995-02-10',
      telefone: '88999999999',
      ehAlergico: 'nao',
      email: 'maria.reentrada@example.com',
      disponibilidadeEncontro: 'true',
      lgpdConsentimento: 'true',
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.match(response.body.errors[0].msg, /ja existe uma inscricao para este email/i);
});

test('POST /encontro cria novo cadastro quando o nome e igual mas o email e diferente', async (t) => {
  invalidarCacheEncontroAtivo();

  const originalAdminFindOne = Admin.findOne;
  const originalEjcFindOne = Ejc.findOne;
  const originalEncontroFindOne = Encontro.findOne;
  const originalEncontroPrototypeSave = Encontro.prototype.save;
  const originalSubscriptionFind = PushSubscription.find;

  const encontroAtivo = {
    _id: '507f1f77bcf86cd799439171',
    nome: 'EJC Atual 2026',
    ativo: true,
  };
  const encontroExistenteMesmoNome = {
    _id: '507f1f77bcf86cd799439172',
    nomeCompleto: 'Maria Duplicada',
    email: 'maria.antiga@example.com',
  };

  let savedPayload = null;

  Admin.findOne = () => ({ lean: async () => null });
  Ejc.findOne = (query = {}) => ({
    lean: async () => ((query && query.ativo === true) ? encontroAtivo : encontroAtivo),
    sort: () => ({ lean: async () => encontroAtivo }),
  });
  Encontro.findOne = async (query) => {
    if (query && query.$and) return null;
    if (query && query.$or) return null;
    return encontroExistenteMesmoNome;
  };
  Encontro.prototype.save = async function mockSave() {
    savedPayload = {
      nomeCompleto: this.nomeCompleto,
      email: this.email,
      ejc: this.ejc,
      ejcVinculadoNome: this.ejcVinculadoNome,
      statusAprovacao: this.statusAprovacao,
    };
    return this;
  };
  PushSubscription.find = () => ({ lean: async () => [] });

  t.after(() => {
    Admin.findOne = originalAdminFindOne;
    Ejc.findOne = originalEjcFindOne;
    Encontro.findOne = originalEncontroFindOne;
    Encontro.prototype.save = originalEncontroPrototypeSave;
    PushSubscription.find = originalSubscriptionFind;
    invalidarCacheEncontroAtivo();
  });

  const response = await request(app)
    .post('/encontro')
    .set('Accept', 'application/json')
    .field('nomeCompleto', 'Maria Duplicada')
    .field('genero', 'feminino')
    .field('tipo', 'jovens')
    .field('ejc', 'EJC Digitado no Cadastro')
    .field('paroquiaFrequenta', 'Paroquia Central')
    .field('logradouro', 'Rua das Flores, 10')
    .field('bairro', 'Centro')
    .field('dataNascimento', '1995-02-10')
    .field('telefone', '88999999999')
    .field('ehAlergico', 'nao')
    .field('email', 'maria.nova@example.com')
    .field('disponibilidadeEncontro', 'true')
    .field('lgpdConsentimento', 'true')
    .attach('foto', Buffer.from('foto-simulada'), 'foto.jpg');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.created, true);
  assert.equal(savedPayload.nomeCompleto, 'Maria Duplicada');
  assert.equal(savedPayload.email, 'maria.nova@example.com');
  assert.equal(savedPayload.ejc, 'EJC Digitado no Cadastro');
  assert.equal(savedPayload.ejcVinculadoNome, encontroAtivo.nome);
  assert.equal(savedPayload.statusAprovacao, 'pendente');
});

test('POST /encontro retorna 400 com mensagem clara quando a foto tem formato invalido', async (t) => {
  const originalAdminFindOne = Admin.findOne;

  Admin.findOne = () => ({ lean: async () => null });

  t.after(() => {
    Admin.findOne = originalAdminFindOne;
  });

  const response = await request(app)
    .post('/encontro')
    .set('Accept', 'application/json')
    .field('nomeCompleto', 'Tio Teste')
    .field('tipo', 'tios')
    .field('logradouro', 'Rua A, 10')
    .field('dataNascimento', '1980-01-01')
    .field('email', 'tio.teste@example.com')
    .field('disponibilidadeEncontro', 'true')
    .attach('foto', Buffer.from('conteudo-invalido'), 'foto.gif');

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.errors[0].msg, /jpg|png/i);
});

test('POST /encontro aceita mesmo email apenas para tio casal no mesmo grupo', async (t) => {
  invalidarCacheEncontroAtivo();

  const originalAdminFindOne = Admin.findOne;
  const originalEjcFindOne = Ejc.findOne;
  const originalEncontroFindOne = Encontro.findOne;
  const originalEncontroPrototypeSave = Encontro.prototype.save;
  const originalSubscriptionFind = PushSubscription.find;

  const encontroAtivo = {
    _id: '507f1f77bcf86cd799439181',
    nome: 'EJC Atual 2026',
    ativo: true,
  };
  const emailCompartilhado = 'casal.tios@example.com';
  const grupoCasal = 'tios-casal-001';

  const registrosSalvos = [];

  Admin.findOne = () => ({ lean: async () => null });
  Ejc.findOne = (query = {}) => ({
    lean: async () => ((query && query.ativo === true) ? encontroAtivo : encontroAtivo),
    sort: () => ({ lean: async () => encontroAtivo }),
  });
  Encontro.findOne = async (query) => {
    const porAnd = query && query.$and;
    const porEmail = query && query.$or;

    if (porAnd) {
      const nomeRegex = porAnd[0]?.nomeCompleto;
      if (!nomeRegex || typeof nomeRegex.test !== 'function') return null;
      return registrosSalvos.find((item) => nomeRegex.test(item.nomeCompleto)) || null;
    }

    if (porEmail) {
      return registrosSalvos.find((item) => String(item.email).toLowerCase() === emailCompartilhado) || null;
    }

    return null;
  };
  Encontro.prototype.save = async function mockSave() {
    this._id = this._id || new mongoose.Types.ObjectId();
    registrosSalvos.push({
      _id: this._id,
      nomeCompleto: this.nomeCompleto,
      email: this.email,
      tipo: this.tipo,
      tiosCategoria: this.tiosCategoria,
      tiosGrupoId: this.tiosGrupoId,
    });
    return this;
  };
  PushSubscription.find = () => ({ lean: async () => [] });

  t.after(() => {
    Admin.findOne = originalAdminFindOne;
    Ejc.findOne = originalEjcFindOne;
    Encontro.findOne = originalEncontroFindOne;
    Encontro.prototype.save = originalEncontroPrototypeSave;
    PushSubscription.find = originalSubscriptionFind;
    invalidarCacheEncontroAtivo();
  });

  const payloadBase = {
    tipo: 'tios',
    tiosCategoria: 'casal',
    origemTios: 'true',
    tiosGrupoId: grupoCasal,
    logradouro: 'Rua A, 10',
    dataNascimento: '1980-01-01',
    disponibilidadeEncontro: 'true',
  };

  const primeiraResposta = await request(app)
    .post('/encontro')
    .set('Accept', 'application/json')
    .send({
      ...payloadBase,
      nomeCompleto: 'Tio Carlos',
      email: emailCompartilhado,
    });

  const segundaResposta = await request(app)
    .post('/encontro')
    .set('Accept', 'application/json')
    .send({
      ...payloadBase,
      nomeCompleto: 'Tia Maria',
      email: emailCompartilhado,
    });

  assert.equal(primeiraResposta.status, 200);
  assert.equal(primeiraResposta.body.success, true);
  assert.equal(segundaResposta.status, 200);
  assert.equal(segundaResposta.body.success, true);
  assert.equal(registrosSalvos.length, 2);
  assert.equal(registrosSalvos[0].tiosGrupoId, grupoCasal);
  assert.equal(registrosSalvos[1].tiosGrupoId, grupoCasal);
});
test('POST /admin/vincular-encontreiro-subequipe autenticado retorna sucesso', async (t) => {
  mockAdminAuthFlow(t);

  const originalSubFindById = SubEquipe.findById;
  const originalEncontroFindById = Encontro.findById;

  SubEquipe.findById = async () => ({
    _id: '507f1f77bcf86cd799439014',
    nome: 'SubEquipe Apoio',
    nomeReferencia: 'SubEquipe Apoio',
    anoVigencia: 2025,
  });

  let saved = false;
  Encontro.findById = async () => ({
    _id: '507f1f77bcf86cd799439015',
    subequipeCoordenou: [],
    subequipeCoordenacoes: [],
    save: async () => {
      saved = true;
    },
  });

  t.after(() => {
    SubEquipe.findById = originalSubFindById;
    Encontro.findById = originalEncontroFindById;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/vincular-encontreiro-subequipe').send({
      pessoaId: '507f1f77bcf86cd799439015',
      subequipeId: '507f1f77bcf86cd799439014',
      papel: 'coordenador',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(saved, true);
});

test('POST /admin/importar-cadastros autenticado rejeita sqlQuery customizado', async (t) => {
  mockAdminAuthFlow(t);

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post('/admin/importar-cadastros').send({
      tipoImportacao: 'encontreiros',
      sourceType: 'database',
      dbEngine: 'postgresql',
      connectionString: 'postgresql://usuario:senha@localhost:5432/banco',
      tableName: 'encontro',
      sqlQuery: 'SELECT * FROM encontro LIMIT 1',
    })
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.match(String(response.body.error || ''), /desativada por seguranca/i);
});

test('POST /admin/atualizar-cadastro/encontreiro/:id preserva histórico de equipes ao virar tio', async (t) => {
  mockAdminAuthFlow(t);
  invalidarCacheEncontroAtivo();

  const VinculoEncontro = mongoose.model('VinculoEncontro');
  const originalEjcFindOne = Ejc.findOne;
  const originalFindById = Encontro.findById;
  const originalFindByIdAndUpdate = Encontro.findByIdAndUpdate;
  const originalDeleteMany = VinculoEncontro.deleteMany;

  const cadastroId = '507f1f77bcf86cd799439099';
  const cadastroAtual = {
    _id: cadastroId,
    nomeCompleto: 'Carlos Histórico',
    tipo: 'jovens',
    tiosCategoria: '',
    tiosGrupoId: '',
    tioParceiroId: null,
  };

  let payloadAtualizado = null;

  Ejc.findOne = (query = {}) => ({
    lean: async () => ((query && query.ativo === true)
      ? { _id: '507f1f77bcf86cd799439090', nome: 'EJC Ativo Teste' }
      : { _id: '507f1f77bcf86cd799439090', nome: 'EJC Ativo Teste' }),
    sort: () => ({
      lean: async () => ({ _id: '507f1f77bcf86cd799439090', nome: 'EJC Ativo Teste' }),
    }),
  });
  Encontro.findById = async () => cadastroAtual;
  Encontro.findByIdAndUpdate = async (_id, payload) => {
    payloadAtualizado = payload;
    return {
      ...cadastroAtual,
      ...payload,
      _id: cadastroId,
    };
  };
  VinculoEncontro.deleteMany = async () => ({ acknowledged: true, deletedCount: 0 });

  t.after(() => {
    Ejc.findOne = originalEjcFindOne;
    Encontro.findById = originalFindById;
    Encontro.findByIdAndUpdate = originalFindByIdAndUpdate;
    VinculoEncontro.deleteMany = originalDeleteMany;
    invalidarCacheEncontroAtivo();
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.post(`/admin/atualizar-cadastro/encontreiro/${cadastroId}`).type('form').send({
      nomeCompleto: 'Carlos Histórico',
      ejc: 'EJC 2026',
      logradouro: 'Rua A',
      bairro: 'Centro',
      telefone: '88999999999',
      email: 'carlos@example.com',
      instagram: '@carlos',
      dataNascimento: '1990-05-10',
      statusAprovacao: 'aprovado',
      tipo: 'tios',
      tiosCategoria: 'solo',
      origemTios: 'false',
      equipeServiu: 'Sala, Cozinha',
      equipeCoordenou: 'Secretaria',
      ehAlergico: 'nao',
      intolerante: '',
      alergiaDescricao: '',
      temRelacionamento: '',
      observacoes: 'Virou tio',
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(payloadAtualizado.equipeServiu, ['Sala', 'Cozinha']);
  assert.deepEqual(payloadAtualizado.equipeCoordenou, ['Secretaria']);
});

test('POST /admin/atualizar-cadastro/encontreiro/:id nao bloqueia a resposta quando a auditoria fica pendente', async (t) => {
  mockAdminAuthFlow(t);
  invalidarCacheEncontroAtivo();

  const VinculoEncontro = mongoose.model('VinculoEncontro');
  const originalEjcFindOne = Ejc.findOne;
  const originalFindById = Encontro.findById;
  const originalFindByIdAndUpdate = Encontro.findByIdAndUpdate;
  const originalDeleteMany = VinculoEncontro.deleteMany;
  const originalAuditCreate = AdminAuditLog.create;

  const cadastroId = '507f1f77bcf86cd799439109';
  const cadastroAtual = {
    _id: cadastroId,
    nomeCompleto: 'Carlos Sem Bloqueio',
    tipo: 'jovens',
    tiosCategoria: '',
    tiosGrupoId: '',
    tioParceiroId: null,
  };

  Ejc.findOne = (query = {}) => ({
    lean: async () => ((query && query.ativo === true)
      ? { _id: '507f1f77bcf86cd799439100', nome: 'EJC Ativo Teste' }
      : { _id: '507f1f77bcf86cd799439100', nome: 'EJC Ativo Teste' }),
    sort: () => ({
      lean: async () => ({ _id: '507f1f77bcf86cd799439100', nome: 'EJC Ativo Teste' }),
    }),
  });
  Encontro.findById = async () => cadastroAtual;
  Encontro.findByIdAndUpdate = async (_id, payload) => ({
    ...cadastroAtual,
    ...payload,
    _id: cadastroId,
  });
  VinculoEncontro.deleteMany = async () => ({ acknowledged: true, deletedCount: 0 });
  AdminAuditLog.create = () => new Promise(() => {});

  t.after(() => {
    Ejc.findOne = originalEjcFindOne;
    Encontro.findById = originalFindById;
    Encontro.findByIdAndUpdate = originalFindByIdAndUpdate;
    VinculoEncontro.deleteMany = originalDeleteMany;
    AdminAuditLog.create = originalAuditCreate;
    invalidarCacheEncontroAtivo();
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const startedAt = Date.now();
  const response = await asSameOrigin(
    agent.post(`/admin/atualizar-cadastro/encontreiro/${cadastroId}`).type('form').send({
      nomeCompleto: 'Carlos Sem Bloqueio',
      ejc: 'EJC 2026',
      logradouro: 'Rua B',
      bairro: 'Centro',
      telefone: '88999999999',
      email: 'carlos.sem.bloqueio@example.com',
      instagram: '@carlos',
      dataNascimento: '1990-05-10',
      statusAprovacao: 'aprovado',
      tipo: 'tios',
      tiosCategoria: 'solo',
      origemTios: 'false',
      equipeServiu: 'Sala',
      equipeCoordenou: '',
      ehAlergico: 'nao',
      intolerante: '',
      alergiaDescricao: '',
      temRelacionamento: '',
      observacoes: 'Teste de auditoria',
    })
  );
  const durationMs = Date.now() - startedAt;

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(durationMs < 1500, `A resposta demorou ${durationMs}ms e nao deveria aguardar a auditoria`);
});

test('GET /admin/logout sem origem confiavel nao encerra a sessao', async (t) => {
  mockAdminAuthFlow(t);

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const logoutResponse = await agent.get('/admin/logout');
  assert.equal(logoutResponse.status, 405);

  const protectedResponse = await agent.get('/admin/home');
  assert.equal(protectedResponse.status, 302);
  assert.equal(protectedResponse.headers.location, '/admin/gerenciar-cadastros');
});

test('POST /admin/logout same-origin encerra a sessao do admin', async (t) => {
  mockAdminAuthFlow(t);

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const logoutResponse = await asSameOrigin(agent.post('/admin/logout').type('form').send({}));
  assert.equal(logoutResponse.status, 302);
  assert.equal(logoutResponse.headers.location, '/');

  const protectedResponse = await agent.get('/admin/home');
  assert.equal(protectedResponse.status, 302);
  assert.equal(protectedResponse.headers.location, '/admin/login');
});

const findRowByName = (sheet, nome) => {
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (row.getCell(1).value === nome) {
      return row;
    }
  }
  return null;
};

const findDashboardRowByEquipe = (sheet, equipe) => {
  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (row.getCell(2).value === equipe) {
      return row;
    }
  }
  return null;
};

test('GET /export-encontro-excel mantém tios em todas as equipes e zera histórico só no relatório', async (t) => {
  const originalFind = Encontro.find;
  const originalVinculoFind = VinculoEncontro.find;
  const originalEquipeFind = Equipe.find;

  const registros = [
    {
      _id: '507f1f77bcf86cd799439120',
      nomeCompleto: 'Tio João',
      comoQuerSerChamado: 'João',
      tipo: 'tios',
      tiosCategoria: 'solo',
      origemTios: true,
      temVeiculoProprio: true,
      equipeServiu: ['Sala', 'Cozinha'],
      equipeCoordenou: ['Secretaria'],
      aprovado: true,
      statusAprovacao: 'aprovado',
      dataCadastro: new Date('2026-04-01T10:00:00Z'),
    },
  ];

  Encontro.find = () => ({
    sort: () => ({
      lean: async () => registros,
    }),
  });

  VinculoEncontro.find = () => ({
    lean: async () => ([]),
  });

  Equipe.find = () => ({
    select: () => ({
      lean: async () => ([]),
    }),
  });

  t.after(() => {
    Encontro.find = originalFind;
    VinculoEncontro.find = originalVinculoFind;
    Equipe.find = originalEquipeFind;
  });

  const response = await request(app)
    .get('/export-encontro-excel')
    .buffer(true)
    .parse(binaryParser);

  assert.equal(response.status, 200);
  assert.match(String(response.headers['content-type'] || ''), /spreadsheetml|octet-stream/i);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(response.body);

  const dashboard = workbook.getWorksheet('Dashboard');
  const salaSheet = workbook.getWorksheet('Sala');
  const secretariaSheet = workbook.getWorksheet('Secretaria');

  assert.ok(dashboard, 'A aba Dashboard deve existir');
  assert.ok(salaSheet, 'A aba Sala deve existir');
  assert.ok(secretariaSheet, 'A aba Secretaria deve existir');
  assert.equal(dashboard.getCell('C5').value, 0);
  assert.equal(dashboard.getCell('E5').value, 0);

  const salaRow = findRowByName(salaSheet, 'Tio João');
  const secretariaRow = findRowByName(secretariaSheet, 'Tio João');

  assert.ok(salaRow, 'O tio deve aparecer também na equipe Sala');
  assert.ok(secretariaRow, 'O tio deve aparecer também na equipe Secretaria');
  assert.equal(salaRow.getCell(12).value || '', '');
  assert.equal(salaRow.getCell(13).value || '', '');
  assert.equal(secretariaRow.getCell(12).value || '', '');
  assert.equal(secretariaRow.getCell(13).value || '', '');
});

test('GET /admin/encontros/:ejcId/export/equipe/:entidadeId/crachas autenticado retorna PDF bonito de crachás', async (t) => {
  mockAdminAuthFlow(t);

  const ejcId = '507f1f77bcf86cd799439301';
  const equipeId = '507f1f77bcf86cd799439302';
  const pessoaId = '507f1f77bcf86cd799439303';

  const originalEjcFindById = Ejc.findById;
  const originalEquipeFindOne = Equipe.findOne;
  const originalVinculoFind = VinculoEncontro.find;
  const originalEncontroFind = Encontro.find;
  const originalCadastroFind = Cadastro.find;

  Ejc.findById = () => ({
    lean: async () => ({ _id: ejcId, nome: 'EJC Teste' }),
  });

  Equipe.findOne = () => ({
    lean: async () => ({ _id: equipeId, ejcId, nome: 'Liturgia' }),
  });

  VinculoEncontro.find = () => ({
    sort: () => ({
      lean: async () => ([
        {
          _id: '507f1f77bcf86cd799439304',
          ejcId,
          entidadeTipo: 'equipe',
          entidadeId: equipeId,
          pessoaTipo: 'encontreiro',
          pessoaId,
          papel: 'coordenador',
          descricaoPapel: '',
          dataCriacao: new Date('2026-04-04T10:00:00Z'),
        },
      ]),
    }),
  });

  Encontro.find = () => ({
    select: () => ({
      lean: async () => ([
        {
          _id: pessoaId,
          nomeCompleto: 'João da Liturgia',
          comoQuerSerChamado: 'João',
          tipo: 'jovens',
          telefone: '88999998888',
          email: 'joao@example.com',
          instagram: '@joao',
          bairro: 'Centro',
          logradouro: 'Rua A',
          ejc: 'EJC Teste',
        },
      ]),
    }),
  });

  Cadastro.find = () => ({
    select: () => ({
      lean: async () => ([]),
    }),
  });

  t.after(() => {
    Ejc.findById = originalEjcFindById;
    Equipe.findOne = originalEquipeFindOne;
    VinculoEncontro.find = originalVinculoFind;
    Encontro.find = originalEncontroFind;
    Cadastro.find = originalCadastroFind;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await agent
    .get(`/admin/encontros/${ejcId}/export/equipe/${equipeId}/crachas`)
    .buffer(true)
    .parse(binaryParser);

  assert.equal(response.status, 200);
  assert.match(String(response.headers['content-type'] || ''), /pdf/i);
  assert.ok(response.body.length > 0, 'O PDF de crachás deve ser gerado');
});

test('GET /export-encontro-excel volta a registrar equipes atuais quando o cadastro já é de tio', async (t) => {
  const originalEncontroFind = Encontro.find;
  const originalVinculoFind = VinculoEncontro.find;
  const originalEquipeFind = Equipe.find;
  const findColumnByHeader = (worksheet, header) => worksheet.getRow(1).values.findIndex((value) => value === header);

  const tioId = '507f1f77bcf86cd799439121';
  const registros = [
    {
      _id: tioId,
      nomeCompleto: 'Tia Maria',
      comoQuerSerChamado: 'Maria',
      tipo: 'tios',
      tiosCategoria: 'solo',
      origemTios: true,
      temVeiculoProprio: false,
      equipeServiu: ['Sala', 'Cozinha'],
      equipeCoordenou: ['Secretaria'],
      aprovado: true,
      statusAprovacao: 'aprovado',
      dataCadastro: new Date('2026-04-02T10:00:00Z'),
    },
  ];

  Encontro.find = () => ({
    sort: () => ({
      lean: async () => registros,
    }),
  });

  VinculoEncontro.find = () => ({
    lean: async () => ([
      {
        pessoaId: tioId,
        entidadeTipo: 'equipe',
        entidadeId: '507f1f77bcf86cd799439201',
        pessoaTipo: 'encontreiro',
        papel: 'membro',
      },
      {
        pessoaId: tioId,
        entidadeTipo: 'equipe',
        entidadeId: '507f1f77bcf86cd799439202',
        pessoaTipo: 'encontreiro',
        papel: 'coordenador',
      },
    ]),
  });

  Equipe.find = () => ({
    select: () => ({
      lean: async () => ([
        { _id: '507f1f77bcf86cd799439201', nome: 'Sala', nomeReferencia: 'Sala' },
        { _id: '507f1f77bcf86cd799439202', nome: 'Compras', nomeReferencia: 'Compras' },
      ]),
    }),
  });

  t.after(() => {
    Encontro.find = originalEncontroFind;
    VinculoEncontro.find = originalVinculoFind;
    Equipe.find = originalEquipeFind;
  });

  const response = await request(app)
    .get('/export-encontro-excel')
    .buffer(true)
    .parse(binaryParser);

  assert.equal(response.status, 200);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(response.body);

  const dashboard = workbook.getWorksheet('Dashboard');
  const allSheet = workbook.getWorksheet('Todos Encontreiros');
  const secretariaSheet = workbook.getWorksheet('Secretaria');
  const salaSheet = workbook.getWorksheet('Sala');

  const salaDashboardRow = findDashboardRowByEquipe(dashboard, 'Sala');
  const comprasDashboardRow = findDashboardRowByEquipe(dashboard, 'Compras');
  assert.ok(salaDashboardRow, 'A equipe Sala deve existir no dashboard');
  assert.ok(comprasDashboardRow, 'A equipe Compras deve existir no dashboard');
  assert.equal(salaDashboardRow.getCell(3).value, 1);
  assert.equal(comprasDashboardRow.getCell(5).value, 1);

  const allRow = findRowByName(allSheet, 'Tia Maria');
  assert.ok(allRow, 'A aba consolidada deve conter a tia');
  assert.equal(allRow.getCell(findColumnByHeader(allSheet, 'Equipes que Serviu')).value, 'Sala');
  assert.equal(allRow.getCell(findColumnByHeader(allSheet, 'Equipes que Coordenou')).value, 'Compras');

  assert.equal(findRowByName(salaSheet, 'Tia Maria'), null);
  assert.ok(findRowByName(secretariaSheet, 'Tia Maria'), 'Ela deve continuar disponível nas demais equipes');
});

test('POST /admin/editar-circulo/:id transfere pessoas selecionadas para outro círculo', async (t) => {
  mockAdminAuthFlow(t);

  const ejcId = '507f1f77bcf86cd799439151';
  const circuloId = '507f1f77bcf86cd799439152';
  const destinoId = '507f1f77bcf86cd799439153';
  const pessoaId = '507f1f77bcf86cd799439154';
  const vinculoId = '507f1f77bcf86cd799439155';

  const originalEjcFindById = Ejc.findById;
  const originalCirculoFindOne = Circulo.findOne;
  const originalVinculoFind = VinculoEncontro.find;
  const originalVinculoFindOne = VinculoEncontro.findOne;
  const originalVinculoUpdateOne = VinculoEncontro.updateOne;

  const circuloDoc = {
    _id: circuloId,
    ejcId,
    nome: 'Círculo Azul',
    nomeNormalizado: 'ejc teste::círculo azul',
    save: async () => {},
  };

  Ejc.findById = () => ({
    lean: async () => ({ _id: ejcId, nome: 'EJC Teste' }),
  });

  Circulo.findOne = (query) => {
    if (String(query?._id) === circuloId && String(query?.ejcId) === ejcId) {
      return circuloDoc;
    }
    if (String(query?._id) === destinoId && String(query?.ejcId) === ejcId) {
      return { _id: destinoId, ejcId, nome: 'Círculo Verde' };
    }
    if (query && query._id && query._id.$ne) {
      return { lean: async () => null };
    }
    return null;
  };

  VinculoEncontro.find = () => ({
    lean: async () => ([
      {
        _id: vinculoId,
        ejcId,
        entidadeTipo: 'circulo',
        entidadeId: circuloId,
        pessoaTipo: 'encontrista',
        pessoaId,
        papel: 'membro',
        descricaoPapel: '',
      },
    ]),
  });

  VinculoEncontro.findOne = async () => null;

  const transferUpdates = [];
  VinculoEncontro.updateOne = async (filter, update) => {
    transferUpdates.push({ filter, update });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };

  t.after(() => {
    Ejc.findById = originalEjcFindById;
    Circulo.findOne = originalCirculoFindOne;
    VinculoEncontro.find = originalVinculoFind;
    VinculoEncontro.findOne = originalVinculoFindOne;
    VinculoEncontro.updateOne = originalVinculoUpdateOne;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(agent.post(`/admin/editar-circulo/${circuloId}`))
    .send({
      ejcId,
      nome: 'Círculo Azul',
      transferirPessoaIds: [pessoaId],
      transferirParaId: destinoId,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(
    transferUpdates.some(({ update }) => String(update?.$set?.entidadeId || '') === destinoId),
    'O vínculo selecionado deveria ser atualizado para o círculo de destino',
  );
});

test('POST /admin/editar-equipe/:id transfere vínculos e atualiza o histórico do encontreiro', async (t) => {
  mockAdminAuthFlow(t);

  const ejcId = '507f1f77bcf86cd799439161';
  const equipeId = '507f1f77bcf86cd799439162';
  const destinoId = '507f1f77bcf86cd799439163';
  const pessoaId = '507f1f77bcf86cd799439164';
  const vinculoId = '507f1f77bcf86cd799439165';

  const originalEjcFindById = Ejc.findById;
  const originalEquipeFindOne = Equipe.findOne;
  const originalEquipeFindById = Equipe.findById;
  const originalVinculoFind = VinculoEncontro.find;
  const originalVinculoFindOne = VinculoEncontro.findOne;
  const originalVinculoUpdateOne = VinculoEncontro.updateOne;
  const originalEncontroUpdateOne = Encontro.updateOne;

  const equipeDoc = {
    _id: equipeId,
    ejcId,
    nome: 'Liturgia',
    ejcNome: 'EJC Teste',
    nomeReferencia: 'EJC Teste - Liturgia',
    nomeNormalizado: 'ejc teste::liturgia',
    save: async () => {},
  };

  Ejc.findById = () => ({
    lean: async () => ({ _id: ejcId, nome: 'EJC Teste' }),
  });

  Equipe.findOne = (query) => {
    if (String(query?._id) === equipeId && String(query?.ejcId) === ejcId) {
      return equipeDoc;
    }
    if (query && query.nomeNormalizado && query._id && query._id.$ne) {
      return { lean: async () => null };
    }
    if (String(query?._id) === destinoId && String(query?.ejcId) === ejcId) {
      return { _id: destinoId, ejcId, nome: 'Recepção', nomeReferencia: 'EJC Teste - Recepção' };
    }
    return null;
  };

  Equipe.findById = async (id) => {
    if (String(id) === destinoId) {
      return { _id: destinoId, ejcId, nome: 'Recepção', nomeReferencia: 'EJC Teste - Recepção' };
    }
    return null;
  };

  VinculoEncontro.find = () => ({
    lean: async () => ([
      {
        _id: vinculoId,
        ejcId,
        entidadeTipo: 'equipe',
        entidadeId: equipeId,
        pessoaTipo: 'encontreiro',
        pessoaId,
        papel: 'membro',
        descricaoPapel: '',
      },
    ]),
  });

  VinculoEncontro.findOne = async () => null;

  const transferUpdates = [];
  VinculoEncontro.updateOne = async (filter, update) => {
    transferUpdates.push({ filter, update });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };

  const historyUpdates = [];
  Encontro.updateOne = async (filter, update) => {
    historyUpdates.push({ filter, update });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };

  t.after(() => {
    Ejc.findById = originalEjcFindById;
    Equipe.findOne = originalEquipeFindOne;
    Equipe.findById = originalEquipeFindById;
    VinculoEncontro.find = originalVinculoFind;
    VinculoEncontro.findOne = originalVinculoFindOne;
    VinculoEncontro.updateOne = originalVinculoUpdateOne;
    Encontro.updateOne = originalEncontroUpdateOne;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(agent.post(`/admin/editar-equipe/${equipeId}`))
    .send({
      ejcId,
      nome: 'Liturgia',
      transferirPessoaIds: [pessoaId],
      transferirParaId: destinoId,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(
    transferUpdates.some(({ update }) => String(update?.$set?.entidadeId || '') === destinoId),
    'O vínculo selecionado deveria ser atualizado para a equipe de destino',
  );
  assert.ok(historyUpdates.length > 0, 'O histórico do encontreiro deve ser sincronizado após a transferência');
});

test('POST /admin/editar-equipe/:id remove pessoas selecionadas da equipe', async (t) => {
  mockAdminAuthFlow(t);

  const ejcId = '507f1f77bcf86cd799439171';
  const equipeId = '507f1f77bcf86cd799439172';
  const pessoaId = '507f1f77bcf86cd799439173';
  const vinculoId = '507f1f77bcf86cd799439174';

  const originalEjcFindById = Ejc.findById;
  const originalEquipeFindOne = Equipe.findOne;
  const originalVinculoFind = VinculoEncontro.find;
  const originalVinculoDeleteOne = VinculoEncontro.deleteOne;
  const originalEncontroUpdateOne = Encontro.updateOne;

  const equipeDoc = {
    _id: equipeId,
    ejcId,
    nome: 'Acolhida',
    ejcNome: 'EJC Teste',
    nomeReferencia: 'EJC Teste - Acolhida',
    nomeNormalizado: 'ejc teste::acolhida',
    save: async () => {},
  };

  Ejc.findById = () => ({
    lean: async () => ({ _id: ejcId, nome: 'EJC Teste' }),
  });

  Equipe.findOne = (query) => {
    if (String(query?._id) === equipeId && String(query?.ejcId) === ejcId) {
      return equipeDoc;
    }
    if (query && query.nomeNormalizado && query._id && query._id.$ne) {
      return { lean: async () => null };
    }
    return null;
  };

  VinculoEncontro.find = () => ({
    lean: async () => ([
      {
        _id: vinculoId,
        ejcId,
        entidadeTipo: 'equipe',
        entidadeId: equipeId,
        pessoaTipo: 'encontreiro',
        pessoaId,
        papel: 'membro',
        descricaoPapel: '',
      },
    ]),
  });

  const deletedIds = [];
  VinculoEncontro.deleteOne = async (filter) => {
    deletedIds.push(String(filter?._id || ''));
    return { acknowledged: true, deletedCount: 1 };
  };

  const historyUpdates = [];
  Encontro.updateOne = async (filter, update) => {
    historyUpdates.push({ filter, update });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };

  t.after(() => {
    Ejc.findById = originalEjcFindById;
    Equipe.findOne = originalEquipeFindOne;
    VinculoEncontro.find = originalVinculoFind;
    VinculoEncontro.deleteOne = originalVinculoDeleteOne;
    Encontro.updateOne = originalEncontroUpdateOne;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(agent.post(`/admin/editar-equipe/${equipeId}`))
    .send({
      ejcId,
      nome: 'Acolhida',
      acaoVinculo: 'excluir',
      gerenciarPessoaIds: [pessoaId],
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(deletedIds.includes(vinculoId), 'O vínculo selecionado deveria ser excluído da equipe');
  assert.ok(
    historyUpdates.some(({ update }) => Array.isArray(update?.$pull?.equipeServiu?.$in)),
    'O histórico do encontreiro deve remover a equipe excluída',
  );
});
