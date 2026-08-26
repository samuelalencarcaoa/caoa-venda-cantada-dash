"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Database,
  Flag,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { ReportErrorCard } from "@/components/report-error-card";
import { Button } from "@/components/ui/button";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import type { DashboardPeriod } from "@/lib/brand-routing";
import { cn } from "@/lib/utils";
import {
  themedCardClass,
  themedChipClass,
  themedHeroClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";

type BrandDetailsClientProps = {
  brandName: string;
  period?: DashboardPeriod | null;
  startDate?: string;
  endDate?: string;
};

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

function formatPeriodLabel(period?: DashboardPeriod | null, startDate?: string, endDate?: string) {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);

  if (period === "mes" && start) {
    return capitalizeText(format(start, "MMMM 'de' yyyy", { locale: ptBR }));
  }

  if (period === "dia" && start) {
    return format(start, "dd/MM/yyyy", { locale: ptBR });
  }

  if (start && end) {
    const formattedStart = format(start, "dd/MM/yyyy", { locale: ptBR });
    const formattedEnd = format(end, "dd/MM/yyyy", { locale: ptBR });

    if (formattedStart === formattedEnd) {
      return formattedStart;
    }

    return `${formattedStart} a ${formattedEnd}`;
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

function DetailStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className={cn(themedSoftCardClass, "min-w-0 p-4")}>
      <p className={cn(themedTinyLabelClass, "truncate tracking-[0.28em]")}>{label}</p>
      <p className={cn("mt-2 text-lg font-semibold leading-6", themedTextTitleClass)}>{value}</p>
      <p className={cn("mt-1 text-sm leading-6", themedTextBodyClass)}>{helper}</p>
    </div>
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
    <section className={cn(themedPanelClass, "p-5 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-7 w-64 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className={cn(themedSoftCardClass, "p-4")}>
          <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-3 h-6 w-40 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
        <div className={cn(themedSoftCardClass, "p-4")}>
          <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-3 h-6 w-48 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
        <div className={cn(themedSoftCardClass, "p-4")}>
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-3 h-6 w-44 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="h-5 w-64 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className={cn(themedSoftCardClass, "p-4")}>
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-3 h-6 w-16 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className={cn(themedSoftCardClass, "p-4")}>
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-3 h-6 w-20 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className={cn(themedSoftCardClass, "p-4")}>
            <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-3 h-6 w-32 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>Carregando consulta</p>
            <p className={cn("mt-1 text-sm", themedTextBodyClass)}>
              Estamos buscando as intenções de venda de {brandName} para {periodLabel}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandDetailsClient({
  brandName,
  period,
  startDate,
  endDate,
}: BrandDetailsClientProps) {
  const query = useMemo(
    () => ({
      bandeira: brandName,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }),
    [brandName, endDate, startDate],
  );

  const {
    items,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  } = useSalesIntentions(query);

  const periodLabel = useMemo(
    () => formatPeriodLabel(period, startDate, endDate),
    [endDate, period, startDate],
  );

  const totalQuantity = useMemo(
    () =>
      items.reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0),
    [items],
  );

  const lastUpdatedText = formatLastUpdatedAt(lastUpdatedAt);

  return (
    <main className={cn("min-h-[100dvh] overflow-x-hidden", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <section className={cn(themedHeroClass, "px-5 py-5 sm:px-6 sm:py-6")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
                Detalhes da Bandeira
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Flag className="h-5 w-5 text-cyan-300" />
                <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {brandName}
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-sky-50/90">
                Esta tela consulta a rota dinâmica da bandeira e preserva o período atual do dashboard
                na URL para garantir acesso direto e repetível.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao dashboard
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() => void refresh({ silent: true })}
                disabled={isRefreshing}
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Atualizando" : "Atualizar"}
              </Button>
            </div>
          </div>
        </section>

        <section className={cn(themedPanelClass, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>Consulta ativa</p>
              <h2 className={cn("text-xl font-semibold tracking-[-0.03em]", themedTextTitleClass)}>
                Filtros enviados para a API
              </h2>
            </div>
            <span className={cn(themedChipClass, "px-3 py-1.5")}>
              {isLoading ? "Carregando..." : `${items.length.toLocaleString("pt-BR")} intenções`}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DetailStat
              label="Bandeira"
              value={brandName}
              helper="Identificador obtido diretamente da rota dinâmica."
            />
            <DetailStat
              label="Período"
              value={periodLabel}
              helper="Recorte preservado na navegação para consulta direta."
            />
            <DetailStat
              label="Endpoint"
              value="/sales-intentions/search"
              helper="A pesquisa utiliza a mesma integração do dashboard."
            />
          </div>
        </section>

        {error ? (
          <ReportErrorCard
            label="Falha ao carregar a bandeira"
            title="Não conseguimos carregar os detalhes agora"
            message={error}
            onRetry={() => void refresh()}
            isRetrying={isRefreshing}
          />
        ) : isLoading ? (
          <LoadingState brandName={brandName} periodLabel={periodLabel} />
        ) : items.length === 0 ? (
          <section className={cn(themedPanelClass, "p-6 sm:p-8")}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <p className={cn(themedTinyLabelClass, "tracking-[0.32em] text-cyan-600 dark:text-cyan-300")}>
                  Nenhum resultado
                </p>
                <h2 className={cn("text-2xl font-semibold tracking-[-0.04em]", themedTextTitleClass)}>
                  Não encontramos intenções de venda para esta bandeira
                </h2>
                <p className={cn("max-w-2xl text-sm leading-6", themedTextBodyClass)}>
                  A consulta retornou zero registros para {brandName} no período {periodLabel}.
                  Você pode tentar novamente ou voltar ao painel para escolher outro recorte.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-500 dark:text-amber-300">
                <Database className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => void refresh({ silent: true })}>
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Tentar novamente
              </Button>
              <Button asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao dashboard
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          <section className={cn(themedCardClass, "p-5 sm:p-6")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className={cn(themedTinyLabelClass, "tracking-[0.32em]")}>Resultado da consulta</p>
                <h2 className={cn("text-2xl font-semibold tracking-[-0.04em]", themedTextTitleClass)}>
                  Consulta concluída com sucesso
                </h2>
                <p className={cn("max-w-2xl text-sm leading-6", themedTextBodyClass)}>
                  Os registros foram carregados e já estão prontos para serem usados na construção da
                  próxima visão detalhada da bandeira.
                </p>
              </div>
              <span className={cn(themedChipClass, "px-3 py-1.5")}>
                {items.length.toLocaleString("pt-BR")} registros
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <DetailStat
                label="Registros encontrados"
                value={items.length.toLocaleString("pt-BR")}
                helper="Quantidade de intenções retornadas pela pesquisa."
              />
              <DetailStat
                label="Quantidade total"
                value={totalQuantity.toLocaleString("pt-BR")}
                helper="Soma da coluna Quantidade em todos os registros."
              />
              <DetailStat
                label="Última atualização"
                value={lastUpdatedText}
                helper="Momento da última resposta recebida da API."
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
