"use client";

import { format } from "date-fns";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Eye,
  EyeOff,
  Medal,
  Maximize2,
  NotebookText,
  RefreshCw,
  SlidersHorizontal,
  Trophy,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { VChart } from "@visactor/react-vchart";
import type { ILineChartSpec } from "@visactor/vchart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportErrorCard } from "@/components/report-error-card";
import { MobileDetailedTableModal } from "@/components/mobile-detailed-table-modal";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { FilterSelectCard, TooltipIcon } from "@/components/sales-intention-filter-select-card";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import {
  fetchSalesIntentionClassificacoes,
  fetchSalesIntentionCatalogs,
  fetchSalesIntentionModelosDealer,
  type SalesIntentionReportRow,
} from "@/lib/salesIntentionApi";
import {
  buildEquivalentPreviousPeriodRange,
  resolveSalesCantadasAverageMetric,
} from "@/lib/period-metrics";
import {
  themedCardClass,
  themedInputClass,
  themedChipClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedHeroClass,
  themedPanelClass,
  themedSoftCardClass,
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

const trendPalette = [
  "#4f83cc",
  "#2ca6c9",
  "#c98a2d",
  "#6c72d9",
  "#cb6f82",
  "#3eaa97",
  "#cf7d3e",
  "#79a35a",
  "#9a6fd3",
  "#c86d5a",
] as const;

const MAX_TREND_SERIES = 5;
const trendOptions = [
  { value: "volume", label: "Volume" },
  { value: "acumulado", label: "Acumulado" },
] as const;

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

const rankingDisplayOptions = [10, 20, 50, 100] as const;
type RankingDisplayCount = (typeof rankingDisplayOptions)[number];

const vendorStatusChipClass =
  "rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium";

const vendorFilterChipClass = cn(
  themedChipClass,
  "inline-flex max-w-[18rem] items-center normal-case tracking-normal truncate",
);

function toTitleCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatVendorDisplayName(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return trimmed || "Sem dados";
  }

  const localPart = trimmed.split("@")[0] ?? "";
  const parts = localPart
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return trimmed;
  }

  const displayParts =
    parts.length === 1 ? parts : parts.length === 2 ? parts : [parts[0], parts[parts.length - 1]];

  return displayParts.map(toTitleCase).join(" ");
}

type TrendView = (typeof trendOptions)[number]["value"];

type TrendPoint = {
  label: string;
  hour: number;
  vendor: string;
  quantity: number;
  time: number;
};

type ComparisonDirection = "up" | "down" | "neutral";

type TrendSeriesSummary = {
  vendor: string;
  displayVendor: string;
  color: string;
  points: TrendPoint[];
  currentTotal: number;
  averageValue: number;
  averageLabel: string;
  comparisonDirection: ComparisonDirection;
  comparisonText: string;
};

type TrendTooltipSeriesDatum = {
  key?: string;
  datum?: TrendPoint[];
  series?: {
    getSeriesStyle?: (datum: TrendPoint) => ((key: string) => unknown) | undefined;
  };
};

type TrendTooltipDimensionInfo = {
  data?: TrendTooltipSeriesDatum[];
};

type TrendTooltipDataItem = TrendTooltipDimensionInfo | TrendTooltipSeriesDatum;

type TrendTooltipContentLine = {
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

function formatComparisonLabel(currentTotal: number, previousTotal: number) {
  if (previousTotal <= 0) {
    if (currentTotal <= 0) {
      return {
        direction: "neutral" as ComparisonDirection,
        text: "0%",
      };
    }

    return {
      direction: "up" as ComparisonDirection,
      text: "novo",
    };
  }

  const percent = ((currentTotal - previousTotal) / previousTotal) * 100;

  if (percent > 0) {
    return {
      direction: "up" as ComparisonDirection,
      text: `+${Math.abs(percent).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}%`,
    };
  }

  if (percent < 0) {
    return {
      direction: "down" as ComparisonDirection,
      text: `-${Math.abs(percent).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}%`,
    };
  }

  return {
    direction: "neutral" as ComparisonDirection,
    text: "0%",
  };
}

function ChartToggle({
  options,
  value,
  onChange,
}: {
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

function parseReportDate(value: string): Date | null {
  const [datePart, timePart = "00:00:00"] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTodayInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

function formatInputDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayInputDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return format(new Date(year, month - 1, day), "dd/MM/yyyy");
}

function buildLocalDateFromInput(value: string, endOfDay = false) {
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
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTrendTooltipDate(time: number, isSingleDayPeriod: boolean) {
  return format(new Date(time), isSingleDayPeriod ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy");
}

function formatTrendTooltipTitle(point: TrendPoint | undefined, isSingleDayPeriod: boolean) {
  if (!point) {
    return "";
  }

  return formatTrendTooltipDate(point.time, isSingleDayPeriod);
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

function isSameTrendTooltipPoint(
  candidate: TrendPoint,
  reference: TrendPoint,
  isSingleDayPeriod: boolean,
) {
  return isSingleDayPeriod
    ? candidate.hour === reference.hour
    : candidate.time === reference.time || candidate.label === reference.label;
}

function buildTrendTooltipContent(
  data: TrendTooltipDataItem[] | undefined,
  seriesSummaries: TrendSeriesSummary[],
  isSingleDayPeriod: boolean,
) {
  const referencePoint = getTrendTooltipReferencePoint(data);

  if (!referencePoint) {
    return [];
  }

  return seriesSummaries.flatMap((seriesSummary) => {
    const point = seriesSummary.points.find((candidate) =>
      isSameTrendTooltipPoint(candidate, referencePoint, isSingleDayPeriod),
    );

    if (!point) {
      return [];
    }

    return [
      {
        key: seriesSummary.displayVendor,
        value: Number(point.quantity || 0).toLocaleString("pt-BR"),
        visible: true as const,
        hasShape: true as const,
        shapeType: "circle" as const,
        shapeFill: seriesSummary.color,
        shapeStroke: seriesSummary.color,
        shapeLineWidth: 0,
        shapeSize: 8,
        shapeHollow: false as const,
      },
    ];
  });
}

function buildSparklineGeometry(
  points: TrendPoint[],
  width = 220,
  height = 72,
  padding = 8,
) {
  if (points.length === 0) {
    return {
      path: "",
      lastPoint: null as { x: number; y: number } | null,
    };
  }

  if (points.length === 1) {
    return {
      path: "",
      lastPoint: {
        x: width / 2,
        y: height / 2,
      },
    };
  }

  const values = points.map((point) => point.quantity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const coordinates = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.quantity - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return {
    path,
    lastPoint: coordinates[coordinates.length - 1] ?? null,
  };
}

function ComparisonBadge({
  direction,
  text,
}: {
  direction: ComparisonDirection;
  text: string;
}) {
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight;
  const toneClass =
    direction === "up"
      ? "border-emerald-200/60 bg-emerald-50/90 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
      : direction === "down"
        ? "border-rose-200/60 bg-rose-50/90 text-rose-700 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-200"
        : "border-slate-200/70 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tabular-nums",
        toneClass,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
}

type VendorReportFilterOptions = {
  selectedTipoVenda: string[];
  selectedBandeira: string[];
  selectedRegional: string[];
  selectedLojaVenda: string[];
  selectedMarcaVeiculo: string[];
  selectedModelo: string[];
  selectedVersao: string[];
  selectedClassificacao: string[];
  vehicleCatalogRows: SalesIntentionModelosDealerRecord[];
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
};

function matchesVendorReportFilters(
  item: SalesIntentionReportRow,
  options: VendorReportFilterOptions,
) {
  const itemTipoVenda = item.Tipo_Venda || "";
  const itemBandeira = item.Bandeira || "Sem Bandeira";
  const itemRegional = item.Regional || "";
  const itemLojaVenda = item.Loja_Venda || "";
  const itemMarcaVeiculo = item.Marca_Veiculo || "Sem Marca";
  const itemClassificacao = item.Classificacao || "";
  const itemVersao = item.Versao || "";
  const normalizedItemVersao = normalizeValue(itemVersao);

  const matchesModelo =
    options.selectedModelo.length === 0 ||
    options.vehicleCatalogRows.some(
      (row) =>
        normalizeValue(row.tipoVenda) === normalizeValue(itemTipoVenda) &&
        normalizeValue(row.marca) === normalizeValue(itemMarcaVeiculo) &&
        matchesSelectedValues(options.selectedModelo, row.modelo) &&
        normalizeValue(row.versaoModelo) === normalizedItemVersao,
    );

  const matchesTipoVenda = matchesSelectedValues(options.selectedTipoVenda, itemTipoVenda);
  const matchesBandeira = matchesSelectedValues(options.selectedBandeira, itemBandeira);
  const matchesRegional = matchesSelectedValues(options.selectedRegional, itemRegional);
  const matchesLojaVenda = matchesSelectedValues(options.selectedLojaVenda, itemLojaVenda);
  const matchesMarcaVeiculo = matchesSelectedValues(
    options.selectedMarcaVeiculo,
    itemMarcaVeiculo,
  );
  const matchesVersao = matchesSelectedValues(options.selectedVersao, itemVersao);
  const matchesClassificacao = matchesSelectedValues(
    options.selectedClassificacao,
    itemClassificacao,
  );

  let matchesDateRange = true;
  if (options.rangeStart || options.rangeEnd) {
    const itemDate = parseReportDate(item.Data_solicitacao);
    if (!itemDate) {
      return false;
    }

    if (options.rangeStart && itemDate < options.rangeStart) {
      matchesDateRange = false;
    }

    if (options.rangeEnd && itemDate > options.rangeEnd) {
      matchesDateRange = false;
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
}

function TrendComparisonRail({
  series,
  trendView,
  hiddenSeries,
  onToggleSeriesVisibility,
}: {
  series: TrendSeriesSummary[];
  trendView: TrendView;
  hiddenSeries: string[];
  onToggleSeriesVisibility: (vendor: string) => void;
}) {
  if (series.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-h-[250px] flex-col gap-3 tablet:hidden">
      <div className="flex items-center justify-between gap-2">
        <span className={cn(themedChipClass, "whitespace-nowrap px-2.5 py-1")}>
          {trendView === "acumulado" ? "Acumulado" : "Volume"}
        </span>
        <span className={cn("text-[11px]", themedTextMutedClass)}>
          Arraste para comparar cada vendedor
        </span>
      </div>

      <div className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-1">
        {series.map((item) => {
          const isHidden = hiddenSeries.includes(item.vendor);
          const { path, lastPoint } = buildSparklineGeometry(item.points);
          const totalValue = item.currentTotal.toLocaleString("pt-BR");
          const averageValue = item.averageValue.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });

          return (
            <article
              key={item.vendor}
              className={cn(
                themedSoftCardClass,
                "relative min-w-[220px] snap-start rounded-2xl border border-slate-200/80 bg-white/90 p-3 pr-12 shadow-sm dark:border-white/10 dark:bg-slate-950/60",
                isHidden && "opacity-45",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={isHidden}
                aria-label={
                  isHidden
                    ? `Exibir ${item.displayVendor} no gráfico`
                    : `Ocultar ${item.displayVendor} do gráfico`
                }
                title={isHidden ? "Mostrar série" : "Ocultar série"}
                onClick={() => onToggleSeriesVisibility(item.vendor)}
                className={cn(
                  "absolute right-2 top-2 h-8 w-8 rounded-lg border shadow-sm transition",
                  isHidden
                    ? "border-slate-300/70 bg-slate-100/90 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                    : "border-slate-200/70 bg-white/95 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>

              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-medium", themedTextTitleClass)}>
                    {item.displayVendor}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                <p className={cn("text-[10px] uppercase tracking-[0.18em]", themedTextMutedClass)}>
                  Total
                </p>
                <p className={cn("text-right text-[10px] uppercase tracking-[0.18em]", themedTextMutedClass)}>
                  {item.averageLabel}
                </p>
                <p className={cn("text-2xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
                  {totalValue}
                </p>
                <p className={cn("text-right text-2xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
                  {averageValue}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <ComparisonBadge
                  direction={item.comparisonDirection}
                  text={item.comparisonText}
                />
                <span className={cn("text-[10px] uppercase tracking-[0.18em]", themedTextMutedClass)}>
                  vs. período anterior
                </span>
              </div>

              <svg
                aria-hidden="true"
                className={cn(
                  "mt-3 h-16 w-full text-slate-400 transition-opacity dark:text-slate-500",
                  isHidden && "opacity-0",
                )}
                viewBox="0 0 220 72"
              >
                <line
                  x1="8"
                  x2="212"
                  y1="60"
                  y2="60"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />
                {path ? (
                  <path
                    d={path}
                    fill="none"
                    stroke={item.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.75"
                  />
                ) : null}
                {lastPoint ? (
                  <circle cx={lastPoint.x} cy={lastPoint.y} r="3.75" fill={item.color} />
                ) : null}
              </svg>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function sortUniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value && value !== "Todos"),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function normalizeValue(value: string) {
  return value.trim().toUpperCase();
}

function matchesSelectedValues(selected: string[], value: string) {
  return (
    selected.length === 0 ||
    selected.some((option) => normalizeValue(option) === normalizeValue(value))
  );
}

function StatCard({
  label,
  caption,
  value,
  tooltip,
}: {
  label: string;
  caption?: string;
  value: string;
  tooltip: string;
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
      <p className={cn("mt-3 text-3xl font-light tracking-[-0.05em] sm:text-4xl", themedTextTitleClass)}>
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  tooltip,
  children,
  hasData,
  className,
  headerRight,
  contentClassName,
}: {
  title: string;
  tooltip: string;
  children: ReactNode;
  hasData: boolean;
  className?: string;
  headerRight?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <article className={cn(themedCardClass, "min-w-0 px-5 py-5", className)}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className={cn("text-sm font-medium tracking-[-0.01em]", themedTextTitleClass)}>
              {title}
            </h2>
            <TooltipIcon text={tooltip} />
          </div>
        </div>
        {headerRight ? <div className="min-w-0 lg:max-w-[560px]">{headerRight}</div> : null}
      </div>

      <div className={cn("min-w-0", contentClassName ?? "h-[300px]")}>
        {hasData ? (
          children
        ) : (
          <p className={cn("flex h-full items-center justify-center text-sm", themedTextMutedClass)}>
            Nenhum dado no período.
          </p>
        )}
      </div>
    </article>
  );
}

function RankingCard({
  items,
  totalQuantity: _totalQuantity,
  visibleCount,
  onVisibleCountChange,
  onExport,
  className,
}: {
  items: Array<{ vendor: string; proposals: number; quantity: number; avgPerProposal: number }>;
  totalQuantity: number;
  visibleCount: RankingDisplayCount;
  onVisibleCountChange: (value: RankingDisplayCount) => void;
  onExport: () => void;
  className?: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / visibleCount));
  const visibleItems = useMemo(
    () => items.slice((currentPage - 1) * visibleCount, currentPage * visibleCount),
    [currentPage, items, visibleCount],
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [items, visibleCount]);

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0 });
  }, [currentPage, visibleCount]);

  return (
    <article className={cn(themedCardClass, "flex h-full min-w-0 flex-col p-5", className)}>
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className={cn("text-base font-medium tracking-[-0.02em]", themedTextTitleClass)}>
              Ranking de Vendedores
            </h2>
            <TooltipIcon text="Todos os vendedores ordenados por quantidade vendida no recorte atual." />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Mostrar</span>
            <select
              value={String(visibleCount)}
              onChange={(event) => onVisibleCountChange(Number(event.target.value) as RankingDisplayCount)}
              className={cn(
                "h-9 rounded-xl border px-2.5 text-xs outline-none transition focus:ring-2",
                themedInputClass,
              )}
            >
              {rankingDisplayOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={onExport}
            className={cn("h-8 text-xs", themedOutlineButtonClass)}
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/50">
        <div ref={tableScrollRef} className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[560px] w-full divide-y divide-border text-left text-xs">
            <thead className="sticky top-0 z-10 bg-muted/95 text-muted-foreground backdrop-blur">
              <tr>
                <th className="border-b border-border bg-background/95 px-3 py-2 font-medium">
                  Vendedor
                </th>
                <th className="border-b border-border bg-background/95 px-3 py-2 text-right font-medium">
                  Venda Cantada
                </th>
                <th className="border-b border-border bg-background/95 px-3 py-2 text-right font-medium">
                  Quantidade
                </th>
                <th className="border-b border-border bg-background/95 px-3 py-2 text-right font-medium">
                  Média/Proposta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {visibleItems.length ? (
                visibleItems.map((row, idx) => {
                  const position = (currentPage - 1) * visibleCount + idx + 1;
                  let medal: ReactNode = null;

                  if (position === 1) {
                    medal = <Trophy size={16} className="mr-1 inline text-yellow-500" />;
                  } else if (position === 2) {
                    medal = <Medal size={16} className="mr-1 inline text-gray-500" />;
                  } else if (position === 3) {
                    medal = <Medal size={16} className="mr-1 inline text-orange-600" />;
                  }

                  return (
                    <tr key={`${row.vendor}-${position}`} className="odd:bg-card">
                      <td className={cn("px-3 py-2", themedTextStrongClass)}>
                        {medal}
                        {row.vendor}
                      </td>
                      <td className="px-3 py-2 text-right">{row.proposals}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {row.quantity.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.avgPerProposal.toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className={cn("px-3 py-8 text-center text-xs", themedTextMutedClass)}
                  >
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 text-xs xl:flex-row xl:items-center xl:justify-between">
        <p className="text-muted-foreground">
          Mostrando {visibleItems.length} de {items.length} vendedores
        </p>

        <div className="flex flex-wrap items-center gap-2 xl:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
            className={cn("h-8 w-8 rounded-full p-0 text-[11px] font-medium", themedOutlineButtonClass)}
            aria-label="Página anterior"
            title="Página anterior"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <span
            className={cn(
              "min-w-20 rounded-full border px-3 py-1 text-center text-[11px] font-medium tabular-nums",
              themedChipClass,
            )}
          >
            {currentPage}/{totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
            className={cn("h-8 w-8 rounded-full p-0 text-[11px] font-medium", themedOutlineButtonClass)}
            aria-label="Próxima página"
            title="Próxima página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy size={14} className="text-yellow-500" />
            <span>1º</span>
          </span>
          <span className="flex items-center gap-1">
            <Medal size={14} className="text-gray-500" />
            <span>2º</span>
          </span>
          <span className="flex items-center gap-1">
            <Medal size={14} className="text-orange-600" />
            <span>3º</span>
          </span>
        </p>
      </div>
    </article>
  );
}

function TrendVendorSelector({
  value,
  options,
  onChange,
  trendView,
  onTrendViewChange,
  onOpenFullscreen,
  disabled = false,
  maxSelected = MAX_TREND_SERIES,
}: {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  trendView: TrendView;
  onTrendViewChange: (value: TrendView) => void;
  onOpenFullscreen?: () => void;
  disabled?: boolean;
  maxSelected?: number;
}) {
  const hasOptions = options.length > 0;
  const displayValue =
    !hasOptions
      ? "Sem vendedores"
      : value.length === 0
        ? "Top 5"
        : value.length === 1
          ? "1 vendedor"
          : `${value.length} vendedores`;
  const limitReached = value.length >= maxSelected;

  const toggleOption = (option: string, checked: boolean) => {
    if (checked) {
      if (value.length >= maxSelected && !value.includes(option)) {
        return;
      }

      onChange([...new Set([...value, option])]);
      return;
    }

    onChange(value.filter((item) => item !== option));
  };

  return (
    <div className={cn(themedSoftCardClass, "min-w-0 rounded-2xl p-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn(themedTinyLabelClass, "tracking-[0.18em]")}>Comparativo</p>
            <TooltipIcon
              text={`Compare até ${maxSelected} vendedores em linhas separadas. Sem seleção, o gráfico usa os ${maxSelected} maiores do recorte.`}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(themedChipClass, "whitespace-nowrap")}>{displayValue}</span>
          {onOpenFullscreen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenFullscreen}
              className="h-8 w-8 rounded-xl border border-slate-200/70 bg-white/80 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Abrir gráfico em tela cheia"
              title="Abrir em tela cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <ChartToggle
          options={trendOptions}
          value={trendView}
          onChange={(value) => onTrendViewChange(value as TrendView)}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "mt-3 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
              themedInputClass,
            )}
          >
            <span className="truncate">{hasOptions ? "Selecionar" : "Sem dados"}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", themedTextMutedClass)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 overflow-y-auto rounded-xl p-1.5"
        >
          <DropdownMenuLabel className="px-2 py-1 text-xs">Vendedores</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={value.length === 0}
            onCheckedChange={() => onChange([])}
          >
            Top 5
          </DropdownMenuCheckboxItem>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              disabled={limitReached && !value.includes(option)}
              onCheckedChange={(checked) => toggleOption(option, checked === true)}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TrendFullscreenSeriesRail({
  series,
  trendView,
  hiddenSeries,
  onToggleSeriesVisibility,
}: {
  series: TrendSeriesSummary[];
  trendView: TrendView;
  hiddenSeries: string[];
  onToggleSeriesVisibility: (vendor: string) => void;
}) {
  const summaryLabel = trendView === "acumulado" ? "Acumulado" : "Volume";
  const rankedSeries = [...series].sort((a, b) => b.currentTotal - a.currentTotal);
  const maxTotal = rankedSeries[0]?.currentTotal || 1;
  const topSeries = rankedSeries[0];

  return (
    <aside
      className={cn(
        themedSoftCardClass,
        "flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 p-4 shadow-sm h-[360px] phone:h-[380px] tablet:h-[420px] dark:border-white/10 dark:bg-white/5 desktop:h-full desktop:p-3",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(themedTinyLabelClass, "tracking-[0.22em]")}>Séries</p>
          <p className={cn("mt-1 text-sm", themedTextMutedClass)}>
            {rankedSeries.length} vendedores em {summaryLabel.toLowerCase()}
          </p>
        </div>
        <span className={cn(themedChipClass, "whitespace-nowrap")}>{summaryLabel}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {topSeries ? (
          <span className={cn(themedChipClass, "max-w-full truncate whitespace-nowrap")}>
            Líder: {topSeries.displayVendor}
          </span>
        ) : null}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {rankedSeries.map((item, index) => {
          const isHidden = hiddenSeries.includes(item.vendor);
          const totalValue = item.currentTotal.toLocaleString("pt-BR");
          const averageValue = item.averageValue.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });
          const progress = Math.max(6, (item.currentTotal / maxTotal) * 100);

          return (
            <div
              key={item.vendor}
              className={cn(
                "relative rounded-2xl border border-slate-200/70 bg-white/90 p-2.5 pr-12 shadow-sm transition-opacity dark:border-white/10 dark:bg-slate-950/55",
                isHidden && "opacity-45",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={isHidden}
                aria-label={
                  isHidden
                    ? `Exibir ${item.displayVendor} no gráfico`
                    : `Ocultar ${item.displayVendor} do gráfico`
                }
                title={isHidden ? "Mostrar série" : "Ocultar série"}
                onClick={() => onToggleSeriesVisibility(item.vendor)}
                className={cn(
                  "absolute right-2 top-2 h-8 w-8 rounded-lg border shadow-sm transition",
                  isHidden
                    ? "border-slate-300/70 bg-slate-100/90 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                    : "border-slate-200/70 bg-white/95 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>

              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm font-medium", themedTextTitleClass)}>
                          {item.displayVendor}
                        </p>
                        {index === 0 ? (
                          <span className={cn(themedChipClass, "shrink-0 px-2 py-0.5 text-[9px]")}>
                            líder
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-[10px] uppercase tracking-[0.18em]",
                          themedTextMutedClass,
                        )}
                      >
                        Desempenho no período
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                    <p className={cn("text-[10px] uppercase tracking-[0.18em]", themedTextMutedClass)}>
                      Total de vendas cantadas
                    </p>
                    <p className={cn("text-right text-[10px] uppercase tracking-[0.18em]", themedTextMutedClass)}>
                      {item.averageLabel}
                    </p>
                    <p className={cn("text-2xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
                      {totalValue}
                    </p>
                    <p className={cn("text-right text-2xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
                      {averageValue}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <ComparisonBadge
                      direction={item.comparisonDirection}
                      text={item.comparisonText}
                    />
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: item.color,
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function TrendFullscreenModal({
  open,
  title,
  subtitle,
  periodText,
  filterChips,
  hiddenSeries,
  onToggleSeriesVisibility,
  tooltipParentElementId,
  chartKey,
  chartSpec,
  series,
  trendView,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  periodText: string;
  filterChips: string[];
  hiddenSeries: string[];
  onToggleSeriesVisibility: (vendor: string) => void;
  tooltipParentElementId: string;
  chartKey: string;
  chartSpec: ILineChartSpec;
  series: TrendSeriesSummary[];
  trendView: TrendView;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const visibleFilterChips = filterChips.slice(0, 4);
  const remainingFilterCount = Math.max(0, filterChips.length - visibleFilterChips.length);
  const periodValue = periodText.replace(/^Período:\s*/i, "");
  const resolvedChartSpec = useMemo<ILineChartSpec>(
    () => ({
      ...chartSpec,
      tooltip: {
        ...(chartSpec.tooltip ?? {}),
        parentElement: tooltipParentElementId,
        offset: { x: 12, y: 0 },
      },
    }),
    [chartSpec, tooltipParentElementId],
  );

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/70 p-3 backdrop-blur-sm overflow-y-auto desktop:overflow-hidden"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-describedby="trend-fullscreen-description"
        aria-labelledby="trend-fullscreen-title"
        aria-modal="true"
        className={cn(
          themedPanelClass,
          "flex h-[calc(100dvh-1.5rem)] w-full flex-col overflow-visible bg-white/95 text-slate-900 dark:bg-slate-950/95 dark:text-slate-100",
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className={cn(themedTinyLabelClass, "tracking-[0.22em]")}>Tela cheia</p>
            <h3 id="trend-fullscreen-title" className={cn("mt-1 text-xl font-medium tracking-[-0.02em]", themedTextTitleClass)}>
              {title}
            </h3>
            <p id="trend-fullscreen-description" className={cn("mt-1 text-sm", themedTextMutedClass)}>
              {subtitle}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-slate-200/70 bg-white/80 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fechar visualização em tela cheia"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-4 px-4 pb-4 desktop:grid desktop:grid-cols-[minmax(0,1.18fr)_minmax(340px,15vw)] desktop:gap-4 desktop:items-stretch">
          <div className="flex min-h-0 flex-col gap-3 rounded-[28px] border border-slate-200/70 bg-slate-50 p-3 shadow-sm dark:border-white/10 dark:bg-white/5 desktop:h-full">
            <div className="rounded-[24px] border border-slate-200/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/55">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className={cn(themedTinyLabelClass, "tracking-[0.22em]")}>Período selecionado</span>
                  <span
                    className={cn(
                      themedChipClass,
                      "shrink-0 border-cyan-400/30 bg-cyan-400/12 px-3 py-1 text-[11px] text-cyan-700 shadow-none dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100",
                    )}
                  >
                    {periodValue}
                  </span>
                </div>

                {filterChips.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end sm:overflow-x-auto">
                    <span
                      className={cn(
                        "shrink-0 text-[10px] uppercase tracking-[0.18em]",
                        themedTextMutedClass,
                      )}
                    >
                      Filtros aplicados
                    </span>
                    {visibleFilterChips.map((chip) => (
                      <span
                        key={chip}
                        className={cn(
                          "shrink-0 rounded-full border border-slate-200/80 bg-slate-50/90 px-2.5 py-1 text-[10px] leading-none text-slate-500 shadow-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                        )}
                        title={chip}
                      >
                        {chip}
                      </span>
                    ))}
                    {remainingFilterCount > 0 ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full border border-slate-200/80 bg-slate-50/90 px-2.5 py-1 text-[10px] leading-none text-slate-500 shadow-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                        )}
                      >
                        +{remainingFilterCount}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              id={tooltipParentElementId}
              className="relative w-full overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-50/70 h-[320px] phone:h-[360px] tablet:h-[420px] desktop:flex-1 desktop:h-auto desktop:min-h-0 desktop:overflow-hidden dark:border-white/10 dark:bg-white/5"
            >
              <VChart
                key={chartKey}
                spec={resolvedChartSpec}
                className="h-full w-full"
                style={{ height: "100%" }}
              />
            </div>
          </div>

          <TrendFullscreenSeriesRail
            series={series}
            trendView={trendView}
            hiddenSeries={hiddenSeries}
            onToggleSeriesVisibility={onToggleSeriesVisibility}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PodiumCard({
  items,
  totalQuantity,
  className,
}: {
  items: Array<{ vendor: string; quantity: number; proposals: number }>;
  totalQuantity: number;
  className?: string;
}) {
  const topThree = items.slice(0, 3);
  const podiumSlots = [
    {
      label: "2º",
      rank: 2,
      item: topThree[1],
      baseClass:
        "border-slate-300/60 bg-[linear-gradient(180deg,rgba(250,250,250,0.98),rgba(241,245,249,0.9))] text-slate-900 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.18)] dark:border-slate-200/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78))] dark:text-slate-100 dark:shadow-[0_22px_54px_-38px_rgba(0,0,0,0.42)]",
      accentClass:
        "bg-gradient-to-r from-slate-300 via-slate-200 to-slate-100 dark:from-slate-500 dark:via-slate-400 dark:to-slate-500",
      heightClass: "min-h-[132px] sm:min-h-[96px]",
      iconClass: "h-4 w-4 sm:h-7 sm:w-7 text-slate-400 dark:text-slate-300",
      rankClass: "text-[1.2rem] font-medium tracking-[-0.1em] text-slate-500 dark:text-slate-300 sm:text-[1.8rem]",
      vendorClass: "text-[0.68rem] font-medium leading-4 text-slate-900 dark:text-slate-100 sm:text-[0.9rem]",
      quantityClass: "text-[1.1rem] font-medium tracking-[-0.06em] text-slate-900 dark:text-slate-100 sm:text-[2rem]",
      metaClass: "text-[7px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 sm:text-[8px] sm:tracking-[0.18em]",
      progressClass: "bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-400 dark:to-slate-500",
      footClass: "bg-slate-200/80 dark:bg-white/10",
    },
    {
      label: "1º",
      rank: 1,
      item: topThree[0],
      baseClass:
        "border-amber-200/35 bg-[linear-gradient(180deg,rgba(250,246,236,0.97),rgba(244,236,215,0.9))] text-slate-950 shadow-[0_22px_60px_-46px_rgba(180,120,20,0.28)] ring-1 ring-amber-100/55 dark:border-amber-200/15 dark:bg-[linear-gradient(180deg,rgba(31,24,16,0.96),rgba(15,23,42,0.84))] dark:text-slate-100 dark:shadow-[0_22px_60px_-44px_rgba(251,191,36,0.18)] dark:ring-amber-200/15",
      accentClass:
        "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-100 dark:from-amber-200 dark:via-amber-300 dark:to-amber-200",
      heightClass: "min-h-[152px] sm:min-h-[118px] sm:-translate-y-1",
      iconClass: "h-5 w-5 sm:h-9 sm:w-9 text-amber-400 dark:text-amber-200",
      rankClass: "text-[1.45rem] font-medium tracking-[-0.14em] text-amber-500 dark:text-amber-200 sm:text-[2.8rem]",
      vendorClass: "text-[0.72rem] font-medium leading-4 text-slate-950 dark:text-slate-50 sm:text-[1.02rem]",
      quantityClass: "text-[1.45rem] font-medium tracking-[-0.1em] text-slate-950 dark:text-slate-50 sm:text-[3.1rem]",
      metaClass: "text-[7px] font-medium uppercase tracking-[0.16em] text-amber-600 dark:text-amber-200 sm:text-[8px] sm:tracking-[0.22em]",
      progressClass: "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-100 dark:from-amber-200 dark:via-amber-300 dark:to-amber-200",
      footClass: "bg-amber-100/75 dark:bg-amber-300/25",
      badgeClass:
        "border-amber-200/50 bg-amber-50/90 text-amber-700 shadow-[0_10px_20px_-18px_rgba(180,83,9,0.28)] dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-100",
    },
    {
      label: "3º",
      rank: 3,
      item: topThree[2],
      baseClass:
        "border-[#a67c57]/28 bg-[linear-gradient(180deg,rgba(248,239,231,0.96),rgba(231,214,198,0.9))] text-slate-900 shadow-[0_16px_38px_-34px_rgba(124,84,52,0.18)] dark:border-[#8c5c3a]/20 dark:bg-[linear-gradient(180deg,rgba(24,18,14,0.98),rgba(10,16,24,0.9))] dark:text-slate-100 dark:shadow-[0_18px_46px_-38px_rgba(0,0,0,0.42)]",
      accentClass:
        "bg-gradient-to-r from-[#8c5c3a] via-[#a7724e] to-[#c18a5c] dark:from-[#6f492f] dark:via-[#8c5c3a] dark:to-[#a7724e]",
      heightClass: "min-h-[128px] sm:min-h-[90px]",
      iconClass: "h-4 w-4 sm:h-7 sm:w-7 text-[#8c5c3a] dark:text-[#d0a079]",
      rankClass: "text-[1.2rem] font-medium tracking-[-0.1em] text-[#7a5335] dark:text-[#d0a079] sm:text-[1.8rem]",
      vendorClass: "text-[0.68rem] font-medium leading-4 text-slate-900 dark:text-slate-100 sm:text-[0.9rem]",
      quantityClass: "text-[1.1rem] font-medium tracking-[-0.06em] text-slate-900 dark:text-slate-100 sm:text-[2rem]",
      metaClass: "text-[7px] font-medium uppercase tracking-[0.14em] text-[#7a5335] dark:text-[#d0a079] sm:text-[8px] sm:tracking-[0.18em]",
      progressClass: "bg-gradient-to-r from-[#8c5c3a] via-[#a7724e] to-[#c18a5c] dark:from-[#6f492f] dark:via-[#8c5c3a] dark:to-[#a7724e]",
      footClass: "bg-[#c79a72]/55 dark:bg-[#8c5c3a]/18",
      badgeClass: "",
    },
  ] as const;

  return (
    <article
      className={cn(themedCardClass, "relative min-w-0 overflow-hidden px-3 py-3", className)}
    >
      <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-slate-400/10 blur-3xl" />
      <div className="absolute -right-14 top-8 h-40 w-40 rounded-full bg-slate-500/10 blur-3xl" />

      <div className="relative mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className={cn("text-sm font-medium tracking-[-0.01em]", themedTextTitleClass)}>
              Pódio
            </h2>
            <TooltipIcon text="Top 3 vendedores por volume absoluto após aplicar os filtros atuais." />
          </div>
        </div>
        <span className={cn(themedChipClass, "whitespace-nowrap")}>
          {totalQuantity.toLocaleString("pt-BR")} unidades
        </span>
      </div>

      <div className="relative mx-auto grid w-full max-w-[920px] grid-cols-3 items-end gap-2 sm:gap-5 sm:grid-cols-[minmax(0,0.94fr)_minmax(0,1.08fr)_minmax(0,0.94fr)]">
        {podiumSlots.map((slot) => {
          const item = slot.item;
          const share = item && totalQuantity > 0 ? (item.quantity / totalQuantity) * 100 : 0;
          const displayVendor = item ? formatVendorDisplayName(item.vendor) : "Sem dados";

          return (
            <div
              key={slot.rank}
              className={cn(
                "flex min-w-0 flex-col items-center self-stretch",
                slot.rank === 1 && "relative z-10",
              )}
            >
              <div
                className={cn(
                  "relative flex w-full flex-1 flex-col overflow-hidden rounded-2xl border px-2 py-2 backdrop-blur sm:rounded-3xl sm:px-1.5 sm:py-1.5",
                  slot.baseClass,
                  slot.heightClass,
                  slot.rank === 1 && "pt-4 sm:pt-5",
                )}
              >
                <div className={cn("absolute inset-x-0 top-0 h-1", slot.accentClass)} />
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl dark:bg-white/5" />
                {slot.rank === 1 ? (
                  <div
                    className={cn(
                      "absolute left-1/2 top-0.5 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-0.5 text-[7px] font-medium uppercase tracking-[0.16em] sm:top-1 sm:px-2.5 sm:py-0.5 sm:text-[9px] sm:tracking-[0.22em]",
                      slot.badgeClass,
                    )}
                  >
                    <Crown className="h-3.5 w-3.5" />
                    Destaque
                  </div>
                ) : null}

                <div
                  className={cn(
                    "relative flex justify-between gap-1.5 sm:gap-2",
                    slot.rank === 1 ? "items-center" : "items-start",
                  )}
                >
                  <span className={cn("leading-none", slot.rankClass)}>
                    {slot.label}
                  </span>
                  {slot.rank === 1 ? (
                    <Trophy
                      className={cn("drop-shadow-sm", slot.iconClass)}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Medal
                      className={cn("drop-shadow-sm", slot.iconClass)}
                      strokeWidth={1.5}
                    />
                  )}
                </div>

                <div className="relative mt-1.5 space-y-0.5">
                  <p
                    className={cn("max-w-full break-words leading-4", slot.vendorClass)}
                  >
                    {displayVendor}
                  </p>
                  <div className="flex items-end justify-between gap-1 sm:gap-2">
                    <div className="min-w-0">
                      <p className={slot.quantityClass}>
                        {item ? item.quantity.toLocaleString("pt-BR") : "-"}
                      </p>
                      <p className={cn("flex items-center gap-1", slot.metaClass)}>
                        <span>
                          {item ? `${item.proposals.toLocaleString("pt-BR")} prop.` : "Sem posição"}
                        </span>
                        <span className="hidden sm:inline-flex">
                          <TooltipIcon text="Quantidade de propostas no recorte atual." />
                        </span>
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className={cn("flex items-center justify-end gap-1", slot.metaClass)}>
                        <span>
                          {item
                            ? `${share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vol.`
                            : "Sem volume"}
                        </span>
                        <span className="hidden sm:inline-flex">
                          <TooltipIcon text="Participação no volume total do recorte atual." />
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className={cn("mt-2 h-1 overflow-hidden rounded-full", slot.footClass)}>
                    <div className={cn("h-full rounded-full", slot.progressClass)} style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "mt-1.5 h-1 w-10 rounded-full",
                  slot.rank === 1
                    ? "bg-amber-300/80 dark:bg-amber-400/60"
                    : slot.rank === 2
                      ? "bg-slate-300/80 dark:bg-slate-500/70"
                      : "bg-amber-200/80 dark:bg-amber-300/30",
                )}
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function VendedorRelatorioPage() {
  const {
    items: enhancedSalesIntention,
    isLoading: apiLoading,
    isRefreshing,
    error,
    refresh,
    lastUpdatedAt,
  } = useSalesIntentions(undefined, { searchAll: true });
  const [selectedTipoVenda, setSelectedTipoVenda] = useState<string[]>([]);
  const [selectedBandeira, setSelectedBandeira] = useState<string[]>([]);
  const [selectedRegional, setSelectedRegional] = useState<string[]>([]);
  const [selectedLojaVenda, setSelectedLojaVenda] = useState<string[]>([]);
  const [selectedMarcaVeiculo, setSelectedMarcaVeiculo] = useState<string[]>([]);
  const [selectedModelo, setSelectedModelo] = useState<string[]>([]);
  const [selectedVersao, setSelectedVersao] = useState<string[]>([]);
  const [selectedClassificacao, setSelectedClassificacao] = useState<string[]>([]);
  const [selectedComparisonVendors, setSelectedComparisonVendors] = useState<string[]>([]);
  const [trendView, setTrendView] = useState<TrendView>("volume");
  const [isTrendFullscreenOpen, setIsTrendFullscreenOpen] = useState(false);
  const [hiddenTrendSeries, setHiddenTrendSeries] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [autoFallbackDate, setAutoFallbackDate] = useState<string | null>(null);
  const [rankingVisibleCount, setRankingVisibleCount] = useState<RankingDisplayCount>(20);
  const [chartError, setChartError] = useState<string | null>(null);
  const [catalogData, setCatalogData] = useState<SalesIntentionCatalogResponse | null>(null);
  const [vehicleCatalogData, setVehicleCatalogData] = useState<SalesIntentionModelosDealerResponse | null>(null);
  const [classificacaoViewOptions, setClassificacaoViewOptions] = useState<string[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isVehicleCatalogLoading, setIsVehicleCatalogLoading] = useState(true);
  const [isClassificacaoLoading, setIsClassificacaoLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isDetailedTableModalOpen, setIsDetailedTableModalOpen] = useState(false);

  const todayInput = useMemo(() => getTodayInputValue(), []);
  const chartTooltipRootId = useId().replace(/:/g, "");
  const inlineTrendTooltipParentElementId = `${chartTooltipRootId}-trend-inline`;
  const fullscreenTrendTooltipParentElementId = `${chartTooltipRootId}-trend-fullscreen`;

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

  useEffect(() => {
    if (hasDataForToday) {
      setAutoFallbackDate(null);
      return;
    }

    if (startDate !== todayInput || endDate !== todayInput) {
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

  const isSingleDayPeriod = Boolean(startDate && endDate && startDate === endDate);
  const displayActivePeriodText = activePeriodText.replace("Período ativo: ", "Período: ");
  const displayFallbackNotice = autoFallbackDate
    ? `Usando ${formatDisplayInputDate(autoFallbackDate)}`
    : null;
  const appliedFilterChips = useMemo(() => {
    const chips: string[] = [];

    selectedTipoVenda.forEach((value) => {
      chips.push(`Tipo de venda: ${formatTipoVendaLabel(value)}`);
    });

    selectedBandeira.forEach((value) => {
      chips.push(`Bandeira: ${value}`);
    });

    selectedRegional.forEach((value) => {
      chips.push(`Regional: ${value}`);
    });

    selectedLojaVenda.forEach((value) => {
      chips.push(`Loja: ${value}`);
    });

    selectedMarcaVeiculo.forEach((value) => {
      chips.push(`Marca veículo: ${value}`);
    });

    selectedModelo.forEach((value) => {
      chips.push(`Modelo: ${value}`);
    });

    selectedVersao.forEach((value) => {
      chips.push(`Versão: ${value}`);
    });

    selectedClassificacao.forEach((value) => {
      chips.push(`Classificação: ${value}`);
    });

    chips.push(displayActivePeriodText);

    return chips;
  }, [
    displayActivePeriodText,
    selectedBandeira,
    selectedClassificacao,
    selectedLojaVenda,
    selectedMarcaVeiculo,
    selectedModelo,
    selectedRegional,
    selectedTipoVenda,
    selectedVersao,
  ]);

  const lastUpdatedText = lastUpdatedAt ? format(lastUpdatedAt, "dd/MM/yyyy HH:mm:ss") : "Carregando...";

  const currentPeriodRange = useMemo(
    () => ({
      start: startDate ? buildLocalDateFromInput(startDate) : null,
      end: endDate ? buildLocalDateFromInput(endDate, true) : null,
    }),
    [endDate, startDate],
  );

  const previousPeriodRange = useMemo(
    () => buildEquivalentPreviousPeriodRange(startDate, endDate),
    [endDate, startDate],
  );

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) =>
        matchesVendorReportFilters(item, {
          selectedTipoVenda,
          selectedBandeira,
          selectedRegional,
          selectedLojaVenda,
          selectedMarcaVeiculo,
          selectedModelo,
          selectedVersao,
          selectedClassificacao,
          vehicleCatalogRows,
          rangeStart: currentPeriodRange.start,
          rangeEnd: currentPeriodRange.end,
        }),
      ),
    [
      enhancedSalesIntention,
      currentPeriodRange.end,
      currentPeriodRange.start,
      selectedBandeira,
      selectedClassificacao,
      selectedLojaVenda,
      selectedMarcaVeiculo,
      selectedModelo,
      selectedRegional,
      selectedTipoVenda,
      selectedVersao,
      vehicleCatalogRows,
    ],
  );

  const previousPeriodItems = useMemo(() => {
    if (!previousPeriodRange) {
      return [];
    }

    return enhancedSalesIntention.filter((item) =>
      matchesVendorReportFilters(item, {
        selectedTipoVenda,
        selectedBandeira,
        selectedRegional,
        selectedLojaVenda,
        selectedMarcaVeiculo,
        selectedModelo,
        selectedVersao,
        selectedClassificacao,
        vehicleCatalogRows,
        rangeStart: previousPeriodRange.start,
        rangeEnd: previousPeriodRange.end,
      }),
    );
  }, [
    enhancedSalesIntention,
    previousPeriodRange,
    selectedBandeira,
    selectedClassificacao,
    selectedLojaVenda,
    selectedMarcaVeiculo,
    selectedModelo,
    selectedRegional,
    selectedTipoVenda,
    selectedVersao,
    vehicleCatalogRows,
  ]);

  const vendorRanking = useMemo(() => {
    const grouped = new Map<string, { proposals: number; quantity: number }>();

    filteredItems.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      const quantity = Number(item.Quantidade) || 0;
      const current = grouped.get(vendor);

      if (current) {
        grouped.set(vendor, {
          proposals: current.proposals + 1,
          quantity: current.quantity + quantity,
        });
        return;
      }

      grouped.set(vendor, {
        proposals: 1,
        quantity,
      });
    });

    return Array.from(grouped.entries())
      .map(([vendor, data]) => ({
        vendor,
        proposals: data.proposals,
        quantity: data.quantity,
        avgPerProposal: Number((data.quantity / data.proposals).toFixed(2)),
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredItems]);

  const comparisonVendorOptions = useMemo(
    () => vendorRanking.map((item) => item.vendor),
    [vendorRanking],
  );

  useEffect(() => {
    setSelectedComparisonVendors((current) => {
      const next = current
        .filter((value) => comparisonVendorOptions.includes(value))
        .slice(0, MAX_TREND_SERIES);

      if (
        next.length === current.length &&
        next.every((value, index) => value === current[index])
      ) {
        return current;
      }

      return next;
    });
  }, [comparisonVendorOptions]);

  const trendSeriesLabels = useMemo(() => {
    if (selectedComparisonVendors.length > 0) {
      return selectedComparisonVendors
        .filter((vendor) => comparisonVendorOptions.includes(vendor))
        .slice(0, MAX_TREND_SERIES);
    }

    return comparisonVendorOptions.slice(0, MAX_TREND_SERIES);
  }, [comparisonVendorOptions, selectedComparisonVendors]);

  useEffect(() => {
    setHiddenTrendSeries((current) => {
      const next = current.filter((vendor) => trendSeriesLabels.includes(vendor));

      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }

      return next;
    });
  }, [trendSeriesLabels]);

  const toggleTrendSeriesVisibility = (vendor: string) => {
    setHiddenTrendSeries((current) =>
      current.includes(vendor)
        ? current.filter((value) => value !== vendor)
        : [...current, vendor],
    );
  };

  const hiddenTrendSeriesSignature = hiddenTrendSeries.slice().sort().join("|");

  const salesCantadasAverageMetric = useMemo(
    () => resolveSalesCantadasAverageMetric(startDate, endDate),
    [endDate, startDate],
  );

  const currentVendorTotals = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      const quantity = Number(item.Quantidade) || 0;
      grouped.set(vendor, (grouped.get(vendor) || 0) + quantity);
    });

    return grouped;
  }, [filteredItems]);

  const previousVendorTotals = useMemo(() => {
    const grouped = new Map<string, number>();

    previousPeriodItems.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      const quantity = Number(item.Quantidade) || 0;
      grouped.set(vendor, (grouped.get(vendor) || 0) + quantity);
    });

    return grouped;
  }, [previousPeriodItems]);

  const trendChartKey = `${isSingleDayPeriod ? "hourly" : "daily"}-${trendView}-${trendSeriesLabels.join("|")}-${hiddenTrendSeriesSignature || "all"}`;

  const trendChartData = useMemo<TrendPoint[]>(() => {
    if (trendSeriesLabels.length === 0) {
      return [];
    }

    const selectedSeries = new Set(trendSeriesLabels);
    if (isSingleDayPeriod) {
      const selectedDate = buildLocalDateFromInput(startDate);
      if (!selectedDate) {
        return [];
      }

      const grouped = new Map<
        number,
        { time: number; label: string; totals: Record<string, number> }
      >();
      let firstHour = 24;
      let lastHour = -1;

      filteredItems.forEach((item) => {
        const vendor = item.Proprietario || "Sem vendedor";
        if (!selectedSeries.has(vendor)) {
          return;
        }

        const createdAt = parseReportDate(item.Criado);
        if (!createdAt || formatInputDate(createdAt) !== startDate) {
          return;
        }

        const hour = createdAt.getHours();
        const quantity = Number(item.Quantidade) || 0;
        const currentGroup = grouped.get(hour) ?? {
          time: new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            hour,
          ).getTime(),
          label: formatHourLabel(hour),
          totals: {},
        };

        currentGroup.totals[vendor] = (currentGroup.totals[vendor] || 0) + quantity;
        grouped.set(hour, currentGroup);

        if (hour < firstHour) {
          firstHour = hour;
        }

        if (hour > lastHour) {
          lastHour = hour;
        }
      });

      if (grouped.size === 0) {
        return [];
      }

      const windowStart = Math.max(0, firstHour - 1);
      const windowEnd = Math.min(23, lastHour + 1);
      const cumulativeByVendor = new Map<string, number>(
        trendSeriesLabels.map((vendor) => [vendor, 0]),
      );

      return Array.from({ length: windowEnd - windowStart + 1 }, (_, index) => windowStart + index)
        .flatMap((hour) => {
          const row =
            grouped.get(hour) ?? {
              time: new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                hour,
              ).getTime(),
              label: formatHourLabel(hour),
              totals: {},
            };

          return trendSeriesLabels.map((vendor) => {
            const quantity = row.totals[vendor] || 0;
            const nextQuantity =
              trendView === "acumulado"
                ? (cumulativeByVendor.get(vendor) || 0) + quantity
                : quantity;

            if (trendView === "acumulado") {
              cumulativeByVendor.set(vendor, nextQuantity);
            }

            return {
              label: row.label,
              hour,
              vendor,
              quantity: nextQuantity,
              time: row.time,
            };
          });
        });
    }

    const grouped = new Map<string, { time: number; label: string; totals: Record<string, number> }>();

    filteredItems.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      if (!selectedSeries.has(vendor)) {
        return;
      }

      const current = parseReportDate(item.Data_solicitacao);
      if (!current) {
        return;
      }

      const key = format(current, "yyyy-MM-dd");
      const quantity = Number(item.Quantidade) || 0;
      const currentGroup = grouped.get(key) ?? {
        time: new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime(),
        label: format(current, "dd/MM/yy"),
        totals: {},
      };

      currentGroup.totals[vendor] = (currentGroup.totals[vendor] || 0) + quantity;
      grouped.set(key, currentGroup);
    });

    const cumulativeByVendor = new Map<string, number>(
      trendSeriesLabels.map((vendor) => [vendor, 0]),
    );

    return Array.from(grouped.values())
      .sort((a, b) => a.time - b.time)
      .flatMap((row) =>
        trendSeriesLabels.map((vendor) => {
          const quantity = row.totals[vendor] || 0;
          const nextQuantity =
            trendView === "acumulado"
              ? (cumulativeByVendor.get(vendor) || 0) + quantity
              : quantity;

          if (trendView === "acumulado") {
            cumulativeByVendor.set(vendor, nextQuantity);
          }

          return {
            label: row.label,
            hour: new Date(row.time).getHours(),
            vendor,
            quantity: nextQuantity,
            time: row.time,
          };
        }),
    );
  }, [filteredItems, isSingleDayPeriod, startDate, trendSeriesLabels, trendView]);

  const trendSeriesSummaries = useMemo<TrendSeriesSummary[]>(() => {
    const grouped = new Map<string, TrendPoint[]>();

    trendChartData.forEach((point) => {
      const points = grouped.get(point.vendor) ?? [];
      points.push(point);
      grouped.set(point.vendor, points);
    });

    return trendSeriesLabels.map((vendor, index) => {
      const points = (grouped.get(vendor) ?? []).slice().sort((a, b) => a.time - b.time);
      const currentTotal = currentVendorTotals.get(vendor) ?? 0;
      const previousTotal = previousVendorTotals.get(vendor) ?? 0;
      const averageValue = salesCantadasAverageMetric.divisor
        ? currentTotal / salesCantadasAverageMetric.divisor
        : 0;
      const comparison = formatComparisonLabel(currentTotal, previousTotal);

      return {
        vendor,
        displayVendor: formatVendorDisplayName(vendor),
        color: trendPalette[index % trendPalette.length],
        points,
        currentTotal,
        averageValue,
        averageLabel: salesCantadasAverageMetric.label,
        comparisonDirection: comparison.direction,
        comparisonText: comparison.text,
      };
    });
  }, [
    currentVendorTotals,
    previousVendorTotals,
    salesCantadasAverageMetric.divisor,
    salesCantadasAverageMetric.label,
    trendChartData,
    trendSeriesLabels,
  ]);

  const visibleTrendChartData = useMemo(
    () => trendChartData.filter((point) => !hiddenTrendSeries.includes(point.vendor)),
    [hiddenTrendSeries, trendChartData],
  );

  const visibleTrendSeriesSummaries = useMemo(
    () => trendSeriesSummaries.filter((series) => !hiddenTrendSeries.includes(series.vendor)),
    [hiddenTrendSeries, trendSeriesSummaries],
  );

  const trendHourRange = useMemo(() => {
    if (!isSingleDayPeriod || visibleTrendChartData.length === 0) {
      return null;
    }

    const hours = visibleTrendChartData.map((item) => item.hour);
    return {
      min: Math.min(...hours),
      max: Math.max(...hours),
    };
  }, [isSingleDayPeriod, visibleTrendChartData]);

  const trendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      data: [
        {
          id: "vendorTrend",
          values: visibleTrendChartData,
        },
      ],
      xField: isSingleDayPeriod ? "hour" : "label",
      yField: "quantity",
      seriesField: "vendor",
      smooth: true,
      padding: [20, 24, 42, 42],
      color: [...trendPalette],
      legends: {
        visible: true,
        orient: "bottom",
        layout: "horizontal",
        position: "middle",
        background: { visible: false },
        item: {
          label: {
            formatMethod: (text: string | number) => formatVendorDisplayName(String(text)),
            style: {
              fill: "#64748b",
              fontSize: 14.5,
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
        isSingleDayPeriod && trendHourRange
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
              label: {
                autoRotate: false,
                autoHide: true,
                autoHideMethod: "greedy",
              },
            },
        {
          orient: "left",
          label: {
            formatMethod: (text: string | string[]) => {
              const value = Number(Array.isArray(text) ? text[0] : text);

              return Number.isFinite(value)
                ? value.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })
                : String(Array.isArray(text) ? text[0] : text);
            },
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: false,
        parentElement: inlineTrendTooltipParentElementId,
        activeType: "dimension",
        offset: { x: 0, y: 0 },
        dimension: {
          title: {
            visible: true,
            value: (datum) => formatTrendTooltipTitle(datum as TrendPoint | undefined, isSingleDayPeriod),
          },
          position: {
            left: (event) => event.offsetX,
            top: 12,
          },
          updateContent: (_prev, data) =>
            buildTrendTooltipContent(
              data as TrendTooltipDataItem[],
              visibleTrendSeriesSummaries,
              isSingleDayPeriod,
            ),
        },
      },
      point: {
        visible: true,
        style: { size: 4.5, fill: "#ffffff", stroke: "#64748b", lineWidth: 1.4 },
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
      area: { visible: false },
    }),
    [inlineTrendTooltipParentElementId, isSingleDayPeriod, trendHourRange, visibleTrendChartData],
  );

  const inlineTrendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      ...trendChartSpec,
      padding: isSingleDayPeriod ? [16, 20, 24, 34] : [16, 20, 22, 34],
      legends:
        trendSeriesLabels.length <= 3
          ? trendChartSpec.legends
          : {
              visible: false,
            },
      point: {
        visible: false,
      },
    }),
    [isSingleDayPeriod, trendChartSpec, trendSeriesLabels.length],
  );

  const fullscreenTrendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      ...trendChartSpec,
      padding: isSingleDayPeriod ? [26, 24, 48, 50] : [26, 24, 52, 50],
      tooltip: {
        ...(trendChartSpec.tooltip ?? {}),
        activeType: "dimension",
        confine: false,
        parentElement: fullscreenTrendTooltipParentElementId,
        offset: { x: 0, y: 0 },
      },
      legends: {
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
              stroke: "#94a3b8",
              strokeOpacity: 0.45,
              lineWidth: 1,
              lineDash: [4, 4],
            },
          },
        },
      },
      point: {
        visible: false,
      },
      line: {
        style: {
          lineWidth: 3,
          lineCap: "round",
          lineJoin: "round",
          curveType: "monotone",
          strokeOpacity: 0.98,
        },
      },
    }),
    [fullscreenTrendTooltipParentElementId, isSingleDayPeriod, trendChartSpec],
  );

  const totalQuantity = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0),
    [filteredItems],
  );

  const averageQuantityPerPeriod = useMemo(() => {
    if (!salesCantadasAverageMetric.divisor) {
      return 0;
    }

    return totalQuantity / salesCantadasAverageMetric.divisor;
  }, [salesCantadasAverageMetric.divisor, totalQuantity]);

  const activeBrands = useMemo(
    () =>
      new Set(
        filteredItems
          .map((item) => item.Marca_Veiculo?.trim())
          .filter((value): value is string => Boolean(value)),
      ).size,
    [filteredItems],
  );

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
              Análise de Vendedores
            </h1>
          </section>

          <ReportErrorCard
            label="Falha ao carregar os dados"
            title="Não conseguimos mostrar a análise de vendedores agora"
            message={error}
            onRetry={() => void refresh()}
            isRetrying={isRefreshing}
          />
        </div>
      </main>
    );
  }

  const exportToExcel = () => {
    const rows = vendorRanking.map((item) => [
      item.vendor,
      item.proposals,
      item.quantity,
      item.avgPerProposal,
    ]);

    const headers = ["Vendedor", "Venda Cantada", "Quantidade", "Média por Proposta"];
    const table = [headers, ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-vendedores-${format(new Date(), "yyyyMMdd_HHmmss")}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSelectedTipoVenda([]);
    setSelectedBandeira([]);
    setSelectedRegional([]);
    setSelectedLojaVenda([]);
    setSelectedMarcaVeiculo([]);
    setSelectedModelo([]);
    setSelectedVersao([]);
    setSelectedClassificacao([]);
    setSelectedComparisonVendors([]);
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setChartError(null);
  };

  return (
    <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
                  Análise de Vendedores
                </h1>
                <TooltipIcon text="Os indicadores e a listagem abaixo respondem aos filtros de bandeira, loja de venda, regional, tipo de venda, classificação, marca, modelo, versão e período." />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-sky-100/80 dark:text-cyan-200/80">
                <span className={vendorStatusChipClass}>
                  Atualizado: {lastUpdatedText}
                </span>
                <span className={vendorStatusChipClass}>
                  {isRefreshing ? "Atualizando..." : "Pronto"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-sky-50/90 dark:text-cyan-50/90">
                <span className={vendorStatusChipClass}>
                  {displayActivePeriodText}
                </span>
                {displayFallbackNotice ? (
                  <span className={vendorStatusChipClass}>
                    {displayFallbackNotice}
                  </span>
                ) : null}
              </div>
            </div>

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
        </section>

        <div className="sticky top-3 z-30 tablet:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="vendedor-filters-panel"
            className={cn(
              "h-12 w-full rounded-full px-4 text-sm font-medium shadow-sm",
              themedOutlineButtonClass,
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {isMobileFiltersOpen ? "Ocultar filtros" : "Abrir filtros"}
          </Button>
        </div>

        <section
          id="vendedor-filters-panel"
          className={cn(themedPanelClass, "p-4", isMobileFiltersOpen ? "block" : "hidden tablet:block")}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className={cn("text-base font-medium tracking-[-0.02em]", themedTextTitleClass)}>
                  Filtros
                </h2>
                <TooltipIcon text="Use tipo de venda, bandeira, regional, loja, marca, modelo, versão, classificação e período para refinar o recorte." />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium",
                themedOutlineButtonClass,
              )}
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
                  <span className="sr-only">De</span>
                  <input
                    type="date"
                    max={endDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={startDate}
                    onChange={(event) => {
                      setAutoFallbackDate(null);
                      setStartDate(event.target.value);
                    }}
                  />
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Até</span>
                  <input
                    type="date"
                    min={startDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={endDate}
                    onChange={(event) => {
                      setAutoFallbackDate(null);
                      setEndDate(event.target.value);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <StatCard
            label="Vendas Cantadas"
            value={filteredItems.length.toLocaleString("pt-BR")}
            tooltip="Quantidade de intenções no recorte atual."
          />
          <StatCard
            label="Volume"
            value={totalQuantity.toLocaleString("pt-BR")}
            tooltip="Soma das quantidades registradas."
          />
          <StatCard
            label={salesCantadasAverageMetric.label}
            caption={salesCantadasAverageMetric.caption}
            value={averageQuantityPerPeriod.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            tooltip={salesCantadasAverageMetric.tooltip}
          />
          <StatCard
            label="Marcas"
            value={activeBrands.toLocaleString("pt-BR")}
            tooltip="Marcas com movimentação no recorte atual."
          />
        </section>

        <PodiumCard items={vendorRanking.slice(0, 3)} totalQuantity={totalQuantity} />

        <section aria-labelledby="charts-section-title" className="space-y-4">
          <div className="px-1">
            <div className="flex items-center gap-1.5">
              <h2
                id="charts-section-title"
                className={cn("text-lg font-medium tracking-[-0.02em]", themedTextTitleClass)}
              >
                Visão por vendedor
              </h2>
              <TooltipIcon text="Consolida comparativo temporal, pódio e gráficos auxiliares no recorte atual." />
            </div>
          </div>

          <div className={cn(themedSoftCardClass, "mx-1 rounded-2xl px-3 py-2")}>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
              <p className={cn(themedTinyLabelClass, "shrink-0 tracking-[0.2em]")}>Filtros aplicados</p>
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                {appliedFilterChips.map((chip, index) => (
                  <span key={`${chip}-${index}`} className={vendorFilterChipClass} title={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {chartError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-50">
              <p className="font-medium">Falha ao renderizar o gráfico</p>
              <p className="mt-1">{chartError}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:items-stretch">
            <ChartCard
              title="Comparativo"
              tooltip="Compare os vendedores selecionados em volume ou acumulado. Sem seleção, o gráfico usa os 5 maiores do recorte."
              hasData={trendChartData.length > 0}
              className="h-full w-full flex flex-col xl:h-[520px]"
              headerRight={
                <TrendVendorSelector
                  value={selectedComparisonVendors}
                  options={comparisonVendorOptions}
                  onChange={setSelectedComparisonVendors}
                  trendView={trendView}
                  onTrendViewChange={setTrendView}
                  onOpenFullscreen={
                    trendChartData.length > 0 ? () => setIsTrendFullscreenOpen(true) : undefined
                  }
                  disabled={comparisonVendorOptions.length === 0}
                />
              }
              contentClassName="h-[280px] min-h-0 tablet:h-[340px] xl:flex-1"
            >
              <div className="tablet:hidden">
                <TrendComparisonRail
                  series={trendSeriesSummaries}
                  trendView={trendView}
                  hiddenSeries={hiddenTrendSeries}
                  onToggleSeriesVisibility={toggleTrendSeriesVisibility}
                />
              </div>
              <div
                id={inlineTrendTooltipParentElementId}
                className="hidden h-full min-h-0 tablet:block"
              >
                <VChart
                  key={trendChartKey}
                  spec={inlineTrendChartSpec}
                  className="h-full w-full"
                  style={{ height: "100%" }}
                  onError={(err) =>
                    setChartError(err ? String(err) : "Não foi possível renderizar este gráfico.")
                  }
                />
              </div>
            </ChartCard>

            <RankingCard
              items={vendorRanking}
              totalQuantity={totalQuantity}
              visibleCount={rankingVisibleCount}
              onVisibleCountChange={setRankingVisibleCount}
              onExport={exportToExcel}
              className="h-full w-full xl:h-[520px]"
            />
          </div>

        </section>

        <TrendFullscreenModal
          open={isTrendFullscreenOpen}
          title="Comparativo"
          subtitle={`Visualização expandida em ${isSingleDayPeriod ? "horas" : trendView === "acumulado" ? "acumulado" : "volume"} com os filtros atuais.`}
          periodText={displayActivePeriodText}
          filterChips={appliedFilterChips.slice(0, -1)}
          tooltipParentElementId={fullscreenTrendTooltipParentElementId}
          chartKey={trendChartKey}
          chartSpec={fullscreenTrendChartSpec}
          series={trendSeriesSummaries}
          trendView={trendView}
          hiddenSeries={hiddenTrendSeries}
          onToggleSeriesVisibility={toggleTrendSeriesVisibility}
          onClose={() => setIsTrendFullscreenOpen(false)}
        />

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
            exportFilePrefix="relatorio-vendedores"
            className="mt-1 max-w-full"
          />
        </div>

        <MobileDetailedTableModal
          open={isDetailedTableModalOpen}
          items={filteredItems}
          exportFilePrefix="relatorio-vendedores-mobile"
          onClose={() => setIsDetailedTableModalOpen(false)}
        />
      </div>
    </main>
  );
}
