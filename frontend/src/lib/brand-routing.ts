export const dashboardBrandNames = [
  "CAOA CHERY",
  "CAOA CHANGAN",
  "HYUNDAI",
  "FORD",
  "SEMINOVOS",
] as const;

export type DashboardBrand = (typeof dashboardBrandNames)[number];
export type DashboardPeriod = "mes" | "dia" | "intervalo";

type BrandDetailDateRange = {
  startDate?: string;
  endDate?: string;
  period?: DashboardPeriod;
};

function normalizeSlugValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function brandNameToSlug(brandName: string) {
  return normalizeSlugValue(brandName.trim());
}

export function resolveBrandFromSlug(slug: string) {
  const normalizedSlug = normalizeSlugValue(safeDecodeURIComponent(slug));

  return (
    dashboardBrandNames.find((brandName) => brandNameToSlug(brandName) === normalizedSlug) ??
    null
  );
}

export function buildBrandDetailHref(brandName: string, dateRange?: BrandDetailDateRange) {
  const searchParams = new URLSearchParams();

  if (dateRange?.period) {
    searchParams.set("period", dateRange.period);
  }

  if (dateRange?.startDate) {
    searchParams.set("startDate", dateRange.startDate);
  }

  if (dateRange?.endDate) {
    searchParams.set("endDate", dateRange.endDate);
  }

  const queryString = searchParams.toString();
  const pathname = `/dashboard/bandeiras/${encodeURIComponent(brandNameToSlug(brandName))}`;

  return queryString ? `${pathname}?${queryString}` : pathname;
}
