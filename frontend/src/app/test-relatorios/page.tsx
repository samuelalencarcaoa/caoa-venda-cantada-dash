"use client";

import Link from "next/link";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { ReportErrorCard } from "@/components/report-error-card";
import { themedCardClass, themedPageBackgroundClass, themedPageTextClass } from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

export default function TestRelatoriosPage() {
  const { items, isLoading, error, refresh, isRefreshing } = useSalesIntentions();

  if (isLoading) {
    return (
      <div className={cn("min-h-[70vh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <div className="mb-6 h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <section className={cn("mx-auto flex min-h-[70vh] w-full max-w-[900px] items-center p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
        <ReportErrorCard
          label="Falha ao carregar os dados"
          title="Não conseguimos mostrar a prévia dos relatórios agora"
          message={error}
          onRetry={() => void refresh()}
          isRetrying={isRefreshing}
        />
      </section>
    );
  }

  const previewRows = items.slice(0, 5);
  const uniqueRegions = new Set(items.map((item) => item.Regional)).size;
  const uniqueStores = new Set(items.map((item) => item.Loja_Venda)).size;
  const uniqueVendors = new Set(items.map((item) => item.Proprietario)).size;

  return (
    <div className={cn("min-h-[100dvh] p-3 sm:p-5", themedPageBackgroundClass, themedPageTextClass)}>
      <div className="mb-3 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
        <p className="text-emerald-800 dark:text-emerald-200">
          <strong className="font-normal">Integração bem-sucedida.</strong> Dados carregados da API.
        </p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          Total de registros: <strong className="font-normal">{items.length}</strong>
        </p>
      </div>

      <div className="mb-3 grid gap-3 phone:grid-cols-2 xl:grid-cols-4">
        <div className={cn(themedCardClass, "p-3")}>
          <p className="text-sm text-slate-500">Registros</p>
          <p className="text-2xl font-normal">{items.length}</p>
        </div>
        <div className={cn(themedCardClass, "p-3")}>
          <p className="text-sm text-slate-500">Regiões</p>
          <p className="text-2xl font-normal">{uniqueRegions}</p>
        </div>
        <div className={cn(themedCardClass, "p-3")}>
          <p className="text-sm text-slate-500">Lojas</p>
          <p className="text-2xl font-normal">{uniqueStores}</p>
        </div>
        <div className={cn(themedCardClass, "p-3")}>
          <p className="text-sm text-slate-500">Vendedores</p>
          <p className="text-2xl font-normal">{uniqueVendors}</p>
        </div>
      </div>

      <div className={cn(themedCardClass, "mb-3 p-3")}>
        <h2 className="mb-2 font-normal">Primeiros 5 registros</h2>
        <div className="overflow-x-auto">
        <table className="min-w-[680px] w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-100 dark:bg-slate-800">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Proprietário</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Regional</th>
              <th className="p-2 text-left">Marca</th>
              <th className="p-2 text-left">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((item) => (
              <tr key={item.ID} className="border-b hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="p-2">{item.ID}</td>
                <td className="p-2">{item.Proprietario}</td>
                <td className="p-2">{item.Tipo_Venda}</td>
                <td className="p-2">{item.Regional}</td>
                <td className="p-2">{item.Marca_Veiculo}</td>
                <td className="p-2">{item.Quantidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href="/relatorios/marca" className="text-sky-700 hover:underline dark:text-cyan-300">
          → Relatório de Marcas
        </Link>
        <Link href="/relatorios/vendedor" className="text-sky-700 hover:underline dark:text-cyan-300">
          → Relatório de Vendedores
        </Link>
      </div>
    </div>
  );
}
