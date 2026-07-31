"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec } from "@visactor/vchart";

import { Button } from "@/components/ui/button";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";

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

function getRange(period: PeriodType, startValue: string, endValue: string) {
  const now = new Date();
  if (period === "dia") {
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "mes")
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  return {
    start: startValue ? new Date(`${startValue}T00:00:00`) : new Date(0),
    end: endValue
      ? new Date(`${endValue}T23:59:59.999`)
      : new Date(8640000000000000),
  };
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

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-2xl border-2 border-emerald-300/70 bg-[#365888]/95 p-4 shadow-lg shadow-slate-950/20 ${className}`}
    >
      {children}
    </article>
  );
}

function Gauge({
  value,
  target,
  brand,
}: {
  value: number;
  target: number;
  brand: string;
}) {
  const percentage = target ? Math.round((value / target) * 100) : 0;
  const progress = Math.min(100, percentage);
  const circumference = Math.PI * 44;
  const dashOffset = circumference - (progress / 100) * circumference;
  return (
    <Panel>
      <p className="text-center text-base font-bold uppercase tracking-wide text-white">
        {brand}
      </p>
      <h2 className="mt-1 text-center text-base font-semibold text-white">
        Meta Diária x Propostas
      </h2>
      <div className="relative mx-auto mt-3 h-24 max-w-[190px] overflow-hidden">
        <svg
          viewBox="0 0 120 64"
          className="h-full w-full"
          aria-label={`${percentage}% da meta`}
        >
          <path
            d="M 16 58 A 44 44 0 0 1 104 58"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="12"
          />
          <path
            d="M 16 58 A 44 44 0 0 1 104 58"
            fill="none"
            stroke="#e40046"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-2xl font-bold tracking-tight text-white">
            {percentage}%
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200">
            da meta diária
          </p>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-white/85">
        <span>{value.toLocaleString("pt-BR")} propostas</span>
        <span>meta {target.toLocaleString("pt-BR")}</span>
      </div>
    </Panel>
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
    <Panel className="min-h-[280px]">
      <h2 className="text-center text-base font-bold text-white">{title}</h2>
      <p className="mb-4 text-center text-xs text-white/65">{description}</p>
      <div className="max-h-[210px] space-y-3 overflow-y-auto pr-1">
        {data.length ? (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span
                  className="truncate font-medium text-white"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="rounded-md bg-slate-950/25 px-2 py-0.5 font-semibold text-white">
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-sm bg-slate-950/25">
                <div
                  className="h-full bg-slate-300"
                  style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="py-12 text-center text-sm text-white/70">
            Nenhum dado no período.
          </p>
        )}
      </div>
    </Panel>
  );
}

export default function DashboardV2Page() {
  const [period, setPeriod] = useState<PeriodType>("mes");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const requestedDateRange = useMemo(
    () => {
      if (period === "dia") {
        const today = formatQueryDate(new Date());
        return {
          startDate: today,
          endDate: today,
        };
      }

      return {
        ...(period === "intervalo" && startDate && endDate
          ? { startDate, endDate }
          : {}),
      };
    },
    [endDate, period, startDate],
  );
  const {
    items: sales,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  } = useSalesIntentions(requestedDateRange);

  const range = useMemo(
    () => getRange(period, startDate, endDate),
    [period, startDate, endDate],
  );
  const filteredSales = useMemo(
    () =>
      sales.filter((item) => {
        const date = parseReportDate(item.Data_solicitacao);
        return !!date && date >= range.start && date <= range.end;
      }),
    [range, sales],
  );
  const totalProposals = filteredSales.reduce(
    (sum, item) => sum + (Number(item.Quantidade) || 0),
    0,
  );
  const dailyTarget = Math.ceil(totalProposals * 0.33);
  const brandGauges = useMemo(
    () =>
      brands.map((brand) => {
        const value = filteredSales
          .filter((item) => matchesBrand(item, brand))
          .reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0);
        return { brand, value, target: Math.ceil(value * 0.33) };
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
      padding: [16, 20, 38, 42],
      color: ["#b7c2e2"],
      bar: { style: { cornerRadius: [3, 3, 0, 0] } },
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
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_35%_10%,#15568b_0%,#06345e_38%,#031d43_100%)] p-3 text-white sm:p-5">
      <div className="mx-auto max-w-[1800px]">
        <header className="px-2 py-2 text-white sm:px-4">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              INTENÇÃO DE VENDAS
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {periodOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => setPeriod(option.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${period === option.key ? "bg-white text-sky-950" : "bg-white/10 text-white hover:bg-white/20"}`}
                >
                  {option.label}
                </button>
              ))}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Atualizar dados"
                onClick={() => void refresh({ silent: true })}
                className="text-white hover:bg-white/15 hover:text-white"
              >
                <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
              </Button>
            </div>
            <div className="text-left xl:text-right">
              <p className="text-lg font-bold italic">
                {lastUpdatedAt
                  ? format(lastUpdatedAt, "dd/MM/yyyy HH:mm:ss")
                  : "--/--/---- --:--:--"}
              </p>
              <p className="mt-1 text-xs font-semibold italic">
                Última Atualização
              </p>
            </div>
          </div>
          {period === "intervalo" && (
            <div className="mt-5 flex flex-wrap gap-3">
              <label className="text-xs font-semibold text-cyan-50">
                De{" "}
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="ml-2 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-white outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-cyan-50">
                Até{" "}
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="ml-2 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-white outline-none"
                />
              </label>
            </div>
          )}
        </header>
        {error && (
          <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
            Não foi possível carregar os dados: {error}
          </div>
        )}
        <section className="mt-3 min-w-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 desktop:grid-cols-5">
            {brandGauges.map((gauge) => (
              <Gauge key={gauge.brand} {...gauge} />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2 desktop:grid-cols-5">
            {brandModelData.map(({ brand, data }) => (
              <RankingCard
                key={brand}
                title="Propostas x Modelo"
                data={data}
                description={brand}
              />
            ))}
              <RankingCard
                title="Propostas x Bandeira"
                data={flagData}
                description="Distribuição por bandeira"
              />
            </div>
          <div className="grid gap-3 lg:grid-cols-2 desktop:grid-cols-5">
            {vehicleBrands.map((brand) => (
              <RankingCard
                key={brand}
                title="Propostas x Regional de Vendas"
                data={topTenWithOthers(
                  groupCounts(
                    filteredSales.filter((item) => matchesBrand(item, brand)),
                    "Regional",
                  ),
                )}
                description={brand}
              />
            ))}
            <Panel className="min-h-[280px]">
              <h2 className="text-center text-base font-bold text-white">
                Propostas x Regional de Vendas
              </h2>
              <p className="text-center text-xs text-white/65">
                Visão consolidada do período
              </p>
              <div className="h-[220px] pt-3">
                <VChart spec={barSpec} />
              </div>
            </Panel>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2 text-sm text-white/85">
            <span>
              {totalProposals.toLocaleString("pt-BR")} propostas registradas
            </span>
            <span>
              Meta diária: {dailyTarget.toLocaleString("pt-BR")} propostas (33%)
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
