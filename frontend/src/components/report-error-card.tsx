"use client";

import { Button } from "@/components/ui/button";

type ReportErrorCardProps = {
  label: string;
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
};

export function ReportErrorCard({
  label,
  title,
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  isRetrying = false,
}: ReportErrorCardProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-rose-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.12)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-600">
        {label}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      {onRetry ? (
        <div className="mt-6">
          <Button type="button" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? "Tentando novamente..." : retryLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
