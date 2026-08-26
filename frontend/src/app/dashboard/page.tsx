"use client";

import { createPortal } from "react-dom";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  Clock3,
  Crown,
  Database,
  Flag,
  NotebookText,
  RefreshCw,
  Target,
  TrendingUp,
  X,
  UserRound,
} from "lucide-react";

import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import {
  buildBrandDetailHref,
  dashboardBrandNames,
  type DashboardPeriod,
} from "@/lib/brand-routing";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";
import {
  themedBadgeClass,
  themedCardClass,
  themedChipClass,
  themedHeroClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedTextBodyClass,
  themedTextMutedClass,
  themedTextStrongClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

const periodOptions = [
  { key: "mes", label: "Por mês" },
  { key: "dia", label: "Por dia" },
  { key: "intervalo", label: "Intervalo de datas" },
] as const;

const vehicleBrands = dashboardBrandNames.filter((brand) => brand !== "SEMINOVOS");

type PeriodType = DashboardPeriod;
type CountItem = { label: string; value: number };

function TooltipIcon({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sky-500 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 touch-manipulation dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 px-3 py-2 text-xs leading-5">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function PeriodPill({
  active,
  children,
  onClick,
  title,
  className = "",
  uppercase = true,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
  uppercase?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30",
        uppercase && "uppercase tracking-[0.24em]",
        active
          ? "border-cyan-400 bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-400/20 dark:border-slate-900 dark:bg-slate-900 dark:text-white dark:shadow-slate-900/10"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm", themedTextBodyClass, "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/70", className)}>
      <span className="shrink-0">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={cn("min-w-0 bg-transparent text-sm font-semibold outline-none [color-scheme:light] dark:[color-scheme:dark]", themedTextStrongClass)}
      />
    </label>
  );
}

function parseReportDate(value: string) {
  const [datePart, timePart = "00:00:00"] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
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

function getMonthRange(referenceDate: Date, monthOffset: number) {
  const monthDate = subMonths(startOfMonth(referenceDate), monthOffset);
  return {
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  };
}

function getDayRange(referenceDate: Date, dayOffset: number) {
  const dayDate = subDays(startOfDay(referenceDate), dayOffset);
  return {
    start: startOfDay(dayDate),
    end: endOfDay(dayDate),
  };
}

function getIntervalRange(startValue: string, endValue: string) {
  const start = buildLocalDateFromInput(startValue);
  const end = buildLocalDateFromInput(endValue, true);

  return {
    start: start ?? new Date(0),
    end: end ?? new Date(8640000000000000),
  };
}

function formatMonthTitle(date: Date) {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

function capitalizeText(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatOrdinal(value: number) {
  return `${value}º`;
}

function getBrandBadgeLabel(brand: string) {
  const parts = brand
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return brand.slice(0, 4).toUpperCase();
  }

  const lastPart = parts[parts.length - 1] ?? brand;
  return lastPart.slice(0, 4).toUpperCase();
}

function formatInputDateLabel(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: ptBR });
}

function getDayBadgeLabel(dayOffset: number) {
  if (dayOffset === 0) return "Hoje";
  if (dayOffset === 1) return "Ontem";
  if (dayOffset === 2) return "Anteontem";
  if (dayOffset === 3) return "2 dias atrás";
  return "3 dias atrás";
}

function groupCounts(
  items: SalesIntentionReportRow[],
  key: keyof SalesIntentionReportRow,
) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const label = String(item[key] || "Sem informação").trim() || "Sem informação";
    totals.set(label, (totals.get(label) || 0) + (Number(item.Quantidade) || 0));
  });

  return Array.from(totals, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value,
  );
}

function matchesBrand(item: SalesIntentionReportRow, brand: string) {
  if (brand === "SEMINOVOS") {
    return String(item.Tipo_Venda).toUpperCase() === "SEMINOVOS";
  }

  const salesFlag = String(item.Bandeira || "").trim().toUpperCase();
  return brand === "CAOA CHANGAN"
    ? salesFlag.includes("CAOA CHANGAN") || salesFlag.includes("CHANGAN")
    : salesFlag.includes(brand);
}

function topTenWithOthers(items: CountItem[]) {
  if (items.length <= 10) {
    return items;
  }

  return [
    ...items.slice(0, 10),
    {
      label: "Outros",
      value: items.slice(10).reduce((sum, item) => sum + item.value, 0),
    },
  ];
}

function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn(themedCardClass, className)}>
      {children}
    </article>
  );
}

type PeriodNoDataNotice = {
  title: string;
  message: string;
  chip: string;
  key: string;
};

function PeriodNoDataModal({
  open,
  notice,
  onClose,
  onRefresh,
}: {
  open: boolean;
  notice: PeriodNoDataNotice;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-describedby="period-no-data-description"
        aria-labelledby="period-no-data-title"
        aria-modal="true"
        className={cn(themedPanelClass, "w-full max-w-lg p-6")}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <CircleHelp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p id="period-no-data-title" className={cn("text-base font-semibold", themedTextTitleClass)}>
              {notice.title}
            </p>
            <p
              id="period-no-data-description"
              className={cn("mt-2 text-sm leading-6", themedTextBodyClass)}
            >
              {notice.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar agora
          </Button>
          <Button type="button" onClick={onClose}>
            Entendi
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BrandTotalCard({
  value,
  brand,
  href,
  className = "",
}: {
  value: number;
  brand: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      aria-label={`Abrir detalhes de ${brand}`}
    >
      <DashboardCard className={cn(
        "min-h-[168px] px-5 py-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.24)]",
        className,
      )}>
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 transition group-hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:group-hover:bg-emerald-400/15">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {brand}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <p className={cn("text-5xl font-light leading-none tracking-[-0.05em] xl:text-6xl", themedTextTitleClass)}>
              {value.toLocaleString("pt-BR")}
            </p>
          </div>

          <p className={cn("text-center text-[10px] font-semibold uppercase tracking-[0.24em]", themedTextMutedClass)}>
            Total de Vendas Cantadas
          </p>
        </div>
      </DashboardCard>
    </Link>
  );
}

function RankingCard({
  title,
  data,
  contextLabel,
  tooltip,
  className = "",
}: {
  title: string;
  data: CountItem[];
  contextLabel?: string;
  tooltip?: string;
  className?: string;
}) {
  const max = data[0]?.value || 1;

  return (
    <DashboardCard className={cn("min-h-[276px] px-5 py-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
              {title}
            </h2>
            {tooltip ? <TooltipIcon text={tooltip} /> : null}
          </div>
          {contextLabel ? (
            <span className={cn("mt-1 inline-flex max-w-full items-center px-2.5 py-1", themedChipClass)}>
              {contextLabel}
            </span>
          ) : null}
        </div>
        <span className={cn("px-2.5 py-1 uppercase tracking-[0.22em]", themedChipClass)}>
          Top 10
        </span>
      </div>

      <div className="max-h-[210px] space-y-3 overflow-y-auto pr-1">
        {data.length ? (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span
                  className={cn("truncate font-medium", themedTextStrongClass)}
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 font-semibold", themedBadgeClass)}>
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                  style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className={cn("py-12 text-center text-sm", themedTextMutedClass)}>
            Nenhum dado no período.
          </p>
        )}
      </div>
    </DashboardCard>
  );
}

function MobileMetricCard({
  icon,
  value,
  label,
  helper,
  valueClassName = "",
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  helper?: string;
  valueClassName?: string;
}) {
  return (
    <DashboardCard className="min-h-[128px] px-4 py-4">
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-emerald-400">{icon}</div>
          {helper ? (
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]", themedChipClass)}>
              {helper}
            </span>
          ) : null}
        </div>

        <div className="space-y-1">
          <p className={cn("text-3xl font-medium leading-none tracking-[-0.05em]", themedTextTitleClass, valueClassName)}>
            {value}
          </p>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", themedTextMutedClass)}>
            {label}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}

function MobileBrandCard({
  brand,
  value,
  active,
  href,
  linkRef,
}: {
  brand: string;
  value: number;
  active: boolean;
  href: string;
  linkRef?: (element: HTMLAnchorElement | null) => void;
}) {
  return (
    <Link
      href={href}
      ref={linkRef}
      aria-label={`Abrir detalhes de ${brand}`}
      className={cn(
        "flex h-[198px] w-[160px] shrink-0 snap-center flex-col justify-between rounded-[24px] border px-4 py-4 text-left text-slate-900 backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-slate-100",
        active
          ? "border-cyan-400/80 bg-white text-slate-900 shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_18px_30px_-20px_rgba(15,23,42,0.18)] dark:border-cyan-400/90 dark:bg-slate-950/90 dark:text-slate-100 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_18px_30px_-20px_rgba(34,211,238,0.35)]"
          : "border-slate-200 bg-white text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-[0_18px_50px_-38px_rgba(0,0,0,0.35)] dark:hover:border-white/20 dark:hover:bg-white/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
              active
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {getBrandBadgeLabel(brand)}
          </span>
          <p
            className={cn(
              "min-h-[2.5rem] whitespace-normal text-[13px] font-semibold uppercase tracking-[0.22em] leading-tight",
              "text-slate-900 dark:text-slate-100",
            )}
          >
            {brand}
          </p>
        </div>
        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 rounded-full",
            active
              ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]"
              : "bg-slate-400 dark:bg-slate-500",
          )}
        />
      </div>

      <div className="flex flex-1 flex-col justify-end">
        <p className="text-4xl font-light leading-none tracking-[-0.06em] text-slate-900 dark:text-slate-100">
          {value.toLocaleString("pt-BR")}
        </p>
        <p
          className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400"
        >
          Total de vendas cantadas
        </p>
      </div>
    </Link>
  );
}

export default function DashboardV2Page() {
  const [referenceDate] = useState(() => new Date());
  const [selectedMobileBrand, setSelectedMobileBrand] = useState("CAOA CHERY");
  const [period, setPeriod] = useState<PeriodType>("dia");
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isNoDataModalOpen, setIsNoDataModalOpen] = useState(false);
  const [isDetailedTableModalOpen, setIsDetailedTableModalOpen] = useState(false);
  const [lastAutoOpenedNoticeKey, setLastAutoOpenedNoticeKey] = useState<string | null>(null);
  const mobileBrandRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const monthQuickFilters = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const monthDate = subMonths(startOfMonth(referenceDate), index);
        return {
          offset: index,
          label: format(monthDate, "MMM yyyy", { locale: ptBR })
            .replace(".", "")
            .toUpperCase(),
          title: formatMonthTitle(monthDate),
        };
      }),
    [referenceDate],
  );

  const dayQuickFilters = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const dayDate = subDays(startOfDay(referenceDate), index);
        return {
          offset: index,
          label: getDayBadgeLabel(index),
          title: format(dayDate, "dd/MM/yyyy", { locale: ptBR }),
        };
      }),
    [referenceDate],
  );

  const range = useMemo(() => {
    if (period === "mes") {
      return getMonthRange(referenceDate, selectedMonthOffset);
    }

    if (period === "dia") {
      return getDayRange(referenceDate, selectedDayOffset);
    }

    return getIntervalRange(startDate, endDate);
  }, [
    endDate,
    period,
    referenceDate,
    selectedDayOffset,
    selectedMonthOffset,
    startDate,
  ]);

  const salesQuery = useMemo(() => {
    if (period === "intervalo") {
      if (!startDate && !endDate) {
        return undefined;
      }

      return {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {})
      };
    }

    return {
      startDate: format(range.start, "yyyy-MM-dd"),
      endDate: format(range.end, "yyyy-MM-dd")
    };
  }, [endDate, period, range.end, range.start, startDate]);

  const brandDetailDateRange = useMemo(() => {
    if (period === "intervalo") {
      if (!startDate && !endDate) {
        const fallbackRange = getMonthRange(referenceDate, 0);

        return {
          period,
          startDate: format(fallbackRange.start, "yyyy-MM-dd"),
          endDate: format(fallbackRange.end, "yyyy-MM-dd"),
        };
      }

      return {
        period,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };
    }

    return {
      period,
      startDate: format(range.start, "yyyy-MM-dd"),
      endDate: format(range.end, "yyyy-MM-dd"),
    };
  }, [endDate, period, range.end, range.start, referenceDate, startDate]);

  const {
    items: sales,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  } = useSalesIntentions(salesQuery);

  const filteredSales = useMemo(
    () =>
      sales.filter((item) => {
        const date = parseReportDate(item.Data_solicitacao);
        return !!date && date >= range.start && date <= range.end;
      }),
    [range, sales],
  );

  const periodNoDataNotice = useMemo<PeriodNoDataNotice | null>(() => {
    if (error || isLoading || isRefreshing || filteredSales.length > 0) {
      return null;
    }

    const isTodayView = period === "dia" && selectedDayOffset === 0;
    const periodLabel =
      period === "mes"
        ? capitalizeText(format(range.start, "MMMM 'de' yyyy", { locale: ptBR }))
        : period === "dia"
          ? format(range.start, "dd/MM/yyyy", { locale: ptBR })
          : startDate && endDate
            ? `${formatInputDateLabel(startDate)} a ${formatInputDateLabel(endDate)}`
            : startDate
              ? `a partir de ${formatInputDateLabel(startDate)}`
              : endDate
                ? `até ${formatInputDateLabel(endDate)}`
                : "este período";

    return {
      title: isTodayView ? "Hoje ainda não tem dados" : "Sem dados para este período",
      message: isTodayView
        ? "Não encontramos registros para hoje. Use outro dia, mês ou intervalo para continuar."
        : `Não encontramos registros para ${periodLabel}. Ajuste as datas ou escolha outro recorte para continuar.`,
      chip: isTodayView ? "Hoje sem dados" : "Período sem dados",
      key: `${period}:${range.start.toISOString()}:${range.end.toISOString()}:${startDate || "-"}:${endDate || "-"}:${selectedDayOffset}`,
    };
  }, [
    error,
    filteredSales.length,
    isLoading,
    isRefreshing,
    period,
    range.end,
    range.start,
    selectedDayOffset,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    if (!periodNoDataNotice) {
      setIsNoDataModalOpen(false);
      setLastAutoOpenedNoticeKey(null);
      return;
    }

    if (lastAutoOpenedNoticeKey === periodNoDataNotice.key) {
      return;
    }

    setIsNoDataModalOpen(true);
    setLastAutoOpenedNoticeKey(periodNoDataNotice.key);
  }, [lastAutoOpenedNoticeKey, periodNoDataNotice]);

  const isAnyModalOpen = isNoDataModalOpen || isDetailedTableModalOpen;

  useEffect(() => {
    if (!isAnyModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      mobileBrandRefs.current[selectedMobileBrand]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedMobileBrand]);

  const activePeriodText = useMemo(() => {
    if (period === "mes") {
      return `Período ativo: ${capitalizeText(
        format(range.start, "MMMM 'de' yyyy", { locale: ptBR }),
      )}`;
    }

    if (period === "dia") {
      return selectedDayOffset === 0
        ? "Período ativo: Hoje"
        : `Período ativo: ${format(range.start, "dd/MM/yyyy", { locale: ptBR })}`;
    }

    if (startDate && endDate) {
      return `Período ativo: ${formatInputDateLabel(startDate)} a ${formatInputDateLabel(endDate)}`;
    }

    if (startDate) {
      return `Período ativo: a partir de ${formatInputDateLabel(startDate)}`;
    }

    if (endDate) {
      return `Período ativo: até ${formatInputDateLabel(endDate)}`;
    }

    return "Período ativo: intervalo livre";
  }, [endDate, period, range.start, selectedDayOffset, startDate]);

  const fallbackNotice = periodNoDataNotice?.chip ?? null;

  const novosSales = useMemo(
    () =>
      filteredSales.filter(
        (item) => String(item.Tipo_Venda).trim().toUpperCase() === "NOVOS",
      ),
    [filteredSales],
  );
  const seminovosSales = useMemo(
    () =>
      filteredSales.filter(
        (item) => String(item.Tipo_Venda).trim().toUpperCase() === "SEMINOVOS",
      ),
    [filteredSales],
  );

  const latestRecord = useMemo(() => {
    return filteredSales.reduce<SalesIntentionReportRow | null>((latest, item) => {
      if (!latest) {
        return item;
      }

      const latestDate = parseReportDate(latest.Criado);
      const currentDate = parseReportDate(item.Criado);

      if (!latestDate) {
        return item;
      }

      if (!currentDate) {
        return latest;
      }

      return currentDate > latestDate ? item : latest;
    }, null);
  }, [filteredSales]);

  const lastRecordText = latestRecord?.Criado ?? "--/--/---- --:--:--";
  const lastUpdatedText = lastUpdatedAt
    ? format(lastUpdatedAt, "dd/MM/yyyy HH:mm:ss")
    : "--/--/---- --:--:--";

  const totalProposals = filteredSales.reduce(
    (sum, item) => sum + (Number(item.Quantidade) || 0),
    0,
  );

  const brandTotals = useMemo(
    () =>
      dashboardBrandNames.map((brand) => {
        const sourceItems = brand === "SEMINOVOS" ? seminovosSales : novosSales;
        const value = sourceItems
          .filter((item) => matchesBrand(item, brand))
          .reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0);

        return { brand, value };
      }),
    [novosSales, seminovosSales],
  );

  const brandModelData = useMemo(
    () =>
      vehicleBrands.map((brand) => ({
        brand,
        data: topTenWithOthers(
          groupCounts(
            novosSales.filter((item) => matchesBrand(item, brand)),
            "Versao",
          ),
        ),
      })),
    [novosSales],
  );

  const flagData = useMemo(
    () =>
      topTenWithOthers(
        groupCounts(seminovosSales, "Bandeira"),
      ),
    [seminovosSales],
  );

  const brandStoreData = useMemo(
    () =>
      vehicleBrands.map((brand) => ({
        brand,
        data: topTenWithOthers(
          groupCounts(
            novosSales.filter((item) => matchesBrand(item, brand)),
            "Loja_Venda",
          ),
        ),
      })),
    [novosSales],
  );

  const storeData = useMemo(
    () => topTenWithOthers(groupCounts(seminovosSales, "Loja_Venda")),
    [seminovosSales],
  );

  const regionData = useMemo(
    () => topTenWithOthers(groupCounts(seminovosSales, "Regional")),
    [seminovosSales],
  );

  const mobileBrandRankings = useMemo(
    () => [...brandTotals].sort((a, b) => b.value - a.value),
    [brandTotals],
  );

  const selectedMobileBrandStats = useMemo(
    () =>
      brandTotals.find((brand) => brand.brand === selectedMobileBrand) ?? {
        brand: selectedMobileBrand,
        value: 0,
      },
    [brandTotals, selectedMobileBrand],
  );

  const selectedMobileBrandSales = useMemo(
    () => filteredSales.filter((item) => matchesBrand(item, selectedMobileBrand)),
    [filteredSales, selectedMobileBrand],
  );

  const selectedMobileBrandModelData = useMemo(
    () =>
      topTenWithOthers(
        groupCounts(
          selectedMobileBrandSales,
          selectedMobileBrand === "SEMINOVOS" ? "Marca_Veiculo" : "Versao",
        ),
      ),
    [selectedMobileBrand, selectedMobileBrandSales],
  );

  const selectedMobileBrandStoreData = useMemo(
    () => topTenWithOthers(groupCounts(selectedMobileBrandSales, "Loja_Venda")),
    [selectedMobileBrandSales],
  );

  const selectedMobileBrandRegionData = useMemo(
    () => topTenWithOthers(groupCounts(selectedMobileBrandSales, "Regional")),
    [selectedMobileBrandSales],
  );

  const selectedMobileBrandRank = mobileBrandRankings.findIndex(
    (brand) => brand.brand === selectedMobileBrand,
  );
  const selectedMobileBrandTotal = selectedMobileBrandStats.value;
  const selectedMobileBrandPosition = selectedMobileBrandRank >= 0 ? selectedMobileBrandRank + 1 : 0;
  const selectedMobileBrandShare = totalProposals > 0
    ? (selectedMobileBrandTotal / totalProposals) * 100
    : 0;

  function DetailedTableModal() {
    if (!isDetailedTableModalOpen) {
      return null;
    }

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] overflow-hidden bg-slate-950/90 backdrop-blur-md"
        onClick={() => setIsDetailedTableModalOpen(false)}
        role="presentation"
      >
        <div
          className="relative flex h-[100dvh] w-full flex-col overflow-hidden"
          onClick={(event) => event.stopPropagation()}
          role="presentation"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsDetailedTableModalOpen(false)}
            className="absolute right-3 top-3 z-20 shrink-0 border-white/10 bg-slate-950/85 text-white shadow-lg backdrop-blur hover:bg-slate-900 dark:border-white/10 dark:bg-slate-950/85 dark:text-white dark:hover:bg-slate-900"
            aria-label="Fechar tabela detalhada"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-14">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[920px]">
              <SalesIntentionDataList
                items={filteredSales}
                exportFilePrefix="dashboard-lista-dados-mobile"
                className="h-full min-h-0"
              />
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  function MobileDashboardView() {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col gap-4 px-4 pb-8 pt-4">
        <header className={cn(themedHeroClass, "space-y-4 rounded-[28px] px-4 py-4")}>
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
            <div aria-hidden="true" className="h-11 w-11" />
            <BrandLogo
              variant="header"
              className="mx-auto h-10 w-[150px] sm:h-12 sm:w-[180px]"
            />
            <Link
              href="/perfil"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Abrir perfil"
            >
              <UserRound className="h-5 w-5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[1.35rem] font-semibold leading-tight tracking-[-0.04em]">
                  Painel de Vendas Cantadas
                </h1>
              </div>
              <TooltipIcon text="Os cartões, rankings e listas abaixo respondem ao período selecionado." />
            </div>

            <div className="grid grid-cols-1 gap-2 phone:grid-cols-2">
              <div className="flex items-start gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2.5 text-[11px] leading-5 text-sky-50/90">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span className="min-w-0">Última atualização: {lastUpdatedText}</span>
              </div>
              <div className="flex items-start gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2.5 text-[11px] leading-5 text-sky-50/90">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span className="min-w-0">{isRefreshing ? "Atualizando..." : "Dados prontos"}</span>
              </div>
              <div className="flex items-start gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2.5 text-[11px] leading-5 text-sky-50/90">
                <NotebookText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span className="min-w-0">Último registro: {lastRecordText}</span>
              </div>
              <div className="flex items-start gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2.5 text-[11px] leading-5 text-sky-50/90">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span className="min-w-0">{activePeriodText}</span>
              </div>
            </div>

            {fallbackNotice ? (
              <div className="rounded-full border border-amber-400/20 bg-amber-400/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
                {fallbackNotice}
              </div>
            ) : null}
          </div>
        </header>

        <DashboardCard className="border-white/20 bg-white/95 px-4 py-4 text-slate-900 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className={cn(themedTinyLabelClass, "tracking-[0.34em]")}>Período</p>
                <TooltipIcon text="Escolha entre a visão por mês, por dia ou intervalo personalizado." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {periodOptions.map((option) => (
                <PeriodPill
                  key={option.key}
                  active={period === option.key}
                  onClick={() => setPeriod(option.key)}
                  className={cn(
                    "w-full px-3 py-2.5 text-[11px]",
                    option.key === "intervalo" && "col-span-2",
                  )}
                >
                  {option.label}
                </PeriodPill>
              ))}
            </div>

            {period === "mes" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
                      Atalhos do mês
                    </p>
                    <TooltipIcon text="Selecione um mês para aplicar o recorte rapidamente." />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {monthQuickFilters.map((item) => (
                    <PeriodPill
                      key={item.offset}
                      active={selectedMonthOffset === item.offset}
                      onClick={() => setSelectedMonthOffset(item.offset)}
                      title={item.title}
                      className="px-3 py-2 text-[10px] shadow-none"
                      uppercase={false}
                    >
                      {item.label}
                    </PeriodPill>
                  ))}
                </div>
              </div>
            )}

            {period === "dia" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
                      Atalhos do dia
                    </p>
                    <TooltipIcon text="Volte alguns dias de forma rápida sem abrir o calendário." />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dayQuickFilters.map((item) => (
                    <PeriodPill
                      key={item.offset}
                      active={selectedDayOffset === item.offset}
                      onClick={() => setSelectedDayOffset(item.offset)}
                      title={item.title}
                      className="px-3 py-2 text-[10px] shadow-none"
                      uppercase={false}
                    >
                      {item.label}
                    </PeriodPill>
                  ))}
                </div>
              </div>
            )}

            {period === "intervalo" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
                    Intervalo personalizado
                  </p>
                  <TooltipIcon text="Escolha uma data inicial e uma data final para filtrar o período." />
                </div>
                <div className="grid grid-cols-1 gap-2 phone:grid-cols-2">
                  <DateField
                    label="De"
                    value={startDate}
                    onChange={setStartDate}
                    max={endDate || undefined}
                    className="w-full"
                  />
                  <DateField
                    label="Até"
                    value={endDate}
                    onChange={setEndDate}
                    min={startDate || undefined}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </DashboardCard>

        {periodNoDataNotice ? (
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-50">
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{periodNoDataNotice.title}</p>
                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-100">
                  {periodNoDataNotice.message}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNoDataModalOpen(true)}
                className="shrink-0 border-amber-200 bg-white text-amber-900 hover:bg-amber-50 hover:text-amber-950 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-50 dark:hover:bg-amber-500/10 dark:hover:text-white"
              >
                Ver detalhes
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-50">
            Não conseguimos carregar os dados agora. Tente atualizar e, se o problema continuar, volte em alguns instantes.
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Flag className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
            <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
              Visão por bandeira
            </p>
          </div>

          <div
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Visão por bandeira"
            style={{
              paddingInline: "max(1rem, calc(50% - 80px))",
            }}
          >
            {brandTotals.map((brand) => (
              <MobileBrandCard
                key={brand.brand}
                brand={brand.brand}
                value={brand.value}
                href={buildBrandDetailHref(brand.brand, brandDetailDateRange)}
                active={selectedMobileBrand === brand.brand}
                linkRef={(element) => {
                  mobileBrandRefs.current[brand.brand] = element;
                }}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <p className={cn("truncate text-[13px] font-semibold uppercase tracking-[0.18em]", themedTextTitleClass)}>
                  {selectedMobileBrand}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>Bandeira em destaque</p>
              <TooltipIcon text="Use os chips para alternar a visão mobile dos rankings. Os cards da faixa acima abrem a página de detalhes da bandeira." />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {brandTotals.map((brand) => (
              <PeriodPill
                key={brand.brand}
                active={selectedMobileBrand === brand.brand}
                onClick={() => setSelectedMobileBrand(brand.brand)}
                className="px-3 py-2 text-[10px] shadow-none"
                uppercase={false}
              >
                {brand.brand}
              </PeriodPill>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard
              icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
              value={selectedMobileBrandTotal.toLocaleString("pt-BR")}
              label="Total de vendas cantadas"
            />
            <MobileMetricCard
              icon={<Crown className="h-5 w-5 text-amber-400" />}
              value={selectedMobileBrandPosition ? formatOrdinal(selectedMobileBrandPosition) : "--"}
              label="Posição geral"
            />
            <MobileMetricCard
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
              value={`${selectedMobileBrandShare.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
              label="Participação no período"
            />
            <MobileMetricCard
              icon={<Target className="h-5 w-5 text-cyan-400" />}
              value="--"
              label="Meta do dia"
              helper="Sem meta"
              valueClassName="text-slate-400 dark:text-slate-500"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.32em]", themedTextTitleClass)}>
                Destaques - {selectedMobileBrand}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <RankingCard
              title="Venda Cantada x Modelo"
              data={selectedMobileBrandModelData}
              contextLabel={selectedMobileBrand}
              tooltip="Quantidade Total de Vendas Cantadas por modelo da marca selecionada no período."
            />
            <RankingCard
              title="Venda Cantada x Lojas"
              data={selectedMobileBrandStoreData}
              contextLabel={selectedMobileBrand}
              tooltip="Quantidade Total de Vendas Cantadas por loja da marca selecionada no período."
            />
            <RankingCard
              title="Venda Cantada x Região"
              data={selectedMobileBrandRegionData}
              contextLabel={selectedMobileBrand}
              tooltip="Quantidade Total de Vendas Cantadas por região da marca selecionada no período."
            />
          </div>
        </section>

        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={() => setIsDetailedTableModalOpen(true)}
          className="mt-1 h-12 w-full rounded-full text-sm font-semibold shadow-[0_18px_40px_-22px_rgba(14,165,233,0.75)]"
        >
          <NotebookText className="h-4 w-4" />
          Abrir tabela detalhada
        </Button>
      </div>
    );
  }

  return (
    <main className={cn("min-h-[100dvh] overflow-x-hidden", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="tablet:hidden">
        <MobileDashboardView />
        <DetailedTableModal />
      </div>
      <div className="hidden tablet:block">
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-3 sm:p-5">
          <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="grid gap-4 xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(340px,430px)] xl:items-start">
            <div className="flex items-start">
              <BrandLogo
                variant="header"
                className="h-[70px] w-[250px] sm:h-[80px] sm:w-[290px] xl:h-[92px] xl:w-[330px]"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
                  Dashboard
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                    Painel de Vendas Cantadas
                  </h1>
                  <TooltipIcon text="Os cartões, rankings e listas abaixo respondem ao período selecionado." />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Última atualização: {lastUpdatedText}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {isRefreshing ? "Atualizando..." : "Dados prontos"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Último registro: {lastRecordText}
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
            </div>

            <DashboardCard className="border-white/20 bg-white/95 px-4 py-4 text-slate-900 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <p className={cn(themedTinyLabelClass, "tracking-[0.34em]")}>
                      Período
                    </p>
                    <TooltipIcon text="Escolha entre a visão por mês, por dia ou intervalo personalizado." />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {periodOptions.map((option) => (
                    <PeriodPill
                      key={option.key}
                      active={period === option.key}
                      onClick={() => setPeriod(option.key)}
                      className="px-4 py-2.5 text-[11px]"
                    >
                      {option.label}
                    </PeriodPill>
                  ))}
                </div>

                {period === "mes" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
                          Atalhos do mês
                        </p>
                        <TooltipIcon text="Selecione um mês para aplicar o recorte rapidamente." />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {monthQuickFilters.map((item) => (
                        <PeriodPill
                          key={item.offset}
                          active={selectedMonthOffset === item.offset}
                          onClick={() => setSelectedMonthOffset(item.offset)}
                          title={item.title}
                          className="px-3 py-2 text-[10px] shadow-none"
                          uppercase={false}
                        >
                          {item.label}
                        </PeriodPill>
                      ))}
                    </div>
                  </div>
                )}

                {period === "dia" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
                          Atalhos do dia
                        </p>
                        <TooltipIcon text="Volte alguns dias de forma rápida sem abrir o calendário." />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dayQuickFilters.map((item) => (
                        <PeriodPill
                          key={item.offset}
                          active={selectedDayOffset === item.offset}
                          onClick={() => setSelectedDayOffset(item.offset)}
                          title={item.title}
                          className="px-3 py-2 text-[10px] shadow-none"
                          uppercase={false}
                        >
                          {item.label}
                        </PeriodPill>
                      ))}
                    </div>
                  </div>
                )}

                {period === "intervalo" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>
                        Intervalo personalizado
                      </p>
                      <TooltipIcon text="Escolha uma data inicial e uma data final para filtrar o período." />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DateField
                        label="De"
                        value={startDate}
                        onChange={setStartDate}
                        max={endDate || undefined}
                      />
                      <DateField
                        label="Até"
                        value={endDate}
                        onChange={setEndDate}
                        min={startDate || undefined}
                      />
                    </div>
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>
        </section>

        {periodNoDataNotice ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{periodNoDataNotice.title}</p>
                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-100">
                  {periodNoDataNotice.message}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNoDataModalOpen(true)}
                className="shrink-0 border-amber-200 bg-white text-amber-900 hover:bg-amber-50 hover:text-amber-950 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-50 dark:hover:bg-amber-500/10 dark:hover:text-white"
              >
                Ver detalhes
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-50">
            Não conseguimos carregar os dados agora. Tente atualizar e, se o
            problema continuar, volte em alguns instantes.
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {brandTotals.map((brand) => (
              <BrandTotalCard
                key={brand.brand}
                {...brand}
                href={buildBrandDetailHref(brand.brand, brandDetailDateRange)}
              />
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            {brandModelData.map(({ brand, data }) => (
              <RankingCard
                key={brand}
                title="Venda Cantada x Modelo"
                data={data}
                contextLabel={brand}
                tooltip="Quantidade Total de Vendas Cantadas por modelo da marca selecionada no período."
              />
            ))}
            <RankingCard
              title="Venda Cantada x Bandeira"
              data={flagData}
              tooltip="Quantidade Total de Vendas Cantadas por bandeira no período selecionado."
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            {brandStoreData.map(({ brand, data }) => (
              <RankingCard
                key={brand}
                title="Venda Cantada x Lojas"
                data={data}
                contextLabel={brand}
                tooltip="Quantidade Total de Vendas Cantadas por loja da marca selecionada no período."
              />
            ))}

            <RankingCard
              title="Venda Cantada x Lojas"
              data={storeData}
              tooltip="Quantidade Total de Vendas Cantadas por loja no período selecionado."
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            {vehicleBrands.map((brand) => (
              <RankingCard
                key={brand}
                title="Venda Cantada x Região"
                data={topTenWithOthers(
                  groupCounts(
                    novosSales.filter((item) => matchesBrand(item, brand)),
                    "Regional",
                  ),
                )}
                contextLabel={brand}
                tooltip="Quantidade Total de Vendas Cantadas por região da marca selecionada no período."
              />
            ))}

            <RankingCard
              title="Venda Cantada x Região"
              data={regionData}
              tooltip="Quantidade Total de Vendas Cantadas por região no período selecionado."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <div className={cn("text-sm font-medium", themedTextBodyClass)}>
              {totalProposals.toLocaleString("pt-BR")} propostas registradas
            </div>
            <div className={cn("px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]", themedChipClass)}>
              {filteredSales.length} registros filtrados
            </div>
          </div>

          <SalesIntentionDataList
            items={filteredSales}
            exportFilePrefix="dashboard-lista-dados"
            className="mt-1 w-full max-w-none"
          />
        </section>

        {periodNoDataNotice ? (
          <PeriodNoDataModal
            open={isNoDataModalOpen}
            notice={periodNoDataNotice}
            onClose={() => setIsNoDataModalOpen(false)}
            onRefresh={() => void refresh({ silent: true })}
          />
        ) : null}
      </div>
      </div>
    </main>
  );
}
