export type SalesIntentionModelosDealerRow = {
  Tipo_Venda: string;
  Marca: string;
  Modelo: string;
  Versao_Modelo: string;
};

export type SalesIntentionModelosDealerLookupRow = Record<string, string | number | null | undefined>;

export type SalesIntentionModelosDealerRecord = {
  tipoVenda: string;
  marca: string;
  modelo: string;
  versaoModelo: string;
};

export type SalesIntentionModelosDealerLookupRecord = {
  marcaVeiculo: string | null;
  modelo: string | null;
  versao: string | null;
  ano: string | null;
};

export type SalesIntentionModelosDealerLookupResponse = {
  found: boolean;
  record: SalesIntentionModelosDealerLookupRecord | null;
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
