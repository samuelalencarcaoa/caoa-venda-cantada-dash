"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addHours,
  differenceInCalendarDays,
  format,
} from "date-fns";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec, ILineChartSpec } from "@visactor/vchart";
import { useTheme } from "next-themes";
import { useHorizontalDragScroll } from "@/hooks/use-horizontal-drag-scroll";

import { TooltipIcon } from "@/components/sales-intention-filter-select-card";
import {
  themedCardClass,
  themedChipClass,
  themedInputClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextMutedClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";
import { chartComparisonLineDash, chartLineWidth, chartPointStrokeWidth } from "@/lib/chart-style";
import { formatCompactAxisValue } from "@/lib/chart-formatters";
import {
  getSalesCantadasTrendBucketSpan as getTrendBucketSpan,
  resolveSalesCantadasTrendGranularity,
  salesCantadasTrendGranularityLabels as trendGranularityLabels,
  type SalesCantadasTrendGranularity,
} from "@/lib/period-metrics";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";
import { alignComparisonBuckets, calculateComparisonVariation, parseLocalInputDate } from "@/lib/brand-period-comparison";

type BrandDetailsAnalyticsSectionProps = {
  items: SalesIntentionReportRow[];
  selectedStartDate?: string;
  selectedEndDate?: string;
  comparePreviousPeriod?: boolean;
  onComparePreviousPeriodChange?: (value: boolean) => void;
  comparisonItems?: SalesIntentionReportRow[] | null;
  comparisonRange?: { startDate: string; endDate: string } | null;
  isComparisonLoading?: boolean;
  comparisonError?: string | null;
  className?: string;
};

type CategorySummary = {
  key: string;
  label: string;
  value: number;
};

type TrendPoint = {
  time: number;
  label: string;
  axisLabel: string;
  value: number;
  series: string;
  hour?: number;
  comparison?: boolean;
  baseSeries?: string;
  comparisonDateLabel?: string;
};

type TrendGrouping = "auto" | SalesCantadasTrendGranularity;
type TrendView = "volume" | "acumulado";
type TrendMetric = "total" | "quant";

const trendGroupingOptions = [
  { value: "auto", label: "Automático" },
  { value: "hour", label: "Hora" },
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "bimonth", label: "Bimestre" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Ano" },
] as const;
const trendViewOptions = [{ value: "volume", label: "Volume" }, { value: "acumulado", label: "Acumulado" }] as const;
const trendMetricOptions = [{ value: "total", label: "Total" }, { value: "quant", label: "Quant." }] as const;
const totalSeriesLabel = "Total";

type TrendTooltipSeriesDatum = {
  datum?: TrendPoint[];
};

type TrendTooltipDimensionInfo = {
  data?: TrendTooltipSeriesDatum[];
};

type TrendTooltipDataItem = TrendTooltipSeriesDatum | TrendTooltipDimensionInfo;

type PrimaryClassification = {
  label: string;
  value: number;
  percentage: number;
};

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeCategoryKey(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }

  return stripDiacritics(trimmed).replace(/\s+/g, " ").toUpperCase();
}

function normalizeCategoryLabel(value: string | null | undefined, fallback?: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback || "";
}

function parseInputDate(value?: string) {
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

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseReportDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const [datePart, timePart = "00:00:00"] = normalized.split(/\s+/);
  const [dayText, monthText, yearText] = datePart.split("/");
  const [hoursText = "0", minutesText = "0", secondsText = "0"] = timePart.split(":");

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatItemCountLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "item" : "itens"}`;
}

function buildHorizontalBarGradient(startColor: string, endColor: string) {
  return {
    gradient: "linear" as const,
    x0: 0,
    y0: 0,
    x1: 1,
    y1: 0,
    stops: [
      {
        offset: 0,
        color: startColor,
      },
      {
        offset: 1,
        color: endColor,
      },
    ],
  };
}

function getHorizontalBarPadding(isCompactLayout: boolean) {
  return isCompactLayout ? [14, 16, 32, 44] : [16, 24, 40, 110];
}

function getScrollableBarChartHeight(itemCount: number, isCompactLayout: boolean) {
  const visibleHeight = isCompactLayout ? 300 : 340;
  const estimatedRowHeight = isCompactLayout ? 24 : 26;
  const estimatedVerticalPadding = isCompactLayout ? 52 : 60;

  return Math.max(visibleHeight, itemCount * estimatedRowHeight + estimatedVerticalPadding);
}

function sumQuantity(items: SalesIntentionReportRow[]) {
  return items.reduce((total, item) => total + (Number(item.Quantidade) || 0), 0);
}

function groupByCategory(
  items: SalesIntentionReportRow[],
  accessor: (item: SalesIntentionReportRow) => string | null | undefined,
  fallbackLabel?: string,
) {
  const groups = new Map<string, CategorySummary & { order: number }>();

  for (const item of items) {
    const rawValue = accessor(item);
    const label = normalizeCategoryLabel(rawValue, fallbackLabel);
    if (!label) {
      continue;
    }

    const key = normalizeCategoryKey(label);

    if (!key) {
      continue;
    }

    const quantity = Number(item.Quantidade) || 0;
    const current = groups.get(key);

    if (current) {
      current.value += quantity;
      continue;
    }

    groups.set(key, {
      key,
      label,
      value: quantity,
      order: groups.size + 1,
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }

      return a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" });
    })
    .map(({ order: _order, ...group }) => group);
}

function countDistinctCategories(
  items: SalesIntentionReportRow[],
  accessor: (item: SalesIntentionReportRow) => string | null | undefined,
) {
  return new Set(
    items
      .map((item) => normalizeCategoryKey(accessor(item)))
      .filter(Boolean),
  ).size;
}

function getTrendTooltipSeriesItems(data: TrendTooltipDataItem[] | undefined) {
  return (data ?? []).flatMap((item) => {
    if (Array.isArray((item as TrendTooltipDimensionInfo).data)) {
      return (item as TrendTooltipDimensionInfo).data ?? [];
    }

    return [item as TrendTooltipSeriesDatum];
  });
}

function getTrendTooltipReferencePoint(data: TrendTooltipDataItem[] | undefined) {
  for (const seriesItem of getTrendTooltipSeriesItems(data)) {
    const point = seriesItem.datum?.[0];
    if (point) {
      return point;
    }
  }

  return undefined;
}

function getPrimaryClassification(items: SalesIntentionReportRow[]): PrimaryClassification {
  const groups = groupByCategory(items, (item) => item.Classificacao, "Sem classificação");
  const totalQuantity = sumQuantity(items);
  const topGroup = groups[0];

  if (!topGroup) {
    return {
      label: "Sem dados",
      value: 0,
      percentage: 0,
    };
  }

  return {
    label: topGroup.label,
    value: topGroup.value,
    percentage: totalQuantity > 0 ? (topGroup.value / totalQuantity) * 100 : 0,
  };
}

function truncateLabel(value: string, maxLength = 28) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function MetricCard({
  label,
  value,
  tooltip,
  caption,
  valueClassName,
}: {
  label: string;
  value: string;
  tooltip: string;
  caption?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn(themedCardClass, "min-w-0 p-4 sm:p-5")}>
      <div className="flex items-center gap-1.5">
        <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>{label}</p>
        <TooltipIcon text={tooltip} />
      </div>
      {caption ? (
        <p className={cn("mt-1 text-[10px] font-normal tracking-[0.18em]", themedTextMutedClass)}>
          {caption}
        </p>
      ) : null}
      <p
        className={cn(
          "mt-3 text-3xl font-light tracking-[-0.05em] sm:text-4xl",
          themedTextTitleClass,
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  tooltip,
  description,
  badge,
  hasData,
  chartKey,
  spec,
  emptyMessage = "Nenhum dado encontrado para os filtros selecionados.",
  className,
  contentClassName,
  chartHeight,
  footer,
}: {
  title: string;
  tooltip: string;
  description?: string;
  badge?: string;
  hasData: boolean;
  chartKey: string;
  spec: ILineChartSpec | IBarChartSpec;
  emptyMessage?: string;
  className?: string;
  contentClassName?: string;
  chartHeight?: number;
  footer?: string;
}) {
  return (
    <article className={cn(themedCardClass, "w-full min-w-0 overflow-hidden px-4 py-4 sm:px-5 sm:py-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 space-y-1 sm:min-h-[64px]">
          <div className="flex items-center gap-1.5">
            <h3 className={cn("text-sm font-normal tracking-[-0.01em]", themedTextTitleClass)}>
              {title}
            </h3>
            <TooltipIcon text={tooltip} />
          </div>
          {description ? (
            <p className={cn("text-xs leading-5", themedTextBodyClass)}>
              {description}
            </p>
          ) : null}
        </div>

        {badge ? (
          <span className={cn("shrink-0 self-start whitespace-nowrap px-2.5 py-1 text-[10px] leading-none", themedChipClass)}>
            {badge}
          </span>
        ) : null}
      </div>

      <div className={cn("mt-4 min-h-0 max-w-full overflow-hidden", contentClassName ?? "h-[300px] sm:h-[330px]")}>
        {hasData ? (
          <div
            className="block w-full min-w-0"
            style={{ height: chartHeight ? `${chartHeight}px` : "100%" }}
          >
            <VChart
              key={chartKey}
              spec={spec}
              className="block h-full w-full max-w-full min-w-0"
              style={{ height: "100%", width: "100%", maxWidth: "100%", minWidth: 0 }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 text-center dark:border-white/10 dark:bg-white/5">
            <p className={cn("max-w-sm text-sm leading-6", themedTextMutedClass)}>
              {emptyMessage}
            </p>
          </div>
        )}
      </div>

      {footer ? (
        <p className={cn("mt-3 text-xs leading-5", themedTextMutedClass)}>
          {footer}
        </p>
      ) : null}
    </article>
  );
}

function TrendToggle({ options, value, onChange, label, wrap = false }: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  label: string;
  wrap?: boolean;
}) {
  const drag = useHorizontalDragScroll<HTMLDivElement>();
  return (
    <div
      ref={drag.ref}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      className={cn("inline-flex min-w-0 max-w-full gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 select-none dark:border-white/10 dark:bg-white/5", wrap ? "flex-wrap" : "cursor-grab overflow-x-auto active:cursor-grabbing")}
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn("shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-normal transition sm:text-[11px]", value === option.value ? "bg-sky-500 text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950" : "text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BrandComparisonTrendCard({
  spec, chartKey, hasData, grainLabel, grouping, onGroupingChange,
  view, onViewChange, metric, onMetricChange, legendItems,
  comparePreviousPeriod, onComparePreviousPeriodChange, comparisonRange, isComparisonLoading, comparisonError,
}: {
  spec: ILineChartSpec;
  chartKey: string;
  hasData: boolean;
  grainLabel: string;
  grouping: TrendGrouping;
  onGroupingChange: (value: TrendGrouping) => void;
  view: TrendView;
  onViewChange: (value: TrendView) => void;
  metric: TrendMetric;
  onMetricChange: (value: TrendMetric) => void;
  legendItems: Array<{ label: string; color: string; comparison?: boolean }>;
  comparePreviousPeriod: boolean;
  onComparePreviousPeriodChange: (value: boolean) => void;
  comparisonRange: { startDate: string; endDate: string } | null;
  isComparisonLoading: boolean;
  comparisonError: string | null;
}) {
  return (
    <article className={cn(themedCardClass, "min-w-0 px-4 py-4 sm:px-5 sm:py-5 xl:col-span-2")}>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(250px,270px)] xl:grid-rows-[auto_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-normal tracking-[-0.01em]", themedTextTitleClass)}>Vendas Cantadas no Período</h2>
            <TooltipIcon text="Escolha o agrupamento do gráfico. No modo Automático, o intervalo acompanha o período selecionado. Alterne entre volume e acumulado ou compare com o período anterior." />
          </div>
          <span className={cn("mt-1 inline-flex max-w-full items-center px-2.5 py-1", themedChipClass)}>{grainLabel}</span>
          <div className="mt-3 space-y-1.5">
            <p className={themedTinyLabelClass}>Agrupamento</p>
            <TrendToggle options={trendGroupingOptions} value={grouping} onChange={(value) => onGroupingChange(value as TrendGrouping)} label="Agrupamento do gráfico" wrap />
          </div>
        </div>

        <div className="xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <div className={cn(themedSoftCardClass, "min-w-[250px] rounded-2xl p-3 sm:min-w-[270px]")}>
            <div className="flex items-center gap-1.5">
              <p className={cn(themedTinyLabelClass, "tracking-[0.18em]")}>Comparativo</p>
              <TooltipIcon text="Acompanhe o total em volume ou acumulado e compare com o período anterior de mesma duração." />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <TrendToggle options={trendViewOptions} value={view} onChange={(value) => onViewChange(value as TrendView)} label="Visão do comparativo" />
              <TrendToggle options={trendMetricOptions} value={metric} onChange={(value) => onMetricChange(value as TrendMetric)} label="Métrica do comparativo" />
            </div>
            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                aria-pressed={comparePreviousPeriod}
                onClick={() => onComparePreviousPeriodChange(!comparePreviousPeriod)}
                className={cn("flex w-full flex-col items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500", themedInputClass)}
              >
                <span className="whitespace-nowrap">Comparar com período anterior</span>
                <span aria-hidden="true" className={cn("relative h-5 w-9 shrink-0 self-end rounded-full transition", comparePreviousPeriod ? "bg-sky-500 dark:bg-cyan-400" : "bg-slate-300 dark:bg-slate-700")}>
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform", comparePreviousPeriod ? "translate-x-[18px]" : "translate-x-0.5")} />
                </span>
              </button>
              {comparePreviousPeriod && comparisonRange ? (
                <p className={cn("text-[11px]", themedTextMutedClass)}>
                  Período anterior: {format(parseLocalInputDate(comparisonRange.startDate) ?? new Date(), "dd/MM/yyyy")}{comparisonRange.startDate !== comparisonRange.endDate ? ` – ${format(parseLocalInputDate(comparisonRange.endDate) ?? new Date(), "dd/MM/yyyy")}` : ""}
                </p>
              ) : null}
              {isComparisonLoading ? <p role="status" className={cn("text-[11px]", themedTextMutedClass)}>Carregando período comparativo…</p> : null}
              {comparisonError ? <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-300">Não foi possível carregar o comparativo.</p> : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 xl:col-start-1 xl:row-start-2">
          <div className="mb-3 flex max-h-20 flex-wrap justify-center gap-x-4 gap-y-1.5 overflow-y-auto px-2">
            {legendItems.map((item) => (
              <span key={item.label} className="inline-flex min-w-0 items-center gap-1.5 text-[10px]" title={item.label}>
                <span className={cn("w-4 shrink-0 border-t-2", item.comparison && "border-dashed")} style={{ borderColor: item.color }} />
                <span className={cn("max-w-32 truncate", item.label === totalSeriesLabel ? themedTextTitleClass : themedTextMutedClass)}>{item.label}</span>
              </span>
            ))}
          </div>
          <div id="brand-comparison-trend-chart" className="relative h-[300px] min-w-0 sm:h-[330px]">
            {hasData ? <VChart key={chartKey} spec={spec} /> : <p className={cn("flex h-full items-center justify-center text-sm", themedTextMutedClass)}>Nenhum dado no período.</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

function AnalyticsSkeletonCard({
  className,
  contentClassName,
}: {
  className?: string;
  contentClassName?: string;
}) {
  return (
    <article className={cn(themedCardClass, "min-w-0 overflow-hidden px-4 py-4 sm:px-5 sm:py-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-4 w-56 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
        <div className="h-7 w-20 self-start animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
      </div>

      <div className={cn("mt-4 h-[300px] animate-pulse rounded-[24px] bg-slate-200/80 dark:bg-white/10", contentClassName)} />
    </article>
  );
}

export function BrandDetailsAnalyticsSkeleton() {
  return (
    <section className="space-y-4">
      <div className="px-1">
        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-2 h-6 w-72 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="mt-2 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-2 phone:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`brand-metric-skeleton-${index}`} className={cn(themedCardClass, "min-w-0 p-4 sm:p-5")}>
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-2 h-4 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-3 h-9 w-40 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsSkeletonCard />
        <AnalyticsSkeletonCard />
        <AnalyticsSkeletonCard />
        <AnalyticsSkeletonCard />
        <AnalyticsSkeletonCard />
      </div>
    </section>
  );
}

export function BrandDetailsAnalyticsSection({
  items,
  selectedStartDate,
  selectedEndDate,
  comparePreviousPeriod = false,
  onComparePreviousPeriodChange = () => {},
  comparisonItems = null,
  comparisonRange = null,
  isComparisonLoading = false,
  comparisonError = null,
  className,
}: BrandDetailsAnalyticsSectionProps) {
  const { resolvedTheme, theme } = useTheme();
  const [isCompactChartLayout, setIsCompactChartLayout] = useState(false);
  const isDarkMode = resolvedTheme === "dark" || theme === "dark";
  const chartTextColor = isDarkMode ? "#e2e8f0" : "#0f172a";
  const chartMutedColor = isDarkMode ? "#94a3b8" : "#64748b";
  const chartGridColor = isDarkMode ? "#334155" : "#e2e8f0";
  const lineColor = "#22d3ee";
  const barColor = lineColor;
  const barAccentColor = "#67e8f9";
  const barBackgroundColor = isDarkMode ? "#1f2937" : "#e2e8f0";
  const barMinHeight = isCompactChartLayout ? 8 : 10;
  const barWidth = barMinHeight;
  const barCornerRadius = 999;
  const horizontalBarChartCardClassName = "min-h-[452px]";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");

    const updateLayout = () => {
      setIsCompactChartLayout(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);
  const [trendGrouping, setTrendGrouping] = useState<TrendGrouping>("auto");
  const [trendView, setTrendView] = useState<TrendView>("volume");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("total");

  const trendDateRange = useMemo(() => {
    let first: Date | null = null;
    let last: Date | null = null;
    for (const item of items) {
      const date = parseReportDateTime(item.Data_solicitacao);
      if (!date) continue;
      if (!first || date < first) first = date;
      if (!last || date > last) last = date;
    }
    return {
      start: selectedStartDate || (first ? format(first, "yyyy-MM-dd") : ""),
      end: selectedEndDate || (last ? format(last, "yyyy-MM-dd") : ""),
    };
  }, [items, selectedEndDate, selectedStartDate]);
  const trendGranularity = trendGrouping === "auto"
    ? resolveSalesCantadasTrendGranularity(trendDateRange.start, trendDateRange.end)
    : trendGrouping;
  const trendGranularityChartLabel = `Agrupado por ${trendGranularityLabels[trendGranularity]}`;
  const isHourlyTrend = trendGranularity === "hour";
  const isSingleDayHourlyTrend = isHourlyTrend && trendDateRange.start === trendDateRange.end;

  const currentTrendSeries = useMemo<TrendPoint[]>(() => {
    const selected = [totalSeriesLabel];
    const start = parseInputDate(trendDateRange.start);
    const endDate = parseInputDate(trendDateRange.end);
    if (!start || !endDate || start > endDate) return [] as TrendPoint[];
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    const span = getTrendBucketSpan(trendGranularity);
    const grouped = new Map<number, Map<string, number>>();
    items.forEach((item) => {
      const date = parseReportDateTime(isHourlyTrend ? item.Criado : item.Data_solicitacao);
      if (!date || date < start || date > end) return;
      const bucketStart = isHourlyTrend
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours())
        : addDays(start, Math.floor(differenceInCalendarDays(date, start) / span.amount) * span.amount);
      const time = bucketStart.getTime();
      const totals = grouped.get(time) ?? new Map<string, number>();
      const value = trendMetric === "total" ? 1 : Number(item.Quantidade) || 0;
      totals.set(totalSeriesLabel, (totals.get(totalSeriesLabel) || 0) + value);
      grouped.set(time, totals);
    });
    if (!grouped.size) return [] as TrendPoint[];
    if (isHourlyTrend && comparePreviousPeriod) {
      const times = Array.from(grouped.keys()).sort((left, right) => left - right);
      for (let cursor = new Date(times[0]); cursor.getTime() <= times[times.length - 1]; cursor = addHours(cursor, 1)) {
        if (!grouped.has(cursor.getTime())) grouped.set(cursor.getTime(), new Map());
      }
    } else if (!isHourlyTrend) {
      for (let cursor = start; cursor <= endDate; cursor = addDays(cursor, span.amount)) {
        if (!grouped.has(cursor.getTime())) grouped.set(cursor.getTime(), new Map());
      }
    }
    const accumulated = new Map(selected.map((label) => [label, 0]));
    return Array.from(grouped.entries()).sort(([left], [right]) => left - right).flatMap(([time, totals]) => {
      const bucketStart = new Date(time);
      const bucketEnd = new Date(Math.min(addDays(bucketStart, span.amount - 1).getTime(), endDate.getTime()));
      const axisLabel = isHourlyTrend
        ? isSingleDayHourlyTrend ? format(bucketStart, "HH:00") : format(bucketStart, "dd/MM/yy HH:00")
        : format(bucketStart, "dd/MM/yy");
      const label = isHourlyTrend ? format(bucketStart, "dd/MM/yyyy HH:00")
        : span.amount === 1 ? format(bucketStart, "dd/MM/yyyy")
          : `${format(bucketStart, "dd/MM/yyyy")} a ${format(bucketEnd, "dd/MM/yyyy")}`;
      return selected.map((series) => {
        const value = series === totalSeriesLabel ? Array.from(totals.values()).reduce((sum, current) => sum + current, 0) : totals.get(series) || 0;
        const next = trendView === "acumulado" ? (accumulated.get(series) || 0) + value : value;
        accumulated.set(series, next);
        return { time, label, axisLabel, value: next, series, hour: bucketStart.getHours() };
      });
    });
  }, [comparePreviousPeriod, isHourlyTrend, isSingleDayHourlyTrend, items, trendDateRange, trendGranularity, trendMetric, trendView]);

  const trendSeries = useMemo(() => {
    if (!comparePreviousPeriod || !comparisonRange || !comparisonItems || !currentTrendSeries.length) return currentTrendSeries;
    const comparisonStart = parseInputDate(comparisonRange.startDate);
    const comparisonEndDate = parseInputDate(comparisonRange.endDate);
    const currentStart = parseInputDate(trendDateRange.start);
    if (!comparisonStart || !comparisonEndDate || !currentStart) return currentTrendSeries;
    const comparisonEnd = new Date(comparisonEndDate.getFullYear(), comparisonEndDate.getMonth(), comparisonEndDate.getDate(), 23, 59, 59, 999);
    const span = getTrendBucketSpan(trendGranularity);
    const bucketIndex = (date: Date, rangeStart: Date) => isHourlyTrend
      ? differenceInCalendarDays(date, rangeStart) * 24 + date.getHours()
      : Math.floor(differenceInCalendarDays(date, rangeStart) / span.amount);
    const totalsBySeries = new Map<string, Map<number, number>>();
    comparisonItems.forEach((item) => {
      const date = parseReportDateTime(isHourlyTrend ? item.Criado : item.Data_solicitacao);
      if (!date || date < comparisonStart || date > comparisonEnd) return;
      const index = bucketIndex(date, comparisonStart);
      const value = trendMetric === "total" ? 1 : Number(item.Quantidade) || 0;
      const totals = totalsBySeries.get(totalSeriesLabel) ?? new Map<number, number>();
      totals.set(index, (totals.get(index) || 0) + value);
      totalsBySeries.set(totalSeriesLabel, totals);
    });
    const selected = Array.from(new Set(currentTrendSeries.map((point) => point.series)));
    const comparisonSeries = selected.flatMap((series) => {
      const currentPoints = currentTrendSeries.filter((point) => point.series === series).sort((left, right) => left.time - right.time);
      const aligned = alignComparisonBuckets(currentPoints, totalsBySeries.get(series) ?? new Map(), (point) => bucketIndex(new Date(point.time), currentStart));
      let accumulated = 0;
      return aligned.map(({ bucket, value }) => {
        accumulated += value;
        const index = bucketIndex(new Date(bucket.time), currentStart);
        const previousBucketStart = isHourlyTrend
          ? new Date(comparisonStart.getFullYear(), comparisonStart.getMonth(), comparisonStart.getDate() + Math.floor(index / 24), index % 24)
          : addDays(comparisonStart, index * span.amount);
        const previousBucketEnd = new Date(Math.min(addDays(previousBucketStart, span.amount - 1).getTime(), comparisonEndDate.getTime()));
        const comparisonDateLabel = isHourlyTrend ? format(previousBucketStart, "dd/MM/yyyy HH:00")
          : span.amount === 1 ? format(previousBucketStart, "dd/MM/yyyy")
            : `${format(previousBucketStart, "dd/MM/yyyy")} a ${format(previousBucketEnd, "dd/MM/yyyy")}`;
        return { ...bucket, value: trendView === "acumulado" ? accumulated : value, series: `${series} · Período anterior`, baseSeries: series, comparison: true, comparisonDateLabel };
      });
    });
    return [...currentTrendSeries, ...comparisonSeries];
  }, [comparisonItems, comparePreviousPeriod, comparisonRange, currentTrendSeries, isHourlyTrend, trendDateRange.start, trendGranularity, trendMetric, trendView]);

  const trendSeriesLabels = useMemo(() => Array.from(new Set(trendSeries.map((point) => point.series))), [trendSeries]);
  const trendSeriesColors = useMemo(() => {
    const currentLabels = Array.from(new Set(currentTrendSeries.map((point) => point.series)));
    const coolColor = isDarkMode ? "#22d3ee" : "#0284c7";
    const warmColor = isDarkMode ? "#f59e0b" : "#d97706";
    const colors = new Map(currentLabels.map((label) => [label, coolColor]));
    if (comparePreviousPeriod && comparisonItems) currentLabels.forEach((label) => colors.set(`${label} · Período anterior`, warmColor));
    return colors;
  }, [comparisonItems, comparePreviousPeriod, currentTrendSeries, isDarkMode]);
  const trendLegendItems = trendSeriesLabels.map((label) => {
    const comparison = trendSeries.find((point) => point.series === label)?.comparison;
    return {
      label: comparePreviousPeriod && comparisonItems && !comparison ? `${label} · Período atual` : label,
      color: trendSeriesColors.get(label) || lineColor,
      comparison,
    };
  });
  const trendHourRange = useMemo(() => {
    if (!isSingleDayHourlyTrend || !trendSeries.length) return null;
    const hours = trendSeries.map((point) => point.hour ?? 0);
    return { min: Math.min(...hours), max: Math.max(...hours) };
  }, [isSingleDayHourlyTrend, trendSeries]);

  const {
    totalQuantity,
    totalStoreCount,
    totalModelCount,
    primaryClassification,
    modelSeries,
    storeSeries,
    classificationSeries,
    regionalSeries,
    hasData,
  } = useMemo(() => {
    const totalQuantityValue = sumQuantity(items);
    const modelValues = groupByCategory(items, (item) => item.Versao);
    const storeValues = groupByCategory(items, (item) => item.Loja_Venda);
    const classificationValues = groupByCategory(
      items,
      (item) => item.Classificacao,
      "Sem classificação",
    );
    const regionalValues = groupByCategory(items, (item) => item.Regional, "Sem regional");

    return {
      totalQuantity: totalQuantityValue,
      totalStoreCount: countDistinctCategories(items, (item) => item.Loja_Venda),
      totalModelCount: countDistinctCategories(items, (item) => item.Versao),
      primaryClassification: getPrimaryClassification(items),
      modelSeries: modelValues,
      storeSeries: storeValues,
      classificationSeries: classificationValues,
      regionalSeries: regionalValues,
      hasData: items.length > 0,
    };
  }, [items]);

  const trendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      autoFit: true,
      data: [{ id: "brandTrend", values: trendSeries }],
      xField: isSingleDayHourlyTrend ? "hour" : "axisLabel",
      yField: "value",
      seriesField: "series",
      smooth: true,
      padding: isCompactChartLayout ? [18, 14, 36, 28] : [20, 24, 42, 42],
      color: trendSeriesLabels.map((label) => trendSeriesColors.get(label) || lineColor),
      axes: [
        trendHourRange ? {
          orient: "bottom", type: "linear", min: trendHourRange.min, max: trendHourRange.max, nice: false,
          tick: { tickStep: 1, noDecimals: true },
          label: { formatMethod: (text: string | string[]) => {
            const value = Number(Array.isArray(text) ? text[0] : text);
            return Number.isFinite(value) ? `${String(value).padStart(2, "0")}:00` : String(text);
          }, style: { fill: chartMutedColor, fontSize: isCompactChartLayout ? 10 : 11 } },
        } : {
          orient: "bottom",
          label: { autoRotate: false, autoHide: true, autoHideMethod: "greedy", style: { fill: chartMutedColor, fontSize: isCompactChartLayout ? 10 : 11 } },
        },
        { orient: "left", label: { formatMethod: formatCompactAxisValue, style: { fill: chartMutedColor, fontSize: isCompactChartLayout ? 10 : 11 } }, grid: { style: { stroke: chartGridColor, lineDash: [4, 4] } } },
      ],
      tooltip: {
        trigger: ["hover", "click"], confine: true, parentElement: "brand-comparison-trend-chart", activeType: "dimension",
        style: {
          panel: {
            padding: { top: 7, right: 9, bottom: 7, left: 9 },
            backgroundColor: isDarkMode ? "#111827" : "#ffffff",
            border: { color: isDarkMode ? "#374151" : "#e2e8f0", width: 1, radius: 8 },
          },
          shape: { size: 7, spacing: 5 },
          titleLabel: { fontSize: 11, fontWeight: 400, fontColor: isDarkMode ? "#f8fafc" : "#0f172a", lineHeight: 16 },
          keyLabel: { fontSize: 11, fontColor: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 15, spacing: 12 },
          valueLabel: { fontSize: 11, fontWeight: 400, fontColor: isDarkMode ? "#f8fafc" : "#0f172a", lineHeight: 15 },
          spaceRow: 3,
        },
        dimension: {
          title: { visible: true, value: (datum) => (datum as TrendPoint | undefined)?.label || "Período" },
          updateContent: (_prev, data) => {
            const referencePoint = getTrendTooltipReferencePoint(data as TrendTooltipDataItem[] | undefined);
            if (!referencePoint) return [];
            const points = trendSeries.filter((point) => point.time === referencePoint.time);
            const seriesPrefix = (series: string) => series === "Total" ? "" : `${series} · `;
            const rows = points.map((point) => ({
              key: comparePreviousPeriod && comparisonItems
                ? `${seriesPrefix(point.baseSeries || point.series)}${point.comparison ? `Anterior (${point.comparisonDateLabel})` : "Atual"}`
                : point.series,
              value: Number(point.value || 0).toLocaleString("pt-BR"),
              valueStyle: { fontColor: trendSeriesColors.get(point.series) || lineColor, fontWeight: 400 },
              visible: true as const,
              hasShape: true as const,
              shapeType: "line" as const,
              shapeFill: trendSeriesColors.get(point.series) || lineColor,
              shapeStroke: "transparent",
              shapeLineWidth: 0,
              shapeSize: 10,
            }));
            if (comparePreviousPeriod && comparisonItems) {
              const current = points.filter((point) => !point.comparison);
              current.forEach((point) => {
                const previous = points.find((candidate) => candidate.comparison && candidate.baseSeries === point.series);
                if (!previous) return;
                const variation = calculateComparisonVariation(point.value, previous.value);
                const direction = variation.difference > 0 ? "↑" : variation.difference < 0 ? "↓" : "→";
                const directionColor = variation.difference > 0
                  ? isDarkMode ? "#4ade80" : "#15803d"
                  : variation.difference < 0
                    ? isDarkMode ? "#fb7185" : "#be123c"
                    : isDarkMode ? "#94a3b8" : "#64748b";
                rows.push({
                  key: `${seriesPrefix(point.series)}Diferença`,
                  value: `${direction} ${variation.difference > 0 ? "+" : ""}${variation.difference.toLocaleString("pt-BR")}`,
                  valueStyle: { fontColor: directionColor, fontWeight: 400 },
                  visible: true as const, hasShape: true as const, shapeType: "line" as const,
                  shapeFill: directionColor,
                  shapeStroke: "transparent", shapeLineWidth: 0, shapeSize: 10,
                });
                rows.push({
                  key: `${seriesPrefix(point.series)}Variação`,
                  value: variation.percentage === null ? `${direction} N/A` : `${direction} ${variation.percentage > 0 ? "+" : ""}${variation.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
                  valueStyle: { fontColor: directionColor, fontWeight: 400 },
                  visible: true as const, hasShape: true as const, shapeType: "line" as const,
                  shapeFill: directionColor,
                  shapeStroke: "transparent", shapeLineWidth: 0, shapeSize: 10,
                });
              });
            }
            return rows;
          },
        },
      },
      point: { visible: true, style: { size: 4.5, fill: "#ffffff", stroke: (datum) => trendSeriesColors.get(datum.series) || lineColor, lineWidth: chartPointStrokeWidth } },
      line: { style: { lineWidth: chartLineWidth, lineDash: (datum) => datum.comparison ? chartComparisonLineDash : [], curveType: "monotone" } },
      area: { visible: true, style: { fillOpacity: (datum: TrendPoint) => datum.comparison ? 0 : 0.12 } },
    }),
    [chartGridColor, chartMutedColor, comparisonItems, comparePreviousPeriod, isCompactChartLayout, isDarkMode, isSingleDayHourlyTrend, lineColor, trendHourRange, trendSeries, trendSeriesColors, trendSeriesLabels],
  );

  const barChartPadding = useMemo(
    () => getHorizontalBarPadding(isCompactChartLayout),
    [isCompactChartLayout],
  );
  const barAxisFontSize = isCompactChartLayout ? 9 : 11;
  const barLabelMaxLength = isCompactChartLayout ? 14 : 28;
  const barChartContentClassName = isCompactChartLayout
    ? "max-h-[300px] overflow-y-auto overflow-x-hidden pr-1"
    : "max-h-[340px] overflow-y-auto overflow-x-hidden pr-1";
  const modelChartHeight = getScrollableBarChartHeight(modelSeries.length, isCompactChartLayout);
  const storeChartHeight = getScrollableBarChartHeight(storeSeries.length, isCompactChartLayout);
  const classificationChartHeight = getScrollableBarChartHeight(
    classificationSeries.length,
    isCompactChartLayout,
  );
  const regionalChartHeight = getScrollableBarChartHeight(regionalSeries.length, isCompactChartLayout);

  const modelChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      direction: "horizontal",
      autoFit: true,
      data: [
        {
          id: "brandModelDistribution",
          values: modelSeries,
        },
      ],
      xField: "value",
      yField: "label",
      color: [barColor],
      padding: barChartPadding,
      barWidth,
      barMinHeight,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(barColor, barAccentColor),
          cornerRadius: barCornerRadius,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: barBackgroundColor,
          cornerRadius: barCornerRadius,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 400,
        },
      },
      axes: [
        {
          orient: "bottom",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = Array.isArray(value) ? value[0] : value;
              const numeric = Number(raw);
              return Number.isFinite(numeric) ? formatNumber(numeric) : String(raw);
            },
          },
          tick: {
            style: {
              stroke: chartGridColor,
            },
          },
          grid: {
            style: {
              stroke: chartGridColor,
              lineDash: [4, 4],
            },
          },
        },
        {
          orient: "left",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = String(Array.isArray(value) ? value[0] : value);
              return truncateLabel(raw, barLabelMaxLength);
            },
          },
          tick: {
            visible: false,
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: true,
        mark: {
          title: {
            value: (datum) => String(datum?.label ?? "Modelo"),
          },
          content: [
            {
              key: "Quantidade",
              value: (datum) => formatNumber(Number(datum?.value || 0)),
            },
          ],
        },
      },
    }),
    [
      barAxisFontSize,
      barChartPadding,
      barLabelMaxLength,
      chartGridColor,
      chartMutedColor,
      chartTextColor,
      modelSeries,
      barAccentColor,
      barBackgroundColor,
      barColor,
      barCornerRadius,
      barMinHeight,
      barWidth,
    ],
  );

  const storeChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      direction: "horizontal",
      autoFit: true,
      data: [
        {
          id: "brandStoreDistribution",
          values: storeSeries,
        },
      ],
      xField: "value",
      yField: "label",
      color: [barColor],
      padding: barChartPadding,
      barWidth,
      barMinHeight,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(barColor, barAccentColor),
          cornerRadius: barCornerRadius,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: barBackgroundColor,
          cornerRadius: barCornerRadius,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 400,
        },
      },
      axes: [
        {
          orient: "bottom",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = Array.isArray(value) ? value[0] : value;
              const numeric = Number(raw);
              return Number.isFinite(numeric) ? formatNumber(numeric) : String(raw);
            },
          },
          tick: {
            style: {
              stroke: chartGridColor,
            },
          },
          grid: {
            style: {
              stroke: chartGridColor,
              lineDash: [4, 4],
            },
          },
        },
        {
          orient: "left",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = String(Array.isArray(value) ? value[0] : value);
              return truncateLabel(raw, barLabelMaxLength);
            },
          },
          tick: {
            visible: false,
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: true,
        mark: {
          title: {
            value: (datum) => String(datum?.label ?? "Loja"),
          },
          content: [
            {
              key: "Quantidade",
              value: (datum) => formatNumber(Number(datum?.value || 0)),
            },
          ],
        },
      },
    }),
    [
      barAxisFontSize,
      barChartPadding,
      barLabelMaxLength,
      chartGridColor,
      chartMutedColor,
      chartTextColor,
      storeSeries,
      barAccentColor,
      barBackgroundColor,
      barColor,
      barCornerRadius,
      barMinHeight,
      barWidth,
    ],
  );

  const classificationChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      direction: "horizontal",
      autoFit: true,
      data: [
        {
          id: "brandClassificationDistribution",
          values: classificationSeries,
        },
      ],
      xField: "value",
      yField: "label",
      color: [barColor],
      padding: barChartPadding,
      barWidth,
      barMinHeight,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(barColor, barAccentColor),
          cornerRadius: barCornerRadius,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: barBackgroundColor,
          cornerRadius: barCornerRadius,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 400,
        },
      },
      axes: [
        {
          orient: "bottom",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = Array.isArray(value) ? value[0] : value;
              const numeric = Number(raw);
              return Number.isFinite(numeric) ? formatNumber(numeric) : String(raw);
            },
          },
          tick: {
            style: {
              stroke: chartGridColor,
            },
          },
          grid: {
            style: {
              stroke: chartGridColor,
              lineDash: [4, 4],
            },
          },
        },
        {
          orient: "left",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = String(Array.isArray(value) ? value[0] : value);
              return truncateLabel(raw, barLabelMaxLength);
            },
          },
          tick: {
            visible: false,
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: true,
        mark: {
          title: {
            value: (datum) => String(datum?.label ?? "Classificação"),
          },
          content: [
            {
              key: "Quantidade",
              value: (datum) => formatNumber(Number(datum?.value || 0)),
            },
          ],
        },
      },
    }),
    [
      barAxisFontSize,
      barChartPadding,
      barLabelMaxLength,
      chartGridColor,
      chartMutedColor,
      chartTextColor,
      classificationSeries,
      barAccentColor,
      barBackgroundColor,
      barColor,
      barCornerRadius,
      barMinHeight,
      barWidth,
    ],
  );

  const regionalChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      direction: "horizontal",
      autoFit: true,
      data: [
        {
          id: "brandRegionalDistribution",
          values: regionalSeries,
        },
      ],
      xField: "value",
      yField: "label",
      color: [barColor],
      padding: barChartPadding,
      barWidth,
      barMinHeight,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(barColor, barAccentColor),
          cornerRadius: barCornerRadius,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: barBackgroundColor,
          cornerRadius: barCornerRadius,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 400,
        },
      },
      axes: [
        {
          orient: "bottom",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = Array.isArray(value) ? value[0] : value;
              const numeric = Number(raw);
              return Number.isFinite(numeric) ? formatNumber(numeric) : String(raw);
            },
          },
          tick: {
            style: {
              stroke: chartGridColor,
            },
          },
          grid: {
            style: {
              stroke: chartGridColor,
              lineDash: [4, 4],
            },
          },
        },
        {
          orient: "left",
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: barAxisFontSize,
            },
            formatMethod: (value: string | string[]) => {
              const raw = String(Array.isArray(value) ? value[0] : value);
              return truncateLabel(raw, barLabelMaxLength);
            },
          },
          tick: {
            visible: false,
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: true,
        mark: {
          title: {
            value: (datum) => String(datum?.label ?? "Regional"),
          },
          content: [
            {
              key: "Quantidade",
              value: (datum) => formatNumber(Number(datum?.value || 0)),
            },
          ],
        },
      },
    }),
    [
      barAxisFontSize,
      barChartPadding,
      barLabelMaxLength,
      chartGridColor,
      chartMutedColor,
      chartTextColor,
      regionalSeries,
      barAccentColor,
      barBackgroundColor,
      barColor,
      barCornerRadius,
      barMinHeight,
      barWidth,
    ],
  );

  return (
    <section
      aria-labelledby="brand-analytics-title"
      className={cn("min-w-0 space-y-4 max-w-full overflow-x-clip", className)}
    >
      <div className="grid grid-cols-1 gap-2 phone:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total de Vendas Cantadas"
          value={formatNumber(totalQuantity)}
          tooltip="Soma do campo Quantidade nos registros filtrados."
        />
        <MetricCard
          label="Lojas distintas"
          value={formatNumber(totalStoreCount)}
          tooltip="Quantidade de lojas diferentes após aplicar os filtros atuais."
        />
        <MetricCard
          label="Modelos distintos"
          value={formatNumber(totalModelCount)}
          tooltip="Quantidade de versões distintas com normalização de capitalização e espaços."
        />
        <MetricCard
          label="Classificação predominante"
          value={primaryClassification.label}
          caption={`${formatNumber(primaryClassification.value)} intenções | ${primaryClassification.percentage.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
          })}% do total`}
          tooltip="Classificação com maior volume no recorte atual."
          valueClassName="text-2xl font-normal leading-tight tracking-[-0.04em] sm:text-3xl"
        />
      </div>

      {hasData ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <BrandComparisonTrendCard
            spec={trendChartSpec}
            chartKey={`brand-trend-${trendGranularity}-${trendView}-${trendMetric}-${comparePreviousPeriod ? "previous" : "none"}-${JSON.stringify(trendSeries)}`}
            hasData={trendSeries.length > 0}
            grainLabel={trendGranularityChartLabel}
            grouping={trendGrouping}
            onGroupingChange={setTrendGrouping}
            view={trendView}
            onViewChange={setTrendView}
            metric={trendMetric}
            onMetricChange={setTrendMetric}
            legendItems={trendLegendItems}
            comparePreviousPeriod={comparePreviousPeriod}
            onComparePreviousPeriodChange={onComparePreviousPeriodChange}
            comparisonRange={comparisonRange}
            isComparisonLoading={isComparisonLoading}
            comparisonError={comparisonError}
          />

          <ChartCard
            title="Vendas Cantadas por Regional"
            tooltip="Agrupamento por Regional com ordenação do maior para o menor."
            description="Todas as regionais do recorte atual aparecem na ordem do maior volume para o menor."
            badge={formatItemCountLabel(regionalSeries.length)}
            hasData={regionalSeries.length > 0}
            chartKey={`brand-regional-${regionalSeries.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={regionalChartSpec}
            className={horizontalBarChartCardClassName}
            contentClassName={barChartContentClassName}
            chartHeight={regionalChartHeight}
          />

          <ChartCard
            title="Vendas Cantadas por Modelo"
            tooltip="Agrupamento por Versao com normalização de espaços e capitalização, ordenado do maior para o menor."
            description="Todas as versões do recorte atual aparecem em ordem decrescente."
            badge={formatItemCountLabel(modelSeries.length)}
            hasData={modelSeries.length > 0}
            chartKey={`brand-model-${modelSeries.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={modelChartSpec}
            className={horizontalBarChartCardClassName}
            contentClassName={barChartContentClassName}
            chartHeight={modelChartHeight}
          />

          <ChartCard
            title="Vendas Cantadas por Loja"
            tooltip="Agrupamento por Loja_Venda com ordenação do maior para o menor."
            description="A lista completa de lojas fica disponível com rolagem vertical quando necessário."
            badge={formatItemCountLabel(storeSeries.length)}
            hasData={storeSeries.length > 0}
            chartKey={`brand-store-${storeSeries.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={storeChartSpec}
            className={horizontalBarChartCardClassName}
            contentClassName={barChartContentClassName}
            chartHeight={storeChartHeight}
          />

          <ChartCard
            title="Vendas Cantadas por Classificação"
            tooltip="Distribuição por Classificacao após normalização. A visão respeita o mesmo recorte da tabela."
            description="As classificações são consolidadas antes do agrupamento para evitar duplicidades por capitalização."
            badge={formatItemCountLabel(classificationSeries.length)}
            hasData={classificationSeries.length > 0}
            chartKey={`brand-classification-${classificationSeries.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={classificationChartSpec}
            className={horizontalBarChartCardClassName}
            contentClassName={barChartContentClassName}
            chartHeight={classificationChartHeight}
          />
        </div>
      ) : (
        <div className={cn(themedSoftCardClass, "rounded-[28px] px-5 py-8 text-center")}>
          <p className={cn("text-base font-normal tracking-[-0.02em]", themedTextTitleClass)}>
            Nenhuma intenção encontrada
          </p>
          <p className={cn("mt-2 text-sm leading-6", themedTextBodyClass)}>
            Não encontramos registros para os filtros selecionados. Ajuste o período ou a bandeira para visualizar os indicadores e gráficos.
          </p>
        </div>
      )}
    </section>
  );
}
