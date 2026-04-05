# Correção: Sessão admin perdida após login

**Data:** 04/04/2026

## Problema

Após fazer login no painel admin, ao acessar qualquer página protegida pelo middleware `checkAdminAuth`, a variável `req.session.adminId` aparecia como `undefined`, redirecionando de volta para o login.

## Causa raiz

Duas causas combinadas:

### 1. Cookie `Secure` em conexão HTTP

Em `config/session.js`, o cookie de sessão era configurado com:

```js
cookie: {
  secure: IS_PRODUCTION, // true quando NODE_ENV=production
}
```

Com `NODE_ENV=production`, o cookie era marcado como `Secure`. Browsers **descartam** cookies `Secure` em conexões HTTP (ex: `http://localhost:3000`). Resultado: o login gravava a sessão, mas o browser não enviava o cookie de volta nas requisições seguintes — a sessão aparecia vazia.

### 2. Race condition no redirect pós-login

Em `routes/admin/auth.js`, após definir os dados da sessão, o redirect era feito imediatamente:

```js
req.session.adminId = sessionData._id;
res.redirect('/admin/gerenciar-cadastros');
```

Com o MongoStore, a gravação da sessão é assíncrona. O browser podia seguir o redirect **antes** da sessão ser salva no MongoDB, resultando em sessão vazia na página de destino.

## Correções aplicadas

### `config/session.js` — Cookie secure automático

```diff
  cookie: {
-   secure: IS_PRODUCTION,
+   secure: IS_PRODUCTION ? 'auto' : false,
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
```

O valor `'auto'` faz o Express detectar automaticamente se a requisição veio via HTTPS. Em HTTPS marca como `Secure`; em HTTP deixa o cookie funcionar normalmente.

### `routes/admin/auth.js` — Aguardar gravação da sessão

```diff
  req.session.adminId = sessionData._id;
  req.session.adminUsername = sessionData.username;
  req.session.adminNivelAcesso = sessionData.nivelAcesso;
  req.session.adminPermissoes = sessionData.permissoes;
- res.redirect('/admin/gerenciar-cadastros');
+ req.session.save((err) => {
+   if (err) console.error('Erro ao salvar sessão:', err);
+   res.redirect('/admin/gerenciar-cadastros');
+ });
```

O `req.session.save()` garante que a sessão está gravada no MongoStore antes de enviar o redirect ao browser.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `config/session.js` | `cookie.secure` de `IS_PRODUCTION` para `IS_PRODUCTION ? 'auto' : false` |
| `routes/admin/auth.js` | Adicionado `req.session.save()` antes do redirect pós-login |
