"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSalesIntentions,
  formatSalesIntentionApiError,
  type SalesIntentionDateRange,
  type SalesIntentionReportRow,
} from "@/lib/salesIntentionApi";

export function useSalesIntentions(dateRange?: SalesIntentionDateRange) {
  const [items, setItems] = useState<SalesIntentionReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadItems = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchSalesIntentions(dateRange);
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
  }, [dateRange?.endDate, dateRange?.startDate, dateRange?.tipoVenda]);

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
