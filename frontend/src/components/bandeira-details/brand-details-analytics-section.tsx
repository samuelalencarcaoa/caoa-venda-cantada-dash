"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addHours,
  differenceInCalendarDays,
  differenceInHours,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec, ILineChartSpec } from "@visactor/vchart";
import { useTheme } from "next-themes";

import { TooltipIcon } from "@/components/sales-intention-filter-select-card";
import {
  themedCardClass,
  themedChipClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextMutedClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";
import {
  resolveSalesCantadasTrendGranularity,
  type SalesCantadasTrendGranularity,
} from "@/lib/period-metrics";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";

type BrandDetailsAnalyticsSectionProps = {
  items: SalesIntentionReportRow[];
  selectedStartDate?: string;
  selectedEndDate?: string;
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
};

type TrendTooltipSeriesDatum = {
  datum?: TrendPoint[];
};

type TrendTooltipDimensionInfo = {
  data?: TrendTooltipSeriesDatum[];
};

type TrendTooltipDataItem = TrendTooltipSeriesDatum | TrendTooltipDimensionInfo;

type TrendTooltipContentItem = {
  key: string;
  value: string;
  visible: true;
  hasShape: true;
  shapeType: "circle";
  shapeFill: string;
  shapeStroke: string;
  shapeLineWidth: number;
  shapeSize: number;
  shapeHollow: false;
};

type PrimaryClassification = {
  label: string;
  value: number;
  percentage: number;
};

const TOP_ITEMS_LIMIT = 10;
const TREND_TOOLTIP_TRAILING_NON_ZERO_LIMIT = 5;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const trendGranularityLabels: Record<SalesCantadasTrendGranularity, string> = {
  hour: "hora",
  day: "dia",
  week: "semana",
  month: "mês",
  bimonth: "bimestre",
  quarter: "trimestre",
  year: "ano",
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

type TrendBucketSpan = {
  unit: "hour" | "day";
  amount: number;
};

function getTrendBucketSpan(granularity: SalesCantadasTrendGranularity): TrendBucketSpan {
  switch (granularity) {
    case "hour":
      return { unit: "hour", amount: 1 };
    case "day":
      return { unit: "day", amount: 1 };
    case "week":
      return { unit: "day", amount: 7 };
    case "month":
      return { unit: "day", amount: 30 };
    case "bimonth":
      return { unit: "day", amount: 60 };
    case "quarter":
      return { unit: "day", amount: 90 };
    case "year":
      return { unit: "day", amount: 365 };
    default:
      return { unit: "day", amount: 1 };
  }
}

function getTrendBucketStart(date: Date, granularity: SalesCantadasTrendGranularity) {
  if (granularity === "hour") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0, 0);
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function getTrendBucketEnd(date: Date, granularity: SalesCantadasTrendGranularity) {
  const span = getTrendBucketSpan(granularity);

  if (span.unit === "hour") {
    return addHours(date, span.amount);
  }

  return addDays(date, span.amount);
}

function formatTrendAxisLabel(date: Date, granularity: SalesCantadasTrendGranularity) {
  if (granularity === "hour") {
    return format(date, "HH:00", { locale: ptBR });
  }

  return format(date, "dd/MM/yy", { locale: ptBR });
}

function formatTrendHourAxisLabel(value: string | number | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const timestamp = Number(raw);

  if (!Number.isFinite(timestamp)) {
    return String(raw);
  }

  return format(new Date(timestamp), "HH:00", { locale: ptBR });
}

function formatTrendYAxisLabel(value: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const numeric = Number(raw);

  if (!Number.isFinite(numeric)) {
    return String(raw);
  }

  if (Math.abs(numeric) >= 1000) {
    const compactValue = numeric / 1000;
    const compactText = Number.isInteger(compactValue)
      ? String(compactValue)
      : compactValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

    return `${compactText}k`;
  }

  return formatNumber(numeric);
}

function formatTrendTooltipLabel(start: Date, end: Date, granularity: SalesCantadasTrendGranularity) {
  if (granularity === "hour") {
    return format(start, "dd/MM/yyyy HH:00", { locale: ptBR });
  }

  const span = getTrendBucketSpan(granularity);
  if (span.amount === 1) {
    return format(start, "dd/MM/yyyy", { locale: ptBR });
  }

  return `${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", {
    locale: ptBR,
  })}`;
}

function formatTrendTooltipTitle(point: TrendPoint | undefined) {
  return String(point?.label ?? "Data");
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

function getTrendTooltipTrailingNonZeroTimes(points: TrendPoint[]) {
  const orderedTimes = Array.from(
    new Set(points.filter((point) => point.value > 0).map((point) => point.time)),
  ).sort((a, b) => a - b);

  return new Set(orderedTimes.slice(-TREND_TOOLTIP_TRAILING_NON_ZERO_LIMIT));
}

function getTrendTooltipDimensionPosition(
  data: TrendTooltipDataItem[] | undefined,
  trailingNonZeroTimes: Set<number>,
) {
  const referencePoint = getTrendTooltipReferencePoint(data);

  if (referencePoint && trailingNonZeroTimes.has(referencePoint.time)) {
    return {
      right: 12,
      top: 12,
    };
  }

  return {
    left: (event: MouseEvent) => event.offsetX,
    top: 12,
  };
}

function buildTrendTooltipContent(
  data: TrendTooltipDataItem[] | undefined,
  lineColor: string,
  isHourlyTrend: boolean,
) {
  const referencePoint = getTrendTooltipReferencePoint(data);

  if (!referencePoint) {
    return [];
  }

  const content: TrendTooltipContentItem[] = [];

  if (isHourlyTrend) {
    content.push({
      key: "Data de criacao",
      value: String(referencePoint.label ?? "Data"),
      visible: true,
      hasShape: true,
      shapeType: "circle",
      shapeFill: lineColor,
      shapeStroke: lineColor,
      shapeLineWidth: 0,
      shapeSize: 8,
      shapeHollow: false,
    });
  }

  content.push({
    key: "Quantidade",
    value: formatNumber(Number(referencePoint.value || 0)),
    visible: true,
    hasShape: true,
    shapeType: "circle",
    shapeFill: lineColor,
    shapeStroke: lineColor,
    shapeLineWidth: 0,
    shapeSize: 8,
    shapeHollow: false,
  });

  return content;
}

function incrementTrendBucket(date: Date, granularity: SalesCantadasTrendGranularity) {
  return getTrendBucketEnd(date, granularity);
}

function buildTrendSeries(
  items: SalesIntentionReportRow[],
  trendGranularity: SalesCantadasTrendGranularity,
  selectedStartDate?: string,
  selectedEndDate?: string,
) {
  const parsedItemDates = items
    .map((item) => ({
      date: parseReportDateTime(
        trendGranularity === "hour" ? item.Criado : item.Data_solicitacao,
      ),
      quantity: Number(item.Quantidade) || 0,
    }))
    .filter((entry): entry is { date: Date; quantity: number } => entry.date !== null);

  const start = parseInputDate(selectedStartDate)
    ?? parsedItemDates.reduce<Date | null>((currentMin, entry) => {
      if (!currentMin || entry.date < currentMin) {
        return entry.date;
      }

      return currentMin;
    }, null);
  const end = parseInputDate(selectedEndDate)
    ?? parsedItemDates.reduce<Date | null>((currentMax, entry) => {
      if (!currentMax || entry.date > currentMax) {
        return entry.date;
      }

      return currentMax;
    }, null);

  if (!start || !end) {
    return [] as TrendPoint[];
  }

  const firstRecord = parsedItemDates.reduce<Date | null>((currentMin, entry) => {
    if (!currentMin || entry.date < currentMin) {
      return entry.date;
    }

    return currentMin;
  }, null);
  const lastRecord = parsedItemDates.reduce<Date | null>((currentMax, entry) => {
    if (!currentMax || entry.date > currentMax) {
      return entry.date;
    }

    return currentMax;
  }, null);

  const normalizedStart =
    trendGranularity === "hour" && firstRecord
      ? addHours(getTrendBucketStart(firstRecord, trendGranularity), -1)
      : getTrendBucketStart(start, trendGranularity);
  const normalizedEnd =
    trendGranularity === "hour" && lastRecord
      ? addHours(getTrendBucketStart(lastRecord, trendGranularity), 1)
      : getTrendBucketStart(end, trendGranularity);

  if (normalizedStart > normalizedEnd) {
    const swappedStart = normalizedEnd;
    const swappedEnd = normalizedStart;
    normalizedStart.setTime(swappedStart.getTime());
    normalizedEnd.setTime(swappedEnd.getTime());
  }

  const span = getTrendBucketSpan(trendGranularity);
  const valuesByBucket = new Map<number, number>();

  for (const entry of parsedItemDates) {
    const normalizedDate = getTrendBucketStart(entry.date, trendGranularity);
    const elapsed = span.unit === "hour"
      ? Math.max(0, differenceInHours(normalizedDate, normalizedStart))
      : Math.max(0, differenceInCalendarDays(normalizedDate, normalizedStart));
    const bucketIndex = Math.floor(elapsed / span.amount);
    const bucketStart =
      span.unit === "hour"
        ? addHours(normalizedStart, bucketIndex * span.amount)
        : addDays(normalizedStart, bucketIndex * span.amount);
    const key = bucketStart.getTime();
    valuesByBucket.set(key, (valuesByBucket.get(key) ?? 0) + entry.quantity);
  }

  const series: TrendPoint[] = [];
  let cursor = normalizedStart;

  while (cursor.getTime() <= normalizedEnd.getTime()) {
    const time = cursor.getTime();
    const bucketEnd =
      span.unit === "hour"
        ? new Date(Math.min(addHours(cursor, span.amount - 1).getTime(), normalizedEnd.getTime()))
        : new Date(Math.min(addDays(cursor, span.amount - 1).getTime(), normalizedEnd.getTime()));
    series.push({
      time,
      label: formatTrendTooltipLabel(cursor, bucketEnd, trendGranularity),
      axisLabel: formatTrendAxisLabel(cursor, trendGranularity),
      value: valuesByBucket.get(time) ?? 0,
      series: "Intenções",
    });
    cursor = incrementTrendBucket(cursor, trendGranularity);
  }

  return series;
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
        <p className={cn("mt-1 text-[10px] font-medium tracking-[0.18em]", themedTextMutedClass)}>
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
  footer?: string;
}) {
  return (
    <article className={cn(themedCardClass, "w-full min-w-0 overflow-hidden px-4 py-4 sm:px-5 sm:py-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className={cn("text-sm font-medium tracking-[-0.01em]", themedTextTitleClass)}>
              {title}
            </h3>
            <TooltipIcon text={tooltip} />
          </div>
          {description ? (
            <p className={cn("mt-1 text-xs leading-5", themedTextBodyClass)}>
              {description}
            </p>
          ) : null}
        </div>

        {badge ? (
          <span className={cn("shrink-0 self-start whitespace-nowrap px-2.5 py-1 text-[10px]", themedChipClass)}>
            {badge}
          </span>
        ) : null}
      </div>

      <div className={cn("mt-4 min-h-0 max-w-full overflow-hidden", contentClassName ?? "h-[300px] sm:h-[330px]")}>
        {hasData ? (
          <VChart
            key={chartKey}
            spec={spec}
            className="block h-full w-full max-w-full min-w-0"
            style={{ height: "100%", width: "100%", maxWidth: "100%", minWidth: 0 }}
          />
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
  className,
}: BrandDetailsAnalyticsSectionProps) {
  const { resolvedTheme, theme } = useTheme();
  const [isCompactChartLayout, setIsCompactChartLayout] = useState(false);
  const isDarkMode = resolvedTheme === "dark" || theme === "dark";
  const chartTextColor = isDarkMode ? "#e2e8f0" : "#0f172a";
  const chartMutedColor = isDarkMode ? "#94a3b8" : "#64748b";
  const chartGridColor = isDarkMode ? "#334155" : "#e2e8f0";
  const lineColor = "#22d3ee";
  const modelColor = "#0ea5e9";
  const modelAccentColor = "#67e8f9";
  const storeColor = "#14b8a6";
  const storeAccentColor = "#5eead4";
  const classificationColor = "#818cf8";
  const classificationAccentColor = "#c4b5fd";
  const regionalColor = "#f59e0b";
  const regionalAccentColor = "#fcd34d";

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
  const trendGranularity = useMemo(
    () => resolveSalesCantadasTrendGranularity(selectedStartDate, selectedEndDate),
    [selectedEndDate, selectedStartDate],
  );
  const trendGranularityLabel = trendGranularityLabels[trendGranularity];
  const trendGranularityChartLabel = `Agrupado por ${trendGranularityLabel}`;
  const trendGranularityDescription = `A série é consolidada por ${trendGranularityLabel} para manter a leitura contínua do período.`;

  const trendSeries = useMemo(
    () => buildTrendSeries(items, trendGranularity, selectedStartDate, selectedEndDate),
    [items, selectedEndDate, selectedStartDate, trendGranularity],
  );
  const isHourlyTrend = trendGranularity === "hour";
  const trendHourRange = useMemo(() => {
    if (!isHourlyTrend || trendSeries.length === 0) {
      return null;
    }

    const times = trendSeries.map((item) => item.time);
    return {
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }, [isHourlyTrend, trendSeries]);
  const trendTooltipTrailingNonZeroTimes = useMemo(
    () => getTrendTooltipTrailingNonZeroTimes(trendSeries),
    [trendSeries],
  );

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
      data: [
        {
          id: "brandTrend",
          values: trendSeries,
        },
      ],
      xField: isHourlyTrend ? "time" : "axisLabel",
      yField: "value",
      seriesField: "series",
      smooth: true,
      padding: isCompactChartLayout ? [18, 14, 36, 28] : [20, 24, 42, 42],
      color: [lineColor],
      legends: {
        visible: false,
        orient: "bottom",
        position: "middle",
        layout: "horizontal",
        background: { visible: false },
        item: {
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: 11,
              fontWeight: 500,
            },
          },
          shape: {
            space: 6,
            style: {
              size: 8,
            },
          },
        },
      },
      axes: [
        isHourlyTrend && trendHourRange
          ? {
              orient: "bottom",
              type: "linear",
              min: trendHourRange.min,
              max: trendHourRange.max,
              nice: false,
              tick: {
                tickStep: ONE_HOUR_IN_MS,
                noDecimals: true,
                style: {
                  stroke: chartGridColor,
                },
              },
              label: {
                formatMethod: (value: string | string[]) => formatTrendHourAxisLabel(value),
                style: {
                  fill: chartMutedColor,
                  fontSize: isCompactChartLayout ? 10 : 11,
                },
              },
            }
          : {
              orient: "bottom",
              label: {
                autoRotate: false,
                autoHide: true,
                autoHideMethod: "greedy",
                style: {
                  fill: chartMutedColor,
                  fontSize: isCompactChartLayout ? 10 : 11,
                },
              },
              tick: {
                style: {
                  stroke: chartGridColor,
                },
              },
            },
        {
          orient: "left",
          nice: true,
          label: {
            style: {
              fill: chartMutedColor,
              fontSize: isCompactChartLayout ? 10 : 11,
            },
            formatMethod: (value: string | string[]) => formatTrendYAxisLabel(value),
          },
          tick: {
            tickCount: 6,
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
      ],
      tooltip: {
        trigger: ["hover", "click"],
        activeType: "dimension",
        confine: false,
        offset: { x: 0, y: 0 },
        dimension: {
          title: {
            visible: true,
            value: (datum) => formatTrendTooltipTitle(datum as TrendPoint | undefined),
          },
          position: (data) =>
            getTrendTooltipDimensionPosition(
              data as TrendTooltipDataItem[] | undefined,
              trendTooltipTrailingNonZeroTimes,
            ),
          updateContent: (_prev, data) =>
            buildTrendTooltipContent(
              data as TrendTooltipDataItem[] | undefined,
              lineColor,
              isHourlyTrend,
            ),
        },
      },
      point: {
        visible: true,
        style: {
          size: 4.5,
          fill: "#ffffff",
          stroke: "#64748b",
          lineWidth: 1.4,
        },
      },
      line: {
        style: {
          lineWidth: 2.3,
          lineCap: "round",
          lineJoin: "round",
          curveType: "monotone",
          strokeOpacity: 0.98,
        },
      },
      area: {
        visible: false,
      },
      crosshair: {
        followTooltip: {
          dimension: true,
        },
        xField: {
          visible: true,
          line: {
            visible: true,
            style: {
              stroke: chartGridColor,
              strokeOpacity: 0.45,
              lineWidth: 1,
              lineDash: [4, 4],
            },
          },
        },
      },
    }),
    [
      chartGridColor,
      chartMutedColor,
      isCompactChartLayout,
      isDarkMode,
      lineColor,
      isHourlyTrend,
      trendHourRange,
      trendSeries,
      trendTooltipTrailingNonZeroTimes,
    ],
  );

  const modelChartData = useMemo(
    () => modelSeries.slice(0, TOP_ITEMS_LIMIT),
    [modelSeries],
  );

  const storeChartData = useMemo(
    () => storeSeries.slice(0, TOP_ITEMS_LIMIT),
    [storeSeries],
  );

  const classificationChartData = useMemo(
    () => classificationSeries.slice(0, TOP_ITEMS_LIMIT),
    [classificationSeries],
  );

  const regionalChartData = useMemo(
    () => regionalSeries.slice(0, TOP_ITEMS_LIMIT),
    [regionalSeries],
  );

  const barChartPadding = useMemo(
    () => getHorizontalBarPadding(isCompactChartLayout),
    [isCompactChartLayout],
  );
  const barAxisFontSize = isCompactChartLayout ? 9 : 11;
  const barLabelMaxLength = isCompactChartLayout ? 14 : 28;

  const modelChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      direction: "horizontal",
      autoFit: true,
      data: [
        {
          id: "brandModelDistribution",
          values: modelChartData,
        },
      ],
      xField: "value",
      yField: "label",
      color: [modelColor],
      padding: barChartPadding,
      barMinHeight: 10,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(modelColor, modelAccentColor),
          cornerRadius: 999,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: isDarkMode ? "#1f2937" : "#e2e8f0",
          cornerRadius: 999,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 600,
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
      isDarkMode,
      modelAccentColor,
      modelChartData,
      modelColor,
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
          values: storeChartData,
        },
      ],
      xField: "value",
      yField: "label",
      color: [storeColor],
      padding: barChartPadding,
      barMinHeight: 10,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(storeColor, storeAccentColor),
          cornerRadius: 999,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: isDarkMode ? "#1f2937" : "#e2e8f0",
          cornerRadius: 999,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 600,
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
      isDarkMode,
      storeAccentColor,
      storeChartData,
      storeColor,
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
          values: classificationChartData,
        },
      ],
      xField: "value",
      yField: "label",
      color: [classificationColor],
      padding: barChartPadding,
      barMinHeight: 10,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(classificationColor, classificationAccentColor),
          cornerRadius: 999,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: isDarkMode ? "#1f2937" : "#e2e8f0",
          cornerRadius: 999,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 600,
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
      classificationChartData,
      classificationColor,
      classificationAccentColor,
      isDarkMode,
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
          values: regionalChartData,
        },
      ],
      xField: "value",
      yField: "label",
      color: [regionalColor],
      padding: barChartPadding,
      barMinHeight: 10,
      bar: {
        style: {
          fill: buildHorizontalBarGradient(regionalColor, regionalAccentColor),
          cornerRadius: 999,
        },
      },
      barBackground: {
        visible: true,
        style: {
          fill: isDarkMode ? "#1f2937" : "#e2e8f0",
          cornerRadius: 999,
        },
      },
      label: {
        visible: true,
        position: "right",
        style: {
          fill: chartTextColor,
          fontSize: 11,
          fontWeight: 600,
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
      isDarkMode,
      regionalAccentColor,
      regionalChartData,
      regionalColor,
    ],
  );

  const isModelChartLimited = modelSeries.length > TOP_ITEMS_LIMIT;
  const isStoreChartLimited = storeSeries.length > TOP_ITEMS_LIMIT;
  const isClassificationChartLimited = classificationSeries.length > TOP_ITEMS_LIMIT;
  const isRegionalChartLimited = regionalSeries.length > TOP_ITEMS_LIMIT;

  return (
    <section
      aria-labelledby="brand-analytics-title"
      className={cn("min-w-0 space-y-4 max-w-full overflow-x-clip", className)}
    >
      <div className="px-1">
        <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>Big Numbers</p>
        <h2
          id="brand-analytics-title"
          className={cn("mt-1 text-lg font-medium tracking-[-0.02em]", themedTextTitleClass)}
        >
          Painel analítico da bandeira
        </h2>
        <p className={cn("mt-1 text-xs leading-5", themedTextBodyClass)}>
          Os indicadores abaixo usam exatamente o mesmo recorte filtrado da tabela detalhada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 phone:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total de intenções"
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
          valueClassName="text-2xl font-medium leading-tight tracking-[-0.04em] sm:text-3xl"
        />
      </div>

      {hasData ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Vendas Cantadas no Período"
            tooltip="Evolução da soma de Quantidade no período selecionado, consolidada pela granularidade atual."
            description={trendGranularityDescription}
            badge={trendGranularityChartLabel}
            hasData={trendSeries.length > 0}
            chartKey={`brand-trend-${trendGranularity}-${trendSeries
              .map((item) => `${item.time}:${item.value}`)
              .join("|")}`}
            spec={trendChartSpec}
            contentClassName="h-[300px] sm:h-[340px]"
          />

          <ChartCard
            title="Vendas Cantadas por Regional"
            tooltip="Agrupamento por Regional com ordenação do maior para o menor."
            description="As regionais mais relevantes do recorte atual."
            badge={isRegionalChartLimited ? `Top ${TOP_ITEMS_LIMIT}` : formatItemCountLabel(regionalSeries.length)}
            hasData={regionalChartData.length > 0}
            chartKey={`brand-regional-${regionalChartData.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={regionalChartSpec}
            contentClassName="h-[300px] sm:h-[340px]"
            footer={isRegionalChartLimited ? `Mostrando ${TOP_ITEMS_LIMIT} de ${regionalSeries.length} regionais para preservar a leitura.` : undefined}
          />

          <ChartCard
            title="Vendas Cantadas por Modelo"
            tooltip="Agrupamento por Versao com normalização de espaços e capitalização, ordenado do maior para o menor."
            description="Mostrando as versões mais relevantes do recorte atual."
            badge={isModelChartLimited ? `Top ${TOP_ITEMS_LIMIT}` : formatItemCountLabel(modelSeries.length)}
            hasData={modelChartData.length > 0}
            chartKey={`brand-model-${modelChartData.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={modelChartSpec}
            contentClassName="h-[300px] sm:h-[340px]"
            footer={isModelChartLimited ? `Mostrando ${TOP_ITEMS_LIMIT} de ${modelSeries.length} modelos para preservar a leitura.` : undefined}
          />

          <ChartCard
            title="Vendas Cantadas por Loja"
            tooltip="Agrupamento por Loja_Venda com ordenação do maior para o menor."
            description="Caso existam muitas lojas, a visualização mantém as mais relevantes em destaque."
            badge={isStoreChartLimited ? `Top ${TOP_ITEMS_LIMIT}` : formatItemCountLabel(storeSeries.length)}
            hasData={storeChartData.length > 0}
            chartKey={`brand-store-${storeChartData.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={storeChartSpec}
            contentClassName="h-[300px] sm:h-[340px]"
            footer={isStoreChartLimited ? `Mostrando ${TOP_ITEMS_LIMIT} de ${storeSeries.length} lojas para evitar corte silencioso.` : undefined}
          />

          <ChartCard
            title="Vendas Cantadas por Classificação"
            tooltip="Distribuição por Classificacao após normalização. A visão respeita o mesmo recorte da tabela."
            description="As classificações são consolidadas antes do agrupamento para evitar duplicidades por capitalização."
            badge={isClassificationChartLimited ? `Top ${TOP_ITEMS_LIMIT}` : formatItemCountLabel(classificationSeries.length)}
            hasData={classificationChartData.length > 0}
            chartKey={`brand-classification-${classificationChartData.map((item) => `${item.key}:${item.value}`).join("|")}`}
            spec={classificationChartSpec}
            contentClassName="h-[300px] sm:h-[340px]"
            footer={isClassificationChartLimited ? `Mostrando ${TOP_ITEMS_LIMIT} de ${classificationSeries.length} classificações para preservar a leitura.` : undefined}
          />
        </div>
      ) : (
        <div className={cn(themedSoftCardClass, "rounded-[28px] px-5 py-8 text-center")}>
          <p className={cn("text-base font-medium tracking-[-0.02em]", themedTextTitleClass)}>
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
