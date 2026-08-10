"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";
import { updateSalesIntention } from "@/lib/salesIntentionApi";
import { cn } from "@/lib/utils";

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
  const [editableItems, setEditableItems] = useState<SalesIntentionReportRow[]>(items);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState({
    Quantidade: "",
    Data_solicitacao: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [justSavedRowId, setJustSavedRowId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    item: SalesIntentionReportRow | null;
    payload: Partial<Pick<SalesIntentionReportRow, "Quantidade" | "Data_solicitacao">>;
    message: string;
  }>({
    open: false,
    item: null,
    payload: {},
    message: "",
  });
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  const sortedItems = useMemo(() => {
    if (!sortKey) {
      return editableItems;
    }

    const nextItems = [...editableItems];

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
  }, [editableItems, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setEditableItems(items);
  }, [items]);

  useEffect(() => {
    setCurrentPage(1);
  }, [items, itemsPerPage]);

  useEffect(() => {
    if (justSavedRowId === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setJustSavedRowId(null);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [justSavedRowId]);

  useEffect(() => {
    const modalOpen = confirmModal.open || alertModal.open;
    const originalOverflow = document.body.style.overflow;

    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [confirmModal.open, alertModal.open]);

  const currentPageItems = useMemo(
    () => sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [currentPage, itemsPerPage, sortedItems],
  );

  function toInputDate(value: string) {
    const [day, month, year] = value.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  function toDisplayDate(value: string) {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }

  function startEditing(item: SalesIntentionReportRow) {
    setEditRowId(item.ID);
    setEditingValues({
      Quantidade: item.Quantidade,
      Data_solicitacao: toInputDate(item.Data_solicitacao),
    });
  }

  function cancelEditing() {
    setEditRowId(null);
  }

  function saveEditing(item: SalesIntentionReportRow) {
    const payload: Partial<Pick<SalesIntentionReportRow, 'Quantidade' | 'Data_solicitacao'>> = {};
    if (editingValues.Quantidade !== item.Quantidade) {
      payload.Quantidade = editingValues.Quantidade;
    }
    if (editingValues.Data_solicitacao && toDisplayDate(editingValues.Data_solicitacao) !== item.Data_solicitacao) {
      payload.Data_solicitacao = toDisplayDate(editingValues.Data_solicitacao);
    }

    if (Object.keys(payload).length === 0) {
      cancelEditing();
      return;
    }

    setConfirmModal({
      open: true,
      item,
      payload,
      message: `Deseja salvar a edição do registro ${item.ID}?`,
    });
  }

  function closeConfirmModal() {
    setConfirmModal({
      open: false,
      item: null,
      payload: {},
      message: "",
    });
  }

  function closeAlertModal() {
    setAlertModal({
      open: false,
      title: "",
      message: "",
    });
  }

  async function confirmEditSave() {
    const item = confirmModal.item;
    if (!item) {
      closeConfirmModal();
      return;
    }

    setIsSaving(true);
    try {
      const updatedRow = await updateSalesIntention(item.ID, {
        quantidade: confirmModal.payload.Quantidade ? Number(confirmModal.payload.Quantidade) : undefined,
        dataSolicitacao: confirmModal.payload.Data_solicitacao,
      });

      setEditableItems((current) =>
        current.map((row) => (row.ID === item.ID ? updatedRow : row)),
      );
      cancelEditing();
      setJustSavedRowId(item.ID);
      closeConfirmModal();
    } catch (error) {
      setAlertModal({
        open: true,
        title: "Erro ao salvar",
        message: "Não foi possível salvar a edição. Tente novamente.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const exportToExcel = () => {
    const headers = REPORT_COLUMNS;
    const rows = editableItems.map((item) =>
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
      className={cn(
        "min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white/92 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.38)] backdrop-blur",
        className,
      )}
    >
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
              Tabela detalhada
            </p>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
              Lista de dados
            </h2>
            <p className="text-sm text-slate-500">
              Exibindo {currentPageItems.length} de {sortedItems.length} registros filtrados
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
              <span className="font-medium">Itens por página</span>
              <select
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
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
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
              Página {currentPage} de {totalPages}
            </div>
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="h-10 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Baixar Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-slate-50/80">
            <tr>
              {REPORT_COLUMNS.map((key) => (
                <th
                  key={key}
                  className="border-b border-slate-200 px-3 py-3 text-left font-semibold text-slate-500"
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
                    className="inline-flex w-full items-center justify-between gap-2 text-left text-slate-500 transition hover:text-slate-900 focus:outline-none"
                    title={`Ordenar por ${key}`}
                  >
                    <span>{key}</span>
                    <span className="text-[0.65rem] font-bold">
                      {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </button>
                </th>
              ))}
              <th className="border-b border-slate-200 px-3 py-3 text-left font-semibold text-slate-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {currentPageItems.map((item, rowIndex) => {
              const isEditing = editRowId === item.ID;

              return (
                <tr
                  key={`row-${(currentPage - 1) * itemsPerPage + rowIndex}`}
                  className={cn(
                    "transition-colors duration-500",
                    isEditing
                      ? "bg-sky-50/80"
                      : justSavedRowId === item.ID
                      ? "bg-emerald-50/90"
                      : "odd:bg-white even:bg-slate-50/40 hover:bg-slate-50/80"
                  )}
                >
                  {REPORT_COLUMNS.map((key) => {
                    const raw = String(item[key] ?? "");
                    const display =
                      key === "Marca_Veiculo" || key === "Versao" ? normalizeLabel(raw) : raw;
                    const isDateField = key === "Data_solicitacao";
                    const isQuantityField = key === "Quantidade";

                    return (
                      <td key={`${rowIndex}-${key}`} className="border-b border-slate-100 px-3 py-2.5 text-slate-700">
                        {isEditing && isQuantityField ? (
                          <input
                            type="number"
                            min={0}
                            value={editingValues.Quantidade}
                            onChange={(event) =>
                              setEditingValues((current) => ({
                                ...current,
                                Quantidade: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        ) : isEditing && isDateField ? (
                          <input
                            type="date"
                            value={editingValues.Data_solicitacao}
                            onChange={(event) =>
                              setEditingValues((current) => ({
                                ...current,
                                Data_solicitacao: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        ) : (
                          display
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-slate-100 px-3 py-2.5 text-slate-700">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEditing}
                          title="Cancelar edição"
                          aria-label="Cancelar edição"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => saveEditing(item)}
                          disabled={isSaving}
                          title="Salvar edição"
                          aria-label="Salvar edição"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(item)}
                        title="Editar registro"
                        aria-label="Editar registro"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-4 text-xs text-slate-500 sm:px-5">
        <div>
          {sortedItems.length === 0
            ? "Nenhum registro encontrado."
            : `Mostrando ${currentPageItems.length} registros nesta página.`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Próxima
          </button>
        </div>
      </div>
      {confirmModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950/60 px-4 py-6">
            <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">Confirmar edição</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button variant="secondary" size="sm" onClick={closeConfirmModal}>
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => void confirmEditSave()}
                  disabled={isSaving}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {alertModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950/60 px-4 py-6">
            <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{alertModal.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {alertModal.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="default" size="sm" onClick={closeAlertModal}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
