import prisma from '../lib/prisma';
import {
  type SalesIntentionModelosDealerBundle,
  type SalesIntentionModelosDealerLookupRecord,
  type SalesIntentionModelosDealerLookupRow,
  type SalesIntentionModelosDealerRecord,
  type SalesIntentionModelosDealerRow
} from '../entities/SalesIntentionModelosDealer';

const MODELOS_DEALER_SQL = `
  SELECT DISTINCT
    NULLIF(LTRIM(RTRIM(CAST([Tipo_Venda] AS NVARCHAR(200)))), '') AS [Tipo_Venda],
    NULLIF(LTRIM(RTRIM(CAST([Marca] AS NVARCHAR(200)))), '') AS [Marca],
    NULLIF(LTRIM(RTRIM(CAST([Modelo] AS NVARCHAR(200)))), '') AS [Modelo],
    NULLIF(LTRIM(RTRIM(CAST([Versao_Modelo] AS NVARCHAR(200)))), '') AS [Versao_Modelo]
  FROM [salesdb].[dbo].[VW_IntencaoVendas_ModelosDealer]
  WHERE
    NULLIF(LTRIM(RTRIM(CAST([Tipo_Venda] AS NVARCHAR(200)))), '') IS NOT NULL
    AND NULLIF(LTRIM(RTRIM(CAST([Marca] AS NVARCHAR(200)))), '') IS NOT NULL
    AND NULLIF(LTRIM(RTRIM(CAST([Modelo] AS NVARCHAR(200)))), '') IS NOT NULL
    AND NULLIF(LTRIM(RTRIM(CAST([Versao_Modelo] AS NVARCHAR(200)))), '') IS NOT NULL
  ORDER BY [Tipo_Venda], [Marca], [Modelo], [Versao_Modelo]
`;

const MODELOS_DEALER_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedBundle: SalesIntentionModelosDealerBundle | null = null;
let cachedBundleExpiresAt = 0;
let inFlightBundle: Promise<SalesIntentionModelosDealerBundle> | null = null;

function normalizeLookupKey(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeLookupText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value).trim() || null : null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function normalizePlateForSearch(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function compare(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function normalizeDistinctValues<T extends Record<string, string>>(
  rows: T[],
  key: keyof T
) {
  return Array.from(
    new Set(
      rows
        .map((row) => row[key]?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort(compare);
}

function pickLookupValue(row: SalesIntentionModelosDealerLookupRow, candidates: string[]) {
  const normalizedEntries = new Map(
    Object.entries(row).map(([key, value]) => [normalizeLookupKey(key), value])
  );

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeLookupKey(candidate);
    const text = normalizeLookupText(normalizedEntries.get(normalizedCandidate));
    if (text) {
      return text;
    }
  }

  return null;
}

function extractAno(row: SalesIntentionModelosDealerLookupRow) {
  const preferredAno = pickLookupValue(row, ['Ano_Modelo', 'Ano_Fabricacao', 'Ano']);
  if (preferredAno) {
    return preferredAno;
  }

  const anoKey = Object.keys(row).find((key) => normalizeLookupKey(key).includes('ANO'));
  if (!anoKey) {
    return null;
  }

  return normalizeLookupText(row[anoKey]);
}

function normalizeRows(rows: SalesIntentionModelosDealerRow[]): SalesIntentionModelosDealerRecord[] {
  return rows
    .map((row) => ({
      tipoVenda: row.Tipo_Venda.trim(),
      marca: row.Marca.trim(),
      modelo: row.Modelo.trim(),
      versaoModelo: row.Versao_Modelo.trim()
    }))
    .sort(
      (a, b) =>
        compare(a.tipoVenda, b.tipoVenda) ||
        compare(a.marca, b.marca) ||
        compare(a.modelo, b.modelo) ||
        compare(a.versaoModelo, b.versaoModelo)
    );
}

function buildBundle(rows: SalesIntentionModelosDealerRecord[]): SalesIntentionModelosDealerBundle {
  return {
    version: 1,
    sources: {
      tipoVenda: normalizeDistinctValues(rows, 'tipoVenda'),
      marca: normalizeDistinctValues(rows, 'marca'),
      modelo: normalizeDistinctValues(rows, 'modelo'),
      versaoModelo: normalizeDistinctValues(rows, 'versaoModelo')
    },
    combinations: rows
  };
}

async function loadRows() {
  const now = Date.now();
  if (cachedBundle && now < cachedBundleExpiresAt) {
    return cachedBundle;
  }

  if (inFlightBundle) {
    return inFlightBundle;
  }

  inFlightBundle = (async () => {
    const rows = await prisma.$queryRawUnsafe<SalesIntentionModelosDealerRow[]>(MODELOS_DEALER_SQL);
    const combinations = normalizeRows(rows);
    const bundle = buildBundle(combinations);

    cachedBundle = bundle;
    cachedBundleExpiresAt = Date.now() + MODELOS_DEALER_CACHE_TTL_MS;

    return bundle;
  })().finally(() => {
    inFlightBundle = null;
  });

  return inFlightBundle;
}

export function invalidateSalesIntentionModelosDealerCache() {
  cachedBundle = null;
  cachedBundleExpiresAt = 0;
  inFlightBundle = null;
}

export class SalesIntentionModelosDealerRepository {
  public async findAll(): Promise<SalesIntentionModelosDealerBundle> {
    return loadRows();
  }

  public async findByPlaca(placa: string): Promise<SalesIntentionModelosDealerLookupRecord | null> {
    const normalizedPlate = normalizePlateForSearch(placa);
    if (!normalizedPlate) {
      return null;
    }

    const rows = await prisma.$queryRaw<SalesIntentionModelosDealerLookupRow[]>`
      SELECT TOP (1) *
      FROM [salesdb].[dbo].[VW_IntencaoVendas_ModelosDealer]
      WHERE REPLACE(REPLACE(UPPER(LTRIM(RTRIM(CAST([Placa] AS NVARCHAR(50))))), '-', ''), ' ', '') = ${normalizedPlate}
      ORDER BY [Tipo_Venda], [Marca], [Modelo], [Versao_Modelo]
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      marcaVeiculo: pickLookupValue(row, ['Marca', 'Marca_Veiculo', 'MarcaVeiculo']),
      modelo: pickLookupValue(row, ['Modelo']),
      versao: pickLookupValue(row, ['Versao_Modelo', 'Versao', 'VersaoModelo']),
      ano: extractAno(row)
    };
  }
}
