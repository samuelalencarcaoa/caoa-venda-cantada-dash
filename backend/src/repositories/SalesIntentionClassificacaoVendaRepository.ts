import prisma from '../lib/prisma';
import { withPrismaRetry } from '../utils/prismaResilience';

const CLASSIFICACAO_VENDA_SQL = `
  SELECT DISTINCT *
  FROM [salesdb].[dbo].[VW_IntencaoVendas_ClassificacaoVenda]
`;

type ClassificacaoVendaRow = Record<string, unknown>;

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

function normalizeText(value: unknown) {
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

  if (value instanceof Date) {
    const text = value.toISOString().trim();
    return text ? text : null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function pickClassificacaoValue(row: ClassificacaoVendaRow) {
  const values = Object.entries(row)
    .map(([key, value]) => ({
      key: normalizeIdentity(key),
      value: normalizeText(value)
    }))
    .filter((entry): entry is { key: string; value: string } => Boolean(entry.value));

  if (values.length === 0) {
    return null;
  }

  const preferredValue = values.find(({ key }) => key.includes('CLASSIFICACAO'))?.value;
  return preferredValue ?? values[0].value;
}

function normalizeRows(rows: ClassificacaoVendaRow[]) {
  const uniqueValues = new Map<string, string>();

  rows.forEach((row) => {
    const classificacao = pickClassificacaoValue(row);
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
