import type { SalesIntentionPayload } from '@/types/types';

export type SalesIntentionApiRecord = {
  id: number;
  proprietario: string;
  tipoVenda: string;
  bandeira: string;
  lojaVenda: string;
  marcaVeiculo: string;
  versao: string;
  classificacao: string;
  quantidade: number;
  dataSolicitacao: string;
  ano_fabricacao?: number | null;
  ano_modelo?: number | null;
  placa: string;
  regional: string;
  criado: string;
};

export type SalesIntentionReportRow = {
  ID: number;
  Proprietario: string;
  Tipo_Venda: string;
  Bandeira: string;
  Loja_Venda: string;
  Marca_Veiculo: string;
  Versao: string;
  Classificacao: string;
  Quantidade: string;
  Data_solicitacao: string;
  Placa: string;
  Regional: string;
  Criado: string;
};

export type SalesIntentionCatalogRecord = {
  Tipo_Venda: string;
  Bandeira: string;
  Regional: string;
  Loja_Venda: string;
  Marca_Veiculo: string;
  Versao: string;
  Classificacao: string;
};

export type SalesIntentionCatalogHierarchyRecord = {
  bandeira: string;
  regional: string;
  lojaVenda: string;
};

export type SalesIntentionCatalogSources = {
  tipoVenda: string[];
  bandeira: string[];
  regional: string[];
  lojaVenda: string[];
  classificacao: string[];
};

export type SalesIntentionCatalogResponse = {
  version: 3;
  sources: SalesIntentionCatalogSources;
  hierarchy: SalesIntentionCatalogHierarchyRecord[];
  combinations: SalesIntentionCatalogRecord[];
};

export type SalesIntentionModelosDealerRecord = {
  tipoVenda: string;
  marca: string;
  modelo: string;
  versaoModelo: string;
};

export type SalesIntentionModelosDealerSources = {
  tipoVenda: string[];
  marca: string[];
  modelo: string[];
  versaoModelo: string[];
};

export type SalesIntentionModelosDealerResponse = {
  version: 1;
  sources: SalesIntentionModelosDealerSources;
  combinations: SalesIntentionModelosDealerRecord[];
};

export type SalesIntentionModelosDealerLookupRecord = {
  marcaVeiculo: string | null;
  modelo: string | null;
  versao: string | null;
  ano: string | number | null;
};

export type SalesIntentionModelosDealerLookupResponse = {
  found: boolean;
  record: SalesIntentionModelosDealerLookupRecord | null;
};

const SALES_INTENTION_API_ERROR_PREFIX = 'Ops, ocorreu um erro';

function buildSalesIntentionApiErrorMessage(status: number | null) {
  const statusLabel = typeof status === 'number' && Number.isFinite(status) && status > 0
    ? String(status)
    : 'desconhecido';

  return `${SALES_INTENTION_API_ERROR_PREFIX}: status ${statusLabel}. Tente novamente mais tarde ou entre em contato com o administrador do sistema.`;
}

export class SalesIntentionApiError extends Error {
  status: number | null;
  details?: string;

  constructor(status: number | null, details?: string) {
    super(buildSalesIntentionApiErrorMessage(status));
    this.name = 'SalesIntentionApiError';
    this.status = status;
    this.details = details?.trim() || undefined;
  }
}

export function formatSalesIntentionApiError(error: unknown) {
  if (error instanceof SalesIntentionApiError) {
    return error.message;
  }

  const status =
    error && typeof error === 'object' && 'status' in error && typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : null;

  return buildSalesIntentionApiErrorMessage(status);
}

function toDate(value: string | Date): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const maybeDate = new Date(value);
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate;
  }

  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return String(value);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return String(value);
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function transformApiRecord(record: SalesIntentionApiRecord): SalesIntentionReportRow {
  return {
    ID: record.id,
    Proprietario: record.proprietario,
    Tipo_Venda: record.tipoVenda,
    Bandeira: record.bandeira,
    Loja_Venda: record.lojaVenda,
    Marca_Veiculo: record.marcaVeiculo,
    Versao: record.versao,
    Classificacao: record.classificacao,
    Quantidade: String(record.quantidade),
    Data_solicitacao: formatDateTime(record.dataSolicitacao),
    Placa: record.placa,
    Regional: record.regional,
    Criado: formatDateTime(record.criado)
  };
}

async function fetchApi<T>(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = await response.text();
    throw new SalesIntentionApiError(response.status, body);
  }
  return response.json() as Promise<T>;
}

export type SalesIntentionDateRange = {
  startDate?: string;
  endDate?: string;
  tipoVenda?: 'NOVOS' | 'SEMINOVOS';
};

export async function fetchSalesIntentions(
  dateRange?: SalesIntentionDateRange
): Promise<SalesIntentionReportRow[]> {
  const searchParams = new URLSearchParams();
  if (dateRange?.startDate) searchParams.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) searchParams.set('endDate', dateRange.endDate);
  if (dateRange?.tipoVenda) searchParams.set('tipoVenda', dateRange.tipoVenda);
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
  const data = await fetchApi<SalesIntentionApiRecord[]>(`/api/sales-intentions${query}`);
  return data.map(transformApiRecord);
}

export async function fetchSalesIntentionCatalogs(): Promise<SalesIntentionCatalogResponse> {
  return fetchApi<SalesIntentionCatalogResponse>('/api/sales-intention-catalogs', {
    cache: 'no-store'
  });
}

export async function fetchSalesIntentionModelosDealer(): Promise<SalesIntentionModelosDealerResponse> {
  return fetchApi<SalesIntentionModelosDealerResponse>('/api/sales-intention-modelos-dealer', {
    cache: 'no-store'
  });
}

export async function lookupSalesIntentionModelosDealerByPlate(
  placa: string
): Promise<SalesIntentionModelosDealerLookupRecord | null> {
  const searchParams = new URLSearchParams();
  searchParams.set('placa', placa.trim());

  const response = await fetchApi<SalesIntentionModelosDealerLookupResponse>(
    `/api/sales-intention-modelos-dealer?${searchParams.toString()}`,
    {
      cache: 'no-store'
    }
  );

  return response.found && response.record ? response.record : null;
}

export async function updateSalesIntention(
  id: number,
  payload: Partial<Pick<SalesIntentionPayload, 'quantidade' | 'dataSolicitacao'>>,
): Promise<SalesIntentionReportRow> {
  const data = await fetchApi<SalesIntentionApiRecord>(`/api/sales-intentions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return transformApiRecord(data);
}

export async function createSalesIntention(payload: SalesIntentionPayload): Promise<SalesIntentionApiRecord> {
  return fetchApi<SalesIntentionApiRecord>('/api/sales-intentions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
