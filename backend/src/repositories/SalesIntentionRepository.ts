import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parseOptionalYear, SalesIntention, SalesIntentionPayload } from '../entities/SalesIntention';
import { getCurrentMonthDateRange } from '../utils/dateRange';
import { buildSalesIntentionCombination } from '../utils/salesIntentionCatalog';

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

export class SalesIntentionRepository {
  public async findAll(dateRange = getCurrentMonthDateRange(), tipoVenda?: string) {
    return prisma.salesIntention.findMany({
      where: buildSalesIntentionWhere({
        startDate: dateRange.gte,
        endDate: dateRange.lt,
        tipoVenda
      }),
      select: salesIntentionListSelect,
      orderBy: { criado: 'desc' }
    });
  }

  public async search(filters: SalesIntentionSearchFilters) {
    return prisma.salesIntention.findMany({
      where: buildSalesIntentionWhere(filters),
      select: salesIntentionListSelect,
      orderBy: { criado: 'desc' }
    });
  }

  public async findById(id: number) {
    return prisma.salesIntention.findUnique({ where: { id } });
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
    const catalogData = buildSalesIntentionCombination(domainRecord);
    const [record] = await prisma.$transaction([
      prisma.salesIntention.create({ data }),
      prisma.salesIntentionOptionCombination.upsert({
        where: { combinationKey: catalogData.combinationKey },
        create: catalogData,
        update: {}
      })
    ]);

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

    const record = await prisma.salesIntention.update({
      where: { id },
      data
    });

    if (
      record.tipoVenda &&
      record.bandeira &&
      record.regional &&
      record.lojaVenda &&
      record.marcaVeiculo &&
      record.versao &&
      record.classificacao
    ) {
      const catalogData = buildSalesIntentionCombination({
        tipoVenda: record.tipoVenda,
        bandeira: record.bandeira,
        regional: record.regional,
        lojaVenda: record.lojaVenda,
        marcaVeiculo: record.marcaVeiculo,
        versao: record.versao,
        classificacao: record.classificacao
      });

      await prisma.salesIntentionOptionCombination.upsert({
        where: { combinationKey: catalogData.combinationKey },
        create: catalogData,
        update: {}
      });
    }

    return record;
  }

  public async delete(id: number) {
    return prisma.salesIntention.delete({ where: { id } });
  }
}
