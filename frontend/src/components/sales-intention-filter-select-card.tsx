"use client";

import { ChevronDown, CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  themedInputClass,
  themedSoftCardClass,
  themedTextMutedClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

export function TooltipIcon({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ajuda: ${text}`}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sky-500 transition hover:bg-sky-500/10 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 touch-manipulation dark:text-cyan-300 dark:hover:bg-cyan-300/10 dark:hover:text-cyan-200"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 px-3 py-2 text-xs leading-5">
        {text}
      </PopoverContent>
    </Popover>
  );
}

export function FilterSelectCard({
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled = false,
  formatLabel,
}: {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  tooltip: string;
  disabled?: boolean;
  formatLabel?: (value: string) => string;
}) {
  const displayValue =
    value.length === 0
      ? "Todos"
      : value.length === 1
        ? (formatLabel?.(value[0]) ?? value[0])
        : `${value.length} selecionados`;

  const toggleOption = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, option])]);
      return;
    }

    onChange(value.filter((item) => item !== option));
  };

  return (
    <div className={cn(themedSoftCardClass, "min-w-0 rounded-2xl p-2.5")}>
      <div className="flex items-center gap-1.5">
        <p className={cn(themedTinyLabelClass, "truncate tracking-[0.18em]")}>{label}</p>
        <TooltipIcon text={tooltip} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label={`${label}: ${displayValue}`}
            className={cn(
              "mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
              themedInputClass,
            )}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", themedTextMutedClass)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 overflow-y-auto rounded-xl p-1.5"
        >
          <DropdownMenuLabel className="px-2 py-1 text-xs">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={value.length === 0}
            onCheckedChange={() => onChange([])}
          >
            Todos
          </DropdownMenuCheckboxItem>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={(checked) => toggleOption(option, checked === true)}
            >
              {formatLabel?.(option) ?? option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
