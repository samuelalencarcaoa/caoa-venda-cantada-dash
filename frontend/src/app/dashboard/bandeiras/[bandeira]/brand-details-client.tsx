"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Flag,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import { ReportErrorCard } from "@/components/report-error-card";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import {
  BrandDetailsAnalyticsSection,
  BrandDetailsAnalyticsSkeleton,
} from "@/components/bandeira-details/brand-details-analytics-section";
import {
  FilterSelectCard,
  TooltipIcon,
} from "@/components/sales-intention-filter-select-card";
import { Button } from "@/components/ui/button";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import {
  brandNameToSlug,
  type DashboardPeriod,
} from "@/lib/brand-routing";
import { cn } from "@/lib/utils";
import {
  themedHeroClass,
  themedCardClass,
  themedInputClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTinyLabelClass,
  themedTextTitleClass,
} from "@/lib/theme-classes";

type BrandDetailsClientProps = {
  brandName: string;
  period?: DashboardPeriod | null;
  startDate?: string;
  endDate?: string;
};

const brandStatusChipClass =
  "rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium";

const heroOutlineButtonClass =
  "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white";

const heroPrimaryButtonClass = "bg-cyan-400 text-slate-950 hover:bg-cyan-300";

const tipoVendaLabels: Record<string, string> = {
  NOVOS: "Novos",
  SEMINOVOS: "Seminovos",
};

function normalizeValue(value: string) {
  return value.trim().toUpperCase();
}

function formatTipoVendaLabel(value: string) {
  return tipoVendaLabels[normalizeValue(value)] ?? value;
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

function matchesSelectedValues(selected: string[], value: string) {
  return (
    selected.length === 0 ||
    selected.some((option) => normalizeValue(option) === normalizeValue(value))
  );
}

function normalizeOptionalValue(value: string | null | undefined, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
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

function capitalizeText(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPeriodLabel(
  period?: DashboardPeriod | null,
  startDate?: string,
  endDate?: string,
) {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);

  if (start && end) {
    if (isSameDay(start, end)) {
      return format(start, "dd/MM/yyyy", { locale: ptBR });
    }

    if (
      period === "mes" &&
      isSameMonth(start, end) &&
      isSameDay(start, startOfMonth(start)) &&
      isSameDay(end, endOfMonth(start))
    ) {
      return capitalizeText(format(start, "MMMM 'de' yyyy", { locale: ptBR }));
    }

    return `${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", {
      locale: ptBR,
    })}`;
  }

  if (period === "mes" && start) {
    return capitalizeText(format(start, "MMMM 'de' yyyy", { locale: ptBR }));
  }

  if (period === "dia" && start) {
    return format(start, "dd/MM/yyyy", { locale: ptBR });
  }

  if (start) {
    return `a partir de ${format(start, "dd/MM/yyyy", { locale: ptBR })}`;
  }

  if (end) {
    return `até ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;
  }

  return "Período selecionado no dashboard";
}

function formatLastUpdatedAt(value: Date | null) {
  if (!value) {
    return "--/--/---- --:--:--";
  }

  return format(value, "dd/MM/yyyy HH:mm:ss");
}

function HeroSection({
  brandName,
  periodLabel,
  lastUpdatedText,
  filteredCount,
  activeFilterCount,
  isRefreshing,
  onRefresh,
}: {
  brandName: string;
  periodLabel: string;
  lastUpdatedText: string;
  filteredCount: number;
  activeFilterCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-sky-100/80 dark:text-cyan-200/80">
            Detalhes da Bandeira
            <TooltipIcon text="Os filtros abaixo preservam o contexto da bandeira e atualizam os Big Numbers e a tabela detalhada no mesmo recorte de dados." />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Flag className="h-5 w-5 text-cyan-300" />
            <h1 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
              {brandName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-sky-100/80 dark:text-cyan-200/80">
            <span className={brandStatusChipClass}>Atualizado: {lastUpdatedText}</span>
            <span className={brandStatusChipClass}>
              {isRefreshing ? "Atualizando..." : "Pronto"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-sky-50/90 dark:text-cyan-50/90">
            <span className={brandStatusChipClass}>{periodLabel}</span>
            <span className={brandStatusChipClass}>
              {activeFilterCount.toLocaleString("pt-BR")} filtros ativos
            </span>
            <span className={brandStatusChipClass}>
              {filteredCount.toLocaleString("pt-BR")} registros
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            asChild
            variant="outline"
            className={cn("h-10 shrink-0 rounded-full px-4 text-xs font-medium", heroOutlineButtonClass)}
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao dashboard
            </Link>
          </Button>
          <Button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn("h-10 shrink-0 rounded-full px-4 text-xs font-medium", heroPrimaryButtonClass)}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>
    </section>
  );
}

function LoadingState({
  brandName,
  periodLabel,
}: {
  brandName: string;
  periodLabel: string;
}) {
  return (
    <div className="space-y-4">
      <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="h-3 w-40 animate-pulse rounded-full bg-white/20" />
            <div className="h-8 w-72 animate-pulse rounded-full bg-white/20" />
            <div className="space-y-2">
              <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/20" />
              <div className="h-4 w-5/6 max-w-xl animate-pulse rounded-full bg-white/20" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-6 w-40 animate-pulse rounded-full bg-white/20" />
              <div className="h-6 w-28 animate-pulse rounded-full bg-white/20" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-6 w-36 animate-pulse rounded-full bg-white/20" />
              <div className="h-6 w-40 animate-pulse rounded-full bg-white/20" />
              <div className="h-6 w-32 animate-pulse rounded-full bg-white/20" />
            </div>
            <p className="text-sm leading-6 text-sky-50/90">
              Estamos buscando as intenções de venda de {brandName} para {periodLabel}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="h-10 w-40 animate-pulse rounded-full bg-white/20" />
            <div className="h-10 w-32 animate-pulse rounded-full bg-cyan-300/20" />
          </div>
        </div>
      </section>

      <div className="sticky top-3 z-30 tablet:hidden">
        <div className="h-12 w-full animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
      </div>

      <section className={cn(themedPanelClass, "p-4")}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="h-5 w-72 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`filter-skeleton-${index}`}
              className={cn(themedSoftCardClass, "min-w-0 rounded-2xl p-2.5")}
            >
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </section>

      <BrandDetailsAnalyticsSkeleton />

      <section className="space-y-3">
        <div className={cn(themedCardClass, "overflow-hidden p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
              <div className="h-5 w-64 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`table-skeleton-${index}`}
                className="h-10 w-full animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10"
              />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

export function BrandDetailsClient({
  brandName,
  period,
  startDate,
  endDate,
}: BrandDetailsClientProps) {
  const initialStartDate = startDate ?? "";
  const initialEndDate = endDate ?? "";

  const [selectedStartDate, setSelectedStartDate] = useState(initialStartDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialEndDate);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [selectedTipoVenda, setSelectedTipoVenda] = useState<string[]>([]);
  const [selectedRegional, setSelectedRegional] = useState<string[]>([]);
  const [selectedLojaVenda, setSelectedLojaVenda] = useState<string[]>([]);
  const [selectedMarcaVeiculo, setSelectedMarcaVeiculo] = useState<string[]>([]);
  const [selectedVersao, setSelectedVersao] = useState<string[]>([]);
  const [selectedClassificacao, setSelectedClassificacao] = useState<string[]>([]);

  const query = useMemo(
    () => ({
      bandeira: brandName,
      ...(selectedStartDate ? { startDate: selectedStartDate } : {}),
      ...(selectedEndDate ? { endDate: selectedEndDate } : {}),
    }),
    [brandName, selectedEndDate, selectedStartDate],
  );

  const { items, isLoading, isRefreshing, error, lastUpdatedAt, refresh } =
    useSalesIntentions(query);

  const periodLabel = useMemo(
    () => formatPeriodLabel(period, selectedStartDate, selectedEndDate),
    [period, selectedEndDate, selectedStartDate],
  );

  const tipoVendaOptions = useMemo(
    () => sortUniqueOptions(items.map((item) => item.Tipo_Venda)),
    [items],
  );

  const regionalOptions = useMemo(
    () => sortUniqueOptions(items.map((item) => item.Regional)),
    [items],
  );

  const lojaVendaOptions = useMemo(
    () => sortUniqueOptions(items.map((item) => item.Loja_Venda)),
    [items],
  );

  const marcaVeiculoOptions = useMemo(
    () =>
      sortUniqueOptions(
        items.map((item) => normalizeOptionalValue(item.Marca_Veiculo, "Sem marca")),
      ),
    [items],
  );

  const versaoOptions = useMemo(
    () =>
      sortUniqueOptions(
        items.map((item) => normalizeOptionalValue(item.Versao, "Sem versão")),
      ),
    [items],
  );

  const classificacaoOptions = useMemo(
    () =>
      sortUniqueOptions(
        items.map((item) => normalizeOptionalValue(item.Classificacao, "Sem classificação")),
      ),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const itemTipoVenda = item.Tipo_Venda?.trim() ?? "";
        const itemRegional = item.Regional?.trim() ?? "";
        const itemLojaVenda = item.Loja_Venda?.trim() ?? "";
        const itemMarcaVeiculo = normalizeOptionalValue(item.Marca_Veiculo, "Sem marca");
        const itemVersao = normalizeOptionalValue(item.Versao, "Sem versão");
        const itemClassificacao = normalizeOptionalValue(
          item.Classificacao,
          "Sem classificação",
        );

        return (
          matchesSelectedValues(selectedTipoVenda, itemTipoVenda) &&
          matchesSelectedValues(selectedRegional, itemRegional) &&
          matchesSelectedValues(selectedLojaVenda, itemLojaVenda) &&
          matchesSelectedValues(selectedMarcaVeiculo, itemMarcaVeiculo) &&
          matchesSelectedValues(selectedVersao, itemVersao) &&
          matchesSelectedValues(selectedClassificacao, itemClassificacao)
        );
      }),
    [
      items,
      selectedClassificacao,
      selectedLojaVenda,
      selectedMarcaVeiculo,
      selectedRegional,
      selectedTipoVenda,
      selectedVersao,
    ],
  );

  const activeFilterCount =
    selectedTipoVenda.length +
    selectedRegional.length +
    selectedLojaVenda.length +
    selectedMarcaVeiculo.length +
    selectedVersao.length +
    selectedClassificacao.length +
    (selectedStartDate !== initialStartDate || selectedEndDate !== initialEndDate ? 1 : 0);

  const lastUpdatedText = formatLastUpdatedAt(lastUpdatedAt);
  const exportFilePrefix = `detalhes-bandeira-${brandNameToSlug(brandName)}`;
  const clearFilters = () => {
    setSelectedTipoVenda([]);
    setSelectedRegional([]);
    setSelectedLojaVenda([]);
    setSelectedMarcaVeiculo([]);
    setSelectedVersao([]);
    setSelectedClassificacao([]);
    setSelectedStartDate(initialStartDate);
    setSelectedEndDate(initialEndDate);
    setIsMobileFiltersOpen(false);
  };

  if (error) {
    return (
      <main
        className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}
      >
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
          <HeroSection
            brandName={brandName}
            periodLabel={periodLabel}
            lastUpdatedText={lastUpdatedText}
            filteredCount={filteredItems.length}
            activeFilterCount={activeFilterCount}
            isRefreshing={isRefreshing}
            onRefresh={() => void refresh()}
          />

          <ReportErrorCard
            label="Falha ao carregar a bandeira"
            title="Não conseguimos carregar os detalhes agora"
            message={error}
            onRetry={() => void refresh()}
            isRetrying={isRefreshing}
          />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main
        className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}
      >
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
          <LoadingState brandName={brandName} periodLabel={periodLabel} />
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}
    >
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <HeroSection
          brandName={brandName}
          periodLabel={periodLabel}
          lastUpdatedText={lastUpdatedText}
          filteredCount={filteredItems.length}
          activeFilterCount={activeFilterCount}
          isRefreshing={isRefreshing}
          onRefresh={() => void refresh({ silent: true })}
        />

        <div className="sticky top-3 z-30 tablet:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="brand-filters-panel"
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
          id="brand-filters-panel"
          className={cn(themedPanelClass, "p-4", isMobileFiltersOpen ? "block" : "hidden tablet:block")}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className={cn("text-base font-medium tracking-[-0.02em]", themedTextTitleClass)}>
                  Filtros
                </h2>
                <TooltipIcon text="Use tipo de venda, regional, loja, marca, versão, classificação e período para refinar o recorte. A bandeira da rota permanece fixa nesta visão." />
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

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FilterSelectCard
              label="Tipo de venda"
              value={selectedTipoVenda}
              options={tipoVendaOptions}
              onChange={setSelectedTipoVenda}
              tooltip="Filtro aplicado por tipo de venda."
              disabled={isLoading}
              formatLabel={formatTipoVendaLabel}
            />
            <FilterSelectCard
              label="Regional"
              value={selectedRegional}
              options={regionalOptions}
              onChange={setSelectedRegional}
              tooltip="Filtro aplicado por regional."
              disabled={isLoading}
            />
            <FilterSelectCard
              label="Loja de venda"
              value={selectedLojaVenda}
              options={lojaVendaOptions}
              onChange={setSelectedLojaVenda}
              tooltip="Filtro aplicado por loja de venda."
              disabled={isLoading}
            />
            <FilterSelectCard
              label="Marca veículo"
              value={selectedMarcaVeiculo}
              options={marcaVeiculoOptions}
              onChange={setSelectedMarcaVeiculo}
              tooltip="Filtro aplicado por marca do veículo."
              disabled={isLoading}
            />
            <FilterSelectCard
              label="Versão"
              value={selectedVersao}
              options={versaoOptions}
              onChange={setSelectedVersao}
              tooltip="Filtro aplicado por versão."
              disabled={isLoading}
            />
            <FilterSelectCard
              label="Classificação"
              value={selectedClassificacao}
              options={classificacaoOptions}
              onChange={setSelectedClassificacao}
              tooltip="Filtro aplicado por classificação."
              disabled={isLoading}
            />

            <div className={cn(themedSoftCardClass, "rounded-2xl p-2.5 sm:col-span-2 xl:col-span-2")}>
              <div className="flex items-center gap-1.5">
                <p className={cn(themedTinyLabelClass, "tracking-[0.18em]")}>Período</p>
                <TooltipIcon text="Filtro aplicado por período da solicitação." />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="sr-only">De</span>
                  <input
                    type="date"
                    max={selectedEndDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={selectedStartDate}
                    onChange={(event) => setSelectedStartDate(event.target.value)}
                  />
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Até</span>
                  <input
                    type="date"
                    min={selectedStartDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={selectedEndDate}
                    onChange={(event) => setSelectedEndDate(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <BrandDetailsAnalyticsSection
          items={filteredItems}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
        />

        <section className="space-y-3">
          <SalesIntentionDataList
            items={filteredItems}
            exportFilePrefix={exportFilePrefix}
            className="max-w-full"
          />
        </section>
      </div>
    </main>
  );
}
