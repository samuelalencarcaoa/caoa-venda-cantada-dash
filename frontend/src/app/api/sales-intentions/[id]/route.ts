import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../../_lib/backendProxy';

function getIdFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function GET(request: NextRequest) {
  const id = getIdFromPathname(request.nextUrl.pathname);
  if (!id) {
    return new Response(JSON.stringify({ message: 'ID inválido.' }), { status: 400 });
  }

  return proxyBackendRequest(request, `/sales-intentions/${id}${request.nextUrl.search}`, {
    notFound: 'Não foi possível localizar o registro de intenção no momento.',
    responseError: 'Não foi possível carregar a intenção no momento.',
    unavailable: 'Não conseguimos acessar o serviço de intenção no momento.'
  });
}

export async function PUT(request: NextRequest) {
  const id = getIdFromPathname(request.nextUrl.pathname);
  if (!id) {
    return new Response(JSON.stringify({ message: 'ID inválido.' }), { status: 400 });
  }

  return proxyBackendRequest(request, `/sales-intentions/${id}${request.nextUrl.search}`, {
    notFound: 'Não foi possível localizar o registro para atualização no momento.',
    responseError: 'Não foi possível atualizar a intenção no momento.',
    unavailable: 'Não conseguimos acessar o serviço de atualização no momento.'
  });
}

export async function DELETE(request: NextRequest) {
  const id = getIdFromPathname(request.nextUrl.pathname);
  if (!id) {
    return new Response(JSON.stringify({ message: 'ID inválido.' }), { status: 400 });
  }

  return proxyBackendRequest(request, `/sales-intentions/${id}${request.nextUrl.search}`, {
    notFound: 'Não foi possível localizar o registro para exclusão no momento.',
    responseError: 'Não foi possível excluir a intenção no momento.',
    unavailable: 'Não conseguimos acessar o serviço de exclusão no momento.'
  });
}
