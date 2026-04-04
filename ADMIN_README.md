# Sistema de Administração

Seu novo sistema de administrador está pronto! Aqui está como usar:

## 1️⃣ Criar um Usuário Admin

Execute este comando no terminal:

```bash
npm run admin:create
```

O script irá solicitar:
- **Nome de usuário**: escolha um nome (ex: "admin")
- **Senha**: crie uma senha segura
- **Confirmar senha**: repita a mesma senha

Exemplo:
```
Digite o nome de usuário: admin
Digite a senha: 123456
Confirme a senha: 123456
```

## 2️⃣ Acessar o Painel Admin

Após criar o usuário:

1. Vá para: `http://localhost:3000/admin/login`
2. Faça login com suas credenciais
3. Você será redirecionado para o painel de administração

## 3️⃣ Funcionalidades do Painel Admin

### 📋 Dashboard
- **Estatísticas**: Veja quantos cadastros estão pendentes e aprovados
- **Duas abas**:
  - ⏳ **Pendentes**: Cadastros aguardando aprovação
  - ✅ **Aprovados**: Cadastros que foram liberados

### ✅ Aprovar Cadastros
Clique no botão **"Aprovar"** para liberar uma inscrição. O cadastro:
- Será movido para a aba de aprovados
- Aparecerá nas exportações (PDF e Excel)
- Receberá o status `aprovado: true`

### ❌ Desaprovar Cadastros
Clique no botão **"Desaprovar"** em um cadastro aprovado para removê-lo da lista de aprovados.

### 🚪 Sair (Logout)
Clique no botão **"Sair"** no canto superior direito para fazer logout. Você será redirecionado para a página inicial.

## 4️⃣ Filtros nas Exportações

### PDF Export
- Só mostra cadastros onde `aprovado === true`

### Excel Export  
- Só mostra cadastros onde `aprovado === true`
- Vínculo automático de tios pelo `tiosGrupoId`

## 5️⃣ Fluxo de Inscrição

1. Pessoa acessa `/inscricao` ou `/encontro` e preenche o formulário
2. Enviam a inscrição
3. Formulário desaparece (sucesso)
4. **Admin revisa no painel de administração**
5. Admin clica em "Aprovar" 
6. Inscrição aparece nas exportações

## 🔐 Segurança

- Senhas são criptografadas com bcryptjs
- Sessões duram 24 horas
- Rotas de admin são protegidas por middleware

## ⚙️ Variáveis de Ambiente

Adicione ao seu `.env`:
```
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/ECJCOP
SESSION_SECRET=seu-codigo-secreto-muito-seguro
SESSION_STORE_MONGO_URI=mongodb://127.0.0.1:27017/ECJCOP
SESSION_COOKIE_SECURE=auto
TRUST_PROXY=1
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Use [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md), [.env.example](.env.example) e [.env.production.example](.env.production.example) como base antes de publicar.

## 📝 Notas

- Cada cadastro de "Encontro" agora tem um campo `aprovado` (boolean)
- O valor padrão é `false` (não aprovado)
- Você pode aprovar/desaprovar quantas vezes quiser

## 🚀 Operação Profissional (Novo)

### Onboarding rápido do operador

1. Acesse o painel em `/admin/gerenciar-cadastros`.
2. Use os atalhos para navegar sem perder tempo:
  - `Alt+1..7`: troca direta de abas
  - `Alt+D`: abre o dashboard executivo
  - `Alt+S`: tenta salvar o formulário ativo
3. Revise o bloco de auditoria ao final da aba de admins para verificar ações recentes.

### Métricas recomendadas de acompanhamento

- Tempo médio de aprovação (cadastro -> decisão)
- Taxa de pendência por equipe e por encontro
- Volume diário de aprovações/reprovações
- Erros operacionais por tipo (edição, exclusão, bloqueio, encontro)

### Checklist de produção

1. Definir `SESSION_SECRET` forte no ambiente.
2. Definir `MONGODB_URI` e, se necessário, `SESSION_STORE_MONGO_URI`.
3. Manter `SESSION_COOKIE_SECURE=auto` ou forçar `true` em HTTPS obrigatório.
4. Ajustar `TRUST_PROXY` se a aplicação rodar atrás de proxy reverso.
5. Criar o primeiro admin com `npm run admin:create`.
6. Revisar permissões de cada perfil administrativo (`super_admin`, `coordenador`, `operador`, `consulta`).
7. Monitorar bloqueios por excesso de tentativas de login/rate limit.
8. Garantir execução da pipeline CI em cada PR antes de merge.

## ✅ Deploy Ready v1

O sistema agora inclui camadas adicionais de prontidão para produção:

1. **Store de sessão persistente** via Mongo (`connect-mongo`) com fallback seguro.
2. **Proteção CSRF compatível** em rotas administrativas (`POST/PUT/PATCH/DELETE`).
3. **Healthcheck e readiness**:
  - `GET /healthz`
  - `GET /readyz`
4. **Graceful shutdown** em `SIGTERM` e `SIGINT`.
5. **Validação de ambiente em produção** (falha de startup se config crítica estiver inválida).
6. **Teste automatizado básico** para endpoints de saúde.

### Variáveis novas/relevantes

Use como base o arquivo `.env.example`.

- `SESSION_STORE_MONGO_URI`: URI do Mongo para persistência de sessão.
- `SESSION_COOKIE_SECURE`: `auto` por padrão; aceita `true` ou `false`.
- `TRUST_PROXY`: importante em deploy atrás de proxy reverso.
- `SKIP_MONGO_CONNECT=1`: útil apenas para testes locais/CI sem banco.

## ❓ Problemas?

Se não conseguir acessar `/admin/login`:
1. Certifique-se de que o servidor está rodando: `npm run dev`
2. Verifique se criou um admin: `npm run admin:create`
3. Verifique o arquivo `.env` e confirme `SESSION_SECRET`, `MONGODB_URI` e `VAPID_*`
4. Verifique o console do servidor para mensagens de erro

Aproveite o novo sistema de administração! 🎉
