"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import {
  fetchSalesIntentionDrillDown,
  formatSalesIntentionApiError,
  type SalesIntentionDrillDownFilters,
  type SalesIntentionReportRow,
} from "@/lib/salesIntentionApi";
import { cn } from "@/lib/utils";
import { themedCardClass, themedTextMutedClass, themedTextTitleClass } from "@/lib/theme-classes";

export type DrillDownSelection = {
  chartTitle: string;
  dimensionLabel: string;
  value: string;
  aggregateValue?: number;
  filters: SalesIntentionDrillDownFilters;
};

type DrillDownModalProps = {
  selection: DrillDownSelection | null;
  onClose: () => void;
};

export function DrillDownModal({ selection, onClose }: DrillDownModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<SalesIntentionReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const totalQuantity = items.reduce((total, item) => total + (Number(item.Quantidade) || 0), 0);

  useEffect(() => {
    if (!selection) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setItems([]);
    closeButtonRef.current?.focus();

    void fetchSalesIntentionDrillDown(selection.filters, controller.signal)
      .then((records) => setItems(records))
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(formatSalesIntentionApiError(cause));
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, selection]);

  if (!selection) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end bg-slate-950/60 p-0 backdrop-blur-sm tablet:items-center tablet:justify-center tablet:p-6" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drill-down-title"
        className={cn(themedCardClass, "flex max-h-[94dvh] w-full flex-col rounded-b-none shadow-xl tablet:max-w-6xl tablet:rounded-2xl")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-white/10 sm:px-5">
          <div className="min-w-0 space-y-1">
            <p className={cn("text-xs", themedTextMutedClass)}>{selection.chartTitle}</p>
            <h2 id="drill-down-title" className={cn("truncate text-base font-normal", themedTextTitleClass)}>
              {selection.value}
            </h2>
            <p className={cn("text-xs", themedTextMutedClass)}>
              {isLoading
                ? "Carregando registros…"
                : `${items.length.toLocaleString("pt-BR")} registros · ${totalQuantity.toLocaleString("pt-BR")} volume`}
            </p>
          </div>
          <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar detalhes">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando registros…
            </div>
          ) : error ? (
            <p role="alert" className="py-12 text-center text-sm text-rose-600 dark:text-rose-300">Não foi possível carregar os registros. Tente novamente.</p>
          ) : items.length ? (
            <SalesIntentionDataList items={items} exportFilePrefix="drill-down-vendas-cantadas" className="w-full max-w-none" />
          ) : (
            <p className={cn("py-12 text-center text-sm", themedTextMutedClass)}>Nenhum registro encontrado para este recorte.</p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
