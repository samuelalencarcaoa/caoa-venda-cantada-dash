import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BrandDetailsClient } from "./brand-details-client";
import {
  type DashboardPeriod,
  resolveBrandFromSlug,
} from "@/lib/brand-routing";

type PageParams = {
  bandeira: string;
};

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;

type PageProps = {
  params?: Promise<PageParams>;
  searchParams?: Promise<SearchParams>;
};

function readSingleQueryValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizePeriodValue(value?: string | null): DashboardPeriod | null {
  if (value === "mes" || value === "dia" || value === "intervalo") {
    return value;
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = (await params) ?? { bandeira: "" };
  const brandName = resolveBrandFromSlug(resolvedParams.bandeira);

  return {
    title: brandName ? `Detalhes da Bandeira | ${brandName}` : "Detalhes da Bandeira",
  };
}

export default async function BrandDetailsPage({ params, searchParams }: PageProps) {
  const resolvedParams = (await params) ?? { bandeira: "" };
  const brandName = resolveBrandFromSlug(resolvedParams.bandeira);

  if (!brandName) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const period = normalizePeriodValue(readSingleQueryValue(resolvedSearchParams.period));
  const startDate = readSingleQueryValue(resolvedSearchParams.startDate);
  const endDate = readSingleQueryValue(resolvedSearchParams.endDate);

  return (
    <BrandDetailsClient
      brandName={brandName}
      period={period}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
