"use client";

import { format } from "date-fns";
import { ChevronDown, CircleHelp, Medal, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { VChart } from "@visactor/react-vchart";
import type { IBarChartSpec, ILineChartSpec } from "@visactor/vchart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReportErrorCard } from "@/components/report-error-card";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import {
  themedCardClass,
  themedHeroClass,
  themedInputClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextMutedClass,
  themedTextStrongClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

const xAxisLabelStyle = {
  angle: Math.PI / 4,
  textAlign: "right" as const,
  textBaseline: "middle" as const,
  maxLineWidth: 120,
  ellipsis: "...",
};

function parseReportDate(value: string): Date | null {
  const [datePart, timePart = "00:00:00"] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTodayInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

function formatInputDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayInputDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return format(new Date(year, month - 1, day), "dd/MM/yyyy");
}

function buildLocalDateFromInput(value: string, endOfDay = false) {
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

function normalizeValue(value: string) {
  return value.trim().toUpperCase();
}

function matchesSelectedValues(selected: string[], value: string) {
  return (
    selected.length === 0 ||
    selected.some((option) => normalizeValue(option) === normalizeValue(value))
  );
}

function TooltipIcon({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ajuda: ${text}`}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sky-500 transition hover:bg-sky-500/10 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 dark:text-cyan-300 dark:hover:bg-cyan-300/10 dark:hover:text-cyan-200"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 px-3 py-2 text-xs leading-5">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function FilterSelectCard({
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled = false,
}: {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  tooltip: string;
  disabled?: boolean;
}) {
  const displayValue =
    value.length === 0
      ? "Todos"
      : value.length === 1
        ? value[0]
        : `${value.length} selecionados`;

  const toggleOption = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, option])]);
      return;
    }

    onChange(value.filter((item) => item !== option));
  };

  return (
    <div className={cn(themedSoftCardClass, "min-w-0 rounded-2xl p-2.5")}>
      <div className="flex items-center gap-1.5">
        <p className={cn(themedTinyLabelClass, "truncate tracking-[0.18em]")}>{label}</p>
        <TooltipIcon text={tooltip} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label={`${label}: ${displayValue}`}
            className={cn(
              "mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
              themedInputClass,
            )}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", themedTextMutedClass)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 overflow-y-auto rounded-xl p-1.5"
        >
          <DropdownMenuLabel className="px-2 py-1 text-xs">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={value.length === 0}
            onCheckedChange={() => onChange([])}
          >
            Todos
          </DropdownMenuCheckboxItem>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={(checked) => toggleOption(option, checked === true)}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className={cn(themedCardClass, "p-5")}>
      <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>{label}</p>
      <p className={cn("mt-3 text-4xl font-light tracking-[-0.05em]", themedTextTitleClass)}>
        {value}
      </p>
      <p className={cn("mt-2 text-xs", themedTextBodyClass)}>{description}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  hasData,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  hasData: boolean;
  className?: string;
}) {
  return (
    <article className={cn(themedCardClass, "min-w-0 px-5 py-5", className)}>
      <div className="mb-4">
        <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", themedTextTitleClass)}>
          {title}
        </h2>
        <p className={cn("mt-1 text-xs", themedTextBodyClass)}>{description}</p>
      </div>

      <div className="h-[300px] min-w-0">
        {hasData ? (
          children
        ) : (
          <p className={cn("flex h-full items-center justify-center text-sm", themedTextMutedClass)}>
            Nenhum dado no período.
          </p>
        )}
      </div>
    </article>
  );
}

export default function VendedorRelatorioPage() {
  const {
    items: enhancedSalesIntention,
    isLoading: apiLoading,
    isRefreshing,
    error,
    refresh,
    lastUpdatedAt,
  } = useSalesIntentions(undefined, { searchAll: true });
  const [selectedVendor, setSelectedVendor] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string[]>([]);
  const [selectedRegional, setSelectedRegional] = useState<string[]>([]);
  const [selectedLojaVenda, setSelectedLojaVenda] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => getTodayInputValue());
  const [endDate, setEndDate] = useState<string>(() => getTodayInputValue());
  const [autoFallbackDate, setAutoFallbackDate] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [chartError, setChartError] = useState<string | null>(null);

  const itemsPerPage = 25;
  const todayInput = useMemo(() => getTodayInputValue(), []);

  const vendorOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Proprietario || "Sem vendedor")),
    [enhancedSalesIntention],
  );

  const brandOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Marca_Veiculo || "Sem marca")),
    [enhancedSalesIntention],
  );

  const regionalOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Regional || "Sem regional")),
    [enhancedSalesIntention],
  );

  const lojaVendaOptions = useMemo(
    () => sortUniqueOptions(enhancedSalesIntention.map((item) => item.Loja_Venda || "Sem loja")),
    [enhancedSalesIntention],
  );

  useEffect(() => {
    setSelectedVendor((current) => current.filter((value) => vendorOptions.includes(value)));
  }, [vendorOptions]);

  useEffect(() => {
    setSelectedBrand((current) => current.filter((value) => brandOptions.includes(value)));
  }, [brandOptions]);

  useEffect(() => {
    setSelectedRegional((current) => current.filter((value) => regionalOptions.includes(value)));
  }, [regionalOptions]);

  useEffect(() => {
    setSelectedLojaVenda((current) => current.filter((value) => lojaVendaOptions.includes(value)));
  }, [lojaVendaOptions]);

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
    if (hasDataForToday) {
      setAutoFallbackDate(null);
      return;
    }

    if (startDate !== todayInput || endDate !== todayInput) {
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

  const lastUpdatedText = lastUpdatedAt ? format(lastUpdatedAt, "dd/MM/yyyy HH:mm:ss") : "Carregando...";

  const filteredItems = useMemo(
    () =>
      enhancedSalesIntention.filter((item) => {
        const itemVendor = item.Proprietario || "Sem vendedor";
        const itemBrand = item.Marca_Veiculo || "Sem marca";
        const itemRegional = item.Regional || "Sem regional";
        const itemLojaVenda = item.Loja_Venda || "Sem loja";
        const itemDate = parseReportDate(item.Data_solicitacao);

        const matchesVendor = matchesSelectedValues(selectedVendor, itemVendor);
        const matchesBrand = matchesSelectedValues(selectedBrand, itemBrand);
        const matchesRegional = matchesSelectedValues(selectedRegional, itemRegional);
        const matchesLojaVenda = matchesSelectedValues(selectedLojaVenda, itemLojaVenda);

        let matchesDateRange = true;
        if (startDate || endDate) {
          if (!itemDate) {
            return false;
          }

          if (startDate) {
            const start = buildLocalDateFromInput(startDate);
            if (!start) {
              return false;
            }
            if (itemDate < start) {
              matchesDateRange = false;
            }
          }

          if (endDate) {
            const end = buildLocalDateFromInput(endDate, true);
            if (!end) {
              return false;
            }
            if (itemDate > end) {
              matchesDateRange = false;
            }
          }
        }

        return matchesVendor && matchesBrand && matchesRegional && matchesLojaVenda && matchesDateRange;
      }),
    [
      enhancedSalesIntention,
      endDate,
      selectedBrand,
      selectedLojaVenda,
      selectedRegional,
      selectedVendor,
      startDate,
    ],
  );

  const vendorRanking = useMemo(() => {
    const grouped = new Map<string, { proposals: number; quantity: number }>();

    filteredItems.forEach((item) => {
      const vendor = item.Proprietario || "Sem vendedor";
      const quantity = Number(item.Quantidade) || 0;
      const current = grouped.get(vendor);

      if (current) {
        grouped.set(vendor, {
          proposals: current.proposals + 1,
          quantity: current.quantity + quantity,
        });
        return;
      }

      grouped.set(vendor, {
        proposals: 1,
        quantity,
      });
    });

    return Array.from(grouped.entries())
      .map(([vendor, data]) => ({
        vendor,
        proposals: data.proposals,
        quantity: data.quantity,
        avgPerProposal: Number((data.quantity / data.proposals).toFixed(2)),
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredItems]);

  const brandData = useMemo(() => {
    const brandMap = new Map<string, number>();

    filteredItems.forEach((item) => {
      const brand = item.Marca_Veiculo || "Sem marca";
      const quantity = Number(item.Quantidade) || 0;
      brandMap.set(brand, (brandMap.get(brand) || 0) + quantity);
    });

    return Array.from(brandMap.entries())
      .map(([brand, quantity]) => ({ brand, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredItems]);

  const versionData = useMemo(() => {
    const versionMap = new Map<string, number>();

    filteredItems.forEach((item) => {
      const version = item.Versao || "Sem versão";
      const quantity = Number(item.Quantidade) || 0;
      versionMap.set(version, (versionMap.get(version) || 0) + quantity);
    });

    return Array.from(versionMap.entries())
      .map(([version, quantity]) => ({ version, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredItems]);

  const timeSeriesChartData = useMemo(() => {
    const grouped = new Map<string, { time: number; label: string; quantity: number }>();

    filteredItems.forEach((item) => {
      const current = parseReportDate(item.Data_solicitacao);
      if (!current) {
        return;
      }

      const key = format(current, "yyyy-MM-dd");
      const groupedItem = grouped.get(key);
      const quantity = Number(item.Quantidade) || 0;

      grouped.set(key, {
        time: new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime(),
        label: format(current, "dd/MM/yy"),
        quantity: (groupedItem?.quantity || 0) + quantity,
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.time - b.time);
  }, [filteredItems]);

  const classificationData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredItems.forEach((item) => {
      const classification = item.Classificacao || "Sem classificação";
      const quantity = Number(item.Quantidade) || 0;
      grouped.set(classification, (grouped.get(classification) || 0) + quantity);
    });

    return Array.from(grouped.entries())
      .map(([classification, quantity]) => ({ classification, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredItems]);

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

  const brandChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "brandSales",
          values: brandData,
        },
      ],
      direction: "vertical",
      xField: "brand",
      yField: "quantity",
      seriesField: "brand",
      stack: false,
      padding: [20, 20, 20, 20],
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
    [brandData],
  );

  const versionChartSpec = useMemo<IBarChartSpec>(
    () => ({
      type: "bar",
      data: [
        {
          id: "versionSales",
          values: versionData,
        },
      ],
      direction: "vertical",
      xField: "version",
      yField: "quantity",
      seriesField: "version",
      stack: false,
      padding: [20, 20, 20, 20],
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
    [versionData],
  );

  const timeSeriesChartSpec = useMemo<ILineChartSpec>(
    () => ({
      type: "line",
      data: [
        {
          id: "salesOverTime",
          values: timeSeriesChartData,
        },
      ],
      xField: "label",
      yField: "quantity",
      seriesField: "id",
      smooth: true,
      padding: [20, 24, 42, 42],
      axes: [
        {
          orient: "bottom",
          label: {
            autoRotate: false,
            autoHide: true,
            autoHideMethod: "greedy",
          },
        },
        {
          orient: "left",
          label: {
            formatMethod: (text: string | string[]) =>
              Number(Array.isArray(text) ? text[0] : text).toLocaleString("pt-BR"),
          },
        },
      ],
      tooltip: {
        trigger: ["hover", "click"],
        confine: true,
        mark: {
          title: { value: (datum) => datum?.label || "Período" },
          content: [
            {
              key: "Quantidade",
              value: (datum) => Number(datum?.quantity || 0).toLocaleString("pt-BR"),
            },
          ],
        },
      },
      point: {
        visible: true,
        style: { size: 7, fill: "#22d3ee", stroke: "#ffffff", lineWidth: 2 },
      },
      line: { style: { lineWidth: 3, curveType: "monotone" } },
      area: { visible: true, style: { fillOpacity: 0.12 } },
    }),
    [timeSeriesChartData],
  );

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
    [classificationData],
  );

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
    [storeData],
  );

  const totalQuantity = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (Number(item.Quantidade) || 0), 0),
    [filteredItems],
  );

  const averageQuantityPerRecord = filteredItems.length
    ? totalQuantity / filteredItems.length
    : 0;

  const activeBrands = useMemo(
    () =>
      new Set(
        filteredItems
          .map((item) => item.Marca_Veiculo?.trim())
          .filter((value): value is string => Boolean(value)),
      ).size,
    [filteredItems],
  );

  const totalPages = Math.max(1, Math.ceil(vendorRanking.length / itemsPerPage));

  const currentPageItems = useMemo(
    () => vendorRanking.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [currentPage, vendorRanking],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [endDate, selectedBrand, selectedLojaVenda, selectedRegional, selectedVendor, startDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

          <section className={cn(themedCardClass, "p-5")}>
            <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="h-40 rounded-2xl bg-slate-100/70 dark:bg-white/5" />
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
              Análise de Vendedores
            </h1>
          </section>

          <ReportErrorCard
            label="Falha ao carregar os dados"
            title="Não conseguimos mostrar a análise de vendedores agora"
            message={error}
            onRetry={() => void refresh()}
            isRetrying={isRefreshing}
          />
        </div>
      </main>
    );
  }

  const exportToExcel = () => {
    const rows = vendorRanking.map((item) => [
      item.vendor,
      item.proposals,
      item.quantity,
      item.avgPerProposal,
    ]);

    const headers = ["Vendedor", "Venda Cantada", "Quantidade", "Média por Proposta"];
    const table = [headers, ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
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

  const clearFilters = () => {
    setSelectedVendor([]);
    setSelectedBrand([]);
    setSelectedRegional([]);
    setSelectedLojaVenda([]);
    setAutoFallbackDate(null);
    setStartDate(latestAvailableDateInput);
    setEndDate(latestAvailableDateInput);
    setCurrentPage(1);
    setChartError(null);
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
                  Análise de Vendedores
                </h1>
                <TooltipIcon text="Os indicadores e a listagem abaixo respondem aos filtros de vendedor, marca, regional, loja e período." />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Última atualização: {lastUpdatedText}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {isRefreshing ? "Atualizando..." : "Dados prontos"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-sky-50/90">
                <span className="rounded-full bg-white/10 px-3 py-1">{activePeriodText}</span>
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
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-xs font-semibold",
                themedOutlineButtonClass,
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </section>

        <section className={cn(themedPanelClass, "p-4")}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className={cn("text-base font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                Filtros
              </h2>
              <p className={cn("text-xs", themedTextMutedClass)}>
                Combine uma ou mais opções em qualquer campo.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-semibold",
                themedOutlineButtonClass,
              )}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <FilterSelectCard
              label="Vendedor"
              value={selectedVendor}
              options={vendorOptions}
              onChange={setSelectedVendor}
              tooltip="Filtro aplicado por vendedor."
            />
            <FilterSelectCard
              label="Marca veículo"
              value={selectedBrand}
              options={brandOptions}
              onChange={setSelectedBrand}
              tooltip="Filtro aplicado por marca do veículo."
            />
            <FilterSelectCard
              label="Regional"
              value={selectedRegional}
              options={regionalOptions}
              onChange={setSelectedRegional}
              tooltip="Filtro aplicado por regional."
            />
            <FilterSelectCard
              label="Loja de Venda"
              value={selectedLojaVenda}
              options={lojaVendaOptions}
              onChange={setSelectedLojaVenda}
              tooltip="Filtro aplicado por loja de venda."
            />

            <div className={cn(themedSoftCardClass, "rounded-2xl p-2.5 sm:col-span-2 lg:col-span-1")}>
              <div className="flex items-center gap-1.5">
                <p className={cn(themedTinyLabelClass, "tracking-[0.18em]")}>Período</p>
                <TooltipIcon text="Filtro aplicado por período da solicitação." />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="sr-only">De</span>
                  <input
                    type="date"
                    max={endDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={startDate}
                    onChange={(event) => {
                      setAutoFallbackDate(null);
                      setStartDate(event.target.value);
                    }}
                  />
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Até</span>
                  <input
                    type="date"
                    min={startDate || undefined}
                    className={cn(
                      "h-10 w-full min-w-0 rounded-xl border px-2 text-xs outline-none transition focus:ring-2",
                      themedInputClass,
                    )}
                    value={endDate}
                    onChange={(event) => {
                      setAutoFallbackDate(null);
                      setEndDate(event.target.value);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Vendas cantadas"
            value={filteredItems.length.toLocaleString("pt-BR")}
            description="Quantidade de intenções no recorte atual."
          />
          <StatCard
            label="Quantidade total"
            value={totalQuantity.toLocaleString("pt-BR")}
            description="Soma das quantidades registradas."
          />
          <StatCard
            label="Média por proposta"
            value={averageQuantityPerRecord.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            description="Quantidade média por intenção filtrada."
          />
          <StatCard
            label="Marcas ativas"
            value={activeBrands.toLocaleString("pt-BR")}
            description="Marcas com movimentação no recorte atual."
          />
        </section>

        <section aria-labelledby="charts-section-title" className="space-y-4">
          <div className="px-1">
            <p className={cn(themedTinyLabelClass, "tracking-[0.28em]")}>Análise executiva</p>
            <h2
              id="charts-section-title"
              className={cn("mt-1 text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}
            >
              Visão detalhada por vendedor
            </h2>
            <p className={cn("mt-1 text-xs", themedTextBodyClass)}>
              Acompanhe marcas, versões, tendência temporal e distribuição comercial no recorte atual.
            </p>
          </div>

          {chartError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-50">
              <p className="font-semibold">Falha ao renderizar o gráfico</p>
              <p className="mt-1">{chartError}</p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Marcas com mais Intenções de Vendas"
              description="Top marcas no recorte filtrado."
              hasData={brandData.length > 0}
            >
              <VChart
                spec={brandChartSpec}
                onError={(err) =>
                  setChartError(
                    err ? String(err) : "Não foi possível renderizar este gráfico.",
                  )
                }
              />
            </ChartCard>

            <ChartCard
              title="Versões com mais Intenções de Vendas"
              description="Top 10 versões/modelos no recorte filtrado."
              hasData={versionData.length > 0}
            >
              <VChart
                spec={versionChartSpec}
                onError={(err) =>
                  setChartError(
                    err ? String(err) : "Não foi possível renderizar este gráfico.",
                  )
                }
              />
            </ChartCard>

            <ChartCard
              title="Evolução de Vendas"
              description="Quantidade de intenções ao longo do tempo."
              hasData={timeSeriesChartData.length > 0}
              className="lg:col-span-2"
            >
              <VChart
                spec={timeSeriesChartSpec}
                onError={(err) =>
                  setChartError(
                    err ? String(err) : "Não foi possível renderizar este gráfico.",
                  )
                }
              />
            </ChartCard>

            <ChartCard
              title="Classificação das Intenções de Vendas"
              description="Distribuição por classificação comercial."
              hasData={classificationData.length > 0}
            >
              <VChart
                spec={classificationChartSpec}
                onError={(err) =>
                  setChartError(
                    err ? String(err) : "Não foi possível renderizar este gráfico.",
                  )
                }
              />
            </ChartCard>

            <ChartCard
              title="Lojas com mais Intenções de Vendas"
              description="Top 8 lojas no recorte filtrado."
              hasData={storeData.length > 0}
            >
              <VChart
                spec={storeChartSpec}
                onError={(err) =>
                  setChartError(
                    err ? String(err) : "Não foi possível renderizar este gráfico.",
                  )
                }
              />
            </ChartCard>
          </div>
        </section>

        <section className={cn(themedCardClass, "p-5")}>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={cn("text-base font-semibold", themedTextTitleClass)}>Ranking de Vendedores</h2>
              <p className={cn("text-xs", themedTextBodyClass)}>
                Todos os vendedores ordenados por quantidade vendida no recorte atual.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={exportToExcel}
              className={cn("h-8 text-xs", themedOutlineButtonClass)}
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
                {currentPageItems.length ? (
                  currentPageItems.map((row, idx) => {
                    const globalPosition = (currentPage - 1) * itemsPerPage + idx + 1;
                    let medal: ReactNode = null;

                    if (globalPosition === 1) {
                      medal = <Trophy size={16} className="mr-1 inline text-yellow-500" />;
                    } else if (globalPosition === 2) {
                      medal = <Medal size={16} className="mr-1 inline text-gray-500" />;
                    } else if (globalPosition === 3) {
                      medal = <Medal size={16} className="mr-1 inline text-orange-600" />;
                    }

                    return (
                      <tr key={`${row.vendor}-${globalPosition}`} className="odd:bg-card">
                        <td className={cn("px-3 py-2", themedTextStrongClass)}>
                          {medal}
                          {row.vendor}
                        </td>
                        <td className="px-3 py-2 text-right">{row.proposals}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {row.quantity.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.avgPerProposal.toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className={cn("px-3 py-8 text-center text-xs", themedTextMutedClass)}
                    >
                      Nenhum dado encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
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
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                  themedOutlineButtonClass,
                )}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                Primeira
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                  themedOutlineButtonClass,
                )}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                Anterior
              </button>
              <span className="text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                  themedOutlineButtonClass,
                )}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              >
                Próxima
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                  themedOutlineButtonClass,
                )}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                Última
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
