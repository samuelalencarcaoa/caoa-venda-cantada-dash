import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '../_lib/backendProxy';

export async function GET(request: NextRequest) {
  const plate = request.nextUrl.searchParams.get('placa')?.trim();
  const path = plate
    ? `/sales-intention-modelos-dealer/by-placa?${request.nextUrl.searchParams.toString()}`
    : '/sales-intention-modelos-dealer';

  return proxyBackendRequest(request, path, {
    notFound: 'Não foi possível localizar os modelos do veículo no momento.',
    responseError: 'Não foi possível carregar os modelos do veículo no momento.',
    unavailable: 'Não conseguimos acessar os modelos do veículo no momento.'
  });
}
