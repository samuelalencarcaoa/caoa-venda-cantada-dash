"use client";

import { useEffect, useMemo, useState } from "react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec } from "@visactor/vchart";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { Button } from "@/components/ui/button";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import { format } from "date-fns";
import { CircleHelp, RefreshCw } from "lucide-react";
import {
  fetchSalesIntentionCatalogs,
  fetchSalesIntentionModelosDealer,
} from "@/lib/salesIntentionApi";
import {
  themedCardClass,
  themedChipClass,
  themedHeroClass,
  themedInputClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextMutedClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";
import type {
  SalesIntentionCatalogHierarchyRecord,
  SalesIntentionCatalogResponse,
  SalesIntentionCatalogSources,
  SalesIntentionModelosDealerRecord,
  SalesIntentionModelosDealerResponse,
  SalesIntentionModelosDealerSources,
} from "@/lib/salesIntentionApi";

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

const tipoVendaLabels: Record<string, string> = {
  NOVOS: "Novos",
  SEMINOVOS: "Seminovos",
};

function formatTipoVendaLabel(value: string) {
  return tipoVendaLabels[normalizeValue(value)] ?? value;
}

const emptyCatalogSources: SalesIntentionCatalogSources = {
  tipoVenda: [],
  bandeira: [],
  regional: [],
  lojaVenda: [],
  classificacao: [],
};

const emptyCatalogHierarchy: SalesIntentionCatalogHierarchyRecord[] = [];

const emptyModelosDealerSources: SalesIntentionModelosDealerSources = {
  tipoVenda: [],
  marca: [],
  modelo: [],
  versaoModelo: [],
};

const emptyVehicleCatalogRows: SalesIntentionModelosDealerRecord[] = [];

function normalizeValue(value: string) {
  return value.trim().toUpperCase();
}

function getFilteredOptions(
  sourceKey: string,
  filters: Record<string, string>,
  sourceRows: Array<Record<string, string>>,
) {
  return Array.from(
    new Set(
      sourceRows
        .filter((item) =>
          Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            return normalizeValue(String(item[key] ?? "")) === normalizeValue(value);
          }),
        )
        .map((item) => String(item[sourceKey] ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

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
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sky-500 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 dark:text-cyan-300 dark:hover:text-cyan-200"
    >
      <CircleHelp className="h-4 w-4" />
    </button>
  );
}

function FilterSelectCard({
  label,
  value,
  options,
  onChange,
  helperText,
  disabled = false,
  formatLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  formatLabel?: (value: string) => string;
}) {
  const currentValue = value || "Todos";
  const displayValue = currentValue === "Todos" ? "Todos" : (formatLabel?.(currentValue) ?? currentValue);

  return (
    <div className={cn(themedSoftCardClass, "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>{label}</p>
        <span className={cn("text-[11px]", themedTextMutedClass)}>{displayValue}</span>
      </div>

      <select
        value={currentValue}
        onChange={(event) => onChange(event.target.value === "Todos" ? "" : event.target.value)}
        className={cn(
          "mt-3 h-[58px] w-full rounded-2xl border px-4 text-sm outline-none transition focus:ring-2",
          themedInputClass,
        )}
        disabled={disabled}
      >
        <option value="Todos">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel?.(option) ?? option}
          </option>
        ))}
      </select>

      {helperText ? (
        <p className={cn("mt-2 text-[11px] leading-4", themedTextMutedClass)}>{helperText}</p>
      ) : null}
    </div>
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
    <div className={cn(themedCardClass, "min-h-[340px] p-5")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
              {title}
            </h2>
            {tooltip ? <TooltipIcon text={tooltip} /> : null}
          </div>
        </div>
        <span className={cn("px-2.5 py-1 uppercase tracking-[0.22em]", themedChipClass)}>
          Top 10
        </span>
      </div>

      <div className="h-[280px] overflow-hidden">
        {data.length ? (
          <VChart key={chartKey} spec={chartSpec} />
        ) : (
          <p className={cn("flex h-full items-center justify-center text-sm", themedTextMutedClass)}>
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
  const [selectedTipoVenda, setSelectedTipoVenda] = useState<string>("");
  const [selectedBandeira, setSelectedBandeira] = useState<string>("");
  const [selectedLojaVenda, setSelectedLojaVenda] = useState<string>("");
  const [selectedRegional, setSelectedRegional] = useState<string>("");
  const [selectedMarcaVeiculo, setSelectedMarcaVeiculo] = useState<string>("");
  const [selectedModelo, setSelectedModelo] = useState<string>("");
  const [selectedVersao, setSelectedVersao] = useState<string>("");
  const [selectedClassificacao, setSelectedClassificacao] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [chartError, setChartError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoFallbackDate, setAutoFallbackDate] = useState<string | null>(null);
  const [catalogData, setCatalogData] = useState<SalesIntentionCatalogResponse | null>(null);
  const [vehicleCatalogData, setVehicleCatalogData] = useState<SalesIntentionModelosDealerResponse | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isVehicleCatalogLoading, setIsVehicleCatalogLoading] = useState(true);
  const todayInput = useMemo(() => getTodayInputValue(), []);

  // Move all hooks BEFORE conditional returns
  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      setIsCatalogLoading(true);
      setIsVehicleCatalogLoading(true);

      try {
        const [catalogResult, vehicleResult] = await Promise.allSettled([
          fetchSalesIntentionCatalogs(),
          fetchSalesIntentionModelosDealer(),
        ]);

        if (!active) return;

        if (catalogResult.status === "fulfilled") {
          setCatalogData(catalogResult.value);
        } else {
          setCatalogData(null);
        }

        if (vehicleResult.status === "fulfilled") {
          setVehicleCatalogData(vehicleResult.value);
        } else {
          setVehicleCatalogData(null);
        }
      } finally {
        if (active) {
          setIsCatalogLoading(false);
          setIsVehicleCatalogLoading(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

  const catalogSources = catalogData?.sources ?? emptyCatalogSources;
  const catalogHierarchy = catalogData?.hierarchy ?? emptyCatalogHierarchy;
  const vehicleCatalogSources = vehicleCatalogData?.sources ?? emptyModelosDealerSources;
  const vehicleCatalogRows = vehicleCatalogData?.combinations ?? emptyVehicleCatalogRows;
  const isOptionsLoading = isCatalogLoading || isVehicleCatalogLoading;

  const tipoVendaOptions = useMemo(() => {
    const source =
      vehicleCatalogSources.tipoVenda.length > 0
        ? vehicleCatalogSources.tipoVenda
        : catalogSources.tipoVenda;

    if (source.length > 0) {
      return source;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Tipo_Venda));
  }, [catalogSources.tipoVenda, enhancedSalesIntention, vehicleCatalogSources.tipoVenda]);

  const bandeiraOptions = useMemo(() => {
    if (catalogSources.bandeira.length > 0) {
      return catalogSources.bandeira;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Bandeira || "Sem Bandeira"));
  }, [catalogSources.bandeira, enhancedSalesIntention]);

  const regionalOptions = useMemo(() => {
    if (!selectedBandeira || !selectedLojaVenda) {
      return [];
    }

    return getFilteredOptions(
      "regional",
      {
        bandeira: selectedBandeira,
        lojaVenda: selectedLojaVenda,
      },
      catalogHierarchy,
    );
  }, [catalogHierarchy, selectedBandeira, selectedLojaVenda]);

  const lojaVendaOptions = useMemo(() => {
    if (!selectedBandeira) {
      return [];
    }

    return getFilteredOptions(
      "lojaVenda",
      {
        bandeira: selectedBandeira,
      },
      catalogHierarchy,
    );
  }, [catalogHierarchy, selectedBandeira]);

  const marcaVeiculoOptions = useMemo(() => {
    if (!selectedTipoVenda) {
      return [];
    }

    return getFilteredOptions(
      "marca",
      {
        tipoVenda: selectedTipoVenda,
      },
      vehicleCatalogRows,
    );
  }, [selectedTipoVenda, vehicleCatalogRows]);

  const modeloOptions = useMemo(() => {
    if (!selectedTipoVenda || !selectedMarcaVeiculo) {
      return [];
    }

    return getFilteredOptions(
      "modelo",
      {
        tipoVenda: selectedTipoVenda,
        marca: selectedMarcaVeiculo,
      },
      vehicleCatalogRows,
    );
  }, [selectedMarcaVeiculo, selectedTipoVenda, vehicleCatalogRows]);

  const versaoOptions = useMemo(() => {
    if (!selectedTipoVenda || !selectedMarcaVeiculo || !selectedModelo) {
      return [];
    }

    return getFilteredOptions(
      "versaoModelo",
      {
        tipoVenda: selectedTipoVenda,
        marca: selectedMarcaVeiculo,
        modelo: selectedModelo,
      },
      vehicleCatalogRows,
    );
  }, [selectedMarcaVeiculo, selectedModelo, selectedTipoVenda, vehicleCatalogRows]);

  const classificacaoOptions = useMemo(() => {
    if (catalogSources.classificacao.length > 0) {
      return catalogSources.classificacao;
    }

    return sortUniqueOptions(enhancedSalesIntention.map((item) => item.Classificacao));
  }, [catalogSources.classificacao, enhancedSalesIntention]);

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

  const handleTipoVendaChange = (value: string) => {
    setSelectedTipoVenda(value);
    setSelectedMarcaVeiculo("");
    setSelectedModelo("");
    setSelectedVersao("");
  };

  const handleBandeiraChange = (value: string) => {
    setSelectedBandeira(value);
    setSelectedRegional("");
    setSelectedLojaVenda("");
  };

  const handleRegionalChange = (value: string) => {
    setSelectedRegional(value);
  };

  const handleLojaVendaChange = (value: string) => {
    setSelectedLojaVenda(value);
    setSelectedRegional("");
  };

  const handleMarcaVeiculoChange = (value: string) => {
    setSelectedMarcaVeiculo(value);
    setSelectedModelo("");
    setSelectedVersao("");
  };

  const handleModeloChange = (value: string) => {
    setSelectedModelo(value);
    setSelectedVersao("");
  };

  const handleVersaoChange = (value: string) => {
    setSelectedVersao(value);
  };

  const handleClassificacaoChange = (value: string) => {
    setSelectedClassificacao(value);
  };

  const clearFilters = () => {
    setSelectedTipoVenda("");
    setSelectedBandeira("");
    setSelectedRegional("");
    setSelectedLojaVenda("");
    setSelectedMarcaVeiculo("");
    setSelectedModelo("");
    setSelectedVersao("");
    setSelectedClassificacao("");
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setChartError(null);
    setRefreshTick((tick) => tick + 1);
  };

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) => {
        const itemTipoVenda = item.Tipo_Venda || "";
        const itemBandeira = item.Bandeira || "Sem Bandeira";
        const itemRegional = item.Regional || "";
        const itemLojaVenda = item.Loja_Venda || "";
        const itemMarcaVeiculo = item.Marca_Veiculo || "Sem Marca";
        const itemClassificacao = item.Classificacao || "";
        const itemVersao = item.Versao || "";
        const normalizedItemVersao = normalizeValue(itemVersao);
        const normalizedSelectedVersao = normalizeValue(selectedVersao);

        const matchesVehicleCatalogSelection =
          !selectedModelo ||
          vehicleCatalogRows.some(
            (row) =>
              normalizeValue(row.tipoVenda) === normalizeValue(selectedTipoVenda) &&
              normalizeValue(row.marca) === normalizeValue(selectedMarcaVeiculo) &&
              normalizeValue(row.modelo) === normalizeValue(selectedModelo) &&
              normalizeValue(row.versaoModelo) === normalizedItemVersao,
          );

        const matchesTipoVenda = !selectedTipoVenda || selectedTipoVenda === itemTipoVenda;
        const matchesBandeira = !selectedBandeira || selectedBandeira === itemBandeira;
        const matchesRegional = !selectedRegional || selectedRegional === itemRegional;
        const matchesLojaVenda = !selectedLojaVenda || selectedLojaVenda === itemLojaVenda;
        const matchesMarcaVeiculo =
          !selectedMarcaVeiculo || selectedMarcaVeiculo === itemMarcaVeiculo;
        const matchesModelo = matchesVehicleCatalogSelection;
        const matchesVersao =
          !selectedVersao ||
          (matchesVehicleCatalogSelection && normalizedItemVersao === normalizedSelectedVersao);
        const matchesClassificacao =
          !selectedClassificacao || selectedClassificacao === itemClassificacao;

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
          matchesTipoVenda &&
          matchesBandeira &&
          matchesRegional &&
          matchesLojaVenda &&
          matchesMarcaVeiculo &&
          matchesModelo &&
          matchesVersao &&
          matchesClassificacao &&
          matchesDateRange
        );
      }),
    [
      enhancedSalesIntention,
      endDate,
      selectedBandeira,
      selectedClassificacao,
      selectedLojaVenda,
      selectedMarcaVeiculo,
      selectedModelo,
      selectedRegional,
      selectedTipoVenda,
      selectedVersao,
      startDate,
      vehicleCatalogRows,
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

  const brandChartSpec = useMemo<IBarChartSpec>(
    () => ({
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
    }),
    [brandChartData],
  );

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

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [
    selectedTipoVenda,
    selectedBandeira,
    selectedRegional,
    selectedLojaVenda,
    selectedMarcaVeiculo,
    selectedModelo,
    selectedVersao,
    selectedClassificacao,
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
      <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
          <section className={cn(themedHeroClass, "h-[156px] animate-pulse")} />

          <section className={cn(themedPanelClass, "p-6")}>
            <div className="mb-6 h-6 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={cn(themedSoftCardClass, "p-4")}>
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                  <div className="mt-3 h-[58px] animate-pulse rounded-2xl bg-white dark:bg-slate-950/80" />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={cn(themedSoftCardClass, "p-4")}>
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                  <div className="mt-3 h-[58px] animate-pulse rounded-2xl bg-white dark:bg-slate-950/80" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={cn(themedCardClass, "p-5")}>
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="mt-3 h-10 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className={cn(themedCardClass, "min-h-[340px] p-5")}>
                <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, barIndex) => (
                    <div key={barIndex} className="flex items-center gap-2">
                      <div className="h-3 flex-1 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                      <div className="h-3 w-10 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className={cn(themedCardClass, "p-5")}>
            <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="h-[380px] rounded-2xl bg-slate-100/70 dark:bg-white/5" />
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
          <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80 dark:text-cyan-200/80">
              Relatório
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Visão global por Marca de Veículo
            </h1>
          </section>

          <section className={cn(themedPanelClass, "border-rose-200 p-6 dark:border-rose-400/20")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-600 dark:text-rose-300">
              Falha ao carregar os dados
            </p>
            <h2 className={cn("mt-2 text-2xl font-semibold", themedTextTitleClass)}>
              Não conseguimos mostrar a visão de marca agora
            </h2>
            <p className={cn("mt-3 text-sm leading-6", themedTextBodyClass)}>{error}</p>
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
    <main className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4">
        <section className={cn(themedHeroClass, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-sky-100/80">
                Relatório
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Visão global por Marca de Veículo
                </h1>
                <TooltipIcon text="Os gráficos abaixo já respondem aos filtros de bandeira, loja de venda, regional, tipo de venda, classificação, marca e período." />
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
              className={cn("h-10 shrink-0 rounded-full px-4 text-xs font-semibold", themedOutlineButtonClass)}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </section>

        <section className={cn(themedPanelClass, "p-6")}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={cn(themedTinyLabelClass, "tracking-[0.34em]")}>
                Filtros
              </p>
              <h2 className={cn("text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                Refine a visualização por marca
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className={cn("h-10 shrink-0 rounded-full px-4 text-xs font-semibold", themedOutlineButtonClass)}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelectCard
              label="Tipo de venda"
              value={selectedTipoVenda}
              options={tipoVendaOptions}
              onChange={handleTipoVendaChange}
              helperText={
                selectedTipoVenda
                  ? "Filtro aplicado por tipo de venda."
                  : "Escolha o tipo de venda primeiro."
              }
              disabled={isOptionsLoading}
              formatLabel={formatTipoVendaLabel}
            />
            <FilterSelectCard
              label="Bandeira"
              value={selectedBandeira}
              options={bandeiraOptions}
              onChange={handleBandeiraChange}
              helperText="Escolha a bandeira para liberar as próximas opções."
              disabled={isOptionsLoading}
            />
            <FilterSelectCard
              label="Regional"
              value={selectedLojaVenda}
              options={lojaVendaOptions}
              onChange={handleLojaVendaChange}
              helperText={
                selectedBandeira
                  ? "As opções seguem a bandeira selecionada."
                  : "Escolha a bandeira primeiro."
              }
              disabled={isOptionsLoading || !selectedBandeira}
            />
            <FilterSelectCard
              label="Loja de Venda"
              value={selectedRegional}
              options={regionalOptions}
              onChange={handleRegionalChange}
              helperText={
                selectedLojaVenda
                  ? "As opções seguem a loja de venda selecionada."
                  : "Escolha a loja de venda primeiro."
              }
              disabled={isOptionsLoading || !selectedLojaVenda}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FilterSelectCard
              label="Marca veículo"
              value={selectedMarcaVeiculo}
              options={marcaVeiculoOptions}
              onChange={handleMarcaVeiculoChange}
              helperText={
                selectedTipoVenda
                  ? "As marcas são filtradas pelo tipo de venda."
                  : "Escolha o tipo de venda primeiro."
              }
              disabled={isOptionsLoading || !selectedTipoVenda}
            />
            <FilterSelectCard
              label="Modelo"
              value={selectedModelo}
              options={modeloOptions}
              onChange={handleModeloChange}
              helperText={
                selectedMarcaVeiculo
                  ? "Os modelos seguem a marca selecionada."
                  : "Escolha a marca primeiro."
              }
              disabled={isOptionsLoading || !selectedMarcaVeiculo}
            />
            <FilterSelectCard
              label="Versão"
              value={selectedVersao}
              options={versaoOptions}
              onChange={handleVersaoChange}
              helperText={
                selectedModelo
                  ? "As versões seguem o modelo selecionado."
                  : "Escolha o modelo primeiro."
              }
              disabled={isOptionsLoading || !selectedModelo}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            <FilterSelectCard
              label="Classificação"
              value={selectedClassificacao}
              options={classificacaoOptions}
              onChange={handleClassificacaoChange}
              helperText="Escolha a classificação."
              disabled={isOptionsLoading}
            />

            <div className={cn(themedSoftCardClass, "p-4")}>
              <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>Período</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span
                    className={cn(
                      "block text-[11px] font-semibold uppercase tracking-[0.24em]",
                      themedTextMutedClass,
                    )}
                  >
                    De
                  </span>
                  <input
                    type="date"
                    max={endDate || undefined}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-3 text-sm outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={startDate}
                    onChange={(event) => handleStartDateChange(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span
                    className={cn(
                      "block text-[11px] font-semibold uppercase tracking-[0.24em]",
                      themedTextMutedClass,
                    )}
                  >
                    Até
                  </span>
                  <input
                    type="date"
                    min={startDate || undefined}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-3 text-sm outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={endDate}
                    onChange={(event) => handleEndDateChange(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <div className={cn(themedCardClass, "p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Total de Vendas Cantadas
            </p>
            <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
              {totalProposals.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Soma das quantidades no recorte atual.
            </p>
          </div>

          <div className={cn(themedCardClass, "p-5")}>
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>
              Registros filtrados
            </p>
            <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
              {filteredItems.length.toLocaleString("pt-BR")}
            </p>
            <p className={cn("mt-2 text-xs", themedTextBodyClass)}>
              Quantidade de linhas que alimenta os gráficos.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ConsolidatedChartCard
            title="Consolidado por Bandeira"
            tooltip="Quantidade Total de Vendas Cantadas por bandeira no período selecionado."
            data={consolidatedBandeiraData}
          />
          <ConsolidatedChartCard
            title="Consolidado por Modelo"
            tooltip="Quantidade Total de Vendas Cantadas por modelo no período selecionado."
            data={consolidatedModeloData}
          />
        </section>

        <section className={cn(themedCardClass, "p-5")}>
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <p className={cn(themedTinyLabelClass, "tracking-[0.34em]")}>
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
              <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-50">
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
