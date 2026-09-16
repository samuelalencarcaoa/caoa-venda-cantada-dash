"use client";

import { ArrowLeftToLine, ArrowRightToLine, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import Navigation from "./components/navigation";
import User from "./components/user";

type SideNavProps = {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

function getAuthUsername() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("caoa-auth="));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=")[1] || "");
}

export default function SideNav({ isCollapsed = false, onToggleCollapse }: SideNavProps) {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [localUsername, setLocalUsername] = useState<string | null>(null);

  useEffect(() => {
    setLocalUsername(getAuthUsername());
  }, []);

  const isAuthenticated = status === "authenticated" || Boolean(localUsername);

  if (status === "unauthenticated" && !localUsername) {
    return null;
  }

  function handleLogout() {
    setIsOpen(false);

    if (status === "authenticated") {
      signOut({ callbackUrl: "/login" });
      return;
    }

    document.cookie = "caoa-auth=; path=/; max-age=0; sameSite=strict";
    window.location.href = "/login";
  }

  function handleNavigation() {
    setIsOpen(false);
  }

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm tablet:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}
      <button
        type="button"
        className={cn(
          "fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-sm backdrop-blur-md transition-transform duration-150 ease-in-out hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/10 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 tablet:hidden",
          isOpen ? "translate-x-56" : "translate-x-0",
        )}
        aria-label={isOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      {onToggleCollapse ? (
        <button
          type="button"
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          className={cn(
            "fixed left-0 top-20 z-50 hidden items-center justify-center rounded-r-md border border-l-0 border-border bg-slate-900 px-2 py-2 text-slate-50 shadow-md hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 tablet:flex",
            "transition-transform duration-300 ease-in-out",
          )}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? <ArrowRightToLine size={16} /> : <ArrowLeftToLine size={16} />}
        </button>
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-56 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-slate-100 dark:bg-slate-900",
          "transition-all duration-150 ease-in-out",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
          isCollapsed
            ? "tablet:-translate-x-full tablet:opacity-0 tablet:pointer-events-none"
            : "tablet:translate-x-0 tablet:opacity-100 tablet:pointer-events-auto",
        )}
      >
        <div>
          <div className="border-b border-border p-3">
            <Link href="/dashboard" className="block" onClick={handleNavigation}>
              <BrandLogo className="mx-auto max-w-[180px]" />
            </Link>
          </div>
          <User />
          <Navigation onNavigate={handleNavigation} />
          {isAuthenticated ? (
            <nav aria-label="Perfil" className="space-y-1 px-2 pb-4">
              <p className="px-2 text-[10px] font-normal uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Perfil
              </p>
              <Link
                href="/perfil"
                onClick={handleNavigation}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <UserRound size={16} className="shrink-0 text-slate-600 dark:text-slate-300" />
                Ver perfil
              </Link>
              <Link
                href="/login"
                onClick={(event) => {
                  event.preventDefault();
                  handleLogout();
                }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut size={16} className="shrink-0 text-slate-600 dark:text-slate-300" />
                Sair
              </Link>
            </nav>
          ) : null}
        </div>
      </aside>
    </>
  );
}
