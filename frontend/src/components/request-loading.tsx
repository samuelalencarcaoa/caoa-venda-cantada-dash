"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
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

  const overlayClassName = cn(
    "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-4 backdrop-blur-xl",
    isDarkMode ? "bg-slate-950/82" : "bg-slate-950/70",
  );

  const ambientBackdropClassName = isDarkMode
    ? "absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.98)_0%,_rgba(15,23,42,0.99)_100%)]"
    : "absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.9)_0%,_rgba(15,23,42,0.92)_100%)]";

  const shellClassName = cn(
    "relative overflow-hidden rounded-[2rem] px-6 py-6",
    isDarkMode
      ? "border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.94)_100%)] text-white shadow-[0_30px_80px_-45px_rgba(0,0,0,0.85)]"
      : "border border-white/14 bg-white/90 text-slate-950 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.7)]",
  );

  const shellGlowClassName = isDarkMode
    ? "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.1),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_42%,rgba(59,130,246,0.05)_100%)] opacity-100"
    : "absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.1)_42%,rgba(255,255,255,0.32)_100%)] opacity-60";

  const labelClassName = isDarkMode ? "text-cyan-300" : "text-sky-600";
  const titleClassName = isDarkMode ? "text-white" : "text-slate-950";
  const descriptionClassName = isDarkMode ? "text-slate-300" : "text-slate-600";
  const panelCardClassName = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-sm shadow-black/10"
    : "rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-3 shadow-sm";
  const panelLabelClassName = isDarkMode ? "text-slate-400" : "text-slate-500";
  const panelLineClassName = isDarkMode ? "bg-white/10" : "bg-slate-200/90";
  const trackClassName = isDarkMode ? "bg-white/10" : "bg-slate-200/80";
  const footerTextClassName = isDarkMode ? "text-slate-400" : "text-slate-500";
  const spinnerClassName = isDarkMode ? "text-cyan-300" : "text-sky-600";

  return (
    <>
      <div
        className={overlayClassName}
        role="status"
        aria-live="polite"
        aria-label="Carregando"
        suppressHydrationWarning
      >
        <div className={ambientBackdropClassName} />
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl animate-pulse [animation-delay:600ms]" />
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-cyan-400/25 via-sky-400/15 to-transparent blur-2xl animate-pulse" />

          <div className={shellClassName}>
            <div className={shellGlowClassName} />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={cn("text-[10px] font-semibold uppercase tracking-[0.38em]", labelClassName)}>
                  Carregando
                </p>
                <h2 className={cn("mt-2 text-2xl font-semibold tracking-[-0.04em]", titleClassName)}>
                  Organizando a tela
                </h2>
                <p className={cn("mt-2 max-w-md text-sm leading-6 transition-opacity duration-300", descriptionClassName)}>
                  {loadingMessages[messageIndex]}
                </p>
              </div>

              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-sky-400/20 bg-sky-500/10 animate-pulse" />
                <div
                  className="absolute inset-1 rounded-full border border-cyan-400/40 border-t-transparent animate-spin"
                  style={{ animationDuration: "1.8s" }}
                />
                <LoaderCircle
                  className={cn("relative h-7 w-7 animate-spin", spinnerClassName)}
                  style={{ animationDuration: "1.1s" }}
                />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
              {["Filtros", "Dados", "Visões"].map((label, index) => (
                <div
                  key={label}
                  className={panelCardClassName}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-[0.28em]", panelLabelClassName)}>
                      {label}
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 shadow-[0_0_0_4px_rgba(14,165,233,0.08)] animate-pulse"
                      style={{ animationDelay: `${index * 180}ms` }}
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className={cn("h-2 w-5/6 rounded-full", panelLineClassName)} />
                    <div className={cn("h-2 w-2/3 rounded-full", panelLineClassName)} />
                    <div className={cn("h-2 w-1/2 rounded-full", panelLineClassName)} />
                  </div>
                </div>
              ))}
            </div>

            <div className={cn("relative mt-6 overflow-hidden rounded-full", trackClassName)}>
              <div className="h-2 w-1/3 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 animate-[loading-slide_1.4s_ease-in-out_infinite]" />
            </div>

            <div className={cn("relative mt-4 flex items-center justify-between gap-3 text-xs", footerTextClassName)}>
              <span>Isso pode levar apenas alguns instantes.</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:140ms]" />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:280ms]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes loading-slide {
          0% {
            transform: translateX(-30%);
            opacity: 0.65;
          }
          50% {
            transform: translateX(150%);
            opacity: 1;
          }
          100% {
            transform: translateX(-30%);
            opacity: 0.65;
          }
        }
      `}</style>
    </>
  );
}

export function GlobalRequestLoading() {
  const [pendingRequests, setPendingRequests] = useState(0);

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

  if (pendingRequests === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(<LoadingOverlay />, document.body);
}
