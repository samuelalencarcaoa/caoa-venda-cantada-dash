"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigations } from "@/config/site";
import { cn } from "@/lib/utils";

type NavigationProps = {
  onNavigate?: () => void;
};

export default function Navigation({ onNavigate }: NavigationProps) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-grow flex-col gap-y-1 p-2">
      {navigations.map((navigation) => {
        const Icon = navigation.icon;
        return (
          <Link
            key={navigation.name}
            href={navigation.href}
            onClick={onNavigate}
            className={cn(
              "flex min-w-0 w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-200 dark:hover:bg-slate-800",
              pathname === navigation.href
                ? "bg-slate-200 dark:bg-slate-800"
                : "bg-transparent",
            )}
          >
            <Icon
              size={16}
              className="shrink-0 text-slate-800 dark:text-slate-200"
            />
            <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">
              {navigation.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
