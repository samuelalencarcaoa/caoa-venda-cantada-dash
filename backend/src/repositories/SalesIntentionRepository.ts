import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parseOptionalYear, SalesIntention, SalesIntentionPayload } from '../entities/SalesIntention';
import { getCurrentMonthDateRange } from '../utils/dateRange';
import { buildSalesIntentionCombination } from '../utils/salesIntentionCatalog';
import { invalidateSalesIntentionCatalogCache } from './SalesIntentionCatalogRepository';
import { withPrismaRetry } from '../utils/prismaResilience';

const salesIntentionListSelect = {
  id: true,
  proprietario: true,
  tipoVenda: true,
  bandeira: true,
  lojaVenda: true,
  marcaVeiculo: true,
  versao: true,
  classificacao: true,
  quantidade: true,
  dataSolicitacao: true,
  ano_fabricacao: true,
  ano_modelo: true,
  placa: true,
  regional: true,
  criado: true
} satisfies Prisma.SalesIntentionSelect;

type SalesIntentionListRecord = Prisma.SalesIntentionGetPayload<{
  select: typeof salesIntentionListSelect;
}>;

const SALES_INTENTION_QUERY_CACHE_TTL_MS = 10 * 1000;

type QueryCacheEntry = {
  expiresAt: number;
  value: SalesIntentionListRecord[];
};

const queryCache = new Map<string, QueryCacheEntry>();
const inFlightQueries = new Map<string, Promise<SalesIntentionListRecord[]>>();

export type SalesIntentionSearchFilters = {
  startDate?: Date;
  endDate?: Date;
  tipoVenda?: string;
  proprietario?: string;
  bandeira?: string;
  lojaVenda?: string;
  marcaVeiculo?: string;
  versao?: string;
  classificacao?: string;
  quantidade?: number;
  ano_fabricacao?: number;
  ano_modelo?: number;
  placa?: string;
  regional?: string;
};

function buildSalesIntentionWhere(filters: SalesIntentionSearchFilters): Prisma.SalesIntentionWhereInput {
  const where: Prisma.SalesIntentionWhereInput = {};

  if (filters.startDate || filters.endDate) {
    where.dataSolicitacao = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lt: filters.endDate } : {})
    };
  }

  if (filters.tipoVenda) {
    where.tipoVenda = { contains: filters.tipoVenda };
  }

  if (filters.proprietario) {
    where.proprietario = { contains: filters.proprietario };
  }

  if (filters.bandeira) {
    where.bandeira = { contains: filters.bandeira };
  }

  if (filters.lojaVenda) {
    where.lojaVenda = { contains: filters.lojaVenda };
  }

  if (filters.marcaVeiculo) {
    where.marcaVeiculo = { contains: filters.marcaVeiculo };
  }

  if (filters.versao) {
    where.versao = { contains: filters.versao };
  }

  if (filters.classificacao) {
    where.classificacao = { contains: filters.classificacao };
  }

  if (filters.quantidade !== undefined) {
    where.quantidade = filters.quantidade;
  }

  if (filters.ano_fabricacao !== undefined) {
    where.ano_fabricacao = filters.ano_fabricacao;
  }

  if (filters.ano_modelo !== undefined) {
    where.ano_modelo = filters.ano_modelo;
  }

  if (filters.placa) {
    where.placa = { contains: filters.placa };
  }

  if (filters.regional) {
    where.regional = { contains: filters.regional };
  }

  return where;
}

type CatalogCombinationCandidate = {
  tipoVenda?: string | null;
  bandeira?: string | null;
  regional?: string | null;
  lojaVenda?: string | null;
  marcaVeiculo?: string | null;
  versao?: string | null;
  classificacao?: string | null;
};

type CompleteCatalogCombination = {
  tipoVenda: string;
  bandeira: string;
  regional: string;
  lojaVenda: string;
  marcaVeiculo: string;
  versao: string;
  classificacao: string;
};

function hasCompleteCatalogCombination(
  record: CatalogCombinationCandidate
): record is CompleteCatalogCombination {
  return Boolean(
    record.tipoVenda &&
      record.bandeira &&
      record.regional &&
      record.lojaVenda &&
      record.marcaVeiculo &&
      record.versao &&
      record.classificacao
  );
}

function buildCatalogCombination(record: CatalogCombinationCandidate) {
  if (!hasCompleteCatalogCombination(record)) {
    return null;
  }

  return buildSalesIntentionCombination({
    tipoVenda: record.tipoVenda,
    bandeira: record.bandeira,
    regional: record.regional,
    lojaVenda: record.lojaVenda,
    marcaVeiculo: record.marcaVeiculo,
    versao: record.versao,
    classificacao: record.classificacao
  });
}

function normalizeCacheValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const entries: Array<[string, string]> = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => [key, normalizeCacheValue(entryValue)]);

    return JSON.stringify(entries);
  }

  return String(value);
}

function buildSalesIntentionQueryCacheKey(
  kind: 'list' | 'search',
  payload: SalesIntentionSearchFilters | { dateRange?: { gte: Date; lt: Date }; tipoVenda?: string }
): string {
  const entries: Array<[string, string]> = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      if (value && typeof value === 'object' && 'gte' in value && 'lt' in value) {
        return [key, `${value.gte.toISOString()}|${value.lt.toISOString()}`];
      }

      return [key, normalizeCacheValue(value)];
    });

  return `${kind}:${JSON.stringify(entries)}`;
}

function getCachedQueryResult(key: string) {
  const cached = queryCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    queryCache.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedQueryResult(key: string, value: SalesIntentionListRecord[]) {
  queryCache.set(key, {
    expiresAt: Date.now() + SALES_INTENTION_QUERY_CACHE_TTL_MS,
    value
  });
}

async function loadCachedQueryResult(
  key: string,
  loader: () => Promise<SalesIntentionListRecord[]>
) {
  const cached = getCachedQueryResult(key);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightQueries.get(key);
  if (inFlight) {
    return inFlight;
  }

  const queryPromise = withPrismaRetry(loader)
    .then((rows) => {
      setCachedQueryResult(key, rows);
      return rows;
    })
    .finally(() => {
      inFlightQueries.delete(key);
    });

  inFlightQueries.set(key, queryPromise);
  return queryPromise;
}

export function invalidateSalesIntentionQueryCache() {
  queryCache.clear();
  inFlightQueries.clear();
}

export class SalesIntentionRepository {
  public async findAll(dateRange = getCurrentMonthDateRange(), tipoVenda?: string) {
    const key = buildSalesIntentionQueryCacheKey('list', {
      dateRange: { gte: dateRange.gte, lt: dateRange.lt },
      tipoVenda
    });

    return loadCachedQueryResult(key, () =>
      prisma.salesIntention.findMany({
        where: buildSalesIntentionWhere({
          startDate: dateRange.gte,
          endDate: dateRange.lt,
          tipoVenda
        }),
        select: salesIntentionListSelect,
        orderBy: { criado: 'desc' }
      })
    );
  }

  public async search(filters: SalesIntentionSearchFilters) {
    const key = buildSalesIntentionQueryCacheKey('search', filters);

    return loadCachedQueryResult(key, () =>
      prisma.salesIntention.findMany({
        where: buildSalesIntentionWhere(filters),
        select: salesIntentionListSelect,
        orderBy: { criado: 'desc' }
      })
    );
  }

  public async findById(id: number) {
    return withPrismaRetry(() => prisma.salesIntention.findUnique({ where: { id } }));
  }

  public async create(payload: SalesIntentionPayload) {
    const domainRecord = new SalesIntention(payload);
    const data = {
      proprietario: domainRecord.proprietario,
      tipoVenda: domainRecord.tipoVenda,
      bandeira: domainRecord.bandeira,
      lojaVenda: domainRecord.lojaVenda,
      marcaVeiculo: domainRecord.marcaVeiculo,
      versao: domainRecord.versao,
      classificacao: domainRecord.classificacao,
      quantidade: domainRecord.quantidade,
      dataSolicitacao: domainRecord.dataSolicitacao,
      ano_fabricacao: domainRecord.ano_fabricacao,
      ano_modelo: domainRecord.ano_modelo,
      placa: domainRecord.placa,
      regional: domainRecord.regional,
      criado: domainRecord.criado
    };
    const catalogData = buildCatalogCombination(domainRecord);
    const record = await withPrismaRetry(() =>
      prisma.$transaction(async (tx) => {
        const createdRecord = await tx.salesIntention.create({ data });

        if (catalogData) {
          await tx.salesIntentionOptionCombination.upsert({
            where: { combinationKey: catalogData.combinationKey },
            create: catalogData,
            update: {}
          });
        }

        return createdRecord;
      })
    );

    invalidateSalesIntentionQueryCache();
    invalidateSalesIntentionCatalogCache();

    return record;
  }

  public async update(id: number, payload: Partial<SalesIntentionPayload>) {
    const data = {
      ...(payload.proprietario && { proprietario: payload.proprietario }),
      ...(payload.tipoVenda && { tipoVenda: payload.tipoVenda }),
      ...(payload.bandeira && { bandeira: payload.bandeira }),
      ...(payload.lojaVenda && { lojaVenda: payload.lojaVenda }),
      ...(payload.marcaVeiculo && { marcaVeiculo: payload.marcaVeiculo }),
      ...(payload.versao && { versao: payload.versao }),
      ...(payload.classificacao && { classificacao: payload.classificacao }),
      ...(payload.quantidade !== undefined && { quantidade: Number(payload.quantidade) }),
      ...(payload.dataSolicitacao && { dataSolicitacao: SalesIntention.parseDate(payload.dataSolicitacao) }),
      ...(payload.ano_fabricacao !== undefined && {
        ano_fabricacao: parseOptionalYear(payload.ano_fabricacao)
      }),
      ...(payload.ano_modelo !== undefined && {
        ano_modelo: parseOptionalYear(payload.ano_modelo)
      }),
      ...(payload.placa && { placa: payload.placa }),
      ...(payload.regional && { regional: payload.regional }),
      ...(payload.criado && { criado: new Date(payload.criado) })
    };

    const record = await withPrismaRetry(() =>
      prisma.$transaction(async (tx) => {
        const updatedRecord = await tx.salesIntention.update({
          where: { id },
          data
        });

        const catalogData = buildCatalogCombination(updatedRecord);
        if (catalogData) {
          await tx.salesIntentionOptionCombination.upsert({
            where: { combinationKey: catalogData.combinationKey },
            create: catalogData,
            update: {}
          });
        }

        return updatedRecord;
      })
    );

    invalidateSalesIntentionQueryCache();
    if (buildCatalogCombination(record)) {
      invalidateSalesIntentionCatalogCache();
    }

    return record;
  }

  public async delete(id: number) {
    const record = await withPrismaRetry(() => prisma.salesIntention.delete({ where: { id } }));
    invalidateSalesIntentionQueryCache();
    return record;
  }
}
