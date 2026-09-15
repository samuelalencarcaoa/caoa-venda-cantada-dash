import { differenceInCalendarDays, format, subDays } from "date-fns";

export function parseLocalInputDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return format(date, "yyyy-MM-dd") === value ? date : null;
}

export function getPreviousPeriodRange(startValue: string, endValue: string) {
  const start = parseLocalInputDate(startValue);
  const end = parseLocalInputDate(endValue);
  if (!start || !end || start > end) return null;
  const durationInDays = differenceInCalendarDays(end, start) + 1;
  const previousEnd = subDays(start, 1);
  const previousStart = subDays(previousEnd, durationInDays - 1);
  return {
    current: { startDate: startValue, endDate: endValue },
    previous: {
      startDate: format(previousStart, "yyyy-MM-dd"),
      endDate: format(previousEnd, "yyyy-MM-dd"),
    },
    durationInDays,
  };
}

export function calculateComparisonVariation(current: number, comparison: number) {
  const difference = current - comparison;
  const percentage = comparison === 0 ? current === 0 ? 0 : null : difference / comparison * 100;
  return { difference, percentage };
}

export function alignComparisonBuckets<T>(
  currentBuckets: T[],
  comparisonValues: Map<number, number>,
  getIndex: (bucket: T) => number,
) {
  return currentBuckets.map((bucket) => ({ bucket, value: comparisonValues.get(getIndex(bucket)) ?? 0 }));
}
