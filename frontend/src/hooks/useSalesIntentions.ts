"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSalesIntentions,
  formatSalesIntentionApiError,
  type SalesIntentionDateRange,
  type SalesIntentionReportRow,
} from "@/lib/salesIntentionApi";

const REFRESH_INTERVAL_MS = 60000;

export function useSalesIntentions(dateRange?: SalesIntentionDateRange) {
  const [items, setItems] = useState<SalesIntentionReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    let active = true;

    const run = async (options?: { silent?: boolean }) => {
      if (!active) return;
      await loadItems(options);
    };

    void run();

    const interval = window.setInterval(() => {
      void run({ silent: true });
    }, REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void run({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadItems]);

  return {
    items,
    isLoading,
    isRefreshing,
    error,
    refresh: loadItems,
  };
}
