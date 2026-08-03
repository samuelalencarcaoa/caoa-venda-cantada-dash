import { Request, Response } from 'express';
import { SalesIntentionModelosDealerService } from '../services/SalesIntentionModelosDealerService';

const service = new SalesIntentionModelosDealerService();

export class SalesIntentionModelosDealerController {
  public async list(_req: Request, res: Response) {
    const catalog = await service.listAll();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(catalog);
  }
}
