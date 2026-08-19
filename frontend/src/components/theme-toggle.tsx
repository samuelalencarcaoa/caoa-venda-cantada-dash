"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydration } from "@/hooks/use-hydration";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const hydrated = useHydration();
  const activeTheme = resolvedTheme ?? theme;
  const isDarkTheme = activeTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative rounded-full border shadow-lg transition-colors",
            isDarkTheme
              ? "!border-slate-200 !bg-white !text-slate-900 hover:!bg-slate-50 dark:!border-slate-200 dark:!bg-white dark:!text-slate-900 dark:hover:!bg-slate-50"
              : "!border-slate-900/80 !bg-slate-950 !text-white hover:!bg-slate-900 dark:!border-slate-900/80 dark:!bg-slate-950 dark:!text-white dark:hover:!bg-slate-900",
          )}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          {hydrated && theme === "system" && <AutoThemeBadge />}
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AutoThemeBadge() {
  return (
    <span className="absolute -right-2 -top-2 flex h-4 items-center rounded-full bg-secondary px-1.5 text-[0.6rem] text-secondary-foreground ring-2 ring-background duration-300 animate-in zoom-in-50">
      auto
    </span>
  );
}
