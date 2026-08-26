# Publicacao no IIS

O IIS termina HTTPS e encaminha todas as requisicoes para o frontend Next.js em
`http://127.0.0.1:3003`. As rotas `/api/*` do Next.js encaminham internamente para
a API Express em `http://127.0.0.1:4000`.

## Pre-requisitos do servidor

- Node.js 20 ou superior e pnpm 11
- IIS com os modulos URL Rewrite e Application Request Routing (ARR)
- `Enable proxy` habilitado em `Application Request Routing Cache > Server Proxy Settings`
- DNS e certificado de `formulariosbi.caoa.com.br`

## Preparar a aplicacao

Na raiz do projeto:

```powershell
Copy-Item .env.production.example .env.production
pnpm install --frozen-lockfile
pnpm build:production
pnpm service:install
pnpm service:status
```

Preencha antes os segredos e a conexao de banco em `.env.production`. O arquivo
real nao deve ser versionado. Teste localmente `http://127.0.0.1:3003` e
`http://127.0.0.1:4000/health`.

## Criar o site

1. Crie uma pasta fisica vazia para o site no IIS.
2. Copie `deploy/iis/web.config` para essa pasta.
3. Conceda ao grupo `IIS_IUSRS` permissao de leitura na pasta.
4. Configure os bindings HTTP/80 e HTTPS/443 com o host
   `formulariosbi.caoa.com.br`; associe o certificado no binding HTTPS.
5. No pool do site, use `.NET CLR version: No Managed Code`.
6. No ARR, habilite o proxy reverso e configure `preserveHostHeader=true` no
   nivel do servidor. Essa opcao nao fica no `web.config` do site porque a secao
   do ARR normalmente esta bloqueada para configuracao delegada.

O `web.config` redireciona HTTP para HTTPS e encaminha HTTPS para a porta 3003.
As portas 3003, 4000 e a porta do banco devem permanecer bloqueadas externamente.

## Microsoft Entra ID

Cadastre a URI de redirecionamento abaixo no registro do aplicativo:

```text
https://formulariosbi.caoa.com.br/api/auth/callback/azure-ad
```

O valor precisa coincidir com `NEXTAUTH_URL` no `.env.production`.

## Diagnostico

- `502.3 Bad Gateway`: confirme `pnpm service:status` e teste a porta 3003.
- `500.19`: instale URL Rewrite/ARR e confirme que o proxy do ARR esta habilitado.
- Loop de login: confira `NEXTAUTH_URL`, certificado, DNS e URI do Entra ID.
- Acesso local funciona, mas externo nao: confira DNS, firewall e NAT da porta 443.
