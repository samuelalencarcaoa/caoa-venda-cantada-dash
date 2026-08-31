# Guia de Configuração do Azure AD

Para configurar a autenticação Microsoft Entra ID (Azure AD), siga os passos abaixo:

## 1. Criar Registro de Aplicativo no Azure

1. Acesse [Portal do Azure](https://portal.azure.com)
2. Navegue até **Azure Active Directory** → **Registros de aplicativo** → **+ Novo registro**
3. Preencha os campos:
   - **Nome**: "CAOA Venda Cantada Dash"
   - **Tipos de conta com suporte**: "Contas apenas neste diretório organizacional"
   - **URI de Redirecionamento**: Web → `http://localhost:3003/api/auth/callback/azure-ad`
4. Clique em **Registrar**

## 2. Obter Credenciais

### ID do Aplicativo (Client ID)
- Na página **Visão Geral**, copie o **ID do Aplicativo (cliente)**
- Cole em `.env.local` como `AZURE_AD_CLIENT_ID`

### ID do Diretório (Tenant ID)
- Na página **Visão Geral**, copie o **ID do diretório (locatário)**
- Cole em `.env.local` como `AZURE_AD_TENANT_ID`
- **Importante**: Use o UUID completo, NÃO use "v2.0" ou "common"

### Segredo do Cliente (Client Secret)
1. Vá para **Certificados e Segredos** → **Segredos do cliente** → **+ Novo segredo do cliente**
2. Defina a expiração (ex: 24 meses)
3. Clique em **Adicionar**
4. **Copie o VALOR** (não o ID do segredo)
5. Cole em `.env.local` como `AZURE_AD_CLIENT_SECRET`

## 3. Configurar Permissões de API

1. Vá para **Permissões de API** → **+ Adicionar uma permissão**
2. Selecione **Microsoft Graph**
3. Selecione **Permissões delegadas**
4. Procure e adicione:
   - `User.Read`
   - `openid`
   - `profile`
   - `email`
5. Clique em **Adicionar permissões**
6. Se aparecer "Conceder consentimento do administrador", clique em **Conceder consentimento do administrador para...**

## 4. Configurar URIs de Redirecionamento

Adicione os URIs de redirecionamento para desenvolvimento e produção:

1. Vá para **Autenticação**
2. Em **URIs de redirecionamento**, adicione:
   - `http://localhost:3003/api/auth/callback/azure-ad` (desenvolvimento)
   - `https://seudominio.com/api/auth/callback/azure-ad` (produção)
3. Clique em **Salvar**

## 5. Atualizar Variáveis de Ambiente

Atualize `.env.local`:

```env
NEXTAUTH_SECRET=<gerar-com: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3003
AZURE_AD_CLIENT_ID=<seu-client-id>
AZURE_AD_CLIENT_SECRET=<seu-client-secret>
AZURE_AD_TENANT_ID=<seu-tenant-id>
```

## 6. Gerar NEXTAUTH_SECRET

Execute no terminal:
```bash
openssl rand -base64 32
```

Copie o resultado e cole em `.env.local` como `NEXTAUTH_SECRET`

## 7. Reiniciar Servidor de Desenvolvimento

```bash
pnpm run dev
```

Acesse `http://localhost:3003` e clique em "Entrar com Microsoft" para testar.

## Validação de Acesso

O login é validado pelo Microsoft Entra ID usando o tenant configurado em `AZURE_AD_TENANT_ID`.
Qualquer usuário existente nesse tenant pode autenticar, independentemente do domínio do e-mail.

## Solução de Problemas

### Erro: "Tenant 'v2.0' não encontrado"
- Certifique-se de que `AZURE_AD_TENANT_ID` está definido com seu ID real (formato UUID)
- Não use "v2.0" ou "common"

### Aviso "NEXTAUTH_URL"
- Este é apenas um aviso; funciona com padrões, mas é melhor defini-lo explicitamente

### Aviso "NO_SECRET"
- Gere e defina `NEXTAUTH_SECRET` em `.env.local`

### Falha na conexão OAuth
- Verifique se todas as três credenciais estão corretas (client ID, secret, tenant ID)
- Confirme se o URI de redirecionamento está registrado no Azure
- Certifique-se de que o firewall/rede permite o redirecionamento
