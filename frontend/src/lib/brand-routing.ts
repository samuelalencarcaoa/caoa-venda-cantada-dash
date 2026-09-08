export const dashboardBrandNames = [
  "CAOA CHERY",
  "CAOA CHANGAN",
  "HYUNDAI",
  "FORD",
  "SEMINOVOS",
] as const;

export type DashboardBrand = (typeof dashboardBrandNames)[number];
export type DashboardPeriod = "mes" | "dia" | "intervalo";
export type BrandDetailTipoVenda = "NOVOS" | "SEMINOVOS";

type BrandDetailDateRange = {
  startDate?: string;
  endDate?: string;
  period?: DashboardPeriod;
  tipoVenda?: BrandDetailTipoVenda;
};

const brandsWithNewVehicleOnlyView = new Set([
  "CAOA CHERY",
  "CAOA CHANGAN",
  "HYUNDAI",
  "FORD",
]);

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

export function getBrandDetailTipoVenda(brandName: string): BrandDetailTipoVenda | undefined {
  const normalizedBrandName = brandName.trim().toUpperCase();

  if (normalizedBrandName === "SEMINOVOS") {
    return "SEMINOVOS";
  }

  if (brandsWithNewVehicleOnlyView.has(normalizedBrandName)) {
    return "NOVOS";
  }

  return undefined;
}

export type BrandDetailSalesIntentionQuery = {
  bandeira?: string;
  tipoVenda?: BrandDetailTipoVenda;
};

export function getBrandDetailSalesIntentionQuery(
  brandName: string,
): BrandDetailSalesIntentionQuery {
  const tipoVenda = getBrandDetailTipoVenda(brandName);

  if (tipoVenda === "SEMINOVOS") {
    return { tipoVenda };
  }

  if (tipoVenda === "NOVOS") {
    return { bandeira: brandName, tipoVenda };
  }

  return { bandeira: brandName };
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

  const tipoVenda = dateRange?.tipoVenda ?? getBrandDetailTipoVenda(brandName);
  if (tipoVenda) {
    searchParams.set("tipoVenda", tipoVenda);
  }

  const queryString = searchParams.toString();
  const pathname = `/dashboard/bandeiras/${encodeURIComponent(brandNameToSlug(brandName))}`;

  return queryString ? `${pathname}?${queryString}` : pathname;
}
