import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../_lib/backendProxy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, '/sales-intention-classificacoes', {
    notFound: 'Não foi possível localizar as classificações no momento.',
    responseError: 'Não foi possível carregar as classificações no momento.',
    unavailable: 'Não conseguimos acessar as classificações no momento.'
  });
}
