"use client";

import { useEffect, useMemo, useState } from "react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec } from "@visactor/vchart";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { Button } from "@/components/ui/button";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { format } from "date-fns";

const parseDate = (dateString: string): Date => {
  const [day, month, year] = dateString.split("/");
  return new Date(`${year}-${month}-${day}`);
};

export default function MarcaVeiculoRelatorioPage() {
  const { items: enhancedSalesIntention, isLoading: apiLoading, error } = useSalesIntentions();
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["Todos"]);
  const [selectedStores, setSelectedStores] = useState<string[]>(["Todos"]);
  const [selectedSalesTypes, setSelectedSalesTypes] = useState<string[]>(["Todos"]);
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>(["Todos"]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["Todos"]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [chartError, setChartError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Move all hooks BEFORE conditional returns
  const regionOptions = useMemo(() => {
    const opts = Array.from(new Set(enhancedSalesIntention.map((item) => item.Regional))).filter(
      Boolean,
    );
    opts.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return ["Todos", ...opts];
  }, [enhancedSalesIntention]);

  const storeOptions = useMemo(() => {
    const opts = Array.from(new Set(enhancedSalesIntention.map((item) => item.Loja_Venda))).filter(
      Boolean,
    );
    opts.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return ["Todos", ...opts];
  }, [enhancedSalesIntention]);

  const salesTypeOptions = useMemo(() => {
    const opts = Array.from(new Set(enhancedSalesIntention.map((item) => item.Tipo_Venda))).filter(
      Boolean,
    );
    opts.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return ["Todos", ...opts];
  }, [enhancedSalesIntention]);

  const classificationOptions = useMemo(() => {
    const opts = Array.from(new Set(enhancedSalesIntention.map((item) => item.Classificacao))).filter(
      Boolean,
    );
    opts.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return ["Todos", ...opts];
  }, [enhancedSalesIntention]);

  const brandOptions = useMemo(() => {
    const opts = Array.from(
      new Set(enhancedSalesIntention.map((item) => item.Marca_Veiculo || "Sem Marca")),
    ).filter(Boolean);
    opts.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return ["Todos", ...opts];
  }, [enhancedSalesIntention]);

  const lastUpdatedText = lastUpdated ? format(lastUpdated, "dd/MM/yyyy HH:mm:ss") : "Carregando...";

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const parseMultiSelectValue = (
    selectedOptions: HTMLCollectionOf<HTMLOptionElement>,
  ) => {
    const values = Array.from(selectedOptions).map((option) => option.value);
    return values.includes("Todos") || values.length === 0 ? ["Todos"] : values;
  };

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) => {
        const matchesRegion =
          selectedRegions.includes("Todos") || selectedRegions.includes(item.Regional);
        const matchesStore =
          selectedStores.includes("Todos") || selectedStores.includes(item.Loja_Venda);
        const matchesSalesType =
          selectedSalesTypes.includes("Todos") || selectedSalesTypes.includes(item.Tipo_Venda);
        const matchesClassification =
          selectedClassifications.includes("Todos") ||
          selectedClassifications.includes(item.Classificacao);
        const matchesBrand =
          selectedBrands.includes("Todos") ||
          selectedBrands.includes(item.Marca_Veiculo || "Sem Marca");

        let matchesDateRange = true;
        if (startDate || endDate) {
          const itemDate = parseDate(item.Data_solicitacao);
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) matchesDateRange = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) matchesDateRange = false;
          }
        }

        return (
          matchesRegion &&
          matchesStore &&
          matchesSalesType &&
          matchesClassification &&
          matchesBrand &&
          matchesDateRange
        );
      }),
    [
      enhancedSalesIntention,
      selectedRegions,
      selectedStores,
      selectedSalesTypes,
      selectedClassifications,
      selectedBrands,
      startDate,
      endDate,
    ],
  );

  const totalProposals = filteredItems.reduce(
    (sum, item) => sum + (Number(item.Quantidade) || 0),
    0,
  );

  const totalApproved = filteredItems.reduce((sum, item) => {
    const quantity = Number(item.Quantidade) || 0;
    const classification = item.Classificacao?.toString().toLowerCase() || "";
    const isRejected =
      classification.includes("reprov") ||
      classification.includes("cancel") ||
      classification.includes("negado");
    return sum + (isRejected ? 0 : quantity);
  }, 0);

  const totalRejected = totalProposals - totalApproved;

  const brandData = useMemo(() => {
    const grouped = new Map<string, { marca: string; count: number }>();

    filteredItems.forEach((item) => {
      const marca = item.Marca_Veiculo || "Sem Marca";
      const quantity = Number(item.Quantidade) || 0;
      const previous = grouped.get(marca);

      if (previous) {
        grouped.set(marca, {
          ...previous,
          count: previous.count + quantity,
        });
      } else {
        grouped.set(marca, {
          marca,
          count: quantity,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }, [filteredItems]);

  const brandChartData = useMemo(() => brandData, [brandData]);

  const brandChartSpec = useMemo<IBarChartSpec>(() => ({
    type: "bar",
    data: [
      {
        id: "marcaPropostas",
        values: brandChartData,
      },
    ],
    direction: "vertical",
    xField: "marca",
    yField: "count",
    seriesField: "marca",
    stack: false,
    padding: [20, 20, 20, 20],
    color: [
      "#38bdf8",
      "#60a5fa",
      "#818cf8",
      "#a78bfa",
      "#f472b6",
      "#fb7185",
      "#f97316",
      "#f59e0b",
      "#a3e635",
      "#4ade80",
      "#22c55e",
      "#14b8a6",
      "#0ea5e9",
      "#3b82f6",
      "#6366f1",
    ],
    axis: {
      xAxis: {
        label: {
          rotate: 45,
          textAlign: "right",
          textBaseline: "middle",
          maxWidth: 120,
          overflow: "ellipsis",
        },
      },
      yAxis: {
        label: {
          formatter: (value: string | number) => String(value),
        },
      },
    },
    tooltip: {
      trigger: ["hover", "click"],
    },
    legends: {
      visible: false,
    },
    bar: {
      style: {
        cornerRadius: [8, 8, 0, 0],
      },
    },
  }), [brandChartData]);

  const brandChartKey = useMemo(() => JSON.stringify(brandChartSpec), [brandChartSpec]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [
    selectedRegions,
    selectedStores,
    selectedSalesTypes,
    selectedClassifications,
    selectedBrands,
    startDate,
    endDate,
    refreshTick,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsLoading(true);
      setRefreshTick((tick) => tick + 1);
      setLastUpdated(new Date());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  if (apiLoading) {
    return (
      <section className="min-h-[70vh] space-y-6 py-6">
        <div className="h-16 animate-pulse rounded-3xl border border-border bg-card" />

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted/60" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-2xl border border-border/70 p-3">
                <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
                <div className="h-7 w-16 animate-pulse rounded bg-muted/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted/60" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, barIndex) => (
                  <div key={barIndex} className="flex items-center gap-2">
                    <div className="h-3 flex-1 animate-pulse rounded bg-muted/50" />
                    <div className="h-3 w-10 animate-pulse rounded bg-muted/50" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="p-8 text-center">
        <p className="text-base text-red-600">Erro ao carregar dados: {error}</p>
      </section>
    );
  }




  const exportToExcel = () => {
    // Build a set of all keys present in the salesIntention dataset
    const allKeys = new Set<string>();
    enhancedSalesIntention.forEach((row) => Object.keys(row || {}).forEach((k) => allKeys.add(k)));

    // Preserve the key order from the first row when possible, then append any additional keys alphabetically
    const firstRow = enhancedSalesIntention[0] || {};
    const firstKeys = Object.keys(firstRow);
    const remainingKeys = Array.from(allKeys).filter((k) => !firstKeys.includes(k)).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
    );
    const headers = [...firstKeys, ...remainingKeys];

    // Build rows in the same header order using the currently filtered items
    const rows = filteredItems.map((item) => headers.map((h) => ((item as Record<string, unknown>)[h] ?? "")));

    const table = [headers, ...rows]
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${String(cell ?? "")}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-marca-${format(new Date(), "yyyyMMdd_HHmmss")}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="relative space-y-4 py-4 overflow-hidden">
      <div className="min-w-0 flex flex-col gap-2 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Nova rota de relatórios</p>
          <h1 className="text-xl font-semibold">Visão global por Marca de Veículo</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Última atualização: {lastUpdatedText} {isLoading && <span className="ml-2 inline-block animate-pulse">●</span>}
          </p>
        </div>
      </div>

      <div className="min-w-0 rounded-3xl border border-border bg-card p-2 shadow-sm">
        <div className="mb-1.5 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-0.5 text-xl font-semibold">{totalProposals}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2">
            <p className="text-xs text-muted-foreground">Aprovadas</p>
            <p className="mt-0.5 text-xl font-semibold">{totalApproved}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2">
            <p className="text-xs text-muted-foreground">Reprovadas</p>
            <p className="mt-0.5 text-xl font-semibold">{totalRejected}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2">
            <p className="text-xs text-muted-foreground">Lojas</p>
            <p className="mt-0.5 text-xl font-semibold">{new Set(filteredItems.map((item) => item.Loja_Venda)).size}</p>
          </div>
        </div>

        <div className="grid gap-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">Região</span>
            <select
              multiple
              size={3}
              className="w-full min-h-[70px] rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={selectedRegions}
              onChange={(event) => setSelectedRegions(parseMultiSelectValue(event.target.selectedOptions))}
            >
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region || "Sem regional"}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">Loja</span>
            <select
              multiple
              size={3}
              className="w-full min-h-[70px] rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={selectedStores}
              onChange={(event) => setSelectedStores(parseMultiSelectValue(event.target.selectedOptions))}
            >
              {storeOptions.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">Tipo de Venda</span>
            <select
              multiple
              size={3}
              className="w-full min-h-[70px] rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={selectedSalesTypes}
              onChange={(event) => setSelectedSalesTypes(parseMultiSelectValue(event.target.selectedOptions))}
            >
              {salesTypeOptions.map((salesType) => (
                <option key={salesType} value={salesType}>
                  {salesType}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">Classificação</span>
            <select
              multiple
              size={3}
              className="w-full min-h-[70px] rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={selectedClassifications}
              onChange={(event) => setSelectedClassifications(parseMultiSelectValue(event.target.selectedOptions))}
            >
              {classificationOptions.map((classification) => (
                <option key={classification} value={classification}>
                  {classification}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">Marca</span>
            <select
              multiple
              size={3}
              className="w-full min-h-[70px] rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={selectedBrands}
              onChange={(event) => setSelectedBrands(parseMultiSelectValue(event.target.selectedOptions))}
            >
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">De</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="min-w-0 space-y-0.5">
            <span className="text-xs font-medium">Até</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Propostas por Marca</h2>
            <p className="text-xs text-muted-foreground">
              Top marcas no período filtrado ({brandChartData.length} marcas)
            </p>
          </div>

          <Button variant="default" onClick={exportToExcel} className="h-8 text-xs">
            Exportar Excel
          </Button>
        </div>

        <div className="h-[400px] w-full overflow-hidden">
          {chartError && (
            <div className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
              Erro: {chartError}
            </div>
          )}
          <VChart
            key={brandChartKey}
            spec={brandChartSpec}
            onError={(err) => {
              // eslint-disable-next-line no-console
              console.error("VChart error:", err);
              setChartError(err ? String(err) : "Erro desconhecido");
            }}
          />
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-2">
          <h2 className="text-sm font-semibold">Instruções</h2>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            <li>• Use Ctrl/Cmd para selecionar múltiplas opções</li>
            <li>• Filtros de data aplicam automaticamente ao mudar</li>
            <li>• Gráfico mostra top 5 marcas + &quot;Outros&quot;</li>
            <li>• Exporte dados filtrados para Excel</li>
          </ul>
        </div>
      </div>

      <SalesIntentionDataList items={filteredItems} exportFilePrefix="relatorio-marca" />
    </section>
  );
}
