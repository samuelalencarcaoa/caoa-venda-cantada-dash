export type SalesIntentionModelosDealerRow = {
  Tipo_Venda: string;
  Marca: string;
  Modelo: string;
  Versao_Modelo: string;
};

export type SalesIntentionModelosDealerRecord = {
  tipoVenda: string;
  marca: string;
  modelo: string;
  versaoModelo: string;
};

export type SalesIntentionModelosDealerSources = {
  tipoVenda: string[];
  marca: string[];
  modelo: string[];
  versaoModelo: string[];
};

export type SalesIntentionModelosDealerBundle = {
  version: 1;
  sources: SalesIntentionModelosDealerSources;
  combinations: SalesIntentionModelosDealerRecord[];
};
