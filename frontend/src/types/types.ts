import type { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type TicketMetric = {
  date: string;
  type: "created" | "resolved";
  count: number;
};

export type SalesIntentionPayload = {
  proprietario: string;
  tipoVenda: string;
  bandeira: string;
  lojaVenda: string;
  marcaVeiculo: string;
  modelo?: string;
  versao: string;
  classificacao: string;
  quantidade: number;
  dataSolicitacao: string;
  ano_fabricacao?: number | null;
  ano_modelo?: number | null;
  placa: string;
  regional: string;
};
