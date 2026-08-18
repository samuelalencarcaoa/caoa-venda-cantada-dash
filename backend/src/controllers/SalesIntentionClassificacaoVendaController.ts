import { Request, Response } from 'express';
import { SalesIntentionClassificacaoVendaService } from '../services/SalesIntentionClassificacaoVendaService';

const service = new SalesIntentionClassificacaoVendaService();

export class SalesIntentionClassificacaoVendaController {
  public async list(_req: Request, res: Response) {
    const classificacoes = await service.listAll();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(classificacoes);
  }
}
