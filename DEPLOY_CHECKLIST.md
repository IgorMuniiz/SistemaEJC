# Checklist de Publicacao

## 1. Ambiente

1. Copie [.env.production.example](.env.production.example) para .env.
2. Defina NODE_ENV=production.
3. Defina SESSION_SECRET com pelo menos 24 caracteres.
4. Defina MONGODB_URI para o banco principal.
5. Defina SESSION_STORE_MONGO_URI se quiser separar a persistencia de sessao do banco principal.
6. Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY em producao (recomendado; se ausentes o app sobe em modo degradado).
7. Se houver proxy reverso, ajuste TRUST_PROXY. Em producao o default ja e 1.
8. Mantenha SESSION_COOKIE_SECURE=auto, ou force true se todo o trafego for HTTPS.
9. Configure o health check da plataforma em `/healthz`; use `/readyz` apenas para validar Mongo conectado.

## 2. Instalacao

1. Rode npm ci.
2. Rode npm run check.
3. Crie o primeiro admin com npm run admin:create.

## 3. Validacao

1. Inicie a aplicacao com npm start.
2. Verifique GET /healthz retornando 200.
3. Verifique GET /readyz retornando 200 com Mongo conectado.
4. Acesse /admin/login.
5. Faça login com o admin criado e confirme acesso ao painel.
6. Faça logout e confirme que a sessao foi encerrada.

## 4. Pos-deploy

1. Revise o nivel do primeiro admin criado.
2. Confirme que as permissoes dos admins estao corretas.
3. Verifique logs de startup para erros de sessao, Mongo e VAPID.
4. Se a aplicacao estiver atras de proxy, confirme que o login admin continua persistindo apos redirect.

## 5. Deploy alternativo por container

1. O projeto inclui [Dockerfile](Dockerfile), [.dockerignore](.dockerignore) e [render.yaml](render.yaml).
2. Para subir localmente com container, rode `docker build -t ejc-sistema .` e depois `docker run --env-file .env -p 3000:3000 ejc-sistema`.
3. Em plataformas compatíveis com Docker, configure as variáveis do bloco Ambiente e use `/healthz` como health check.
4. Em Render, o arquivo [render.yaml](render.yaml) já aponta para deploy web com health check em `/healthz`.
5. Se usar outra plataforma, mantenha `HOST=0.0.0.0`, `NODE_ENV=production` e `PORT` fornecida pelo ambiente.