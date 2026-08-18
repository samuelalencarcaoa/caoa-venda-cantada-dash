"use client";

import { useEffect, useMemo, useState } from "react";
import { VChart } from "@visactor/react-vchart";
import type { ILineChartSpec } from "@visactor/vchart";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { format } from "date-fns";
import { ChevronDown, CircleHelp, RefreshCw } from "lucide-react";
import {
  fetchSalesIntentionClassificacoes,
  fetchSalesIntentionCatalogs,
  fetchSalesIntentionModelosDealer,
} from "@/lib/salesIntentionApi";
import {
  themedBadgeClass,
  themedCardClass,
  themedChipClass,
  themedHeroClass,
  themedInputClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextMutedClass,
  themedTextStrongClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";
import type {
  SalesIntentionCatalogResponse,
  SalesIntentionCatalogSources,
  SalesIntentionModelosDealerRecord,
  SalesIntentionModelosDealerResponse,
  SalesIntentionModelosDealerSources,
} from "@/lib/salesIntentionApi";

const parseReportDate = (value: string): Date | null => {
  const [datePart, timePart = "00:00:00"] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTodayInputValue = () => format(new Date(), "yyyy-MM-dd");

const formatInputDate = (date: Date) => format(date, "yyyy-MM-dd");

const formatDisplayInputDate = (value: string) =>
  format(
    (() => {
      const [yearText, monthText, dayText] = value.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      return new Date(year, month - 1, day);
    })(),
    "dd/MM/yyyy",
  );

const buildLocalDateFromInput = (value: string, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const sortUniqueOptions = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value && value !== "Todos"),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

const tipoVendaLabels: Record<string, string> = {
  NOVOS: "Novos",
  SEMINOVOS: "Seminovos",
};

function formatTipoVendaLabel(value: string) {
  return tipoVendaLabels[normalizeValue(value)] ?? value;
}

const emptyCatalogSources: SalesIntentionCatalogSources = {
  tipoVenda: [],
  bandeira: [],
  regional: [],
  lojaVenda: [],
  classificacao: [],
};

const emptyModelosDealerSources: SalesIntentionModelosDealerSources = {
  tipoVenda: [],
  marca: [],
  modelo: [],
  versaoModelo: [],
};

const emptyVehicleCatalogRows: SalesIntentionModelosDealerRecord[] = [];

function normalizeValue(value: string) {
  return value.trim().toUpperCase();
}

function matchesSelectedValues(selected: string[], value: string) {
  return (
    selected.length === 0 ||
    selected.some((option) => normalizeValue(option) === normalizeValue(value))
  );
}

function TooltipIcon({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ajuda: ${text}`}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sky-500 transition hover:bg-sky-500/10 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 dark:text-cyan-300 dark:hover:bg-cyan-300/10 dark:hover:text-cyan-200"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 px-3 py-2 text-xs leading-5">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function FilterSelectCard({
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled = false,
  formatLabel,
}: {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  tooltip: string;
  disabled?: boolean;
  formatLabel?: (value: string) => string;
}) {
  const displayValue =
    value.length === 0
      ? "Todos"
      : value.length === 1
        ? (formatLabel?.(value[0]) ?? value[0])
        : `${value.length} selecionados`;

  const toggleOption = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, option])]);
      return;
    }

    onChange(value.filter((item) => item !== option));
  };

  return (
    <div className={cn(themedSoftCardClass, "min-w-0 rounded-2xl p-2.5")}>
      <div className="flex items-center gap-1.5">
        <p className={cn(themedTinyLabelClass, "truncate tracking-[0.18em]")}>{label}</p>
        <TooltipIcon text={tooltip} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label={`${label}: ${displayValue}`}
            className={cn(
              "mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
              themedInputClass,
            )}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", themedTextMutedClass)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 overflow-y-auto rounded-xl p-1.5"
        >
          <DropdownMenuLabel className="px-2 py-1 text-xs">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={value.length === 0}
            onCheckedChange={() => onChange([])}
          >
            Todos
          </DropdownMenuCheckboxItem>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={(checked) => toggleOption(option, checked === true)}
            >
              {formatLabel?.(option) ?? option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type RankingChartItem = { label: string; value: number };
type CompositionChartItem = { label: string; value: number; percentage: number };

const monitoringPalette = [
  { hex: "#0ea5e9", dot: "bg-sky-500" },
  { hex: "#22d3ee", dot: "bg-cyan-400" },
  { hex: "#2dd4bf", dot: "bg-teal-400" },
  { hex: "#818cf8", dot: "bg-indigo-400" },
  { hex: "#94a3b8", dot: "bg-slate-400" },
  { hex: "#38bdf8", dot: "bg-sky-400" },
] as const;

const rankingOptions = [
  { value: "bandeira", label: "Bandeiras" },
  { value: "marca", label: "Marcas" },
] as const;

const trendOptions = [
  { value: "volume", label: "Volume" },
  { value: "acumulado", label: "Acumulado" },
] as const;

const compositionOptions = [
  { value: "tipoVenda", label: "Tipo de venda" },
  { value: "classificacao", label: "Classificação" },
] as const;

type RankingDimension = (typeof rankingOptions)[number]["value"];
type TrendView = (typeof trendOptions)[number]["value"];
type CompositionDimension = (typeof compositionOptions)[number]["value"];

function ChartToggle({ options, value, onChange }: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5"
      role="group"
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition sm:text-[11px]",
              active
                ? "bg-sky-500 text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950"
                : "text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MonitoringTrendChartCard({
  spec,
  chartKey,
  hasData,
  view,
  onViewChange,
  grainLabel,
}: {
  spec: ILineChartSpec;
  chartKey: string;
  hasData: boolean;
  view: TrendView;
  onViewChange: (value: TrendView) => void;
  grainLabel: string;
}) {
  return (
    <article className={cn(themedCardClass, "min-w-0 px-5 py-5")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
              Ritmo das vendas cantadas
            </h2>
            <TooltipIcon text="Acompanha a evolução do volume no período. Alterne entre o movimento de cada intervalo e a visão acumulada." />
          </div>
          <span className={cn("mt-1 inline-flex max-w-full items-center px-2.5 py-1", themedChipClass)}>
            {grainLabel}
          </span>
        </div>
        <ChartToggle
          options={trendOptions}
          value={view}
          onChange={(value) => onViewChange(value as TrendView)}
        />
      </div>

      <div className="h-[300px] min-w-0 sm:h-[330px]">
        {hasData ? (
          <VChart key={chartKey} spec={spec} />
        ) : (
          <p className={cn("flex h-full items-center justify-center text-sm", themedTextMutedClass)}>
            Nenhum dado no período.
          </p>
        )}
      </div>
    </article>
  );
}

function MonitoringRankingChartCard({
  data,
  dimension,
  onDimensionChange,
}: {
  data: RankingChartItem[];
  dimension: RankingDimension;
  onDimensionChange: (value: RankingDimension) => void;
}) {
  const max = data[0]?.value || 1;
  const dimensionLabel = rankingOptions.find((option) => option.value === dimension)?.label;

  return (
    <article className={cn(themedCardClass, "min-h-[400px] min-w-0 px-5 py-5")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
              Ranking operacional
            </h2>
            <TooltipIcon text="Identifica rapidamente onde o volume está concentrado. Escolha a dimensão que deseja acompanhar." />
          </div>
          <span className={cn("mt-1 inline-flex max-w-full items-center px-2.5 py-1", themedChipClass)}>
            {dimensionLabel}
          </span>
        </div>
        <span className={cn("shrink-0 px-2.5 py-1 uppercase tracking-[0.22em]", themedChipClass)}>
          Top 10
        </span>
      </div>

      <div className="mb-4">
        <ChartToggle
          options={rankingOptions}
          value={dimension}
          onChange={(value) => onDimensionChange(value as RankingDimension)}
        />
      </div>

      <div className="max-h-[286px] space-y-3 overflow-y-auto pr-1">
        {data.length ? (
          data.map((item) => (
            <div key={item.label} title={`${item.label}: ${item.value.toLocaleString("pt-BR")}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className={cn("truncate font-medium", themedTextStrongClass)}>{item.label}</span>
                <span className={cn("rounded-full px-2 py-0.5 font-semibold", themedBadgeClass)}>
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                  style={{ width: item.value > 0 ? `${Math.max(5, (item.value / max) * 100)}%` : "0%" }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className={cn("py-24 text-center text-sm", themedTextMutedClass)}>
            Nenhum dado no período.
          </p>
        )}
      </div>
    </article>
  );
}

function MonitoringCompositionChartCard({
  data,
  total,
  dimension,
  onDimensionChange,
}: {
  data: CompositionChartItem[];
  total: number;
  dimension: CompositionDimension;
  onDimensionChange: (value: CompositionDimension) => void;
}) {
  let offset = 0;
  const donutBackground = data.length
    ? `conic-gradient(${data.map((item, index) => {
        const start = offset;
        offset += item.percentage;
        return `${monitoringPalette[index % monitoringPalette.length].hex} ${start}% ${offset}%`;
      }).join(", ")})`
    : "conic-gradient(#e2e8f0 0 100%)";

  return (
    <article className={cn(themedCardClass, "min-h-[400px] min-w-0 px-5 py-5")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
              Composição comercial
            </h2>
            <TooltipIcon text="Mostra como o volume total está distribuído por tipo de venda ou classificação comercial." />
          </div>
          <span className={cn("mt-1 inline-flex max-w-full items-center px-2.5 py-1", themedChipClass)}>
            Participação no volume
          </span>
        </div>
        <ChartToggle
          options={compositionOptions}
          value={dimension}
          onChange={(value) => onDimensionChange(value as CompositionDimension)}
        />
      </div>

      <div className="grid min-h-[306px] items-center gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        {data.length ? (
          <>
            <div className="flex justify-center">
              <div
                aria-label={`Distribuição de ${total.toLocaleString("pt-BR")} vendas cantadas`}
                className="relative h-40 w-40 rounded-full shadow-inner"
                role="img"
                style={{ background: donutBackground }}
              >
                <div className="absolute inset-[23%] flex flex-col items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-950">
                  <span className={cn("text-3xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
                    {total.toLocaleString("pt-BR")}
                  </span>
                  <span className={cn("text-[9px] font-semibold uppercase tracking-[0.2em]", themedTextMutedClass)}>
                    Volume
                  </span>
                </div>
              </div>
            </div>

            <div className="max-h-[286px] space-y-2 overflow-y-auto pr-1">
              {data.map((item, index) => {
                const color = monitoringPalette[index % monitoringPalette.length];

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/[0.06]"
                    title={`${item.label}: ${item.value.toLocaleString("pt-BR")} (${item.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={cn("flex min-w-0 items-center gap-2 font-medium", themedTextStrongClass)}>
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color.dot)} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className={cn("shrink-0 font-semibold tabular-nums", themedTextTitleClass)}>
                        {item.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color.hex, width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className={cn("min-w-8 text-right text-[10px] tabular-nums", themedTextMutedClass)}>
                        {item.value.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className={cn("col-span-full text-center text-sm", themedTextMutedClass)}>
            Nenhum dado no período.
          </p>
        )}
      </div>
    </article>
  );
}

export default function MarcaVeiculoRelatorioPage() {
  const {
    items: enhancedSalesIntention,
    isLoading: apiLoading,
    isRefreshing,
    error,
    refresh,
  } = useSalesIntentions(undefined, { searchAll: true });
  const [selectedTipoVenda, setSelectedTipoVenda] = useState<string[]>([]);
  const [selectedBandeira, setSelectedBandeira] = useState<string[]>([]);
  const [selectedLojaVenda, setSelectedLojaVenda] = useState<string[]>([]);
  const [selectedRegional, setSelectedRegional] = useState<string[]>([]);
  const [selectedMarcaVeiculo, setSelectedMarcaVeiculo] = useState<string[]>([]);
  const [selectedModelo, setSelectedModelo] = useState<string[]>([]);
  const [selectedVersao, setSelectedVersao] = useState<string[]>([]);
  const [selectedClassificacao, setSelectedClassificacao] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoFallbackDate, setAutoFallbackDate] = useState<string | null>(null);
  const [catalogData, setCatalogData] = useState<SalesIntentionCatalogResponse | null>(null);
  const [vehicleCatalogData, setVehicleCatalogData] = useState<SalesIntentionModelosDealerResponse | null>(null);
  const [classificacaoViewOptions, setClassificacaoViewOptions] = useState<string[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isVehicleCatalogLoading, setIsVehicleCatalogLoading] = useState(true);
  const [isClassificacaoLoading, setIsClassificacaoLoading] = useState(true);
  const [trendView, setTrendView] = useState<TrendView>("volume");
  const [rankingDimension, setRankingDimension] = useState<RankingDimension>("bandeira");
  const [compositionDimension, setCompositionDimension] =
    useState<CompositionDimension>("tipoVenda");
  const todayInput = useMemo(() => getTodayInputValue(), []);

  // Move all hooks BEFORE conditional returns
  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      setIsCatalogLoading(true);
      setIsVehicleCatalogLoading(true);
      setIsClassificacaoLoading(true);

      try {
        const [catalogResult, vehicleResult, classificacaoResult] = await Promise.allSettled([
          fetchSalesIntentionCatalogs(),
          fetchSalesIntentionModelosDealer(),
          fetchSalesIntentionClassificacoes(),
        ]);

        if (!active) return;

        if (catalogResult.status === "fulfilled") {
          setCatalogData(catalogResult.value);
        } else {
          setCatalogData(null);
        }

        if (vehicleResult.status === "fulfilled") {
          setVehicleCatalogData(vehicleResult.value);
        } else {
          setVehicleCatalogData(null);
        }

        if (classificacaoResult.status === "fulfilled") {
          setClassificacaoViewOptions(classificacaoResult.value);
        } else {
          setClassificacaoViewOptions([]);
        }
      } finally {
        if (active) {
          setIsCatalogLoading(false);
          setIsVehicleCatalogLoading(false);
          setIsClassificacaoLoading(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

  const catalogSources = catalogData?.sources ?? emptyCatalogSources;
  const vehicleCatalogSources = vehicleCatalogData?.sources ?? emptyModelosDealerSources;
  const vehicleCatalogRows = vehicleCatalogData?.combinations ?? emptyVehicleCatalogRows;
  const isOptionsLoading = isCatalogLoading || isVehicleCatalogLoading || isClassificacaoLoading;

  const tipoVendaOptions = useMemo(() => {
    const source =
      vehicleCatalogSources.tipoVenda.length > 0
        ? vehicleCatalogSources.tipoVenda
        : catalogSources.tipoVenda;

    if (source.length > 0) {
      return source;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Tipo_Venda));
  }, [catalogSources.tipoVenda, enhancedSalesIntention, vehicleCatalogSources.tipoVenda]);

  const bandeiraOptions = useMemo(() => {
    if (catalogSources.bandeira.length > 0) {
      return catalogSources.bandeira;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Bandeira || "Sem Bandeira"));
  }, [catalogSources.bandeira, enhancedSalesIntention]);

  const regionalOptions = useMemo(() => {
    if (catalogSources.regional.length > 0) {
      return catalogSources.regional;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Regional));
  }, [catalogSources.regional, enhancedSalesIntention]);

  const lojaVendaOptions = useMemo(() => {
    if (catalogSources.lojaVenda.length > 0) {
      return catalogSources.lojaVenda;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Loja_Venda));
  }, [catalogSources.lojaVenda, enhancedSalesIntention]);

  const marcaVeiculoOptions = useMemo(() => {
    if (vehicleCatalogSources.marca.length > 0) {
      return vehicleCatalogSources.marca;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Marca_Veiculo || "Sem Marca"));
  }, [enhancedSalesIntention, vehicleCatalogSources.marca]);

  const modeloOptions = useMemo(() => {
    return vehicleCatalogSources.modelo;
  }, [vehicleCatalogSources.modelo]);

  const versaoOptions = useMemo(() => {
    if (vehicleCatalogSources.versaoModelo.length > 0) {
      return vehicleCatalogSources.versaoModelo;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Versao));
  }, [enhancedSalesIntention, vehicleCatalogSources.versaoModelo]);

  const classificacaoOptions = useMemo(() => {
    if (classificacaoViewOptions.length > 0) {
      return classificacaoViewOptions;
    }

    if (catalogSources.classificacao.length > 0) {
      return catalogSources.classificacao;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Classificacao));
  }, [catalogSources.classificacao, classificacaoViewOptions, enhancedSalesIntention]);

  const latestAvailableDateInput = useMemo(() => {
    const latestDate = enhancedSalesIntention.reduce<Date | null>((latest, item) => {
      const current = parseReportDate(item.Data_solicitacao);
      if (!current) {
        return latest;
      }

      if (!latest || current > latest) {
        return current;
      }

      return latest;
    }, null);

    return latestDate ? formatInputDate(latestDate) : todayInput;
  }, [enhancedSalesIntention, todayInput]);

  const hasDataForToday = useMemo(
    () =>
      enhancedSalesIntention.some((item) => {
        const current = parseReportDate(item.Data_solicitacao);
        return current ? formatInputDate(current) === todayInput : false;
      }),
    [enhancedSalesIntention, todayInput],
  );

  const clearFilters = () => {
    setSelectedTipoVenda([]);
    setSelectedBandeira([]);
    setSelectedRegional([]);
    setSelectedLojaVenda([]);
    setSelectedMarcaVeiculo([]);
    setSelectedModelo([]);
    setSelectedVersao([]);
    setSelectedClassificacao([]);
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setRefreshTick((tick) => tick + 1);
  };

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) => {
        const itemTipoVenda = item.Tipo_Venda || "";
        const itemBandeira = item.Bandeira || "Sem Bandeira";
        const itemRegional = item.Regional || "";
        const itemLojaVenda = item.Loja_Venda || "";
        const itemMarcaVeiculo = item.Marca_Veiculo || "Sem Marca";
        const itemClassificacao = item.Classificacao || "";
        const itemVersao = item.Versao || "";
        const normalizedItemVersao = normalizeValue(itemVersao);

        const matchesModelo =
          selectedModelo.length === 0 ||
          vehicleCatalogRows.some(
            (row) =>
              normalizeValue(row.tipoVenda) === normalizeValue(itemTipoVenda) &&
              normalizeValue(row.marca) === normalizeValue(itemMarcaVeiculo) &&
              matchesSelectedValues(selectedModelo, row.modelo) &&
              normalizeValue(row.versaoModelo) === normalizedItemVersao,
          );

        const matchesTipoVenda = matchesSelectedValues(selectedTipoVenda, itemTipoVenda);
        const matchesBandeira = matchesSelectedValues(selectedBandeira, itemBandeira);
        const matchesRegional = matchesSelectedValues(selectedRegional, itemRegional);
        const matchesLojaVenda = matchesSelectedValues(selectedLojaVenda, itemLojaVenda);
        const matchesMarcaVeiculo = matchesSelectedValues(
          selectedMarcaVeiculo,
          itemMarcaVeiculo,
        );
        const matchesVersao = matchesSelectedValues(selectedVersao, itemVersao);
        const matchesClassificacao = matchesSelectedValues(
          selectedClassificacao,
          itemClassificacao,
        );

        let matchesDateRange = true;
        if (startDate || endDate) {
          const itemDate = parseReportDate(item.Data_solicitacao);
          if (!itemDate) {
            return false;
          }

          if (startDate) {
            const start = buildLocalDateFromInput(startDate);
            if (!start) {
              return false;
            }
            if (itemDate < start) matchesDateRange = false;
          }

          if (endDate) {
            const end = buildLocalDateFromInput(endDate, true);
            if (!end) {
              return false;
            }
            if (itemDate > end) matchesDateRange = false;
          }
        }

        return (
          matchesTipoVenda &&
          matchesBandeira &&
          matchesRegional &&
          matchesLojaVenda &&
          matchesMarcaVeiculo &&
          matchesModelo &&
          matchesVersao &&
          matchesClassificacao &&
          matchesDateRange
        );
      }),
    [
      enhancedSalesIntention,
      endDate,
      selectedBandeira,
      selectedClassificacao,
      selectedLojaVenda,
      selectedMarcaVeiculo,
      selectedModelo,
      selectedRegional,
      selectedTipoVenda,
      selectedVersao,
      startDate,
      vehicleCatalogRows,
    ],
  );

  const totalQuantity = filteredItems.reduce(
    (sum, item) => sum + (Number(item.Quantidade) || 0),
    0,
  );

  const averageQuantityPerRecord = filteredItems.length
    ? totalQuantity / filteredItems.length
    : 0;

  const activeBrands = useMemo(
    () =>
      new Set(
        filteredItems
          .map((item) => item.Marca_Veiculo?.trim())
          .filter((value): value is string => Boolean(value)),
      ).size,
    [filteredItems],
  );

  const trendChartData = useMemo(() => {
    const isSingleDay = Boolean(startDate && endDate && startDate === endDate);

    if (isSingleDay) {
      const hourlyValues = Array.from({ length: 24 }, (_, hour) => ({
        time: hour,
        label: formatHourLabel(hour),
        value: 0,
      }));
      let firstHour = 24;
      let lastHour = -1;

      filteredItems.forEach((item) => {
        const createdAt = parseReportDate(item.Criado);
        if (!createdAt) return;
        if (formatInputDate(createdAt) !== startDate) return;

        const hour = createdAt.getHours();
        hourlyValues[hour].value += Number(item.Quantidade) || 0;

        if (hour < firstHour) {
          firstHour = hour;
        }

        if (hour > lastHour) {
          lastHour = hour;
        }
      });

      if (firstHour === 24 || lastHour < 0) {
        return {
          grainLabel: "Visão por hora",
          values: [],
        };
      }

      const windowStart = Math.max(0, firstHour - 1);
      const windowEnd = Math.min(23, lastHour + 1);
      const visibleValues = hourlyValues.slice(windowStart, windowEnd + 1);

      let accumulated = 0;
      return {
        grainLabel: "Visão por hora",
        values: visibleValues.map((item) => {
          accumulated += item.value;
          return {
            ...item,
            quantity: trendView === "acumulado" ? accumulated : item.value,
          };
        }),
      };
    }

    const grouped = new Map<string, { time: number; label: string; value: number }>();

    filteredItems.forEach((item) => {
      const date = parseReportDate(item.Data_solicitacao);
      if (!date) return;

      const dateKey = format(date, "yyyy-MM-dd");
      const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const current = grouped.get(dateKey);
      grouped.set(dateKey, {
        time,
        label: format(date, "dd/MM/yy"),
        value: (current?.value || 0) + (Number(item.Quantidade) || 0),
      });
    });

    const dailyValues = Array.from(grouped.values()).sort((a, b) => a.time - b.time);
    const useMonthlyGrain = dailyValues.length > 45;
    const values = useMonthlyGrain
      ? Array.from(
          dailyValues.reduce((months, item) => {
            const date = new Date(item.time);
            const key = format(date, "yyyy-MM");
            const current = months.get(key);
            months.set(key, {
              time: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
              label: format(date, "MM/yy"),
              value: (current?.value || 0) + item.value,
            });
            return months;
          }, new Map<string, { time: number; label: string; value: number }>()).values(),
        ).sort((a, b) => a.time - b.time)
      : dailyValues;

    let accumulated = 0;
    return {
      grainLabel: useMonthlyGrain ? "Visão mensal" : "Visão diária",
      values: values.map((item) => {
        accumulated += item.value;
        return {
          ...item,
          quantity: trendView === "acumulado" ? accumulated : item.value,
        };
      }),
    };
  }, [endDate, filteredItems, startDate, trendView]);

  const trendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      data: [{ id: "monitoringTrend", values: trendChartData.values }],
      xField: "label",
      yField: "quantity",
      smooth: true,
      padding: [20, 24, 42, 42],
      color: ["#0ea5e9"],
      axes: [
        {
          orient: "bottom",
          label: { autoRotate: false, autoHide: true, autoHideMethod: "greedy" },
        },
        {
          orient: "left",
          label: {
            formatMethod: (text: string | string[]) =>
              Number(Array.isArray(text) ? text[0] : text).toLocaleString("pt-BR"),
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: true,
        mark: {
          title: { value: (datum) => datum?.label || "Período" },
          content: [
            {
              key: trendView === "acumulado" ? "Volume acumulado" : "Volume",
              value: (datum) => Number(datum?.quantity || 0).toLocaleString("pt-BR"),
            },
          ],
        },
      },
      point: {
        visible: true,
        style: { size: 7, fill: "#22d3ee", stroke: "#ffffff", lineWidth: 2 },
      },
      line: { style: { lineWidth: 3, curveType: "monotone" } },
      area: { visible: true, style: { fillOpacity: 0.12 } },
    }),
    [trendChartData.values, trendView],
  );

  const rankingChartData = useMemo(() => {
    const grouped = new Map<string, number>();
    const fieldByDimension = {
      bandeira: "Bandeira",
      marca: "Marca_Veiculo",
    } as const;
    const field = fieldByDimension[rankingDimension];

    filteredItems.forEach((item) => {
      const label = item[field]?.trim() || "Não informado";
      grouped.set(label, (grouped.get(label) || 0) + (Number(item.Quantidade) || 0));
    });

    return Array.from(grouped, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredItems, rankingDimension]);

  const compositionChartData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const rawLabel =
        compositionDimension === "tipoVenda" ? item.Tipo_Venda : item.Classificacao;
      const label = rawLabel?.trim()
        ? compositionDimension === "tipoVenda"
          ? formatTipoVendaLabel(rawLabel.trim())
          : rawLabel.trim()
        : "Não informado";
      grouped.set(label, (grouped.get(label) || 0) + (Number(item.Quantidade) || 0));
    });

    return Array.from(grouped, ([label, value]) => ({
      label,
      value,
      percentage: totalQuantity > 0 ? (value / totalQuantity) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
  }, [compositionDimension, filteredItems, totalQuantity]);

  const lastUpdatedText = lastUpdated ? format(lastUpdated, "dd/MM/yyyy HH:mm:ss") : "Carregando...";

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (hasDataForToday) {
      setAutoFallbackDate(null);
    }
  }, [hasDataForToday]);

  useEffect(() => {
    if (startDate !== todayInput || endDate !== todayInput) {
      return;
    }

    if (hasDataForToday) {
      return;
    }

    if (latestAvailableDateInput !== todayInput) {
      setStartDate(latestAvailableDateInput);
      setEndDate(latestAvailableDateInput);
      setAutoFallbackDate(latestAvailableDateInput);
    }
  }, [endDate, hasDataForToday, latestAvailableDateInput, startDate, todayInput]);

  const activePeriodText = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return startDate === todayInput
          ? "Período ativo: Hoje"
          : `Período ativo: ${formatDisplayInputDate(startDate)}`;
      }

      return `Período ativo: ${formatDisplayInputDate(startDate)} a ${formatDisplayInputDate(endDate)}`;
    }

    if (startDate) {
      return `Período ativo: a partir de ${formatDisplayInputDate(startDate)}`;
    }

    if (endDate) {
      return `Período ativo: até ${formatDisplayInputDate(endDate)}`;
    }

    return "Período ativo: intervalo livre";
  }, [endDate, startDate, todayInput]);

  const fallbackNotice = useMemo(() => {
    if (!autoFallbackDate) {
      return null;
    }

    return `Hoje sem dados, usando ${formatDisplayInputDate(autoFallbackDate)}`;
  }, [autoFallbackDate]);

  const handleStartDateChange = (value: string) => {
    setAutoFallbackDate(null);
    setStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    setAutoFallbackDate(null);
    setEndDate(value);
  };

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [
    selectedTipoVenda,
    selectedBandeira,
    selectedRegional,
    selectedLojaVenda,
    selectedMarcaVeiculo,
    selectedModelo,
    selectedVersao,
    selectedClassificacao,
    startDate,
    endDate,
    refreshTick,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsLoading(true);
      setRefreshTick((tick) => tick + 1);
      setLastUpdated(new Date());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  if (apiLoading) {
    return (
      <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
          <section className={cn(themedHeroClass, "h-[156px] animate-pulse")} />

          <section className={cn(themedPanelClass, "p-6")}>
            <div className="mb-6 h-6 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={cn(themedSoftCardClass, "p-4")}>
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                  <div className="mt-3 h-[58px] animate-pulse rounded-2xl bg-white dark:bg-slate-950/80" />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={cn(themedSoftCardClass, "p-4")}>
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                  <div className="mt-3 h-[58px] animate-pulse rounded-2xl bg-white dark:bg-slate-950/80" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={cn(themedCardClass, "p-5")}>
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="mt-3 h-10 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </section>

          <section className={cn(themedCardClass, "p-5")}>
            <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="h-40 rounded-2xl bg-slate-100/70 dark:bg-white/5" />
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
          <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80 dark:text-cyan-200/80">
              Relatório
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Visão global por Marca de Veículo
            </h1>
          </section>

          <section className={cn(themedPanelClass, "border-rose-200 p-6 dark:border-rose-400/20")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-600 dark:text-rose-300">
              Falha ao carregar os dados
            </p>
            <h2 className={cn("mt-2 text-2xl font-semibold", themedTextTitleClass)}>
              Não conseguimos mostrar a visão de marca agora
            </h2>
            <p className={cn("mt-3 text-sm leading-6", themedTextBodyClass)}>{error}</p>
            <div className="mt-6">
              <Button type="button" onClick={() => void refresh()} disabled={isRefreshing}>
                {isRefreshing ? "Tentando novamente..." : "Tentar novamente"}
              </Button>
            </div>
          </section>
        </div>
      </main>
    );
  }
  return (
    <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
                Relatório
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Visão global por Marca de Veículo
                </h1>
                <TooltipIcon text="Os indicadores e a listagem abaixo respondem aos filtros de bandeira, loja de venda, regional, tipo de venda, classificação, marca e período." />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Última atualização: {lastUpdatedText}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {isLoading ? "Atualizando..." : "Dados prontos"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-sky-50/90">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {activePeriodText}
                </span>
                {fallbackNotice ? (
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-100">
                    {fallbackNotice}
                  </span>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void refresh({ silent: true })}
              className={cn("h-10 shrink-0 rounded-full px-4 text-xs font-semibold", themedOutlineButtonClass)}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </section>

        <section className={cn(themedPanelClass, "p-4")}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className={cn("text-base font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                Filtros
              </h2>
              <p className={cn("text-xs", themedTextMutedClass)}>
                Combine uma ou mais opções em qualquer campo.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className={cn("h-8 shrink-0 rounded-full px-3 text-xs font-semibold", themedOutlineButtonClass)}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <FilterSelectCard
              label="Tipo de venda"
              value={selectedTipoVenda}
              options={tipoVendaOptions}
              onChange={setSelectedTipoVenda}
              tooltip="Filtro aplicado por tipo de venda."
              disabled={isOptionsLoading}
              formatLabel={formatTipoVendaLabel}
            />
            <FilterSelectCard
              label="Bandeira"
              value={selectedBandeira}
              options={bandeiraOptions}
              onChange={setSelectedBandeira}
              tooltip="Filtro aplicado por bandeira."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Regional"
              value={selectedRegional}
              options={regionalOptions}
              onChange={setSelectedRegional}
              tooltip="Filtro aplicado por regional."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Loja de Venda"
              value={selectedLojaVenda}
              options={lojaVendaOptions}
              onChange={setSelectedLojaVenda}
              tooltip="Filtro aplicado por loja de venda."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Marca veículo"
              value={selectedMarcaVeiculo}
              options={marcaVeiculoOptions}
              onChange={setSelectedMarcaVeiculo}
              tooltip="Filtro aplicado por marca do veículo."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Modelo"
              value={selectedModelo}
              options={modeloOptions}
              onChange={setSelectedModelo}
              tooltip="Filtro aplicado por modelo."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Versão"
              value={selectedVersao}
              options={versaoOptions}
              onChange={setSelectedVersao}
              tooltip="Filtro aplicado por versão."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Classificação"
              value={selectedClassificacao}
              options={classificacaoOptions}
              onChange={setSelectedClassificacao}
              tooltip="Filtro aplicado por classificação."
              disabled={isOptionsLoading}
            />

            <div className={cn(themedSoftCardClass, "rounded-2xl p-2.5 sm:col-span-2")}>
              <div className="flex items-center gap-1.5">
                <p className={cn(themedTinyLabelClass, "tracking-[0.18em]")}>Período</p>
                <TooltipIcon text="Filtro aplicado por período da solicitação." />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span
                    className={cn(
                      "sr-only",
                      themedTextMutedClass,
                    )}
                  >
                    De
                  </span>
                  <input
                    type="date"
                    max={endDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={startDate}
                    onChange={(event) => handleStartDateChange(event.target.value)}
                  />
                </label>
                <label className="min-w-0">
                  <span
                    className={cn(
                      "sr-only",
                      themedTextMutedClass,
                    )}
                  >
                    Até
                  </span>
                  <input
                    type="date"
                    min={startDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={endDate}
                    onChange={(event) => handleEndDateChange(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={cn(themedCardClass, "p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Volume total
            </p>
            <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
              {totalQuantity.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Soma das vendas cantadas no recorte.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Intenções registradas
            </p>
            <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
              {filteredItems.length.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Registros que sustentam a análise.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Média por intenção
            </p>
            <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
              {averageQuantityPerRecord.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Quantidade média informada por registro.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Marcas ativas
            </p>
            <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
              {activeBrands.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Marcas com movimentação no recorte atual.
            </p>
          </div>
        </section>

        <section aria-labelledby="charts-section-title" className="space-y-4">
          <div className="px-1">
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>Análise executiva</p>
            <h2
              id="charts-section-title"
              className={cn("mt-1 text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}
            >
              Monitoramento das vendas cantadas
            </h2>
            <p className={cn("mt-1 text-xs", themedTextBodyClass)}>
              Acompanhe ritmo, concentração e composição usando as visões interativas.
            </p>
          </div>

          <MonitoringTrendChartCard
            spec={trendChartSpec}
            chartKey={`${trendView}-${JSON.stringify(trendChartData.values)}`}
            hasData={trendChartData.values.length > 0}
            view={trendView}
            onViewChange={setTrendView}
            grainLabel={trendChartData.grainLabel}
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <MonitoringRankingChartCard
              data={rankingChartData}
              dimension={rankingDimension}
              onDimensionChange={setRankingDimension}
            />

            <MonitoringCompositionChartCard
              data={compositionChartData}
              total={totalQuantity}
              dimension={compositionDimension}
              onDimensionChange={setCompositionDimension}
            />
          </div>
        </section>

        <SalesIntentionDataList
          items={filteredItems}
          exportFilePrefix="relatorio-marca"
          className="mt-1"
        />
      </div>
    </main>
  );
}
