import { Request, Response } from 'express';
import { badRequest } from '../errors/AppError';
import { SalesIntentionModelosDealerService } from '../services/SalesIntentionModelosDealerService';

const service = new SalesIntentionModelosDealerService();

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

export class SalesIntentionModelosDealerController {
  public async list(_req: Request, res: Response) {
    const catalog = await service.listAll();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(catalog);
  }

  public async findByPlaca(req: Request, res: Response) {
    const placa = readQueryText(req.query.placa);
    if (!placa) {
      throw badRequest('Informe uma placa válida para a busca.');
    }

    const record = await service.findByPlaca(placa);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({
      found: Boolean(record),
      record
    });
  }
}
