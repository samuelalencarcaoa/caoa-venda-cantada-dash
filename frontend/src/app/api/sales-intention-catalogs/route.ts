import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../_lib/backendProxy';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, '/sales-intention-catalogs', {
    notFound: 'Não foi possível localizar os campos do formulário no momento.',
    responseError: 'Não foi possível carregar os campos do formulário no momento.',
    unavailable: 'Não conseguimos acessar os campos do formulário no momento.'
  });
}
