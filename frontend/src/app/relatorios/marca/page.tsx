"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VChart } from "@visactor/react-vchart";
import type { ILineChartSpec } from "@visactor/vchart";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { useHorizontalDragScroll } from "@/hooks/use-horizontal-drag-scroll";
import { Button } from "@/components/ui/button";
import {
  FilterDateInput,
  FilterSelectCard,
  TooltipIcon,
} from "@/components/sales-intention-filter-select-card";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { MobileDetailedTableModal } from "@/components/mobile-detailed-table-modal";
import { addYears, format, subYears } from "date-fns";
import { ChevronDown, NotebookText, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SalesIntentionReportRow,
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

function areStringSelectionsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const normalizedRight = new Set(right.map((value) => normalizeValue(value)));
  return left.every((value) => normalizedRight.has(normalizeValue(value)));
}

type RankingChartItem = { label: string; value: number };
type CompositionChartItem = { label: string; value: number; percentage: number };

const monitoringPalette = [
  { hex: "#0ea5e9", dot: "bg-sky-500" },
  { hex: "#f59e0b", dot: "bg-amber-500" },
  { hex: "#22d3ee", dot: "bg-cyan-400" },
  { hex: "#f43f5e", dot: "bg-rose-500" },
  { hex: "#2dd4bf", dot: "bg-teal-400" },
  { hex: "#f97316", dot: "bg-orange-500" },
  { hex: "#818cf8", dot: "bg-indigo-400" },
  { hex: "#a855f7", dot: "bg-purple-500" },
  { hex: "#38bdf8", dot: "bg-sky-400" },
  { hex: "#e11d48", dot: "bg-rose-600" },
] as const;
const totalSeriesColor = "#0f172a";
const totalSeriesLabel = "Total";

function formatAxisValue(value: number) {
  if (Math.abs(value) < 1000) {
    return value.toLocaleString("pt-BR");
  }

  return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
}

const rankingOptions = [
  { value: "bandeira", label: "Bandeiras" },
  { value: "marca", label: "Marcas" },
] as const;

const trendOptions = [
  { value: "volume", label: "Volume" },
  { value: "acumulado", label: "Acumulado" },
] as const;

const trendMetricOptions = [
  { value: "total", label: "Total" },
  { value: "quant", label: "Quant." },
] as const;

const comparisonDimensionOptions = [
  { value: "marca", label: "Marcas" },
  { value: "versao", label: "Versões" },
] as const;

const MAX_COMPARISON_SERIES = 10;

const compositionOptions = [
  { value: "tipoVenda", label: "Tipo de venda" },
  { value: "classificacao", label: "Classificação" },
] as const;

type RankingDimension = (typeof rankingOptions)[number]["value"];
type TrendView = (typeof trendOptions)[number]["value"];
type CompositionDimension = (typeof compositionOptions)[number]["value"];
type TrendMetric = (typeof trendMetricOptions)[number]["value"];
type ComparisonDimension = (typeof comparisonDimensionOptions)[number]["value"];

const DEFAULT_TREND_VIEW: TrendView = "volume";
const DEFAULT_TREND_METRIC: TrendMetric = "total";

type MonitoringTrendPoint = {
  label: string;
  time: number;
  hour: number;
  series: string;
  quantity: number;
};

type MonitoringTooltipSeriesDatum = { datum?: MonitoringTrendPoint[] };
type MonitoringTooltipDataItem =
  | MonitoringTooltipSeriesDatum
  | { data?: MonitoringTooltipSeriesDatum[] };

function getMonitoringTooltipPoints(data: MonitoringTooltipDataItem[] | undefined) {
  return (data ?? []).flatMap((item) => {
    if (Array.isArray((item as { data?: MonitoringTooltipSeriesDatum[] }).data)) {
      return (item as { data: MonitoringTooltipSeriesDatum[] }).data;
    }

    return [item as MonitoringTooltipSeriesDatum];
  });
}

function MonitoringSeriesLegend({ items }: { items: string[] }) {
  return (
    <div className="flex max-h-20 flex-wrap justify-center gap-x-4 gap-y-1.5 overflow-y-auto px-2">
      {items.slice(0, MAX_COMPARISON_SERIES).map((item, index) => {
        const color = item === totalSeriesLabel
          ? totalSeriesColor
          : monitoringPalette[
              (index - (items[0] === totalSeriesLabel ? 1 : 0)) % monitoringPalette.length
            ].hex;

        return (
          <span key={item} className="inline-flex min-w-0 items-center gap-1.5 text-[10px]" title={item}>
            <span className="w-4 shrink-0 border-t-2" style={{ borderColor: color }} />
            <span className={cn("max-w-32 truncate", item === totalSeriesLabel ? themedTextStrongClass : themedTextMutedClass)}>
              {item}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function MonitoringComparisonSelector({
  options,
  value,
  onChange,
  dimension,
  onDimensionChange,
  trendView,
  onTrendViewChange,
  trendMetric,
  onTrendMetricChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  dimension: ComparisonDimension;
  onDimensionChange: (value: ComparisonDimension) => void;
  trendView: TrendView;
  onTrendViewChange: (value: TrendView) => void;
  trendMetric: TrendMetric;
  onTrendMetricChange: (value: TrendMetric) => void;
}) {
  const limitReached = value.length >= MAX_COMPARISON_SERIES;
  const displayValue = value.length
    ? `${value.length} selecionada${value.length > 1 ? "s" : ""}`
    : "Selecionar";

  const toggleOption = (option: string, checked: boolean) => {
    if (checked) {
      if (limitReached && !value.includes(option)) return;
      onChange([...new Set([...value, option])]);
    } else {
      onChange(value.filter((item) => item !== option));
    }
  };

  return (
    <div className={cn(themedSoftCardClass, "min-w-[250px] rounded-2xl p-3 sm:min-w-[270px]")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className={cn(themedTinyLabelClass, "tracking-[0.18em]")}>Comparativo</p>
          <TooltipIcon text="Selecione Total e até 9 marcas ou versões para comparar as linhas no período." />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ChartToggle options={trendOptions} value={trendView} onChange={(value) => onTrendViewChange(value as TrendView)} />
        <ChartToggle options={trendMetricOptions} value={trendMetric} onChange={(value) => onTrendMetricChange(value as TrendMetric)} />
      </div>

      <div className="mt-2">
        <ChartToggle options={comparisonDimensionOptions} value={dimension} onChange={(value) => onDimensionChange(value as ComparisonDimension)} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!options.length}>
          <button type="button" disabled={!options.length} className={cn("mt-3 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs outline-none transition disabled:cursor-not-allowed disabled:opacity-60", themedInputClass)}>
            <span className="truncate">{options.length ? displayValue : "Sem dados"}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", themedTextMutedClass)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 overflow-y-auto rounded-xl p-1.5">
          <DropdownMenuLabel className="px-2 py-1 text-xs">{comparisonDimensionOptions.find((item) => item.value === dimension)?.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem key={option} checked={value.includes(option)} disabled={limitReached && !value.includes(option)} onCheckedChange={(checked) => toggleOption(option, checked === true)}>
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}

function ChartToggle({ options, value, onChange }: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const chartToggleDrag = useHorizontalDragScroll<HTMLDivElement>();

  return (
    <div
      ref={chartToggleDrag.ref}
      onPointerDown={chartToggleDrag.onPointerDown}
      onPointerMove={chartToggleDrag.onPointerMove}
      onPointerUp={chartToggleDrag.onPointerUp}
      onPointerCancel={chartToggleDrag.onPointerCancel}
      className="inline-flex min-w-0 max-w-full cursor-grab gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 select-none active:cursor-grabbing dark:border-white/10 dark:bg-white/5"
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
              "shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition sm:text-[11px]",
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
  grainLabel,
  comparisonOptions,
  selectedComparison,
  legendItems,
  onComparisonChange,
  comparisonDimension,
  onComparisonDimensionChange,
  trendView,
  onTrendViewChange,
  trendMetric,
  onTrendMetricChange,
}: {
  spec: ILineChartSpec;
  chartKey: string;
  hasData: boolean;
  grainLabel: string;
  comparisonOptions: string[];
  selectedComparison: string[];
  legendItems: string[];
  onComparisonChange: (value: string[]) => void;
  comparisonDimension: ComparisonDimension;
  onComparisonDimensionChange: (value: ComparisonDimension) => void;
  trendView: TrendView;
  onTrendViewChange: (value: TrendView) => void;
  trendMetric: TrendMetric;
  onTrendMetricChange: (value: TrendMetric) => void;
}) {
  return (
    <article className={cn(themedCardClass, "min-w-0 px-4 py-4 sm:px-5 sm:py-5")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-medium tracking-[-0.01em]", themedTextTitleClass)}>
              Ritmo das vendas cantadas
            </h2>
            <TooltipIcon text="Acompanha a evolução do volume no período. Alterne entre o movimento de cada intervalo e a visão acumulada." />
          </div>
          <span className={cn("mt-1 inline-flex max-w-full items-center px-2.5 py-1", themedChipClass)}>
            {grainLabel}
          </span>
        </div>
        <MonitoringComparisonSelector
          options={comparisonOptions}
          value={selectedComparison}
          onChange={onComparisonChange}
          dimension={comparisonDimension}
          onDimensionChange={onComparisonDimensionChange}
          trendView={trendView}
          onTrendViewChange={onTrendViewChange}
          trendMetric={trendMetric}
          onTrendMetricChange={onTrendMetricChange}
        />
      </div>

      <div className="mb-3 flex justify-center">
        <MonitoringSeriesLegend items={legendItems} />
      </div>

      <div id="monitoring-trend-chart" className="relative h-[300px] min-w-0 sm:h-[330px]">
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
    <article className={cn(themedCardClass, "min-h-[400px] min-w-0 px-4 py-4 sm:px-5 sm:py-5")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-medium tracking-[-0.01em]", themedTextTitleClass)}>
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

      <div className="mb-4 min-w-0">
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
                <span className={cn("rounded-full px-2 py-0.5 font-medium", themedBadgeClass)}>
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
    <article className={cn(themedCardClass, "min-h-[400px] min-w-0 px-4 py-4 sm:px-5 sm:py-5")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-medium tracking-[-0.01em]", themedTextTitleClass)}>
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

      <div className="grid min-h-[306px] grid-cols-[minmax(92px,104px)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        {data.length ? (
          <>
            <div className="flex justify-center">
              <div
                aria-label={`Distribuição de ${total.toLocaleString("pt-BR")} vendas cantadas`}
                className="relative h-24 w-24 rounded-full shadow-inner sm:h-40 sm:w-40"
                role="img"
                style={{ background: donutBackground }}
              >
                <div className="absolute inset-[23%] flex flex-col items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-950">
                  <span className={cn("text-xl font-light tracking-[-0.05em] sm:text-3xl", themedTextTitleClass)}>
                    {total.toLocaleString("pt-BR")}
                  </span>
                  <span className={cn("text-[8px] font-medium uppercase tracking-[0.2em] sm:text-[9px]", themedTextMutedClass)}>
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
                      <span className={cn("shrink-0 font-medium tabular-nums", themedTextTitleClass)}>
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
  const [appliedTipoVenda, setAppliedTipoVenda] = useState<string[]>([]);
  const [appliedBandeira, setAppliedBandeira] = useState<string[]>([]);
  const [appliedLojaVenda, setAppliedLojaVenda] = useState<string[]>([]);
  const [appliedRegional, setAppliedRegional] = useState<string[]>([]);
  const [appliedMarcaVeiculo, setAppliedMarcaVeiculo] = useState<string[]>([]);
  const [appliedModelo, setAppliedModelo] = useState<string[]>([]);
  const [appliedVersao, setAppliedVersao] = useState<string[]>([]);
  const [appliedClassificacao, setAppliedClassificacao] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [appliedStartDate, setAppliedStartDate] = useState<string>(() => getTodayInputValue());
  const [appliedEndDate, setAppliedEndDate] = useState<string>(() => getTodayInputValue());
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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isDesktopFiltersOpen, setIsDesktopFiltersOpen] = useState(false);
  const [isDetailedTableModalOpen, setIsDetailedTableModalOpen] = useState(false);
  const [trendView, setTrendView] = useState<TrendView>(DEFAULT_TREND_VIEW);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>(DEFAULT_TREND_METRIC);
  const [comparisonDimension, setComparisonDimension] = useState<ComparisonDimension>("marca");
  const [selectedComparison, setSelectedComparison] = useState<string[]>([totalSeriesLabel]);
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
    return classificacaoViewOptions;
  }, [classificacaoViewOptions]);

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
    setAppliedTipoVenda([]);
    setAppliedBandeira([]);
    setAppliedRegional([]);
    setAppliedLojaVenda([]);
    setAppliedMarcaVeiculo([]);
    setAppliedModelo([]);
    setAppliedVersao([]);
    setAppliedClassificacao([]);
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setAppliedStartDate(latestAvailableDateInput);
    setAppliedEndDate(latestAvailableDateInput);
    setRefreshTick((tick) => tick + 1);
    setIsMobileFiltersOpen(false);
  };

  const applyFilters = () => {
    setAppliedTipoVenda(selectedTipoVenda);
    setAppliedBandeira(selectedBandeira);
    setAppliedRegional(selectedRegional);
    setAppliedLojaVenda(selectedLojaVenda);
    setAppliedMarcaVeiculo(selectedMarcaVeiculo);
    setAppliedModelo(selectedModelo);
    setAppliedVersao(selectedVersao);
    setAppliedClassificacao(selectedClassificacao);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setRefreshTick((tick) => tick + 1);
  };

  const hasPendingFilterChanges = useMemo(
    () =>
      !areStringSelectionsEqual(selectedTipoVenda, appliedTipoVenda) ||
      !areStringSelectionsEqual(selectedBandeira, appliedBandeira) ||
      !areStringSelectionsEqual(selectedRegional, appliedRegional) ||
      !areStringSelectionsEqual(selectedLojaVenda, appliedLojaVenda) ||
      !areStringSelectionsEqual(selectedMarcaVeiculo, appliedMarcaVeiculo) ||
      !areStringSelectionsEqual(selectedModelo, appliedModelo) ||
      !areStringSelectionsEqual(selectedVersao, appliedVersao) ||
      !areStringSelectionsEqual(selectedClassificacao, appliedClassificacao) ||
      startDate !== appliedStartDate ||
      endDate !== appliedEndDate,
    [
      appliedBandeira,
      appliedClassificacao,
      appliedEndDate,
      appliedLojaVenda,
      appliedMarcaVeiculo,
      appliedModelo,
      appliedRegional,
      appliedStartDate,
      appliedTipoVenda,
      appliedVersao,
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
    ],
  );

  const startDateMin = useMemo(() => {
    if (!endDate) {
      return undefined;
    }

    const endDateValue = buildLocalDateFromInput(endDate, true);
    return endDateValue ? format(subYears(endDateValue, 2), "yyyy-MM-dd") : undefined;
  }, [endDate]);

  const startDateMax = endDate || undefined;

  const endDateMin = startDate || undefined;

  const endDateMax = useMemo(() => {
    if (!startDate) {
      return undefined;
    }

    const startDateValue = buildLocalDateFromInput(startDate);
    return startDateValue ? format(addYears(startDateValue, 2), "yyyy-MM-dd") : undefined;
  }, [startDate]);

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
          appliedModelo.length === 0 ||
          vehicleCatalogRows.some(
            (row) =>
              normalizeValue(row.tipoVenda) === normalizeValue(itemTipoVenda) &&
              normalizeValue(row.marca) === normalizeValue(itemMarcaVeiculo) &&
              matchesSelectedValues(appliedModelo, row.modelo) &&
              normalizeValue(row.versaoModelo) === normalizedItemVersao,
          );

        const matchesTipoVenda = matchesSelectedValues(appliedTipoVenda, itemTipoVenda);
        const matchesBandeira = matchesSelectedValues(appliedBandeira, itemBandeira);
        const matchesRegional = matchesSelectedValues(appliedRegional, itemRegional);
        const matchesLojaVenda = matchesSelectedValues(appliedLojaVenda, itemLojaVenda);
        const matchesMarcaVeiculo = matchesSelectedValues(
          appliedMarcaVeiculo,
          itemMarcaVeiculo,
        );
        const matchesVersao = matchesSelectedValues(appliedVersao, itemVersao);
        const matchesClassificacao = matchesSelectedValues(
          appliedClassificacao,
          itemClassificacao,
        );

        let matchesDateRange = true;
        if (appliedStartDate || appliedEndDate) {
          const itemDate = parseReportDate(item.Data_solicitacao);
          if (!itemDate) {
            return false;
          }

          if (appliedStartDate) {
            const start = buildLocalDateFromInput(appliedStartDate);
            if (!start) {
              return false;
            }
            if (itemDate < start) matchesDateRange = false;
          }

          if (appliedEndDate) {
            const end = buildLocalDateFromInput(appliedEndDate, true);
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
      appliedBandeira,
      appliedClassificacao,
      appliedEndDate,
      appliedLojaVenda,
      appliedMarcaVeiculo,
      appliedModelo,
      appliedRegional,
      appliedStartDate,
      appliedTipoVenda,
      appliedVersao,
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

  const getComparisonLabel = useCallback(
    (item: SalesIntentionReportRow) =>
      comparisonDimension === "marca"
        ? item.Marca_Veiculo?.trim() || "Não informado"
        : item.Versao?.trim() || "Não informado",
    [comparisonDimension],
  );

  const comparisonOptions = useMemo(() => {
    const totals = new Map<string, number>();
    filteredItems.forEach((item) => {
      const label = getComparisonLabel(item);
      totals.set(label, (totals.get(label) || 0) + (Number(item.Quantidade) || 0));
    });
    return Array.from(totals.keys()).sort((left, right) => {
      return (totals.get(right) || 0) - (totals.get(left) || 0) || left.localeCompare(right, "pt-BR");
    });
  }, [filteredItems, getComparisonLabel]);

  const comparisonFilterOptions = useMemo(
    () => [totalSeriesLabel, ...comparisonOptions],
    [comparisonOptions],
  );

  const trendChartData = useMemo<MonitoringTrendPoint[]>(() => {
    const selectedLabels = selectedComparison
      .filter((label) => label === totalSeriesLabel || comparisonOptions.includes(label))
      .slice(0, MAX_COMPARISON_SERIES);

    const isSingleDay = Boolean(appliedStartDate && appliedEndDate && appliedStartDate === appliedEndDate);
    const grouped = new Map<string, { time: number; label: string; totals: Map<string, number> }>();

    filteredItems.forEach((item) => {
      const date = parseReportDate(isSingleDay ? item.Criado : item.Data_solicitacao);
      if (!date) return;
      if (isSingleDay && formatInputDate(date) !== appliedStartDate) return;

      const key = isSingleDay ? String(date.getHours()) : format(date, "yyyy-MM-dd");
      const time = isSingleDay
        ? date.getHours()
        : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const current = grouped.get(key) || {
        time,
        label: isSingleDay ? formatHourLabel(date.getHours()) : format(date, "dd/MM/yy"),
        totals: new Map<string, number>(),
      };
      const label = getComparisonLabel(item);
      const value = trendMetric === "total" ? 1 : Number(item.Quantidade) || 0;
      current.totals.set(label, (current.totals.get(label) || 0) + value);
      grouped.set(key, current);
    });

    const rows = Array.from(grouped.values()).sort((a, b) => a.time - b.time);
    const seriesLabels = selectedLabels;
    const accumulated = new Map(seriesLabels.map((label) => [label, 0]));
    return rows.flatMap((row) => seriesLabels.map((label) => {
      const value = label === totalSeriesLabel
        ? Array.from(row.totals.values()).reduce((sum, current) => sum + current, 0)
        : row.totals.get(label) || 0;
      const nextValue = trendView === "acumulado" ? (accumulated.get(label) || 0) + value : value;
      accumulated.set(label, nextValue);
      return { label: row.label, time: row.time, hour: isSingleDay ? row.time : new Date(row.time).getHours(), series: label, quantity: nextValue };
    }));
  }, [appliedEndDate, appliedStartDate, comparisonOptions, filteredItems, getComparisonLabel, selectedComparison, trendMetric, trendView]);

  const trendHourRange = useMemo(() => {
    if (appliedStartDate !== appliedEndDate || trendChartData.length === 0) {
      return null;
    }

    const hours = trendChartData.map((item) => item.hour);
    return {
      min: Math.min(...hours),
      max: Math.max(...hours),
    };
  }, [appliedEndDate, appliedStartDate, trendChartData]);

  const trendGrainLabel = appliedStartDate === appliedEndDate ? "Visão por hora" : "Visão diária";
  const trendSeriesLabels = useMemo(
    () => Array.from(new Set(trendChartData.map((point) => point.series))),
    [trendChartData],
  );

  const trendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      data: [{ id: "monitoringTrend", values: trendChartData }],
      xField: appliedStartDate === appliedEndDate ? "hour" : "label",
      yField: "quantity",
      seriesField: "series",
      smooth: true,
      padding: [20, 24, 42, 42],
      color: trendSeriesLabels.map((series, index) =>
        series === totalSeriesLabel
          ? totalSeriesColor
          : monitoringPalette[
              (index - (trendSeriesLabels[0] === totalSeriesLabel ? 1 : 0)) % monitoringPalette.length
            ].hex,
      ),
      axes: [
        trendHourRange
          ? {
              orient: "bottom",
              type: "linear",
              min: trendHourRange.min,
              max: trendHourRange.max,
              nice: false,
              tick: {
                tickStep: 1,
                noDecimals: true,
              },
              label: {
                formatMethod: (text: string | string[]) => {
                  const value = Number(Array.isArray(text) ? text[0] : text);

                  return Number.isFinite(value)
                    ? formatHourLabel(value)
                    : String(Array.isArray(text) ? text[0] : text);
                },
              },
            }
          : {
              orient: "bottom",
              label: { autoRotate: false, autoHide: true, autoHideMethod: "greedy" },
            },
        {
          orient: "left",
          label: {
            formatMethod: (text: string | string[]) =>
              formatAxisValue(Number(Array.isArray(text) ? text[0] : text)),
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: false,
        parentElement: "monitoring-trend-chart",
        activeType: "dimension",
        dimension: {
          title: {
            visible: true,
            value: (datum) => datum?.label || "Período",
          },
          updateContent: (_prev, data) => {
            const points = getMonitoringTooltipPoints(data as MonitoringTooltipDataItem[]);
            const referencePoint = points[0]?.datum?.[0];

            if (!referencePoint) {
              return [];
            }

            return trendChartData
              .filter((point) => point.time === referencePoint.time)
              .map((point) => ({
                key: point.series,
                value: Number(point.quantity || 0).toLocaleString("pt-BR"),
                visible: true as const,
                hasShape: true as const,
                shapeType: "line" as const,
                shapeFill:
                  point.series === totalSeriesLabel
                    ? totalSeriesColor
                    : monitoringPalette[
                        (trendSeriesLabels.indexOf(point.series) -
                          (trendSeriesLabels[0] === totalSeriesLabel ? 1 : 0)) %
                          monitoringPalette.length
                      ].hex,
                shapeStroke: "transparent",
                shapeLineWidth: 0,
                shapeSize: 10,
              }));
          },
        },
      },
      point: { visible: true, style: { size: 6, fill: "#ffffff", stroke: "#0ea5e9", lineWidth: 2 } },
      line: { style: { lineWidth: 3, curveType: "monotone" } },
      area: { visible: true, style: { fillOpacity: 0.12 } },
    }),
    [
      appliedEndDate,
      appliedStartDate,
      trendChartData,
      trendHourRange,
      trendSeriesLabels,
    ],
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
      setAppliedStartDate(latestAvailableDateInput);
      setAppliedEndDate(latestAvailableDateInput);
      setAutoFallbackDate(latestAvailableDateInput);
    }
  }, [endDate, hasDataForToday, latestAvailableDateInput, startDate, todayInput]);

  const activePeriodText = useMemo(() => {
    if (appliedStartDate && appliedEndDate) {
      if (appliedStartDate === appliedEndDate) {
        return appliedStartDate === todayInput
          ? "Período ativo: Hoje"
          : `Período ativo: ${formatDisplayInputDate(appliedStartDate)}`;
      }

      return `Período ativo: ${formatDisplayInputDate(appliedStartDate)} a ${formatDisplayInputDate(appliedEndDate)}`;
    }

    if (appliedStartDate) {
      return `Período ativo: a partir de ${formatDisplayInputDate(appliedStartDate)}`;
    }

    if (appliedEndDate) {
      return `Período ativo: até ${formatDisplayInputDate(appliedEndDate)}`;
    }

    return "Período ativo: intervalo livre";
  }, [appliedEndDate, appliedStartDate, todayInput]);

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
    appliedTipoVenda,
    appliedBandeira,
    appliedRegional,
    appliedLojaVenda,
    appliedMarcaVeiculo,
    appliedModelo,
    appliedVersao,
    appliedClassificacao,
    appliedStartDate,
    appliedEndDate,
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
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-sky-100/80 dark:text-cyan-200/80">
              Relatório
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
              Visão global por Marca de Veículo
            </h1>
          </section>

          <section className={cn(themedPanelClass, "border-rose-200 p-6 dark:border-rose-400/20")}>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-rose-600 dark:text-rose-300">
              Falha ao carregar os dados
            </p>
            <h2 className={cn("mt-2 text-2xl font-medium", themedTextTitleClass)}>
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
    <main className={cn("min-h-[100dvh] overflow-x-hidden p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-sky-100/80">
                Relatório
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
                  Visão global por Marca de Veículo
                </h1>
                <TooltipIcon text="Os indicadores e a listagem abaixo respondem aos filtros de bandeira, loja de venda, regional, tipo de venda, classificação, marca e período." />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-sky-100/80">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Última atualização: {lastUpdatedText}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {isLoading ? "Atualizando..." : "Dados prontos"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-sky-50/90">
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

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDesktopFiltersOpen((current) => !current)}
                aria-expanded={isDesktopFiltersOpen}
                aria-controls="marca-filters-panel"
                className={cn(
                  "hidden h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-medium tablet:inline-flex",
                  themedOutlineButtonClass,
                )}
              >
                {isDesktopFiltersOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" />
                )}
                <span>{isDesktopFiltersOpen ? "Ocultar filtro" : "Abrir filtro"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => void refresh({ silent: true })}
                className={cn(
                  "h-10 shrink-0 rounded-full px-4 text-xs font-medium",
                  themedOutlineButtonClass,
                )}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        <div className="sticky top-3 z-30 tablet:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="marca-filters-panel"
            className={cn(
              "h-12 w-full rounded-full px-4 text-sm font-medium shadow-sm",
              themedOutlineButtonClass,
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {isMobileFiltersOpen ? "Ocultar filtro" : "Abrir filtro"}
          </Button>
        </div>

        <section
          id="marca-filters-panel"
          className={cn(
            themedPanelClass,
            "overflow-hidden p-4 transition-[max-height,opacity,transform] duration-300 ease-out",
            isMobileFiltersOpen
              ? "max-h-[5000px] opacity-100 translate-y-0"
              : "pointer-events-none max-h-0 -translate-y-2 opacity-0",
            isDesktopFiltersOpen
              ? "tablet:max-h-[5000px] tablet:pointer-events-auto tablet:opacity-100 tablet:translate-y-0"
              : "tablet:pointer-events-none tablet:max-h-0 tablet:-translate-y-2 tablet:opacity-0",
          )}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className={cn("text-base font-medium tracking-[-0.02em]", themedTextTitleClass)}>
                Filtros
              </h2>
              <p className={cn("text-xs", themedTextMutedClass)}>
                Combine uma ou mais opções em qualquer campo.
              </p>
            </div>
            <div className="hidden flex-wrap items-center gap-2 tablet:flex">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className={cn("h-8 shrink-0 rounded-full px-3 text-xs font-medium", themedOutlineButtonClass)}
              >
                Limpar filtros
              </Button>
              <Button
                type="button"
                onClick={applyFilters}
                disabled={!hasPendingFilterChanges}
                className="h-8 shrink-0 rounded-full bg-cyan-400 px-3 text-xs font-medium text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Aplicar filtros
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <FilterSelectCard
              label="Tipo de venda"
              value={selectedTipoVenda}
              appliedValue={appliedTipoVenda}
              options={tipoVendaOptions}
              onChange={setSelectedTipoVenda}
              tooltip="Filtro aplicado por tipo de venda."
              disabled={isOptionsLoading}
              formatLabel={formatTipoVendaLabel}
            />
            <FilterSelectCard
              label="Bandeira"
              value={selectedBandeira}
              appliedValue={appliedBandeira}
              options={bandeiraOptions}
              onChange={setSelectedBandeira}
              tooltip="Filtro aplicado por bandeira."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Regional"
              value={selectedRegional}
              appliedValue={appliedRegional}
              options={regionalOptions}
              onChange={setSelectedRegional}
              tooltip="Filtro aplicado por regional."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Loja de Venda"
              value={selectedLojaVenda}
              appliedValue={appliedLojaVenda}
              options={lojaVendaOptions}
              onChange={setSelectedLojaVenda}
              tooltip="Filtro aplicado por loja de venda."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Marca veículo"
              value={selectedMarcaVeiculo}
              appliedValue={appliedMarcaVeiculo}
              options={marcaVeiculoOptions}
              onChange={setSelectedMarcaVeiculo}
              tooltip="Filtro aplicado por marca do veículo."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Modelo"
              value={selectedModelo}
              appliedValue={appliedModelo}
              options={modeloOptions}
              onChange={setSelectedModelo}
              tooltip="Filtro aplicado por modelo."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Versão"
              value={selectedVersao}
              appliedValue={appliedVersao}
              options={versaoOptions}
              onChange={setSelectedVersao}
              tooltip="Filtro aplicado por versão."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Classificação"
              value={selectedClassificacao}
              appliedValue={appliedClassificacao}
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
                  <FilterDateInput
                    value={startDate}
                    onChange={handleStartDateChange}
                    min={startDateMin}
                    max={startDateMax}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
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
                  <FilterDateInput
                    value={endDate}
                    onChange={handleEndDateChange}
                    min={endDateMin}
                    max={endDateMax}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                  />
                </label>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 tablet:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className={cn("h-10 rounded-full px-3 text-xs font-medium", themedOutlineButtonClass)}
              >
                Limpar filtros
              </Button>
              <Button
                type="button"
                onClick={applyFilters}
                disabled={!hasPendingFilterChanges}
                className="h-10 rounded-full bg-cyan-400 px-3 text-xs font-medium text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 phone:grid-cols-2 xl:grid-cols-4">
          <div className={cn(themedCardClass, "p-4 sm:p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Volume total
            </p>
            <p className={cn("mt-3 text-3xl font-light tracking-[-0.05em] sm:text-4xl", themedTextTitleClass)}>
              {totalQuantity.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Soma das vendas cantadas no recorte.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-4 sm:p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Intenções registradas
            </p>
            <p className={cn("mt-3 text-3xl font-light tracking-[-0.05em] sm:text-4xl", themedTextTitleClass)}>
              {filteredItems.length.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Registros que sustentam a análise.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-4 sm:p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Média por intenção
            </p>
            <p className={cn("mt-3 text-3xl font-light tracking-[-0.05em] sm:text-4xl", themedTextTitleClass)}>
              {averageQuantityPerRecord.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Quantidade média informada por registro.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-4 sm:p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Marcas ativas
            </p>
            <p className={cn("mt-3 text-3xl font-light tracking-[-0.05em] sm:text-4xl", themedTextTitleClass)}>
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
              className={cn("mt-1 text-lg font-medium tracking-[-0.02em]", themedTextTitleClass)}
            >
              Monitoramento das vendas cantadas
            </h2>
            <p className={cn("mt-1 text-xs", themedTextBodyClass)}>
              Acompanhe ritmo, concentração e composição usando as visões interativas.
            </p>
          </div>

          <MonitoringTrendChartCard
            spec={trendChartSpec}
            chartKey={`${trendView}-${trendMetric}-${comparisonDimension}-${JSON.stringify(trendChartData)}`}
            hasData={trendChartData.length > 0}
            grainLabel={trendGrainLabel}
            comparisonOptions={comparisonFilterOptions}
            selectedComparison={selectedComparison}
            legendItems={selectedComparison.filter((item) => comparisonFilterOptions.includes(item))}
            onComparisonChange={setSelectedComparison}
            comparisonDimension={comparisonDimension}
            onComparisonDimensionChange={(value) => {
              setComparisonDimension(value);
              setSelectedComparison([totalSeriesLabel]);
            }}
            trendView={trendView}
            onTrendViewChange={setTrendView}
            trendMetric={trendMetric}
            onTrendMetricChange={setTrendMetric}
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

        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={() => setIsDetailedTableModalOpen(true)}
          className="mt-1 h-12 w-full rounded-full text-sm font-semibold shadow-[0_18px_40px_-22px_rgba(14,165,233,0.75)] tablet:hidden"
        >
          <NotebookText className="h-4 w-4" />
          Abrir tabela detalhada
        </Button>

        <div className="hidden tablet:block">
          <SalesIntentionDataList
            items={filteredItems}
            exportFilePrefix="relatorio-marca"
            className="mt-1 max-w-full"
          />
        </div>

        <MobileDetailedTableModal
          open={isDetailedTableModalOpen}
          items={filteredItems}
          exportFilePrefix="relatorio-marca-mobile"
          onClose={() => setIsDetailedTableModalOpen(false)}
        />
      </div>
    </main>
  );
}
