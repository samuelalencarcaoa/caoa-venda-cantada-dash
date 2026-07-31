import { Request, Response } from 'express';
import { badRequest } from '../errors/AppError';
import { SalesIntentionService } from '../services/SalesIntentionService';
import type { SalesIntentionSearchFilters } from '../repositories/SalesIntentionRepository';

const service = new SalesIntentionService();

const advancedSearchFields = [
  'proprietario',
  'bandeira',
  'lojaVenda',
  'marcaVeiculo',
  'versao',
  'classificacao',
  'quantidade',
  'ano_fabricacao',
  'ano_modelo',
  'placa',
  'regional'
] as const;

function parseIdParam(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readQueryText(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value.find((item): item is string => typeof item === 'string');
    const trimmed = firstValue?.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseRequiredDateQueryParam(value: unknown, fieldName: string) {
  const text = readQueryText(value);
  if (!text) {
    throw badRequest(`Informe ${fieldName} válido no formato YYYY-MM-DD.`);
  }

  const date = parseIsoDate(text);
  if (!date) {
    throw badRequest(`Informe ${fieldName} válido no formato YYYY-MM-DD.`);
  }

  return date;
}

function parseOptionalDateQueryParam(value: unknown, fieldName: string) {
  const text = readQueryText(value);
  if (!text) {
    return undefined;
  }

  const date = parseIsoDate(text);
  if (!date) {
    throw badRequest(`Informe ${fieldName} válido no formato YYYY-MM-DD.`);
  }

  return date;
}

function parseOptionalPositiveIntegerQueryParam(value: unknown, fieldName: string) {
  const text = readQueryText(value);
  if (!text) {
    return undefined;
  }

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest(`Informe ${fieldName} como um inteiro positivo.`);
  }

  return parsed;
}

function normalizeTipoVendaQueryParam(value: unknown) {
  const text = readQueryText(value);
  if (!text) {
    return undefined;
  }

  const normalized = text.toUpperCase();
  if (normalized !== 'NOVOS' && normalized !== 'SEMINOVOS') {
    throw badRequest('tipoVenda deve ser NOVOS ou SEMINOVOS.');
  }

  return normalized;
}

function buildNextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function hasAdvancedSearchFilters(query: Request['query']) {
  return advancedSearchFields.some((field) => readQueryText(query[field]) !== undefined);
}

function parseListQuery(query: Request['query']) {
  const hasStartDate = query.startDate !== undefined;
  const hasEndDate = query.endDate !== undefined;
  let dateRange: { gte: Date; lt: Date } | undefined;

  if (hasStartDate || hasEndDate) {
    if (!hasStartDate || !hasEndDate) {
      throw badRequest('Informe startDate e endDate válidos no formato YYYY-MM-DD.');
    }

    const startDate = parseRequiredDateQueryParam(query.startDate, 'startDate');
    const inclusiveEndDate = parseRequiredDateQueryParam(query.endDate, 'endDate');
    const exclusiveEndDate = buildNextDay(inclusiveEndDate);

    if (startDate >= exclusiveEndDate) {
      throw badRequest('startDate não pode ser posterior a endDate.');
    }

    dateRange = { gte: startDate, lt: exclusiveEndDate };
  }

  const tipoVenda = normalizeTipoVendaQueryParam(query.tipoVenda);

  return { dateRange, tipoVenda };
}

function parseSearchQuery(query: Request['query']): SalesIntentionSearchFilters {
  const startDate = parseOptionalDateQueryParam(query.startDate, 'startDate');
  const endDate = parseOptionalDateQueryParam(query.endDate, 'endDate');
  const exclusiveEndDate = endDate ? buildNextDay(endDate) : undefined;

  if (startDate && exclusiveEndDate && startDate >= exclusiveEndDate) {
    throw badRequest('startDate não pode ser posterior a endDate.');
  }

  const tipoVenda = normalizeTipoVendaQueryParam(query.tipoVenda);
  const quantidade = parseOptionalPositiveIntegerQueryParam(query.quantidade, 'quantidade');
  const anoFabricacao = parseOptionalPositiveIntegerQueryParam(
    query.ano_fabricacao,
    'ano_fabricacao'
  );
  const anoModelo = parseOptionalPositiveIntegerQueryParam(query.ano_modelo, 'ano_modelo');
  const proprietario = readQueryText(query.proprietario);
  const bandeira = readQueryText(query.bandeira);
  const lojaVenda = readQueryText(query.lojaVenda);
  const marcaVeiculo = readQueryText(query.marcaVeiculo);
  const versao = readQueryText(query.versao);
  const classificacao = readQueryText(query.classificacao);
  const placa = readQueryText(query.placa);
  const regional = readQueryText(query.regional);

  return {
    ...(startDate ? { startDate } : {}),
    ...(exclusiveEndDate ? { endDate: exclusiveEndDate } : {}),
    ...(tipoVenda ? { tipoVenda } : {}),
    ...(proprietario ? { proprietario } : {}),
    ...(bandeira ? { bandeira } : {}),
    ...(lojaVenda ? { lojaVenda } : {}),
    ...(marcaVeiculo ? { marcaVeiculo } : {}),
    ...(versao ? { versao } : {}),
    ...(classificacao ? { classificacao } : {}),
    ...(quantidade !== undefined ? { quantidade } : {}),
    ...(anoFabricacao !== undefined ? { ano_fabricacao: anoFabricacao } : {}),
    ...(anoModelo !== undefined ? { ano_modelo: anoModelo } : {}),
    ...(placa ? { placa } : {}),
    ...(regional ? { regional } : {})
  };
}

export class SalesIntentionController {
  public async list(req: Request, res: Response) {
    if (hasAdvancedSearchFilters(req.query)) {
      const filters = parseSearchQuery(req.query);
      const records = await service.search(filters);
      res.json(records);
      return;
    }

    const { dateRange, tipoVenda } = parseListQuery(req.query);
    const records = await service.listAll(dateRange, tipoVenda);
    res.json(records);
  }

  public async search(req: Request, res: Response) {
    const filters = parseSearchQuery(req.query);
    const records = await service.search(filters);
    res.json(records);
  }

  public async getById(req: Request, res: Response) {
    const id = parseIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const record = await service.getById(id);
    if (!record) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }
    res.json(record);
  }

  public async create(req: Request, res: Response) {
    const record = await service.create(req.body);
    res.status(201).json(record);
  }

  public async update(req: Request, res: Response) {
    const id = parseIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const record = await service.update(id, req.body);
    if (!record) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }

    res.json(record);
  }

  public async delete(req: Request, res: Response) {
    const id = parseIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const removed = await service.remove(id);
    if (!removed) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }

    res.status(204).send();
  }
}
