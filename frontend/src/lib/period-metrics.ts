import { differenceInCalendarDays } from "date-fns";

export type SalesCantadasComparisonRange = {
  start: Date;
  end: Date;
  dayCount: number;
};

type PeriodAverageMetric = {
  label: string;
  caption: string;
  tooltip: string;
  divisor: number;
};

export type SalesCantadasTrendGranularity = "hour" | "day" | "week" | "month" | "bimonth" | "quarter" | "year";

type SalesCantadasPeriodWindow = {
  averageMetric: PeriodAverageMetric;
  trendGranularity: SalesCantadasTrendGranularity;
};

function buildLocalDateFromInput(value: string) {
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

function getInclusiveDayCount(startDate?: string, endDate?: string) {
  const start = buildLocalDateFromInput(startDate ?? "");
  const end = buildLocalDateFromInput(endDate ?? "");

  if (!start || !end) {
    return 1;
  }

  return Math.max(1, differenceInCalendarDays(end, start) + 1);
}

function resolveSalesCantadasPeriodWindow(totalDays: number): SalesCantadasPeriodWindow {
  if (totalDays <= 1) {
    return {
      averageMetric: {
        label: "Média por hora",
        caption: "de vendas cantadas",
        tooltip: "Média por hora de vendas cantadas no período selecionado.",
        divisor: 24,
      },
      trendGranularity: "hour",
    };
  }

  if (totalDays <= 7) {
    return {
      averageMetric: {
        label: "Média por dia",
        caption: "de vendas cantadas",
        tooltip: "Média por dia de vendas cantadas no período selecionado.",
        divisor: totalDays,
      },
      trendGranularity: "day",
    };
  }

  if (totalDays <= 31) {
    return {
      averageMetric: {
        label: "Média por semana",
        caption: "de vendas cantadas",
        tooltip: "Média por semana de vendas cantadas no período selecionado.",
        divisor: totalDays / 7,
      },
      trendGranularity: "week",
    };
  }

  if (totalDays <= 62) {
    return {
      averageMetric: {
        label: "Média mês",
        caption: "de vendas cantadas",
        tooltip: "Média por mês de vendas cantadas no período selecionado.",
        divisor: totalDays / 30,
      },
      trendGranularity: "month",
    };
  }

  if (totalDays <= 93) {
    return {
      averageMetric: {
        label: "Média bimestral",
        caption: "de vendas cantadas",
        tooltip: "Média bimestral de vendas cantadas no período selecionado.",
        divisor: totalDays / 60,
      },
      trendGranularity: "bimonth",
    };
  }

  if (totalDays <= 365) {
    return {
      averageMetric: {
        label: "Média trimestral",
        caption: "de vendas cantadas",
        tooltip: "Média trimestral de vendas cantadas no período selecionado.",
        divisor: totalDays / 90,
      },
      trendGranularity: "quarter",
    };
  }

  return {
    averageMetric: {
      label: "Média anual",
      caption: "de vendas cantadas",
      tooltip: "Média anual de vendas cantadas no período selecionado.",
      divisor: totalDays / 365,
    },
    trendGranularity: "year",
  };
}

export function buildEquivalentPreviousPeriodRange(
  startDate?: string,
  endDate?: string,
): SalesCantadasComparisonRange | null {
  const start = buildLocalDateFromInput(startDate ?? "");
  const end = buildLocalDateFromInput(endDate ?? "");

  if (!start || !end) {
    return null;
  }

  const dayCount = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const previousStart = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - dayCount,
    0,
    0,
    0,
    0,
  );
  const previousEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - 1,
    23,
    59,
    59,
    999,
  );

  return {
    start: previousStart,
    end: previousEnd,
    dayCount,
  };
}

export function resolveSalesCantadasAverageMetric(
  startDate?: string,
  endDate?: string,
): PeriodAverageMetric {
  const totalDays = getInclusiveDayCount(startDate, endDate);
  return resolveSalesCantadasPeriodWindow(totalDays).averageMetric;
}

export function resolveSalesCantadasTrendGranularity(
  startDate?: string,
  endDate?: string,
): SalesCantadasTrendGranularity {
  const totalDays = getInclusiveDayCount(startDate, endDate);
  return resolveSalesCantadasPeriodWindow(totalDays).trendGranularity;
}
