
##  TESTE UPDATE REPOS 13/07-11:34##

# CAOA Venda Cantada Dash

Sistema web para cadastro e acompanhamento de intenções de venda, com frontend em Next.js e backend em Express + Prisma.

## Visão geral

- Frontend em Next.js 15
- Backend em Express + TypeScript
- Banco de dados PostgreSQL com Prisma
- Autenticação com NextAuth
- Catálogos do formulário carregados via API
- Suporte a Docker para subir a aplicação completa

## Estrutura

- `frontend/` - aplicação web
- `backend/` - API, Prisma, migrations e seed
- `frontend/Dockerfile.web` - build do frontend
- `backend/Dockerfile` - build do backend
- `docker-compose.yml` - ambiente de desenvolvimento com frontend, backend e banco
- `docker-compose.prod.yml` - ambiente de produção com Nginx, frontend, backend e banco

## Principais recursos

- Formulário de intenção de venda
- Carregamento dinâmico de catálogos via banco de dados
- Campos dependentes no formulário, como ano e modelo
- Persistência das intenções no banco
- API documentada com Swagger
- Perfis e autenticação em evolução no projeto

## Requisitos

- Node.js 20+
- pnpm 11+
- PostgreSQL 15+

## Variáveis de ambiente

### Frontend

O frontend usa a API do backend via `/api/*`.

### Backend

Crie `backend/.env` com base no exemplo do projeto:

```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://app:change_me@localhost:5432/salesdb?schema=public"
PORT=4000
```

Na produção, prefira definir `DATABASE_PROVIDER` e `DATABASE_URL` explicitamente no `.env.production`.
O provider aceita: `postgresql`, `mysql`, `sqlserver`, `sqlite` e `cockroachdb`.

Importante: no Prisma, o `provider` do schema precisa continuar alinhado com o banco alvo do deploy e as migrations precisam ser recriadas para o novo dialeto. Ou seja, o app fica agnóstico na configuração e na camada de acesso, mas a troca entre dialetos ainda exige regenerar o client e revisar as migrations.

## Como rodar localmente

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Rodar o backend

Em outro terminal:

```bash
pnpm dev:backend
```

O backend sobe em `http://localhost:4000`.

### 3. Rodar o frontend

```bash
pnpm dev
```

O frontend sobe em `http://localhost:3003`.

## Banco de dados

### Prisma Studio

```bash
pnpm db:studio
```

### Seed

Para popular o banco com os dados iniciais:

```bash
pnpm db:seed
```

O seed recria os dados da intenção de venda e os catálogos do formulário.

## Documentação do projeto

Arquivos de documentação adicionais foram movidos para a pasta `docs/`.

- `docs/AUTH_IMPLEMENTATION.md`
- `docs/AZURE_AD_SETUP.md`
- `docs/CONFIGURACOES-MAQUINA-E-SOFTWARES.md`
- `docs/DOCUMENTACAO_ENTREGAS.md`
- `docs/LOGIN-MICROSOFT.md`

## Docker

Para subir tudo com Docker:

```bash
pnpm docker:up
```

Serviços expostos:

- Frontend: `http://localhost:3003`
- Backend: `http://localhost:4000`
- Postgres: `localhost:5432`

Para parar:

```bash
pnpm docker:down
```

## Produção em VM

Para subir em uma VM com link público:

1. Copie [`.env.production.example`](./.env.production.example) para `.env.production` e preencha os valores reais.
2. Providencie um certificado válido e a respectiva chave em `deploy/certs/fullchain.pem` e `deploy/certs/privkey.pem`. Veja [`deploy/certs/README.md`](./deploy/certs/README.md). Para o IP privado atual, o certificado deve ser emitido pela CA interna; o recomendado é usar um nome DNS interno.
3. Configure `NEXTAUTH_URL` com a URL HTTPS final, por exemplo `https://vendas.caoa.intra`.
4. Na VM, rode:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

5. Acesse o sistema pelo `https://NOME_OU_IP_DA_VM`. A porta 80 redireciona automaticamente para HTTPS.
6. Se precisar popular os dados iniciais, rode:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend pnpm db:seed
```

O arquivo de produção já inclui:

- Postgres com volume persistente
- Backend com migrations automáticas no boot
- Frontend apontando para o backend interno
- Nginx exposto nas portas `80` e `443`, com redirecionamento obrigatório para HTTPS
- TLS 1.2/1.3 e cabeçalhos de segurança no ponto de entrada
- `DATABASE_URL` configurável para banco interno ou banco gerenciado

O certificado e sua chave privada ficam fora do Git em `deploy/certs/`.

## Scripts úteis

### Frontend

- `pnpm dev`
- `pnpm dev:web`
- `pnpm build`
- `pnpm start`
- `pnpm lint`

### Backend

- `pnpm dev:backend`
- `pnpm build:backend`
- `pnpm db:seed`
- `pnpm db:studio`

## API

### Endpoints principais

- `GET /health`
- `GET /sales-intentions` - lista o mês corrente e aceita filtros via querystring
- `GET /sales-intentions/search` - busca registros por querystring
- `GET /sales-intentions/:id`
- `POST /sales-intentions`
- `PUT /sales-intentions/:id`
- `DELETE /sales-intentions/:id`
- `GET /sales-intention-catalogs` - fontes segregadas para o formulário

Exemplo de busca:

```bash
GET /sales-intentions/search?proprietario=hermano&tipoVenda=NOVOS&startDate=2025-06-01&endDate=2025-06-30
```

### Swagger

Depois de subir o backend:

- `http://localhost:4000/docs`
- `http://localhost:4000/openapi.json`

## Observações

- O frontend roda por padrão na porta `3003`.
- Se aparecer erro de build no Next.js, rode `pnpm build` antes de usar `pnpm start`.
- Se algum campo do formulário não carregar, verifique primeiro se o backend está ativo e se os dados do seed foram aplicados.

## Produção nativa (sem Docker)

Para executar os dois serviços diretamente pelo Node.js, inclusive durante o desenvolvimento em configuração de produção:

1. Copie `.env.production.example` para `.env.production` e configure o banco, `NEXTAUTH_URL` e as credenciais de autenticação. Para PostgreSQL na própria máquina, ajuste `DATABASE_URL` para `localhost`.
2. Confirme que o PostgreSQL está em execução e que o banco existe.
3. Execute:

```bash
pnpm start
```

O comando carrega `.env.production`, compila backend e frontend, aplica as migrations e sobe a API (`4000`) antes do frontend (`3003`). Use `Ctrl+C` para encerrar ambos.

Quando alterar `backend/prisma/schema.prisma`, gere manualmente o client antes do prÃ³ximo build:

```bash
pnpm --dir backend prisma:generate
```

Essa inicialização nativa atende HTTP em `http://localhost:3003`. Para HTTPS com certificado confiável, mantenha o Nginx configurado no deploy de produção à frente dela e acesse o nome DNS/IP com certificado válido.

### HTTPS e Azure AD

Para executar nativamente com HTTPS nos dois serviços, defina em `.env.production`:

```bash
TLS_ENABLED=true
TLS_CERT_PATH=../deploy/certs/fullchain.pem
TLS_KEY_PATH=../deploy/certs/privkey.pem
NEXTAUTH_URL=https://SEU_HOST:3003
API_BASE_URL=https://SEU_HOST:4000
```

O certificado deve ser válido para `SEU_HOST` e confiável no navegador. Para o IP privado `10.200.2.25`, use certificado da CA interna com esse IP no SAN; o recomendado é utilizar um nome DNS interno.

No Microsoft Entra ID, cadastre exatamente esta URI de redirecionamento no registro do aplicativo:

```text
https://SEU_HOST:3003/api/auth/callback/azure-ad
```

Depois execute `pnpm start` e acesse a mesma URL configurada em `NEXTAUTH_URL`. Sem um certificado confiável e sem essa URI no Entra ID, o login Microsoft será recusado.

## Licença

Este projeto está sob a licença MIT.
