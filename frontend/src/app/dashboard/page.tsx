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
import { CircleHelp, RefreshCw } from "lucide-react";

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
  "SEMINOVOS",
];

const vehicleBrands = brands.filter((brand) => brand !== "SEMINOVOS");

type PeriodType = (typeof periodOptions)[number]["key"];
type CountItem = { label: string; value: number };

function HeaderMetric({
  label,
  value,
  action,
  tooltip,
}: {
  label: string;
  value: string;
  action?: ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/20 bg-white/95 px-4 py-3 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.95)] backdrop-blur">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
            {label}
          </p>
          {tooltip ? <HeaderTooltip text={tooltip} /> : null}
        </div>
        <p className="mt-1 truncate text-[14px] font-bold italic leading-none text-slate-900 sm:text-[15px]">
          {value}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function HeaderTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={text}
        aria-expanded={isOpen}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sky-500 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
        onClick={() => setIsOpen((current) => !current)}
        onBlur={() => setIsOpen(false)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-left text-[11px] leading-5 text-white shadow-xl transition duration-150 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        {text}
      </span>
    </span>
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
          ? "border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/10"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
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
    <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
      <span className="shrink-0">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none [color-scheme:light]"
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

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    <article
      className={cn(
        "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.32)]",
        className,
      )}
    >
      {children}
    </article>
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
    <DashboardCard className="min-h-[172px] px-5 py-5">
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {brand}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <p className="text-5xl font-light leading-none tracking-[-0.05em] text-slate-900 xl:text-6xl">
            {value.toLocaleString("pt-BR")}
          </p>
        </div>

        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
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
  tooltip,
}: {
  title: string;
  data: CountItem[];
  description?: string;
  tooltip?: string;
}) {
  const max = data[0]?.value || 1;

  return (
    <DashboardCard className="min-h-[280px] px-5 py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-900">
              {title}
            </h2>
            {tooltip ? <HeaderTooltip text={tooltip} /> : null}
          </div>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Top 10
        </span>
      </div>

      <div className="max-h-[210px] space-y-3 overflow-y-auto pr-1">
        {data.length ? (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span
                  className="truncate font-medium text-slate-700"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
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

  const requestedDateRange = useMemo(() => {
    if (period === "mes") {
      const { start, end } = getMonthRange(referenceDate, selectedMonthOffset);
      return {
        startDate: formatQueryDate(start),
        endDate: formatQueryDate(end),
      };
    }

    if (period === "dia") {
      const { start, end } = getDayRange(referenceDate, selectedDayOffset);
      return {
        startDate: formatQueryDate(start),
        endDate: formatQueryDate(end),
      };
    }

    if (startDate && endDate) {
      return { startDate, endDate };
    }

    return undefined;
  }, [
    endDate,
    period,
    referenceDate,
    selectedDayOffset,
    selectedMonthOffset,
    startDate,
  ]);

  const {
    items: sales,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  } = useSalesIntentions(requestedDateRange);

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

  const filteredSales = useMemo(
    () =>
      sales.filter((item) => {
        const date = parseReportDate(item.Data_solicitacao);
        return !!date && date >= range.start && date <= range.end;
      }),
    [range, sales],
  );
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
    () => topTenWithOthers(groupCounts(novosSales, "Loja_Venda")),
    [novosSales],
  );

  const regionData = useMemo(
    () => topTenWithOthers(groupCounts(novosSales, "Regional")),
    [novosSales],
  );


  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_48%,_#e8eef7_100%)] p-3 text-slate-900 sm:p-5">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#06345e_0%,_#0b4a7a_48%,_#0f5f95_100%)] px-4 py-4 text-white shadow-[0_26px_70px_-44px_rgba(2,6,23,0.85)] sm:px-5 sm:py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(340px,430px)] xl:items-start">
            <div className="flex items-start">
              <BrandLogo
                variant="header"
                className="h-[70px] w-[250px] sm:h-[80px] sm:w-[290px] xl:h-[92px] xl:w-[330px]"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <HeaderMetric
                label="Data do último registro"
                value={lastRecordText}
                tooltip="Essa data corresponde ao último registro cadastrado dentro do período selecionado."
              />
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
                    className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        isRefreshing && "animate-spin",
                      )}
                    />
                  </Button>
                }
              />
            </div>

            <DashboardCard className="border-white/20 bg-white/95 px-4 py-4 text-slate-900 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.55)]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
                      Período
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Escolha a visão principal
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Filtros rápidos
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                        Atalhos do mês
                      </p>
                      <span className="text-[10px] font-medium text-slate-500">
                        Clique em um mês para filtrar
                      </span>
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                        Atalhos do dia
                      </p>
                      <span className="text-[10px] font-medium text-slate-500">
                        Clique para voltar alguns dias
                      </span>
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                      Intervalo personalizado
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <DateField
                        label="De"
                        value={startDate}
                        onChange={setStartDate}
                      />
                      <DateField
                        label="Até"
                        value={endDate}
                        onChange={setEndDate}
                      />
                    </div>
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            Não foi possível carregar os dados: {error}
          </div>
        )}

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
                description={brand}
              />
            ))}
            <RankingCard
              title="Venda Cantada x Bandeira"
              data={flagData}
              description="Distribuição por bandeira"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            {brandStoreData.map(({ brand, data }) => (
              <RankingCard
                key={brand}
                title="Venda Cantada x Região"
                data={data}
                description={brand}
              />
            ))}

            <RankingCard
              title="Venda Cantada x Região"
              data={storeData}
              tooltip="Top 10 lojas por propostas no período selecionado"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            <RankingCard
              title="Venda Cantada x Lojas"
              data={regionData}
              tooltip="Visão consolidada do período selecionado"
            />

            {vehicleBrands.map((brand) => (
              <RankingCard
                key={brand}
                title="Venda Cantada x Lojas"
                data={topTenWithOthers(
                  groupCounts(
                    novosSales.filter((item) => matchesBrand(item, brand)),
                    "Regional",
                  ),
                )}
                description={brand}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm font-medium text-slate-600">
              {totalProposals.toLocaleString("pt-BR")} propostas registradas
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {filteredSales.length} registros filtrados
            </div>
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
