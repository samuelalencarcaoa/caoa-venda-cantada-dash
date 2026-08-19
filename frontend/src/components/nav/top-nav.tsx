"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Container from "../container";

type TopNavProps = {
  title: string;
  className?: string;
};

const routeLabels: Record<string, string> = {
  "": "Início",
  relatorios: "Relatórios",
  vendedor: "Vendedor",
  marca: "Marca",
  "test-relatorios": "Teste de relatórios",
  perfil: "Perfil",
  login: "Login",
  register: "Cadastro",
  "forgot-password": "Esqueceu a senha",
  "reset-password": "Redefinir senha",
  "access-denied": "Acesso negado",
  "sales-intention": "Intenção de venda",
  dashboard: "Dashboard",
};

const navigableBreadcrumbPaths = new Set([
  "/",
  "/relatorios/marca",
  "/relatorios/vendedor",
]);

function formatSegment(segment: string) {
return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TopNav({ title: _title, className }: TopNavProps) {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];

  const breadcrumbs = segments.reduce<Array<{ href: string; label: string }>>(
    (acc, segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label = routeLabels[segment] ?? formatSegment(segment);

      acc.push({ href, label });
      return acc;
    },
    []
  );

  const items = [{ href: "/", label: routeLabels[""] ?? "Início" }, ...breadcrumbs];

  return (
    <Container className={className}>
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border py-3">
        <div className="flex min-w-0 items-center gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center text-xs text-muted-foreground sm:text-sm"
          >
            <ol className="flex min-w-0 flex-wrap items-center gap-2">
              {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const isNavigable = !isLast && navigableBreadcrumbPaths.has(item.href);

                return (
                  <li key={item.href} className="flex min-w-0 items-center gap-2">
                    {index > 0 ? <span className="text-muted-foreground/70">/</span> : null}
                    {isNavigable ? (
                      <Link
                        href={item.href}
                        className="truncate transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={isLast ? "page" : undefined}
                        className={isLast ? "truncate font-medium text-foreground" : "truncate"}
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </Container>
  );
}
