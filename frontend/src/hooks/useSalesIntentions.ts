"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAllSalesIntentions,
  fetchSalesIntentions,
  formatSalesIntentionApiError,
  type SalesIntentionDateRange,
  type SalesIntentionReportRow,
} from "@/lib/salesIntentionApi";

type UseSalesIntentionsOptions = {
  searchAll?: boolean;
};

export function useSalesIntentions(
  dateRange?: SalesIntentionDateRange,
  options?: UseSalesIntentionsOptions,
) {
  const [items, setItems] = useState<SalesIntentionReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const startDate = dateRange?.startDate;
  const endDate = dateRange?.endDate;
  const tipoVenda = dateRange?.tipoVenda;
  const bandeira = dateRange?.bandeira;

  const loadItems = useCallback(async (requestOptions?: { silent?: boolean }) => {
    const silent = requestOptions?.silent ?? false;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = options?.searchAll
        ? await fetchAllSalesIntentions()
        : await fetchSalesIntentions({ startDate, endDate, tipoVenda, bandeira });
      setItems(data);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(formatSalesIntentionApiError(err));
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [
    endDate,
    bandeira,
    options?.searchAll,
    startDate,
    tipoVenda,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return {
    items,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh: loadItems,
  };
}
