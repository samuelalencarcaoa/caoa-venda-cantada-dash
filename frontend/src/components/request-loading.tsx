"use client";

import { LoaderCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const loadingMessages = [
  "Preparando a experiência com os dados mais recentes.",
  "Montando filtros, tabelas e gráficos para você.",
  "Sincronizando as informações do painel.",
];

function getInitialLoadingThemeIsDark() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const storedTheme = window.localStorage.getItem("theme");

    if (storedTheme === "light") {
      return false;
    }

    if (storedTheme === "dark") {
      return true;
    }

    if (storedTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  } catch {
    // Ignore storage and media query issues and keep the dark fallback.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function LoadingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);
  const { resolvedTheme, theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(getInitialLoadingThemeIsDark);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const effectiveTheme = resolvedTheme ?? theme;

    if (effectiveTheme === "light") {
      setIsDarkMode(false);
      return;
    }

    if (effectiveTheme === "dark") {
      setIsDarkMode(true);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (matches: boolean) => {
      setIsDarkMode(matches);
    };

    syncSystemTheme(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => syncSystemTheme(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [resolvedTheme, theme]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm",
        isDarkMode && "bg-slate-950/65",
      )}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      suppressHydrationWarning
    >
      <div className={cn(
        "flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm",
        isDarkMode
          ? "border-white/10 bg-slate-900 text-slate-100"
          : "border-slate-200 bg-white text-slate-900",
      )}>
        <LoaderCircle className={cn(
          "h-5 w-5 shrink-0 motion-safe:animate-spin motion-reduce:animate-none",
          isDarkMode ? "text-cyan-300" : "text-sky-600",
        )} />
        <div className="min-w-0">
          <p className="text-sm font-normal">Carregando dados</p>
          <p className={cn("text-xs leading-5", isDarkMode ? "text-slate-300" : "text-slate-600")}>
            {loadingMessages[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GlobalRequestLoading() {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const hasPendingRequests = pendingRequests > 0;

  useEffect(() => {
    if (!hasPendingRequests) {
      setShowLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => setShowLoading(true), 350);
    return () => window.clearTimeout(timeout);
  }, [hasPendingRequests]);

  useEffect(() => {
    const originalFetch = window.fetch;

    const monitoredFetch: typeof window.fetch = async (...args) => {
      setPendingRequests((current) => current + 1);

      try {
        return await originalFetch(...args);
      } finally {
        setPendingRequests((current) => Math.max(0, current - 1));
      }
    };

    window.fetch = monitoredFetch;

    return () => {
      if (window.fetch === monitoredFetch) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  if (!showLoading || !hasPendingRequests || typeof document === "undefined") {
    return null;
  }

  return createPortal(<LoadingOverlay />, document.body);
}
