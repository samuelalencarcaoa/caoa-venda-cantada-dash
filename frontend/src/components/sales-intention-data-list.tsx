"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";

const REPORT_COLUMNS: Array<keyof SalesIntentionReportRow> = [
  "ID",
  "Proprietario",
  "Tipo_Venda",
  "Bandeira",
  "Loja_Venda",
  "Marca_Veiculo",
  "Versao",
  "Classificacao",
  "Quantidade",
  "Data_solicitacao",
  "Placa",
  "Regional",
  "Criado",
];

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compareValue(value: unknown) {
  const raw = String(value ?? "").trim();
  const numeric = Number(raw.replace(/[.,]/g, ""));

  if (raw && !Number.isNaN(numeric)) {
    return numeric;
  }

  return normalizeLabel(raw);
}

type SalesIntentionDataListProps = {
  items: SalesIntentionReportRow[];
  exportFilePrefix?: string;
  className?: string;
};

export function SalesIntentionDataList({
  items,
  exportFilePrefix = "lista-dados",
  className = "",
}: SalesIntentionDataListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortKey, setSortKey] = useState<keyof SalesIntentionReportRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedItems = useMemo(() => {
    if (!sortKey) {
      return items;
    }

    const nextItems = [...items];

    nextItems.sort((a, b) => {
      const aVal = compareValue(a[sortKey]);
      const bVal = compareValue(b[sortKey]);

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal), "pt-BR", { sensitivity: "base" })
        : String(bVal).localeCompare(String(aVal), "pt-BR", { sensitivity: "base" });
    });

    return nextItems;
  }, [items, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [items, itemsPerPage]);

  const currentPageItems = useMemo(
    () => sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [currentPage, itemsPerPage, sortedItems],
  );

  const exportToExcel = () => {
    const headers = REPORT_COLUMNS;
    const rows = items.map((item) =>
      headers.map((header) => escapeHtml(item[header] ?? "")),
    );

    const table = [headers, ...rows]
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilePrefix}-${format(new Date(), "yyyyMMdd_HHmmss")}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-3 text-foreground shadow-sm ${className}`}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Lista de dados</h2>
          <p className="text-xs text-muted-foreground">
            Exibindo {currentPageItems.length} de {sortedItems.length} registros filtrados
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs">
            <span>Itens por página:</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={itemsPerPage}
              onChange={(event) => setItemsPerPage(Number(event.target.value))}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <Button variant="outline" onClick={exportToExcel} className="h-8 text-xs">
            Baixar Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              {REPORT_COLUMNS.map((key) => (
                <th
                  key={key}
                  className="border-b border-border bg-background px-2 py-2 text-left font-medium text-muted-foreground"
                  aria-sort={
                    sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === key) {
                        setSortDir((current) => (current === "asc" ? "desc" : "asc"));
                        return;
                      }

                      setSortKey(key);
                      setSortDir("asc");
                    }}
                    className="inline-flex w-full items-center justify-between gap-2 text-left text-muted-foreground transition hover:text-primary focus:outline-none"
                    title={`Ordenar por ${key}`}
                  >
                    <span>{key}</span>
                    <span className="text-[0.65rem]">
                      {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {currentPageItems.map((item, rowIndex) => (
              <tr key={`row-${(currentPage - 1) * itemsPerPage + rowIndex}`} className="odd:bg-card">
                {REPORT_COLUMNS.map((key) => {
                  const raw = String(item[key] ?? "");
                  const display =
                    key === "Marca_Veiculo" || key === "Versao" ? normalizeLabel(raw) : raw;

                  return (
                    <td key={`${rowIndex}-${key}`} className="border-b border-border px-2 py-2">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          {sortedItems.length === 0
            ? "Nenhum registro encontrado."
            : `Mostrando ${currentPageItems.length} registros nesta página.`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-border bg-background px-3 py-1 text-xs transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-background px-3 py-1 text-xs transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
