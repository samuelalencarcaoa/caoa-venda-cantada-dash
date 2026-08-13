import prisma from '../lib/prisma';
import {
  type SalesIntentionCatalogBundle,
  type SalesIntentionCatalogHierarchyRecord,
  type SalesIntentionCatalogRecord,
  type SalesIntentionCatalogSources
} from '../entities/SalesIntentionCatalog';

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedBundle: SalesIntentionCatalogBundle | null = null;
let cachedBundleExpiresAt = 0;
let inFlightBundle: Promise<SalesIntentionCatalogBundle> | null = null;

function compare(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function normalizeCombinationRows(rows: SalesIntentionCatalogRecord[]) {
  return rows
    .map((row) => ({
      tipoVenda: row.tipoVenda.trim(),
      bandeira: row.bandeira.trim(),
      regional: row.regional.trim(),
      lojaVenda: row.lojaVenda.trim(),
      marcaVeiculo: row.marcaVeiculo.trim(),
      versao: row.versao.trim(),
      classificacao: row.classificacao.trim()
    }))
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
  return Array.from(
    new Set(
      rows
        .map((row) => row[key].trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort(compare);
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

    uniqueHierarchy.set(
      `${hierarchyRow.bandeira}||${hierarchyRow.regional}||${hierarchyRow.lojaVenda}`,
      hierarchyRow
    );
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
    lojaVenda: distinctValues(combinations, 'lojaVenda'),
    classificacao: distinctValues(combinations, 'classificacao')
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
    const rows = await prisma.salesIntentionOptionCombination.findMany({
      select: {
        tipoVenda: true,
        bandeira: true,
        regional: true,
        lojaVenda: true,
        marcaVeiculo: true,
        versao: true,
        classificacao: true
      }
    });

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
