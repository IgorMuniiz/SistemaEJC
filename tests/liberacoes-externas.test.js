const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.SKIP_MONGO_CONNECT = '1';

const { app } = require('../app');

const Admin = mongoose.model('Admin');
const ExternalLiberacao = mongoose.model('ExternalLiberacao');
const ExternalLiberacaoLink = mongoose.model('ExternalLiberacaoLink');
const ExternalLiberacaoHistory = mongoose.model('ExternalLiberacaoHistory');
const AdminAuditLog = mongoose.model('AdminAuditLog');

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

const loginAsAdmin = async (agent) => {
  const response = await agent
    .post('/admin/login')
    .send({ username: 'admin_teste', senha: 'senha123' });

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/admin/gerenciar-cadastros');
};

const asSameOrigin = (req) => req
  .set('Host', 'localhost')
  .set('Origin', 'http://localhost')
  .set('Referer', 'http://localhost/admin/liberacoes-externas')
  .set('Accept', 'application/json');

const mockLinkFindOneLean = (doc) => () => ({
  lean: async () => doc,
});

test('GET /liberacoes-externas/inscricao sem token exibe acesso indisponivel', async (t) => {
  const originalFindOne = ExternalLiberacaoLink.findOne;
  ExternalLiberacaoLink.findOne = mockLinkFindOneLean(null);

  t.after(() => {
    ExternalLiberacaoLink.findOne = originalFindOne;
  });

  const response = await request(app).get('/liberacoes-externas/inscricao');

  assert.equal(response.status, 200);
  assert.match(response.text, /Acesso indisponivel/i);
});

test('POST /liberacoes-externas/inscricao com token valido cria registro e historico', async (t) => {
  const originalLinkFindOne = ExternalLiberacaoLink.findOne;
  const originalCreate = ExternalLiberacao.create;
  const originalHistoryCreate = ExternalLiberacaoHistory.create;

  let savedPayload = null;
  let historyPayload = null;

  ExternalLiberacaoLink.findOne = mockLinkFindOneLean({
    _id: '507f1f77bcf86cd799439041',
    token: 'token-ok',
    ativo: true,
    tokenExp: null,
  });

  ExternalLiberacao.create = async (payload) => {
    savedPayload = payload;
    return {
      _id: '507f1f77bcf86cd799439042',
      ...payload,
      toObject() {
        return { _id: this._id, ...payload };
      },
    };
  };

  ExternalLiberacaoHistory.create = async (payload) => {
    historyPayload = payload;
    return { _id: '507f1f77bcf86cd799439043', ...payload };
  };

  t.after(() => {
    ExternalLiberacaoLink.findOne = originalLinkFindOne;
    ExternalLiberacao.create = originalCreate;
    ExternalLiberacaoHistory.create = originalHistoryCreate;
  });

  const response = await request(app)
    .post('/liberacoes-externas/inscricao?token=token-ok')
    .type('form')
    .send({
      token: 'token-ok',
      nomeCompleto: 'Pessoa Externa',
      dataNascimento: '2000-02-10',
      telefone: '(85) 99999-0000',
      email: 'pessoa.externa@example.com',
      genero: 'feminino',
      enderecoRua: 'Rua A',
      enderecoNumero: '123',
      enderecoBairro: 'Centro',
      enderecoCidade: 'Fortaleza',
      domMusicalPossui: 'true',
      domMusicalDescricao: 'Violao',
      participaParoquia: 'true',
      pastorais: ['EJC', 'Outro'],
      pastoralOutroDescricao: 'Pastoral Jovem',
      ejcCopHistorico: 'XVII EJC COP',
      serveEjcAnoAtual: 'true',
      equipeAtual: ['Secretaria'],
      serveOutroEjcAnoAtual: 'false',
      estadoCivil: 'Solteiro',
    });

  assert.equal(response.status, 200);
  assert.match(response.text, /Inscricao enviada/i);
  assert.equal(savedPayload.nomeCompleto, 'Pessoa Externa');
  assert.equal(savedPayload.perfilStatus, 'perfil_apto');
  assert.ok(Array.isArray(savedPayload.perfilRazoes));
  assert.equal(savedPayload.perfilRazoes.length, 0);
  assert.equal(historyPayload.acao, 'create');
  assert.equal(historyPayload.alteradoPorTipo, 'publico');
});

test('POST /liberacoes-externas/inscricao classifica como em analise para idade entre 30 e 35', async (t) => {
  const originalLinkFindOne = ExternalLiberacaoLink.findOne;
  const originalCreate = ExternalLiberacao.create;
  const originalHistoryCreate = ExternalLiberacaoHistory.create;

  let savedPayload = null;

  ExternalLiberacaoLink.findOne = mockLinkFindOneLean({
    _id: '507f1f77bcf86cd799439051',
    token: 'token-analise',
    ativo: true,
    tokenExp: null,
  });

  ExternalLiberacao.create = async (payload) => {
    savedPayload = payload;
    return {
      _id: '507f1f77bcf86cd799439052',
      ...payload,
      toObject() {
        return { _id: this._id, ...payload };
      },
    };
  };

  ExternalLiberacaoHistory.create = async (payload) => ({ _id: '507f1f77bcf86cd799439053', ...payload });

  t.after(() => {
    ExternalLiberacaoLink.findOne = originalLinkFindOne;
    ExternalLiberacao.create = originalCreate;
    ExternalLiberacaoHistory.create = originalHistoryCreate;
  });

  const response = await request(app)
    .post('/liberacoes-externas/inscricao?token=token-analise')
    .type('form')
    .send({
      token: 'token-analise',
      nomeCompleto: 'Pessoa Em Analise',
      dataNascimento: '1994-02-10',
      telefone: '(85) 98888-1111',
      email: 'pessoa.analise@example.com',
      genero: 'feminino',
      enderecoRua: 'Rua C',
      enderecoNumero: '88',
      enderecoBairro: 'Centro',
      enderecoCidade: 'Fortaleza',
      domMusicalPossui: 'false',
      participaParoquia: 'false',
      ejcCopHistorico: 'XVIII EJC COP',
      serveEjcAnoAtual: 'true',
      equipeAtual: ['Sala'],
      serveOutroEjcAnoAtual: 'false',
      estadoCivil: 'Solteiro',
    });

  assert.equal(response.status, 200);
  assert.equal(savedPayload.perfilStatus, 'em_analise');
  assert.ok(Array.isArray(savedPayload.perfilRazoes));
  assert.equal(savedPayload.perfilRazoes.length, 0);
});

test('POST /admin/liberacoes-externas/gerar-link autenticado retorna token', async (t) => {
  mockAdminAuthFlow(t);

  const originalUpdateMany = ExternalLiberacaoLink.updateMany;
  const originalCreate = ExternalLiberacaoLink.create;
  const originalAuditCreate = AdminAuditLog.create;

  let createPayload = null;

  ExternalLiberacaoLink.updateMany = async () => ({ modifiedCount: 1 });
  ExternalLiberacaoLink.create = async (payload) => {
    createPayload = payload;
    return {
      _id: '507f1f77bcf86cd799439044',
      ...payload,
    };
  };
  AdminAuditLog.create = async () => ({ _id: '507f1f77bcf86cd799439045' });

  t.after(() => {
    ExternalLiberacaoLink.updateMany = originalUpdateMany;
    ExternalLiberacaoLink.create = originalCreate;
    AdminAuditLog.create = originalAuditCreate;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent
      .post('/admin/liberacoes-externas/gerar-link')
      .send({ expDias: 7 })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(typeof response.body.token === 'string' && response.body.token.length > 10);
  assert.equal(createPayload.criadoPorAdminUsername, 'admin_teste');
});

test('GET /admin/liberacoes-externas/export/excel autenticado retorna arquivo xlsx', async (t) => {
  mockAdminAuthFlow(t);

  const originalFind = ExternalLiberacao.find;
  const originalLinkFindOne = ExternalLiberacaoLink.findOne;
  const originalAuditCreate = AdminAuditLog.create;

  ExternalLiberacao.find = () => ({
    sort: () => ({
      lean: async () => ([
        {
          _id: '507f1f77bcf86cd799439046',
          nomeCompleto: 'Pessoa Apta',
          idadeCalculada: 28,
          dataNascimento: new Date('1998-05-10'),
          telefone: '(85) 98888-0000',
          email: 'pessoa.apta@example.com',
          genero: 'feminino',
          estadoCivil: 'Solteiro',
          enderecoRua: 'Rua B',
          enderecoNumero: '10',
          enderecoBairro: 'Centro',
          enderecoCidade: 'Fortaleza',
          domMusicalPossui: true,
          domMusicalDescricao: 'Canto',
          participaParoquia: true,
          pastorais: ['EJC'],
          pastoralOutroDescricao: '',
          ejcCopHistorico: 'XVIII EJC COP',
          serveEjcAnoAtual: true,
          equipeAtual: ['Secretaria'],
          serveOutroEjcAnoAtual: false,
          outrosEjcsDescricao: '',
          perfilStatus: 'perfil_apto',
          perfilRazoes: [],
          dataCadastro: new Date('2026-05-30T12:00:00Z'),
        },
      ]),
    }),
  });

  ExternalLiberacaoLink.findOne = () => ({
    sort: () => ({
      lean: async () => null,
    }),
  });

  AdminAuditLog.create = async () => ({ _id: '507f1f77bcf86cd799439047' });

  t.after(() => {
    ExternalLiberacao.find = originalFind;
    ExternalLiberacaoLink.findOne = originalLinkFindOne;
    AdminAuditLog.create = originalAuditCreate;
  });

  const agent = request.agent(app);
  await loginAsAdmin(agent);

  const response = await asSameOrigin(
    agent.get('/admin/liberacoes-externas/export/excel').buffer(true)
  );

  assert.equal(response.status, 200);
  assert.match(String(response.headers['content-type'] || ''), /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i);
  assert.match(String(response.headers['content-disposition'] || ''), /liberacoes-externas/i);
});
