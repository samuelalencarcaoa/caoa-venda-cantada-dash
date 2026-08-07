"use client";

import { type ReactNode, useMemo, useState } from "react";
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
import { RefreshCw } from "lucide-react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec } from "@visactor/vchart";

import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";
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
  "SEMINOVOS"
];
const vehicleBrands = brands.filter((brand) => brand !== "SEMINOVOS");
type PeriodType = (typeof periodOptions)[number]["key"];
type CountItem = { label: string; value: number };

function HeaderMetric({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[92px] items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 break-words text-[15px] font-semibold leading-tight text-slate-900 sm:text-[16px]">
          {value}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/92 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.38)] backdrop-blur",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 opacity-70" />
      {children}
    </article>
  );
}

function PeriodChip({
  active,
  children,
  className = "",
  title,
  uppercase = true,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  uppercase?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold transition",
        uppercase ? "uppercase tracking-[0.2em]" : "tracking-[0.01em]",
        active
          ? "bg-slate-900 text-white shadow-sm shadow-slate-900/20"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="min-w-[28px] text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-[150px] rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
      />
    </label>
  );
}

function parseReportDate(value: string) {
  const [datePart, timePart = "00:00:00"] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(referenceDate: Date, monthOffset: number) {
  const monthStart = startOfMonth(subMonths(referenceDate, monthOffset));
  return {
    start: monthStart,
    end: endOfMonth(monthStart),
  };
}

function getDayRange(referenceDate: Date, dayOffset: number) {
  const day = subDays(startOfDay(referenceDate), dayOffset);
  return {
    start: day,
    end: endOfDay(day),
  };
}

function getIntervalRange(startValue: string, endValue: string) {
  return {
    start: startValue ? new Date(`${startValue}T00:00:00`) : new Date(0),
    end: endValue
      ? new Date(`${endValue}T23:59:59.999`)
      : new Date(8640000000000000),
  };
}

function formatMonthTitle(date: Date) {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

function getMonthBadgeLabel(offset: number) {
  switch (offset) {
    case 0:
      return "Este mês";
    case 1:
      return "Mês passado";
    default:
      return `${offset} meses atrás`;
  }
}

function getDayBadgeLabel(offset: number) {
  switch (offset) {
    case 0:
      return "Hoje";
    case 1:
      return "Ontem";
    case 2:
      return "Anteontem";
    case 3:
      return "2 dias atrás";
    default:
      return "3 dias atrás";
  }
}

function getRange(
  period: PeriodType,
  referenceDate: Date,
  monthOffset: number,
  dayOffset: number,
  startValue: string,
  endValue: string,
) {
  if (period === "dia") {
    return getDayRange(referenceDate, dayOffset);
  }
  if (period === "mes") {
    return getMonthRange(referenceDate, monthOffset);
  }
  return getIntervalRange(startValue, endValue);
}

function groupCounts(
  items: SalesIntentionReportRow[],
  key: keyof SalesIntentionReportRow,
) {
  const totals = new Map<string, number>();
  items.forEach((item) => {
    const label =
      String(item[key] || "Sem informação").trim() || "Sem informação";
    totals.set(
      label,
      (totals.get(label) || 0) + (Number(item.Quantidade) || 0),
    );
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
  if (items.length <= 10) return items;
  return [
    ...items.slice(0, 10),
    {
      label: "Outros",
      value: items.slice(10).reduce((sum, item) => sum + item.value, 0),
    },
  ];
}

function BrandTotalCard({
  value,
  brand,
}: {
  value: number;
  brand: string;
}) {
  return (
    <DashboardCard className="min-h-[178px] p-5">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {brand}
          </span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-5xl font-semibold leading-none tracking-[-0.06em] text-slate-900 sm:text-6xl">
            {value.toLocaleString("pt-BR")}
          </p>
        </div>
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
          Total de propostas
        </p>
      </div>
    </DashboardCard>
  );
}

function RankingCard({
  title,
  data,
  description,
}: {
  title: string;
  data: CountItem[];
  description: string;
}) {
  const max = data[0]?.value || 1;
  return (
    <DashboardCard className="min-h-[280px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Top 10
        </span>
      </div>
      <div className="mt-4 max-h-[210px] space-y-3 overflow-y-auto pr-1">
        {data.length ? (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span
                  className="truncate font-medium text-slate-700"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400"
                  style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">
            Nenhum dado no período.
          </p>
        )}
      </div>
    </DashboardCard>
  );
}

export default function DashboardV2Page() {
  const [referenceDate] = useState(() => new Date());
  const [period, setPeriod] = useState<PeriodType>("mes");
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const monthQuickFilters = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const monthDate = subMonths(startOfMonth(referenceDate), index);
        return {
          offset: index,
          label: getMonthBadgeLabel(index),
          title: formatMonthTitle(monthDate),
        };
      }),
    [referenceDate],
  );
  const dayQuickFilters = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((offset) => ({
        offset,
        label: getDayBadgeLabel(offset),
        title: format(subDays(startOfDay(referenceDate), offset), "dd/MM/yyyy"),
      })),
    [referenceDate],
  );
  const requestedDateRange = useMemo(() => {
    if (period === "mes") {
      const monthRange = getMonthRange(referenceDate, selectedMonthOffset);
      return {
        startDate: formatQueryDate(monthRange.start),
        endDate: formatQueryDate(monthRange.end),
      };
    }

    if (period === "dia") {
      const dayRange = getDayRange(referenceDate, selectedDayOffset);
      return {
        startDate: formatQueryDate(dayRange.start),
        endDate: formatQueryDate(dayRange.end),
      };
    }

    return startDate && endDate
      ? { startDate, endDate }
      : undefined;
  }, [endDate, period, referenceDate, selectedDayOffset, selectedMonthOffset, startDate]);
  const {
    items: sales,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  } = useSalesIntentions(requestedDateRange);

  const range = useMemo(
    () =>
      getRange(
        period,
        referenceDate,
        selectedMonthOffset,
        selectedDayOffset,
        startDate,
        endDate,
      ),
    [endDate, period, referenceDate, selectedDayOffset, selectedMonthOffset, startDate],
  );
  const filteredSales = useMemo(
    () =>
      sales.filter((item) => {
        const date = parseReportDate(item.Data_solicitacao);
        return !!date && date >= range.start && date <= range.end;
      }),
    [range, sales],
  );
  const lastRecordText = filteredSales[0]?.Criado ?? "--/--/---- --:--:--";
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
        const value = filteredSales
          .filter((item) => matchesBrand(item, brand))
          .reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0);
        return { brand, value };
      }),
    [filteredSales],
  );
  const brandModelData = useMemo(
    () =>
      vehicleBrands.map((brand) => ({
        brand,
        data: topTenWithOthers(
          groupCounts(
            filteredSales.filter(
              (item) =>
                String(item.Tipo_Venda).trim().toUpperCase() === "NOVOS" &&
                matchesBrand(item, brand),
            ),
            "Versao",
          ),
        ),
      })),
    [filteredSales],
  );
  const flagData = useMemo(
    () =>
      topTenWithOthers(
        groupCounts(
          filteredSales.filter(
            (item) =>
              String(item.Tipo_Venda).trim().toUpperCase() === "SEMINOVOS",
          ),
          "Bandeira",
        ),
      ),
    [filteredSales],
  );
  const regionData = useMemo(
    () => topTenWithOthers(groupCounts(filteredSales, "Regional")),
    [filteredSales],
  );
  const barSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "regions",
          values: regionData.map((item) => ({
            regional: item.label,
            propostas: item.value,
          })),
        },
      ],
      direction: "vertical",
      xField: "regional",
      yField: "propostas",
      padding: [16, 18, 38, 44],
      color: ["#2563eb"],
      bar: { style: { cornerRadius: [8, 8, 0, 0] } },
      axis: {
        xAxis: {
          label: {
            rotate: 35,
            textAlign: "right",
            maxWidth: 90,
            overflow: "ellipsis",
          },
        },
      },
      tooltip: { trigger: ["hover"] },
    }),
    [regionData],
  );

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_48%,_#e8eef7_100%)] p-3 text-slate-900 sm:p-5">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <header className="rounded-[32px] border border-white/80 bg-white/88 p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.32)] backdrop-blur sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(280px,auto)_minmax(0,1fr)_minmax(360px,auto)] xl:items-stretch">
            <div className="flex h-full flex-col justify-between gap-4 rounded-[28px] bg-slate-950 px-5 py-4 text-white shadow-lg shadow-slate-950/15">
              <BrandLogo
                variant="header"
                className="h-[58px] w-[212px] sm:h-[66px] sm:w-[240px]"
              />
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">
                  Painel consolidado
                </p>
                <p className="max-w-md text-sm leading-6 text-slate-300">
                  Visão resumida das intenções cadastradas, com filtros rápidos por período.
                </p>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <HeaderMetric label="Data do último registro" value={lastRecordText} />
              <HeaderMetric
                label="Última atualização"
                value={lastUpdatedText}
                action={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Atualizar dados"
                    onClick={() => void refresh({ silent: true })}
                    className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <RefreshCw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  </Button>
                }
              />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-4 shadow-sm shadow-slate-900/5">
              <div className="flex flex-wrap items-center gap-2">
                {periodOptions.map((option) => (
                  <PeriodChip
                    key={option.key}
                    active={period === option.key}
                    onClick={() => setPeriod(option.key)}
                  >
                    {option.label}
                  </PeriodChip>
                ))}
              </div>

              {period === "mes" && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                    Últimos 5 meses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {monthQuickFilters.map((item) => (
                      <PeriodChip
                        key={item.offset}
                        active={selectedMonthOffset === item.offset}
                        onClick={() => setSelectedMonthOffset(item.offset)}
                        title={item.title}
                        uppercase={false}
                        className="px-3 py-1.5 text-[11px]"
                      >
                        {item.label}
                      </PeriodChip>
                    ))}
                  </div>
                </div>
              )}

              {period === "dia" && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                    Hoje e anteriores
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dayQuickFilters.map((item) => (
                      <PeriodChip
                        key={item.offset}
                        active={selectedDayOffset === item.offset}
                        onClick={() => setSelectedDayOffset(item.offset)}
                        title={item.title}
                        uppercase={false}
                        className="px-3 py-1.5 text-[11px]"
                      >
                        {item.label}
                      </PeriodChip>
                    ))}
                  </div>
                </div>
              )}

              {period === "intervalo" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <DateField
                    label="De"
                    value={startDate}
                    onChange={setStartDate}
                  />
                  <DateField label="Até" value={endDate} onChange={setEndDate} />
                </div>
              )}
            </div>
          </div>
        </header>
        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            Não foi possível carregar os dados: {error}
          </div>
        )}
        <section className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {brandTotals.map((brand) => (
              <BrandTotalCard key={brand.brand} {...brand} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
            {brandModelData.map(({ brand, data }) => (
              <RankingCard
                key={brand}
                title="Venda Cantada X Modelo"
                data={data}
                description={brand}
              />
            ))}
            <RankingCard
              title="Venda Cantada X Bandeira"
              data={flagData}
              description="Distribuição por bandeira"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
            {vehicleBrands.map((brand) => (
              <RankingCard
                key={brand}
                title="Venda Cantada x Regional de Vendas"
                data={topTenWithOthers(
                  groupCounts(
                    filteredSales.filter((item) => matchesBrand(item, brand)),
                    "Regional",
                  ),
                )}
                description={brand}
              />
            ))}
            <DashboardCard className="min-h-[280px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-900">
                    Venda Cantada x Regional de Vendas
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Visão consolidada do período
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Gráfico
                </span>
              </div>
              <div className="mt-4 h-[220px]">
                <VChart spec={barSpec} />
              </div>
            </DashboardCard>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm shadow-slate-900/5">
            <span className="font-medium text-slate-700">
              {totalProposals.toLocaleString("pt-BR")} propostas registradas
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {filteredSales.length} registros filtrados
            </span>
          </div>

          <SalesIntentionDataList
            items={filteredSales}
            exportFilePrefix="dashboard-lista-dados"
            className="mt-1"
          />
        </section>
      </div>
    </main>
  );
}
