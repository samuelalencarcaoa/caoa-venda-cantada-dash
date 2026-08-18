"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const loadingMessages = [
  "Preparando a experiência com os dados mais recentes.",
  "Montando filtros, tabelas e gráficos para você.",
  "Sincronizando as informações do painel.",
];

export function LoadingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/70 px-4 backdrop-blur-xl"
        role="status"
        aria-live="polite"
        aria-label="Carregando"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.9)_0%,_rgba(15,23,42,0.92)_100%)]" />
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl animate-pulse [animation-delay:600ms]" />
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-cyan-400/25 via-sky-400/15 to-transparent blur-2xl animate-pulse" />

          <div className="relative overflow-hidden rounded-[2rem] border border-white/14 bg-white/90 px-6 py-6 text-slate-950 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.7)] dark:bg-slate-950/92 dark:text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.1)_42%,rgba(255,255,255,0.32)_100%)] opacity-60 dark:opacity-20" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-sky-600 dark:text-cyan-300">
                  Carregando
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Organizando a tela
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 transition-opacity duration-300 dark:text-slate-300">
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
                  className="relative h-7 w-7 text-sky-600 animate-spin dark:text-cyan-300"
                  style={{ animationDuration: "1.1s" }}
                />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
              {["Filtros", "Dados", "Visões"].map((label, index) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 shadow-[0_0_0_4px_rgba(14,165,233,0.08)] animate-pulse"
                      style={{ animationDelay: `${index * 180}ms` }}
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-5/6 rounded-full bg-slate-200/90 dark:bg-white/10" />
                    <div className="h-2 w-2/3 rounded-full bg-slate-200/90 dark:bg-white/10" />
                    <div className="h-2 w-1/2 rounded-full bg-slate-200/90 dark:bg-white/10" />
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mt-6 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
              <div className="h-2 w-1/3 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 animate-[loading-slide_1.4s_ease-in-out_infinite]" />
            </div>

            <div className="relative mt-4 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
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

  return pendingRequests > 0 ? <LoadingOverlay /> : null;
}
