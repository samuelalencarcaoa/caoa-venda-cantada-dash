import { SalesIntentionClassificacaoVendaRepository } from '../repositories/SalesIntentionClassificacaoVendaRepository';

export class SalesIntentionClassificacaoVendaService {
  private repository = new SalesIntentionClassificacaoVendaRepository();

  public async listAll() {
    return this.repository.findAll();
  }
}
