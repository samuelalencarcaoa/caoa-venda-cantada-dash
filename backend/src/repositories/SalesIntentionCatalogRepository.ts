import prisma from '../lib/prisma';
import {
  type SalesIntentionCatalogBundle,
  type SalesIntentionCatalogHierarchyRecord,
  type SalesIntentionCatalogRecord,
  type SalesIntentionCatalogSources
} from '../entities/SalesIntentionCatalog';
import { withPrismaRetry } from '../utils/prismaResilience';

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedBundle: SalesIntentionCatalogBundle | null = null;
let cachedBundleExpiresAt = 0;
let inFlightBundle: Promise<SalesIntentionCatalogBundle> | null = null;

function compare(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function normalizeIdentity(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
}

function normalizeTipoVenda(value: string) {
  const normalized = normalizeIdentity(value);
  if (normalized === 'NOVOS' || normalized === 'SEMINOVOS') {
    return normalized;
  }

  return value.trim().replace(/\s+/g, ' ');
}

function normalizeBandeira(value: string) {
  const normalized = normalizeIdentity(value);
  const aliases: Record<string, string> = {
    'CAOA CHANGAN': 'CAOA CHANGAN',
    'CAOA CHERY': 'CAOA CHERY',
    FORD: 'FORD',
    HYUNDAI: 'HYUNDAI',
    HYUNDAIHMB: 'HYUNDAI',
    SUBARU: 'SUBARU'
  };

  return aliases[normalized] ?? value.trim().replace(/\s+/g, ' ');
}

function normalizeLocationPair(regionalValue: string, storeValue: string) {
  const regional = regionalValue.trim().replace(/\s+/g, ' ');
  const lojaVenda = storeValue.trim().replace(/\s+/g, ' ');
  const regionalLooksLikeStore = regional.includes('-');
  const storeLooksLikeRegional = !lojaVenda.includes('-');

  if (regionalLooksLikeStore && storeLooksLikeRegional) {
    return { regional: lojaVenda, lojaVenda: regional };
  }

  return { regional, lojaVenda };
}

function normalizeCombinationRows(rows: SalesIntentionCatalogRecord[]) {
  const uniqueCombinations = new Map<string, SalesIntentionCatalogRecord>();

  rows.forEach((row) => {
    const location = normalizeLocationPair(row.regional, row.lojaVenda);
    const combination = {
      tipoVenda: normalizeTipoVenda(row.tipoVenda),
      bandeira: normalizeBandeira(row.bandeira),
      regional: location.regional,
      lojaVenda: location.lojaVenda,
      marcaVeiculo: row.marcaVeiculo.trim().replace(/\s+/g, ' '),
      versao: row.versao.trim().replace(/\s+/g, ' '),
      classificacao: row.classificacao.trim().replace(/\s+/g, ' ')
    };
    const key = Object.values(combination).map(normalizeIdentity).join('||');

    if (!uniqueCombinations.has(key)) {
      uniqueCombinations.set(key, combination);
    }
  });

  return Array.from(uniqueCombinations.values())
    .sort(
      (a, b) =>
        compare(a.tipoVenda, b.tipoVenda) ||
        compare(a.bandeira, b.bandeira) ||
        compare(a.regional, b.regional) ||
        compare(a.lojaVenda, b.lojaVenda) ||
        compare(a.marcaVeiculo, b.marcaVeiculo) ||
        compare(a.versao, b.versao) ||
        compare(a.classificacao, b.classificacao)
    );
}

function distinctValues<T extends Record<string, string>>(rows: T[], key: keyof T) {
  const uniqueValues = new Map<string, string>();

  rows.forEach((row) => {
    const value = row[key].trim();
    if (value && !uniqueValues.has(normalizeIdentity(value))) {
      uniqueValues.set(normalizeIdentity(value), value);
    }
  });

  return Array.from(uniqueValues.values()).sort(compare);
}

function normalizeHierarchyRows(
  rows: SalesIntentionCatalogRecord[]
): SalesIntentionCatalogHierarchyRecord[] {
  const uniqueHierarchy = new Map<string, SalesIntentionCatalogHierarchyRecord>();

  for (const row of rows) {
    const hierarchyRow = {
      bandeira: row.bandeira.trim(),
      regional: row.regional.trim(),
      lojaVenda: row.lojaVenda.trim()
    };

    if (!hierarchyRow.bandeira || !hierarchyRow.regional || !hierarchyRow.lojaVenda) {
      continue;
    }

    const key = [hierarchyRow.bandeira, hierarchyRow.regional, hierarchyRow.lojaVenda]
      .map(normalizeIdentity)
      .join('||');

    uniqueHierarchy.set(key, hierarchyRow);
  }

  return Array.from(uniqueHierarchy.values()).sort(
    (a, b) =>
      compare(a.bandeira, b.bandeira) ||
      compare(a.regional, b.regional) ||
      compare(a.lojaVenda, b.lojaVenda)
  );
}

function buildSources(combinations: SalesIntentionCatalogRecord[]): SalesIntentionCatalogSources {
  return {
    tipoVenda: distinctValues(combinations, 'tipoVenda'),
    bandeira: distinctValues(combinations, 'bandeira'),
    regional: distinctValues(combinations, 'regional'),
    lojaVenda: distinctValues(combinations, 'lojaVenda')
  };
}

function buildCatalogBundle(
  combinations: SalesIntentionCatalogRecord[]
): SalesIntentionCatalogBundle {
  return {
    version: 3,
    sources: buildSources(combinations),
    hierarchy: normalizeHierarchyRows(combinations),
    combinations
  };
}

async function loadBundle(): Promise<SalesIntentionCatalogBundle> {
  const now = Date.now();
  if (cachedBundle && now < cachedBundleExpiresAt) {
    return cachedBundle;
  }

  if (inFlightBundle) {
    return inFlightBundle;
  }

  inFlightBundle = (async () => {
    const rows = await withPrismaRetry(() =>
      prisma.salesIntentionOptionCombination.findMany({
        select: {
          tipoVenda: true,
          bandeira: true,
          regional: true,
          lojaVenda: true,
          marcaVeiculo: true,
          versao: true,
          classificacao: true
        }
      })
    );

    const combinations = normalizeCombinationRows(rows);
    const bundle = buildCatalogBundle(combinations);

    cachedBundle = bundle;
    cachedBundleExpiresAt = Date.now() + CATALOG_CACHE_TTL_MS;

    return bundle;
  })().finally(() => {
    inFlightBundle = null;
  });

  return inFlightBundle;
}

export function invalidateSalesIntentionCatalogCache() {
  cachedBundle = null;
  cachedBundleExpiresAt = 0;
  inFlightBundle = null;
}

export class SalesIntentionCatalogRepository {
  public async findAll(): Promise<SalesIntentionCatalogBundle> {
    return loadBundle();
  }
}
