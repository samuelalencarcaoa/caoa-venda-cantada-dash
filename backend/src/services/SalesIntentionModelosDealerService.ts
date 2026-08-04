import { SalesIntentionModelosDealerRepository } from '../repositories/SalesIntentionModelosDealerRepository';

export class SalesIntentionModelosDealerService {
  private repository = new SalesIntentionModelosDealerRepository();

  public async listAll() {
    return this.repository.findAll();
  }

  public async findByPlaca(placa: string) {
    return this.repository.findByPlaca(placa);
  }
}
