"use client";

import { createPortal } from "react-dom";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import { CircleHelp, RefreshCw } from "lucide-react";

import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
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

const brands = [
  "CAOA CHERY",
  "CAOA CHANGAN",
  "HYUNDAI",
  "FORD",
  "SEMINOVOS",
];

const vehicleBrands = brands.filter((brand) => brand !== "SEMINOVOS");

type PeriodType = (typeof periodOptions)[number]["key"];
type CountItem = { label: string; value: number };

function TooltipIcon({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sky-500 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 dark:text-cyan-300 dark:hover:text-cyan-200"
    >
      <CircleHelp className="h-4 w-4" />
    </button>
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
          ? "border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/10 dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-400/20"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className={cn("flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm", themedTextBodyClass, "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/70")}>
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
}: {
  value: number;
  brand: string;
}) {
  return (
    <DashboardCard className="min-h-[168px] px-5 py-5">
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
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
  );
}

function RankingCard({
  title,
  data,
  contextLabel,
  tooltip,
}: {
  title: string;
  data: CountItem[];
  contextLabel?: string;
  tooltip?: string;
}) {
  const max = data[0]?.value || 1;

  return (
    <DashboardCard className="min-h-[276px] px-5 py-5">
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

export default function DashboardV2Page() {
  const [referenceDate] = useState(() => new Date());
  const [period, setPeriod] = useState<PeriodType>("dia");
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isNoDataModalOpen, setIsNoDataModalOpen] = useState(false);
  const [lastAutoOpenedNoticeKey, setLastAutoOpenedNoticeKey] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isNoDataModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isNoDataModalOpen]);

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
      brands.map((brand) => {
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

  return (
    <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
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
              <BrandTotalCard key={brand.brand} {...brand} />
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
    </main>
  );
}
