# Sistema de Administração

Seu novo sistema de administrador está pronto! Aqui está como usar:

## 1️⃣ Criar um Usuário Admin

Execute este comando no terminal:

```bash
node create-admin.js
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
SESSION_SECRET=seu-codigo-secreto-muito-seguro
```

Se não especificar, um padrão será usado (não recomendado para produção).

## 📝 Notas

- Cada cadastro de "Encontro" agora tem um campo `aprovado` (boolean)
- O valor padrão é `false` (não aprovado)
- Você pode aprovar/desaprovar quantas vezes quiser

## ❓ Problemas?

Se não conseguir acessar `/admin/login`:
1. Certifique-se de que o servidor está rodando: `npm run dev`
2. Verifique se criou um admin: `node create-admin.js`
3. Verifique o console do servidor para mensagens de erro

Aproveite o novo sistema de administração! 🎉
