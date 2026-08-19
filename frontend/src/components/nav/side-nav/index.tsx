"use client";

import { ArrowLeftToLine, ArrowRightToLine, LogOut, Menu, X } from "lucide-react";
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
    if (status === "authenticated") {
      signOut({ callbackUrl: "/login" });
      return;
    }

    document.cookie = "caoa-auth=; path=/; max-age=0; sameSite=strict";
    window.location.href = "/login";
  }

  function closeMobileDrawer() {
    setIsOpen(false);
  }

  function collapseDesktopDrawer() {
    onToggleCollapse?.();
  }

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm tablet:hidden"
          onClick={closeMobileDrawer}
        />
      ) : null}
      {!isCollapsed ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-y-0 left-56 right-0 z-30 hidden bg-slate-950/35 backdrop-blur-[2px] tablet:block"
          onClick={collapseDesktopDrawer}
        />
      ) : null}
      <button
        type="button"
        className={cn(
          "fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-slate-100 shadow-lg backdrop-blur-md transition-transform duration-300 ease-in-out hover:bg-slate-900 dark:border-white/10 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 tablet:hidden",
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
          "fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-56 shrink-0 flex-col justify-between overflow-y-auto overscroll-contain border-r border-border bg-slate-100 shadow-xl shadow-slate-950/10 dark:bg-slate-900 dark:shadow-slate-950/30",
          "transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
          isCollapsed
            ? "tablet:-translate-x-full tablet:opacity-0 tablet:pointer-events-none"
            : "tablet:translate-x-0 tablet:opacity-100 tablet:pointer-events-auto",
        )}
      >
        <div>
          <div className="border-b border-border p-3">
            <Link href="/dashboard" className="block" onClick={closeMobileDrawer}>
              <BrandLogo className="mx-auto max-w-[180px]" />
            </Link>
          </div>
          <User onNavigate={closeMobileDrawer} />
          <Navigation onNavigate={closeMobileDrawer} />
        </div>

        {isAuthenticated && (
          <button
            type="button"
            className="mx-3 mb-4 inline-flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Sair
          </button>
        )}
      </aside>
    </>
  );
}
