"use client";

import { format } from "date-fns";
import { Medal, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec, ILineChartSpec } from "@visactor/vchart";
import { Button } from "@/components/ui/button";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";

export default function VendedorRelatorioPage() {
  const {
    items: enhancedSalesIntention,
    isLoading: apiLoading,
    error,
  } = useSalesIntentions();
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [chartError, setChartError] = useState<string | null>(null);

  const itemsPerPage = 25;

  // Helper function (not a hook, safe to use anywhere)
  const parseDate = (dateString: string): Date => {
    const [day, month, year] = dateString.split("/");
    return new Date(`${year}-${month}-${day}`);
  };

  // Get unique vendors sorted by total quantity
  const vendorOptions = useMemo(() => {
    const vendorMap = new Map<string, { count: number; quantity: number }>();

    enhancedSalesIntention.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      const qty = Number(item.Quantidade) || 0;
      const current = vendorMap.get(vendor);

      if (current) {
        vendorMap.set(vendor, {
          count: current.count + 1,
          quantity: current.quantity + qty,
        });
      } else {
        vendorMap.set(vendor, { count: 1, quantity: qty });
      }
    });

    return Array.from(vendorMap.entries())
      .sort((a, b) =>
        a[0].localeCompare(b[0], "pt-BR", { sensitivity: "base" }),
      )
      .map(([vendor]) => vendor);
  }, [enhancedSalesIntention]);

  // Set first vendor as default
  useEffect(() => {
    if (vendorOptions.length > 0 && !selectedVendor) {
      setSelectedVendor(vendorOptions[0]);
    }
  }, [vendorOptions, selectedVendor]);

  // Filter items by selected vendor and date range
  const filteredItems = useMemo(() => {
    return enhancedSalesIntention.filter((item) => {
      const matchesVendor =
        !selectedVendor || item.Proprietario === selectedVendor;

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

      return matchesVendor && matchesDateRange;
    });
  }, [enhancedSalesIntention, selectedVendor, startDate, endDate]);

  // Vendor ranking data
  const vendorRanking = useMemo(() => {
    const vendorMap = new Map<
      string,
      { proposals: number; quantity: number; avgPerProposal: number }
    >();

    enhancedSalesIntention.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      const qty = Number(item.Quantidade) || 0;
      const current = vendorMap.get(vendor);

      if (current) {
        vendorMap.set(vendor, {
          proposals: current.proposals + 1,
          quantity: current.quantity + qty,
          avgPerProposal: 0,
        });
      } else {
        vendorMap.set(vendor, {
          proposals: 1,
          quantity: qty,
          avgPerProposal: 0,
        });
      }
    });

    return Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({
        vendor,
        proposals: data.proposals,
        quantity: data.quantity,
        avgPerProposal: Number((data.quantity / data.proposals).toFixed(2)),
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [enhancedSalesIntention]);

  // Brands for selected vendor
  const brandData = useMemo(() => {
    const brandMap = new Map<string, number>();

    filteredItems.forEach((item) => {
      const brand = item.Marca_Veiculo || "Sem marca";
      const qty = Number(item.Quantidade) || 0;
      brandMap.set(brand, (brandMap.get(brand) || 0) + qty);
    });

    return Array.from(brandMap.entries())
      .map(([brand, quantity]) => ({ brand, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredItems]);

  // Versions for selected vendor
  const versionData = useMemo(() => {
    const versionMap = new Map<string, number>();

    filteredItems.forEach((item) => {
      const version = item.Versao || "Sem versão";
      const qty = Number(item.Quantidade) || 0;
      versionMap.set(version, (versionMap.get(version) || 0) + qty);
    });

    return Array.from(versionMap.entries())
      .map(([version, quantity]) => ({ version, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredItems]);

  const brandChartData = useMemo(() => brandData, [brandData]);

  const brandChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "brandSales",
          values: brandChartData,
        },
      ],
      direction: "vertical",
      xField: "brand",
      yField: "quantity",
      seriesField: "brand",
      stack: false,
      padding: [20, 20, 20, 20],
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
    }),
    [brandChartData],
  );

  const versionChartData = useMemo(() => versionData, [versionData]);

  const versionChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "versionSales",
          values: versionChartData,
        },
      ],
      direction: "vertical",
      xField: "version",
      yField: "quantity",
      seriesField: "version",
      stack: false,
      padding: [20, 20, 20, 20],
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
    }),
    [versionChartData],
  );

  const timeSeriesChartData = useMemo(() => {
    // Group by normalized date (epoch at midnight) to ensure correct ordering
    const grouped = new Map<number, number>();

    filteredItems.forEach((item) => {
      const raw = item.Data_solicitacao;
      if (!raw) return; // skip items without a date for the time-series

      // Support both dd/MM/yyyy and ISO-like strings
      let dateObj: Date;
      if (raw.includes("/")) {
        dateObj = parseDate(raw);
      } else {
        dateObj = new Date(raw);
      }

      if (isNaN(dateObj.getTime())) return;

      // Normalize to midnight (local) and use epoch ms as key
      const key = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
      ).getTime();

      const quantity = Number(item.Quantidade) || 0;
      grouped.set(key, (grouped.get(key) || 0) + quantity);
    });

    return Array.from(grouped.entries())
      .map(([time, quantity]) => ({
        // use ISO date (yyyy-MM-dd) as the x value so charts render consistently
        date: new Date(time).toISOString().split("T")[0],
        quantity,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredItems]);

  const timeSeriesChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      data: [
        {
          id: "salesOverTime",
          values: timeSeriesChartData,
        },
      ],
      xField: "date",
      yField: "quantity",
      seriesField: "id",
      smooth: true,
      padding: [20, 20, 20, 20],
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
    }),
    [timeSeriesChartData],
  );

  const classificationData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const classification = item.Classificacao || "Sem classificação";
      const quantity = Number(item.Quantidade) || 0;
      grouped.set(
        classification,
        (grouped.get(classification) || 0) + quantity,
      );
    });

    return Array.from(grouped.entries())
      .map(([classification, quantity]) => ({ classification, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredItems]);

  const classificationChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "classificationSales",
          values: classificationData,
        },
      ],
      direction: "vertical",
      xField: "classification",
      yField: "quantity",
      seriesField: "classification",
      stack: false,
      padding: [20, 20, 20, 20],
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
    }),
    [classificationData],
  );

  const storeData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const store = item.Loja_Venda || "Sem loja";
      const quantity = Number(item.Quantidade) || 0;
      grouped.set(store, (grouped.get(store) || 0) + quantity);
    });

    return Array.from(grouped.entries())
      .map(([store, quantity]) => ({ store, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [filteredItems]);

  const storeChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "storeSales",
          values: storeData,
        },
      ],
      direction: "vertical",
      xField: "store",
      yField: "quantity",
      seriesField: "store",
      stack: false,
      padding: [20, 20, 20, 20],
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
    }),
    [storeData],
  );

  const totalProposals = filteredItems.length;

  const totalQuantity = useMemo(() => {
    return filteredItems.reduce(
      (sum, item) => sum + (Number(item.Quantidade) || 0),
      0,
    );
  }, [filteredItems]);

  if (apiLoading) {
    return (
      <section className="space-y-6 py-6">
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
        <p className="text-base text-red-600">
          Erro ao carregar dados: {error}
        </p>
      </section>
    );
  }

  const exportToExcel = () => {
    const rows = vendorRanking.map((item) => [
      item.vendor,
      item.proposals,
      item.quantity,
      item.avgPerProposal,
    ]);

    const headers = [
      "Vendedor",
      "Venda Cantada",
      "Quantidade",
      "Média por Proposta",
    ];
    const table = [headers, ...rows]
      .map(
        (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-vendedores-${format(new Date(), "yyyyMMdd_HHmmss")}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6 py-6">
      <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Relatórios</p>
          <h2 className="text-lg font-semibold">Análise de Vendedores</h2>
        </div>
        
      </div>

      <div className="rounded-3xl border border-border bg-card p-2 shadow-sm">
        <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Filtros</p>
            <h2 className="text-base font-semibold">Vendedor e Período</h2>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-0.5">
            <span className="text-xs font-medium">Vendedor</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={selectedVendor}
              onChange={(event) => {
                setSelectedVendor(event.target.value);
                setCurrentPage(1);
              }}
            >
              {vendorOptions.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-0.5">
            <span className="text-xs font-medium">De</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-1.5 py-0.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="space-y-0.5">
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

      <div className="grid gap-6 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Total de Venda Cantada</p>
          <p className="mt-0.5 text-2xl font-semibold">{totalProposals}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Quantidade Total</p>
          <p className="mt-0.5 text-2xl font-semibold">{totalQuantity}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Marcas Vendidas</p>
          <p className="mt-0.5 text-2xl font-semibold">{brandData.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Versões Vendidas</p>
          <p className="mt-0.5 text-2xl font-semibold">{versionData.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Marcas com mais Intenções de Vendas</h2>
            <p className="text-xs text-muted-foreground">
              Top marcas do vendedor selecionado
            </p>
          </div>
          <div className="h-[300px]">
            {chartError && (
              <div className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                Erro: {chartError}
              </div>
            )}
            <VChart
              spec={brandChartSpec}
              onError={(err) =>
                setChartError(err ? String(err) : "Erro desconhecido")
              }
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Versões com mais Intenções de Vendas</h2>
            <p className="text-xs text-muted-foreground">
              Top 10 versões/modelos
            </p>
          </div>
          <div className="h-[300px]">
            <VChart
              spec={versionChartSpec}
              onError={(err) =>
                setChartError(err ? String(err) : "Erro desconhecido")
              }
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-3 shadow-sm lg:col-span-2">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Evolução de Vendas</h2>
            <p className="text-xs text-muted-foreground">
              Quantidade de Intenções de Venda ao longo do tempo
            </p>
          </div>
          <div className="h-[300px]">
            <VChart
              spec={timeSeriesChartSpec}
              onError={(err) =>
                setChartError(err ? String(err) : "Erro desconhecido")
              }
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-semibold">
              Classificação das Intenções de Vendas
            </h2>
            <p className="text-xs text-muted-foreground">
              Distribuição por tipo
            </p>
          </div>
          <div className="h-[300px]">
            <VChart
              spec={classificationChartSpec}
              onError={(err) =>
                setChartError(err ? String(err) : "Erro desconhecido")
              }
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Lojas/Regiões</h2>
            <p className="text-xs text-muted-foreground">Top 8 lojas/regiões</p>
          </div>
          <div className="h-[300px]">
            <VChart
              spec={storeChartSpec}
              onError={(err) =>
                setChartError(err ? String(err) : "Erro desconhecido")
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Ranking de Vendedores</h2>
            <p className="text-xs text-muted-foreground">
              Todos os vendedores ordenados por quantidade vendida
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="h-8 text-xs"
          >
            Exportar Excel
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="border-b border-border bg-background px-3 py-2 font-medium">
                  Vendedor
                </th>
                <th className="border-b border-border bg-background px-3 py-2 text-right font-medium">
                  Venda Cantada
                </th>
                <th className="border-b border-border bg-background px-3 py-2 text-right font-medium">
                  Quantidade
                </th>
                <th className="border-b border-border bg-background px-3 py-2 text-right font-medium">
                  Média/Proposta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {vendorRanking
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((row, idx) => {
                  const globalPosition =
                    (currentPage - 1) * itemsPerPage + idx + 1;
                  let medal = null;
                  if (globalPosition === 1) {
                    medal = (
                      <Trophy
                        size={16}
                        className="mr-1 inline text-yellow-500"
                      />
                    );
                  } else if (globalPosition === 2) {
                    medal = (
                      <Medal size={16} className="mr-1 inline text-gray-500" />
                    );
                  } else if (globalPosition === 3) {
                    medal = (
                      <Medal
                        size={16}
                        className="mr-1 inline text-orange-600"
                      />
                    );
                  }
                  return (
                    <tr key={idx} className="odd:bg-card">
                      <td className="px-3 py-2">
                        {medal}
                        {row.vendor}
                      </td>
                      <td className="px-3 py-2 text-right">{row.proposals}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.avgPerProposal}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="flex items-center gap-3 text-muted-foreground">
            <span>Total de vendedores: {vendorRanking.length}</span>
            <span className="flex items-center gap-3 border-l border-border pl-3">
              <span className="flex items-center gap-1">
                <Trophy size={14} className="text-yellow-500" />
                <span>1º</span>
              </span>
              <span className="flex items-center gap-1">
                <Medal size={14} className="text-gray-500" />
                <span>2º</span>
              </span>
              <span className="flex items-center gap-1">
                <Medal size={14} className="text-orange-600" />
                <span>3º</span>
              </span>
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              Primeira
            </button>
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Anterior
            </button>
            <span className="text-muted-foreground">
              Página {currentPage} de{" "}
              {Math.ceil(vendorRanking.length / itemsPerPage)}
            </span>
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                currentPage === Math.ceil(vendorRanking.length / itemsPerPage)
              }
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(
                    page + 1,
                    Math.ceil(vendorRanking.length / itemsPerPage),
                  ),
                )
              }
            >
              Próxima
            </button>
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                currentPage === Math.ceil(vendorRanking.length / itemsPerPage)
              }
              onClick={() =>
                setCurrentPage(Math.ceil(vendorRanking.length / itemsPerPage))
              }
            >
              Última
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
