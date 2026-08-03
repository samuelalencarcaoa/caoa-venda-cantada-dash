import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../_lib/backendProxy';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, '/sales-intention-modelos-dealer', {
    notFound: 'Não foi possível localizar os modelos do veículo no momento.',
    responseError: 'Não foi possível carregar os modelos do veículo no momento.',
    unavailable: 'Não conseguimos acessar os modelos do veículo no momento.'
  });
}
