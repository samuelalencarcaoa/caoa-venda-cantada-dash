# Documentação de Entregas

Este documento descreve as funcionalidades entregues até o momento no projeto `caoa-venda-cantada-dash`.

## Visão Geral

Projeto Next.js 15 com dashboard e fluxo de autenticação local.

### Tecnologias usadas

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- VisActor (`@visactor/react-vchart` / `@visactor/vchart`)
- Jotai
- `next/navigation`, `next/headers`

## Funcionalidades entregues

### Autenticação e fluxo de navegação

- `/` (Home)
  - Redireciona automaticamente para `/relatorios` quando o cookie `caoa-auth` está presente.
  - Caso contrário, redireciona para `/login`.

- `/login`
  - Tela de login com validação de usuário e senha.
  - Autenticação local usando `validateCredentials` em `src/lib/auth.ts`.
  - Ao autenticar com sucesso, grava o cookie `caoa-auth` e navega para `/relatorios`.
  - Usuário padrão informativo: `CAOA` / `CAOA`.

- `/register`
  - Tela de cadastro de novo usuário.
  - Validações: campos obrigatórios, senha mínima e confirmação de senha.
  - Registro local dos usuários em `localStorage`.
  - Exibe mensagem de sucesso e redireciona ao login.

- `/forgot-password`
  - Tela de recuperação de senha.
  - Geração de token de recuperação com `createPasswordResetToken`.
  - Exibe link de redefinição (`/reset-password?token=...`).

- `/reset-password`
  - Tela de redefinição de senha.
  - Usa o componente `ResetPasswordContent` com `Suspense` para tratar `useSearchParams()` corretamente.
  - Valida token de recuperação, senha mínima e confirmação de senha.
  - Atualiza senha no armazenamento local e consome o token.

### Autorização e layout

- `src/components/root-layout.tsx`
  - Exibe ou oculta a `SideNav` dependendo da rota.
  - Rotas não autenticadas: `/login`, `/register`, `/forgot-password`, `/reset-password`.

- `src/components/nav/side-nav/components/user.tsx`
  - Mostra o usuário autenticado com base no cookie `caoa-auth`.
  - Botão de logout remove o cookie e volta para `/login`.

### Backend local de usuário e tokens

- `src/lib/auth.ts`
  - Implementa a lógica de usuários com `localStorage`.
  - Usuário padrão:
    - `username`: `CAOA`
    - `passwordHash`: `CAOA`
    - `email`: `admin@caoa.com`
  - Funções entregues:
    - `findUser`
    - `validateCredentials`
    - `registerUser`
    - `createPasswordResetToken`
    - `verifyPasswordResetToken`
    - `consumePasswordResetToken`
    - `updatePassword`
    - `getAuthCookieValue`

### Relatórios e visualização de dados

- `/relatorios`
  - Dashboard de intenções de venda.
  - Filtragem por UF, Região, Loja e Vendedor.
  - Gráfico de barras usando `VChart`.
  - Total de Vendas Cantadas exibido dinamicamente com base no filtro.
  - Dados provenientes de `src/data/sales-intention.ts`.

- `/relatorios/marca`
  - Relatório por marca de veículo.
  - Filtros multi-seleção para UF, Região, Loja, Tipo de Venda, Classificação e período de data.
  - Indicadores de Total de Vendas Cantadas, aprovadas e reprovadas.
  - Gráfico de barras para as principais marcas.
  - Exportação de dados para Excel via geração de arquivo HTML com `Blob`.
  - Atualização periódica automática e indicador de último refresh.

## Componentes e UI

- `src/components/nav/TopNav.tsx`
- `src/components/nav/side-nav/index.tsx`
- `src/components/providers/chart-theme-provider.tsx`
- `src/components/theme-toggle.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/popover.tsx`

## Correções importantes realizadas

- Ajuste para usar `await cookies()` em `src/app/page.tsx` no Next.js 15.
- Correção de `pathname` possivelmente nulo em `src/components/root-layout.tsx`.
- Remoção de importação não usada `ChevronDown` em `src/components/nav/side-nav/components/user.tsx`.
- Tratamento de `result.message` opcional em `src/app/register/page.tsx`.
- Implementação de `Suspense` para `useSearchParams()` em `/reset-password`.

## Observações de uso

- Login padrão: `CAOA` / `CAOA`.
- Cadastro de novos usuários e recuperação de senha funcionam via armazenamento local do navegador.
- Relatórios usam dados mock em `src/data/sales-intention.ts`.

## Estrutura de arquivos principais

- `src/app/`
  - `page.tsx`
  - `login/page.tsx`
  - `register/page.tsx`
  - `forgot-password/page.tsx`
  - `reset-password/page.tsx`
  - `relatorios/page.tsx`
  - `relatorios/marca/page.tsx`
- `src/components/`
  - `root-layout.tsx`
  - `nav/`
  - `providers/`
  - `ui/`
  - `reset-password-content.tsx`
- `src/lib/auth.ts`
- `src/data/sales-intention.ts`

## Próximos passos sugeridos

- Adicionar validação de sessão mais robusta no lado do servidor.
- Melhorar persistência de autenticação além de cookies simples.
- Incluir carregamento e fallback para os relatórios de dados.
- Adicionar testes automatizados para autenticação e relatórios.
