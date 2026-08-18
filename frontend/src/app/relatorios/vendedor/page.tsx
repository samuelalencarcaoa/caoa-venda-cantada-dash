"use client";

import { format } from "date-fns";
import { ChevronDown, CircleHelp, Crown, Maximize2, Medal, RefreshCw, Trophy, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReportErrorCard } from "@/components/report-error-card";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import {
  themedCardClass,
  themedInputClass,
  themedChipClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTextMutedClass,
  themedTextStrongClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

const trendPalette = [
  "#7aa2d9",
  "#6dbdc8",
  "#d0a86c",
  "#8b93de",
  "#d28f9a",
  "#75b8a8",
  "#d69d74",
  "#90aa7a",
  "#b694d9",
  "#d09a88",
] as const;

const MAX_TREND_SERIES = 5;
const trendOptions = [
  { value: "volume", label: "Volume" },
  { value: "acumulado", label: "Acumulado" },
] as const;

const rankingDisplayOptions = [10, 20, 50, 100] as const;
type RankingDisplayCount = (typeof rankingDisplayOptions)[number];

const vendorHeroClass =
  "rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))] text-slate-900 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.82))] dark:text-slate-100 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]";

const vendorStatusChipClass =
  "rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

const vendorFilterChipClass =
  "inline-flex max-w-[18rem] items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur truncate dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

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
};

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
}: {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  tooltip: string;
  disabled?: boolean;
}) {
  const displayValue =
    value.length === 0
      ? "Todos"
      : value.length === 1
        ? value[0]
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
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function StatCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip: string;
}) {
  return (
    <div className={cn(themedCardClass, "p-5")}>
      <div className="flex items-center gap-1.5">
        <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>{label}</p>
        <TooltipIcon text={tooltip} />
      </div>
      <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
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
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
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
  totalQuantity,
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
  const visibleItems = items.slice(0, visibleCount);

  return (
    <article className={cn(themedCardClass, "flex h-full min-w-0 flex-col p-5", className)}>
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className={cn("text-base font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-border text-left text-xs">
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
                  const position = idx + 1;
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
                      <td className="px-3 py-2 text-right font-semibold">
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-muted-foreground">
          Mostrando {visibleItems.length} de {items.length} vendedores
        </p>
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

function TrendFullscreenModal({
  open,
  title,
  subtitle,
  chartKey,
  chartSpec,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  chartKey: string;
  chartSpec: ILineChartSpec;
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

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/70 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-describedby="trend-fullscreen-description"
        aria-labelledby="trend-fullscreen-title"
        aria-modal="true"
        className={cn(
          themedPanelClass,
          "flex h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden bg-white/95 text-slate-900 dark:bg-slate-950/95 dark:text-slate-100",
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className={cn(themedTinyLabelClass, "tracking-[0.22em]")}>Tela cheia</p>
            <h3 id="trend-fullscreen-title" className={cn("mt-1 text-xl font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
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

        <div className="flex-1 min-h-0 px-4 pb-4">
          <div className="h-full min-h-0 overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <VChart key={chartKey} spec={chartSpec} className="h-full w-full" style={{ height: "100%" }} />
          </div>
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
      heightClass: "min-h-[124px]",
      iconClass: "h-9 w-9 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-300",
      rankClass: "text-[2.1rem] font-black tracking-[-0.1em] text-slate-500 dark:text-slate-300",
      vendorClass: "text-[0.88rem] sm:text-[0.98rem] font-semibold text-slate-900 dark:text-slate-100",
      quantityClass: "text-[1.95rem] sm:text-[2.25rem] font-semibold tracking-[-0.06em] text-slate-900 dark:text-slate-100",
      metaClass: "text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400",
      progressClass: "bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-400 dark:to-slate-500",
      footClass: "bg-slate-200/80 dark:bg-white/10",
    },
    {
      label: "1º",
      rank: 1,
      item: topThree[0],
      baseClass:
        "border-amber-300/40 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,249,220,0.92))] text-slate-950 shadow-[0_26px_72px_-42px_rgba(180,83,9,0.42)] ring-1 ring-amber-200/45 dark:border-amber-300/20 dark:bg-[linear-gradient(180deg,rgba(36,26,10,0.96),rgba(15,23,42,0.84))] dark:text-slate-100 dark:shadow-[0_28px_76px_-40px_rgba(251,191,36,0.26)] dark:ring-amber-300/20",
      accentClass:
        "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 dark:from-amber-300 dark:via-amber-400 dark:to-amber-200",
      heightClass: "min-h-[157px] sm:-translate-y-4",
      iconClass: "h-11 w-11 sm:h-14 sm:w-14 text-amber-500 dark:text-amber-300",
      rankClass: "text-[2.8rem] sm:text-[3.4rem] font-black tracking-[-0.14em] text-amber-500 dark:text-amber-300",
      vendorClass: "text-[1rem] sm:text-[1.18rem] font-semibold text-slate-950 dark:text-slate-50",
      quantityClass: "text-[3.4rem] sm:text-[4rem] font-semibold tracking-[-0.1em] text-slate-950 dark:text-slate-50",
      metaClass: "text-[8px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200",
      progressClass: "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 dark:from-amber-300 dark:via-amber-400 dark:to-amber-200",
      footClass: "bg-amber-200/80 dark:bg-amber-300/30",
      badgeClass:
        "border-amber-300/50 bg-amber-100/95 text-amber-800 shadow-[0_12px_24px_-18px_rgba(180,83,9,0.45)] dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200",
    },
    {
      label: "3º",
      rank: 3,
      item: topThree[2],
      baseClass:
        "border-[#6b4124]/35 bg-[linear-gradient(180deg,rgba(241,226,213,0.96),rgba(211,169,127,0.9))] text-slate-900 shadow-[0_16px_42px_-34px_rgba(78,46,27,0.22)] dark:border-[#7b4a2a]/25 dark:bg-[linear-gradient(180deg,rgba(27,18,12,0.98),rgba(10,16,24,0.9))] dark:text-slate-100 dark:shadow-[0_20px_52px_-38px_rgba(0,0,0,0.48)]",
      accentClass:
        "bg-gradient-to-r from-[#4f301c] via-[#6b4124] to-[#8a5a35] dark:from-[#422718] dark:via-[#5d3820] dark:to-[#7b4a2a]",
      heightClass: "min-h-[115px]",
      iconClass: "h-9 w-9 sm:h-10 sm:w-10 text-[#6b4124] dark:text-[#b37a4a]",
      rankClass: "text-[2.1rem] font-black tracking-[-0.1em] text-[#5d3820] dark:text-[#c58a55]",
      vendorClass: "text-[0.88rem] sm:text-[0.98rem] font-semibold text-slate-900 dark:text-slate-100",
      quantityClass: "text-[1.95rem] sm:text-[2.25rem] font-semibold tracking-[-0.06em] text-slate-900 dark:text-slate-100",
      metaClass: "text-[8px] font-semibold uppercase tracking-[0.18em] text-[#5d3820] dark:text-[#c58a55]",
      progressClass: "bg-gradient-to-r from-[#4f301c] via-[#6b4124] to-[#8a5a35] dark:from-[#422718] dark:via-[#5d3820] dark:to-[#7b4a2a]",
      footClass: "bg-[#ae7647]/65 dark:bg-[#7b4a2a]/20",
      badgeClass: "",
    },
  ] as const;

  return (
    <article
      className={cn(themedCardClass, "relative min-w-0 overflow-hidden px-5 py-5", className)}
    >
      <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-slate-400/10 blur-3xl" />
      <div className="absolute -right-14 top-8 h-40 w-40 rounded-full bg-slate-500/10 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
              Pódio
            </h2>
            <TooltipIcon text="Top 3 vendedores por volume absoluto após aplicar os filtros atuais." />
          </div>
        </div>
        <span className={cn(themedChipClass, "whitespace-nowrap")}>
          {totalQuantity.toLocaleString("pt-BR")} unidades
        </span>
      </div>

      <div className="relative mx-auto grid w-full max-w-[1020px] items-end gap-3 sm:grid-cols-[minmax(0,0.94fr)_minmax(0,1.08fr)_minmax(0,0.94fr)]">
        {podiumSlots.map((slot) => {
          const item = slot.item;
          const share = item && totalQuantity > 0 ? (item.quantity / totalQuantity) * 100 : 0;
          const displayVendor = item ? formatVendorDisplayName(item.vendor) : "Sem dados";

          return (
            <div
              key={slot.rank}
              className={cn(
                "flex min-w-0 flex-col items-center",
                slot.rank === 1 && "relative z-10 sm:-translate-y-2",
              )}
            >
              <div
                className={cn(
                  "relative flex w-full flex-1 flex-col overflow-hidden rounded-3xl border px-2.5 py-2.5 backdrop-blur sm:px-3 sm:py-3",
                  slot.baseClass,
                  slot.heightClass,
                )}
              >
                <div className={cn("absolute inset-x-0 top-0 h-1", slot.accentClass)} />
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl dark:bg-white/5" />
                {slot.rank === 1 ? (
                  <div
                    className={cn(
                      "absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                      slot.badgeClass,
                    )}
                  >
                    <Crown className="h-3.5 w-3.5" />
                    Destaque
                  </div>
                ) : null}

                <div className="relative flex items-start justify-between gap-3">
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

                <div className="relative mt-2.5 space-y-1">
                  <p
                    className={cn("max-w-full break-words leading-4", slot.vendorClass)}
                  >
                    {displayVendor}
                  </p>
                  <div className="flex items-end justify-between gap-2.5">
                    <div>
                      <p className={slot.quantityClass}>
                        {item ? item.quantity.toLocaleString("pt-BR") : "-"}
                      </p>
                      <p
                        className={cn(
                          "flex items-center gap-1",
                          slot.metaClass,
                        )}
                      >
                        <span>
                          {item ? `${item.proposals.toLocaleString("pt-BR")} prop.` : "Sem posição"}
                        </span>
                        <TooltipIcon text="Quantidade de propostas no recorte atual." />
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn("flex items-center justify-end gap-1", slot.metaClass)}
                      >
                        <span>
                          {item
                            ? `${share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vol.`
                            : "Sem volume"}
                        </span>
                        <TooltipIcon text="Participação no volume total do recorte atual." />
                      </p>
                    </div>
                  </div>

                  <div className={cn("mt-2.5 h-1.5 overflow-hidden rounded-full", slot.footClass)}>
                    <div className={cn("h-full rounded-full", slot.progressClass)} style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "mt-2 h-1.5 w-12 rounded-full",
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
  const [selectedVendor, setSelectedVendor] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string[]>([]);
  const [selectedRegional, setSelectedRegional] = useState<string[]>([]);
  const [selectedLojaVenda, setSelectedLojaVenda] = useState<string[]>([]);
  const [selectedComparisonVendors, setSelectedComparisonVendors] = useState<string[]>([]);
  const [trendView, setTrendView] = useState<TrendView>("volume");
  const [isTrendFullscreenOpen, setIsTrendFullscreenOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [autoFallbackDate, setAutoFallbackDate] = useState<string | null>(null);
  const [rankingVisibleCount, setRankingVisibleCount] = useState<RankingDisplayCount>(20);
  const [chartError, setChartError] = useState<string | null>(null);

  const todayInput = useMemo(() => getTodayInputValue(), []);

  const vendorOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Proprietario || "Sem vendedor")),
    [enhancedSalesIntention],
  );

  const brandOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Marca_Veiculo || "Sem marca")),
    [enhancedSalesIntention],
  );

  const regionalOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Regional || "Sem regional")),
    [enhancedSalesIntention],
  );

  const lojaVendaOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Loja_Venda || "Sem loja")),
    [enhancedSalesIntention],
  );

  useEffect(() => {
    setSelectedVendor((current) => current.filter((value) => vendorOptions.includes(value)));
  }, [vendorOptions]);

  useEffect(() => {
    setSelectedBrand((current) => current.filter((value) => brandOptions.includes(value)));
  }, [brandOptions]);

  useEffect(() => {
    setSelectedRegional((current) => current.filter((value) => regionalOptions.includes(value)));
  }, [regionalOptions]);

  useEffect(() => {
    setSelectedLojaVenda((current) => current.filter((value) => lojaVendaOptions.includes(value)));
  }, [lojaVendaOptions]);

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

    selectedVendor.forEach((value) => {
      chips.push(`Vendedor: ${formatVendorDisplayName(value)}`);
    });

    selectedRegional.forEach((value) => {
      chips.push(`Regional: ${value}`);
    });

    selectedLojaVenda.forEach((value) => {
      chips.push(`Loja: ${value}`);
    });

    selectedBrand.forEach((value) => {
      chips.push(`Marca: ${value}`);
    });

    chips.push(displayActivePeriodText);

    return chips;
  }, [
    displayActivePeriodText,
    selectedBrand,
    selectedLojaVenda,
    selectedRegional,
    selectedVendor,
  ]);

  const lastUpdatedText = lastUpdatedAt ? format(lastUpdatedAt, "dd/MM/yyyy HH:mm:ss") : "Carregando...";

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) => {
        const itemVendor = item.Proprietario || "Sem vendedor";
        const itemBrand = item.Marca_Veiculo || "Sem marca";
        const itemRegional = item.Regional || "Sem regional";
        const itemLojaVenda = item.Loja_Venda || "Sem loja";
        const itemDate = parseReportDate(item.Data_solicitacao);

        const matchesVendor = matchesSelectedValues(selectedVendor, itemVendor);
        const matchesBrand = matchesSelectedValues(selectedBrand, itemBrand);
        const matchesRegional = matchesSelectedValues(selectedRegional, itemRegional);
        const matchesLojaVenda = matchesSelectedValues(selectedLojaVenda, itemLojaVenda);

        let matchesDateRange = true;
        if (startDate || endDate) {
          if (!itemDate) {
            return false;
          }

          if (startDate) {
            const start = buildLocalDateFromInput(startDate);
            if (!start) {
              return false;
            }
            if (itemDate < start) {
              matchesDateRange = false;
            }
          }

          if (endDate) {
            const end = buildLocalDateFromInput(endDate, true);
            if (!end) {
              return false;
            }
            if (itemDate > end) {
              matchesDateRange = false;
            }
          }
        }

        return matchesVendor && matchesBrand && matchesRegional && matchesLojaVenda && matchesDateRange;
      }),
    [
      enhancedSalesIntention,
      endDate,
      selectedBrand,
      selectedLojaVenda,
      selectedRegional,
      selectedVendor,
      startDate,
    ],
  );

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

  const trendChartKey = `${isSingleDayPeriod ? "hourly" : "daily"}-${trendView}-${trendSeriesLabels.join("|")}`;

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

        const current = parseReportDate(item.Data_solicitacao);
        if (!current || formatInputDate(current) !== startDate) {
          return;
        }

        const hour = current.getHours();
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
          };
        }),
      );
  }, [filteredItems, isSingleDayPeriod, startDate, trendSeriesLabels, trendView]);

  const trendHourRange = useMemo(() => {
    if (!isSingleDayPeriod || trendChartData.length === 0) {
      return null;
    }

    const hours = trendChartData.map((item) => item.hour);
    return {
      min: Math.min(...hours),
      max: Math.max(...hours),
    };
  }, [isSingleDayPeriod, trendChartData]);

  const trendChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      data: [
        {
          id: "vendorTrend",
          values: trendChartData,
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
        confine: true,
        mark: {
          title: { value: (datum) => formatVendorDisplayName(String(datum?.vendor || "Série")) },
          content: [
            {
              key: isSingleDayPeriod ? "Hora" : "Data",
              value: (datum) => datum?.label || "Período",
            },
            {
              key: trendView === "acumulado" ? "Volume acumulado" : "Volume",
              value: (datum) => Number(datum?.quantity || 0).toLocaleString("pt-BR"),
            },
          ],
        },
      },
      point: {
        visible: true,
        style: { size: 4, fill: "#f8fafc", stroke: "#94a3b8", lineWidth: 1.25 },
      },
      line: {
        style: {
          lineWidth: 1.4,
          lineCap: "round",
          lineJoin: "round",
          curveType: "monotone",
        },
      },
      area: { visible: false },
    }),
    [isSingleDayPeriod, trendChartData, trendHourRange, trendView],
  );

  const totalQuantity = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0),
    [filteredItems],
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

  if (apiLoading) {
    return (
      <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
          <section className={cn(vendorHeroClass, "h-[156px] animate-pulse")} />

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
          <section className={cn(vendorHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-500 dark:text-slate-400">
              Relatório
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
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
    setSelectedVendor([]);
    setSelectedBrand([]);
    setSelectedRegional([]);
    setSelectedLojaVenda([]);
    setSelectedComparisonVendors([]);
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setChartError(null);
  };

  return (
    <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className={cn(vendorHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Análise de Vendedores
                </h1>
                <TooltipIcon text="Os indicadores e a listagem abaixo respondem aos filtros de vendedor, regional, loja, marca e período." />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <span className={vendorStatusChipClass}>
                  Atualizado: {lastUpdatedText}
                </span>
                <span className={vendorStatusChipClass}>
                  {isRefreshing ? "Atualizando..." : "Pronto"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
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
                "h-10 shrink-0 rounded-full px-4 text-xs font-semibold",
                themedOutlineButtonClass,
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </section>

        <section className={cn(themedPanelClass, "p-4")}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className={cn("text-base font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                  Filtros
                </h2>
                <TooltipIcon text="Use vendedor, regional, loja, marca e período para refinar o recorte." />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-semibold",
                themedOutlineButtonClass,
              )}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <FilterSelectCard
              label="Vendedor"
              value={selectedVendor}
              options={vendorOptions}
              onChange={setSelectedVendor}
              tooltip="Filtro aplicado por vendedor."
            />
            <FilterSelectCard
              label="Regional"
              value={selectedRegional}
              options={regionalOptions}
              onChange={setSelectedRegional}
              tooltip="Filtro aplicado por regional."
            />
            <FilterSelectCard
              label="Loja"
              value={selectedLojaVenda}
              options={lojaVendaOptions}
              onChange={setSelectedLojaVenda}
              tooltip="Filtro aplicado por loja de venda."
            />
            <FilterSelectCard
              label="Marca"
              value={selectedBrand}
              options={brandOptions}
              onChange={setSelectedBrand}
              tooltip="Filtro aplicado por marca do veículo."
            />

            <div className={cn(themedSoftCardClass, "rounded-2xl p-2.5 sm:col-span-2 lg:col-span-1")}>
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            label="Média"
            value={averageQuantityPerRecord.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            tooltip="Quantidade média por intenção filtrada."
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
                className={cn("text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}
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
              <p className="font-semibold">Falha ao renderizar o gráfico</p>
              <p className="mt-1">{chartError}</p>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
            <ChartCard
              title="Comparativo"
              tooltip="Compare os vendedores selecionados em volume ou acumulado. Sem seleção, o gráfico usa os 5 maiores do recorte."
              hasData={trendChartData.length > 0}
              className="h-full flex flex-col xl:h-[520px]"
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
              contentClassName="flex-1 min-h-0"
            >
              <VChart
                key={trendChartKey}
                spec={trendChartSpec}
                className="h-full w-full"
                style={{ height: "100%" }}
                onError={(err) =>
                  setChartError(err ? String(err) : "Não foi possível renderizar este gráfico.")
                }
              />
            </ChartCard>

            <RankingCard
              items={vendorRanking}
              totalQuantity={totalQuantity}
              visibleCount={rankingVisibleCount}
              onVisibleCountChange={setRankingVisibleCount}
              onExport={exportToExcel}
              className="h-full xl:h-[520px]"
            />
          </div>

        </section>

        <TrendFullscreenModal
          open={isTrendFullscreenOpen}
          title="Comparativo"
          subtitle={`Visualização expandida em ${isSingleDayPeriod ? "horas" : trendView === "acumulado" ? "acumulado" : "volume"} com os filtros atuais.`}
          chartKey={trendChartKey}
          chartSpec={trendChartSpec}
          onClose={() => setIsTrendFullscreenOpen(false)}
        />
      </div>
    </main>
  );
}
