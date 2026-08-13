"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  themedPanelClass,
  themedTextBodyClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";

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
    <section className={cn(themedPanelClass, "border-rose-200 dark:border-rose-400/20", "p-6")}>
      <p className={cn(themedTinyLabelClass, "text-rose-600 dark:text-rose-300")}>
        {label}
      </p>
      <h2 className={`mt-2 text-2xl font-semibold ${themedTextTitleClass}`}>{title}</h2>
      <p className={`mt-3 text-sm leading-6 ${themedTextBodyClass}`}>{message}</p>
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
