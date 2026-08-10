import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../_lib/backendProxy';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, `/sales-intentions${request.nextUrl.search}`, {
    notFound: 'Não foi possível localizar os registros de intenção no momento.',
    responseError: 'Não foi possível carregar os registros de intenção no momento.',
    unavailable: 'Não conseguimos acessar os registros de intenção no momento.'
  });
}

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, '/sales-intentions', {
    notFound: 'Não foi possível localizar o serviço de envio no momento.',
    responseError: 'Não foi possível enviar a intenção no momento.',
    unavailable: 'Não conseguimos acessar o serviço de envio no momento.'
  });
}

export async function PUT(request: NextRequest) {
  return proxyBackendRequest(request, `/sales-intentions${request.nextUrl.pathname.replace(/\/api/, '')}${request.nextUrl.search}`, {
    notFound: 'Não foi possível localizar o registro para atualização no momento.',
    responseError: 'Não foi possível atualizar a intenção no momento.',
    unavailable: 'Não conseguimos acessar o serviço de atualização no momento.'
  });
}
