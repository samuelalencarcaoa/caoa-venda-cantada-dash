import { SalesIntentionCatalogRepository } from '../repositories/SalesIntentionCatalogRepository';

export class SalesIntentionCatalogService {
  private repository = new SalesIntentionCatalogRepository();

  public async listAll() {
    return this.repository.findAll();
  }
}
