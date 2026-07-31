import prisma from '../lib/prisma';
import {
  type SalesIntentionCatalogBundle,
  type SalesIntentionCatalogHierarchyRecord,
  type SalesIntentionCatalogRecord,
  type SalesIntentionCatalogSources
} from '../entities/SalesIntentionCatalog';

type DistinctValueRow = {
  value: string | null;
};

type HierarchyRow = {
  bandeira: string | null;
  regional: string | null;
  lojaVenda: string | null;
};

const TYPE_VENDA_SQL = `
  SELECT DISTINCT
    NULLIF(LTRIM(RTRIM(CAST([Descricao_TipoVenda] AS NVARCHAR(200)))), '') AS [value]
  FROM [dbo].[VW_IntencaoVendas_TipoVenda]
  WHERE NULLIF(LTRIM(RTRIM(CAST([Descricao_TipoVenda] AS NVARCHAR(200)))), '') IS NOT NULL
  ORDER BY [value]
`;

const BANDEIRA_REGIONAL_LOJA_SQL = `
  SELECT DISTINCT
    NULLIF(LTRIM(RTRIM(CAST([Empresa_MarcaDescricao] AS NVARCHAR(200)))), '') AS [bandeira],
    NULLIF(LTRIM(RTRIM(CAST([Empresa_NomeFantasia] AS NVARCHAR(200)))), '') AS [regional],
    NULLIF(LTRIM(RTRIM(CAST([Regional_Vendas] AS NVARCHAR(200)))), '') AS [lojaVenda]
  FROM [salesdb].[dbo].[VW_IntencaoVendas_Empresa]
  WHERE
    NULLIF(LTRIM(RTRIM(CAST([Empresa_MarcaDescricao] AS NVARCHAR(200)))), '') IS NOT NULL
    AND NULLIF(LTRIM(RTRIM(CAST([Empresa_NomeFantasia] AS NVARCHAR(200)))), '') IS NOT NULL
    AND NULLIF(LTRIM(RTRIM(CAST([Regional_Vendas] AS NVARCHAR(200)))), '') IS NOT NULL
  ORDER BY [bandeira], [regional], [lojaVenda]
`;

const CLASSIFICACAO_SQL = `
  SELECT DISTINCT
    NULLIF(LTRIM(RTRIM(CAST([Descricao_Classificacao_Venda] AS NVARCHAR(200)))), '') AS [value]
  FROM [dbo].[VW_IntencaoVendas_ClassificacaoVenda]
  WHERE NULLIF(LTRIM(RTRIM(CAST([Descricao_Classificacao_Venda] AS NVARCHAR(200)))), '') IS NOT NULL
  ORDER BY [value]
`;

function compare(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function normalizeDistinctValues(rows: DistinctValueRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort(compare);
}

async function loadDistinctValues(sql: string) {
  const rows = await prisma.$queryRawUnsafe<DistinctValueRow[]>(sql);
  return normalizeDistinctValues(rows);
}

function normalizeHierarchyRows(rows: HierarchyRow[]): SalesIntentionCatalogHierarchyRecord[] {
  return rows
    .map((row) => ({
      bandeira: row.bandeira?.trim() ?? '',
      regional: row.regional?.trim() ?? '',
      lojaVenda: row.lojaVenda?.trim() ?? ''
    }))
    .filter(
      (row): row is SalesIntentionCatalogHierarchyRecord =>
        Boolean(row.bandeira && row.regional && row.lojaVenda)
    )
    .sort(
      (a, b) =>
        compare(a.bandeira, b.bandeira) ||
        compare(a.regional, b.regional) ||
        compare(a.lojaVenda, b.lojaVenda)
    );
}

async function loadHierarchyRows(sql: string) {
  const rows = await prisma.$queryRawUnsafe<HierarchyRow[]>(sql);
  return normalizeHierarchyRows(rows);
}

function distinctHierarchyValues(
  rows: SalesIntentionCatalogHierarchyRecord[],
  key: keyof SalesIntentionCatalogHierarchyRecord
) {
  return Array.from(new Set(rows.map((row) => row[key].trim()).filter(Boolean))).sort(compare);
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

export class SalesIntentionCatalogRepository {
  private findSources(
    hierarchy: SalesIntentionCatalogHierarchyRecord[],
    tipoVenda: string[],
    classificacao: string[]
  ): SalesIntentionCatalogSources {
    return {
      tipoVenda,
      bandeira: distinctHierarchyValues(hierarchy, 'bandeira'),
      regional: distinctHierarchyValues(hierarchy, 'regional'),
      lojaVenda: distinctHierarchyValues(hierarchy, 'lojaVenda'),
      classificacao
    };
  }

  private async findCombinations(): Promise<SalesIntentionCatalogRecord[]> {
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

    return normalizeCombinationRows(rows);
  }

  public async findAll(): Promise<SalesIntentionCatalogBundle> {
    const [tipoVenda, hierarchy, classificacao, combinations] = await Promise.all([
      loadDistinctValues(TYPE_VENDA_SQL),
      loadHierarchyRows(BANDEIRA_REGIONAL_LOJA_SQL),
      loadDistinctValues(CLASSIFICACAO_SQL),
      this.findCombinations()
    ]);

    return {
      version: 3,
      sources: this.findSources(hierarchy, tipoVenda, classificacao),
      hierarchy,
      combinations
    };
  }
}
