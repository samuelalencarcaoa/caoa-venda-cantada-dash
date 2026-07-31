import { SalesIntentionPayload } from '../entities/SalesIntention';
import {
  SalesIntentionRepository,
  type SalesIntentionSearchFilters
} from '../repositories/SalesIntentionRepository';

export class SalesIntentionService {
  private repository = new SalesIntentionRepository();

  public async listAll(dateRange?: { gte: Date; lt: Date }, tipoVenda?: string) {
    return this.repository.findAll(dateRange, tipoVenda);
  }

  public async search(filters: SalesIntentionSearchFilters) {
    return this.repository.search(filters);
  }

  public async getById(id: number) {
    return this.repository.findById(id);
  }

  public async create(payload: SalesIntentionPayload) {
    return this.repository.create(payload);
  }

  public async update(id: number, payload: Partial<SalesIntentionPayload>) {
    const record = await this.repository.findById(id);
    if (!record) {
      return null;
    }

    return this.repository.update(id, payload);
  }

  public async remove(id: number) {
    const record = await this.repository.findById(id);
    if (!record) {
      return false;
    }

    return this.repository.delete(id);
  }
}
