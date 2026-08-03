import prisma from '../lib/prisma';
import {
  type SalesIntentionModelosDealerBundle,
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

async function loadRows() {
  const rows = await prisma.$queryRawUnsafe<SalesIntentionModelosDealerRow[]>(MODELOS_DEALER_SQL);
  return normalizeRows(rows);
}

export class SalesIntentionModelosDealerRepository {
  public async findAll(): Promise<SalesIntentionModelosDealerBundle> {
    const combinations = await loadRows();

    return {
      version: 1,
      sources: {
        tipoVenda: normalizeDistinctValues(combinations, 'tipoVenda'),
        marca: normalizeDistinctValues(combinations, 'marca'),
        modelo: normalizeDistinctValues(combinations, 'modelo'),
        versaoModelo: normalizeDistinctValues(combinations, 'versaoModelo')
      },
      combinations
    };
  }
}
