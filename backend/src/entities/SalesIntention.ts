import { badRequest } from '../errors/AppError';

export type SalesIntentionPayload = {
  proprietario: string;
  tipoVenda: string;
  bandeira: string;
  lojaVenda: string;
  marcaVeiculo: string;
  versao: string;
  classificacao: string;
  quantidade: number;
  dataSolicitacao: string;
  ano_fabricacao?: string | number | null;
  ano_modelo?: string | number | null;
  placa: string;
  regional: string;
  criado?: string;
};

export function parseOptionalYear(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest('Os campos ano_fabricacao e ano_modelo precisam ser anos válidos.');
  }

  return parsed;
}

function parseQuantity(value: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest('quantidade precisa ser um inteiro positivo.');
  }

  return parsed;
}

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

export class SalesIntention {
  public readonly id: number | null;
  public readonly proprietario: string;
  public readonly tipoVenda: string;
  public readonly bandeira: string;
  public readonly lojaVenda: string;
  public readonly marcaVeiculo: string;
  public readonly versao: string;
  public readonly classificacao: string;
  public readonly quantidade: number;
  public readonly dataSolicitacao: Date;
  public readonly ano_fabricacao: number | null;
  public readonly ano_modelo: number | null;
  public readonly placa: string;
  public readonly regional: string;
  public readonly criado: Date;

  constructor(payload: SalesIntentionPayload, id: number | null = null) {
    this.id = id;
    this.proprietario = payload.proprietario.trim();
    this.tipoVenda = payload.tipoVenda.trim();
    this.bandeira = payload.bandeira.trim();
    this.lojaVenda = payload.lojaVenda.trim();
    this.marcaVeiculo = payload.marcaVeiculo.trim();
    this.versao = payload.versao.trim();
    this.classificacao = payload.classificacao.trim();
    this.quantidade = parseQuantity(payload.quantidade);
    this.dataSolicitacao = SalesIntention.parseDate(payload.dataSolicitacao);
    this.ano_fabricacao = parseOptionalYear(payload.ano_fabricacao);
    this.ano_modelo = parseOptionalYear(payload.ano_modelo);
    this.placa = payload.placa.trim();
    this.regional = payload.regional.trim();
    this.criado = payload.criado ? new Date(payload.criado) : new Date();

    if (!isValidDate(this.criado)) {
      throw badRequest('criado precisa ser uma data válida.');
    }
  }

  public static parseDate(value: string): Date {
    const normalizedValue = value.trim();

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalizedValue)) {
      const parsedIsoDate = new Date(normalizedValue);
      if (!isValidDate(parsedIsoDate)) {
        throw badRequest('dataSolicitacao precisa ser uma data e hora válidas.');
      }

      return parsedIsoDate;
    }

    const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      normalizedValue
    );
    if (!match) {
      throw badRequest(
        'dataSolicitacao precisa estar em ISO 8601 ou no formato DD/MM/YYYY HH:mm'
      );
    }

    const [, dayText, monthText, yearText, hourText = '0', minuteText = '0', secondText = '0'] =
      match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const parsedDate = new Date(year, month - 1, day, hour, minute, second);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day ||
      parsedDate.getHours() !== hour ||
      parsedDate.getMinutes() !== minute ||
      parsedDate.getSeconds() !== second
    ) {
      throw badRequest('dataSolicitacao precisa ser uma data e hora válidas.');
    }

    return parsedDate;
  }
}
