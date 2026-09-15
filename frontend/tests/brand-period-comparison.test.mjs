import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, differenceInCalendarDays, format } from "date-fns";

import {
  alignComparisonBuckets,
  calculateComparisonVariation,
  getPreviousPeriodRange,
  parseLocalInputDate,
} from "../src/lib/brand-period-comparison.ts";

const examples = [
  ["2026-01-01", "2026-01-31", "2025-12-01", "2025-12-31", 31],
  ["2026-01-01", "2026-01-01", "2025-12-31", "2025-12-31", 1],
  ["2026-09-21", "2026-09-30", "2026-09-11", "2026-09-20", 10],
  ["2026-03-05", "2026-03-14", "2026-02-23", "2026-03-04", 10],
  ["2026-03-01", "2026-03-28", "2026-02-01", "2026-02-28", 28],
  ["2028-03-01", "2028-03-29", "2028-02-01", "2028-02-29", 29],
  ["2026-01-01", "2026-01-10", "2025-12-22", "2025-12-31", 10],
  ["2026-06-01", "2026-06-30", "2026-05-02", "2026-05-31", 30],
];

test("período imediatamente anterior nos exemplos do calendário", () => {
  for (const [start, end, previousStart, previousEnd, days] of examples) {
    const result = getPreviousPeriodRange(start, end);
    assert.deepEqual(result, {
      current: { startDate: start, endDate: end },
      previous: { startDate: previousStart, endDate: previousEnd },
      durationInDays: days,
    });
  }
});

test("invariantes para muitos inícios e durações inclusivas", () => {
  for (const year of [2024, 2025, 2026, 2028, 2032]) {
    for (const month of [0, 1, 2, 5, 8, 11]) {
      for (const days of [1, 2, 7, 10, 28, 29, 30, 31, 45, 90, 365, 366, 750]) {
        const currentStart = new Date(year, month, 1);
        const currentEnd = addDays(currentStart, days - 1);
        const result = getPreviousPeriodRange(format(currentStart, "yyyy-MM-dd"), format(currentEnd, "yyyy-MM-dd"));
        assert.ok(result);
        const previousStart = parseLocalInputDate(result.previous.startDate);
        const previousEnd = parseLocalInputDate(result.previous.endDate);
        assert.ok(previousStart && previousEnd);
        assert.ok(previousStart <= previousEnd);
        assert.ok(previousEnd < currentStart);
        assert.equal(format(addDays(previousEnd, 1), "yyyy-MM-dd"), format(currentStart, "yyyy-MM-dd"));
        assert.equal(differenceInCalendarDays(previousEnd, previousStart) + 1, days);
        assert.equal(differenceInCalendarDays(currentEnd, currentStart) + 1, days);
        assert.equal(result.durationInDays, days);
      }
    }
  }
});

test("alinha buckets ausentes por chave e preenche com zero", () => {
  assert.deepEqual(alignComparisonBuckets([9, 10, 11], new Map([[9, 3], [11, 8]]), (hour) => hour), [
    { bucket: 9, value: 3 }, { bucket: 10, value: 0 }, { bucket: 11, value: 8 },
  ]);
});

test("variação nunca divide por zero", () => {
  assert.deepEqual(calculateComparisonVariation(10, 8), { difference: 2, percentage: 25 });
  assert.deepEqual(calculateComparisonVariation(0, 0), { difference: 0, percentage: 0 });
  assert.deepEqual(calculateComparisonVariation(5, 0), { difference: 5, percentage: null });
});
