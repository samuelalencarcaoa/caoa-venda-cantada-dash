import prisma from '../lib/prisma';
import { withPrismaRetry } from '../utils/prismaResilience';

const CLASSIFICACAO_VENDA_SQL = `
  SELECT DISTINCT classificacao
  FROM (
    SELECT NULLIF(
      LTRIM(RTRIM(CAST([Descricao_Classificacao_Venda] AS NVARCHAR(200)))),
      ''
    ) AS classificacao
    FROM [salesdb].[dbo].[VW_IntencaoVendas_ClassificacaoVenda]
  ) AS source
  WHERE classificacao IS NOT NULL
  ORDER BY classificacao
`;

type ClassificacaoVendaRow = {
  classificacao: string | null;
};

function compare(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function normalizeIdentity(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');
}

function normalizeText(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed : null;
}

function normalizeRows(rows: ClassificacaoVendaRow[]) {
  const uniqueValues = new Map<string, string>();

  rows.forEach((row) => {
    const classificacao = normalizeText(row.classificacao);
    if (!classificacao) {
      return;
    }

    const key = normalizeIdentity(classificacao);
    if (!uniqueValues.has(key)) {
      uniqueValues.set(key, classificacao);
    }
  });

  return Array.from(uniqueValues.values()).sort(compare);
}

async function loadClassificacoes() {
  const rows = await withPrismaRetry(() =>
    prisma.$queryRawUnsafe<ClassificacaoVendaRow[]>(CLASSIFICACAO_VENDA_SQL)
  );

  return normalizeRows(rows);
}

export class SalesIntentionClassificacaoVendaRepository {
  public async findAll(): Promise<string[]> {
    return loadClassificacoes();
  }
}
