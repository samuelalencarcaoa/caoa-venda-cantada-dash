import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../../_lib/backendProxy';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, `/sales-intentions/search${request.nextUrl.search}`, {
    notFound: 'Não foi possível localizar os registros pesquisados no momento.',
    responseError: 'Não foi possível pesquisar os registros de intenção no momento.',
    unavailable: 'Não conseguimos acessar a pesquisa de intenções no momento.'
  });
}
