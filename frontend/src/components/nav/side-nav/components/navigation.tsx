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
  const sections = [
    {
      label: "Operação",
      items: navigations.filter((item) => item.group === "Operação"),
    },
    {
      label: "Análises",
      items: navigations.filter((item) => item.group === "Análises"),
    },
  ];
  return (
    <nav
      aria-label="Navegação principal"
      className="flex flex-grow flex-col gap-y-4 px-2 py-4"
    >
      {sections.map((section) => (
        <div key={section.label} className="space-y-1">
          <p className="px-2 text-[10px] font-normal uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {section.label}
          </p>
          {section.items.map((navigation) => {
            const Icon = navigation.icon;
            const isActive =
              pathname === navigation.href ||
              (navigation.href !== "/" &&
                pathname?.startsWith(`${navigation.href}/`));
            return (
              <Link
                key={navigation.name}
                href={navigation.href}
                onClick={onNavigate}
                target={navigation.target}
                rel={navigation.rel}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:hover:bg-slate-800",
                  isActive
                    ? "bg-sky-100 font-normal text-sky-900 dark:bg-cyan-400/10 dark:text-cyan-100"
                    : "bg-transparent",
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    "shrink-0",
                    isActive
                      ? "text-sky-700 dark:text-cyan-300"
                      : "text-slate-600 dark:text-slate-300",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 truncate text-sm",
                    isActive
                      ? "text-sky-900 dark:text-cyan-100"
                      : "text-slate-700 dark:text-slate-300",
                  )}
                >
                  {navigation.name}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
