export type SalesIntentionCatalogRow = {
  Tipo_Venda: string;
  Bandeira: string;
  Regional: string;
  Loja_Venda: string;
  Marca_Veiculo: string;
  Versao: string;
  Classificacao: string;
};

export type SalesIntentionCatalogRecord = {
  tipoVenda: string;
  bandeira: string;
  regional: string;
  lojaVenda: string;
  marcaVeiculo: string;
  versao: string;
  classificacao: string;
};

export type SalesIntentionCatalogHierarchyRecord = {
  bandeira: string;
  regional: string;
  lojaVenda: string;
};

export type SalesIntentionCatalogSources = {
  tipoVenda: string[];
  bandeira: string[];
  regional: string[];
  lojaVenda: string[];
  classificacao: string[];
};

export type SalesIntentionCatalogBundle = {
  version: 3;
  sources: SalesIntentionCatalogSources;
  hierarchy: SalesIntentionCatalogHierarchyRecord[];
  combinations: SalesIntentionCatalogRecord[];
};
