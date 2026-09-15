"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SalesIntentionDataList } from "@/components/sales-intention-data-list";
import type { SalesIntentionReportRow } from "@/lib/salesIntentionApi";
import { cn } from "@/lib/utils";

type MobileDetailedTableModalProps = {
  open: boolean;
  items: SalesIntentionReportRow[];
  exportFilePrefix: string;
  onClose: () => void;
};

export function MobileDetailedTableModal({
  open,
  items,
  exportFilePrefix,
  onClose,
}: MobileDetailedTableModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-slate-950/90 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tabela detalhada de intenções de venda"
      >
        <Button
          ref={closeButtonRef}
          type="button"
          variant="outline"
          size="icon"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 shrink-0 border-white/10 bg-slate-950/85 text-white shadow-lg backdrop-blur hover:bg-slate-900 dark:border-white/10 dark:bg-slate-950/85 dark:text-white dark:hover:bg-slate-900"
          aria-label="Fechar tabela detalhada"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-14">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[920px]">
            <SalesIntentionDataList
              items={items}
              exportFilePrefix={exportFilePrefix}
              className={cn("h-full min-h-0")}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
