# Implementação de Autenticação Microsoft Entra ID (Azure AD)

## Objetivo

Implementar autenticação corporativa Microsoft utilizando Microsoft Entra ID (Azure Active Directory) em uma aplicação Next.js 15.

O objetivo é permitir que usuários façam login utilizando suas contas corporativas Microsoft e tenham acesso ao dashboard apenas após autenticação bem-sucedida.

---

# Contexto do Projeto

## Stack Atual

* Next.js 15
* React 19
* TypeScript
* App Router
* PNPM

## package.json

O projeto utiliza Next.js 15 com App Router e React 19.

A implementação deve seguir as boas práticas atuais do ecossistema Next.js.

---

# Requisitos Funcionais

## RF01 - Login Microsoft

Implementar autenticação utilizando Microsoft Entra ID (Azure AD).

O usuário deverá acessar uma tela de login contendo um botão:

```text
Entrar com Microsoft
```

Ao clicar no botão, deverá ser redirecionado para autenticação da Microsoft.

---

## RF02 - Sessão

Após autenticação:

* Criar sessão autenticada.
* Manter usuário logado.
* Disponibilizar dados do usuário na aplicação.

Dados mínimos:

```typescript
{
  name: string;
  email: string;
  image?: string;
}
```

---

## RF03 - Logout

Implementar logout.

Ao realizar logout:

* Encerrar sessão local.
* Redirecionar para tela de login.

---

## RF04 - Proteção de Rotas

Todas as páginas do dashboard devem exigir autenticação.

Usuários não autenticados devem ser redirecionados para:

```text
/login
```

---

## RF05 - Middleware

Implementar middleware global para proteção de rotas.

Exemplo de comportamento:

```text
/dashboard -> autenticado
/relatorios -> autenticado
/configuracoes -> autenticado
```

Páginas públicas:

```text
/login
/api/auth/*
```

---

## RF06 - Dados do Usuário

Criar mecanismo para recuperação dos dados do usuário autenticado.

Exemplo:

```typescript
const session = await auth();

console.log(session.user.name);
console.log(session.user.email);
```

---

## RF07 - Validação pelo Azure AD

Implementar callback de autenticação que valide apenas se o usuário existe e foi autenticado pelo Microsoft Entra ID configurado.

Exemplo:

```text
usuario@qualquer-dominio.com
```

Usuários fora do tenant configurado devem ser bloqueados pelo próprio provedor Microsoft.

---

# Requisitos Técnicos

## Biblioteca

Utilizar:

```bash
pnpm add next-auth
```

ou a versão mais recente compatível do Auth.js.

---

## Variáveis de Ambiente

Criar suporte para:

```env
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

---

## Estrutura Esperada

```text
src/
├── app/
│   ├── login/
│   │   └── page.tsx
│   │
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts
│
├── providers/
│   └── auth-provider.tsx
│
├── lib/
│   └── auth.ts
│
└── middleware.ts
```

---

# Implementação Esperada

## 1. Configuração do Auth.js

Criar configuração centralizada em:

```text
src/lib/auth.ts
```

Responsável por:

* Configurar Azure AD Provider.
* Configurar callbacks.
* Configurar sessão.
* Configurar JWT.

---

## 2. Session Provider

Criar provider React para disponibilizar sessão em toda a aplicação.

---

## 3. Página de Login

Criar página:

```text
/login
```

Com:

* Botão Microsoft.
* Estado de carregamento.
* Tratamento de erro.

---

## 4. Middleware

Implementar middleware para validação de sessão.

Caso não exista sessão:

```text
redirect("/login")
```

---

## 5. Hook de Usuário

Criar hook:

```typescript
useCurrentUser()
```

Retornando:

```typescript
{
  user,
  loading,
  authenticated
}
```

---

# Critérios de Aceite

## Cenário 1

Dado que o usuário não esteja autenticado

Quando acessar:

```text
/dashboard
```

Então deverá ser redirecionado para:

```text
/login
```

---

## Cenário 2

Dado que o usuário possua conta Microsoft corporativa

Quando realizar login

Então deverá acessar normalmente o dashboard.

---

## Cenário 3

Dado que o usuário possua e-mail em outro domínio, mas exista no tenant configurado

Quando tentar autenticar

Então o acesso deverá ser permitido se a conta existir no tenant do Azure AD.

---

## Cenário 4

Dado que o usuário esteja autenticado

Quando acessar qualquer rota protegida

Então a navegação deverá ocorrer normalmente.

---

# Entregáveis Esperados

A implementação deverá entregar:

* Configuração completa do Auth.js.
* Integração Microsoft Entra ID.
* Middleware de autenticação.
* Página de login.
* Logout.
* Session Provider.
* Hook de usuário.
* Variáveis de ambiente documentadas.
* Código TypeScript tipado.
* Comentários explicativos nos pontos críticos.
* Compatibilidade com Next.js 15 App Router.

---

# Resultado Final Esperado

A aplicação deverá permitir login corporativo Microsoft utilizando Microsoft Entra ID, mantendo sessão autenticada, protegendo rotas privadas e restringindo acesso apenas a usuários autenticados no tenant do Azure AD configurado.
