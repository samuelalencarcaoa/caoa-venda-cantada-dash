"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
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
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <Button
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
