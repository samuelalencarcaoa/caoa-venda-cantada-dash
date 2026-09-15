"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SideNav } from "@/components/nav";
import { GlobalRequestLoading } from "@/components/request-loading";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const unauthenticatedRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSideNav = unauthenticatedRoutes.some((route) => pathname?.startsWith(route) ?? false);
  const isBrandDetailsPage = pathname?.startsWith("/dashboard/bandeiras/") ?? false;
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem("caoa-side-nav-collapsed");
      if (storedValue !== null) {
        setIsSideNavCollapsed(storedValue === "true");
      }
    } catch {
      // Ignore storage access issues and keep the default state.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("caoa-side-nav-collapsed", String(isSideNavCollapsed));
    } catch {
      // Ignore storage access issues and keep the current session state.
    }
  }, [isSideNavCollapsed]);

  return (
    <div className="flex min-h-[100dvh] min-w-0">
      <GlobalRequestLoading />
      <div className="fixed right-3 top-3 z-50 sm:right-4 sm:top-4 tablet:right-6 tablet:top-5">
        <ThemeToggle />
      </div>
      {!hideSideNav && (
        <SideNav
          isCollapsed={isSideNavCollapsed}
          onToggleCollapse={() => setIsSideNavCollapsed((value) => !value)}
        />
      )}
      <div
        className={cn(
          "flex min-w-0 flex-grow flex-col",
          hideSideNav ? "min-h-[100dvh]" : "overflow-x-hidden overflow-y-auto",
        )}
      >
        <div className="min-w-0 flex-1">{children}</div>

        <div className={cn("shrink-0", isBrandDetailsPage ? "pt-4" : "pt-[30px]")}>
          <footer
            className={cn(
              "h-fit border-t border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 sm:px-6",
              isBrandDetailsPage ? "py-4" : "py-6",
            )}
          >
            <div
              className={cn(
                "mx-auto flex w-full flex-col gap-6 lg:flex-row lg:items-center lg:justify-between",
                isBrandDetailsPage ? "max-w-[1700px]" : "max-w-8xl",
              )}
            >
              <div className={cn("space-y-3", isBrandDetailsPage && "space-y-2")}>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Desenvolvido pelo Departamento de Tecnologia e Inovação da CAOA
                </p>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Ambiente institucional com acesso às políticas e orientações oficiais da CAOA.
                </p>
              </div>
            </div>

            <nav
              className={cn(
                "mx-auto flex w-full flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400",
                isBrandDetailsPage ? "mt-4 max-w-[1700px]" : "mt-6 max-w-8xl",
              )}
            >
              <a
                href="https://caoa.com.br/politica-de-privacidade"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-sky-700 dark:hover:text-cyan-300"
              >
                Política de privacidade
              </a>
              <a
                href="https://caoa.com.br/politica-de-cookies"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-sky-700 dark:hover:text-cyan-300"
              >
                Política de cookies
              </a>
              <a
                href="https://caoa.com.br/alerta-de-fraudes"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-sky-700 dark:hover:text-cyan-300"
              >
                Alerta de fraudes
              </a>
              <a
                href="https://caoa.com.br/seguranca-veicular"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-sky-700 dark:hover:text-cyan-300"
              >
                Segurança veicular
              </a>
              <a
                href="https://caoa.com.br/titulares-de-dados-atendimento"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-sky-700 dark:hover:text-cyan-300"
              >
                Titulares de dados
              </a>
              <a
                href="https://caoa.com.br/caoa-governanca-e-sustentabilidade"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-sky-700 dark:hover:text-cyan-300"
              >
                Governança e sustentabilidade
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </div>
  );
}
