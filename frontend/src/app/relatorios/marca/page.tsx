"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec } from "@visactor/vchart";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { format } from "date-fns";
import { CircleHelp, RefreshCw } from "lucide-react";

const parseReportDate = (value: string): Date | null => {
  const [datePart, timePart = "00:00:00"] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTodayInputValue = () => format(new Date(), "yyyy-MM-dd");

const formatInputDate = (date: Date) => format(date, "yyyy-MM-dd");

const formatDisplayInputDate = (value: string) =>
  format(
    (() => {
      const [yearText, monthText, dayText] = value.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      return new Date(year, month - 1, day);
    })(),
    "dd/MM/yyyy",
  );

const buildLocalDateFromInput = (value: string, endOfDay = false) => {
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

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const sortUniqueOptions = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value && value !== "Todos"),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

type CountItem = {
  label: string;
  value: number;
};

function TooltipIcon({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sky-500 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
    >
      <CircleHelp className="h-4 w-4" />
    </button>
  );
}

const consolidatedChartColors = [
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
];

const xAxisLabelStyle = {
  angle: Math.PI / 4,
  textAlign: "right" as const,
  textBaseline: "middle" as const,
  maxLineWidth: 120,
  ellipsis: "...",
};

const topTenWithOthers = (items: CountItem[]) => {
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
};

const buildConsolidatedBarChartSpec = (data: CountItem[]): IBarChartSpec => ({
  type: "bar",
  data: [
    {
      id: "consolidatedChart",
      values: data,
    },
  ],
  direction: "vertical",
  xField: "label",
  yField: "value",
  seriesField: "label",
  stack: false,
  padding: [20, 20, 20, 20],
  color: consolidatedChartColors,
  axes: [
    {
      orient: "bottom",
      label: {
        style: xAxisLabelStyle,
      },
    },
    {
      orient: "left",
      label: {
        formatMethod: (text: string | string[]) => String(text),
      },
    },
  ],
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
});

function ConsolidatedChartCard({
  title,
  tooltip,
  data,
}: {
  title: string;
  tooltip?: string;
  data: CountItem[];
}) {
  const chartSpec = useMemo(() => buildConsolidatedBarChartSpec(data), [data]);
  const chartKey = useMemo(() => JSON.stringify(data), [data]);

  return (
    <div className="min-h-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-900">
              {title}
            </h2>
            {tooltip ? <TooltipIcon text={tooltip} /> : null}
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Top 10
        </span>
      </div>

      <div className="h-[280px] overflow-hidden">
        {data.length ? (
          <VChart key={chartKey} spec={chartSpec} />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Nenhum dado no período.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MarcaVeiculoRelatorioPage() {
  const {
    items: enhancedSalesIntention,
    isLoading: apiLoading,
    isRefreshing,
    error,
    refresh,
  } = useSalesIntentions(undefined, { searchAll: true });
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["Todos"]);
  const [selectedBandeiras, setSelectedBandeiras] = useState<string[]>(["Todos"]);
  const [selectedStores, setSelectedStores] = useState<string[]>(["Todos"]);
  const [selectedSalesTypes, setSelectedSalesTypes] = useState<string[]>(["Todos"]);
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>(["Todos"]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["Todos"]);
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [chartError, setChartError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoFallbackDate, setAutoFallbackDate] = useState<string | null>(null);
  const todayInput = useMemo(() => getTodayInputValue(), []);

  // Move all hooks BEFORE conditional returns
  const bandeiraOptions = useMemo(() => {
    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Bandeira || "Sem Bandeira"));
  }, [enhancedSalesIntention]);

  const filteredByBandeira = useMemo(() => {
    if (selectedBandeiras.includes("Todos")) return enhancedSalesIntention;
    return enhancedSalesIntention.filter((item) =>
      selectedBandeiras.includes(item.Bandeira || "Sem Bandeira"),
    );
  }, [enhancedSalesIntention, selectedBandeiras]);

  const storeOptions = useMemo(() => {
    return sortUniqueOptions(filteredByBandeira.map((item) => item.Loja_Venda));
  }, [filteredByBandeira]);

  const filteredByStore = useMemo(() => {
    if (selectedStores.includes("Todos")) return filteredByBandeira;
    return filteredByBandeira.filter((item) => selectedStores.includes(item.Loja_Venda));
  }, [filteredByBandeira, selectedStores]);

  const regionOptions = useMemo(() => {
    return sortUniqueOptions(filteredByStore.map((item) => item.Regional));
  }, [filteredByStore]);

  const filteredByRegion = useMemo(() => {
    if (selectedRegions.includes("Todos")) return filteredByStore;
    return filteredByStore.filter((item) => selectedRegions.includes(item.Regional));
  }, [filteredByStore, selectedRegions]);

  const salesTypeOptions = useMemo(() => {
    return sortUniqueOptions(filteredByRegion.map((item) => item.Tipo_Venda));
  }, [filteredByRegion]);

  const filteredBySalesType = useMemo(() => {
    if (selectedSalesTypes.includes("Todos")) return filteredByRegion;
    return filteredByRegion.filter((item) => selectedSalesTypes.includes(item.Tipo_Venda));
  }, [filteredByRegion, selectedSalesTypes]);

  const classificationOptions = useMemo(() => {
    return sortUniqueOptions(filteredBySalesType.map((item) => item.Classificacao));
  }, [filteredBySalesType]);

  const filteredByClassification = useMemo(() => {
    if (selectedClassifications.includes("Todos")) return filteredBySalesType;
    return filteredBySalesType.filter((item) =>
      selectedClassifications.includes(item.Classificacao),
    );
  }, [filteredBySalesType, selectedClassifications]);

  const brandOptions = useMemo(() => {
    return sortUniqueOptions(
      filteredByClassification.map((item) => item.Marca_Veiculo || "Sem Marca"),
    );
  }, [filteredByClassification]);

  const latestAvailableDateInput = useMemo(() => {
    const latestDate = enhancedSalesIntention.reduce<Date | null>((latest, item) => {
      const current = parseReportDate(item.Data_solicitacao);
      if (!current) {
        return latest;
      }

      if (!latest || current > latest) {
        return current;
      }

      return latest;
    }, null);

    return latestDate ? formatInputDate(latestDate) : todayInput;
  }, [enhancedSalesIntention, todayInput]);

  const hasDataForToday = useMemo(
    () =>
      enhancedSalesIntention.some((item) => {
        const current = parseReportDate(item.Data_solicitacao);
        return current ? formatInputDate(current) === todayInput : false;
      }),
    [enhancedSalesIntention, todayInput],
  );

  useEffect(() => {
    setSelectedStores((current) => {
      if (current.includes("Todos")) return current;
      const next = current.filter((value) => storeOptions.includes(value));
      return next.length === 0 ? ["Todos"] : next;
    });
  }, [storeOptions]);

  useEffect(() => {
    setSelectedRegions((current) => {
      if (current.includes("Todos")) return current;
      const next = current.filter((value) => regionOptions.includes(value));
      return next.length === 0 ? ["Todos"] : next;
    });
  }, [regionOptions]);

  useEffect(() => {
    setSelectedSalesTypes((current) => {
      if (current.includes("Todos")) return current;
      const next = current.filter((value) => salesTypeOptions.includes(value));
      return next.length === 0 ? ["Todos"] : next;
    });
  }, [salesTypeOptions]);

  useEffect(() => {
    setSelectedClassifications((current) => {
      if (current.includes("Todos")) return current;
      const next = current.filter((value) => classificationOptions.includes(value));
      return next.length === 0 ? ["Todos"] : next;
    });
  }, [classificationOptions]);

  useEffect(() => {
    setSelectedBrands((current) => {
      if (current.includes("Todos")) return current;
      const next = current.filter((value) => brandOptions.includes(value));
      return next.length === 0 ? ["Todos"] : next;
    });
  }, [brandOptions]);

  const lastUpdatedText = lastUpdated ? format(lastUpdated, "dd/MM/yyyy HH:mm:ss") : "Carregando...";

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (hasDataForToday) {
      setAutoFallbackDate(null);
    }
  }, [hasDataForToday]);

  useEffect(() => {
    if (startDate !== todayInput || endDate !== todayInput) {
      return;
    }

    if (hasDataForToday) {
      return;
    }

    if (latestAvailableDateInput !== todayInput) {
      setStartDate(latestAvailableDateInput);
      setEndDate(latestAvailableDateInput);
      setAutoFallbackDate(latestAvailableDateInput);
    }
  }, [endDate, hasDataForToday, latestAvailableDateInput, startDate, todayInput]);

  const parseMultiSelectValue = (
    selectedOptions: HTMLCollectionOf<HTMLOptionElement>,
  ) => {
    const values = Array.from(selectedOptions).map((option) => option.value);
    return values.includes("Todos") || values.length === 0 ? ["Todos"] : values;
  };

  const toggleFilterValue = (
    option: string,
    checked: boolean,
    selected: string[],
    setSelected: Dispatch<SetStateAction<string[]>>,
  ) => {
    setSelected((current) => {
      const active = current.includes("Todos") ? [] : current;

      if (option === "Todos") {
        return ["Todos"];
      }

      if (checked) {
        return [...new Set([...active.filter((value) => value !== "Todos"), option])];
      }

      const next = active.filter((value) => value !== option);
      return next.length === 0 ? ["Todos"] : next;
    });
  };

  const clearFilters = () => {
    setSelectedRegions(["Todos"]);
    setSelectedBandeiras(["Todos"]);
    setSelectedStores(["Todos"]);
    setSelectedSalesTypes(["Todos"]);
    setSelectedClassifications(["Todos"]);
    setSelectedBrands(["Todos"]);
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setChartError(null);
    setRefreshTick((tick) => tick + 1);
  };

  const getFilterSummary = (selected: string[]) => {
    if (selected.includes("Todos")) {
      return "Todos";
    }
    if (selected.length === 1) {
      return selected[0];
    }
    return `${selected.length} selecionados`;
  };

  const activePeriodText = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return startDate === todayInput
          ? "Período ativo: Hoje"
          : `Período ativo: ${formatDisplayInputDate(startDate)}`;
      }

      return `Período ativo: ${formatDisplayInputDate(startDate)} a ${formatDisplayInputDate(endDate)}`;
    }

    if (startDate) {
      return `Período ativo: a partir de ${formatDisplayInputDate(startDate)}`;
    }

    if (endDate) {
      return `Período ativo: até ${formatDisplayInputDate(endDate)}`;
    }

    return "Período ativo: intervalo livre";
  }, [endDate, startDate, todayInput]);

  const fallbackNotice = useMemo(() => {
    if (!autoFallbackDate) {
      return null;
    }

    return `Hoje sem dados, usando ${formatDisplayInputDate(autoFallbackDate)}`;
  }, [autoFallbackDate]);

  const handleStartDateChange = (value: string) => {
    setAutoFallbackDate(null);
    setStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    setAutoFallbackDate(null);
    setEndDate(value);
  };

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) => {
        const matchesBandeira =
          selectedBandeiras.includes("Todos") ||
          selectedBandeiras.includes(item.Bandeira || "Sem Bandeira");
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
          const itemDate = parseReportDate(item.Data_solicitacao);
          if (!itemDate) {
            return false;
          }

          if (startDate) {
            const start = buildLocalDateFromInput(startDate);
            if (!start) {
              return false;
            }
            if (itemDate < start) matchesDateRange = false;
          }
          if (endDate) {
            const end = buildLocalDateFromInput(endDate, true);
            if (!end) {
              return false;
            }
            if (itemDate > end) matchesDateRange = false;
          }
        }

        return (
          matchesBandeira &&
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
      selectedBandeiras,
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
    axes: [
        {
          orient: "bottom",
          label: {
            style: xAxisLabelStyle,
          },
        },
      {
        orient: "left",
        label: {
          formatMethod: (text: string | string[]) => String(text),
        },
      },
    ],
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

  const consolidatedBandeiraData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const label = item.Bandeira?.trim() || "Sem Bandeira";
      grouped.set(label, (grouped.get(label) || 0) + (Number(item.Quantidade) || 0));
    });

    return topTenWithOthers(
      Array.from(grouped, ([label, value]) => ({ label, value })).sort(
        (a, b) => b.value - a.value,
      ),
    );
  }, [filteredItems]);

  const consolidatedModeloData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const label = item.Versao?.trim() || "Sem versão";
      grouped.set(label, (grouped.get(label) || 0) + (Number(item.Quantidade) || 0));
    });

    return topTenWithOthers(
      Array.from(grouped, ([label, value]) => ({ label, value })).sort(
        (a, b) => b.value - a.value,
      ),
    );
  }, [filteredItems]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [
    selectedBandeiras,
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
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_48%,_#e8eef7_100%)] p-3 text-slate-900 sm:p-5">
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
          <section className="h-[156px] animate-pulse rounded-[34px] bg-[linear-gradient(135deg,_#06345e_0%,_#0b4a7a_48%,_#0f5f95_100%)] shadow-[0_26px_70px_-44px_rgba(2,6,23,0.85)]" />

          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.12)]">
            <div className="mb-6 h-6 w-40 animate-pulse rounded bg-slate-200/80" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200/80" />
                  <div className="mt-3 h-[58px] animate-pulse rounded-2xl bg-white" />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
                  <div className="mt-3 h-[58px] animate-pulse rounded-2xl bg-white" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
                <div className="mt-3 h-10 w-24 animate-pulse rounded bg-slate-200/80" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="min-h-[340px] rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]"
              >
                <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200/80" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, barIndex) => (
                    <div key={barIndex} className="flex items-center gap-2">
                      <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-10 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]">
            <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200/80" />
            <div className="h-[380px] rounded-2xl bg-slate-100/70" />
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_48%,_#e8eef7_100%)] p-3 text-slate-900 sm:p-5">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
          <section className="rounded-[34px] bg-[linear-gradient(135deg,_#06345e_0%,_#0b4a7a_48%,_#0f5f95_100%)] px-4 py-4 text-white shadow-[0_26px_70px_-44px_rgba(2,6,23,0.85)] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
              Relatório
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Visão global por Marca de Veículo
            </h1>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-rose-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.12)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-600">
              Falha ao carregar os dados
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Não conseguimos mostrar a visão de marca agora
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
            <div className="mt-6">
              <Button type="button" onClick={() => void refresh()} disabled={isRefreshing}>
                {isRefreshing ? "Tentando novamente..." : "Tentar novamente"}
              </Button>
            </div>
          </section>
        </div>
      </main>
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
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_48%,_#e8eef7_100%)] p-3 text-slate-900 sm:p-5">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#06345e_0%,_#0b4a7a_48%,_#0f5f95_100%)] px-4 py-4 text-white shadow-[0_26px_70px_-44px_rgba(2,6,23,0.85)] sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
                Relatório
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Visão global por Marca de Veículo
                </h1>
                <TooltipIcon text="Os gráficos abaixo já respondem aos filtros de bandeira, regional, loja, tipo de venda, classificação, marca e período." />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Última atualização: {lastUpdatedText}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {isLoading ? "Atualizando..." : "Dados prontos"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-sky-50/90">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {activePeriodText}
                </span>
                {fallbackNotice ? (
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-100">
                    {fallbackNotice}
                  </span>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void refresh({ silent: true })}
              className="h-10 shrink-0 rounded-full border-white/20 bg-white/10 px-4 text-xs font-semibold text-white shadow-none hover:border-white/30 hover:bg-white/20 hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.12)]">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
                Filtros
              </p>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Refine a visualização por marca
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="h-10 shrink-0 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Limpar filtros
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Bandeira",
                selected: selectedBandeiras,
                options: bandeiraOptions,
                setter: setSelectedBandeiras,
              },
              {
                label: "Regional",
                selected: selectedRegions,
                options: regionOptions,
                setter: setSelectedRegions,
              },
              {
                label: "Loja Venda",
                selected: selectedStores,
                options: storeOptions,
                setter: setSelectedStores,
              },
              {
                label: "Tipo de Venda",
                selected: selectedSalesTypes,
                options: salesTypeOptions,
                setter: setSelectedSalesTypes,
              },
            ].map(({ label, selected, options, setter }) => (
              <div
                key={label}
                className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {label}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {getFilterSummary(selected)}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="mt-3 flex h-[58px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    >
                      <span className="truncate">
                        {selected.includes("Todos") ? "Todos" : getFilterSummary(selected)}
                      </span>
                      <span className="text-slate-400">▾</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="mt-2 max-h-[280px] w-full overflow-y-auto p-2">
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={selected.includes("Todos")}
                      onCheckedChange={(checked) =>
                        toggleFilterValue("Todos", !!checked, selected, setter)
                      }
                    >
                      Todos
                    </DropdownMenuCheckboxItem>
                    {options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option}
                        checked={selected.includes(option)}
                        onCheckedChange={(checked) =>
                          toggleFilterValue(option, !!checked, selected, setter)
                        }
                      >
                        {option || "Sem informação"}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Classificação",
                selected: selectedClassifications,
                options: classificationOptions,
                setter: setSelectedClassifications,
              },
              {
                label: "Marca",
                selected: selectedBrands,
                options: brandOptions,
                setter: setSelectedBrands,
              },
            ].map(({ label, selected, options, setter }) => (
              <div
                key={label}
                className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {label}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {getFilterSummary(selected)}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="mt-3 flex h-[58px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    >
                      <span className="truncate">
                        {selected.includes("Todos") ? "Todos" : getFilterSummary(selected)}
                      </span>
                      <span className="text-slate-400">▾</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="mt-2 max-h-[280px] w-full overflow-y-auto p-2">
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={selected.includes("Todos")}
                      onCheckedChange={(checked) =>
                        toggleFilterValue("Todos", !!checked, selected, setter)
                      }
                    >
                      Todos
                    </DropdownMenuCheckboxItem>
                    {options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option}
                        checked={selected.includes(option)}
                        onCheckedChange={(checked) =>
                          toggleFilterValue(option, !!checked, selected, setter)
                        }
                      >
                        {option || "Sem informação"}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Período
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    De
                  </span>
                  <input
                    type="date"
                    max={endDate || undefined}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    value={startDate}
                    onChange={(event) => handleStartDateChange(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Até
                  </span>
                  <input
                    type="date"
                    min={startDate || undefined}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    value={endDate}
                    onChange={(event) => handleEndDateChange(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Total de propostas
            </p>
            <p className="mt-3 text-4xl font-light tracking-[-0.05em] text-slate-900">
              {totalProposals.toLocaleString("pt-BR")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Soma das quantidades no recorte atual.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Registros filtrados
            </p>
            <p className="mt-3 text-4xl font-light tracking-[-0.05em] text-slate-900">
              {filteredItems.length.toLocaleString("pt-BR")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Quantidade de linhas que alimenta os gráficos.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ConsolidatedChartCard
            title="Consolidado por Bandeira"
            tooltip="Quantidade total de propostas por bandeira no período selecionado."
            data={consolidatedBandeiraData}
          />
          <ConsolidatedChartCard
            title="Consolidado por Modelo"
            tooltip="Quantidade total de propostas por modelo no período selecionado."
            data={consolidatedModeloData}
          />
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.18)]">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
                Ranking consolidado
              </p>
              <TooltipIcon
                text={`Venda Cantada por Marca. Top marcas no período filtrado (${brandChartData.length} marcas).`}
              />
            </div>

            <Button variant="default" onClick={exportToExcel} className="h-8 text-xs">
              Exportar Excel
            </Button>
          </div>

          <div className="h-[400px] w-full overflow-hidden">
            {chartError && (
              <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <p className="font-semibold">Falha ao renderizar o gráfico</p>
                <p className="mt-1">{chartError}</p>
              </div>
            )}
            <VChart
              key={brandChartKey}
              spec={brandChartSpec}
              onError={(err) => {
                // eslint-disable-next-line no-console
                console.error("VChart error:", err);
                setChartError(
                  err ? String(err) : "Não foi possível renderizar este gráfico.",
                );
              }}
            />
          </div>
        </section>

        <SalesIntentionDataList
          items={filteredItems}
          exportFilePrefix="relatorio-marca"
          className="mt-1"
        />
      </div>
    </main>
  );
}
